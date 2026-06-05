const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'radius_billing'
  });
  
  const cols = [
    ['pppoe_enable_payment_bridge', 'TINYINT(1) DEFAULT 1'],
    ['pppoe_enable_midtrans', 'TINYINT(1) DEFAULT 0'],
    ['pppoe_enable_duitku', 'TINYINT(1) DEFAULT 0'],
    ['pppoe_enable_tripay', 'TINYINT(1) DEFAULT 0']
  ];
  
  for (const [colName, colType] of cols) {
    try {
      await connection.query(`ALTER TABLE portal_settings ADD COLUMN ${colName} ${colType}`);
      console.log('Added ' + colName);
    } catch (err) {
      console.log('Col ' + colName + ' exists or error: ' + err.message);
    }
  }
  await connection.end();
}
run();
