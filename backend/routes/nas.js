const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { syncRadiusClientsConf } = require('../utils/radius-sync');

const isValidIpv4OrCidr = (value) => {
  if (!value || typeof value !== 'string') return false;
  const match = value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/);
  if (!match) return false;

  const octets = match.slice(1, 5).map(Number);
  const cidr = match[5] === undefined ? null : Number(match[5]);
  return octets.every(octet => octet >= 0 && octet <= 255) && (cidr === null || (cidr >= 0 && cidr <= 32));
};

// Helper to sync vpnusers.txt
const syncVpnUsersLocal = async () => {
  try {
    const [rows] = await db.query('SELECT username, password FROM vpn_accounts');
    const content = rows.map(r => `${r.username},${r.password}`).join('\n');
    try {
      fs.writeFileSync('/vpnusers.txt', content);
      console.log('[NAS] vpnusers.txt synced successfully to /vpnusers.txt');
    } catch (fsErr) {
      // Fallback for native PM2 deployment without docker container
      const fallbackPath = path.join(__dirname, '../../vpnusers.txt');
      fs.writeFileSync(fallbackPath, content);
      console.log('[NAS] vpnusers.txt synced successfully to fallback:', fallbackPath);
    }
  } catch (err) {
    console.error('[NAS] Sync File Error:', err);
  }
};

// Get all NAS
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT n.*, 
        (SELECT CASE WHEN COUNT(*) > 0 THEN 'Online' ELSE 'Offline' END 
         FROM radacct ra 
         WHERE (ra.nasipaddress = n.nasname OR 
               (n.connection_mode = 'vpn' AND n.nasname LIKE '%/24' AND ra.nasipaddress LIKE CONCAT(SUBSTRING_INDEX(n.nasname, '0/24', 1), '%')))
         AND (ra.acctstarttime >= DATE_SUB(NOW(), INTERVAL 1 HOUR) OR ra.acctstoptime IS NULL)) as status
      FROM nas n 
      ORDER BY n.id DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create NAS
router.post('/', async (req, res) => {
  let { nasname, shortname, secret, description, auth_port, acct_port, connection_mode, vpn_protocol } = req.body;
  
  connection_mode = connection_mode || 'ip_publik';
  vpn_protocol = vpn_protocol || 'l2tp';
  auth_port = auth_port ? parseInt(auth_port) : 1812;
  acct_port = acct_port ? parseInt(acct_port) : 1813;
  
  const generateRandomKey = (length = 12) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const directModes = ['ip_publik', 'local_direct'];

  if (directModes.includes(connection_mode) && (!nasname || nasname.trim() === '')) {
    return res.status(400).json({ error: 'IP Address (nasname) is required for direct connection' });
  }

  if (directModes.includes(connection_mode)) {
    nasname = nasname.trim();
    if (!isValidIpv4OrCidr(nasname)) {
      return res.status(400).json({ error: 'IP Address MikroTik harus berupa IPv4 atau CIDR, contoh: 192.168.69.1 atau 0.0.0.0/0' });
    }
  }

  if (!secret || secret.trim() === '') {
    secret = generateRandomKey(12);
  }

  try {
    let vpnUser = null;
    let vpnPass = null;
    let vpnPsk = 'radius_vpn_secret';

    if (connection_mode === 'vpn') {
      // 1. Allocate next available IP from Settings.vpn_ip_pool
      const [settings] = await db.query('SELECT vpn_ip_pool, vpn_local_ip FROM settings WHERE id = 1');
      const vpnPool = (settings[0] && settings[0].vpn_ip_pool) || '192.168.42.0/24';
      const baseIpMatch = vpnPool.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)/);
      const ipPrefix = baseIpMatch ? baseIpMatch[1] : '192.168.42.';
      const localIp = (settings[0] && settings[0].vpn_local_ip) || '192.168.42.1';
      const localLastOctet = parseInt(localIp.split('.')[3]) || 1;

      // Find all occupied IPs in nasname
      const [existingNas] = await db.query('SELECT nasname FROM nas');
      const usedOctets = new Set(existingNas.map(n => {
        if (n.nasname && n.nasname.startsWith(ipPrefix)) {
          const octet = parseInt(n.nasname.replace(ipPrefix, ''));
          return isNaN(octet) ? null : octet;
        }
        return null;
      }).filter(o => o !== null));

      let allocatedOctet = 10;
      while (allocatedOctet === localLastOctet || usedOctets.has(allocatedOctet)) {
        allocatedOctet++;
        if (allocatedOctet > 254) break;
      }
      nasname = `${ipPrefix}${allocatedOctet}`;

      // 2. Generate clean VPN credentials
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const cleanShort = (shortname || 'router').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10);
      vpnUser = `vpn_${cleanShort}_${randSuffix}`;
      vpnPass = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100);

      // 3. Save to vpn_accounts table
      await db.query(
        'INSERT INTO vpn_accounts (username, password, psk) VALUES (?, ?, ?)',
        [vpnUser, vpnPass, vpnPsk]
      );
      await syncVpnUsersLocal();
    }

    const [result] = await db.query(
      `INSERT INTO nas (nasname, shortname, secret, description, type, ports, auth_port, acct_port, connection_mode, vpn_protocol, vpn_user, vpn_pass, vpn_psk) 
       VALUES (?, ?, ?, ?, "other", ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nasname, shortname, secret, description, auth_port, auth_port, acct_port, connection_mode, vpn_protocol, vpnUser, vpnPass, vpnPsk]
    );

    const { logActivity } = require('./logs');
    await logActivity(req.body.admin_username, 'Add NAS', `Menambah router NAS: ${nasname} (${connection_mode})`, req);

    // Sync FreeRADIUS config
    try {
      await syncRadiusClientsConf();
    } catch (syncErr) {
      console.error('[NAS] Sync FreeRADIUS failed:', syncErr.message);
    }

    res.json({ id: result.insertId, message: 'Router NAS added successfully', nasname });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update NAS
router.put('/:id', async (req, res) => {
  let { nasname, shortname, secret, description, auth_port, acct_port, connection_mode, vpn_protocol } = req.body;
  connection_mode = connection_mode || 'ip_publik';
  vpn_protocol = vpn_protocol || 'l2tp';
  auth_port = auth_port ? parseInt(auth_port) : 1812;
  acct_port = acct_port ? parseInt(acct_port) : 1813;
  const directModes = ['ip_publik', 'local_direct'];
  if (directModes.includes(connection_mode)) {
    if (!nasname || nasname.trim() === '') {
      return res.status(400).json({ error: 'IP Address MikroTik wajib diisi' });
    }
    nasname = nasname.trim();
    if (!isValidIpv4OrCidr(nasname)) {
      return res.status(400).json({ error: 'IP Address MikroTik harus berupa IPv4 atau CIDR, contoh: 192.168.69.1 atau 0.0.0.0/0' });
    }
  }
  try {
    // Get existing NAS first to compare
    const [existing] = await db.query('SELECT * FROM nas WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Router NAS tidak ditemukan' });
    const oldNas = existing[0];

    let vpnUser = oldNas.vpn_user;
    let vpnPass = oldNas.vpn_pass;
    let vpnPsk = oldNas.vpn_psk || 'radius_vpn_secret';

    if (connection_mode === 'vpn' && oldNas.connection_mode !== 'vpn') {
      // Switched to VPN! Allocate a new IP and credentials
      const [settings] = await db.query('SELECT vpn_ip_pool, vpn_local_ip FROM settings WHERE id = 1');
      const vpnPool = (settings[0] && settings[0].vpn_ip_pool) || '192.168.42.0/24';
      const baseIpMatch = vpnPool.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)/);
      const ipPrefix = baseIpMatch ? baseIpMatch[1] : '192.168.42.';
      const localIp = (settings[0] && settings[0].vpn_local_ip) || '192.168.42.1';
      const localLastOctet = parseInt(localIp.split('.')[3]) || 1;

      const [existingNas] = await db.query('SELECT nasname FROM nas WHERE id != ?', [req.params.id]);
      const usedOctets = new Set(existingNas.map(n => {
        if (n.nasname && n.nasname.startsWith(ipPrefix)) {
          const octet = parseInt(n.nasname.replace(ipPrefix, ''));
          return isNaN(octet) ? null : octet;
        }
        return null;
      }).filter(o => o !== null));

      let allocatedOctet = 10;
      while (allocatedOctet === localLastOctet || usedOctets.has(allocatedOctet)) {
        allocatedOctet++;
        if (allocatedOctet > 254) break;
      }
      nasname = `${ipPrefix}${allocatedOctet}`;

      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const cleanShort = (shortname || 'router').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10);
      vpnUser = `vpn_${cleanShort}_${randSuffix}`;
      vpnPass = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100);

      await db.query(
        'INSERT INTO vpn_accounts (username, password, psk) VALUES (?, ?, ?)',
        [vpnUser, vpnPass, vpnPsk]
      );
      await syncVpnUsersLocal();
    } else if (connection_mode !== 'vpn' && oldNas.connection_mode === 'vpn') {
      // Switched from VPN to IP Publik! Remove the old VPN account
      if (oldNas.vpn_user) {
        await db.query('DELETE FROM vpn_accounts WHERE username = ?', [oldNas.vpn_user]);
        await syncVpnUsersLocal();
      }
      vpnUser = null;
      vpnPass = null;
    }

    await db.query(
      `UPDATE nas SET 
        nasname = ?, shortname = ?, secret = ?, description = ?, 
        ports = ?, auth_port = ?, acct_port = ?, connection_mode = ?, 
        vpn_protocol = ?, vpn_user = ?, vpn_pass = ?, vpn_psk = ?
       WHERE id = ?`,
      [nasname, shortname, secret, description, auth_port, auth_port, acct_port, connection_mode, vpn_protocol, vpnUser, vpnPass, vpnPsk, req.params.id]
    );

    const { logActivity } = require('./logs');
    await logActivity(req.body.admin_username, 'Update NAS', `Memperbarui router NAS: ${nasname}`, req);

    // Sync FreeRADIUS config
    try {
      await syncRadiusClientsConf();
    } catch (syncErr) {
      console.error('[NAS] Sync FreeRADIUS failed:', syncErr.message);
    }

    res.json({ message: 'Router NAS updated', nasname });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete NAS
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM nas WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Router NAS tidak ditemukan' });
    }
    const oldNas = existing[0];

    // Check for existing PPPoE Customers linked to this router
    const [customers] = await db.query('SELECT COUNT(*) as count FROM pppoe_customers WHERE router_id = ?', [req.params.id]);
    if (customers[0].count > 0) {
      return res.status(400).json({ error: `Gagal menghapus: Router ini masih digunakan oleh ${customers[0].count} Pelanggan PPPoE. Harap hapus atau pindahkan pelanggan tersebut terlebih dahulu.` });
    }

    if (oldNas.connection_mode === 'vpn' && oldNas.vpn_user) {
      await db.query('DELETE FROM vpn_accounts WHERE username = ?', [oldNas.vpn_user]);
      await syncVpnUsersLocal();
    }

    // Explicitly delete dependent servers first to avoid foreign key constraints in older schemas
    await db.query('DELETE FROM nas_servers WHERE nas_id = ?', [req.params.id]);

    await db.query('DELETE FROM nas WHERE id = ?', [req.params.id]);

    const { logActivity } = require('./logs');
    await logActivity(req.query.admin_username, 'Delete NAS', `Menghapus router NAS ID: ${req.params.id}`, req);

    // Sync FreeRADIUS config
    try {
      await syncRadiusClientsConf();
    } catch (syncErr) {
      console.error('[NAS] Sync FreeRADIUS failed:', syncErr.message);
    }

    res.json({ message: 'Router NAS deleted' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({ error: 'Gagal menghapus: Router ini masih terkait dengan data lain (Pelanggan PPPoE, dll).' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// GET NAS Servers list
router.get('/:nasId/servers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM nas_servers WHERE nas_id = ? ORDER BY id DESC', [req.params.nasId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST Add NAS Server
router.post('/:nasId/servers', async (req, res) => {
  const { server_name } = req.body;
  if (!server_name || server_name.trim() === '') {
    return res.status(400).json({ error: 'Server name tidak boleh kosong' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO nas_servers (nas_id, server_name) VALUES (?, ?)',
      [req.params.nasId, server_name.trim()]
    );
    
    const { logActivity } = require('./logs');
    await logActivity(req.body.admin_username, 'Add NAS Server', `Menambah server: ${server_name} ke NAS ID: ${req.params.nasId}`, req);
    
    res.json({ id: result.insertId, message: 'Server berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT Update NAS Server
router.put('/:nasId/servers/:serverId', async (req, res) => {
  const { server_name } = req.body;
  if (!server_name || server_name.trim() === '') {
    return res.status(400).json({ error: 'Server name tidak boleh kosong' });
  }
  try {
    await db.query(
      'UPDATE nas_servers SET server_name = ? WHERE id = ? AND nas_id = ?',
      [server_name.trim(), req.params.serverId, req.params.nasId]
    );
    res.json({ message: 'Server berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE NAS Server
router.delete('/:nasId/servers/:serverId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM nas_servers WHERE id = ? AND nas_id = ?',
      [req.params.serverId, req.params.nasId]
    );
    res.json({ message: 'Server berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
