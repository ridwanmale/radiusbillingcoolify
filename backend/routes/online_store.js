const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { notifyTelegram } = require('../utils/telegram');

// Helper to dynamically resolve the public URL for callbacks/returns, ignoring stale sync files
function getPublicUrl(req) {
  const syncFile = path.join(__dirname, '../ngrok_status.json');
  if (fs.existsSync(syncFile)) {
    try {
      const stats = fs.statSync(syncFile);
      const mtime = stats.mtime.getTime();
      const now = Date.now();
      // Only trust ngrok_status.json if updated in the last 15 minutes
      if (now - mtime < 15 * 60 * 1000) {
        const syncData = JSON.parse(fs.readFileSync(syncFile, 'utf8').replace(/^\uFEFF/, ''));
        if (syncData.tunnels && syncData.tunnels.length > 0) {
          return syncData.tunnels[0].public_url;
        }
      }
    } catch (e) {
      console.error('Error reading sync file for public URL:', e.message);
    }
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${protocol}://${req.get('host')}`;
}

function isStoreOpenBySchedule(settings) {
  if (settings.enable_schedule) {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
    
    const openTime = settings.open_time || '08:00';
    const closeTime = settings.close_time || '22:00';
    
    if (openTime <= closeTime) {
      if (currentStr < openTime || currentStr > closeTime) {
        return false;
      }
    } else {
      if (currentStr < openTime && currentStr > closeTime) {
        return false;
      }
    }
  }
  return true;
}

const checkStoreOpen = async (req, res, next) => {
  try {
    const [settingsRows] = await db.query('SELECT * FROM portal_settings WHERE id = 1');
    const settings = settingsRows[0];
    if (settings) {
      if (!settings.is_active || !isStoreOpenBySchedule(settings)) {
        return res.status(403).json({ error: 'Portal pembelian online sedang tutup atau di luar jam operasional.' });
      }
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkSpamProtection = async (req, res, next) => {
  try {
    const [settingsRows] = await db.query('SELECT spam_protection_enabled, spam_max_pending, spam_auto_unblock_minutes FROM portal_settings WHERE id = 1');
    const settings = settingsRows[0];
    if (!settings || !settings.spam_protection_enabled) return next();

    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const device_id = req.body.device_id || '';

    // 1. Check if already blocked
    let blockCheckQuery = 'SELECT id, reason, blocked_at, ip_address as b_ip, device_id as b_device FROM spam_blocklist WHERE ip_address = ?';
    let blockCheckParams = [ip_address];
    if (device_id) {
      blockCheckQuery += ' OR device_id = ?';
      blockCheckParams.push(device_id);
    }
    const [blockedRows] = await db.query(blockCheckQuery, blockCheckParams);
    
    if (blockedRows.length > 0) {
      const b = blockedRows[0];
      const unblockMinutes = settings.spam_auto_unblock_minutes || 0;
      
      if (unblockMinutes > 0 && b.blocked_at) {
        const blockedTime = new Date(b.blocked_at).getTime();
        const now = new Date().getTime();
        if (now - blockedTime > unblockMinutes * 60 * 1000) {
          // AUTO UNBLOCK INLINE
          let delQuery = 'DELETE FROM jurnal_keuangan WHERE status = "PENDING" AND (ip_address = ?';
          let delParams = [b.b_ip];
          if (b.b_device) {
            delQuery += ' OR device_id = ?)';
            delParams.push(b.b_device);
          } else {
            delQuery += ')';
          }
          await db.query(delQuery, delParams);
          await db.query('DELETE FROM spam_blocklist WHERE id = ?', [b.id]);
          
          return next(); // Unblocked! Let them proceed
        }
      }
      
      return res.status(403).json({ error: 'Akses Anda diblokir karena terlalu banyak membuat transaksi yang belum dibayar. Hubungi Admin.', blocked: true });
    }

    // 2. Count pending transactions
    let pendingCountQuery = 'SELECT COUNT(id) as count FROM jurnal_keuangan WHERE status = "PENDING" AND (ip_address = ?';
    let pendingCountParams = [ip_address];
    if (device_id) {
      pendingCountQuery += ' OR device_id = ?)';
      pendingCountParams.push(device_id);
    } else {
      pendingCountQuery += ')';
    }
    
    const [pendingRows] = await db.query(pendingCountQuery, pendingCountParams);
    const maxPending = settings.spam_max_pending || 3;
    
    if (pendingRows[0].count >= maxPending) {
      // Auto-block
      await db.query('INSERT INTO spam_blocklist (ip_address, device_id, reason) VALUES (?, ?, ?)', 
        [ip_address, device_id, `Mencapai batas ${maxPending} transaksi PENDING`]
      );
      return res.status(403).json({ error: 'Anda terlalu banyak membuat transaksi tertunda. Akses diblokir. Silakan hubungi Admin.', blocked: true });
    }

    next();
  } catch (err) {
    console.error('Spam Check Error:', err);
    res.status(500).json({ error: err.message });
  }
};


// 1. Ambil Pengaturan Portal
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, s.dns_name as hotspot_login_url
      FROM portal_settings p
      CROSS JOIN settings s
      WHERE p.id = 1 AND s.id = 1
    `);
    const settings = rows[0];
    if (settings) {
      if (!settings.is_active) {
        settings.closed_by_schedule = false;
      } else {
        const open = isStoreOpenBySchedule(settings);
        if (!open) {
          settings.is_active = 0;
          settings.closed_by_schedule = true;
        } else {
          settings.closed_by_schedule = false;
        }
      }
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Simpan Pengaturan Portal
router.post('/settings', async (req, res) => {
  console.log('[DEBUG] Received settings update request:', req.body);
  try {
    // 1. Ambil data pengaturan yang ada saat ini
    const [existingRows] = await db.query('SELECT * FROM portal_settings WHERE id = 1');
    const existing = existingRows[0] || {};

    // 2. Gabungkan data baru dari req.body dengan data lama (jika undefined, gunakan data lama)
    const portal_title = req.body.portal_title !== undefined ? req.body.portal_title : existing.portal_title;
    const portal_description = req.body.portal_description !== undefined ? req.body.portal_description : existing.portal_description;
    const primary_color = req.body.primary_color !== undefined ? req.body.primary_color : existing.primary_color;
    const qris_static_string = req.body.qris_static_string !== undefined ? req.body.qris_static_string : existing.qris_static_string;
    const notification_token = req.body.notification_token !== undefined ? req.body.notification_token : existing.notification_token;
    
    const success_message_html = req.body.success_message_html !== undefined ? req.body.success_message_html : existing.success_message_html;
    const outside_network_message_html = req.body.outside_network_message_html !== undefined ? req.body.outside_network_message_html : existing.outside_network_message_html;

    let auto_cleanup_enabled = existing.auto_cleanup_enabled;
    if (req.body.auto_cleanup_enabled !== undefined) {
      auto_cleanup_enabled = req.body.auto_cleanup_enabled ? 1 : 0;
    }
    const auto_cleanup_hours = req.body.auto_cleanup_hours !== undefined ? req.body.auto_cleanup_hours : existing.auto_cleanup_hours;

    let spam_protection_enabled = existing.spam_protection_enabled;
    if (req.body.spam_protection_enabled !== undefined) {
      spam_protection_enabled = req.body.spam_protection_enabled ? 1 : 0;
    }
    const spam_max_pending = req.body.spam_max_pending !== undefined ? req.body.spam_max_pending : existing.spam_max_pending;
    const spam_auto_unblock_minutes = req.body.spam_auto_unblock_minutes !== undefined ? req.body.spam_auto_unblock_minutes : existing.spam_auto_unblock_minutes;

    // Konversi is_active ke boolean/tinyint
    let is_active = existing.is_active;
    if (req.body.is_active !== undefined) {
      is_active = req.body.is_active ? 1 : 0;
    }
    
    let enable_schedule = existing.enable_schedule;
    if (req.body.enable_schedule !== undefined) {
      enable_schedule = req.body.enable_schedule ? 1 : 0;
    }
    const open_time = req.body.open_time !== undefined ? req.body.open_time : existing.open_time;
    const close_time = req.body.close_time !== undefined ? req.body.close_time : existing.close_time;

    const duitku_merchant_code = req.body.duitku_merchant_code !== undefined ? req.body.duitku_merchant_code : existing.duitku_merchant_code;
    const duitku_api_key = req.body.duitku_api_key !== undefined ? req.body.duitku_api_key : existing.duitku_api_key;
    
    let duitku_is_sandbox = existing.duitku_is_sandbox;
    if (req.body.duitku_is_sandbox !== undefined) {
      duitku_is_sandbox = req.body.duitku_is_sandbox ? 1 : 0;
    }

    const tripay_api_key = req.body.tripay_api_key !== undefined ? req.body.tripay_api_key : existing.tripay_api_key;
    const tripay_private_key = req.body.tripay_private_key !== undefined ? req.body.tripay_private_key : existing.tripay_private_key;
    const tripay_merchant_code = req.body.tripay_merchant_code !== undefined ? req.body.tripay_merchant_code : existing.tripay_merchant_code;
    
    let tripay_is_sandbox = existing.tripay_is_sandbox;
    if (req.body.tripay_is_sandbox !== undefined) {
      tripay_is_sandbox = req.body.tripay_is_sandbox ? 1 : 0;
    }

    let enable_payment_bridge = existing.enable_payment_bridge;
    if (req.body.enable_payment_bridge !== undefined) {
      enable_payment_bridge = req.body.enable_payment_bridge ? 1 : 0;
    }

    let enable_midtrans = existing.enable_midtrans;
    if (req.body.enable_midtrans !== undefined) {
      enable_midtrans = req.body.enable_midtrans ? 1 : 0;
    }

    let enable_duitku = existing.enable_duitku;
    if (req.body.enable_duitku !== undefined) {
      enable_duitku = req.body.enable_duitku ? 1 : 0;
    }

    let enable_tripay = existing.enable_tripay;
    if (req.body.enable_tripay !== undefined) {
      enable_tripay = req.body.enable_tripay ? 1 : 0;
    }

    // 3. Update tabel portal_settings
    await db.query(`
      UPDATE portal_settings 
      SET portal_title = ?, portal_description = ?, primary_color = ?, qris_static_string = ?,
          notification_token = ?, is_active = ?,
          enable_schedule = ?, open_time = ?, close_time = ?,
          duitku_merchant_code = ?, duitku_api_key = ?, duitku_is_sandbox = ?,
          tripay_api_key = ?, tripay_private_key = ?, tripay_merchant_code = ?, tripay_is_sandbox = ?,
          enable_payment_bridge = ?, enable_midtrans = ?, enable_duitku = ?, enable_tripay = ?, success_message_html = ?, outside_network_message_html = ?,
          auto_cleanup_enabled = ?, auto_cleanup_hours = ?, spam_protection_enabled = ?, spam_max_pending = ?, spam_auto_unblock_minutes = ?
      WHERE id = 1
    `, [
      portal_title, portal_description, primary_color, qris_static_string,
      notification_token, is_active,
      enable_schedule, open_time, close_time,
      duitku_merchant_code, duitku_api_key, duitku_is_sandbox,
      tripay_api_key, tripay_private_key, tripay_merchant_code, tripay_is_sandbox,
      enable_payment_bridge, enable_midtrans, enable_duitku, enable_tripay, success_message_html, outside_network_message_html,
      auto_cleanup_enabled, auto_cleanup_hours, spam_protection_enabled, spam_max_pending, spam_auto_unblock_minutes
    ]);

    // 4. Update settings (dns_name) jika hotspot_login_url dikirimkan
    if (req.body.hotspot_login_url !== undefined) {
      await db.query('UPDATE settings SET dns_name = ? WHERE id = 1', [req.body.hotspot_login_url]);
    }

    res.json({ message: 'Pengaturan portal berhasil disimpan' });
  } catch (error) {
    console.error('[ERROR] Failed to save online store settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2a. Request Pembayaran Duitku
router.post('/duitku/create-invoice', checkStoreOpen, checkSpamProtection, async (req, res) => {
  const { package_id, amount, customer_name, payment_method, customer_email, customer_phone, device_id } = req.body;
  const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const order_id = 'INV-' + Date.now();
  
  try {
    const [settingsRows] = await db.query('SELECT * FROM portal_settings WHERE id = 1');
    const settings = settingsRows[0];

    if (!settings.duitku_merchant_code || !settings.duitku_api_key) {
      return res.status(400).json({ error: 'Konfigurasi Duitku belum lengkap' });
    }

    const crypto = require('crypto');
    const merchantCode = settings.duitku_merchant_code;
    const merchantKey = settings.duitku_api_key;
    const paymentAmount = parseInt(amount);
    const signature = crypto.createHash('md5').update(merchantCode + order_id + paymentAmount + merchantKey).digest('hex');

    const publicUrl = getPublicUrl(req);

    const body = {
      merchantCode,
      paymentAmount,
      merchantOrderId: order_id,
      productDetails: `Voucher Hotspot - ${package_id}`,
      email: customer_email || 'customer@example.com',
      phoneNumber: customer_phone || '08123456789',
      callbackUrl: `${publicUrl}/api/online-store/duitku/callback`,
      returnUrl: req.body.return_url ? `${req.body.return_url}?order_id=${order_id}` : `${publicUrl}/portal?order_id=${order_id}`,
      signature,
      paymentMethod: payment_method || '', // Kosongkan untuk semua metode
    };

    const url = settings.duitku_is_sandbox 
      ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry' 
      : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry';

    // Set paymentMethod default ke 'SP' (ShopeePay) karena 'QR' tidak tersedia di sandbox
    body.paymentMethod = 'SP';

    console.log('[Duitku] Creating invoice with body:', JSON.stringify(body, null, 2));

    const fetch = require('node-fetch');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('[Duitku] Response:', JSON.stringify(data, null, 2));

    if (data.paymentUrl) {
      // Simpan transaksi ke DB
      await db.query(`
        INSERT INTO jurnal_keuangan (order_id, package_id, amount, unique_code, total_amount, customer_name, status, ip_address, device_id)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
      `, [order_id, package_id, amount, 0, amount, customer_name, ip_address, device_id || null]);

      res.json({ payment_url: data.paymentUrl, order_id });
    } else {
      res.status(400).json({ error: data.statusMessage || 'Gagal membuat invoice Duitku' });
    }

  } catch (error) {
    console.error('Duitku Create Invoice Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const { generateOnlineVoucherCode, registerVoucherToRadius } = require('../utils/voucher');

// 2b. Request Pembayaran Tripay
router.post('/tripay/create-transaction', checkStoreOpen, checkSpamProtection, async (req, res) => {
  const { package_id, amount, customer_name, method, device_id } = req.body;
  const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const merchant_ref = 'INV-' + Date.now();
  
  try {
    const [settingsRows] = await db.query('SELECT * FROM portal_settings WHERE id = 1');
    const settings = settingsRows[0];

    if (!settings.tripay_merchant_code || !settings.tripay_api_key || !settings.tripay_private_key) {
      return res.status(400).json({ error: 'Konfigurasi Tripay belum lengkap' });
    }

    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', settings.tripay_private_key)
      .update(settings.tripay_merchant_code + merchant_ref + amount)
      .digest('hex');

    const publicUrl = getPublicUrl(req);

    const body = {
      method: method || 'QRIS',
      merchant_ref: merchant_ref,
      amount: parseInt(amount),
      customer_name: customer_name || 'Customer',
      customer_email: 'customer@example.com',
      order_items: [
        { name: `Voucher Hotspot - ${package_id}`, price: parseInt(amount), quantity: 1 }
      ],
      callback_url: `${publicUrl}/api/online-store/tripay/callback`,
      return_url: req.body.return_url ? `${req.body.return_url}?order_id=${merchant_ref}` : `${publicUrl}/portal?order_id=${merchant_ref}`,
      signature: signature
    };

    const url = settings.tripay_is_sandbox 
      ? 'https://tripay.co.id/api-sandbox/transaction/create' 
      : 'https://tripay.co.id/api/transaction/create';

    const fetch = require('node-fetch');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.tripay_api_key}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (data.success) {
      // Simpan status pending ke database
      await db.query(`
        INSERT INTO jurnal_keuangan (order_id, package_id, amount, unique_code, total_amount, customer_name, status, ip_address, device_id)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
      `, [merchant_ref, package_id, amount, 0, amount, customer_name || 'Customer Portal', ip_address, device_id || null]);

      res.json({ checkout_url: data.data.checkout_url, order_id: merchant_ref });
    } else {
      res.status(400).json({ error: data.message || 'Gagal membuat transaksi Tripay' });
    }

  } catch (error) {
    console.error('Tripay Create Transaction Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2e. Request Pembayaran Midtrans
router.post('/midtrans/create-transaction', checkStoreOpen, checkSpamProtection, async (req, res) => {
  const { package_id, amount, customer_name, device_id } = req.body;
  const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const order_id = 'INV-' + Date.now();

  try {
    const [settingsRows] = await db.query('SELECT payment_gateway_config FROM settings WHERE id = 1');
    if (settingsRows.length === 0 || !settingsRows[0].payment_gateway_config) {
      return res.status(400).json({ error: 'Konfigurasi Midtrans belum lengkap' });
    }
    const config = JSON.parse(settingsRows[0].payment_gateway_config);
    const midtrans = config.midtrans;

    if (!midtrans || !midtrans.server_key || !midtrans.merchant_id) {
      return res.status(400).json({ error: 'Konfigurasi Midtrans belum lengkap' });
    }

    const serverKey = midtrans.server_key;
    const isProduction = !serverKey.startsWith('SB-');
    const url = isProduction 
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authString = Buffer.from(serverKey + ':').toString('base64');
    
    const publicUrl = getPublicUrl(req);

    const payload = {
      transaction_details: {
        order_id: order_id,
        gross_amount: parseInt(amount)
      },
      customer_details: {
        first_name: customer_name || 'Customer',
        email: 'customer@example.com'
      },
      item_details: [{
        id: package_id,
        price: parseInt(amount),
        quantity: 1,
        name: `Voucher Hotspot - ${package_id}`
      }],
      callbacks: {
        finish: req.body.return_url ? `${req.body.return_url}?order_id=${order_id}` : `${publicUrl}/portal?order_id=${order_id}`
      }
    };

    const fetch = require('node-fetch');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (response.ok && data.redirect_url) {
      await db.query(`
        INSERT INTO jurnal_keuangan (order_id, package_id, amount, unique_code, total_amount, customer_name, status, ip_address, device_id)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
      `, [order_id, package_id, amount, 0, amount, customer_name || 'Customer Portal', ip_address, device_id || null]);

      res.json({ payment_url: data.redirect_url, order_id });
    } else {
      res.status(400).json({ error: data.error_messages ? data.error_messages.join(', ') : 'Gagal membuat transaksi Midtrans' });
    }

  } catch (error) {
    console.error('Midtrans Create Transaction Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2f. Callback Midtrans
router.post('/midtrans/callback', async (req, res) => {
  console.log('[Midtrans Callback] Received Body:', JSON.stringify(req.body, null, 2));
  const { order_id, transaction_status, status_code, gross_amount, signature_key } = req.body;

  try {
    const [settingsRows] = await db.query('SELECT payment_gateway_config FROM settings WHERE id = 1');
    if (settingsRows.length === 0 || !settingsRows[0].payment_gateway_config) {
      return res.status(400).send('Midtrans config not found');
    }
    const config = JSON.parse(settingsRows[0].payment_gateway_config);
    const midtrans = config.midtrans;
    if (!midtrans || !midtrans.server_key) {
      return res.status(400).send('Midtrans Server Key not configured');
    }

    const serverKey = midtrans.server_key;

    const crypto = require('crypto');
    const computedSignature = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex');

    if (signature_key !== computedSignature) {
      console.warn('[Midtrans Callback] Signature mismatch!');
      return res.status(400).send('Invalid Signature');
    }

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      if (order_id.startsWith('INV-PPPOE-')) {
        await handlePPPoEOnlinePaymentSuccess(order_id, gross_amount);
        return res.status(200).send('OK');
      }
      const [trxRows] = await db.query('SELECT * FROM jurnal_keuangan WHERE order_id = ? AND status = "PENDING"', [order_id]);
      if (trxRows.length > 0) {
        const trx = trxRows[0];
        const voucherCode = await generateOnlineVoucherCode(trx.package_id);

        await registerVoucherToRadius(voucherCode, trx.package_id, trx.amount, order_id);

        await db.query(`
          UPDATE jurnal_keuangan 
          SET status = 'PAID', voucher_code = ?, paid_at = NOW(),
              kategori = 'Pemasukan', jenis = 'Voucher Online', admin = 'System',
              deskripsi = 'Penjualan Online Midtrans', qty = 1, total = ?
          WHERE id = ?
        `, [voucherCode, trx.amount, trx.id]);

        // Kirim notifikasi Telegram ke Admin
        const tgMessage = `🔔 <b>PEMBAYARAN MIDTRANS BERHASIL</b>\n\n` +
                          `ID Pesanan: <code>${order_id}</code>\n` +
                          `Paket: <b>${trx.package_id}</b>\n` +
                          `Nominal: <b>Rp ${Math.round(parseFloat(trx.amount)).toLocaleString('id-ID')}</b>\n` +
                          `Kode Voucher: <code>${voucherCode}</code>\n\n` +
                          `<i>Voucher telah aktif di server RADIUS.</i>`;
        await notifyTelegram(tgMessage, 'Payment Gateway');

        console.log(`[Midtrans] Success: ${order_id} -> ${voucherCode}`);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Midtrans Callback Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 2c. Create Manual QRIS Transaction
router.post('/create-transaction', checkStoreOpen, checkSpamProtection, async (req, res) => {
  const { package_id, amount, customer_name, device_id } = req.body;
  const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const order_id = 'QR-' + Date.now();
  
  try {
    let minCode = 1;
    let maxCode = 200;
    
    const [profileRows] = await db.query('SELECT unique_code_min, unique_code_max FROM profiles_metadata WHERE groupname = ?', [package_id]);
    if (profileRows.length > 0) {
      if (profileRows[0].unique_code_min !== null) minCode = profileRows[0].unique_code_min;
      if (profileRows[0].unique_code_max !== null) maxCode = profileRows[0].unique_code_max;
    }

    if (minCode > maxCode) {
      const temp = minCode;
      minCode = maxCode;
      maxCode = temp;
    }

    const unique_code = Math.floor(Math.random() * (maxCode - minCode + 1)) + minCode;
    const total_amount = parseInt(amount) + unique_code;

    await db.query(`
      INSERT INTO jurnal_keuangan (order_id, package_id, amount, unique_code, total_amount, customer_name, status, ip_address, device_id)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `, [order_id, package_id, amount, unique_code, total_amount, customer_name || 'Customer Portal', ip_address, device_id || null]);

    res.json({ order_id, total_amount, unique_code });
  } catch (error) {
    console.error('[OnlineStore] Create Transaction Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2b. Callback Duitku
router.post('/duitku/callback', async (req, res) => {
  console.log('[Duitku Callback] Received Body:', JSON.stringify(req.body, null, 2));
  const { merchantCode, amount, merchantOrderId, signature, resultCode } = req.body;
  
  try {
    const [settingsRows] = await db.query('SELECT * FROM portal_settings WHERE id = 1');
    const settings = settingsRows[0];

    const crypto = require('crypto');
    const calcSignature = crypto.createHash('md5').update(settings.duitku_merchant_code + amount + merchantOrderId + settings.duitku_api_key).digest('hex');

    if (signature !== calcSignature) return res.status(400).send('Invalid Signature');

    if (resultCode === '00') {
      if (merchantOrderId.startsWith('INV-PPPOE-')) {
        await handlePPPoEOnlinePaymentSuccess(merchantOrderId, amount);
        return res.status(200).send('OK');
      }
      const [trxRows] = await db.query('SELECT * FROM jurnal_keuangan WHERE order_id = ? AND status = "PENDING"', [merchantOrderId]);
      if (trxRows.length > 0) {
        const trx = trxRows[0];
        const voucherCode = await generateOnlineVoucherCode(trx.package_id);
        
        await registerVoucherToRadius(voucherCode, trx.package_id, trx.amount, merchantOrderId);

        await db.query(`
          UPDATE jurnal_keuangan 
          SET status = 'PAID', voucher_code = ?, paid_at = NOW(),
              kategori = 'Pemasukan', jenis = 'Voucher Online', admin = 'System',
              deskripsi = 'Penjualan Online', qty = 1, total = ?
          WHERE id = ?
        `, [voucherCode, trx.amount, trx.id]);

        // Kirim notifikasi Telegram ke Admin
        const tgMessage = `🔔 <b>PEMBAYARAN DUITKU BERHASIL</b>\n\n` +
                          `ID Pesanan: <code>${merchantOrderId}</code>\n` +
                          `Paket: <b>${trx.package_id}</b>\n` +
                          `Nominal: <b>Rp ${Math.round(parseFloat(trx.amount)).toLocaleString('id-ID')}</b>\n` +
                          `Kode Voucher: <code>${voucherCode}</code>\n\n` +
                          `<i>Voucher telah aktif di server RADIUS.</i>`;
        await notifyTelegram(tgMessage, 'Payment Gateway');

        console.log(`[Duitku] Success: ${merchantOrderId} -> ${voucherCode}`);
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Duitku Callback Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 2d. Callback Tripay
router.post('/tripay/callback', async (req, res) => {
  const signature = req.headers['x-callback-signature'];
  const event = req.headers['x-callback-event'];
  const json = JSON.stringify(req.body);
  
  try {
    const [settingsRows] = await db.query('SELECT * FROM portal_settings WHERE id = 1');
    const settings = settingsRows[0];

    const crypto = require('crypto');
    const calcSignature = crypto.createHmac('sha256', settings.tripay_private_key).update(json).digest('hex');

    if (signature !== calcSignature) return res.status(400).send('Invalid Signature');
    if (event !== 'payment_status') return res.status(200).send('Ignored Event');

    const { merchant_ref, status } = req.body;

    if (status === 'PAID') {
      if (merchant_ref.startsWith('INV-PPPOE-')) {
        await handlePPPoEOnlinePaymentSuccess(merchant_ref, req.body.amount);
        return res.status(200).send('OK');
      }
      const [trxRows] = await db.query('SELECT * FROM jurnal_keuangan WHERE order_id = ? AND status = "PENDING"', [merchant_ref]);
      if (trxRows.length > 0) {
        const trx = trxRows[0];
        const voucherCode = await generateOnlineVoucherCode(trx.package_id);
        
        await registerVoucherToRadius(voucherCode, trx.package_id, trx.amount, merchant_ref);

        await db.query(`
          UPDATE jurnal_keuangan 
          SET status = 'PAID', voucher_code = ?, paid_at = NOW(),
              kategori = 'Pemasukan', jenis = 'Voucher Online', admin = 'System',
              deskripsi = 'Penjualan Online Tripay', qty = 1, total = ?
          WHERE id = ?
        `, [voucherCode, trx.amount, trx.id]);

        // Kirim notifikasi Telegram ke Admin
        const tgMessage = `🔔 <b>PEMBAYARAN TRIPAY BERHASIL</b>\n\n` +
                          `ID Pesanan: <code>${merchant_ref}</code>\n` +
                          `Paket: <b>${trx.package_id}</b>\n` +
                          `Nominal: <b>Rp ${Math.round(parseFloat(trx.amount)).toLocaleString('id-ID')}</b>\n` +
                          `Kode Voucher: <code>${voucherCode}</code>\n\n` +
                          `<i>Voucher telah aktif di server RADIUS.</i>`;
        await notifyTelegram(tgMessage, 'Payment Gateway');

        console.log(`[Tripay] Success: ${merchant_ref} -> ${voucherCode}`);
      }
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Tripay Callback Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 4. Webhook Notifikasi (Dari HP Android Listener)
router.post('/webhook-notification*', async (req, res) => {
  const { text, token } = req.body;
  const [settings] = await db.query('SELECT notification_token FROM portal_settings WHERE id = 1');
  if (token !== settings[0].notification_token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const cleanText = text.replace(/\./g, '');
    const amountMatch = cleanText.match(/(?:Rp|sebesar|masuk|terima|jumlah)\s?(\d+)/i);
    if (!amountMatch) return res.status(400).json({ error: 'Nominal tidak ditemukan' });
    
    const detectedAmount = parseInt(amountMatch[1]);
    const [transactions] = await db.query(`
      SELECT * FROM jurnal_keuangan 
      WHERE total_amount = ? AND status = 'PENDING' 
      AND created_at >= NOW() - INTERVAL 60 MINUTE LIMIT 1
    `, [detectedAmount]);

    if (transactions.length > 0) {
      const trx = transactions[0];
      const voucherCode = await generateOnlineVoucherCode(trx.package_id);

      await registerVoucherToRadius(voucherCode, trx.package_id, trx.amount, trx.order_id);

      await db.query(`
        UPDATE jurnal_keuangan 
        SET status = 'PAID', voucher_code = ?, paid_at = NOW(),
            kategori = 'Pemasukan', jenis = 'Voucher Online', admin = 'System',
            deskripsi = 'Penjualan Online Webhook', qty = 1, total = ?
        WHERE id = ?
      `, [voucherCode, trx.amount, trx.id]);

      return res.json({ status: 'success', order_id: trx.order_id });
    }
    res.json({ status: 'ignored' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Persetujuan Admin dari Telegram
router.get('/approve/:order_id', async (req, res) => {
  const { order_id } = req.params;
  const { token } = req.query;

  try {
    const [tg] = await db.query('SELECT * FROM telegram_settings WHERE outlet_name = "Global"');
    if (tg.length === 0 || !tg[0].bot_token.startsWith(token)) return res.status(403).send('Akses Ditolak');

    const [rows] = await db.query('SELECT * FROM jurnal_keuangan WHERE order_id = ? AND status = "PENDING"', [order_id]);
    if (rows.length === 0) return res.send('Transaksi sudah diproses');
    
    const trx = rows[0];
    const voucherCode = await generateOnlineVoucherCode(trx.package_id);

    await registerVoucherToRadius(voucherCode, trx.package_id, trx.amount, order_id);

    await db.query(`
      UPDATE jurnal_keuangan 
      SET status = 'PAID', voucher_code = ?, paid_at = NOW(),
          kategori = 'Pemasukan', jenis = 'Voucher Online', admin = 'Telegram',
          deskripsi = 'Persetujuan Telegram', qty = 1, total = ?
      WHERE id = ?
    `, [voucherCode, trx.amount, trx.id]);

    res.send(`<h1>✅ BERHASIL DISETUJUI</h1><p>Kode Voucher: <b>${voucherCode}</b></p>`);
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

// 8. Approve dari Dashboard Admin
router.post('/admin/approve', async (req, res) => {
  const { order_id } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM jurnal_keuangan WHERE order_id = ? AND status = "PENDING"', [order_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    
    const trx = rows[0];
    const voucherCode = await generateOnlineVoucherCode(trx.package_id);

    await registerVoucherToRadius(voucherCode, trx.package_id, trx.amount, order_id);

    await db.query(`
      UPDATE jurnal_keuangan 
      SET status = 'PAID', voucher_code = ?, paid_at = NOW(),
          kategori = 'Pemasukan', jenis = 'Voucher Online', admin = 'Admin Dashboard',
          deskripsi = 'Persetujuan Dashboard', qty = 1, total = ?
      WHERE id = ?
    `, [voucherCode, trx.amount, trx.id]);

    res.json({ message: 'Pembayaran berhasil disetujui', voucher_code: voucherCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Ambil Semua Transaksi (Untuk Admin)
router.get('/admin/transactions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM jurnal_keuangan ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Hapus Transaksi (Admin)
router.delete('/admin/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM jurnal_keuangan WHERE id = ?', [id]);
    res.json({ message: 'Transaksi berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Hapus Massal Transaksi (Admin)
router.post('/admin/transactions/bulk-delete', async (req, res) => {
  const { ids } = req.body; // Harus berupa array [1, 2, 3]
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Tidak ada data yang dipilih' });
  
  try {
    await db.query('DELETE FROM jurnal_keuangan WHERE id IN (?)', [ids]);
    res.json({ message: `${ids.length} transaksi berhasil dihapus` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10b. Bersihkan Transaksi Pending Lama (Admin)
router.post('/admin/transactions/cleanup', async (req, res) => {
  const { days = 3 } = req.body;
  try {
    const [result] = await db.query(`
      DELETE FROM jurnal_keuangan 
      WHERE status = 'PENDING' 
      AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);
    res.json({ message: `Berhasil menghapus ${result.affectedRows} transaksi pending yang lebih dari ${days} hari.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




// 11b. Cari Transaksi Berdasarkan Nominal (Fallback untuk QRIS Statis)
router.get('/search-by-amount/:amount', async (req, res) => {
  const { amount } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT * FROM jurnal_keuangan 
      WHERE total_amount = ? AND status IN ('PENDING', 'PAID', 'USED')
      ORDER BY created_at DESC LIMIT 1
    `, [amount]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pesanan dengan nominal ini tidak ditemukan' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// 5. GET Spam Blocklist
router.get('/spam-blocklist', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM spam_blocklist ORDER BY blocked_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. DELETE Spam Blocklist
router.delete('/spam-blocklist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ambil info device untuk membersihkan PENDING transaksi
    const [blockRows] = await db.query('SELECT ip_address, device_id FROM spam_blocklist WHERE id = ?', [id]);
    if (blockRows.length > 0) {
      const b = blockRows[0];
      let delQuery = 'DELETE FROM jurnal_keuangan WHERE status = "PENDING" AND (ip_address = ?';
      let delParams = [b.ip_address];
      if (b.device_id) {
        delQuery += ' OR device_id = ?)';
        delParams.push(b.device_id);
      } else {
        delQuery += ')';
      }
      await db.query(delQuery, delParams);
    }

    await db.query('DELETE FROM spam_blocklist WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// 11. Cek Status Transaksi (Untuk Polling di Portal)
router.get('/:order_id', async (req, res) => {
  const { order_id } = req.params;
  try {
    // 1. Coba cari di Jurnal Keuangan (Transaksi Online)
    let [rows] = await db.query(`
      SELECT j.*, rc.value as password
      FROM jurnal_keuangan j
      LEFT JOIN radcheck rc ON j.voucher_code = rc.username AND rc.attribute = 'Cleartext-Password'
      WHERE j.order_id = ?
    `, [order_id]);
    
    if (rows.length > 0) {
      return res.json(rows[0]);
    }

    // 2. Fallback: Coba cari di Rincian Transaksi Voucher (Voucher Fisik/Manual)
    const [vRows] = await db.query(`
      SELECT 
        v.username as voucher_code,
        v.status,
        v.created_at,
        rc.value as password
      FROM rincian_transaksi_voucher v
      LEFT JOIN radcheck rc ON v.username = rc.username AND rc.attribute = 'Cleartext-Password'
      WHERE v.username = ?
    `, [order_id]);

    if (vRows.length > 0) {
      const v = vRows[0];
      return res.json({
        order_id: v.voucher_code,
        voucher_code: v.voucher_code,
        password: v.password || v.voucher_code,
        status: (v.status === 'Aktif' || v.status === 'Terjual') ? 'PAID' : v.status,
        total_amount: 0,
        package_id: 'Voucher Fisik',
        created_at: v.created_at
      });
    }

    res.status(404).json({ error: 'Data tidak ditemukan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ============================================================================
// HELPER: PROCESS SUCCESSFUL PPPOE OVERDUE INVOICE PAYMENT DYNAMICALLY
// ============================================================================
const handlePPPoEOnlinePaymentSuccess = async (orderId, amount) => {
  console.log(`[PPPoE Webhook Success] Processing payment for ref: ${orderId}`);
  const parts = orderId.split('-');
  const invoiceId = parseInt(parts[2]);
  if (isNaN(invoiceId)) {
    console.error('[PPPoE Webhook Error] Invalid invoice ID in order_id:', orderId);
    return;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get the invoice
    const [invRows] = await connection.query('SELECT * FROM pppoe_invoices WHERE id = ?', [invoiceId]);
    if (invRows.length === 0) {
      throw new Error(`Invoice #${invoiceId} not found`);
    }
    const invoice = invRows[0];

    if (invoice.status === 'paid') {
      console.log(`[PPPoE Webhook] Invoice #${invoice.invoice_number} is already paid.`);
      await connection.commit();
      return;
    }

    const customerId = invoice.customer_id;

    // 2. Record the payment in pppoe_payments
    await connection.query(`
      INSERT INTO pppoe_payments (invoice_id, customer_id, amount, payment_method, received_by, notes) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [invoiceId, customerId, invoice.amount, 'Online (Gateway)', 'System', `Pembayaran otomatis via Gateway. Ref: ${orderId}`]);

    // 3. Mark invoice as paid
    await connection.query('UPDATE pppoe_invoices SET status = "paid", paid_at = NOW() WHERE id = ?', [invoiceId]);

    // 4. Get customer and their package details
    const [custRows] = await connection.query('SELECT * FROM pppoe_customers WHERE id = ?', [customerId]);
    if (custRows.length === 0) {
      throw new Error(`Customer #${customerId} not found`);
    }
    const customer = custRows[0];

    const [pkgRows] = await connection.query('SELECT * FROM pppoe_packages WHERE id = ?', [invoice.package_id]);
    if (pkgRows.length === 0) {
      throw new Error(`Package #${invoice.package_id} not found`);
    }
    const packageInfo = pkgRows[0];

    // 5. Restore the customer to active state
    const activeDays = packageInfo.active_days || 30;
    await connection.query(`
      UPDATE pppoe_customers 
      SET status = 'active', billing_status = 'normal', last_payment_date = NOW(),
          next_billing_date = DATE_ADD(NOW(), INTERVAL ? DAY),
          next_isolir_date = DATE_ADD(NOW(), INTERVAL ? DAY),
          days_overdue = 0
      WHERE id = ?
    `, [activeDays, activeDays, customerId]);

    // 6. Update radusergroup: remove from ARM_ISOLIR and restore to package slug group
    await connection.query('DELETE FROM radcheck WHERE username = ? AND attribute = ?', [customer.pppoe_username, 'Auth-Type']);
    await connection.query('UPDATE radusergroup SET groupname = ? WHERE username = ?', [packageInfo.slug, customer.pppoe_username]);

    // 7. Remove redirect attributes from radreply
    await connection.query('DELETE FROM radreply WHERE username = ? AND attribute IN (?, ?)', [
      customer.pppoe_username, 'Reply-Message', 'Mikrotik-Redirect-URL'
    ]);

    // 8. Log the billing log
    await connection.query(`
      INSERT INTO pppoe_billing_logs (customer_id, invoice_id, action, amount, details)
      VALUES (?, ?, ?, ?, ?)
    `, [customerId, invoiceId, 'payment_success', invoice.amount, `Pembayaran Tagihan Online Sukses via Ref: ${orderId}`]);

    await connection.commit();
    console.log(`[PPPoE Webhook] Successfully processed payment and activated internet for customer: ${customer.name}`);

    // 9. Send Telegram notification to Admin
    const { notifyTelegram } = require('./telegram');
    const tgMessage = `🔔 <b>PEMBAYARAN TAGIHAN PPPoE BERHASIL</b>\n\n` +
                      `Pelanggan: <b>${customer.name}</b> (${customer.pppoe_username})\n` +
                      `Invoice: <b>#${invoice.invoice_number}</b>\n` +
                      `Nominal: <b>Rp ${Math.round(parseFloat(invoice.amount)).toLocaleString('id-ID')}</b>\n` +
                      `Metode: <b>Online Payment Gateway</b>\n\n` +
                      `<i>Layanan PPPoE telah aktif kembali secara otomatis.</i>`;
    await notifyTelegram(tgMessage, 'Payment Gateway');

  } catch (err) {
    await connection.rollback();
    console.error('[PPPoE Webhook Activation Error]:', err.message);
  } finally {
    connection.release();
  }
};
module.exports = router;
