const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { logActivity } = require('./logs');

// Add single user manually
router.post('/add-single', async (req, res) => {
  const { username, password, profile, outlet_name, mac_lock, admin_username } = req.body;
  
  if (!username || !password || !profile) {
    return res.status(400).json({ error: 'Username, Password, and Profile are required' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check if username already exists
    const [existing] = await connection.query('SELECT 1 FROM radcheck WHERE username = ?', [username]);
    if (existing.length > 0) {
      throw new Error('Username sudah digunakan');
    }

    // 2. Insert Password into radcheck
    await connection.query(
      'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, "Cleartext-Password", ":=", ?)',
      [username, password]
    );

    // 3. Insert into radusergroup (profile)
    await connection.query(
      'INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, ?)',
      [username, profile, 1]
    );

    // 4. Insert into metadata
    await connection.query(
      'INSERT INTO rincian_transaksi_voucher (username, batch_id, outlet_name, status) VALUES (?, "MANUAL", ?, "Aktif")',
      [username, outlet_name || '']
    );

    // 5. Handle MAC Lock
    if (mac_lock) {
      await connection.query(
        'INSERT INTO radreply (username, attribute, op, value) VALUES (?, "Reply-Message", "+=", "MAC_LOCK_ENABLED")',
        [username]
      );
    }

    await connection.commit();
    
    // Log Activity
    await logActivity(admin_username || 'admin', 'Tambah User', `Menambahkan user manual: ${username} (Profile: ${profile})`, req);

    res.json({ message: 'User berhasil ditambahkan', username });
  } catch (error) {
    await connection.rollback();
    console.error('Add Single User Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update single voucher details (STATIC ROUTE - MOST RELIABLE)
router.post('/update-single', async (req, res) => {
  const { username, password, outlet_name, is_locked, batch_id } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update Password
    if (password) {
      await connection.query(
        'UPDATE radcheck SET value = ? WHERE username = ? AND attribute = "Cleartext-Password"',
        [password, username]
      );
    }

    // 2. Update Metadata
    await connection.query(`
      INSERT INTO rincian_transaksi_voucher (username, outlet_name, batch_id) 
      VALUES (TRIM(?), ?, ?) 
      ON DUPLICATE KEY UPDATE 
        outlet_name = VALUES(outlet_name),
        batch_id = VALUES(batch_id)
    `, [username, outlet_name || '', batch_id || '']);

    // 3. Update Mac Lock
    if (is_locked !== undefined) {
      if (is_locked) {
        // Enable Locking mechanism using radreply flag
        await connection.query('INSERT IGNORE INTO radreply (username, attribute, op, value) VALUES (?, "Reply-Message", "+=", "MAC_LOCK_ENABLED")', [username]);
      } else {
        // Disable Locking mechanism entirely
        await connection.query('DELETE FROM radreply WHERE username = ? AND value = "MAC_LOCK_ENABLED"', [username]);
        await connection.query('DELETE FROM radcheck WHERE username = ? AND attribute = "Calling-Station-Id"', [username]);
      }
    }

    await connection.commit();
    res.json({ message: 'Voucher updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});



// Custom random string generator based on charset type
const generateCode = (length, charsetType) => {
  let charset = '';
  switch (charsetType) {
    case 'lower':
      charset = 'abcdefghjkmnpqrstuvwxyz'; // No i, l, o
      break;
    case 'upper':
      charset = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // No I, L, O
      break;
    case 'numeric':
      charset = '123456789'; // No 0
      break;
    case 'alpha_num':
    default:
      charset = '123456789abcdefghjkmnpqrstuvwxyz'; // Safe Alphanumeric
      break;
  }
  
  let result = '';
  for (let i = 0; i < length; i++) {
    if (charsetType === 'alpha_num' && i === 0) {
      // First digit must be a number
      result += '123456789'.charAt(Math.floor(Math.random() * 9));
    } else {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
  }
  return result;
};

// Get all vouchers
router.get('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT 
        vm.username as voucher_code,
        vm.batch_id as kode_print,
        (SELECT value FROM radcheck WHERE username = vm.username AND attribute = 'Cleartext-Password' LIMIT 1) as password,
        rug.groupname as profile,
        vm.created_at,
        vm.outlet_name,
        COALESCE(vm.status, 'Aktif') as status,
        CASE WHEN EXISTS(SELECT 1 FROM radcheck rc2 WHERE rc2.username = vm.username AND rc2.attribute = 'Calling-Station-Id') THEN 1 ELSE 0 END as is_locked,
        CASE WHEN EXISTS(SELECT 1 FROM radreply rr WHERE rr.username = vm.username AND rr.value = 'MAC_LOCK_ENABLED') THEN 1 ELSE 0 END as mac_lock_enabled,
        COALESCE(pm.shared_users, 1) as shared_users,
        udp.device_mode,
        udp.max_shared_session
      FROM rincian_transaksi_voucher vm
      LEFT JOIN radusergroup rug ON vm.username = rug.username
      LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname
      LEFT JOIN users_device_policy udp ON vm.username = udp.username
      WHERE COALESCE(vm.status, 'Aktif') IN ('Aktif', 'Nonaktif')
      ORDER BY vm.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Get sold vouchers
router.get('/terjual', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT 
        vm.username as voucher_code, 
        (SELECT value FROM radcheck WHERE username = vm.username AND attribute = 'Cleartext-Password' LIMIT 1) as password, 
        COALESCE(rug.groupname, 'Unknown') as profile,
        vm.batch_id as print_code,
        vm.created_at,
        CASE
          WHEN pm.show_in_store = 1 THEN 'Online'
          ELSE COALESCE(NULLIF(TRIM(vm.outlet_name), ''), '-')
        END as outlet_name,
        vm.status,
        pm.hpp,
        pm.komisi,
        pm.harga,
        pm.masa_aktif as value,
        pm.satuan,
        COALESCE(pm.shared_users, 1) as shared_users,
        (SELECT value FROM radgroupreply WHERE groupname = rug.groupname AND attribute = 'Session-Timeout' LIMIT 1) as session_timeout,
        (SELECT value FROM radgroupreply WHERE groupname = rug.groupname AND attribute = 'Mikrotik-Rate-Limit' LIMIT 1) as rate_limit,
        (SELECT n.shortname FROM radacct ra JOIN nas n ON ra.nasipaddress = n.nasname WHERE ra.username = vm.username ORDER BY ra.acctstarttime DESC LIMIT 1) as router,
        COALESCE(
          (SELECT value FROM radcheck WHERE username = vm.username AND attribute = 'Calling-Station-Id' LIMIT 1),
          (SELECT callingstationid FROM radacct WHERE username = vm.username ORDER BY acctstarttime DESC LIMIT 1),
          vm.mac_address,
          '-'
        ) as mac_address,
        COALESCE(vm.activated_at, (SELECT acctstarttime FROM radacct WHERE username = vm.username ORDER BY acctstarttime DESC LIMIT 1)) as acctstarttime,
        vm.expiration_date,
        (SELECT SUM(acctsessiontime) FROM radacct WHERE username = vm.username) as used_time,
        (SELECT SUM(acctinputoctets + acctoutputoctets) FROM radacct WHERE username = vm.username) as total_quota,
        CASE WHEN EXISTS(SELECT 1 FROM radcheck rc2 WHERE rc2.username = vm.username AND rc2.attribute = 'Calling-Station-Id') THEN 1 ELSE 0 END as is_locked,
        CASE WHEN EXISTS(SELECT 1 FROM radreply rr WHERE rr.username = vm.username AND rr.value = 'MAC_LOCK_ENABLED') THEN 1 ELSE 0 END as mac_lock_enabled,
        udp.device_mode,
        udp.max_shared_session
      FROM rincian_transaksi_voucher vm
      LEFT JOIN radusergroup rug ON vm.username = rug.username
      LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname
      LEFT JOIN users_device_policy udp ON vm.username = udp.username
      WHERE vm.status IN ('Terjual', 'Expired')
      ORDER BY vm.sold_at DESC, vm.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Helper to ensure database triggers are up to date
async function applyTriggerUpdates(connection) {
  // Drop old versions
  await connection.query('DROP TRIGGER IF EXISTS after_radacct_insert');
  await connection.query('DROP TRIGGER IF EXISTS set_expiration_on_first_login');
  await connection.query('DROP TRIGGER IF EXISTS update_voucher_status_on_login');

  // Create unified trigger (No DELIMITER needed when sending as single statement)
  const triggerSql = `
    CREATE TRIGGER after_radacct_insert 
    AFTER INSERT ON radacct 
    FOR EACH ROW 
    BEGIN 
        DECLARE v_timeout INT;
        DECLARE v_group VARCHAR(64);
        
        -- Detect START record (acctstoptime is null and sessiontime is 0 or null)
        IF NEW.acctstarttime IS NOT NULL AND NEW.acctstoptime IS NULL AND (NEW.acctsessiontime IS NULL OR NEW.acctsessiontime = 0) THEN
            
            -- 1. HANDLE METADATA UPDATE (Only on first login)
            IF NOT EXISTS (SELECT 1 FROM rincian_transaksi_voucher WHERE username = NEW.username AND expiration_date IS NOT NULL) THEN
                -- Find the primary profile group
                SELECT groupname INTO v_group FROM radusergroup WHERE username = NEW.username AND groupname != 'MAC_LOCK_ENABLED' ORDER BY priority ASC LIMIT 1;
                
                -- Get timeout from profile metadata
                SELECT (pm.masa_aktif * 
                    CASE 
                        WHEN pm.satuan = 'Hari' THEN 86400 
                        WHEN pm.satuan = 'Jam' THEN 3600 
                        WHEN pm.satuan = 'Menit' THEN 60 
                        ELSE 1
                    END) INTO v_timeout
                FROM profiles_metadata pm
                WHERE pm.groupname = v_group
                LIMIT 1;

                IF v_timeout IS NOT NULL THEN
                    -- Update status and expiration in metadata
                    UPDATE rincian_transaksi_voucher 
                    SET status = 'Terjual', 
                        sold_at = NOW(),
                        expiration_date = DATE_ADD(NEW.acctstarttime, INTERVAL v_timeout SECOND)
                    WHERE username = NEW.username AND (status = 'Aktif' OR status IS NULL);
                END IF;
            END IF;

            -- 2. HANDLE MAC LOCKING
            -- If Mac-Lock flag exists in radreply, and Calling-Station-Id is NOT YET set in radcheck, lock it now
            IF EXISTS (SELECT 1 FROM radreply WHERE username = NEW.username AND value = 'MAC_LOCK_ENABLED') THEN
                IF NOT EXISTS (SELECT 1 FROM radcheck WHERE username = NEW.username AND attribute = 'Calling-Station-Id') THEN
                    INSERT INTO radcheck (username, attribute, op, value)
                    VALUES (NEW.username, 'Calling-Station-Id', '==', NEW.callingstationid);
                END IF;
            END IF;

        END IF;
    END
  `;
  await connection.query(triggerSql);
}

// Generate vouchers
router.post('/generate', async (req, res) => {
  const { qty, profile, length, prefix = '', charsetType = 'alpha_num', macLock = false, jenis = 'UP', outletName = '' } = req.body;
  
  if (!qty || !profile || !length) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const connection = await db.getConnection();
  try {
    // Ensure triggers are updated before generating
    await applyTriggerUpdates(connection);
    
    await connection.beginTransaction();

    const generatedVouchers = [];
    // Generate an 11-digit Print Code (Batch ID) for this generation session
    const batchId = Math.floor(10000000000 + Math.random() * 90000000000).toString().substring(0, 11);
    
    for (let i = 0; i < qty; i++) {
      let code = '';
      let attempts = 0;
      let exists = true;
      
      // Collision detection - retry up to 5 times if code already exists
      while (exists && attempts < 5) {
        code = (prefix + generateCode(length, charsetType)).trim();
        const [rows] = await connection.query('SELECT 1 FROM rincian_transaksi_voucher WHERE username = ?', [code]);
        if (rows.length === 0) {
          exists = false;
        }
        attempts++;
      }

      if (exists) {
        throw new Error(`Gagal menghasilkan kode unik setelah beberapa percobaan untuk voucher ke-${i+1}`);
      }
      
      // Since it's voucher code, we usually make password same as username for "UP"
      let password = code; 
      if (jenis === 'UP_DIFF') {
         password = generateCode(length, charsetType).trim();
      }
      
      // Insert into radcheck for Password
      await connection.query(
        'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, "Cleartext-Password", ":=", ?)',
        [code, password]
      );

      // If macLock is enabled, add to radreply as a flag (safe, doesn't break auth)
      if (macLock) {
        await connection.query(
          'INSERT INTO radreply (username, attribute, op, value) VALUES (?, "Reply-Message", "+=", "MAC_LOCK_ENABLED")',
          [code]
        );
      }
      
      // Insert into radusergroup to link with a profile
      await connection.query(
        'INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, ?)',
        [code, profile, 1]
      );
      
      // Insert into metadata for tracking Print Code and Date
      await connection.query(
        'INSERT INTO rincian_transaksi_voucher (username, batch_id, outlet_name) VALUES (?, ?, ?)',
        [code, batchId, outletName]
      );
      
      generatedVouchers.push({ voucher_code: code, password, profile, kode_print: batchId, outlet_name: outletName });
    }

    await connection.commit();
    
    await logActivity(req.body.admin_username, 'Generate Voucher', `Generate ${qty} voucher profile ${profile} (Batch: ${batchId})`, req);

    res.json({ message: `${qty} vouchers generated successfully. Kode Print: ${batchId}`, data: generatedVouchers });
  } catch (error) {
    await connection.rollback();
    console.error('Voucher Generation Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Delete a voucher
router.delete('/:username', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM radcheck WHERE username = ?', [req.params.username]);
    await connection.query('DELETE FROM radusergroup WHERE username = ?', [req.params.username]);
    await connection.query('DELETE FROM radreply WHERE username = ?', [req.params.username]);
    await connection.query('DELETE FROM rincian_transaksi_voucher WHERE username = ?', [req.params.username]);
    await connection.commit();

    await logActivity(req.query.admin_username, 'Delete Voucher', `Menghapus voucher: ${req.params.username}`, req);

    res.json({ message: 'Voucher deleted' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});


// Import Vouchers (CSV)
router.post('/import', async (req, res) => {
  const { profile, vouchers, admin_username } = req.body;
  
  if (!profile || !vouchers || !Array.isArray(vouchers)) {
    return res.status(400).json({ error: 'Profile and vouchers array are required' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let successCount = 0;
    
    // Process each voucher
    for (const v of vouchers) {
      if (!v.username || !v.password) continue;
      
      // Check if username already exists
      const [existing] = await connection.query('SELECT 1 FROM radcheck WHERE username = ?', [v.username]);
      if (existing.length > 0) {
        continue; // Skip existing
      }
      
      // radcheck
      await connection.query(
        'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, "Cleartext-Password", ":=", ?)',
        [v.username, v.password]
      );
      
      // radusergroup
      await connection.query(
        'INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, 1)',
        [v.username, profile]
      );
      
      successCount++;
    }

    await logActivity(admin_username || 'admin', 'Import Voucher', "Mengimport " + successCount + " voucher untuk profile " + profile + "", req);
    await connection.commit();
    res.json({ message: 'Import successful', successCount });
  } catch (error) {
    await connection.rollback();
    console.error('Error importing vouchers:', error);
    res.status(500).json({ error: 'Failed to import vouchers' });
  } finally {
    connection.release();
  }
});

// Bulk operations for vouchers
router.put('/bulk', async (req, res) => {
  const { action, usernames } = req.body;
  if (!action || !Array.isArray(usernames) || usernames.length === 0) {
    return res.status(400).json({ error: 'Action and an array of usernames are required' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const username of usernames) {
      if (action === 'delete') {
        await connection.query('DELETE FROM radcheck WHERE username = ?', [username]);
        await connection.query('DELETE FROM radusergroup WHERE username = ?', [username]);
        await connection.query('DELETE FROM radreply WHERE username = ?', [username]);
        await connection.query('DELETE FROM rincian_transaksi_voucher WHERE username = ?', [username]);
      } else if (action === 'lock_mac') {
        // Enable Locking mechanism using radreply flag
        await connection.query('INSERT IGNORE INTO radreply (username, attribute, op, value) VALUES (?, "Reply-Message", "+=", "MAC_LOCK_ENABLED")', [username]);
      } else if (action === 'unlock_mac') {
        // Remove current MAC binding (Reset Lock)
        await connection.query('DELETE FROM radcheck WHERE username = ? AND attribute = "Calling-Station-Id"', [username]);
      } else if (action === 'disable_mac_lock') {
        // Disable locking mechanism entirely
        await connection.query('DELETE FROM radreply WHERE username = ? AND value = "MAC_LOCK_ENABLED"', [username]);
        await connection.query('DELETE FROM radcheck WHERE username = ? AND attribute IN ("Simultaneous-Use", "Mac-Lock", "Calling-Station-Id")', [username]);
      } else if (action === 'set_aktif') {
        await connection.query('UPDATE rincian_transaksi_voucher SET status = "Aktif" WHERE username = ?', [username]);
      } else if (action === 'set_terjual') {
        await connection.query('UPDATE rincian_transaksi_voucher SET status = "Terjual", sold_at = NOW() WHERE username = ?', [username]);
      } else if (action === 'set_nonaktif') {
        await connection.query('UPDATE rincian_transaksi_voucher SET status = "Nonaktif" WHERE username = ?', [username]);
      } else if (action === 'change_router') {
        const { value } = req.body;
        await connection.query('UPDATE rincian_transaksi_voucher SET outlet_name = ? WHERE username = ?', [value, username]);
      } else if (action === 'reset_counter') {
        await connection.query('DELETE FROM radacct WHERE username = ?', [username]);
      } else if (action === 'refund') {
        try {
          // 1. Get existing profile before clearing
          const [groups] = await connection.query('SELECT groupname FROM radusergroup WHERE username = ? LIMIT 1', [username]);
          const profile = (groups && groups.length > 0) ? groups[0].groupname : null;
          
          // 2. Get existing password
          const [passwords] = await connection.query('SELECT value FROM radcheck WHERE username = ? AND attribute = "Cleartext-Password" LIMIT 1', [username]);
          const password = (passwords && passwords.length > 0) ? passwords[0].value : username;

        // 3. Get existing metadata (batch_id, outlet)
        const [metas] = await connection.query('SELECT batch_id, outlet_name FROM rincian_transaksi_voucher WHERE username = ? LIMIT 1', [username]);
        const batchId = (metas && metas.length > 0) ? metas[0].batch_id : 'REFUND';
        const outletName = (metas && metas.length > 0) ? metas[0].outlet_name : '';
          // Completely delete voucher from all tables
          await connection.query('DELETE FROM radcheck WHERE username = ?', [username]);
          await connection.query('DELETE FROM radusergroup WHERE username = ?', [username]);
          await connection.query('DELETE FROM radreply WHERE username = ?', [username]);
          await connection.query('DELETE FROM rincian_transaksi_voucher WHERE username = ?', [username]);
        } catch (innerError) {
          console.error(`Error refunding ${username}:`, innerError);
          // Continue to next voucher
        }
      }
    }

    await connection.commit();

    await logActivity(req.body.admin_username, `Bulk ${action}`, `Melakukan aksi ${action} pada ${usernames.length} voucher`, req);

    res.json({ message: `Bulk ${action} completed successfully on ${usernames.length} vouchers.` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});



// Delete all expired vouchers (with filters)
router.delete('/delete-expired', async (req, res) => {
  const { outlet, startDate, endDate } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let query = `
      SELECT DISTINCT vm.username
      FROM rincian_transaksi_voucher vm
      JOIN radusergroup rug ON vm.username = rug.username
      LEFT JOIN radgroupreply rgr ON rug.groupname = rgr.groupname AND rgr.attribute = 'Session-Timeout'
      LEFT JOIN radcheck rc ON vm.username = rc.username AND rc.attribute IN ('Expiration', 'Voucher-Expiration')
      LEFT JOIN radacct ra ON vm.username = ra.username
      WHERE vm.status = 'Terjual'
      AND (
        -- Check by Session-Timeout from Group (Time since first login)
        (rgr.value IS NOT NULL AND ra.acctstarttime IS NOT NULL AND DATE_ADD(ra.acctstarttime, INTERVAL CAST(rgr.value AS UNSIGNED) SECOND) < NOW())
        OR 
        -- Check by Expiration/Voucher-Expiration attribute in radcheck
        (rc.value IS NOT NULL AND (
          (rc.value LIKE '%-%' AND STR_TO_DATE(rc.value, '%Y-%m-%d %H:%i:%s') < NOW()) OR
          (rc.value LIKE '% %' AND STR_TO_DATE(rc.value, '%d %b %Y %H:%i:%s') < NOW())
        ))
      )
    `;
    const params = [];

    if (outlet && outlet !== 'Semua Outlet') {
      query += ` AND vm.outlet_name = ?`;
      params.push(outlet);
    }

    if (startDate && endDate) {
      query += ` AND DATE(ra.acctstarttime) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    const [expiredVouchers] = await connection.query(query, params);

    if (expiredVouchers.length === 0) {
      await connection.commit();
      return res.json({ message: 'Tidak ada voucher expired yang sesuai filter untuk dihapus.' });
    }

    const usernames = expiredVouchers.map(v => v.username);
    const placeholders = usernames.map(() => '?').join(',');

    await connection.query(`DELETE FROM radcheck WHERE username IN (${placeholders})`, usernames);
    await connection.query(`DELETE FROM radusergroup WHERE username IN (${placeholders})`, usernames);
    await connection.query(`DELETE FROM radreply WHERE username IN (${placeholders})`, usernames);
    await connection.query(`DELETE FROM rincian_transaksi_voucher WHERE username IN (${placeholders})`, usernames);

    await connection.commit();
    res.json({ message: `Berhasil menghapus ${usernames.length} voucher expired.` });
  } catch (error) {
    await connection.rollback();
    console.error('Delete Expired Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Get Master Data (Unified)
router.get('/master', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT 
        vm.username as voucher_code, 
        (SELECT value FROM radcheck WHERE username = vm.username AND attribute = 'Cleartext-Password' LIMIT 1) as password, 
        COALESCE(rug.groupname, 'Unknown') as profile,
        vm.batch_id as print_code,
        vm.created_at,
        vm.outlet_name,
        vm.status as voucher_status,
        vm.sold_at,
        vm.activated_at,
        vm.expiration_date,
        vm.mac_address as registered_mac,
        pm.mikrotik_group,
        (SELECT value FROM radgroupreply WHERE groupname = rug.groupname AND attribute = 'Mikrotik-Rate-Limit' LIMIT 1) as rate_limit,
        pm.masa_aktif,
        pm.satuan as masa_aktif_satuan,
        pm.shared_users,
        pm.hpp,
        pm.komisi,
        pm.harga,
        (SELECT value FROM radgroupreply WHERE groupname = rug.groupname AND attribute = 'Session-Timeout' LIMIT 1) as session_timeout,
        udp.device_mode,
        udp.max_shared_session,
        (SELECT n.shortname FROM radacct ra JOIN nas n ON ra.nasipaddress = n.nasname WHERE ra.username = vm.username ORDER BY ra.acctstarttime DESC LIMIT 1) as router,
        CASE WHEN EXISTS(SELECT 1 FROM radcheck rc2 WHERE rc2.username = vm.username AND rc2.attribute = 'Calling-Station-Id') THEN 'LOCKED' ELSE 'UNLOCKED' END as mac_status
      FROM rincian_transaksi_voucher vm
      LEFT JOIN radusergroup rug ON vm.username = rug.username
      LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname
      LEFT JOIN users_device_policy udp ON vm.username = udp.username
      ORDER BY vm.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Get UI Layout Config
router.get('/ui-config', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ui_field_config ORDER BY sort_order ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update UI Layout Config
router.put('/ui-config', async (req, res) => {
  try {
    const configs = req.body; // Array of {field_id, display_label, is_visible}
    for (const c of configs) {
      await db.query(
        'UPDATE ui_field_config SET display_label = ?, is_visible = ? WHERE field_id = ?',
        [c.display_label, c.is_visible ? 1 : 0, c.field_id]
      );
    }
    res.json({ message: 'UI Layout updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Page Sync Config
router.get('/ui-page-sync', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ui_page_sync');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Page Sync Config
router.put('/ui-page-sync', async (req, res) => {
  try {
    const configs = req.body; // Array of {page_id, is_synced}
    for (const c of configs) {
      await db.query(
        'UPDATE ui_page_sync SET is_synced = ?, table_position = ? WHERE page_id = ?',
        [c.is_synced ? 1 : 0, c.table_position || 'center', c.page_id]
      );
    }
    res.json({ message: 'Page sync updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Access Rules
router.get('/access-rules', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM role_menu_access');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Access Rules
router.put('/access-rules', async (req, res) => {
  try {
    const rules = req.body; // Array of {role, menu_id, is_allowed}
    for (const r of rules) {
      await db.query(
        'UPDATE role_menu_access SET is_allowed = ? WHERE role = ? AND menu_id = ?',
        [r.is_allowed ? 1 : 0, r.role, r.menu_id]
      );
    }
    res.json({ message: 'Access rules updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;



// --- QUICK GENERATE PRESETS ---

// GET /api/vouchers/presets
router.get('/presets', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM generate_presets ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// POST /api/vouchers/presets
router.post('/presets', async (req, res) => {
  const { preset_name, jenis, profile, prefix, charset_type, panjang_user, panjang_pass, qty, server } = req.body;
  if (!preset_name || !profile || !qty) {
    return res.status(400).json({ error: 'Preset Name, Profile, and Qty are required' });
  }
  
  try {
    await db.query(
      \INSERT INTO generate_presets 
      (preset_name, jenis, profile, prefix, charset_type, panjang_user, panjang_pass, qty, server) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\,
      [preset_name, jenis || 'UP', profile, prefix || '', charset_type || 'mix', panjang_user || 6, panjang_pass || 6, qty, server || 'all']
    );
    res.json({ message: 'Preset saved successfully' });
  } catch (error) {
    console.error('Error saving preset:', error);
    res.status(500).json({ error: 'Failed to save preset' });
  }
});

// DELETE /api/vouchers/presets/:id
router.delete('/presets/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM generate_presets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});
