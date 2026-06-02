const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const ftp = require('basic-ftp');
const db = require('../config/db');

const execAsync = util.promisify(exec);

// Path for storing temporary backup files before uploading
const backupsDir = path.join(__dirname, '../backups');

// Ensure backups directory exists
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

async function performFTPBackup() {
  let filePath = '';
  
  try {
    // 1. Get FTP settings
    const [settings] = await db.query('SELECT * FROM ftp_settings WHERE id = 1');
    if (settings.length === 0 || !settings[0].is_enabled) {
      return { success: false, message: 'FTP Backup is not enabled' };
    }
    const ftpConfig = settings[0];
    if (!ftpConfig.host || !ftpConfig.username || !ftpConfig.password) {
      throw new Error('FTP konfigurasi tidak lengkap');
    }

    // 2. Generate MySQL Dump
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-radius-ftp-${timestamp}.sql`;
    filePath = path.join(backupsDir, fileName);

    const dbUser = process.env.DB_USER || 'radius';
    const dbPass = process.env.DB_PASSWORD || process.env.DB_PASS || 'radpass';
    const dbName = process.env.DB_NAME || 'radius';
    const dbHost = process.env.DB_HOST || 'localhost';

    console.log(`[FTP Backup] Starting mysqldump to ${filePath}...`);
    const dumpCmd = `mysqldump -h ${dbHost} -u ${dbUser} ${dbName} > "${filePath}"`;
    await execAsync(dumpCmd, {
      env: { ...process.env, MYSQL_PWD: dbPass }
    });

    // 3. Upload to FTP
    console.log(`[FTP Backup] Uploading ${fileName} to ${ftpConfig.host}...`);
    const client = new ftp.Client(15000); // 15 seconds timeout
    client.ftp.verbose = false;
    
    // Force IPv4 to prevent EPSV issues with Mikrotik
    client.ftp.ipFamily = 4;
    
    await client.access({
      host: ftpConfig.host,
      port: ftpConfig.port || 21,
      user: ftpConfig.username,
      password: ftpConfig.password,
      secure: false
    });

    // Mikrotik doesn't like some commands, make sure we handle it gently
    client.trackProgress(info => {
        console.log(`[FTP Backup] Progress: ${info.bytes} bytes`);
    });

    const remotePath = ftpConfig.remote_path || '/';
    await client.ensureDir(remotePath);
    await client.uploadFrom(filePath, fileName);
    
    client.close();
    console.log(`[FTP Backup] Upload successful!`);

    // Get file size
    const stats = fs.statSync(filePath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

    // 4. Log success
    await db.query(
      'INSERT INTO backup_logs (file_name, file_size, status, message) VALUES (?, ?, ?, ?)',
      [fileName, fileSizeInMB, 'success', 'FTP Backup successful']
    );

    // 5. Cleanup temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return { success: true, message: 'FTP Backup berhasil diselesaikan' };
  } catch (error) {
    console.error('[FTP Backup] Error:', error);
    
    // Log failure
    try {
      await db.query(
        'INSERT INTO backup_logs (file_name, file_size, status, message) VALUES (?, ?, ?, ?)',
        ['FTP_BACKUP_FAILED', '0 MB', 'failed', error.message || 'Unknown error']
      );
    } catch (dbErr) {
      console.error('Failed to log FTP backup failure:', dbErr);
    }

    // Cleanup temp file
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    throw error;
  }
}

module.exports = {
  performFTPBackup
};
