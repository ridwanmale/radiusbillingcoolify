const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const db = require('../config/db');
const fetch = require('node-fetch');
const FormData = require('form-data');

const execAsync = util.promisify(exec);

async function uploadToTelegram(filePath, botToken, chatId) {
  const fileName = path.basename(filePath);
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('document', fs.createReadStream(filePath), fileName);
  formData.append('caption', `📦 Database Backup: ${fileName}`);

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Telegram API Error: ${errText}`);
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Telegram API Error: ${result.description}`);
  }

  return result;
}

async function performBackup() {
  try {
    const [settings] = await db.query('SELECT * FROM telegram_backup_settings WHERE id = 1');
    if (settings.length === 0 || !settings[0].bot_token || !settings[0].chat_id) {
      throw new Error('Telegram Backup is not configured (Token/Chat ID missing)');
    }
    
    const botToken = settings[0].bot_token;
    const chatId = settings[0].chat_id;
    
    // MySQL configuration
    const dbUser = process.env.DB_USER || 'radius';
    const dbPass = process.env.DB_PASSWORD || process.env.DB_PASS || 'radpass';
    const dbName = process.env.DB_NAME || 'radius';
    const dbHost = process.env.DB_HOST || 'localhost';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${dbName}-${timestamp}.sql`;
    const backupsDir = path.join(__dirname, '../scratch'); // Use scratch or tmp folder
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir);
    }
    
    const filePath = path.join(backupsDir, fileName);

    console.log(`Starting mysqldump to ${filePath}...`);
    // Pass password via MYSQL_PWD environment variable to safely handle special characters
    const dumpCmd = `mysqldump -h ${dbHost} -u ${dbUser} ${dbName} > "${filePath}"`;
    
    await execAsync(dumpCmd, {
      env: { ...process.env, MYSQL_PWD: dbPass }
    });
    
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

    console.log(`Uploading to Telegram...`);
    await uploadToTelegram(filePath, botToken, chatId);
    
    // Remove local file
    fs.unlinkSync(filePath);
    
    // Log success
    await db.query(
      'INSERT INTO backup_logs (file_name, file_size, status, message) VALUES (?, ?, ?, ?)',
      [fileName, fileSizeMB, 'success', 'Backup successfully sent to Telegram.']
    );
    
    return { success: true, fileName, size: fileSizeMB };

  } catch (error) {
    console.error('Backup Error:', error);
    // Log error
    await db.query(
      'INSERT INTO backup_logs (file_name, file_size, status, message) VALUES (?, ?, ?, ?)',
      ['unknown', '0 MB', 'failed', error.message]
    );
    throw error;
  }
}

module.exports = {
  performBackup
};
