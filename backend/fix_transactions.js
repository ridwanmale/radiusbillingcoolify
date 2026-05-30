const db = require('./config/db');

async function fixTransactionsTable() {
  try {
    console.log('Memperbaiki struktur tabel transactions (Versi 2)...');
    
    // Cek kolom yang ada
    const [columns] = await db.query('SHOW COLUMNS FROM transactions');
    const colNames = columns.map(c => c.Field);

    const addColumn = async (name, definition) => {
      if (!colNames.includes(name)) {
        await db.query(`ALTER TABLE transactions ADD COLUMN ${name} ${definition}`);
        console.log(`- Kolom ${name} ditambahkan.`);
      }
    };

    await addColumn('order_id', "varchar(32) NOT NULL UNIQUE");
    await addColumn('package_id', "varchar(64) NOT NULL"); // Menggunakan varchar agar bisa simpan nama profile
    await addColumn('amount', "int(11) NOT NULL DEFAULT 0");
    await addColumn('unique_code', "int(5) NOT NULL DEFAULT 0");
    await addColumn('total_amount', "int(11) NOT NULL DEFAULT 0");
    await addColumn('status', "enum('PENDING', 'PAID', 'FAILED', 'EXPIRED') DEFAULT 'PENDING'");
    await addColumn('voucher_code', "varchar(32)");
    await addColumn('customer_name', "varchar(64)");
    await addColumn('paid_at', "datetime");

    console.log('Semua kolom yang dibutuhkan sudah siap!');
    process.exit(0);
  } catch (err) {
    console.error('Gagal memperbaiki tabel:', err.message);
    process.exit(1);
  }
}

fixTransactionsTable();
