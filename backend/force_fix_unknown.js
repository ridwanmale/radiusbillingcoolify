const db = require('./config/db');

async function fixUnknowns() {
  try {
    console.log('Memperbaiki data lama yang sudah terlanjur terhapus (Unknown)...');
    
    // Kita set default menjadi '7 JAM' karena dari polanya sepertinya itu adalah 7 JAM
    const [result] = await db.query(`
      UPDATE rincian_transaksi_voucher 
      SET profile = '7 JAM' 
      WHERE profile = 'Unknown' OR profile IS NULL
    `);
    
    console.log(`Berhasil mengubah ${result.affectedRows} data voucher lama menjadi 7 JAM!`);
    process.exit(0);
  } catch (err) {
    console.error('Gagal:', err);
    process.exit(1);
  }
}

fixUnknowns();
