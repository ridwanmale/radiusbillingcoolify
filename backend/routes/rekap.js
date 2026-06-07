const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all rekap grouped by kode_print
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        vm.batch_id as kode_print,
        MIN(vm.created_at) as created_at,
        vm.outlet_name,
        COALESCE(NULLIF(MAX(vm.profile), 'Unknown'), MAX(rug.groupname), 'Unknown') as profile,
        COUNT(DISTINCT vm.username) as qty,
        SUM(CASE WHEN COALESCE(vm.status, 'Aktif') = 'Aktif' THEN 1 ELSE 0 END) as sisa_stock,
        SUM(CASE WHEN vm.status = 'Terjual' THEN 1 ELSE 0 END) as terjual,
        SUM(CASE WHEN vm.status = 'Expired' THEN 1 ELSE 0 END) as expired,
        MAX(pm.harga) as harga,
        MAX(pm.komisi) as komisi
      FROM rincian_transaksi_voucher vm
      LEFT JOIN radcheck rc ON vm.username = rc.username AND rc.attribute = 'Cleartext-Password'
      LEFT JOIN radusergroup rug ON vm.username = rug.username
      LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname
      WHERE vm.batch_id != 'ONLINE-STORE'
      GROUP BY vm.batch_id, vm.outlet_name
      ORDER BY created_at DESC
    `);
    
    // Calculate derived fields
    const data = rows.map(r => {
      const harga = Number(r.harga) || 0;
      const komisi = Number(r.komisi) || 0;
      const hpp = harga - komisi;
      
      const total_hpp = hpp * r.qty;
      const total_harga = harga * r.qty;
      const total_laba = komisi * r.qty;

      return {
        ...r,
        total_hpp,
        total_harga,
        total_laba
      };
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE batch by status
router.delete('/:kode_print/:status_type', async (req, res) => {
  const { kode_print, status_type } = req.params;
  
  // status_type = 'sisa' or 'terjual'
  let statusCondition = "COALESCE(vm.status, 'Aktif') != 'Terjual'"; // sisa
  if (status_type === 'terjual') {
    statusCondition = "vm.status = 'Terjual'";
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(`
      SELECT vm.username 
      FROM rincian_transaksi_voucher vm
      WHERE vm.batch_id = ? AND ${statusCondition}
    `, [kode_print]);

    if (rows.length === 0) {
      await connection.commit();
      return res.status(404).json({ error: 'Tidak ada data voucher dengan status tersebut untuk dihapus.' });
    }

    const usernames = rows.map(r => r.username);
    const placeholders = usernames.map(() => '?').join(',');

    await connection.query(`DELETE FROM radcheck WHERE username IN (${placeholders})`, usernames);
    await connection.query(`DELETE FROM radreply WHERE username IN (${placeholders})`, usernames);
    await connection.query(`DELETE FROM radusergroup WHERE username IN (${placeholders})`, usernames);
    await connection.query(`DELETE FROM radpostauth WHERE username IN (${placeholders})`, usernames);
    
    // Update status to 'Dibatalkan' instead of deleting
    await connection.query(`UPDATE rincian_transaksi_voucher SET status = 'Dibatalkan' WHERE username IN (${placeholders})`, usernames);

    await connection.commit();
    res.json({ message: `Berhasil membatalkan ${usernames.length} voucher.` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
