const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require('fs');
const { getServiceAccountEmail, performBackup, SERVICE_ACCOUNT_FILE } = require('../utils/gdriveBackupService');
const { performFTPBackup } = require('../utils/ftpBackupService');
const { generateLocalBackup } = require('../utils/localBackupService');

// ==========================================
// INFO & SETTINGS
// ==========================================
router.get('/', async (req, res) => {
  try {
    const serviceEmail = await getServiceAccountEmail();
    
    // GDrive Settings
    const [gSettings] = await db.query('SELECT * FROM gdrive_settings WHERE id = 1');
    let gdriveSettings = gSettings.length > 0 ? gSettings[0] : { folder_id: '', cron_time: '0 2 * * *', is_enabled: 0 };
    
    // FTP Settings
    const [fSettings] = await db.query('SELECT * FROM ftp_settings WHERE id = 1');
    let ftpSettings = fSettings.length > 0 ? fSettings[0] : { host: '', port: 21, username: '', password: '', remote_path: '/', cron_time: '0 2 * * *', is_enabled: 0 };

    // Get last backup status (can be from GDrive or FTP)
    const [logs] = await db.query('SELECT * FROM backup_logs ORDER BY id DESC LIMIT 1');

    res.json({
      serviceEmail,
      gdriveSettings,
      ftpSettings,
      lastBackup: logs.length > 0 ? logs[0] : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update GDrive Settings
router.post('/gdrive/settings', async (req, res) => {
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
    res.json({ message: 'GDrive settings saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save GDrive settings' });
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

// Save GDrive Service Account JSON
router.post('/gdrive/credentials', (req, res) => {
  try {
    const { credentials } = req.body;
    if (!credentials) {
      return res.status(400).json({ message: 'Credentials content is empty' });
    }
    // Validate JSON format
    JSON.parse(credentials);
    
    // Save to file
    fs.writeFileSync(SERVICE_ACCOUNT_FILE, credentials, 'utf8');
    res.json({ message: 'Service Account credentials saved successfully' });
  } catch (error) {
    console.error('Invalid credentials format:', error.message);
    res.status(400).json({ message: 'Format JSON tidak valid. Pastikan Anda mengkopi seluruh isi file service-account.json' });
  }
});

// ==========================================
// TRIGGERS
// ==========================================

// Trigger GDrive Backup
router.post('/gdrive/trigger', async (req, res) => {
  try {
    const result = await performBackup();
    res.json({ message: 'Google Drive backup completed successfully', result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'GDrive backup failed' });
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
