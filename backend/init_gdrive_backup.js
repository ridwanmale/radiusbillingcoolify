const db = require('./config/db');

async function initGDriveBackup() {
  console.log('Initializing GDrive Backup Tables...');
  try {
    // 1. Create gdrive_settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS gdrive_settings (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        folder_id VARCHAR(255) DEFAULT '',
        cron_time VARCHAR(64) DEFAULT '0 2 * * *',
        is_enabled TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB;
    `);

    // Insert default row
    await db.query(`
      INSERT IGNORE INTO gdrive_settings (id, folder_id, cron_time, is_enabled)
      VALUES (1, '', '0 2 * * *', 0)
    `);

    // 2. Create backup_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_size VARCHAR(64),
        status ENUM('success', 'failed') DEFAULT 'success',
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 3. Add permission for superadmin
    await db.query(
      'INSERT IGNORE INTO role_menu_access (role, menu_id, is_allowed) VALUES (?, ?, ?)',
      ['superadmin', 'gdrive_backup', 1]
    );

    console.log('GDrive Backup Tables initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing tables:', err);
    process.exit(1);
  }
}

initGDriveBackup();
