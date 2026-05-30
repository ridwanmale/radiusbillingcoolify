#!/usr/bin/env node

/**
 * Standalone script untuk sync RADIUS clients.conf
 * Usage: node sync-radius.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'radius',
  password: process.env.DB_PASSWORD || 'radius_password',
  database: process.env.DB_NAME || 'radius',
  timezone: '+07:00'
};

const CLIENTS_CONF_PATH = '/etc/freeradius/3.0/clients.conf';

async function syncRadiusClients() {
  let connection;
  
  try {
    console.log('[SYNC] Starting RADIUS clients.conf sync...');
    console.log(`[SYNC] Database: ${DB_CONFIG.host}/${DB_CONFIG.database}`);

    // 1. Connect to database
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('[SYNC] Connected to database');

    // 2. Query all NAS
    const [nasRows] = await connection.query(`
      SELECT nasname, shortname, secret, description, connection_mode, type, ports
      FROM nas
      WHERE shortname IS NOT NULL
      ORDER BY id ASC
    `);

    if (nasRows.length === 0) {
      console.warn('[SYNC] No NAS found in database');
      return process.exit(0);
    }

    console.log(`[SYNC] Found ${nasRows.length} NAS entries`);

    // 3. Generate clients.conf
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

    for (const nas of nasRows) {
      const description = nas.description ? ` # ${nas.description}` : '';
      clientsContent += `# ${nas.shortname} (${nas.connection_mode})${description}
client ${nas.nasname} {
    shortname = ${nas.shortname}
    secret = ${nas.secret}
    proto = *
`;

      if (nas.ports && nas.ports !== 1812) {
        clientsContent += `    port = ${nas.ports}\n`;
      }

      clientsContent += `}

`;
    }

    // 4. Backup old config
    const backupPath = `${CLIENTS_CONF_PATH}.backup.${Date.now()}`;
    try {
      if (fs.existsSync(CLIENTS_CONF_PATH)) {
        fs.copyFileSync(CLIENTS_CONF_PATH, backupPath);
        console.log(`[SYNC] Backup created: ${backupPath}`);
      }
    } catch (backupErr) {
      if (backupErr.code === 'EACCES') {
        try {
          await execPromise(`sudo cp ${CLIENTS_CONF_PATH} ${backupPath}`);
          console.log(`[SYNC] Backup created via sudo cp: ${backupPath}`);
        } catch (sudoBackupErr) {
          console.warn('[SYNC] Backup failed via sudo cp:', sudoBackupErr.message);
        }
      } else {
        console.warn('[SYNC] Backup failed:', backupErr.message);
      }
    }

    // 5. Write new config
    try {
      fs.writeFileSync(CLIENTS_CONF_PATH, clientsContent, 'utf8');
      console.log(`[SYNC] clients.conf updated directly with ${nasRows.length} NAS entries`);
    } catch (writeErr) {
      if (writeErr.code === 'EACCES') {
        console.log('[SYNC] Direct write failed with EACCES. Trying fallback via sudo cp...');
        const tempPath = '/tmp/clients.conf_temp';
        try {
          fs.writeFileSync(tempPath, clientsContent, 'utf8');
          await execPromise(`sudo cp ${tempPath} ${CLIENTS_CONF_PATH}`);
          fs.unlinkSync(tempPath);
          console.log(`[SYNC] clients.conf updated via sudo cp with ${nasRows.length} NAS entries`);
        } catch (sudoWriteErr) {
          console.error('[SYNC] Fallback write failed:', sudoWriteErr.message);
          throw sudoWriteErr;
        }
      } else {
        throw writeErr;
      }
    }

    // 6. Validate config
    try {
      const { stdout } = await execPromise('sudo radiusd -C');
      console.log('[SYNC] FreeRADIUS config validation: OK');
    } catch (err) {
      console.warn('[SYNC] FreeRADIUS validation warning:', err.message.split('\n')[0]);
    }

    // 7. Restart FreeRADIUS
    try {
      await execPromise('sudo systemctl restart freeradius');
      console.log('[SYNC] FreeRADIUS restarted successfully');
      console.log('[SYNC] ✅ Sync completed successfully!');
      
      // Print summary
      console.log('\n📊 NAS Configuration Summary:');
      nasRows.forEach(nas => {
        console.log(`  • ${nas.nasname} (${nas.shortname}) - ${nas.connection_mode}`);
      });
      
    } catch (err) {
      console.error('[SYNC] ⚠️  Failed to restart FreeRADIUS:', err.message);
      console.error('[SYNC] Manual restart required: sudo systemctl restart freeradius');
      process.exit(1);
    }

    connection.end();

  } catch (error) {
    console.error('[SYNC] ❌ Error:', error.message);
    if (connection) connection.end();
    process.exit(1);
  }
}

// Run sync
syncRadiusClients();
