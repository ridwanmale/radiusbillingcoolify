const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { generateOnlineVoucherCode, registerVoucherToRadius } = require('../utils/voucher');

/**
 * POST /api/payment-detections/armradius
 * Receives notification data from Android device
 */
router.post('/armradius*', async (req, res) => {
  const authHeader = req.headers.authorization;
  let { device_id, source_app, notification_title, notification_text, amount_detected, received_at, idempotency_key } = req.body;

  // Bersihkan amount_detected dari huruf/simbol, ambil angkanya saja (misal "Rp 10.000" jadi "10000")
  if (amount_detected) {
    amount_detected = String(amount_detected).replace(/[^0-9]/g, '');
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Validasi Device dan Token
    const [devices] = await db.query(
      'SELECT * FROM merchant_devices WHERE device_id = ? AND api_token = ? AND status = "active"',
      [device_id, token]
    );

    if (devices.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: Invalid device or token' });
    }

    const device = devices[0];

    // 2. Cek Idempotency (Cek apakah notifikasi ini sudah pernah diproses)
    const [existingLogs] = await db.query(
      'SELECT id, match_status, matched_order_id FROM payment_detection_logs WHERE idempotency_key = ?',
      [idempotency_key]
    );

    if (existingLogs.length > 0) {
      return res.json({ 
        success: true, 
        message: 'Notification already processed',
        match_status: existingLogs[0].match_status,
        matched_order_id: existingLogs[0].matched_order_id
      });
    }

    // 3. Simpan Log Awal (Format date untuk MySQL)
    let formattedReceivedAt;
    try {
      if (received_at) {
        // Cek apakah string berupa angka (milliseconds)
        const parsedDate = isNaN(received_at) ? new Date(received_at) : new Date(Number(received_at));
        formattedReceivedAt = parsedDate.toISOString().slice(0, 19).replace('T', ' ');
      } else {
        formattedReceivedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
    } catch (e) {
      formattedReceivedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    // Deteksi Provider dari source_app atau title
    let provider = 'shopeepay';
    const sa = (source_app || '').toLowerCase();
    const nt = (notification_title || '').toLowerCase();
    
    if (sa.includes('dana') || nt.includes('dana')) provider = 'dana';
    else if (sa.includes('gojek') || nt.includes('gopay')) provider = 'gopay';
    else if (sa.includes('ovo') || nt.includes('ovo')) provider = 'ovo';

    const [logResult] = await db.query(`
      INSERT INTO payment_detection_logs 
      (provider, source_app, notification_title, notification_text, amount_detected, device_id, received_at, raw_payload, idempotency_key, match_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      provider, source_app, notification_title, notification_text, amount_detected, device_id, formattedReceivedAt, JSON.stringify(req.body), idempotency_key, 'unmatched'
    ]);
    
    const logId = logResult.insertId;

    // Update last_seen_at device
    await db.query('UPDATE merchant_devices SET last_seen_at = NOW() WHERE id = ?', [device.id]);

    // 4. Cari Voucher Order yang Cocok
    // Kriteria: amount sama, status PENDING, dibuat dalam 2 jam terakhir
    const [pendingOrders] = await db.query(`
      SELECT * FROM jurnal_keuangan 
      WHERE total_amount = ? 
      AND status = 'PENDING'
      AND created_at >= NOW() - INTERVAL 2 HOUR
    `, [amount_detected]);

    let matchStatus = 'unmatched';
    let matchedOrderId = null;
    let nextAction = 'waiting_payment';

    if (pendingOrders.length === 1) {
      // COCOK TEPAT SATU
      const order = pendingOrders[0];
      matchStatus = 'matched';
      matchedOrderId = order.order_id;
      nextAction = 'auto_approved';

      // 1. Generate Voucher
      const voucherCode = await generateOnlineVoucherCode();
      await registerVoucherToRadius(voucherCode, order.package_id);

      // 2. Update order status to PAID
      await db.query(`
        UPDATE jurnal_keuangan 
        SET status = 'PAID', voucher_code = ?, paid_at = NOW(),
            kategori = 'Pemasukan', jenis = 'Voucher Online', admin = 'Payment Bridge',
            deskripsi = CONCAT(deskripsi, " [AUTO-PAID BRIDGE]"), qty = 1, total = ?
        WHERE id = ?
      `, [voucherCode, order.total_amount, order.id]);

      // 3. Update detection log
      await db.query(
        'UPDATE payment_detection_logs SET match_status = ?, matched_order_id = ? WHERE id = ?',
        ['matched', order.id, logId]
      );

      // 4. Kirim notifikasi Telegram ke Admin
      try {
        const { notifyTelegram } = require('../utils/telegram');
        const tgMessage = `🔔 <b>PEMBAYARAN PAYMENT BRIDGE BERHASIL</b>\n\n` +
                          `ID Pesanan: <code>${order.order_id}</code>\n` +
                          `Metode: <b>ShopeePay (Auto-Bridge)</b>\n` +
                          `Paket: <b>${order.package_id}</b>\n` +
                          `Nominal: <b>Rp ${Math.round(parseFloat(order.total_amount)).toLocaleString('id-ID')}</b>\n` +
                          `Kode Voucher: <code>${voucherCode}</code>\n\n` +
                          `<i>Voucher telah otomatis aktif di server RADIUS.</i>`;
        await notifyTelegram(tgMessage, 'Payment Gateway');
      } catch (tgErr) {
        console.error('[PaymentDetection] Telegram notify error:', tgErr.message);
      }

    } else if (pendingOrders.length > 1) {
      // COCOK BANYAK (Perlu Review Manual)
      matchStatus = 'need_manual_review';
      nextAction = 'need_manual_review';
      
      await db.query(
        'UPDATE payment_detection_logs SET match_status = ? WHERE id = ?',
        ['need_manual_review', logId]
      );

      // Kirim notifikasi ke Admin bahwa ada nominal ganda yang perlu direview
      try {
        const { notifyTelegram } = require('../utils/telegram');
        const tgMessage = `⚠️ <b>TINDAKAN DIPERLUKAN: DUA TRANSAKSI COCOK</b>\n\n` +
                          `Terdeteksi nominal ganda sebesar <b>Rp ${Math.round(parseFloat(amount_detected)).toLocaleString('id-ID')}</b>.\n` +
                          `Sistem tidak dapat menentukan pesanan mana yang dibayar secara otomatis.\n\n` +
                          `<i>Silakan masuk ke Admin Panel -> Payment Bridge Center untuk menyetujui transaksi secara manual.</i>`;
        await notifyTelegram(tgMessage, 'Payment Gateway');
      } catch (tgErr) {
        console.error('[PaymentDetection] Telegram notify error:', tgErr.message);
      }
    }

    res.json({
      success: true,
      match_status: matchStatus,
      order_number: matchedOrderId,
      next_action: nextAction
    });

  } catch (error) {
    console.error('[PaymentDetection] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin API: List detection logs
router.get('/logs', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM payment_detection_logs ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin API: List devices
router.get('/devices', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM merchant_devices');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin API: Register device
router.post('/devices', async (req, res) => {
  const { device_name, device_id, api_token } = req.body;
  try {
    await db.query(
      'INSERT INTO merchant_devices (device_name, device_id, api_token) VALUES (?, ?, ?)',
      [device_name, device_id, api_token]
    );
    res.json({ success: true, message: 'Device registered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin API: Delete detection log
router.delete('/logs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM payment_detection_logs WHERE id = ?', [id]);
    res.json({ success: true, message: 'Detection log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin API: Bulk delete logs
router.post('/logs/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No logs selected' });
  try {
    await db.query('DELETE FROM payment_detection_logs WHERE id IN (?)', [ids]);
    res.json({ success: true, message: `${ids.length} logs deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin API: Toggle device status
router.post('/devices/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.query('UPDATE merchant_devices SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: `Device status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin API: Delete device
router.delete('/devices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM merchant_devices WHERE id = ?', [id]);
    res.json({ success: true, message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
