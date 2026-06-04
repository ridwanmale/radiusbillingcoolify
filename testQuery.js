const db = require('./backend/config/db');

async function test() {
  try {
    const filterMonth = 6;
    const filterYear = 2026;
    
    let systemOnlineQuery = `
      SELECT 
        MAX(id) as id,
        DATE(COALESCE(paid_at, tanggal)) as tanggal, 
        UPPER(kategori) as kategori, 
        UPPER(jenis) as jenis, 
        'SYSTEM' as admin, 
        CONCAT('Akumulasi ', UPPER(jenis)) as deskripsi, 
        SUM(COALESCE(qty, 1)) as qty, 
        SUM(total) as total 
      FROM jurnal_keuangan 
      WHERE MONTH(COALESCE(paid_at, tanggal)) = ? AND YEAR(COALESCE(paid_at, tanggal)) = ?
      AND (status = 'PAID' OR status IS NULL OR status = '' OR status = 'SUCCESS')
      AND UPPER(jenis) IN ('VOUCHER ONLINE', 'PEMBAYARAN PPPOE')
      GROUP BY DATE(COALESCE(paid_at, tanggal)), UPPER(kategori), UPPER(jenis)
    `;
    const [systemOnlineRows] = await db.query(systemOnlineQuery, [filterMonth, filterYear]);
    console.log(systemOnlineRows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
