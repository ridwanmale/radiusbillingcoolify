const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Database failover status endpoint for monitoring
router.get('/db-status', (req, res) => {
  try {
    const status = typeof db.getStatus === 'function' ? db.getStatus() : { isPrimaryAlive: true, primaryHost: 'localhost', backupHost: 'localhost', backupActive: false };
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const ensureTelegramSettingsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS telegram_settings (
      outlet_name VARCHAR(128) NOT NULL PRIMARY KEY,
      bot_token VARCHAR(255),
      chat_id VARCHAR(64),
      is_enabled TINYINT(1) DEFAULT 0,
      last_notified_radacctid INT(11) DEFAULT 0
    ) ENGINE=InnoDB;
  `);
};

// Get settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings WHERE id = 1');
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json({});
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
router.put('/', async (req, res) => {
  const { hotspot_name, dns_name, logo_base64, app_logo_base64, cs_phone, sidebar_color, voucher_auto_delete_enabled, voucher_auto_delete_interval } = req.body;
  
  try {
    const query = `
      UPDATE settings SET 
        hotspot_name = IF(? IS NULL, hotspot_name, ?),
        dns_name = IF(? IS NULL, dns_name, ?),
        logo_base64 = IF(? IS NULL, logo_base64, ?),
        app_logo_base64 = IF(? IS NULL, app_logo_base64, ?),
        cs_phone = IF(? IS NULL, cs_phone, ?),
        sidebar_color = IF(? IS NULL, sidebar_color, ?),
        voucher_auto_delete_enabled = IF(? IS NULL, voucher_auto_delete_enabled, ?),
        voucher_auto_delete_interval = IF(? IS NULL, voucher_auto_delete_interval, ?)
      WHERE id = 1
    `;
    
    const params = [
      hotspot_name ?? null, hotspot_name ?? null,
      dns_name ?? null, dns_name ?? null,
      logo_base64 ?? null, logo_base64 ?? null,
      app_logo_base64 ?? null, app_logo_base64 ?? null,
      cs_phone ?? null, cs_phone ?? null,
      sidebar_color ?? null, sidebar_color ?? null,
      voucher_auto_delete_enabled !== undefined ? voucher_auto_delete_enabled : null, voucher_auto_delete_enabled !== undefined ? voucher_auto_delete_enabled : null,
      voucher_auto_delete_interval ?? null, voucher_auto_delete_interval ?? null
    ];

    await db.query(query, params);
    res.json({ message: 'Settings updated' });
  } catch (error) {
    console.error('Settings Update Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all voucher templates
router.get('/templates', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM voucher_templates ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM voucher_templates WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Template not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new template
router.post('/templates', async (req, res) => {
  const { template_name, header_html, row_html, footer_html } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO voucher_templates (template_name, header_html, row_html, footer_html) VALUES (?, ?, ?, ?)',
      [template_name || 'Template Baru', header_html || '', row_html || '', footer_html || '']
    );
    res.json({ id: result.insertId, message: 'Template created' });
  } catch (error) {
    console.error('POST /templates error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/templates/:id', async (req, res) => {
  const { template_name, header_html, row_html, footer_html } = req.body;
  const { id } = req.params;
  try {
    await db.query(
      'UPDATE voucher_templates SET template_name = ?, header_html = ?, row_html = ?, footer_html = ? WHERE id = ?',
      [template_name, header_html, row_html, footer_html, id]
    );
    res.json({ message: 'Template updated' });
  } catch (error) {
    console.error(`PUT /templates/${id} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    // Prevent deleting the last template
    const [count] = await db.query('SELECT COUNT(*) as total FROM voucher_templates');
    if (count[0].total <= 1) {
      return res.status(400).json({ error: 'Minimal harus ada 1 template' });
    }
    await db.query('DELETE FROM voucher_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- TELEGRAM SETTINGS ---

// Get all Telegram settings (including outlets)
router.get('/telegram', async (req, res) => {
  try {
    await ensureTelegramSettingsTable();
    // Ambil semua outlet
    const [outlets] = await db.query('SELECT name FROM outlets');
    const outletList = ['Global', 'Payment Gateway', 'Cek Voucher', 'Telegram Admin', ...outlets.map(o => o.name)];

    // Ambil setting yang sudah ada
    const [rows] = await db.query('SELECT * FROM telegram_settings');
    
    // Gabungkan
    const result = outletList.map(name => {
      const existing = rows.find(r => r.outlet_name === name);
      return existing || { outlet_name: name, bot_token: '', chat_id: '', is_enabled: 0 };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update or Create Telegram setting for an outlet
router.put('/telegram', async (req, res) => {
  const { outlet_name, is_enabled } = req.body;
  const bot_token = (req.body.bot_token || '').trim();
  const chat_id = (req.body.chat_id || '').trim();
  try {
    await ensureTelegramSettingsTable();
    await db.query(`
      INSERT INTO telegram_settings (outlet_name, bot_token, chat_id, is_enabled) 
      VALUES (?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
      bot_token = VALUES(bot_token), 
      chat_id = VALUES(chat_id), 
      is_enabled = VALUES(is_enabled)
    `, [outlet_name, bot_token, chat_id, is_enabled ? 1 : 0]);

    res.json({ message: `Telegram settings updated for ${outlet_name}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Telegram notification
router.post('/telegram/test', async (req, res) => {
  const bot_token = (req.body.bot_token || '').trim();
  const chat_id = (req.body.chat_id || '').trim();
  if (!bot_token || !chat_id) return res.status(400).json({ error: 'Token and Chat ID required' });

  try {
    const fetch = require('node-fetch');
    const message = "ðŸ”” *TES NOTIFIKASI*\n\nSelamat! Bot Telegram Anda sudah terhubung dengan sistem RADIUS Billing.";
    
    const response = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat_id,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    if (data.ok) {
      res.json({ success: true, message: 'Test success' });
    } else {
      res.status(400).json({ error: data.description });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MIDTRANS PAYMENT GATEWAY SETTINGS ---

// Get Midtrans settings
router.get('/payment-gateway', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT payment_gateway_config FROM settings WHERE id = 1');
    
    if (rows.length > 0 && rows[0].payment_gateway_config) {
      try {
        const config = JSON.parse(rows[0].payment_gateway_config);
        // Don't send server_key to frontend (security)
        if (config.midtrans) {
          config.midtrans.server_key = config.midtrans.server_key ? '***HIDDEN***' : '';
        }
        res.json(config);
      } catch (e) {
        res.json({});
      }
    } else {
      res.json({});
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save Midtrans settings
router.post('/payment-gateway', async (req, res) => {
  const { midtrans } = req.body;
  try {
    if (!midtrans || !midtrans.server_key || !midtrans.merchant_id) {
      return res.status(400).json({ error: 'Server Key dan Merchant ID diperlukan' });
    }

    const config = { midtrans };
    const configJson = JSON.stringify(config);

    await db.query(
      'UPDATE settings SET payment_gateway_config = ? WHERE id = 1',
      [configJson]
    );

    res.json({ message: 'Pengaturan Midtrans berhasil disimpan' });
  } catch (error) {
    console.error('Midtrans Settings Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Midtrans connection
router.post('/test-midtrans', async (req, res) => {
  const { server_key, merchant_id } = req.body;

  if (!server_key || !merchant_id) {
    return res.status(400).json({ error: 'Server Key dan Merchant ID diperlukan' });
  }

  try {
    const axios = require('axios');
    
    // Test connection by checking balance/account info
    const response = await axios({
      method: 'GET',
      url: 'https://app.midtrans.com/api/v1/merchants/api_balance',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(server_key + ':').toString('base64')}`
      },
      timeout: 5000
    });

    if (response.status === 200) {
      res.json({ 
        message: 'âœ“ Koneksi Midtrans berhasil!',
        data: {
          merchant_id: merchant_id,
          balance: response.data.balance ? `Rp ${Number(response.data.balance).toLocaleString('id-ID')}` : 'N/A'
        }
      });
    } else {
      res.status(400).json({ error: 'Server Key tidak valid' });
    }
  } catch (error) {
    console.error('Midtrans Test Error:', error.message);
    
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'Server Key tidak valid atau telah kadaluarsa' });
    } else if (error.code === 'ECONNABORTED') {
      res.status(503).json({ error: 'Timeout: Midtrans server tidak merespons' });
    } else {
      res.status(500).json({ error: error.message || 'Gagal terhubung ke Midtrans' });
    }
  }
});

module.exports = router;

