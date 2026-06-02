const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const db = require('../config/db');

const execAsync = util.promisify(exec);

// Path to service account (We will assume it's stored in config/service-account.json)
// The admin will need to place their service-account.json in the backend/config folder.
const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../config/service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getAuthClient() {
  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    throw new Error('Service Account file not found in config/service-account.json');
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: SCOPES,
  });
  return auth;
}

async function getServiceAccountEmail() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      return 'Service Account Belum Dikonfigurasi (Silakan upload config/service-account.json di server)';
    }
    const keyData = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
    return keyData.client_email || 'Tidak ditemukan client_email di JSON';
  } catch (error) {
    return 'Error membaca service account';
  }
}

async function uploadToGDrive(filePath, folderId) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const fileName = path.basename(filePath);
  
  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : undefined,
  };
  
  const media = {
    mimeType: 'application/sql',
    body: fs.createReadStream(filePath),
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    return file.data.id;
  } catch (err) {
    console.error('Error uploading to GDrive:', err);
    throw err;
  }
}

async function cleanupOldBackups(folderId, daysToKeep = 7) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    // List files in the backup folder
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
    });
    
    const files = res.data.files;
    if (!files || files.length === 0) {
      return 0; // No files found
    }

    let deletedCount = 0;
    const now = new Date();
    
    // We only want to keep up to `daysToKeep` files ideally. Let's delete anything older than X days.
    for (const file of files) {
      const createdTime = new Date(file.createdTime);
      const diffTime = Math.abs(now - createdTime);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays > daysToKeep) {
        // Delete file
        await drive.files.delete({ fileId: file.id });
        console.log(`Deleted old backup from GDrive: ${file.name}`);
        deletedCount++;
      }
    }
    
    // Fallback: If somehow there are still more than 7 files, delete the oldest ones
    const remainingFilesRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
    });
    
    const remainingFiles = remainingFilesRes.data.files;
    if (remainingFiles && remainingFiles.length > daysToKeep) {
      for (let i = daysToKeep; i < remainingFiles.length; i++) {
        await drive.files.delete({ fileId: remainingFiles[i].id });
        console.log(`Deleted extra old backup from GDrive: ${remainingFiles[i].name}`);
        deletedCount++;
      }
    }
    
    return deletedCount;
  } catch (err) {
    console.error('Error cleaning up old GDrive backups:', err);
    throw err;
  }
}

async function performBackup() {
  try {
    const [settings] = await db.query('SELECT * FROM gdrive_settings WHERE id = 1');
    if (settings.length === 0 || !settings[0].folder_id) {
      throw new Error('GDrive Backup Folder ID is not configured');
    }
    
    const folderId = settings[0].folder_id;
    
    // MySQL configuration
    const dbUser = process.env.DB_USER || 'radius';
    const dbPass = process.env.DB_PASS || 'radpass';
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
    // NOTE: In production, consider using a safer way to pass password, but for standard mysqldump:
    const dumpCmd = \`mysqldump -h \${dbHost} -u \${dbUser} -p\${dbPass} \${dbName} > \${filePath}\`;
    
    await execAsync(dumpCmd);
    
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

    console.log(`Uploading to GDrive...`);
    await uploadToGDrive(filePath, folderId);
    
    console.log(`Cleaning up old backups (retention: 7 days)...`);
    await cleanupOldBackups(folderId, 7);
    
    // Remove local file
    fs.unlinkSync(filePath);
    
    // Log success
    await db.query(
      'INSERT INTO backup_logs (file_name, file_size, status, message) VALUES (?, ?, ?, ?)',
      [fileName, fileSizeMB, 'success', 'Backup successfully uploaded to Google Drive. Old backups cleaned.']
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
  getServiceAccountEmail,
  performBackup,
};
