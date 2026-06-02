const cron = require('node-cron');
const db = require('../config/db');
const { performBackup: performTelegramBackup } = require('./telegramBackupService');
const { performFTPBackup } = require('./ftpBackupService');

let telegramBackupTask = null;
let ftpBackupTask = null;

const scheduleBackups = async () => {
  try {
    // We use db.query directly to avoid connection leaks
    const [tSettings] = await db.query('SELECT * FROM telegram_backup_settings WHERE id = 1');
    const [fSettings] = await db.query('SELECT * FROM ftp_settings WHERE id = 1');

    // --- TELEGRAM SCHEDULE ---
    if (telegramBackupTask) {
      telegramBackupTask.stop();
      telegramBackupTask = null;
    }
    if (tSettings.length > 0 && tSettings[0].is_enabled) {
      const tCron = tSettings[0].cron_time || '0 2 * * *';
      console.log(`[Backup] Scheduling Telegram daily backup at: ${tCron}`);
      telegramBackupTask = cron.schedule(tCron, async () => {
        console.log('[Backup] Executing scheduled Telegram backup...');
        try {
          await performTelegramBackup();
        } catch (error) {
          console.error('[Backup] Scheduled Telegram backup failed:', error.message);
        }
      }, {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    }

    // --- FTP SCHEDULE ---
    if (ftpBackupTask) {
      ftpBackupTask.stop();
      ftpBackupTask = null;
    }
    if (fSettings.length > 0 && fSettings[0].is_enabled) {
      const fCron = fSettings[0].cron_time || '0 2 * * *';
      console.log(`[Backup] Scheduling FTP daily backup at: ${fCron}`);
      ftpBackupTask = cron.schedule(fCron, async () => {
        console.log('[Backup] Executing scheduled FTP backup...');
        try {
          await performFTPBackup();
        } catch (error) {
          console.error('[Backup] Scheduled FTP backup failed:', error.message);
        }
      }, {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    }

  } catch (err) {
    // If tables don't exist yet, it will fail silently
    console.error('[Backup] Failed to schedule backups:', err.message);
  }
};

module.exports = {
  scheduleBackups
};
