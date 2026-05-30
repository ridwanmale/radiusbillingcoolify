const db = require('./config/db');

async function inspectVoucher(username) {
  try {
    console.log(`--- Inspecting Voucher: ${username} ---`);
    
    // 1. Check radcheck
    const [check] = await db.query('SELECT * FROM radcheck WHERE username = ?', [username]);
    console.log('RadCheck Attributes:', JSON.stringify(check, null, 2));
    
    // 2. Check radusergroup
    const [groups] = await db.query('SELECT * FROM radusergroup WHERE username = ?', [username]);
    console.log('User Groups:', JSON.stringify(groups, null, 2));
    
    // 3. Check radacct (Active sessions)
    const [sessions] = await db.query('SELECT * FROM radacct WHERE username = ? AND acctstoptime IS NULL', [username]);
    console.log('Active Sessions:', JSON.stringify(sessions, null, 2));

    // 4. Check Metadata
    const [meta] = await db.query('SELECT * FROM rincian_transaksi_voucher WHERE username = ?', [username]);
    console.log('Metadata:', JSON.stringify(meta, null, 2));

    // 5. Check if it has MAC lock
    const [macCheck] = await db.query('SELECT * FROM radcheck WHERE username = ? AND attribute = "Calling-Station-Id"', [username]);
    console.log('MAC Lock Entry:', JSON.stringify(macCheck, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectVoucher('1vx');
