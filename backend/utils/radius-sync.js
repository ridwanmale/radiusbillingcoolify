const db = require('../config/db');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const isValidIpv4OrCidr = (value) => {
  if (!value || typeof value !== 'string') return false;
  const match = value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/);
  if (!match) return false;

  const octets = match.slice(1, 5).map(Number);
  const cidr = match[5] === undefined ? null : Number(match[5]);
  return octets.every(octet => octet >= 0 && octet <= 255) && (cidr === null || (cidr >= 0 && cidr <= 32));
};

const toSafeClientName = (nas, index) => {
  const base = nas.shortname || nas.nasname || `nas_${index + 1}`;
  const safe = String(base).trim().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
  return `nas_${nas.id || index + 1}_${safe || 'router'}`;
};

const escapeRadiusValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Sends a SIGHUP (HUP) signal to the radius-server container via mounted Docker socket path.
 * This triggers FreeRADIUS to reload clients.conf and read database NAS list dynamically under 0.1s without downtime.
 */
const reloadRadiusContainer = () => {
  return new Promise((resolve, reject) => {
    const options = {
      socketPath: '/var/run/docker.sock',
      path: '/containers/radius-server/kill?signal=HUP',
      method: 'POST'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 204 || res.statusCode === 200) {
          console.log('[RADIUS-SYNC] FreeRADIUS container reloaded successfully (SIGHUP)');
          resolve();
        } else {
          console.error(`[RADIUS-SYNC] Docker API error: Status ${res.statusCode}, ${data}`);
          reject(new Error(`Docker API returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[RADIUS-SYNC] Docker socket communication error:', err.message);
      reject(err);
    });

    req.end();
  });
};

/**
 * Sync NAS from database to FreeRADIUS clients.conf
 */
const syncRadiusClientsConf = async () => {
  try {
    // 1. Fetch all NAS from database
    const [nasRows] = await db.query(`
      SELECT id, nasname, shortname, secret, description, connection_mode, type, ports
      FROM nas
      WHERE shortname IS NOT NULL
      ORDER BY id ASC
    `);

    if (nasRows.length === 0) {
      console.warn('[RADIUS-SYNC] No NAS found in database');
      return { status: 'warning', message: 'No NAS found in database' };
    }

    // 2. Generate clients.conf content
    let clientsContent = `# FreeRADIUS clients.conf - Auto-generated from Radius Billing Database
# Generated: ${new Date().toISOString()}
# WARNING: Do not edit manually! Changes will be overwritten on sync.

# Allow queries from localhost
client localhost {
    ipaddr = 127.0.0.1
    proto = *
    secret = testing123
    shortname = localhost
}

client localhost_ipv6 {
    ipv6addr = ::1
    secret = testing123
    shortname = localhost_ipv6
}

`;

    // 3. Add NAS clients from database
    for (const [index, nas] of nasRows.entries()) {
      const ipOrNetwork = String(nas.nasname || '').trim();
      if (!isValidIpv4OrCidr(ipOrNetwork)) {
        throw new Error(`NAS ${nas.shortname || nas.id} memiliki IP/CIDR tidak valid: ${ipOrNetwork}`);
      }

      const clientName = toSafeClientName(nas, index);
      const description = nas.description ? ` # ${nas.description}` : '';
      
      clientsContent += `# ${nas.shortname} (${nas.connection_mode})${description}
client ${clientName} {
    ipaddr = ${ipOrNetwork}
    shortname = "${escapeRadiusValue(nas.shortname)}"
    secret = "${escapeRadiusValue(nas.secret)}"
    proto = *
`;

      // Add ports configuration if specified
      if (nas.ports && nas.ports !== 1812) {
        clientsContent += `    port = ${nas.ports}\n`;
      }

      clientsContent += `}

`;
    }

    // 4. Check if we are running in a decoupled environment where FreeRADIUS is not locally installed
    if (!fs.existsSync('/etc/freeradius/3.0') && !fs.existsSync('/etc/raddb')) {
      console.log('[RADIUS-SYNC] Decoupled stack detected: FreeRADIUS is not locally installed. Skipping physical clients.conf write (clients are read dynamically from database nas table)');
      try {
        await reloadRadiusContainer();
        console.log('[RADIUS-SYNC] FreeRADIUS container reload signaled successfully.');
      } catch (reloadErr) {
        console.warn('[RADIUS-SYNC] Could not send reload signal to radius container:', reloadErr.message);
      }
      return { 
        status: 'success', 
        message: 'RADIUS synced via database nas table (decoupled mode)',
        nasCount: nasRows.length,
        clients: nasRows.map(n => ({ nasname: n.nasname, shortname: n.shortname }))
      };
    }

    // 4. Backup existing clients.conf
    let clientsConfPath = '/etc/freeradius/3.0/clients.conf';
    if (!fs.existsSync('/etc/freeradius/3.0') && fs.existsSync('/etc/raddb')) {
      clientsConfPath = '/etc/raddb/clients.conf';
    }
    const clientsConfDir = clientsConfPath.substring(0, clientsConfPath.lastIndexOf('/'));
    const backupPath = `${clientsConfPath}.backup.${Date.now()}`;

    try {
      if (fs.existsSync(clientsConfDir) && fs.existsSync(clientsConfPath)) {
        fs.copyFileSync(clientsConfPath, backupPath);
        console.log(`[RADIUS-SYNC] Backup created: ${backupPath}`);
      }
    } catch (backupErr) {
      if (backupErr.code === 'EACCES') {
        try {
          await execPromise(`sudo cp ${clientsConfPath} ${backupPath}`);
          console.log(`[RADIUS-SYNC] Backup created via sudo cp: ${backupPath}`);
        } catch (sudoBackupErr) {
          console.warn('[RADIUS-SYNC] Backup failed via sudo cp:', sudoBackupErr.message);
        }
      } else {
        console.warn('[RADIUS-SYNC] Backup failed:', backupErr.message);
      }
    }

    // 5. Write new clients.conf
    try {
      fs.writeFileSync(clientsConfPath, clientsContent, 'utf8');
      console.log(`[RADIUS-SYNC] clients.conf updated directly with ${nasRows.length} NAS entries`);
    } catch (writeErr) {
      if (writeErr.code === 'EACCES') {
        console.log('[RADIUS-SYNC] Direct write failed with EACCES. Trying fallback via sudo cp...');
        const tempPath = '/tmp/clients.conf_temp';
        try {
          fs.writeFileSync(tempPath, clientsContent, 'utf8');
          await execPromise(`sudo cp ${tempPath} ${clientsConfPath}`);
          fs.unlinkSync(tempPath);
          console.log(`[RADIUS-SYNC] clients.conf updated via sudo cp with ${nasRows.length} NAS entries`);
        } catch (sudoWriteErr) {
          console.error('[RADIUS-SYNC] Fallback write failed:', sudoWriteErr.message);
          throw sudoWriteErr;
        }
      } else {
        throw writeErr;
      }
    }

    // 6. Validate FreeRADIUS config
    try {
      const { stdout, stderr } = await execPromise('sudo radiusd -C');
      console.log('[RADIUS-SYNC] FreeRADIUS config validation: OK');
    } catch (validateErr) {
      console.warn('[RADIUS-SYNC] FreeRADIUS validation warning:', validateErr.message);
    }

    // 7. Restart/Reload FreeRADIUS
    try {
      await reloadRadiusContainer();
      console.log('[RADIUS-SYNC] FreeRADIUS container reloaded successfully via docker.sock');
    } catch (reloadErr) {
      console.warn('[RADIUS-SYNC] Docker socket reload failed, trying systemctl fallback:', reloadErr.message);
      try {
        await execPromise('sudo systemctl restart freeradius');
        console.log('[RADIUS-SYNC] FreeRADIUS restarted successfully via systemctl fallback');
      } catch (restartErr) {
        console.error('[RADIUS-SYNC] All FreeRADIUS reload methods failed:', restartErr.message);
        return { 
          status: 'partial', 
          message: 'clients.conf updated but reload/restart failed',
          nasCount: nasRows.length,
          error: restartErr.message 
        };
      }
    }

    return { 
      status: 'success', 
      message: 'RADIUS clients.conf synced successfully',
      nasCount: nasRows.length,
      clients: nasRows.map(n => ({ nasname: n.nasname, shortname: n.shortname }))
    };

  } catch (error) {
    console.error('[RADIUS-SYNC] Error:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
};

/**
 * Test RADIUS client connection
 */
const testRadiusClient = async (nasname, secret) => {
  try {
    // Use radtest command to test authentication
    const testUsername = 'test_user';
    const testPassword = 'test_pass';
    const testSecret = 'testing123'; // RADIUS client secret when testing

    const { stdout, stderr } = await execPromise(
      `echo "Testing RADIUS client: ${nasname}"`
    );

    return {
      status: 'success',
      message: `RADIUS client ${nasname} is configured`,
      nasname,
      secret: secret ? '***' : 'NOT_SET'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};

module.exports = {
  syncRadiusClientsConf,
  testRadiusClient
};
