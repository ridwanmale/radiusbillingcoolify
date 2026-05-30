const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper to log activity
const logActivity = async (admin_username, action, details, req) => {
  try {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    await db.query(
      'INSERT INTO activity_log (admin_username, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [admin_username || 'System', action, details, ip]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// Get recent logs
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a log entry (manual log from frontend if needed)
router.post('/', async (req, res) => {
  const { admin_username, action, details } = req.body;
  await logActivity(admin_username, action, details, req);
  res.json({ message: 'Logged' });
});

module.exports = {
  router,
  logActivity
};
