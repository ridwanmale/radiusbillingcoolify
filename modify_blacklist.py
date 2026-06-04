import re

with open('backend/routes/online_store.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Update checkSpamProtection
old_check = '''const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const device_id = req.body.device_id || '';

    // 1. Check if already blocked'''

new_check = '''const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const device_id = req.body.device_id || '';

    // 0. Check Permanent Blacklist UUID
    if (device_id) {
      const [permBlocks] = await db.query('SELECT id FROM blacklist_uuid WHERE device_id = ?', [device_id]);
      if (permBlocks.length > 0) {
        return res.status(403).json({ error: 'Perangkat Anda diblokir permanen oleh Admin karena terdeteksi melakukan spam. Hubungi Admin untuk info lebih lanjut.', blocked: true });
      }
    }

    // 1. Check if already blocked (Auto Spam)'''

if old_check in c:
    c = c.replace(old_check, new_check)

# 2. Add New Endpoints
new_endpoints = '''

// ================= PERMANENT BLACKLIST UUID =================

// GET Permanent Blacklist
router.get('/blacklist-uuid', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM blacklist_uuid ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST Add to Permanent Blacklist
router.post('/blacklist-uuid', async (req, res) => {
  const { device_id, reason } = req.body;
  if (!device_id) return res.status(400).json({ error: 'UUID (Device ID) tidak boleh kosong' });
  try {
    await db.query('INSERT IGNORE INTO blacklist_uuid (device_id, reason) VALUES (?, ?)', [device_id, reason || 'Blacklisted by Admin']);
    res.json({ success: true, message: 'Berhasil memblokir perangkat secara permanen' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE from Permanent Blacklist
router.delete('/blacklist-uuid/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM blacklist_uuid WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Berhasil membuka blokir perangkat' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET Top Spammers (from jurnal_keuangan)
router.get('/top-spammers', async (req, res) => {
  try {
    // Cari UUID yang memiliki transaksi PENDING paling banyak yang BELUM ada di permanent blacklist
    const [rows] = await db.query(
      SELECT j.device_id, COUNT(j.id) as spam_count 
      FROM jurnal_keuangan j
      LEFT JOIN blacklist_uuid b ON j.device_id = b.device_id
      WHERE j.status = 'PENDING' 
        AND j.device_id IS NOT NULL 
        AND j.device_id != ''
        AND b.id IS NULL
      GROUP BY j.device_id
      ORDER BY spam_count DESC
      LIMIT 10
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
'''

old_footer = 'module.exports = router;'
if old_footer in c:
    c = c.replace(old_footer, new_endpoints)

with open('backend/routes/online_store.js', 'w', encoding='utf-8') as f:
    f.write(c)
print("Updated backend API")
