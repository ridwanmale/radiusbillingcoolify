const db = require('./config/db');

async function update() {
  try {
    await db.query(`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS vpn_ip_pool varchar(64) DEFAULT '192.168.42.0/24',
      ADD COLUMN IF NOT EXISTS vpn_local_ip varchar(15) DEFAULT '192.168.42.1'
    `);
    console.log('VPN IP Settings added to database.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
