const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fetch = require('node-fetch');
const { logActivity } = require('./logs');

// 1. Get online users from radacct
router.get('/', async (req, res) => {
  const { router_id, package_id, username, name } = req.query;

  let query = `
    SELECT 
      ra.radacctid, ra.username, ra.nasipaddress, ra.acctstarttime, ra.acctupdatetime,
      ra.framedipaddress, ra.callingstationid as mac_address,
      c.name as customer_name, c.status as customer_status,
      p.name as package_name, p.rate_limit,
      n.shortname as router_name
    FROM radacct ra
    JOIN pppoe_customers c ON ra.username = c.pppoe_username
    JOIN pppoe_packages p ON c.package_id = p.id
    JOIN nas n ON c.router_id = n.id
    WHERE ra.acctstoptime IS NULL
  `;

  const params = [];
  if (router_id) {
    query += ' AND c.router_id = ?';
    params.push(router_id);
  }
  if (package_id) {
    query += ' AND c.package_id = ?';
    params.push(package_id);
  }
  if (username) {
    query += ' AND ra.username LIKE ?';
    params.push(`%${username}%`);
  }
  if (name) {
    query += ' AND c.name LIKE ?';
    params.push(`%${name}%`);
  }

  query += ' ORDER BY ra.acctstarttime DESC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Disconnect user via MikroTik API
router.post('/:username/disconnect', async (req, res) => {
  const { username } = req.params;
  
  try {
    // Get router details for this user
    const [cust] = await db.query(`
      SELECT c.*, n.nasname, n.api_user, n.api_password, n.api_port 
      FROM pppoe_customers c
      JOIN nas n ON c.router_id = n.id
      WHERE c.pppoe_username = ?
    `, [username]);

    if (cust.length === 0) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });

    const router = cust[0];
    
    // Attempt to disconnect via MikroTik API (REST API - ROS 7+)
    // If you need ROS 6 (legacy API), you'd need a specialized library.
    // Given the constraints, we'll try the REST API first as it's easier to implement with fetch.
    
    const apiUrl = `https://${router.nasname}:${router.api_port || 443}/rest/ppp/active`;
    const auth = Buffer.from(`${router.api_user}:${router.api_password || ''}`).toString('base64');

    try {
      // 1. Find the active session ID
      const searchRes = await fetch(`${apiUrl}?.proplist=.id&name=${username}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (!searchRes.ok) {
        throw new Error(`MikroTik API Error: ${searchRes.statusText}`);
      }

      const sessions = await searchRes.json();
      
      if (sessions.length > 0) {
        const sessionId = sessions[0]['.id'];
        
        // 2. Remove the session
        const removeRes = await fetch(`${apiUrl}/${sessionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        });

        if (removeRes.ok) {
          await logActivity(req.body.admin_username, 'Disconnect PPPoE User', `Memutus koneksi user: ${username}`, req);
          return res.json({ message: 'User berhasil diputus koneksinya' });
        } else {
          throw new Error('Gagal memutus koneksi di MikroTik');
        }
      } else {
        return res.status(404).json({ error: 'User tidak ditemukan di sesi aktif MikroTik' });
      }

    } catch (apiErr) {
      console.error('MikroTik API Disconnect Failed:', apiErr);
      
      // Fallback: Try PoD (Packet of Disconnect) / CoA via radclient if available
      // This is often more reliable for RADIUS environments
      return res.status(500).json({ 
        error: 'Gagal menghubungi MikroTik API. Pastikan Router mendukung REST API (ROS 7.1+) dan port API terbuka.',
        details: apiErr.message 
      });
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get connection history from radacct
router.get('/history', async (req, res) => {
  const { username, start_date, end_date, limit = 10 } = req.query;

  let query = `
    SELECT 
      ra.radacctid, ra.username, ra.nasipaddress, ra.acctstarttime, ra.acctstoptime,
      ra.acctsessiontime, ra.acctinputoctets, ra.acctoutputoctets,
      ra.framedipaddress, ra.callingstationid as mac_address,
      c.name as customer_name, n.shortname as router_name
    FROM radacct ra
    LEFT JOIN pppoe_customers c ON ra.username = c.pppoe_username
    LEFT JOIN nas n ON ra.nasipaddress = n.nasname
    WHERE ra.acctstoptime IS NOT NULL
  `;

  const params = [];
  if (username) {
    query += ' AND ra.username LIKE ?';
    params.push(`%${username}%`);
  }
  if (start_date) {
    query += ' AND ra.acctstarttime >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND ra.acctstoptime <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY ra.acctstoptime DESC LIMIT ?';
  params.push(parseInt(limit));

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
