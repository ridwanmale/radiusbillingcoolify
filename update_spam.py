import re

with open('backend/routes/online_store.js', 'r', encoding='utf-8') as f:
    c = f.read()

old_logic = '''const checkSpamProtection = async (req, res, next) => {
  try {
    const [settingsRows] = await db.query('SELECT spam_protection_enabled, spam_max_pending FROM portal_settings WHERE id = 1');
    const settings = settingsRows[0];
    if (!settings || !settings.spam_protection_enabled) return next();

    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const device_id = req.body.device_id || '';

    // 1. Check if already blocked
    let blockCheckQuery = 'SELECT id, reason FROM spam_blocklist WHERE ip_address = ?';
    let blockCheckParams = [ip_address];
    if (device_id) {
      blockCheckQuery += ' OR device_id = ?';
      blockCheckParams.push(device_id);
    }
    const [blockedRows] = await db.query(blockCheckQuery, blockCheckParams);
    
    if (blockedRows.length > 0) {
      return res.status(403).json({ error: 'Akses Anda diblokir karena terlalu banyak membuat transaksi yang belum dibayar. Hubungi Admin.', blocked: true });
    }'''

new_logic = '''const checkSpamProtection = async (req, res, next) => {
  try {
    const [settingsRows] = await db.query('SELECT spam_protection_enabled, spam_max_pending, spam_auto_unblock_minutes FROM portal_settings WHERE id = 1');
    const settings = settingsRows[0];
    if (!settings || !settings.spam_protection_enabled) return next();

    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const device_id = req.body.device_id || '';

    // 1. Check if already blocked
    let blockCheckQuery = 'SELECT id, reason, blocked_at, ip_address as b_ip, device_id as b_device FROM spam_blocklist WHERE ip_address = ?';
    let blockCheckParams = [ip_address];
    if (device_id) {
      blockCheckQuery += ' OR device_id = ?';
      blockCheckParams.push(device_id);
    }
    const [blockedRows] = await db.query(blockCheckQuery, blockCheckParams);
    
    if (blockedRows.length > 0) {
      const b = blockedRows[0];
      const unblockMinutes = settings.spam_auto_unblock_minutes || 0;
      
      if (unblockMinutes > 0 && b.blocked_at) {
        const blockedTime = new Date(b.blocked_at).getTime();
        const now = new Date().getTime();
        if (now - blockedTime > unblockMinutes * 60 * 1000) {
          // AUTO UNBLOCK INLINE
          let delQuery = 'DELETE FROM jurnal_keuangan WHERE status = "PENDING" AND (ip_address = ?';
          let delParams = [b.b_ip];
          if (b.b_device) {
            delQuery += ' OR device_id = ?)';
            delParams.push(b.b_device);
          } else {
            delQuery += ')';
          }
          await db.query(delQuery, delParams);
          await db.query('DELETE FROM spam_blocklist WHERE id = ?', [b.id]);
          
          return next(); // Unblocked! Let them proceed
        }
      }
      
      return res.status(403).json({ error: 'Akses Anda diblokir karena terlalu banyak membuat transaksi yang belum dibayar. Hubungi Admin.', blocked: true });
    }'''

if old_logic in c:
    c = c.replace(old_logic, new_logic)
    with open('backend/routes/online_store.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Inline unblock logic added!")
else:
    print("Could not find block")
