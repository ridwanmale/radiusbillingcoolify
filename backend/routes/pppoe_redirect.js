const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { logActivity } = require('./logs');

// Default redirect settings
const DEFAULT_REDIRECT_SETTINGS = {
  redirect_enabled: true,
  redirect_message: 'Mohon lunasi tagihan Anda',
  redirect_url: '/pppoe/warning',
  block_https: true,
  block_games: true,
  block_whatsapp: true,
  allow_http: true,
  custom_message: '',
  redirect_delay: 3,
  accent_color: '#ef4444',
  cs_contact: '0812-3456-7890',
  redirect_footer: 'Sistem Redirect PPPoE - Radius Billing',
  created_at: new Date(),
  updated_at: new Date()
};

const ensureRedirectSettingsTableColumns = async () => {
  try {
    await db.query(`ALTER TABLE pppoe_redirect_settings ADD COLUMN accent_color VARCHAR(16) DEFAULT '#ef4444'`);
  } catch (err) {}
  try {
    await db.query(`ALTER TABLE pppoe_redirect_settings ADD COLUMN cs_contact VARCHAR(128) DEFAULT '0812-3456-7890'`);
  } catch (err) {}
  try {
    await db.query(`ALTER TABLE pppoe_redirect_settings ADD COLUMN redirect_footer VARCHAR(255) DEFAULT 'Sistem Redirect PPPoE - Radius Billing'`);
  } catch (err) {}
};

// 1. Get redirect settings
router.get('/redirect-settings', async (req, res) => {
  try {
    await ensureRedirectSettingsTableColumns();
    const [settings] = await db.query('SELECT * FROM pppoe_redirect_settings ORDER BY id DESC LIMIT 1');
    
    if (settings.length === 0) {
      // Create default settings if not exists
      await db.query(
        'INSERT INTO pppoe_redirect_settings SET ?',
        DEFAULT_REDIRECT_SETTINGS
      );
      res.json(DEFAULT_REDIRECT_SETTINGS);
    } else {
      res.json(settings[0]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Save redirect settings
router.post('/redirect-settings', async (req, res) => {
  const { admin_username, ...settings } = req.body;
  
  try {
    await ensureRedirectSettingsTableColumns();
    const [existing] = await db.query('SELECT id FROM pppoe_redirect_settings ORDER BY id DESC LIMIT 1');
    
    if (existing.length > 0) {
      // Update existing
      await db.query(
        'UPDATE pppoe_redirect_settings SET ? WHERE id = ?',
        [{ ...settings, updated_at: new Date() }, existing[0].id]
      );
    } else {
      // Insert new
      await db.query(
        'INSERT INTO pppoe_redirect_settings SET ?',
        { ...settings, created_at: new Date(), updated_at: new Date() }
      );
    }
    
    // Log activity
    await logActivity(
      admin_username || 'system',
      'Update Redirect Settings',
      'Mengubah pengaturan redirect web peringatan',
      req
    );
    
    res.json({ message: 'Pengaturan redirect berhasil disimpan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get customer redirect status
router.get('/customer/:customerId/redirect-status', async (req, res) => {
  const { customerId } = req.params;
  
  try {
    const [customer] = await db.query(`
      SELECT c.*, p.slug as package_slug, r.redirect_enabled
      FROM pppoe_customers c
      LEFT JOIN pppoe_packages p ON c.package_id = p.id
      LEFT JOIN pppoe_redirect_settings r ON 1=1
      WHERE c.id = ?
    `, [customerId]);
    
    if (customer.length === 0) {
      return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
    }
    
    const cust = customer[0];
    
    // Check if customer should be redirected
    const shouldRedirect = cust.status === 'isolir' || cust.status === 'tunggakan';
    const redirectEnabled = cust.redirect_enabled !== false;
    
    res.json({
      customer_id: cust.id,
      customer_name: cust.name,
      pppoe_username: cust.pppoe_username,
      status: cust.status,
      should_redirect: shouldRedirect && redirectEnabled,
      redirect_message: cust.redirect_message || 'Mohon lunasi tagihan Anda',
      last_payment_date: cust.last_payment_date,
      next_isolir_date: cust.next_isolir_date,
      days_overdue: cust.days_overdue || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Apply redirect to customer (for router configuration)
router.post('/customer/:customerId/apply-redirect', async (req, res) => {
  const { customerId } = req.params;
  const { action } = req.body; // 'enable' or 'disable'
  
  try {
    const [customer] = await db.query(`
      SELECT c.*, p.slug as package_slug
      FROM pppoe_customers c
      LEFT JOIN pppoe_packages p ON c.package_id = p.id
      WHERE c.id = ?
    `, [customerId]);
    
    if (customer.length === 0) {
      return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
    }
    
    const cust = customer[0];
    const username = cust.pppoe_username;
    
    if (action === 'enable') {
      // Enable redirect by changing user group to ISOLIR
      await db.query(
        'UPDATE radusergroup SET groupname = ? WHERE username = ?',
        ['ARM_ISOLIR', username]
      );
      
      // Add redirect reply attributes
      await db.query(`
        INSERT INTO radreply (username, attribute, op, value) 
        VALUES (?, ?, ?, ?), (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE value = VALUES(value)
      `, [
        username, 'Reply-Message', '=', 'Account suspended. Please pay your bill.',
        username, 'Mikrotik-Redirect-URL', ':=', `http://${req.headers.host || 'localhost:5000'}/api/pppoe/warning-page`
      ]);
      
      // Log activity
      await logActivity(
        req.body.admin_username || 'system',
        'Enable Customer Redirect',
        `Mengaktifkan redirect untuk pelanggan: ${cust.name} (${username})`,
        req
      );
      
      res.json({ 
        message: 'Redirect berhasil diaktifkan untuk pelanggan',
        mikrotik_commands: [
          `/ip firewall mangle add chain=prerouting src-address=${cust.ip_address || 'dynamic'} protocol=tcp dst-port=80 action=redirect to-ports=5000`,
          `/ip firewall filter add chain=forward src-address=${cust.ip_address || 'dynamic'} protocol=tcp dst-port=443 action=drop comment="Block HTTPS"`,
          `/ip firewall filter add chain=forward src-address=${cust.ip_address || 'dynamic'} dst-port=5222,5223,5228 action=drop comment="Block WhatsApp"`,
          `/ip firewall filter add chain=forward src-address=${cust.ip_address || 'dynamic'} dst-port=3074,3478-3480,27000-27030 action=drop comment="Block Games"`
        ]
      });
      
    } else if (action === 'disable') {
      // Disable redirect by restoring original package group
      await db.query(
        'UPDATE radusergroup SET groupname = ? WHERE username = ?',
        [cust.package_slug, username]
      );
      
      // Remove redirect attributes
      await db.query('DELETE FROM radreply WHERE username = ? AND attribute IN (?, ?)', [
        username, 'Reply-Message', 'Mikrotik-Redirect-URL'
      ]);
      
      // Log activity
      await logActivity(
        req.body.admin_username || 'system',
        'Disable Customer Redirect',
        `Menonaktifkan redirect untuk pelanggan: ${cust.name} (${username})`,
        req
      );
      
      res.json({ 
        message: 'Redirect berhasil dinonaktifkan untuk pelanggan',
        mikrotik_commands: [
          `/ip firewall mangle remove [find chain=prerouting src-address=${cust.ip_address || 'dynamic'} protocol=tcp dst-port=80]`,
          `/ip firewall filter remove [find chain=forward src-address=${cust.ip_address || 'dynamic'} protocol=tcp dst-port=443]`,
          `/ip firewall filter remove [find chain=forward src-address=${cust.ip_address || 'dynamic'} dst-port=5222,5223,5228]`,
          `/ip firewall filter remove [find chain=forward src-address=${cust.ip_address || 'dynamic'} dst-port=3074,3478-3480,27000-27030]`
        ]
      });
    } else {
      res.status(400).json({ error: 'Action harus "enable" atau "disable"' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Warning page for customer redirect
router.get('/warning-page', async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM pppoe_redirect_settings ORDER BY id DESC LIMIT 1');
    const redirectSettings = settings.length > 0 ? settings[0] : DEFAULT_REDIRECT_SETTINGS;
    
    // Get customer info from IP or username (simplified)
    const clientIp = req.ip || req.connection.remoteAddress;
    
    res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${redirectSettings.redirect_message}</title>
        <style>
          body {
            font-family: 'Segoe UI', -apple-system, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .warning-container {
            background: white; 
            border-radius: 16px; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.1); 
            width: 100%; 
            max-width: 450px;
            border: 3px solid ${redirectSettings.accent_color || '#ef4444'};
            overflow: hidden;
          }
          .warning-header {
            background: ${redirectSettings.accent_color || '#ef4444'}; 
            color: white; 
            padding: 20px; 
            text-align: center; 
          }
          .warning-icon {
            font-size: 40px; 
            margin-bottom: 8px;
          }
          .warning-title {
            margin: 0; 
            font-size: 1.25rem; 
            font-weight: bold;
          }
          .warning-content {
            padding: 20px; 
            color: #334155;
          }
          .message-box {
            background: #fff3e0; 
            border-left: 4px solid ${redirectSettings.accent_color || '#ef4444'}; 
            padding: 12px; 
            border-radius: 6px; 
            font-size: 0.85rem;
            line-height: 1.5;
            margin-bottom: 15px;
          }
          .message-box p {
            margin: 0;
          }
          .message-box p.title {
            margin-bottom: 6px; 
            font-weight: bold; 
            color: #1e293b;
          }
          .message-box p.custom {
            margin-top: 8px; 
            font-style: italic; 
            color: #475569;
          }
          .countdown {
            font-size: 1.8rem; 
            font-weight: bold; 
            color: #3b82f6; 
            text-align: center; 
            margin: 15px 0;
          }
          .action-buttons {
            display: flex; 
            gap: 10px; 
            margin-top: 15px;
          }
          button {
            flex: 1; 
            padding: 12px; 
            border-radius: 8px; 
            border: none; 
            font-weight: bold; 
            font-size: 0.85rem; 
            cursor: pointer;
            transition: all 0.3s;
          }
          .pay-button {
            background: #22c55e; 
            color: white;
          }
          .pay-button:hover {
            background: #16a34a;
            transform: translateY(-1px);
          }
          .cs-button {
            background: #3b82f6; 
            color: white;
          }
          .cs-button:hover {
            background: #2563eb;
            transform: translateY(-1px);
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #94a3b8;
            font-size: 0.75rem;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
          .footer p {
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="warning-container">
          <div class="warning-header">
            <div class="warning-icon">⚠️</div>
            <h2 class="warning-title">${redirectSettings.redirect_message}</h2>
          </div>
          
          <div class="warning-content">
            <div class="message-box">
              <p class="title">Pelanggan Yth,</p>
              <p>${redirectSettings.custom_message || 'Akses internet Anda saat ini ditangguhkan sementara karena ada tunggakan pembayaran.'}</p>
            </div>
            
            <div class="countdown" id="countdown">${redirectSettings.redirect_delay}</div>
            
            <div class="action-buttons">
              <button class="pay-button" onclick="window.location.href='/api/pppoe/pay-invoice'">Bayar Sekarang</button>
              <button class="cs-button" onclick="showContactInfo()">Hubungi CS</button>
            </div>
            
            <div class="footer">
              <p>${redirectSettings.redirect_footer || 'Sistem Redirect PPPoE - Radius Billing'}</p>
            </div>
          </div>
        </div>
        
        <script>
          // Countdown timer
          let countdown = ${redirectSettings.redirect_delay};
          const countdownElement = document.getElementById('countdown');
          
          const timer = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
              clearInterval(timer);
              // Auto-refresh to ensure redirect is working
              setTimeout(() => {
                location.reload();
              }, 1000);
            }
          }, 1000);
          
          function showContactInfo() {
            let phone = "${redirectSettings.cs_contact || '6281234567890'}";
            phone = phone.replace(/\\D/g, '');
            if (phone.startsWith('0')) {
              phone = '62' + phone.substring(1);
            }
            window.location.href = 'https://wa.me/' + phone + '?text=Halo%20Admin%2C%20layanan%20internet%20saya%20terisolir.%20Mohon%20bantuan%20untuk%20proses%20pembukaan%20isolir.';
          }
        </script>
      </body>
      </html>
    `); } catch (error) {
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1 style="color: #d32f2f;">?? Mohon Lunasi Tagihan Anda</h1>
          <p>Akses internet Anda dibatasi. Silakan hubungi administrator untuk informasi lebih lanjut.</p>
        </body>
      </html>
    `);
  }
});

// 6. Get redirect statistics
router.get('/redirect-stats', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(DISTINCT username) as total_redirected_customers,
        SUM(CASE WHEN status = 'isolir' THEN 1 ELSE 0 END) as isolated_customers,
        SUM(CASE WHEN status = 'tunggakan' THEN 1 ELSE 0 END) as overdue_customers,
        AVG(days_overdue) as avg_days_overdue,
        MAX(days_overdue) as max_days_overdue
      FROM pppoe_customers 
      WHERE status IN ('isolir', 'tunggakan')
    `);
    
    const [recentRedirects] = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as redirect_count
      FROM pppoe_redirect_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    res.json({
      statistics: stats[0] || {},
      recent_activity: recentRedirects,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 4b. Unified Online Payment Checkout for PPPoE Overdue Invoice
router.get('/pay-invoice', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    let cleanIp = clientIp;
    if (clientIp.includes('::ffff:')) {
      cleanIp = clientIp.split('::ffff:')[1];
    }

    console.log(`[PPPoE Pay Online] Request from client IP: ${cleanIp}`);

    // 1. Find active session to get username
    const [sessions] = await db.query(
      "SELECT username FROM radacct WHERE framedipaddress = ? AND acctstoptime IS NULL ORDER BY radacctid DESC LIMIT 1",
      [cleanIp]
    );

    if (sessions.length === 0) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #0f172a; color: white;">
            <div style="max-width: 450px; margin: 50px auto; padding: 30px; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
              <h2 style="color: #ef4444; margin-bottom: 15px;">❌ Sesi Tidak Terdeteksi</h2>
              <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6;">Sistem tidak dapat mendeteksi username PPPoE Anda dari alamat IP saat ini (<b>${cleanIp}</b>).</p>
              <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin-top: 15px;">Silakan hubungi WhatsApp CS untuk pembayaran dan pembukaan isolir manual.</p>
            </div>
          </body>
        </html>
      `);
    }

    const pppoe_username = sessions[0].username;

    // 2. Get customer & overdue invoice
    const [customers] = await db.query(
      "SELECT id, name, phone, pppoe_username FROM pppoe_customers WHERE pppoe_username = ?",
      [pppoe_username]
    );

    if (customers.length === 0) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #0f172a; color: white;">
            <div style="max-width: 450px; margin: 50px auto; padding: 30px; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
              <h2 style="color: #ef4444; margin-bottom: 15px;">❌ Akun Tidak Terdaftar</h2>
              <p style="color: #94a3b8; font-size: 0.95rem;">Username PPPoE <b>${pppoe_username}</b> tidak terdaftar di billing.</p>
            </div>
          </body>
        </html>
      `);
    }

    const customer = customers[0];

    const [invoices] = await db.query(
      "SELECT id, invoice_number, amount FROM pppoe_invoices WHERE customer_id = ? AND status = 'unpaid' ORDER BY id ASC LIMIT 1",
      [customer.id]
    );

    if (invoices.length === 0) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #0f172a; color: white;">
            <div style="max-width: 450px; margin: 50px auto; padding: 30px; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
              <h2 style="color: #10b981; margin-bottom: 15px;">✅ Tagihan Sudah Lunas</h2>
              <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6;">Halo <b>${customer.name}</b>, tidak ditemukan tagihan aktif yang belum dibayar. Internet Anda akan normal beberapa saat lagi.</p>
            </div>
          </body>
        </html>
      `);
    }

    const invoice = invoices[0];
    const order_id = `INV-PPPOE-${invoice.id}-${Date.now()}`;
    const paymentAmount = parseInt(invoice.amount);

    // 3. Get configurations
    const [gatewayRows] = await db.query("SELECT payment_gateway_config FROM settings WHERE id = 1");
    const [portalRows] = await db.query("SELECT * FROM portal_settings WHERE id = 1");
    const settings = portalRows[0] || {};
    let config = {};
    if (gatewayRows.length > 0 && gatewayRows[0].payment_gateway_config) {
      try {
        config = JSON.parse(gatewayRows[0].payment_gateway_config);
      } catch (e) {}
    }

    const protocol = req.secure ? 'https' : 'http';
    const host = req.headers.host;
    const publicUrl = `${protocol}://${host}`;

    // 4. Try Midtrans Snap first
    if (config.midtrans && config.midtrans.server_key && config.midtrans.merchant_id && settings.enable_midtrans === 1) {
      const midtransClient = require('midtrans-client');
      let snap = new midtransClient.Snap({
        isProduction: false,
        serverKey: config.midtrans.server_key
      });

      let parameter = {
        transaction_details: {
          order_id: order_id,
          gross_amount: paymentAmount
        },
        customer_details: {
          first_name: customer.name,
          phone: customer.phone || '08123456789'
        },
        item_details: [{
          id: `INV-${invoice.id}`,
          price: paymentAmount,
          quantity: 1,
          name: `Internet PPPoE #${invoice.invoice_number}`
        }],
        callbacks: {
          finish: `${publicUrl}/portal?status=success&order_id=${order_id}`
        }
      };

      const transaction = await snap.createTransaction(parameter);
      return res.redirect(transaction.redirect_url);

    } else if (settings.duitku_merchant_code && settings.duitku_api_key && settings.enable_duitku === 1) {
      // Try Duitku
      const axios = require('axios');
      const crypto = require('crypto');
      const merchantCode = settings.duitku_merchant_code;
      const merchantKey = settings.duitku_api_key;
      const signature = crypto.createHash('md5').update(merchantCode + order_id + paymentAmount + merchantKey).digest('hex');

      const payload = {
        merchantCode,
        paymentAmount,
        merchantOrderId: order_id,
        productDetails: `Internet PPPoE #${invoice.invoice_number}`,
        email: 'customer@example.com',
        phoneNumber: customer.phone || '08123456789',
        signature,
        callbackUrl: `${publicUrl}/api/online-store/duitku/callback`,
        returnUrl: `${publicUrl}/portal?status=success&order_id=${order_id}`,
        expiryPeriod: 1440
      };

      const response = await axios.post('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', payload);
      if (response.data && response.data.paymentUrl) {
        return res.redirect(response.data.paymentUrl);
      }
      throw new Error(response.data.message || 'Duitku inquiry failed');

    } else {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #0f172a; color: white;">
            <div style="max-width: 450px; margin: 50px auto; padding: 30px; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
              <h2 style="color: #f59e0b; margin-bottom: 15px;">⚠️ Pembayaran Online Belum Siap</h2>
              <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6;">Gerbang pembayaran online (Midtrans/Duitku) belum diaktifkan di admin panel.</p>
              <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6;">Silakan hubungi WhatsApp CS untuk pembayaran dan pembukaan isolir manual.</p>
            </div>
          </body>
        </html>
      `);
    }

  } catch (err) {
    console.error('[PPPoE Pay Error]:', err.message);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #0f172a; color: white;">
          <div style="max-width: 450px; margin: 50px auto; padding: 30px; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
            <h2 style="color: #ef4444; margin-bottom: 15px;">❌ Gagal Memproses Pembayaran</h2>
            <p style="color: #94a3b8; font-size: 0.95rem;">Terjadi kesalahan sistem saat menghubungi gerbang pembayaran: <b>${err.message}</b></p>
          </div>
        </body>
      </html>
    `);
  }
});

module.exports = router;
