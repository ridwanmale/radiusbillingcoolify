const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { logActivity } = require('./logs');

// 1. Get all invoices
router.get('/invoices', async (req, res) => {
  const { customer_id, status, period } = req.query;
  let query = `
    SELECT i.*, c.name as customer_name, c.customer_code, c.pppoe_username, p.name as package_name
    FROM pppoe_invoices i
    JOIN pppoe_customers c ON i.customer_id = c.id
    JOIN pppoe_packages p ON i.package_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (customer_id) {
    query += ' AND i.customer_id = ?';
    params.push(customer_id);
  }
  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  query += ' ORDER BY i.id DESC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Manual generate invoice for a customer
router.post('/invoices/generate/:customerId', async (req, res) => {
  const customerId = req.params.customerId;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [cust] = await connection.query('SELECT * FROM pppoe_customers WHERE id = ?', [customerId]);
    if (cust.length === 0) throw new Error('Pelanggan tidak ditemukan');

    const [pkg] = await connection.query('SELECT * FROM pppoe_packages WHERE id = ?', [cust[0].package_id]);
    
    // Check for existing unpaid invoice for current period
    const today = new Date();
    const invoice_number = 'INV-' + today.getFullYear() + (today.getMonth() + 1).toString().padStart(2, '0') + customerId + Math.floor(Math.random() * 1000);

    const [result] = await connection.query(
      `INSERT INTO pppoe_invoices (
        invoice_number, customer_id, package_id, billing_cycle_type, 
        amount, status, invoice_date, due_date, isolir_date
      ) VALUES (?, ?, ?, ?, ?, 'unpaid', NOW(), ?, ?)`,
      [
        invoice_number, customerId, cust[0].package_id, cust[0].billing_cycle_type,
        pkg[0].price, cust[0].next_invoice_date || new Date(), cust[0].next_isolir_date || new Date()
      ]
    );

    await connection.query('UPDATE pppoe_customers SET billing_status = "unpaid", last_invoice_date = NOW() WHERE id = ?', [customerId]);

    await connection.commit();
    res.json({ message: 'Invoice berhasil dibuat', invoice_number });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 3. Process payment
router.post('/invoices/:id/payment', async (req, res) => {
  const invoiceId = req.params.id;
  const { amount, payment_method, received_by, notes } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [inv] = await connection.query('SELECT * FROM pppoe_invoices WHERE id = ?', [invoiceId]);
    if (inv.length === 0) throw new Error('Invoice tidak ditemukan');
    if (inv[0].status === 'paid') throw new Error('Invoice sudah dibayar');

    const customerId = inv[0].customer_id;

    // 1. Record payment
    await connection.query(
      `INSERT INTO pppoe_payments (invoice_id, customer_id, amount, payment_method, received_by, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoiceId, customerId, amount || inv[0].amount, payment_method || 'Tunai', received_by || 'admin', notes]
    );

    // 2. Update invoice status
    await connection.query('UPDATE pppoe_invoices SET status = "paid", paid_at = NOW() WHERE id = ?', [invoiceId]);

    // 3. Update customer status & dates
    const [cust] = await connection.query('SELECT * FROM pppoe_customers WHERE id = ?', [customerId]);
    const [pkg] = await connection.query('SELECT * FROM pppoe_packages WHERE id = ?', [inv[0].package_id]);

    let new_next_isolir = new Date(cust[0].next_isolir_date || new Date());
    if (cust[0].billing_cycle_type === 'profile') {
      new_next_isolir.setDate(new_next_isolir.getDate() + (pkg[0].active_days || 30));
    } else if (cust[0].billing_cycle_type === 'fixed' || cust[0].billing_cycle_type === 'monthly') {
      new_next_isolir.setMonth(new_next_isolir.getMonth() + 1);
    }

    let new_next_invoice = new Date(new_next_isolir);
    new_next_invoice.setDate(new_next_invoice.getDate() - 7);

    await connection.query(
      `UPDATE pppoe_customers 
       SET status = 'active', billing_status = 'normal', last_payment_date = NOW(),
           next_invoice_date = ?, next_isolir_date = ?
       WHERE id = ?`,
      [new_next_invoice, new_next_isolir, customerId]
    );

    // 4. Restore RADIUS access
    // Remove Reject
    await connection.query('DELETE FROM radcheck WHERE username = ? AND attribute = ?', [cust[0].pppoe_username, 'Auth-Type']);
    // Restore group
    await connection.query('UPDATE radusergroup SET groupname = ? WHERE username = ?', [pkg[0].slug, cust[0].pppoe_username]);

    await connection.commit();
    await logActivity(req.body.admin_username, 'PPPoE Payment', `Pembayaran diterima untuk invoice: ${inv[0].invoice_number}`, req);

    res.json({ message: 'Pembayaran berhasil diproses dan pelanggan telah diaktifkan kembali' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 4. Get billing logs
router.get('/logs', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT l.*, c.name as customer_name, i.invoice_number
      FROM pppoe_billing_logs l
      JOIN pppoe_customers c ON l.customer_id = c.id
      LEFT JOIN pppoe_invoices i ON l.invoice_id = i.id
      ORDER BY l.id DESC LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get billing cycles statistics and details
router.get('/cycles', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT billing_cycle_type, COUNT(*) as count 
      FROM pppoe_customers 
      GROUP BY billing_cycle_type
    `);

    const [customers] = await db.query(`
      SELECT 
        c.id, c.customer_code, c.name, c.pppoe_username, 
        c.billing_cycle_type, c.billing_start_date,
        c.next_invoice_date, c.next_isolir_date,
        p.name as package_name
      FROM pppoe_customers c
      LEFT JOIN pppoe_packages p ON c.package_id = p.id
      ORDER BY c.next_isolir_date ASC
    `);

    res.json({ stats, customers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get payment history
router.get('/payments', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.*, c.name as customer_name, c.customer_code,
        i.invoice_number, pkg.name as package_name
      FROM pppoe_payments p
      LEFT JOIN pppoe_customers c ON p.customer_id = c.id
      LEFT JOIN pppoe_invoices i ON p.invoice_id = i.id
      LEFT JOIN pppoe_packages pkg ON c.package_id = pkg.id
      ORDER BY p.payment_date DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get PPPoE billing settings
router.get('/settings', async (req, res) => {
  try {
    const keys = ['pppoe_invoice_lead_days', 'pppoe_grace_period_days', 'pppoe_isolir_group'];
    const [rows] = await db.query('SELECT * FROM pppoe_settings WHERE setting_key IN (?)', [keys]);
    
    const settings = {
      pppoe_invoice_lead_days: '7',
      pppoe_grace_period_days: '0',
      pppoe_isolir_group: 'ARM_ISOLIR'
    };

    rows.forEach(r => {
      settings[r.setting_key] = r.setting_value;
    });

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Update PPPoE billing settings
router.post('/settings', async (req, res) => {
  const settings = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const [key, value] of Object.entries(settings)) {
      if (['pppoe_invoice_lead_days', 'pppoe_grace_period_days', 'pppoe_isolir_group'].includes(key)) {
        await connection.query(
          'INSERT INTO pppoe_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
          [key, value.toString()]
        );
      }
    }

    await connection.commit();
    await logActivity(req.body.admin_username, 'Update PPPoE Settings', 'Memperbarui pengaturan billing PPPoE', req);
    res.json({ message: 'Pengaturan billing berhasil diperbarui' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;

