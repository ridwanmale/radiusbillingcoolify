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
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_redirect_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        redirect_message VARCHAR(255) DEFAULT 'Akses Internet Dihentikan Sementara',
        custom_message TEXT,
        redirect_delay INT DEFAULT 5,
        accent_color VARCHAR(16) DEFAULT '#ef4444',
        cs_contact VARCHAR(128) DEFAULT '0812-3456-7890',
        redirect_footer VARCHAR(255) DEFAULT 'Sistem Redirect PPPoE - Radius Billing',
        created_at DATETIME,
        updated_at DATETIME
      )
    `);
  } catch (err) {
    console.error('Failed to create pppoe_redirect_settings table', err);
  }
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
  res.redirect('/isolir');
});

module.exports = router;
