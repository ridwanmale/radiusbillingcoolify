const db = require('./config/db');

async function upgradePackageId() {
  try {
    console.log('Mengubah tipe data package_id...');
    await db.query('ALTER TABLE transactions MODIFY COLUMN package_id varchar(64) NOT NULL');
    console.log('Berhasil! Sekarang package_id bisa menampung nama profile.');
    process.exit(0);
  } catch (err) {
    console.error('Gagal mengubah tipe data:', err.message);
    process.exit(1);
  }
}

upgradePackageId();
