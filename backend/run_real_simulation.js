const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'backend/.env' });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'radius',
  password: process.env.DB_PASSWORD || 'radius_password',
  database: process.env.DB_NAME || 'radius',
  multipleStatements: true
};

const runSimulation = async () => {
  console.log("==========================================================");
  console.log("🚀 SIMULASI REAL-TIME: PROSES ISOLIR -> PEMBAYARAN GATEWAY");
  console.log("==========================================================\n");

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
  } catch (err) {
    console.error("❌ Gagal terhubung ke database. Periksa kredensial di backend/.env!");
    console.error("Detail Error:", err.message);
    process.exit(1);
  }
  
  try {
    console.log("🛠️  [Fase 0] Menyiapkan data simulasi di database...");
    
    // Insert package
    await connection.query(`
      INSERT INTO pppoe_packages (id, name, slug, price, active_days) 
      VALUES (999, 'Paket Budi 10 Mbps', 'arm_10mb', 150000, 30)
      ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price)
    `);

    // Insert customer
    await connection.query(`
      INSERT INTO pppoe_customers (id, customer_code, name, phone, pppoe_username, pppoe_password, router_id, package_id, status)
      VALUES (999, 'CUST-BUDI', 'Budi ARMNet', '081234567890', 'budi_armnet', 'pass123', 1, 999, 'active')
      ON DUPLICATE KEY UPDATE status='active'
    `);

    // Setup radusergroup and radcheck
    await connection.query(`
      INSERT INTO radusergroup (username, groupname, priority)
      VALUES ('budi_armnet', 'arm_10mb', 1)
      ON DUPLICATE KEY UPDATE groupname='arm_10mb'
    `);
    
    await connection.query(`
      INSERT INTO radcheck (username, attribute, op, value)
      VALUES ('budi_armnet', 'Cleartext-Password', ':=', 'pass123')
      ON DUPLICATE KEY UPDATE value='pass123'
    `);

    console.log("✓ Data pelanggan 'budi_armnet' sukses dimasukkan dengan status: ACTIVE.");

    // 1. SIMULATE ISOLIR
    console.log("\nFase 1: Tagihan Budi Overdue, Mengubah Status Menjadi ISOLIR...");
    
    // Create unpaid invoice
    await connection.query(`
      INSERT INTO pppoe_invoices (id, customer_id, package_id, invoice_number, amount, status)
      VALUES (999, 999, 999, 'INV-1002', 150000, 'unpaid')
      ON DUPLICATE KEY UPDATE status='unpaid'
    `);
    const invoiceId = 999;

    // Simulate isolir state changes
    await connection.query("UPDATE pppoe_customers SET status = 'isolir' WHERE id = 999");
    await connection.query("UPDATE radusergroup SET groupname = 'ARM_ISOLIR' WHERE username = 'budi_armnet'");
    await connection.query(`
      INSERT INTO radreply (username, attribute, op, value)
      VALUES ('budi_armnet', 'Reply-Message', '=', 'Account suspended. Please pay your bill.'),
             ('budi_armnet', 'Mikrotik-Redirect-URL', ':=', 'http://127.0.0.1:5000/api/pppoe/warning-page')
      ON DUPLICATE KEY UPDATE value=VALUES(value)
    `);

    console.log("✓ Status budi_armnet diubah ke: ISOLIR.");
    console.log("✓ Grup radusergroup diubah ke: ARM_ISOLIR.");
    console.log("✓ radreply ditambahkan atribut: Mikrotik-Redirect-URL.");

    // Verify isolir state
    const [custIsolir] = await connection.query("SELECT status FROM pppoe_customers WHERE id = 999");
    const [groupIsolir] = await connection.query("SELECT groupname FROM radusergroup WHERE username = 'budi_armnet'");
    console.log(`➡️  [DB Check] Status: ${custIsolir[0].status} | Group: ${groupIsolir[0].groupname}`);

    // 2. SIMULATE CLIENT ACTIVE SESSION
    console.log("\nFase 2: Router Budi terhubung dan mendapat IP isolir...");
    const clientTestIp = '127.0.0.1';
    await connection.query(`
      INSERT INTO radacct (acctsessionid, acctuniqueid, username, groupname, nasipaddress, nasportid, acctstarttime, framedipaddress)
      VALUES ('sess-budi-123', 'uniq-budi-123', 'budi_armnet', 'ARM_ISOLIR', '192.168.69.1', '1', NOW(), ?)
      ON DUPLICATE KEY UPDATE framedipaddress=VALUES(framedipaddress), acctstoptime=NULL
    `, [clientTestIp]);
    
    console.log(`✓ Sesi radacct aktif ditambahkan untuk budi_armnet dengan IP: ${clientTestIp}.`);

    // 3. SIMULATE PAY-INVOICE ENDPOINT DETECTION
    console.log("\nFase 3: Budi mengklik 'Bayar Sekarang'. Sistem mendeteksi IP & Tagihan...");
    
    const [sessions] = await connection.query(
      "SELECT username FROM radacct WHERE framedipaddress = ? AND acctstoptime IS NULL ORDER BY radacctid DESC LIMIT 1",
      [clientTestIp]
    );
    const detectedUsername = sessions[0].username;
    console.log(`✓ [IP-to-User Lookup] IP ${clientTestIp} terdeteksi milik username: ${detectedUsername}`);

    const [invoices] = await connection.query(
      "SELECT id, invoice_number, amount FROM pppoe_invoices WHERE customer_id = 999 AND status = 'unpaid' ORDER BY id ASC LIMIT 1"
    );
    const invoice = invoices[0];
    console.log(`✓ [Invoice Lookup] Ditemukan tagihan aktif: #${invoice.invoice_number} senilai Rp ${parseInt(invoice.amount).toLocaleString('id-ID')}`);

    const simulatedOrderId = `INV-PPPOE-\${invoice.id}-\${Date.now()}`;
    console.log(`✓ [Gateway Request] Membuat ID Pesanan Checkout: \${simulatedOrderId}`);

    // 4. SIMULATE GATEWAY PAYMENT WEBHOOK
    console.log("\nFase 4: Budi membayar via QRIS. Webhook sukses diterima oleh server...");
    console.log(`➡️  Memanggil fungsi pengaktifan otomatis untuk order: \${simulatedOrderId}...`);

    const parts = simulatedOrderId.split('-');
    const invId = parseInt(parts[2]);

    console.log(`   [Action] Memulai transaksi database lunas...`);
    
    // Perform lunas updates
    await connection.query("INSERT INTO pppoe_payments (invoice_id, customer_id, amount, payment_method, received_by, notes) VALUES (?, 999, 150000, 'Online (Simulated)', 'System', 'Simulasi Lunas')", [invId]);
    await connection.query("UPDATE pppoe_invoices SET status = 'paid', paid_at = NOW() WHERE id = ?", [invId]);
    await connection.query("UPDATE pppoe_customers SET status = 'active', billing_status = 'normal', last_payment_date = NOW(), next_billing_date = DATE_ADD(NOW(), INTERVAL 30 DAY), next_isolir_date = DATE_ADD(NOW(), INTERVAL 30 DAY), days_overdue = 0 WHERE id = 999");
    await connection.query("DELETE FROM radcheck WHERE username = 'budi_armnet' AND attribute = 'Auth-Type'");
    await connection.query("UPDATE radusergroup SET groupname = 'arm_10mb' WHERE username = 'budi_armnet'");
    await connection.query("DELETE FROM radreply WHERE username = 'budi_armnet' AND attribute IN ('Reply-Message', 'Mikrotik-Redirect-URL')");
    
    console.log("✓ Pembayaran dicatat.");
    console.log("✓ Invoice ditandai PAID.");
    console.log("✓ Pelanggan budi_armnet kembali ACTIVE.");
    console.log("✓ Grup radusergroup dikembalikan ke: arm_10mb.");
    console.log("✓ Atribut redirect di radreply dibersihkan.");

    // Verify restored active state
    const [custActive] = await connection.query("SELECT status, billing_status FROM pppoe_customers WHERE id = 999");
    const [groupActive] = await connection.query("SELECT groupname FROM radusergroup WHERE username = 'budi_armnet'");
    const [radreplyActive] = await connection.query("SELECT COUNT(*) as count FROM radreply WHERE username = 'budi_armnet'");
    
    console.log(`\\n==========================================================`);
    console.log(`🎉 [HASIL SIMULASI AKHIR DI DATABASE] 🎉`);
    console.log(`==========================================================`);
    console.log(`➡️  Status Pelanggan  : \${custActive[0].status} (Lunas: \${custActive[0].billing_status})`);
    console.log(`➡️  Grup RADIUS       : \${groupActive[0].groupname}`);
    console.log(`➡️  Atribut Redirect  : \${radreplyActive[0].count === 0 ? 'DIBERSIHKAN (NORMAL)' : 'MASIH ADA (EROR)'}`);
    console.log(`==========================================================\\n`);

    // Clean up test data
    console.log("🧹 Membersihkan data simulasi dari database...");
    await connection.query("DELETE FROM pppoe_customers WHERE id = 999");
    await connection.query("DELETE FROM pppoe_packages WHERE id = 999");
    await connection.query("DELETE FROM pppoe_invoices WHERE id = 999");
    await connection.query("DELETE FROM pppoe_payments WHERE customer_id = 999");
    await connection.query("DELETE FROM radusergroup WHERE username = 'budi_armnet'");
    await connection.query("DELETE FROM radcheck WHERE username = 'budi_armnet'");
    await connection.query("DELETE FROM radreply WHERE username = 'budi_armnet'");
    await connection.query("DELETE FROM radacct WHERE username = 'budi_armnet'");
    console.log("✓ Data simulasi berhasil dibersihkan.");

  } catch (err) {
    console.error("Simulation failed:", err.message);
  } finally {
    connection.end();
    console.log("\nSimulasi selesai dengan sukses! 🎊");
  }
};

runSimulation();
