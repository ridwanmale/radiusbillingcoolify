const db = require('./config/db');

async function setup() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS vpn_accounts (
        id int(11) NOT NULL auto_increment PRIMARY KEY,
        username varchar(64) NOT NULL UNIQUE,
        password varchar(64) NOT NULL,
        psk varchar(64) NOT NULL DEFAULT 'radius_vpn_secret',
        created_at datetime DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    
    // Insert default user if not exists
    await db.query(`
      INSERT IGNORE INTO vpn_accounts (username, password, psk)
      VALUES ('vpn_billing', 'billing1234', 'radius_vpn_secret')
    `);

    console.log('Table vpn_accounts created/verified.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setup();
