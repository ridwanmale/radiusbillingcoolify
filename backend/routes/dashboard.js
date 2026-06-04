const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/stats', async (req, res) => {
  try {
    const filterMonth = Number(req.query.month) || (new Date().getMonth() + 1);
    const filterYear = Number(req.query.year) || new Date().getFullYear();

    // 1. Stock Voucher Count (vouchers not sold)
    const [[{ stock_count }]] = await db.query("SELECT COUNT(*) as stock_count FROM rincian_transaksi_voucher WHERE status != 'Terjual' OR status IS NULL");
    
    // 2. Voucher Terjual Hari Ini
    const [[{ total_sold }]] = await db.query("SELECT COUNT(*) as total_sold FROM rincian_transaksi_voucher WHERE status = 'Terjual' AND DATE(sold_at) = CURDATE()");

    // 3. Voucher Online (sessions with no stop time and updated recently)
    const [[{ voucher_online }]] = await db.query("SELECT COUNT(*) as voucher_online FROM radacct WHERE acctstoptime IS NULL AND COALESCE(acctupdatetime, acctstarttime) > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");

    // 4. Total Profiles
    const [[{ total_profiles }]] = await db.query('SELECT COUNT(*) as total_profiles FROM profiles_metadata');

    // 5. Pendapatan Hari Ini (Total HPP of vouchers sold/started TODAY)
    const [[{ daily_income }]] = await db.query(`
      SELECT COALESCE(SUM(pm.hpp), 0) as daily_income 
      FROM rincian_transaksi_voucher vm
      JOIN radusergroup rug ON vm.username = rug.username
      JOIN profiles_metadata pm ON rug.groupname = pm.groupname
      WHERE vm.status IN ('Terjual', 'Expired') 
      AND DATE(vm.sold_at) = CURDATE()
      AND vm.batch_id != 'ONLINE-STORE'
    `);

    // 5b. Pendapatan Voucher Online Hari Ini (Total Harga Jual)
    const [[{ online_income }]] = await db.query(`
      SELECT COALESCE(SUM(total), 0) as online_income
      FROM jurnal_keuangan
      WHERE (status = 'PAID' OR status IS NULL OR status = '' OR status = 'SUCCESS')
      AND UPPER(jenis) = 'VOUCHER ONLINE'
      AND DATE(COALESCE(paid_at, tanggal)) = CURDATE()
    `);

    // 6. Chart Data (Combined Physical HPP + Online Harga Jual)
    const [raw_chart_data] = await db.query(`
      SELECT day_num, SUM(income) as income 
      FROM (
        -- Voucher Fisik (HPP)
        SELECT DAY(vm.sold_at) as day_num, SUM(pm.hpp) as income
        FROM rincian_transaksi_voucher vm
        JOIN radusergroup rug ON vm.username = rug.username
        JOIN profiles_metadata pm ON rug.groupname = pm.groupname
        WHERE vm.status IN ('Terjual', 'Expired') 
        AND vm.batch_id != 'ONLINE-STORE'
        AND MONTH(vm.sold_at) = ? AND YEAR(vm.sold_at) = ?
        GROUP BY DAY(vm.sold_at)

        UNION ALL

        -- Voucher Online (Harga Jual)
        SELECT DAY(paid_at) as day_num, SUM(total) as income
        FROM jurnal_keuangan
        WHERE status = 'PAID'
        AND MONTH(paid_at) = ? AND YEAR(paid_at) = ?
        GROUP BY DAY(paid_at)
      ) combined
      GROUP BY day_num
      ORDER BY day_num ASC
    `, [filterMonth, filterYear, filterMonth, filterYear]);

    // Fill all days of the selected month
    const daysInMonth = new Date(filterYear, filterMonth, 0).getDate();
    const chart_data = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const found = raw_chart_data.find(d => d.day_num === day);
      return {
        date: day < 10 ? `0${day}` : `${day}`,
        sessions: found ? Number(found.income) : 0
      };
    });

    res.json({
      stock_count: Number(stock_count) || 0,
      total_sold: Number(total_sold) || 0,
      voucher_online: Number(voucher_online) || 0,
      total_profiles: Number(total_profiles) || 0,
      daily_income: Number(daily_income) || 0,
      online_income: Number(online_income) || 0,
      chart_data: Array.isArray(chart_data) ? chart_data : []
    });

    // Run background sync (non-blocking) to fix missing status or sold_at
    db.query(`
      UPDATE rincian_transaksi_voucher vm
      JOIN (
        SELECT username, MIN(acctstarttime) as first_login 
        FROM radacct 
        GROUP BY username
      ) ra ON vm.username = ra.username
      SET vm.status = 'Terjual', 
          vm.sold_at = COALESCE(vm.sold_at, ra.first_login)
      WHERE (vm.status != 'Terjual' OR vm.sold_at IS NULL)
    `).catch(e => console.error('Sync Error:', e));

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recent connections
router.get('/recent', async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT radacctid, username, nasipaddress, framedipaddress, acctstarttime, acctstoptime, acctsessiontime, acctinputoctets, acctoutputoctets
        FROM radacct
        ORDER BY acctstarttime DESC
        LIMIT 10
      `);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

// Get online sessions
router.get('/online', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        ra.username, 
        ra.framedipaddress, 
        ra.callingstationid as mac_address,
        ra.acctstarttime,
        ra.nasipaddress,
        n.shortname as router,
        rug.groupname as profile,
        pm.hpp,
        pm.komisi,
        pm.harga,
        pm.masa_aktif,
        pm.satuan,
        ra.acctsessiontime as duration,
        (ra.acctinputoctets + ra.acctoutputoctets) as quota,
        ra.acctinputoctets as upload,
        ra.acctoutputoctets as download,
        vm.outlet_name,
        vm.expiration_date,
        ra.acctupdatetime
      FROM radacct ra
      LEFT JOIN nas n ON ra.nasipaddress = n.nasname OR (n.connection_mode = 'vpn' AND n.nasname LIKE '%/24' AND ra.nasipaddress LIKE CONCAT(SUBSTRING_INDEX(n.nasname, '0/24', 1), '%'))
      LEFT JOIN radusergroup rug ON ra.username = rug.username
      LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname
      LEFT JOIN rincian_transaksi_voucher vm ON ra.username = vm.username
      WHERE ra.acctstoptime IS NULL AND COALESCE(ra.acctupdatetime, ra.acctstarttime) > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
      ORDER BY ra.acctstarttime DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kick User (Disconnect Request)
router.post('/kick', async (req, res) => {
  const { usernames } = req.body;
  if (!usernames || !Array.isArray(usernames)) return res.status(400).json({ error: 'Invalid usernames' });

  const results = [];
  const { exec } = require('child_process');

  try {
    for (const user of usernames) {
      const [nasInfo] = await db.query(`
        SELECT ra.nasipaddress, n.secret, ra.acctsessionid, ra.framedipaddress
        FROM radacct ra 
        JOIN nas n ON ra.nasipaddress = n.nasname 
        WHERE ra.username = ? AND ra.acctstoptime IS NULL 
        ORDER BY ra.acctstarttime DESC
        LIMIT 1
      `, [user]);

      if (nasInfo && nasInfo.length > 0) {
        const { nasipaddress, secret, acctsessionid, framedipaddress } = nasInfo[0];
        
        let attributes = `User-Name=${user}`;
        if (acctsessionid) attributes += `,Acct-Session-Id=${acctsessionid}`;
        if (framedipaddress) attributes += `,Framed-IP-Address=${framedipaddress}`;

        const dbHost = process.env.DB_HOST || '127.0.0.1';
        const isRemote = dbHost !== '127.0.0.1' && dbHost !== 'localhost';

        if (isRemote) {
          // Send request to Core Server's webhook to execute kick locally on the Core Server
          const http = require('http');
          const postData = JSON.stringify({ nasipaddress, secret, attributes });
          
          await new Promise((resolve) => {
            const req = http.request({
              hostname: dbHost,
              port: 8080,
              path: '/kick',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
              },
              timeout: 5000
            }, (res) => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                results.push({ username: user, status: 'Sent via Remote Proxy' });
              } else {
                results.push({ username: user, status: 'Failed', error: `Core Server webhook returned status ${res.statusCode}` });
              }
              resolve();
            });

            req.on('error', (e) => {
              console.error(`Kick Error Remote ${user}:`, e.message);
              results.push({ username: user, status: 'Failed', error: 'Remote webhook error: ' + e.message });
              resolve();
            });

            req.on('timeout', () => {
              req.destroy();
              console.error(`Kick Error Remote ${user}: Timeout`);
              results.push({ username: user, status: 'Failed', error: 'Remote webhook timeout' });
              resolve();
            });

            req.write(postData);
            req.end();
          });
        } else {
          // Local execution (for Single VPS setup)
          const cmd = `echo "${attributes}" | radclient -x ${nasipaddress}:3799 disconnect ${secret}`;
          await new Promise((resolve) => {
            exec(cmd, (error, stdout, stderr) => {
              if (error) {
                console.error(`Kick Error ${user}:`, stderr || error.message);
                results.push({ username: user, status: 'Failed', error: stderr || error.message });
              } else {
                results.push({ username: user, status: 'Sent' });
              }
              resolve();
            });
          });
        }
      } else {
        results.push({ username: user, status: 'Not Online' });
      }
    }
    res.json({ message: 'Proses Kick selesai', results });
  } catch (error) {
    console.error('Kick Route Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sinkron & Bersihkan Sesi Stale (Pembersihan Cerdas Tanpa Kick Massal)
router.post('/sync', async (req, res) => {
  try {
    // Tutup sesi yang tidak melapor (update) selama lebih dari 5 menit
    const [result] = await db.query(`
      UPDATE radacct 
      SET acctstoptime = NOW(), acctterminatecause = 'Stale-Session-Cleanup'
      WHERE acctstoptime IS NULL 
      AND COALESCE(acctupdatetime, acctstarttime) < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `);

    res.json({ 
      message: 'Sinkronisasi berhasil', 
      cleaned: result.affectedRows 
    });
  } catch (error) {
    console.error('Sync Route Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hapus Session (Clean stuck radacct)
router.post('/delete-session', async (req, res) => {
  const { usernames } = req.body;
  if (!usernames || !Array.isArray(usernames)) return res.status(400).json({ error: 'Invalid usernames' });

  try {
    await db.query('UPDATE radacct SET acctstoptime = NOW() WHERE username IN (?) AND acctstoptime IS NULL', [usernames]);
    res.json({ message: 'Sesi berhasil dibersihkan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
