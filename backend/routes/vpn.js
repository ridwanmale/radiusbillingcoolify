const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Sync DB to vpnusers.txt
const syncVpnUsersFile = async () => {
  try {
    const [rows] = await db.query('SELECT username, password FROM vpn_accounts');
    const content = rows.map(r => `${r.username},${r.password}`).join('\n');
    try {
      fs.writeFileSync('/vpnusers.txt', content);
      console.log('vpnusers.txt synced to /vpnusers.txt');
    } catch (fsErr) {
      // Fallback for native PM2 deployment without docker container
      const fallbackPath = path.join(__dirname, '../../vpnusers.txt');
      fs.writeFileSync(fallbackPath, content);
      console.log('vpnusers.txt synced successfully to fallback:', fallbackPath);
    }
  } catch (err) {
    console.error('Sync File Error:', err);
  }
};

// Ensure table exists
const ensureTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS vpn_accounts (
      id int(11) NOT NULL auto_increment PRIMARY KEY,
      username varchar(64) NOT NULL UNIQUE,
      password varchar(64) NOT NULL,
      psk varchar(64) NOT NULL DEFAULT 'radius_vpn_secret',
      created_at datetime DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
};

// Get VPN Peers (WireGuard)
router.get('/peers', async (req, res) => {
  const vpnConfigPath = '/vpn-config';
  try {
    if (!fs.existsSync(vpnConfigPath)) return res.json({ peers: [] });
    const peers = [];
    const dirs = fs.readdirSync(vpnConfigPath).filter(f => f.startsWith('peer'));
    for (const dir of dirs) {
      const confPath = path.join(vpnConfigPath, dir, `${dir}.conf`);
      if (fs.existsSync(confPath)) {
        const content = fs.readFileSync(confPath, 'utf8');
        const publicKeyMatch = content.match(/#\s*PublicKey\s*=\s*(.*)/);
        const addressMatch = content.match(/Address\s*=\s*(.*)/);
        peers.push({
          id: dir,
          address: addressMatch ? addressMatch[1] : '',
          publicKey: publicKeyMatch ? publicKeyMatch[1] : 'Check server logs',
        });
      }
    }
    res.json({ peers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// L2TP ACCOUNTS CRUD
router.get('/l2tp', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await db.query('SELECT * FROM vpn_accounts ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/l2tp', async (req, res) => {
  const { username, password, psk, status } = req.body;
  try {
    await ensureTable();
    await db.query('INSERT INTO vpn_accounts (username, password, psk, status) VALUES (?, ?, ?, ?)', [username, password, psk, status || 'Aktif']);
    await syncVpnUsersFile();
    res.json({ message: 'Akun VPN berhasil dibuat' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/l2tp/:id', async (req, res) => {
  const { username, password, psk, status } = req.body;
  try {
    await db.query('UPDATE vpn_accounts SET username = ?, password = ?, psk = ?, status = ? WHERE id = ?', [username, password, psk, status, req.params.id]);
    await syncVpnUsersFile();
    res.json({ message: 'Akun VPN berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/l2tp/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM vpn_accounts WHERE id = ?', [req.params.id]);
    await syncVpnUsersFile();
    res.json({ message: 'Akun VPN berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GLOBAL VPN SETTINGS
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT vpn_ip_pool, vpn_local_ip FROM settings WHERE id = 1');
    res.json(rows[0] || { vpn_ip_pool: '192.168.42.0/24', vpn_local_ip: '192.168.42.1' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/settings', async (req, res) => {
  const { vpn_ip_pool, vpn_local_ip } = req.body;
  try {
    await db.query('UPDATE settings SET vpn_ip_pool = ?, vpn_local_ip = ? WHERE id = 1', [vpn_ip_pool, vpn_local_ip]);
    
    // Update .env.vpn file
    const envPath = path.join(__dirname, '../../.env.vpn');
    let content = fs.readFileSync(envPath, 'utf8');
    
    const updateEnv = (key, val) => {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (content.match(regex)) {
        content = content.replace(regex, `${key}=${val}`);
      } else {
        content += `\n${key}=${val}`;
      }
    };

    updateEnv('VPN_L2TP_NET', vpn_ip_pool);
    updateEnv('VPN_L2TP_LOCAL', vpn_local_ip);
    
    fs.writeFileSync(envPath, content);
    
    res.json({ message: 'Pengaturan VPN berhasil disimpan. Silakan restart container VPN.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
