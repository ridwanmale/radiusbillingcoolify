const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { logActivity } = require('./logs');
const { notifyTelegram } = require('../utils/telegram');

const ensureIsolirGroup = async (connection) => {
  await connection.query(
    'DELETE FROM radgroupreply WHERE groupname = ? AND attribute IN (?, ?)',
    ['ARM_ISOLIR', 'Mikrotik-Group', 'Framed-Pool']
  );
  await connection.query(
    'INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
    [
      'ARM_ISOLIR', 'Mikrotik-Group', ':=', 'ARM_ISOLIR',
      'ARM_ISOLIR', 'Framed-Pool', ':=', 'ARMISOLIR'
    ]
  );
};

// 1. Get all customers
router.get('/', async (req, res) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT c.*, p.name as package_name, p.rate_limit as package_rate_limit, p.upload_speed, p.download_speed, n.nasname as router_ip, n.shortname as router_name
      FROM pppoe_customers c
      LEFT JOIN pppoe_packages p ON c.package_id = p.id
      LEFT JOIN nas n ON c.router_id = n.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.id DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create customer
router.post('/', async (req, res) => {
  const { 
    name, phone, address, pppoe_username, pppoe_password, 
    router_id, package_id, billing_cycle_type, billing_start_date, notes 
  } = req.body;

  if (!name || !pppoe_username || !pppoe_password || !router_id || !package_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Get package details
    const [pkg] = await connection.query('SELECT * FROM pppoe_packages WHERE id = ?', [package_id]);
    if (pkg.length === 0) throw new Error('Package not found');

    // Calculate dates based on billing cycle
    let next_invoice_date = null;
    let next_isolir_date = null;
    const start_date = billing_start_date ? new Date(billing_start_date) : new Date();

    if (billing_cycle_type === 'profile') {
      const active_days = pkg[0].active_days || 30;
      next_isolir_date = new Date(start_date);
      next_isolir_date.setDate(next_isolir_date.getDate() + active_days);
      
      next_invoice_date = new Date(next_isolir_date);
      next_invoice_date.setDate(next_invoice_date.getDate() - 7);
    } else if (billing_cycle_type === 'fixed') {
      next_isolir_date = new Date(start_date);
      next_isolir_date.setMonth(next_isolir_date.getMonth() + 1);
      
      next_invoice_date = new Date(next_isolir_date);
      next_invoice_date.setDate(next_invoice_date.getDate() - 7);
    } else if (billing_cycle_type === 'monthly') {
      // Due 10th of next month, Invoice 1st of next month
      const today = new Date();
      next_invoice_date = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      next_isolir_date = new Date(today.getFullYear(), today.getMonth() + 1, 10);
    }

    const customer_code = 'CUST-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // Insert to pppoe_customers
    const [result] = await connection.query(
      `INSERT INTO pppoe_customers (
        customer_code, name, phone, address, pppoe_username, pppoe_password, 
        router_id, package_id, billing_cycle_type, billing_start_date, 
        activation_date, next_invoice_date, next_isolir_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        customer_code, name, phone, address, pppoe_username, pppoe_password, 
        router_id, package_id, billing_cycle_type || 'profile', billing_start_date || new Date(), 
        next_invoice_date, next_isolir_date, notes
      ]
    );

    // FreeRADIUS Integration
    // 1. radcheck
    await connection.query(
      'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
      [pppoe_username, 'Cleartext-Password', ':=', pppoe_password]
    );

    // 2. radusergroup
    await connection.query(
      'INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, ?)',
      [pppoe_username, pkg[0].slug, 1]
    );

    await connection.commit();
    await logActivity(req.body.admin_username, 'Create PPPoE Customer', `Menambah pelanggan: ${name} (${pppoe_username})`, req);

    res.json({ id: result.insertId, customer_code, message: 'Pelanggan PPPoE berhasil didaftarkan' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 3. Update status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [cust] = await connection.query('SELECT * FROM pppoe_customers WHERE id = ?', [req.params.id]);
    if (cust.length === 0) throw new Error('Customer not found');

    await connection.query('UPDATE pppoe_customers SET status = ? WHERE id = ?', [status, req.params.id]);

    // FreeRADIUS Status Sync
    if (['suspend', 'expired', 'inactive'].includes(status)) {
      // Add check attribute to prevent login
      await connection.query(
        'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [cust[0].pppoe_username, 'Auth-Type', ':=', 'Reject']
      );
    } else if (status === 'isolir') {
      await ensureIsolirGroup(connection);
      // Move to isolir group
      await connection.query(
        'UPDATE radusergroup SET groupname = ? WHERE username = ?',
        ['ARM_ISOLIR', cust[0].pppoe_username]
      );
      // Remove Reject if any
      await connection.query('DELETE FROM radcheck WHERE username = ? AND attribute = ?', [cust[0].pppoe_username, 'Auth-Type']);
    } else if (status === 'active') {
      // Restore normal group
      const [pkg] = await connection.query('SELECT slug FROM pppoe_packages WHERE id = ?', [cust[0].package_id]);
      if (pkg.length > 0) {
        await connection.query(
          'UPDATE radusergroup SET groupname = ? WHERE username = ?',
          [pkg[0].slug, cust[0].pppoe_username]
        );
      }
      await connection.query('DELETE FROM radcheck WHERE username = ? AND attribute = ?', [cust[0].pppoe_username, 'Auth-Type']);
    }

    // Telegram Notification if Isolated
    if (status === 'isolir') {
      const tgMessage = `<b>🚫 ISOLIR PELANGGAN</b>\n\nPelanggan: <b>${cust[0].name}</b>\nUsername: <code>${cust[0].pppoe_username}</code>\nStatus: Terisolir (Manual oleh Admin)`;
      await notifyTelegram(tgMessage);
    }

    await connection.commit();
    
    // TODO: Disconnect user if online and status changed to non-active

    res.json({ message: `Status pelanggan diperbarui menjadi ${status}` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 4. Update customer
router.put('/:id', async (req, res) => {
  const { 
    name, phone, address, pppoe_username, pppoe_password, 
    router_id, package_id, billing_cycle_type, notes, status 
  } = req.body;
  const customerId = req.params.id;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [oldCust] = await connection.query('SELECT * FROM pppoe_customers WHERE id = ?', [customerId]);
    if (oldCust.length === 0) throw new Error('Customer not found');

    // Update pppoe_customers
    await connection.query(
      `UPDATE pppoe_customers SET 
        name = ?, phone = ?, address = ?, pppoe_username = ?, pppoe_password = ?, 
        router_id = ?, package_id = ?, billing_cycle_type = ?, notes = ?, status = ?
       WHERE id = ?`,
      [
        name || oldCust[0].name, 
        phone || oldCust[0].phone, 
        address || oldCust[0].address, 
        pppoe_username || oldCust[0].pppoe_username, 
        pppoe_password || oldCust[0].pppoe_password, 
        router_id || oldCust[0].router_id, 
        package_id || oldCust[0].package_id, 
        billing_cycle_type || oldCust[0].billing_cycle_type, 
        notes || oldCust[0].notes,
        status || oldCust[0].status,
        customerId
      ]
    );

    // FreeRADIUS Sync
    // 1. radcheck (Update password if changed)
    if (pppoe_password || pppoe_username) {
      // If username changed, delete old one first
      if (pppoe_username && pppoe_username !== oldCust[0].pppoe_username) {
        await connection.query('DELETE FROM radcheck WHERE username = ?', [oldCust[0].pppoe_username]);
        await connection.query('DELETE FROM radusergroup WHERE username = ?', [oldCust[0].pppoe_username]);
      }
      
      await connection.query(
        'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [pppoe_username || oldCust[0].pppoe_username, 'Cleartext-Password', ':=', pppoe_password || oldCust[0].pppoe_password]
      );
    }

    // 2. radusergroup (Update package if changed)
    if (package_id && package_id !== oldCust[0].package_id) {
      const [pkg] = await connection.query('SELECT slug FROM pppoe_packages WHERE id = ?', [package_id]);
      if (pkg.length > 0) {
        await connection.query(
          'UPDATE radusergroup SET groupname = ? WHERE username = ?',
          [pkg[0].slug, pppoe_username || oldCust[0].pppoe_username]
        );
      }
    }

    await connection.commit();
    await logActivity(req.body.admin_username, 'Edit PPPoE Customer', `Mengubah data pelanggan: ${name || oldCust[0].name}`, req);

    res.json({ message: 'Data pelanggan berhasil diperbarui' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 5. Delete customer
router.delete('/:id', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [cust] = await connection.query('SELECT * FROM pppoe_customers WHERE id = ?', [req.params.id]);
    if (cust.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
    }

    const username = cust[0].pppoe_username;
    await connection.query('DELETE FROM radcheck WHERE username = ?', [username]);
    await connection.query('DELETE FROM radusergroup WHERE username = ?', [username]);
    await connection.query('DELETE FROM radreply WHERE username = ?', [username]);
    await connection.query('DELETE FROM radacct WHERE username = ?', [username]);
    await connection.query('DELETE FROM pppoe_customers WHERE id = ?', [req.params.id]);

    await connection.commit();
    await logActivity(req.query.admin_username, 'Delete PPPoE Customer', `Menghapus pelanggan: ${cust[0].name} (${username})`, req);

    res.json({ message: 'Pelanggan PPPoE berhasil dihapus' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
