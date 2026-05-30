const db = require('../config/db');

async function run() {
  try {
    const [columns] = await db.query('DESCRIBE rincian_transaksi_voucher');
    console.log('--- COLUMNS ---');
    console.log(columns);

    const [rows] = await db.query('SELECT * FROM rincian_transaksi_voucher ORDER BY created_at DESC LIMIT 10');
    console.log('--- LATEST 10 RECORDS ---');
    console.log(rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
