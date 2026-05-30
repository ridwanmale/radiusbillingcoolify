const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all profiles with metadata
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        r.groupname, 
        MAX(CASE WHEN r.attribute = 'Mikrotik-Rate-Limit' THEN r.value END) as rate_limit,
        MAX(CASE WHEN r.attribute = 'Session-Timeout' THEN r.value END) as session_timeout,
        MAX(CASE WHEN r.attribute = 'Mikrotik-Group' THEN r.value END) as mikrotik_group_radius,
        m.warna,
        m.mikrotik_group,
        m.masa_aktif,
        m.satuan,
        m.harga,
        m.hpp,
        m.komisi,
        m.shared_users,
        COALESCE(m.show_in_store, 1) as show_in_store,
        COALESCE(m.status, 'Aktif') as status,
        m.prefix,
        m.code_combination,
        m.code_length
      FROM radgroupreply r
      LEFT JOIN profiles_metadata m ON r.groupname = m.groupname
      GROUP BY r.groupname
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new profile with metadata
router.post('/', async (req, res) => {
    const { 
      name, 
      warna,
      mikrotikGroup,
      rateLimit, 
      masaAktif,
      satuan,
      harga,
      hpp,
      komisi,
      sharedUsers,
      showInStore,
      prefix,
      codeCombination,
      codeLength
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Profile name is required' });
    }
  
    // Calculate Harga if HPP and Komisi are provided
    const finalHpp = parseFloat(hpp || 0);
    const finalKomisi = parseFloat(komisi || 0);
    const finalHarga = (finalHpp + finalKomisi) > 0 ? (finalHpp + finalKomisi) : parseFloat(harga || 0);
    const finalShared = (sharedUsers !== undefined && sharedUsers !== null) ? parseInt(sharedUsers) : 1;
    const finalShowInStore = showInStore === undefined ? 1 : (showInStore ? 1 : 0);
  
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
  
      // 1. Insert/Update Metadata
      await connection.query(
        `INSERT INTO profiles_metadata (groupname, warna, mikrotik_group, masa_aktif, satuan, harga, hpp, komisi, shared_users, show_in_store, prefix, code_combination, code_length) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         warna=VALUES(warna), mikrotik_group=VALUES(mikrotik_group), masa_aktif=VALUES(masa_aktif),
         satuan=VALUES(satuan), harga=VALUES(harga), hpp=VALUES(hpp), komisi=VALUES(komisi), shared_users=VALUES(shared_users),
         show_in_store=VALUES(show_in_store), prefix=VALUES(prefix), code_combination=VALUES(code_combination), code_length=VALUES(code_length)`,
        [name, warna || '#3b82f6', mikrotikGroup || '', masaAktif || 0, satuan || 'Jam', finalHarga, finalHpp, finalKomisi, finalShared, finalShowInStore, prefix || null, codeCombination || null, codeLength ? parseInt(codeLength) : null]
      );
  
      // Clear old RADIUS attributes if updating
      await connection.query('DELETE FROM radgroupreply WHERE groupname = ?', [name]);
      await connection.query('DELETE FROM radgroupcheck WHERE groupname = ?', [name]);
  
      // 2. Insert RADIUS attributes (Check Table - Simultaneous Use)
      // If finalShared is 0, we don't insert Simultaneous-Use (means Unlimited)
      if (finalShared > 0) {
        await connection.query(
          'INSERT INTO radgroupcheck (groupname, attribute, op, value) VALUES (?, ?, ?, ?)',
          [name, 'Simultaneous-Use', ':=', finalShared.toString()]
        );
      }

      // 3. Insert RADIUS attributes (Reply Table)
      if (rateLimit) {
        await connection.query(
          'INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES (?, ?, ?, ?)',
          [name, 'Mikrotik-Rate-Limit', '=', rateLimit]
        );
      }
    
    if (mikrotikGroup) {
      await connection.query(
        'INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES (?, ?, ?, ?)',
        [name, 'Mikrotik-Group', '=', mikrotikGroup]
      );
    }

    // Session-Timeout is handled dynamically by sql.conf for countdown behavior.

    
    // Default reply
    await connection.query(
        'INSERT IGNORE INTO radgroupreply (groupname, attribute, op, value) VALUES (?, ?, ?, ?)',
        [name, 'Fall-Through', '=', 'Yes']
    );

    await connection.commit();
    res.json({ message: 'Profile saved successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Delete a profile
router.delete('/:name', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM radgroupreply WHERE groupname = ?', [req.params.name]);
    await connection.query('DELETE FROM radgroupcheck WHERE groupname = ?', [req.params.name]);
    await connection.query('DELETE FROM profiles_metadata WHERE groupname = ?', [req.params.name]);
    await connection.commit();
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update profile status
router.put('/:name/status', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    await db.query(
      'UPDATE profiles_metadata SET status = ? WHERE groupname = ?',
      [status, req.params.name]
    );
    res.json({ message: `Status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
