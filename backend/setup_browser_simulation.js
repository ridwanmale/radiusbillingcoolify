const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'backend/.env' });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'radius',
  password: process.env.DB_PASSWORD || 'radius_password',
  database: process.env.DB_NAME || 'radius',
  multipleStatements: true
};

const isClean = process.argv.includes('clean');

const run = async () => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (isClean) {
      console.log("🧹 Membersihkan data simulasi browser...");
      await connection.query("DELETE FROM pppoe_customers WHERE id = 999");
      await connection.query("DELETE FROM pppoe_packages WHERE id = 999");
      await connection.query("DELETE FROM pppoe_invoices WHERE id = 999");
      await connection.query("DELETE FROM pppoe_payments WHERE customer_id = 999");
      await connection.query("DELETE FROM radusergroup WHERE username = 'budi_armnet'");
      await connection.query("DELETE FROM radcheck WHERE username = 'budi_armnet'");
      await connection.query("DELETE FROM radreply WHERE username = 'budi_armnet'");
      await connection.query("DELETE FROM radacct WHERE username = 'budi_armnet'");
      console.log("✓ Data simulasi berhasil dibersihkan!");
      return;
    }

    console.log("🛠️  Menyiapkan Data Simulasi Browser untuk 'budi_armnet'...");

    // Insert package
    await connection.query(`
      INSERT INTO pppoe_packages (id, name, slug, price, active_days) 
      VALUES (999, 'Paket Budi 10 Mbps', 'arm_10mb', 150000, 30)
      ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price)
    `);

    // Insert customer
    await connection.query(`
      INSERT INTO pppoe_customers (id, customer_code, name, phone, pppoe_username, pppoe_password, router_id, package_id, status)
      VALUES (999, 'CUST-BUDI', 'Budi ARMNet', '081234567890', 'budi_armnet', 'pass123', 1, 999, 'isolir')
      ON DUPLICATE KEY UPDATE status='isolir'
    `);

    // Setup radusergroup and radcheck
    await connection.query(`
      INSERT INTO radusergroup (username, groupname, priority)
      VALUES ('budi_armnet', 'ARM_ISOLIR', 1)
      ON DUPLICATE KEY UPDATE groupname='ARM_ISOLIR'
    `);

    await connection.query(`
      INSERT INTO radcheck (username, attribute, op, value)
      VALUES ('budi_armnet', 'Cleartext-Password', ':=', 'pass123')
      ON DUPLICATE KEY UPDATE value='pass123'
    `);

    // Create unpaid invoice
    await connection.query(`
      INSERT INTO pppoe_invoices (id, customer_id, package_id, invoice_number, amount, status)
      VALUES (999, 999, 999, 'INV-1002', 150000, 'unpaid')
      ON DUPLICATE KEY UPDATE status='unpaid'
    `);

    // Insert simulated active sessions for multiple potential host/browser IPs to ensure match
    const ips = ['127.0.0.1', '172.21.0.1', '172.18.0.1', '172.19.0.1', '172.20.0.1'];
    for (let i = 0; i < ips.length; i++) {
      await connection.query(`
        INSERT INTO radacct (acctsessionid, acctuniqueid, username, groupname, nasipaddress, nasportid, acctstarttime, framedipaddress)
        VALUES (?, ?, 'budi_armnet', 'ARM_ISOLIR', '192.168.69.1', ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE framedipaddress=VALUES(framedipaddress), acctstoptime=NULL
      `, [`sess-budi-${i}`, `uniq-budi-${i}`, String(i), ips[i]]);
    }

    console.log("\n==========================================================");
    console.log("🎉 DATA SIMULASI BROWSER BERHASIL DISIAPKAN!");
    console.log("==========================================================");
    console.log("Silakan ikuti langkah berikut untuk mencoba di browser:");
    console.log("1. Buka browser Anda dan akses link berikut:");
    console.log("   👉 http://localhost:5000/api/pppoe/warning-page");
    console.log("2. Anda akan melihat halaman peringatan isolir Budi!");
    console.log("3. Klik tombol 'Bayar Sekarang' dan Anda akan dialihkan ke Payment Gateway.");
    console.log("4. Setelah selesai simulasi, jalankan perintah ini untuk membersihkan data:");
    console.log("   👉 docker exec -it radius-backend node setup_browser_simulation.js clean");
    console.log("==========================================================\n");

  } catch (err) {
    console.error("Setup failed:", err.message);
  } finally {
    connection.end();
  }
};

run();
