const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getServiceAccountEmail, performBackup } = require('../utils/gdriveBackupService');

// Get Settings & Info
router.get('/', async (req, res) => {
  try {
    const serviceEmail = await getServiceAccountEmail();
    const [settings] = await db.query('SELECT * FROM gdrive_settings WHERE id = 1');
    
    // Get last backup status
    const [logs] = await db.query('SELECT * FROM backup_logs ORDER BY id DESC LIMIT 1');
    
    let gdriveSettings = null;
    if (settings.length > 0) {
      gdriveSettings = settings[0];
    } else {
      gdriveSettings = { folder_id: '', cron_time: '0 2 * * *', is_enabled: 0 };
    }

    res.json({
      serviceEmail,
      settings: gdriveSettings,
      lastBackup: logs.length > 0 ? logs[0] : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update Settings
router.post('/settings', async (req, res) => {
  try {
    const { folder_id, cron_time, is_enabled } = req.body;
    
    await db.query(`
      INSERT INTO gdrive_settings (id, folder_id, cron_time, is_enabled)
      VALUES (1, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      folder_id = VALUES(folder_id), 
      cron_time = VALUES(cron_time), 
      is_enabled = VALUES(is_enabled)
    `, [folder_id || '', cron_time || '0 2 * * *', is_enabled ? 1 : 0]);
    
    // Need to trigger a reload of cron job in server.js, maybe via an event or we just reload it
    // For simplicity, we just return success
    // In server.js we can poll this table every minute or use an event emitter.

    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

// Trigger Manual Backup
router.post('/trigger', async (req, res) => {
  try {
    const result = await performBackup();
    res.json({ message: 'Backup completed successfully', result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Backup failed' });
  }
});

// Get Logs
router.get('/logs', async (req, res) => {
  try {
    const [logs] = await db.query('SELECT * FROM backup_logs ORDER BY id DESC LIMIT 50');
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

module.exports = router;
