const express = require('express');
const router = express.Router();
const db = require('../config/db');
const waGateway = require('../utils/waGateway');

// GET settings
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM wa_gateway_settings WHERE id = 1');
    if (rows.length === 0) {
      return res.json({ provider_type: 'baileys', is_enabled: 0, api_token: '', api_url: '' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching WA settings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT settings
router.put('/settings', async (req, res) => {
  const { provider_type, api_url, api_token, is_enabled } = req.body;
  try {
    await db.query(`
      INSERT INTO wa_gateway_settings (id, provider_type, api_url, api_token, is_enabled)
      VALUES (1, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      provider_type = VALUES(provider_type),
      api_url = VALUES(api_url),
      api_token = VALUES(api_token),
      is_enabled = VALUES(is_enabled)
    `, [provider_type, api_url || '', api_token || '', is_enabled ? 1 : 0]);
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    console.error('Error saving WA settings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET Baileys Status
router.get('/baileys/status', (req, res) => {
  res.json(waGateway.getStatus());
});

// POST Baileys Start
router.post('/baileys/start', async (req, res) => {
  try {
    await waGateway.startBaileys();
    res.json({ success: true, message: 'Engine started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Baileys Stop
router.post('/baileys/stop', (req, res) => {
  try {
    waGateway.stopBaileys();
    res.json({ success: true, message: 'Engine stopped' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Test Message
router.post('/test', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'Phone and message required' });
  
  try {
    const success = await waGateway.sendMessage(phone, message);
    if (success) {
      res.json({ success: true, message: 'Test message sent' });
    } else {
      res.status(500).json({ error: 'Failed to send message. Please check logs and settings.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
