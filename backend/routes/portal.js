const { exec } = require('child_process');
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Otentikasi & Penguncian MAC (Pra-Otentikasi) - UUID Removed
router.post('/pre-auth', async (req, res) => {
  const { username, mac } = req.body;

  if (!username || !mac) {
    return res.status(400).json({ status: 'error', message: 'Parameter tidak lengkap (username, mac diperlukan).' });
  }

  const cleanMac = mac.trim();
  const cleanUsername = username.trim();

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Cek apakah voucher ada di database rincian_transaksi_voucher atau radcheck
    const [voucherRows] = await connection.query(
      'SELECT username FROM rincian_transaksi_voucher WHERE username = ? LIMIT 1',
      [cleanUsername]
    );

    const [radcheckUserRows] = await connection.query(
      'SELECT username FROM radcheck WHERE username = ? AND attribute = "Cleartext-Password" LIMIT 1',
      [cleanUsername]
    );

    if (voucherRows.length === 0 && radcheckUserRows.length === 0) {
      await connection.rollback();
      // Multi-RADIUS Bypass
      return res.json({ status: 'success', bypass: true, message: 'Bypassing to external RADIUS.' });
    }

    // Cek apakah mac lock diaktifkan untuk voucher ini
    const [macLockRows] = await connection.query(
      'SELECT 1 FROM radreply WHERE username = ? AND value = "MAC_LOCK_ENABLED" LIMIT 1',
      [cleanUsername]
    );
    
    const isMacLockEnabled = macLockRows.length > 0;

    // 2. Cek apakah voucher sudah terkunci ke suatu MAC di radcheck
    const [existingMacLock] = await connection.query(
      'SELECT value FROM radcheck WHERE username = ? AND attribute = "Calling-Station-Id" LIMIT 1',
      [cleanUsername]
    );

    if (existingMacLock.length === 0) {
      // Kunci di radcheck jika MAC lock diaktifkan
      if (isMacLockEnabled) {
        await connection.query(
          'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, "Calling-Station-Id", "==", ?)',
          [cleanUsername, cleanMac]
        );
      }
      await connection.commit();
      return res.json({ status: 'success', message: 'Pendaftaran perangkat berhasil!' });
    } else {
      // Voucher sudah dikunci ke suatu MAC sebelumnya!
      if (existingMacLock[0].value === cleanMac) {
        await connection.commit();
        return res.json({ status: 'success', message: 'Otentikasi perangkat berhasil!' });
      } else {
        // MAC tidak cocok!
        await connection.rollback();
        return res.status(403).json({ status: 'error', message: 'Voucher ini sudah terkunci di perangkat lain!' });
      }
    }
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('[Pre-Auth API Error]:', err.message);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan internal server.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
