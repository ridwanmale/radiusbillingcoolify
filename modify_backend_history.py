import re

with open('backend/routes/online_store.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 2. Update checkSpamProtection to increment spam_history
old_auto_block = '''if (pendingRows[0].count >= maxPending) {
        // Auto-block
        await db.query('INSERT IGNORE INTO spam_blocklist (ip_address, device_id, reason) VALUES (?, ?, ?)', 
          [ip_address, device_id || null, \Melebihi batas transaksi PENDING (\)\]);
          
        return res.status(429).json({ error: 'Akses Anda diblokir sementara karena terlalu banyak membuat transaksi yang belum dibayar. Harap lunasi transaksi sebelumnya atau tunggu beberapa saat.' });
      }'''

new_auto_block = '''if (pendingRows[0].count >= maxPending) {
        // Auto-block
        await db.query('INSERT IGNORE INTO spam_blocklist (ip_address, device_id, reason) VALUES (?, ?, ?)', 
          [ip_address, device_id || null, \Melebihi batas transaksi PENDING (\)\]);
          
        // Increment History
        if (device_id) {
          await db.query(\
            INSERT INTO spam_history (device_id, block_count, last_blocked_at) 
            VALUES (?, 1, NOW()) 
            ON DUPLICATE KEY UPDATE block_count = block_count + 1, last_blocked_at = NOW()
          \, [device_id]);
        }
          
        return res.status(429).json({ error: 'Akses Anda diblokir sementara karena terlalu banyak membuat transaksi yang belum dibayar. Harap lunasi transaksi sebelumnya atau tunggu beberapa saat.' });
      }'''

if old_auto_block in c:
    c = c.replace(old_auto_block, new_auto_block)
else:
    print("Could not find auto block logic")

# 3. Update GET /top-spammers
old_top = '''router.get('/top-spammers', async (req, res) => {
  try {
    // Cari UUID yang memiliki transaksi PENDING paling banyak yang BELUM ada di permanent blacklist
    const [rows] = await db.query(\
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
    \);
    res.json(rows);
  } catch (error) {'''

new_top = '''router.get('/top-spammers', async (req, res) => {
  try {
    // Ambil rekam jejak pelanggaran dari spam_history yang belum diblokir permanen
    const [rows] = await db.query(\
      SELECT s.device_id, s.block_count as spam_count 
      FROM spam_history s
      LEFT JOIN blacklist_uuid b ON s.device_id = b.device_id
      WHERE b.id IS NULL
      ORDER BY s.block_count DESC, s.last_blocked_at DESC
      LIMIT 10
    \);
    res.json(rows);
  } catch (error) {'''

if old_top in c:
    c = c.replace(old_top, new_top)
else:
    print("Could not find top spammers query")

with open('backend/routes/online_store.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("Updated backend API for history")
