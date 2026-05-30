const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all voucher types
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM voucher_types ORDER BY sort_order ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new type
router.post('/', async (req, res) => {
  const { name, description, icon, sort_order } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO voucher_types (name, description, icon, sort_order) VALUES (?, ?, ?, ?)',
      [name, description, icon || 'confirmation_number', sort_order || 0]
    );
    res.json({ id: result.insertId, message: 'Jenis voucher berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update type
router.put('/:id', async (req, res) => {
  const { name, description, icon, sort_order, is_active } = req.body;
  try {
    await db.query(
      'UPDATE voucher_types SET name = ?, description = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [name, description, icon, sort_order, is_active ? 1 : 0, req.params.id]
    );
    res.json({ message: 'Jenis voucher diperbarui' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete type
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM voucher_types WHERE id = ?', [req.params.id]);
    res.json({ message: 'Jenis voucher dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
