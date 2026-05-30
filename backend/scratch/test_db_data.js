const db = require('../config/db');

async function test() {
  try {
    const [nas] = await db.query('SELECT id, nasname, shortname, snmp_enabled, snmp_community, snmp_port FROM nas');
    console.log('=== NAS ROUTERS ===');
    console.log(nas);

    const [radacct] = await db.query(`
      SELECT radacctid, username, nasipaddress, framedipaddress, acctstarttime, acctstoptime 
      FROM radacct 
      WHERE acctstoptime IS NULL
      ORDER BY acctstarttime DESC 
      LIMIT 10
    `);
    console.log('\n=== ACTIVE RADACCT SESSIONS ===');
    console.log(radacct);

    const { getActiveHotspotUsers } = require('../utils/snmp');
    console.log('\n=== SNMP TEST ===');
    for (const r of nas) {
      if (r.snmp_enabled === 1) {
        console.log(`Querying SNMP for ${r.shortname} (${r.nasname})...`);
        try {
          const users = await getActiveHotspotUsers(r.nasname, r.snmp_community, r.snmp_port);
          console.log(`SNMP Users found:`, users);
        } catch (e) {
          console.error(`SNMP Query failed:`, e.message);
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
