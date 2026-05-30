const pool = require('./config/db');

const fields = [
  { id: 'voucher_code', label: 'KODE VOUCHER' },
  { id: 'password', label: 'PASSWORD' },
  { id: 'profile', label: 'PROFILE' },
  { id: 'shared_users', label: 'SHARED' },
  { id: 'created_at', label: 'KODE TGL PEMBUATAN' },
  { id: 'outlet_name', label: 'OUTLET' },
  { id: 'print_code', label: 'KODE PRINT' },
  { id: 'hpp', label: 'HPP' },
  { id: 'komisi', label: 'KOMISI' },
  { id: 'harga', label: 'HARGA' },
  { id: 'masa_aktif', label: 'MASA AKTIF' },
  { id: 'activated_at', label: 'TGL AKTIF' },
  { id: 'expiration_date', label: 'TGL EXPIRED' },
  { id: 'mac_status', label: 'MAC STATUS' },
  { id: 'voucher_status', label: 'STATUS VOUCHER' },
  { id: 'selling_status', label: 'STATUS SELLING' },
  { id: 'mikrotik_group', label: 'GROUP MIKROTIK' },
  { id: 'rate_limit', label: 'RATE LIMIT' },
  { id: 'router', label: 'ROUTER' }
];

async function setup() {
  try {
    console.log('Starting UI Layout setup...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ui_field_config (
        field_id VARCHAR(64) PRIMARY KEY,
        display_label VARCHAR(128),
        is_visible TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0
      )
    `);

    for (const f of fields) {
      await pool.query(
        'INSERT IGNORE INTO ui_field_config (field_id, display_label) VALUES (?, ?)',
        [f.id, f.label]
      );
    }
    
    console.log('✅ UI Layout configuration table ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error setup UI Layout:', err);
    process.exit(1);
  }
}

setup();
