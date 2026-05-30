const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all outlets
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM outlets ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create an outlet
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const [result] = await db.query('INSERT INTO outlets (name) VALUES (?)', [name]);
    res.json({ id: result.insertId, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an outlet
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM outlets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Outlet deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
