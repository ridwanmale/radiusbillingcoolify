const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { logActivity } = require('./logs');

const normalizeSpeed = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.toUpperCase().endsWith('M') ? raw.toUpperCase() : `${raw}M`;
};

const syncNormalPppoeReplies = async (connection, groupname, rateLimit) => {
  await connection.query(
    'DELETE FROM radgroupreply WHERE groupname = ? AND attribute IN (?, ?, ?)',
    [groupname, 'Mikrotik-Rate-Limit', 'Mikrotik-Group', 'Framed-Pool']
  );
  await connection.query(
    'INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)',
    [
      groupname, 'Mikrotik-Rate-Limit', ':=', rateLimit,
      groupname, 'Mikrotik-Group', ':=', 'ARM_RADIUS',
      groupname, 'Framed-Pool', ':=', 'ARMPOOL'
    ]
  );
};

// 1. Get all packages
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pppoe_packages ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create package
router.post('/', async (req, res) => {
  const { name, upload_speed, download_speed, price, active_days, description } = req.body;
  if (!name || !upload_speed || !download_speed) {
    return res.status(400).json({ error: 'Name, Upload Speed, and Download Speed are required' });
  }

  const normalizedUpload = normalizeSpeed(upload_speed);
  const normalizedDownload = normalizeSpeed(download_speed);
  const slug = name.toLowerCase().replace(/ /g, '-');
  const rate_limit = `${normalizedUpload}/${normalizedDownload}`;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Insert to pppoe_packages
    const [result] = await connection.query(
      `INSERT INTO pppoe_packages (name, slug, upload_speed, download_speed, rate_limit, price, active_days, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, normalizedUpload, normalizedDownload, rate_limit, price || 0, active_days || 30, description]
    );

    // Insert to radgroupreply for FreeRADIUS
    await syncNormalPppoeReplies(connection, slug, rate_limit);

    await connection.commit();
    await logActivity(req.body.admin_username, 'Create PPPoE Package', `Membuat paket: ${name} (${rate_limit})`, req);

    res.json({ id: result.insertId, message: 'Paket PPPoE berhasil dibuat' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 3. Update package
router.put('/:id', async (req, res) => {
  const { name, upload_speed, download_speed, price, active_days, description, status } = req.body;
  const packageId = req.params.id;

  try {
    const [oldPkg] = await db.query('SELECT * FROM pppoe_packages WHERE id = ?', [packageId]);
    if (oldPkg.length === 0) return res.status(404).json({ error: 'Paket tidak ditemukan' });

    const normalizedUpload = upload_speed ? normalizeSpeed(upload_speed) : oldPkg[0].upload_speed;
    const normalizedDownload = download_speed ? normalizeSpeed(download_speed) : oldPkg[0].download_speed;
    const slug = name ? name.toLowerCase().replace(/ /g, '-') : oldPkg[0].slug;
    const rate_limit = (normalizedUpload && normalizedDownload) ? `${normalizedUpload}/${normalizedDownload}` : oldPkg[0].rate_limit;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE pppoe_packages 
         SET name = ?, slug = ?, upload_speed = ?, download_speed = ?, rate_limit = ?, price = ?, active_days = ?, description = ?, status = ? 
         WHERE id = ?`,
        [name || oldPkg[0].name, slug, normalizedUpload, normalizedDownload, 
         rate_limit, price || oldPkg[0].price, active_days || oldPkg[0].active_days, description || oldPkg[0].description, 
         status || oldPkg[0].status, packageId]
      );

      if (slug !== oldPkg[0].slug) {
        await connection.query('DELETE FROM radgroupreply WHERE groupname = ?', [oldPkg[0].slug]);
      }
      await syncNormalPppoeReplies(connection, slug, rate_limit);

      await connection.commit();
      await logActivity(req.body.admin_username, 'Update PPPoE Package', `Memperbarui paket: ${name || oldPkg[0].name}`, req);

      res.json({ message: 'Paket PPPoE berhasil diperbarui' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Delete package
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pppoe_packages WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Paket tidak ditemukan' });

    // Check if package is used by customers
    const [users] = await db.query('SELECT 1 FROM pppoe_customers WHERE package_id = ? LIMIT 1', [req.params.id]);
    if (users.length > 0) {
      return res.status(400).json({ error: 'Paket tidak bisa dihapus karena masih digunakan oleh pelanggan' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('DELETE FROM radgroupreply WHERE groupname = ?', [rows[0].slug]);
      await connection.query('DELETE FROM pppoe_packages WHERE id = ?', [req.params.id]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    await logActivity(req.query.admin_username, 'Delete PPPoE Package', `Menghapus paket ID: ${req.params.id}`, req);

    res.json({ message: 'Paket PPPoE berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
