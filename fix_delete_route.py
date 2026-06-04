import re

with open('backend/routes/online_store.js', 'r', encoding='utf-8') as f:
    c = f.read()

old_route = '''  // 6. DELETE Spam Blocklist
  router.delete('/spam-blocklist/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM spam_blocklist WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });'''

new_route = '''  // 6. DELETE Spam Blocklist
  router.delete('/spam-blocklist/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Ambil info device untuk membersihkan PENDING transaksi
      const [blockRows] = await db.query('SELECT ip_address, device_id FROM spam_blocklist WHERE id = ?', [id]);
      if (blockRows.length > 0) {
        const b = blockRows[0];
        let delQuery = 'DELETE FROM jurnal_keuangan WHERE status = "PENDING" AND (ip_address = ?';
        let delParams = [b.ip_address];
        if (b.device_id) {
          delQuery += ' OR device_id = ?)';
          delParams.push(b.device_id);
        } else {
          delQuery += ')';
        }
        await db.query(delQuery, delParams);
      }

      await db.query('DELETE FROM spam_blocklist WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });'''

if old_route in c:
    c = c.replace(old_route, new_route)
    with open('backend/routes/online_store.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Successfully replaced.")
else:
    print("Target string not found.")
