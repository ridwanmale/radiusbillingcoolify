const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all payment methods
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM payment_methods ORDER BY group_name, name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update status/fees
router.put('/:id', async (req, res) => {
  const { is_active, fee_fixed, fee_percent } = req.body;
  try {
    await db.query(
      'UPDATE payment_methods SET is_active = ?, fee_fixed = ?, fee_percent = ? WHERE id = ?',
      [is_active ? 1 : 0, fee_fixed || 0, fee_percent || 0, req.params.id]
    );
    res.json({ message: 'Metode pembayaran diperbarui' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk toggle status
router.post('/bulk-status', async (req, res) => {
  const { ids, is_active } = req.body;
  try {
    await db.query('UPDATE payment_methods SET is_active = ? WHERE id IN (?)', [is_active ? 1 : 0, ids]);
    res.json({ message: `Status ${ids.length} metode pembayaran berhasil diubah` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
