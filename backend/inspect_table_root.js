const db = require('./config/db');

async function run() {
  try {
    const [columns] = await db.query('DESCRIBE rincian_transaksi_voucher');
    console.log('--- COLUMNS ---');
    console.log(columns);

    const [rows] = await db.query('SELECT * FROM rincian_transaksi_voucher ORDER BY created_at DESC LIMIT 10');
    console.log('--- LATEST 10 RECORDS ---');
    console.log(JSON.stringify(rows, null, 2));

    const [rowsWrong] = await db.query('SELECT * FROM rincian_transaksi_voucher WHERE outlet_name LIKE "%2026-%" ORDER BY created_at DESC LIMIT 10');
    console.log('--- RECORDS WITH DATE-LIKE OUTLET_NAME ---');
    console.log(JSON.stringify(rowsWrong, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
