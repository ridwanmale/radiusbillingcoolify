const db = require('./config/db');

async function initPaymentDetections() {
  try {
    // 1. Tabel Merchant Devices
    await db.query(`
      CREATE TABLE IF NOT EXISTS merchant_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_name VARCHAR(100),
        device_id VARCHAR(100) UNIQUE NOT NULL,
        api_token VARCHAR(255) NOT NULL,
        provider VARCHAR(50) DEFAULT 'shopeepay',
        status ENUM('active', 'inactive') DEFAULT 'active',
        last_seen_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Tabel Payment Detection Logs
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_detection_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider VARCHAR(50) DEFAULT 'shopeepay',
        source_app VARCHAR(100),
        notification_title TEXT,
        notification_text TEXT,
        amount_detected DECIMAL(15,2),
        device_id VARCHAR(100),
        received_at DATETIME,
        matched_order_id INT,
        match_status ENUM('unmatched', 'matched', 'need_manual_review') DEFAULT 'unmatched',
        raw_payload JSON,
        idempotency_key VARCHAR(255) UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    console.log('Payment Detection Database initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Initialization failed:', err);
    process.exit(1);
  }
}

initPaymentDetections();
