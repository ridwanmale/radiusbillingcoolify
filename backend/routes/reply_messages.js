const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all reply messages
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM radius_reply_messages ORDER BY id ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a reply message
router.put('/:key', async (req, res) => {
    const { key } = req.params;
    const { message } = req.body;
    try {
        await db.query(
            'UPDATE radius_reply_messages SET message = ? WHERE msg_key = ?',
            [message, key]
        );
        res.json({ message: 'Reply message updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
