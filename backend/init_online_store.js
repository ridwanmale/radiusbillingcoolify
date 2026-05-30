const db = require('./config/db');

async function initOnlineStore() {
  try {
    // 1. Tabel Transaksi
    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id int(11) NOT NULL auto_increment PRIMARY KEY,
        order_id varchar(32) NOT NULL UNIQUE,
        package_id int(11) NOT NULL,
        amount int(11) NOT NULL,
        unique_code int(5) NOT NULL,
        total_amount int(11) NOT NULL,
        status enum('PENDING', 'PAID', 'FAILED', 'EXPIRED') DEFAULT 'PENDING',
        voucher_code varchar(32),
        customer_name varchar(64),
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        paid_at datetime
      ) ENGINE=InnoDB;
    `);

    // 2. Tabel Pengaturan Portal
    await db.query(`
      CREATE TABLE IF NOT EXISTS portal_settings (
        id int(11) NOT NULL PRIMARY KEY DEFAULT 1,
        portal_title varchar(128) DEFAULT 'Wi-Fi Voucher Store',
        portal_description varchar(255) DEFAULT 'Beli voucher internet instan 24 jam',
        primary_color varchar(20) DEFAULT '#6366f1',
        qris_static_string text,
        notification_token varchar(64),
        is_active boolean DEFAULT true
      ) ENGINE=InnoDB;
    `);

    // Tambahkan data awal jika belum ada
    const [rows] = await db.query('SELECT id FROM portal_settings WHERE id = 1');
    if (rows.length === 0) {
      await db.query('INSERT INTO portal_settings (id) VALUES (1)');
    }

    console.log('Online Store Database initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

initOnlineStore();
