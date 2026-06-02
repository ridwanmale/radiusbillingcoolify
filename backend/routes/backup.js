const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require('fs');
const { performBackup: performTelegramBackup } = require('../utils/telegramBackupService');
const { performFTPBackup } = require('../utils/ftpBackupService');
const { generateLocalBackup } = require('../utils/localBackupService');

// ==========================================
// INFO & SETTINGS
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Telegram Settings
    const [tSettings] = await db.query('SELECT * FROM telegram_backup_settings WHERE id = 1');
    let telegramSettings = tSettings.length > 0 ? tSettings[0] : { bot_token: '', chat_id: '', cron_time: '0 2 * * *', is_enabled: 0 };
    
    // FTP Settings
    const [fSettings] = await db.query('SELECT * FROM ftp_settings WHERE id = 1');
    let ftpSettings = fSettings.length > 0 ? fSettings[0] : { host: '', port: 21, username: '', password: '', remote_path: '/', cron_time: '0 2 * * *', is_enabled: 0 };

    // Get last backup status (can be from GDrive or FTP)
    const [logs] = await db.query('SELECT * FROM backup_logs ORDER BY id DESC LIMIT 1');

    res.json({
      telegramSettings,
      ftpSettings,
      lastBackup: logs.length > 0 ? logs[0] : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update Telegram Settings
router.post('/telegram/settings', async (req, res) => {
  try {
    const { bot_token, chat_id, cron_time, is_enabled } = req.body;
    await db.query(`
      INSERT INTO telegram_backup_settings (id, bot_token, chat_id, cron_time, is_enabled)
      VALUES (1, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      bot_token = VALUES(bot_token), 
      chat_id = VALUES(chat_id),
      cron_time = VALUES(cron_time), 
      is_enabled = VALUES(is_enabled)
    `, [bot_token || '', chat_id || '', cron_time || '0 2 * * *', is_enabled ? 1 : 0]);
    res.json({ message: 'Telegram settings saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save Telegram settings' });
  }
});

// Update FTP Settings
router.post('/ftp/settings', async (req, res) => {
  try {
    const { host, port, username, password, remote_path, cron_time, is_enabled } = req.body;
    await db.query(`
      INSERT INTO ftp_settings (id, host, port, username, password, remote_path, cron_time, is_enabled)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      host = VALUES(host), 
      port = VALUES(port), 
      username = VALUES(username), 
      password = VALUES(password), 
      remote_path = VALUES(remote_path), 
      cron_time = VALUES(cron_time), 
      is_enabled = VALUES(is_enabled)
    `, [host || '', port || 21, username || '', password || '', remote_path || '/', cron_time || '0 2 * * *', is_enabled ? 1 : 0]);
    res.json({ message: 'FTP settings saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save FTP settings' });
  }
});

// Trigger Telegram Backup
router.post('/telegram/trigger', async (req, res) => {
  try {
    const result = await performTelegramBackup();
    res.json({ message: 'Telegram backup completed successfully', result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Telegram backup failed' });
  }
});

// Trigger FTP Backup
router.post('/ftp/trigger', async (req, res) => {
  try {
    const result = await performFTPBackup();
    res.json({ message: 'FTP backup completed successfully', result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'FTP backup failed' });
  }
});

// Trigger Local Download
router.get('/local/download', async (req, res) => {
  try {
    const { filePath, fileName } = await generateLocalBackup();
    res.download(filePath, fileName, (err) => {
      // Cleanup after download
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Local backup failed' });
  }
});

// ==========================================
// LOGS
// ==========================================
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
