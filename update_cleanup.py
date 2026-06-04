import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    c = f.read()

old_cleanup = '''      // 2. Bersihkan Transaksi Pending sesuai pengaturan portal_settings
      const [pSettings] = await connection.query('SELECT auto_cleanup_enabled, auto_cleanup_hours FROM portal_settings WHERE id = 1');
      if (pSettings.length > 0 && pSettings[0].auto_cleanup_enabled) {
        const cleanupHours = parseInt(pSettings[0].auto_cleanup_hours) || 24;
        const [delTrx] = await connection.query(
          DELETE FROM jurnal_keuangan 
          WHERE status = 'PENDING' 
          AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
        , [cleanupHours]);
        if (delTrx.affectedRows > 0) {
          console.log([Cleanup] Berhasil menghapus  transaksi pending lama (> jam).);
        }
      }'''

new_cleanup = '''      // 2. Bersihkan Transaksi Pending sesuai pengaturan portal_settings
      const [pSettings] = await connection.query('SELECT auto_cleanup_enabled, auto_cleanup_hours, spam_auto_unblock_minutes FROM portal_settings WHERE id = 1');
      if (pSettings.length > 0) {
        if (pSettings[0].auto_cleanup_enabled) {
          const cleanupHours = parseInt(pSettings[0].auto_cleanup_hours) || 24;
          const [delTrx] = await connection.query(
            DELETE FROM jurnal_keuangan 
            WHERE status = 'PENDING' 
            AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
          , [cleanupHours]);
          if (delTrx.affectedRows > 0) {
            console.log([Cleanup] Berhasil menghapus  transaksi pending lama (> jam).);
          }
        }
        
        // 3. Auto Unblock Spam
        const unblockMinutes = parseInt(pSettings[0].spam_auto_unblock_minutes) || 0;
        if (unblockMinutes > 0) {
          // Ambil device yang expired
          const [expiredBlocks] = await connection.query(
            SELECT id, ip_address, device_id FROM spam_blocklist 
            WHERE blocked_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
          , [unblockMinutes]);
          
          if (expiredBlocks.length > 0) {
            for (let b of expiredBlocks) {
              // Hapus transaksi PENDING agar mereka bisa bertransaksi lagi
              let delQuery = 'DELETE FROM jurnal_keuangan WHERE status = "PENDING" AND (ip_address = ?';
              let delParams = [b.ip_address];
              if (b.device_id) {
                delQuery += ' OR device_id = ?)';
                delParams.push(b.device_id);
              } else {
                delQuery += ')';
              }
              await connection.query(delQuery, delParams);
              
              // Hapus blocklist
              await connection.query('DELETE FROM spam_blocklist WHERE id = ?', [b.id]);
            }
            console.log([Cleanup] Berhasil membuka blokir otomatis  perangkat (> menit).);
          }
        }
      }'''

if old_cleanup in c:
    c = c.replace(old_cleanup, new_cleanup)
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Cleanup logic updated")
else:
    print("Could not find the cleanup block")
