const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Path for storing temporary backup files before downloading
const backupsDir = path.join(__dirname, '../backups');

// Ensure backups directory exists
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

async function generateLocalBackup() {
  let filePath = '';
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-radius-local-${timestamp}.sql`;
    filePath = path.join(backupsDir, fileName);

    const dbUser = process.env.DB_USER || 'radius';
    const dbPass = process.env.DB_PASSWORD || process.env.DB_PASS || 'radpass';
    const dbName = process.env.DB_NAME || 'radius';
    const dbHost = process.env.DB_HOST || 'localhost';

    console.log(`[Local Backup] Starting mysqldump to ${filePath}...`);
    const dumpCmd = `mysqldump --skip-ssl -h ${dbHost} -u ${dbUser} ${dbName} > "${filePath}"`;
    
    await execAsync(dumpCmd, {
      env: { ...process.env, MYSQL_PWD: dbPass }
    });

    return { filePath, fileName };
  } catch (error) {
    console.error('[Local Backup] Error:', error);
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    throw error;
  }
}

module.exports = {
  generateLocalBackup
};
