const db = require('./config/db');

async function update() {
  try {
    await db.query(`
      ALTER TABLE vpn_accounts 
      ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'Aktif' AFTER psk
    `);
    console.log('Column status added successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
