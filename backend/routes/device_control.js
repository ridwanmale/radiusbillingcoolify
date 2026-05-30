const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get Device Policy for a user
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const [rows] = await pool.query(`
      SELECT p.*, v.status as voucher_status 
      FROM users_device_policy p
      LEFT JOIN rincian_transaksi_voucher v ON p.username = v.username
      WHERE p.username = ?
    `, [username]);
    
    if (rows.length === 0) {
      // Get status even if no policy exists yet
      const [vRows] = await pool.query('SELECT status FROM rincian_transaksi_voucher WHERE username = ?', [username]);
      return res.json({
        username,
        device_mode: 'none',
        registered_mac: null,
        is_mac_locked: 0,
        voucher_status: vRows.length > 0 ? vRows[0].status : 'Unknown'
      });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update or Create Device Policy
router.post('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { device_mode, max_shared_session } = req.body;
    
    await pool.query(`
      INSERT INTO users_device_policy (username, device_mode, max_shared_session)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE device_mode = VALUES(device_mode), max_shared_session = VALUES(max_shared_session)
    `, [username, device_mode || 'none', max_shared_session || 1]);
    
    res.json({ message: 'Device policy updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unlock MAC
router.post('/:username/unlock', async (req, res) => {
  try {
    const { username } = req.params;
    const { admin_name } = req.body;
    
    const [user] = await pool.query('SELECT registered_mac FROM users_device_policy WHERE username = ?', [username]);
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'User policy not found' });
    }
    
    const previous_mac = user[0].registered_mac;
    
    await pool.query(`
      UPDATE users_device_policy 
      SET previous_mac = ?, 
          registered_mac = NULL, 
          unlocked_at = NOW(), 
          unlocked_by = ? 
      WHERE username = ?
    `, [previous_mac, admin_name || 'admin', username]);
    
    res.json({ message: 'MAC address unlocked successfully', previous_mac });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual Lock MAC
router.post('/:username/lock', async (req, res) => {
  try {
    const { username } = req.params;
    const { mac_address } = req.body;
    
    if (!mac_address) {
      return res.status(400).json({ error: 'MAC address is required' });
    }
    
    await pool.query(`
      INSERT INTO users_device_policy (username, device_mode, registered_mac, locked_at)
      VALUES (?, 'lock_mac', ?, NOW())
      ON DUPLICATE KEY UPDATE device_mode = 'lock_mac', registered_mac = VALUES(registered_mac), locked_at = NOW()
    `, [username, mac_address]);
    
    res.json({ message: 'MAC address locked manually' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Login Logs
router.get('/:username/logs', async (req, res) => {
  try {
    const { username } = req.params;
    const [rows] = await pool.query('SELECT * FROM device_login_log WHERE username = ? ORDER BY created_at DESC LIMIT 50', [username]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
