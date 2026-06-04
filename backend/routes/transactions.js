const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all transactions with summary (Grouped by Date, Simplified Labels)
router.get('/', async (req, res) => {
  const { month, year } = req.query;
  try {
    const filterMonth = month || new Date().getMonth() + 1;
    const filterYear = year || new Date().getFullYear();

    // Query 1a: Manual Transactions (Pemasukan & Pengeluaran Manual) - Not Aggregated
    let manualQuery = `
      SELECT 
        id,
        DATE(COALESCE(paid_at, tanggal)) as tanggal, 
        UPPER(kategori) as kategori, 
        UPPER(jenis) as jenis, 
        UPPER(admin) as admin, 
        UPPER(deskripsi) as deskripsi, 
        qty, 
        total 
      FROM jurnal_keuangan 
      WHERE MONTH(COALESCE(paid_at, tanggal)) = ? AND YEAR(COALESCE(paid_at, tanggal)) = ?
      AND (status = 'PAID' OR status IS NULL OR status = '' OR status = 'SUCCESS')
      AND (UPPER(jenis) NOT IN ('VOUCHER ONLINE', 'PEMBAYARAN PPPOE') OR jenis IS NULL)
    `;
    const [manualRows] = await db.query(manualQuery, [filterMonth, filterYear]);

    // Query 1b: System Transactions from jurnal_keuangan (Voucher Online, PPPOE) - Aggregated
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

    // Query 2: Physical Sold Vouchers (Pemasukan dihitung berdasarkan HPP)
    let incomeQuery = `
      SELECT 
        DATE(vm.sold_at) as tanggal, 
        'PEMASUKAN' as kategori, 
        'VOUCHER' as jenis, 
        'SYSTEM' as admin, 
        'PENJUALAN FISIK' as deskripsi, 
        COUNT(*) as qty, 
        SUM(pm.hpp) as total
      FROM rincian_transaksi_voucher vm
      JOIN radusergroup rug ON vm.username = rug.username
      JOIN profiles_metadata pm ON rug.groupname = pm.groupname
      WHERE vm.status IN ('Terjual', 'Expired') 
      AND vm.batch_id != 'ONLINE-STORE'
      AND MONTH(vm.sold_at) = ? 
      AND YEAR(vm.sold_at) = ?
      GROUP BY DATE(vm.sold_at)
    `;
    const [incomeRows] = await db.query(incomeQuery, [filterMonth, filterYear]);

    // Query 3: Refunded Vouchers (Pengeluaran Refund)
    let refundQuery = `
      SELECT 
        DATE(vm.sold_at) as tanggal, 
        'PENGELUARAN' as kategori, 
        'REFUND' as jenis, 
        'SYSTEM' as admin, 
        'REFUND VOUCHER' as deskripsi, 
        COUNT(*) as qty, 
        SUM(IF(vm.batch_id = 'ONLINE-STORE', pm.harga, pm.hpp)) as total
      FROM rincian_transaksi_voucher vm
      LEFT JOIN radusergroup rug ON vm.username = rug.username
      LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname
      WHERE vm.status = 'Refund' 
      AND MONTH(vm.sold_at) = ? 
      AND YEAR(vm.sold_at) = ?
      GROUP BY DATE(vm.sold_at)
    `;
    const [refundRows] = await db.query(refundQuery, [filterMonth, filterYear]);

    // Combine all (Manual + SystemOnline + Physical Income + Refund)
    const allTransactions = [...manualRows, ...systemOnlineRows, ...incomeRows, ...refundRows].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    // Calculate Summary
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    
    allTransactions.forEach(row => {
      if (row.kategori === 'PEMASUKAN') totalPemasukan += parseFloat(row.total || 0);
      else totalPengeluaran += parseFloat(row.total || 0);
    });

    res.json({
      transactions: allTransactions,
      summary: {
        totalPemasukan,
        totalPengeluaran,
        laba: totalPemasukan - totalPengeluaran
      }
    });
  } catch (error) {
    console.error('[Transactions API] Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new transaction
router.post('/', async (req, res) => {
  const { kategori, jenis, admin, deskripsi, qty, total } = req.body;
  try {
    await db.query(
      'INSERT INTO jurnal_keuangan (kategori, jenis, admin, deskripsi, qty, total) VALUES (?, ?, ?, ?, ?, ?)',
      [kategori, jenis, admin, deskripsi, qty, total]
    );
    res.json({ message: 'Transaksi berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update transaction (Only for manual entries)
router.put('/:id', async (req, res) => {
  const { kategori, jenis, deskripsi, qty, total } = req.body;
  try {
    await db.query(
      'UPDATE jurnal_keuangan SET kategori = ?, jenis = ?, deskripsi = ?, qty = ?, total = ? WHERE id = ? AND jenis != "Voucher Online" AND jenis != "Refund"',
      [kategori, jenis, deskripsi, qty, total, req.params.id]
    );
    res.json({ message: 'Transaksi berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM jurnal_keuangan WHERE id = ?', [req.params.id]);
    res.json({ message: 'Transaksi dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
