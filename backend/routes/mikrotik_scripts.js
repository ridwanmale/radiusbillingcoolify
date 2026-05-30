const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper to ensure table exists
const ensureTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS mikrotik_script_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      ros_version VARCHAR(10) NOT NULL,
      script_content TEXT NOT NULL,
      parameters TEXT,
      description VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
};

// Get all templates
router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await db.query('SELECT * FROM mikrotik_script_templates ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('[Mikrotik Scripts] GET Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create template
router.post('/', async (req, res) => {
  const { name, ros_version, script_content, parameters, description } = req.body;
  if (!name || !script_content) {
    return res.status(400).json({ error: 'Name and script content are required' });
  }
  try {
    await ensureTable();
    const [result] = await db.query(
      'INSERT INTO mikrotik_script_templates (name, ros_version, script_content, parameters, description) VALUES (?, ?, ?, ?, ?)',
      [name, ros_version, script_content, parameters || '', description || '']
    );
    res.json({ id: result.insertId, message: 'Template created successfully' });
  } catch (error) {
    console.error('[Mikrotik Scripts] POST Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  const { name, ros_version, script_content, parameters, description } = req.body;
  try {
    await ensureTable();
    await db.query(
      'UPDATE mikrotik_script_templates SET name = ?, ros_version = ?, script_content = ?, parameters = ?, description = ? WHERE id = ?',
      [name, ros_version, script_content, parameters || '', description || '', req.params.id]
    );
    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('[Mikrotik Scripts] PUT Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    await ensureTable();
    await db.query('DELETE FROM mikrotik_script_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('[Mikrotik Scripts] DELETE Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
