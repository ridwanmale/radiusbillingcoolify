const pool = require('./config/db');

async function initDeviceControl() {
  try {
    console.log('Starting Device Control database initialization...');

    // 1. Create users_device_policy table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users_device_policy (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        device_mode ENUM('none', 'shared_1_device', 'lock_mac', 'auto_lock_mac') DEFAULT 'none',
        registered_mac VARCHAR(20) DEFAULT NULL,
        previous_mac VARCHAR(20) DEFAULT NULL,
        last_seen_mac VARCHAR(20) DEFAULT NULL,
        max_shared_session INT DEFAULT 1,
        is_mac_locked TINYINT(1) DEFAULT 0,
        locked_at DATETIME DEFAULT NULL,
        unlocked_at DATETIME DEFAULT NULL,
        unlocked_by VARCHAR(64) DEFAULT NULL,
        last_login_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (username),
        INDEX (registered_mac)
      ) ENGINE=InnoDB;
    `);
    console.log('Table users_device_policy created or already exists.');

    // 2. Create device_login_log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_login_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        calling_station_id VARCHAR(20) NOT NULL,
        registered_mac VARCHAR(20) DEFAULT NULL,
        nas_ip_address VARCHAR(15) NOT NULL,
        login_status ENUM('success', 'reject') NOT NULL,
        reject_reason VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (username),
        INDEX (created_at)
      ) ENGINE=InnoDB;
    `);
    console.log('Table device_login_log created or already exists.');

    console.log('Database initialization completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
}

initDeviceControl();
