const pool = require('./config/db');

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS radius_reply_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        msg_key VARCHAR(50) UNIQUE,
        message TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const messages = [
      { 
        key: 'voucher_expired', 
        msg: 'Voucher Sudah Habis Masa Berlakunya', 
        desc: 'Pesan saat voucher sudah melewati expiration_date' 
      },
      { 
        key: 'mac_mismatch', 
        msg: 'Akses ditolak: Perangkat berbeda (Registered: %{control:Tmp-String-2})', 
        desc: 'Pesan saat MAC perangkat tidak cocok dengan yang terdaftar (Manual Lock)' 
      },
      { 
        key: 'auto_lock_mismatch', 
        msg: 'Akses ditolak: Perangkat tidak sesuai (Auto-Locked)', 
        desc: 'Pesan saat MAC perangkat tidak cocok (Auto Lock)' 
      },
      { 
        key: 'simultaneous_limit', 
        msg: 'Batas perangkat terlampaui (Maks: %{control:Simultaneous-Use})', 
        desc: 'Pesan saat jumlah user aktif melebihi batas' 
      },
      { 
        key: 'mac_not_registered', 
        msg: 'Perangkat belum terdaftar. Hubungi Admin.', 
        desc: 'Pesan saat mode Lock MAC aktif tapi MAC belum didaftarkan' 
      }
    ];

    for (const m of messages) {
      await pool.query(
        'INSERT IGNORE INTO radius_reply_messages (msg_key, message, description) VALUES (?, ?, ?)',
        [m.key, m.msg, m.desc]
      );
    }

    console.log('Reply messages table initialized');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

setup();
