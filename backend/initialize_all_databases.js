const db = require('./config/db');

async function initializeAllDatabases() {
  console.log('========================================================');
  console.log('   STARTING COMPLETE DATABASE INITIALIZATION (RADIUS)   ');
  console.log('========================================================\n');

  try {
    // 1. SETTINGS TABLE
    console.log('[1/9] Initializing system settings...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        hotspot_name VARCHAR(128) DEFAULT 'Wi-Fi Hotspot',
        dns_name VARCHAR(128) DEFAULT 'hotspot.local',
        logo_base64 MEDIUMTEXT,
        app_logo_base64 MEDIUMTEXT,
        cs_phone VARCHAR(32) DEFAULT '',
        sidebar_color VARCHAR(16) DEFAULT '#ffffff',
        vpn_ip_pool VARCHAR(64) DEFAULT '192.168.42.0/24',
        vpn_local_ip VARCHAR(15) DEFAULT '192.168.42.1',
        payment_gateway_config JSON DEFAULT NULL
      ) ENGINE=InnoDB;
    `);

    // Ensure settings table has default columns
    const [settingsCols] = await db.query('SHOW COLUMNS FROM settings');
    const settingsColNames = settingsCols.map(c => c.Field);
    if (!settingsColNames.includes('app_logo_base64')) {
      await db.query("ALTER TABLE settings ADD COLUMN app_logo_base64 MEDIUMTEXT");
    }
    if (!settingsColNames.includes('sidebar_color')) {
      await db.query("ALTER TABLE settings ADD COLUMN sidebar_color VARCHAR(16) DEFAULT '#ffffff'");
    }
    if (!settingsColNames.includes('vpn_ip_pool')) {
      await db.query("ALTER TABLE settings ADD COLUMN vpn_ip_pool VARCHAR(64) DEFAULT '192.168.42.0/24'");
    }
    if (!settingsColNames.includes('vpn_local_ip')) {
      await db.query("ALTER TABLE settings ADD COLUMN vpn_local_ip VARCHAR(15) DEFAULT '192.168.42.1'");
    }

    // Insert default settings row if missing
    await db.query(`
      INSERT INTO settings (id, hotspot_name, dns_name)
      VALUES (1, 'Wi-Fi Hotspot', 'hotspot.local')
      ON DUPLICATE KEY UPDATE id=id
    `);
    console.log('✔ System settings initialized.\n');

    // 1b. PROFILES METADATA TABLE COLUMNS
    console.log('[1b/9] Verifying profiles_metadata columns...');
    const [profCols] = await db.query('SHOW COLUMNS FROM profiles_metadata');
    const profColNames = profCols.map(c => c.Field);
    if (!profColNames.includes('hpp')) {
      await db.query('ALTER TABLE profiles_metadata ADD COLUMN hpp DECIMAL(10,2) DEFAULT 0 AFTER harga');
      console.log('- Column hpp added successfully.');
    }
    if (!profColNames.includes('shared_users')) {
      await db.query('ALTER TABLE profiles_metadata ADD COLUMN shared_users INT DEFAULT 1 AFTER komisi');
      console.log('- Column shared_users added successfully.');
    }
    if (!profColNames.includes('show_in_store')) {
      await db.query('ALTER TABLE profiles_metadata ADD COLUMN show_in_store TINYINT(1) DEFAULT 1 AFTER shared_users');
      console.log('- Column show_in_store added successfully.');
    }
    if (!profColNames.includes('prefix')) {
      await db.query('ALTER TABLE profiles_metadata ADD COLUMN prefix VARCHAR(32) DEFAULT NULL AFTER show_in_store');
      console.log('- Column prefix added successfully.');
    }
    if (!profColNames.includes('code_combination')) {
      await db.query('ALTER TABLE profiles_metadata ADD COLUMN code_combination VARCHAR(32) DEFAULT NULL AFTER prefix');
      console.log('- Column code_combination added successfully.');
    }
    if (!profColNames.includes('code_length')) {
      await db.query('ALTER TABLE profiles_metadata ADD COLUMN code_length INT DEFAULT NULL AFTER code_combination');
      console.log('- Column code_length added successfully.');
    }
    console.log('✔ Profiles metadata verified.\n');

    // 2. PORTAL SETTINGS TABLE (RE-CREATE CLEANLY)
    console.log('[2/9] Initializing portal settings...');
    await db.query('DROP TABLE IF EXISTS portal_settings');
    await db.query(`
      CREATE TABLE portal_settings (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        portal_title VARCHAR(128) DEFAULT 'Wi-Fi Voucher Store',
        portal_description VARCHAR(255) DEFAULT 'Beli voucher internet instan 24 jam',
        primary_color VARCHAR(20) DEFAULT '#6366f1',
        qris_static_string TEXT,
        notification_token VARCHAR(64),
        is_active BOOLEAN DEFAULT TRUE,
        duitku_merchant_code VARCHAR(128) DEFAULT '',
        duitku_api_key VARCHAR(255) DEFAULT '',
        duitku_is_sandbox BOOLEAN DEFAULT TRUE,
        tripay_api_key VARCHAR(255) DEFAULT '',
        tripay_private_key VARCHAR(255) DEFAULT '',
        tripay_merchant_code VARCHAR(128) DEFAULT '',
        tripay_is_sandbox BOOLEAN DEFAULT TRUE,
        enable_payment_bridge BOOLEAN DEFAULT FALSE,
        enable_midtrans BOOLEAN DEFAULT FALSE,
        enable_duitku BOOLEAN DEFAULT FALSE,
        enable_tripay BOOLEAN DEFAULT FALSE,
        hotspot_login_url VARCHAR(128) DEFAULT 'hotspot.local'
      ) ENGINE=InnoDB;
    `);

    // Insert default portal settings
    await db.query(`
      INSERT INTO portal_settings (id, portal_title, portal_description, primary_color)
      VALUES (1, 'Wi-Fi Voucher Store', 'Beli voucher internet instan 24 jam', '#6366f1')
    `);
    console.log('✔ Portal settings successfully initialized.\n');

    // 3. VPN ACCOUNTS TABLE
    console.log('[3/9] Initializing L2TP/IPsec VPN accounts...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS vpn_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password VARCHAR(64) NOT NULL,
        psk VARCHAR(64) NOT NULL DEFAULT 'radius_vpn_secret',
        status VARCHAR(20) DEFAULT 'Aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Ensure status column exists in vpn_accounts
    const [vpnCols] = await db.query('SHOW COLUMNS FROM vpn_accounts');
    const vpnColNames = vpnCols.map(c => c.Field);
    if (!vpnColNames.includes('status')) {
      await db.query("ALTER TABLE vpn_accounts ADD COLUMN status VARCHAR(20) DEFAULT 'Aktif' AFTER psk");
    }

    // Insert default VPN user if not exists
    await db.query(`
      INSERT IGNORE INTO vpn_accounts (username, password, psk, status)
      VALUES ('vpn_billing', 'billing1234', 'radius_vpn_secret', 'Aktif')
    `);
    console.log('✔ VPN accounts initialized.\n');

    // 4. TELEGRAM SETTINGS TABLE
    console.log('[4/9] Initializing Telegram notification settings...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS telegram_settings (
        outlet_name VARCHAR(64) PRIMARY KEY,
        bot_token VARCHAR(255),
        chat_id VARCHAR(64),
        is_enabled TINYINT(1) DEFAULT 0,
        last_notified_radacctid INT(11) DEFAULT 0
      ) ENGINE=InnoDB;
    `);

    // Ensure last_notified_radacctid exists
    const [tgCols] = await db.query('SHOW COLUMNS FROM telegram_settings');
    const tgColNames = tgCols.map(c => c.Field);
    if (!tgColNames.includes('last_notified_radacctid')) {
      await db.query('ALTER TABLE telegram_settings ADD COLUMN last_notified_radacctid INT(11) DEFAULT 0');
    }

    // Insert a default "Global" Telegram configuration row if missing
    await db.query(`
      INSERT IGNORE INTO telegram_settings (outlet_name, is_enabled)
      VALUES ('Global', 0)
    `);

    // Skip automatic watermark update
    // const [maxIdRows] = await db.query('SELECT MAX(radacctid) as max_id FROM radacct');
    // const currentMaxId = maxIdRows[0].max_id || 0;
    // await db.query('UPDATE telegram_settings SET last_notified_radacctid = ? WHERE last_notified_radacctid = 0', [currentMaxId]);
    console.log('✔ Telegram notification settings initialized.\n');

    // 4.5 WHATSAPP GATEWAY SETTINGS TABLE
    console.log('[4.5/9] Initializing WhatsApp Gateway settings...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS wa_gateway_settings (
        id INT PRIMARY KEY DEFAULT 1,
        provider_type VARCHAR(32) DEFAULT 'baileys',
        api_url VARCHAR(255),
        api_token VARCHAR(255),
        is_enabled TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB;
    `);

    // Insert a default WhatsApp configuration row if missing
    await db.query(`
      INSERT IGNORE INTO wa_gateway_settings (id, provider_type, is_enabled)
      VALUES (1, 'baileys', 0)
    `);
    console.log('✔ WhatsApp Gateway settings initialized.\n');

    // 5. PPPoE EXTENSIONS (nas table)
    console.log('[5/9] Extending RADIUS client (nas) table for MikroTik API...');
    const [nasCols] = await db.query('SHOW COLUMNS FROM nas');
    const nasColNames = nasCols.map(c => c.Field);
    if (!nasColNames.includes('api_user')) {
      await db.query("ALTER TABLE nas ADD COLUMN api_user VARCHAR(64) DEFAULT 'admin'");
    }
    if (!nasColNames.includes('api_password')) {
      await db.query("ALTER TABLE nas ADD COLUMN api_password VARCHAR(128) DEFAULT NULL");
    }
    if (!nasColNames.includes('api_port')) {
      await db.query("ALTER TABLE nas ADD COLUMN api_port INT DEFAULT 8728");
    }
    if (!nasColNames.includes('connection_mode')) {
      await db.query("ALTER TABLE nas ADD COLUMN connection_mode VARCHAR(32) DEFAULT 'ip_publik'");
    }
    if (!nasColNames.includes('vpn_protocol')) {
      await db.query("ALTER TABLE nas ADD COLUMN vpn_protocol VARCHAR(16) DEFAULT 'l2tp'");
    }
    if (!nasColNames.includes('vpn_user')) {
      await db.query("ALTER TABLE nas ADD COLUMN vpn_user VARCHAR(64) DEFAULT NULL");
    }
    if (!nasColNames.includes('vpn_pass')) {
      await db.query("ALTER TABLE nas ADD COLUMN vpn_pass VARCHAR(64) DEFAULT NULL");
    }
    if (!nasColNames.includes('vpn_psk')) {
      await db.query("ALTER TABLE nas ADD COLUMN vpn_psk VARCHAR(64) DEFAULT 'radius_vpn_secret'");
    }
    console.log('✔ RADIUS clients (nas) table successfully extended.\n');

    // 6. PPPoE CORE TABLES
    console.log('[6/9] Initializing PPPoE management & invoicing tables...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        upload_speed VARCHAR(20) NOT NULL,
        download_speed VARCHAR(20) NOT NULL,
        rate_limit VARCHAR(50) NOT NULL,
        price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        active_days INT NOT NULL DEFAULT 30,
        description TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_code VARCHAR(20) UNIQUE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        pppoe_username VARCHAR(100) NOT NULL UNIQUE,
        pppoe_password VARCHAR(100) NOT NULL,
        router_id INT NOT NULL,
        package_id INT NOT NULL,
        status ENUM('active', 'suspend', 'isolir', 'expired', 'inactive') DEFAULT 'active',
        billing_cycle_type ENUM('profile', 'fixed', 'monthly') DEFAULT 'profile',
        billing_start_date DATE,
        activation_date DATE,
        next_invoice_date DATE,
        next_isolir_date DATE,
        last_invoice_date DATE,
        last_payment_date DATE,
        billing_status ENUM('normal', 'unpaid', 'overdue', 'isolir', 'paid') DEFAULT 'normal',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (router_id) REFERENCES nas(id),
        FOREIGN KEY (package_id) REFERENCES pppoe_packages(id)
      ) ENGINE=InnoDB;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE,
        customer_id INT NOT NULL,
        package_id INT NOT NULL,
        billing_cycle_type VARCHAR(20),
        period_start DATE,
        period_end DATE,
        invoice_date DATE,
        due_date DATE,
        isolir_date DATE,
        amount DECIMAL(15, 2) NOT NULL,
        status ENUM('unpaid', 'paid', 'overdue', 'cancelled') DEFAULT 'unpaid',
        paid_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES pppoe_customers(id)
      ) ENGINE=InnoDB;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        customer_id INT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method VARCHAR(50),
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        received_by VARCHAR(64),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES pppoe_invoices(id),
        FOREIGN KEY (customer_id) REFERENCES pppoe_customers(id)
      ) ENGINE=InnoDB;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_billing_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        invoice_id INT,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        created_by VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES pppoe_customers(id)
      ) ENGINE=InnoDB;
    `);

    // Insert default 'ARM_ISOLIR' standard speed profile inside radgroupreply
    await db.query(`
      INSERT IGNORE INTO radgroupreply (groupname, attribute, op, value)
      VALUES ('ARM_ISOLIR', 'Mikrotik-Rate-Limit', ':=', '512k/512k')
    `);
    console.log('✔ PPPoE management & invoicing tables successfully initialized.\n');

    // 7. DASHBOARD PERMISSIONS FOR SUPERADMIN
    console.log('[7/9] Configuring admin role permissions...');
    const pppoeMenus = [
      'pppoe_management',
      'pppoe_packages',
      'pppoe_customers',
      'pppoe_monitoring',
      'pppoe_history',
      'pppoe_billing',
      'pppoe_invoices',
      'pppoe_payments',
      'pppoe_billing_cycle',
      'pppoe_auto_isolir',
      'pppoe_billing_settings'
    ];
    for (const menuId of pppoeMenus) {
      await db.query(
        'INSERT IGNORE INTO role_menu_access (role, menu_id, is_allowed) VALUES (?, ?, ?)',
        ['superadmin', menuId, 1]
      );
    }
    console.log('✔ Superadmin dashboard permissions configured.\n');

    // 8. PAYMENT METHODS TABLE
    console.log('[8/9] Initializing payment methods...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_name VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        code VARCHAR(64) NOT NULL,
        vendor VARCHAR(64) NOT NULL,
        is_active TINYINT(1) DEFAULT 0,
        fee_fixed DECIMAL(15,2) DEFAULT 0.00,
        fee_percent DECIMAL(5,2) DEFAULT 0.00
      ) ENGINE=InnoDB;
    `);

    // Seed default payment methods if table is empty
    const [pmRows] = await db.query('SELECT id FROM payment_methods');
    if (pmRows.length === 0) {
      await db.query(`
        INSERT INTO payment_methods (group_name, name, code, vendor, is_active, fee_fixed, fee_percent)
        VALUES 
        ('MANUAL', 'QRIS Manual / Bridge', 'QRIS', 'Bridge', 1, 0.00, 0.00),
        ('DUITKU GATEWAY', 'Duitku QRIS / VA', 'DUITKU', 'Duitku', 0, 0.00, 0.00),
        ('TRIPAY GLOBAL', 'Tripay QRIS / VA', 'TRIPAY', 'Tripay', 0, 0.00, 0.00)
      `);
      console.log('- Default payment methods seeded successfully.');
    }
    console.log('✔ Payment methods initialized.\n');

    // 9. UNIFIED REAL-TIME ACCOUNTING & LIFECYCLE TRIGGERS
    console.log('[9/9] Configuring unified accounting & lifecycle triggers...');
    await db.query('DROP TRIGGER IF EXISTS after_radacct_insert');
    await db.query('DROP TRIGGER IF EXISTS set_expiration_on_first_login');
    await db.query('DROP TRIGGER IF EXISTS update_voucher_status_on_login');

    const triggerSql = `
    CREATE TRIGGER after_radacct_insert 
    AFTER INSERT ON radacct 
    FOR EACH ROW 
    BEGIN 
        DECLARE v_timeout INT;
        DECLARE v_group VARCHAR(64);
        
        -- Detect START record (acctstoptime is null and sessiontime is 0 or null)
        IF NEW.acctstarttime IS NOT NULL AND NEW.acctstoptime IS NULL AND (NEW.acctsessiontime IS NULL OR NEW.acctsessiontime = 0) THEN
            
            -- 1. HANDLE EXPIRATION (Only on first login)
            IF NOT EXISTS (SELECT 1 FROM radcheck WHERE username = NEW.username AND attribute = 'Expiration') THEN
                -- Find the primary profile group
                SELECT groupname INTO v_group FROM radusergroup WHERE username = NEW.username AND groupname != 'MAC_LOCK_ENABLED' ORDER BY priority ASC LIMIT 1;
                
                -- Get timeout from profile metadata
                SELECT (pm.masa_aktif * 
                    CASE 
                        WHEN pm.satuan = 'Hari' THEN 86400 
                        WHEN pm.satuan = 'Jam' THEN 3600 
                        WHEN pm.satuan = 'Menit' THEN 60 
                        ELSE 1 
                    END) INTO v_timeout
                FROM profiles_metadata pm
                WHERE pm.groupname = v_group
                LIMIT 1;

                IF v_timeout IS NOT NULL THEN
                    -- Set Standard RADIUS Expiration (Format: DD Mon YYYY HH:MM:SS)
                    INSERT INTO radcheck (username, attribute, op, value)
                    VALUES (NEW.username, 'Expiration', ':=', DATE_FORMAT(DATE_ADD(NEW.acctstarttime, INTERVAL v_timeout SECOND), '%d %b %Y %H:%i:%s'));
                    
                    -- Set Max-All-Session as fallback limit
                    INSERT INTO radcheck (username, attribute, op, value)
                    VALUES (NEW.username, 'Max-All-Session', ':=', CAST(v_timeout AS CHAR));

                    -- Update status and expiration in metadata
                    UPDATE rincian_transaksi_voucher 
                    SET status = 'Terjual', 
                        sold_at = NOW(),
                        expiration_date = DATE_ADD(NEW.acctstarttime, INTERVAL v_timeout SECOND)
                    WHERE username = NEW.username AND (status = 'Aktif' OR status IS NULL);
                END IF;
            END IF;

            -- 2. HANDLE MAC LOCKING
            -- If Mac-Lock flag exists in radreply, and Calling-Station-Id is NOT YET set in radcheck, lock it now
            IF EXISTS (SELECT 1 FROM radreply WHERE username = NEW.username AND value = 'MAC_LOCK_ENABLED') THEN
                IF NOT EXISTS (SELECT 1 FROM radcheck WHERE username = NEW.username AND attribute = 'Calling-Station-Id') THEN
                    INSERT INTO radcheck (username, attribute, op, value)
                    VALUES (NEW.username, 'Calling-Station-Id', '==', NEW.callingstationid);
                END IF;
            END IF;

        END IF;
    END;
    `;
    await db.query(triggerSql);
    await db.query('DELETE FROM radcheck WHERE attribute = "Voucher-Expiration"');
    console.log('✔ Unified accounting & lifecycle triggers successfully configured.\n');

    // 10. VOUCHER TEMPLATES TABLE
    console.log('[10] Initializing voucher design templates...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS voucher_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_name VARCHAR(128) NOT NULL,
        header_html TEXT,
        row_html TEXT,
        footer_html TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Seed default template if empty
    const [templateRows] = await db.query('SELECT id FROM voucher_templates');
    if (templateRows.length === 0) {
      await db.query(`
        INSERT INTO voucher_templates (id, template_name, header_html, row_html, footer_html)
        VALUES (
          1, 
          'Template Standard', 
          '<html><head><style>body{font-family:sans-serif;margin:0;padding:0;} .voucher-container{display:flex;flex-wrap:wrap;gap:10px;padding:20px;}</style></head><body><div class=\"voucher-container\">', 
          '<div style=\"border:1px solid #333;padding:15px;margin:5px;width:220px;border-radius:10px;background:#fff;text-align:center;box-shadow:2px 2px 5px rgba(0,0,0,0.1);\">\\n  <h2 style=\"margin:0;color:#2563eb;\">#hsname#</h2>\\n  <div style=\"font-size:0.8rem;margin-bottom:10px;\">#dns#</div>\\n  <div style=\"background:#f1f5f9;padding:10px;border-radius:5px;margin-bottom:10px;\">\\n    <div style=\"font-size:0.7rem;text-transform:uppercase;\">Username</div>\\n    <div style=\"font-size:1.4rem;font-weight:900;color:#1e293b;\">#username#</div>\\n    <div style=\"font-size:0.7rem;text-transform:uppercase;margin-top:5px;\">Password</div>\\n    <div style=\"font-size:1.1rem;font-weight:700;\">#password#</div>\\n  </div>\\n  <div style=\"display:flex;justify-content:space-between;font-weight:bold;font-size:0.9rem;\">\\n    <span>#harga#</span>\\n    <span style=\"color:#10b981;\">#aktif#</span>\\n  </div>\\n</div>', 
          '</div></body></html>'
        )
      `);
      console.log('- Default voucher template seeded successfully.');
    }
    console.log('✔ Voucher design templates initialized.\n');

    // 11. NAS SERVERS TABLE
    console.log('[11] Initializing NAS servers list table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS nas_servers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nas_id INT NOT NULL,
        server_name VARCHAR(128) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nas_id) REFERENCES nas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('✔ NAS servers list table initialized.\n');

    // 12. MIKROTIK SCRIPT TEMPLATES TABLE + DEFAULT SEEDS
    console.log('[12] Initializing Mikrotik Script Templates...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS mikrotik_script_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        ros_version VARCHAR(10) NOT NULL DEFAULT 'v7',
        script_content TEXT NOT NULL,
        parameters TEXT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Seed 3 default templates jika tabel masih kosong
    const [scriptRows] = await db.query('SELECT id FROM mikrotik_script_templates');
    if (scriptRows.length === 0) {
      // Template 1: RADIUS Direct - IP Publik (v7)
      await db.query(`
        INSERT INTO mikrotik_script_templates (name, ros_version, script_content, parameters, description) VALUES (
          'RADIUS Direct - IP Publik (v7)',
          'v7',
          '# ==================================================\n# SCRIPT MIKROTIK - RADIUS DIRECT (IP PUBLIK) - ROS v7\n# ==================================================\n# Copy & paste ke Terminal MikroTik Anda\n\n:foreach i in=[/radius find comment="Radius Billing Direct"] do={/radius remove $i}\n/radius add service="hotspot,ppp" address="#server_ip#" secret="#secret#" authentication-port=#auth_port# accounting-port=#acct_port# timeout=3000ms comment="Radius Billing Direct"\n/radius incoming set accept=yes port=3799\n\n:foreach i in=[/ip pool find name="ARMPOOL"]   do={/ip pool remove $i}\n:foreach i in=[/ip pool find name="ARMISOLIR"] do={/ip pool remove $i}\n/ip pool add name="ARMPOOL"   ranges="10.30.192.100-10.30.207.254"\n/ip pool add name="ARMISOLIR" ranges="10.30.208.10-10.30.209.254"\n\n:foreach i in=[/ppp profile find name="ARM_RADIUS"] do={/ppp profile remove $i}\n:foreach i in=[/ppp profile find name="ARM_ISOLIR"] do={/ppp profile remove $i}\n/ppp profile add name="ARM_RADIUS" remote-address=ARMPOOL   only-one=yes use-compression=no\n/ppp profile add name="ARM_ISOLIR" remote-address=ARMISOLIR only-one=yes use-compression=no\n\n/ip hotspot profile set [find] use-radius=yes\n/ppp aaa set use-radius=yes\n:put "=== SELESAI: RADIUS Direct IP Publik ==="',
          '#server_ip#,#secret#,#auth_port#,#acct_port#',
          'Script RADIUS langsung via IP Publik MikroTik, cocok untuk koneksi direct tanpa VPN'
        )
      `);

      // Template 2: RADIUS VPN L2TP/IPsec (v7)
      await db.query(`
        INSERT INTO mikrotik_script_templates (name, ros_version, script_content, parameters, description) VALUES (
          'RADIUS via VPN L2TP/IPsec (v7)',
          'v7',
          '# ==================================================\n# SCRIPT MIKROTIK - RADIUS VPN L2TP/IPsec - ROS v7\n# ==================================================\n# Copy & paste ke Terminal MikroTik Anda\n\n:foreach i in=[/ppp profile find name="ARMTunnel"] do={/ppp profile remove $i}\n/ppp profile add name="ARMTunnel"\n\n:foreach i in=[/interface l2tp-client find name="vpn-radius"] do={/interface l2tp-client remove $i}\n/interface l2tp-client add name="vpn-radius" connect-to="#server_ip#" user="#vpn_user#" password="#vpn_pass#" profile="ARMTunnel" use-ipsec=yes ipsec-secret="#vpn_psk#" disabled=no\n\n:foreach i in=[/radius find comment="Radius Billing VPN"] do={/radius remove $i}\n/radius add service="hotspot,ppp" address="#vpn_local_ip#" secret="#secret#" authentication-port=#auth_port# accounting-port=#acct_port# comment="Radius Billing VPN"\n/radius incoming set accept=yes port=3799\n\n:foreach i in=[/ip pool find name="ARMPOOL"]   do={/ip pool remove $i}\n:foreach i in=[/ip pool find name="ARMISOLIR"] do={/ip pool remove $i}\n/ip pool add name="ARMPOOL"   ranges="10.30.192.100-10.30.207.254"\n/ip pool add name="ARMISOLIR" ranges="10.30.208.10-10.30.209.254"\n\n:foreach i in=[/ppp profile find name="ARM_RADIUS"] do={/ppp profile remove $i}\n:foreach i in=[/ppp profile find name="ARM_ISOLIR"] do={/ppp profile remove $i}\n/ppp profile add name="ARM_RADIUS" remote-address=ARMPOOL   only-one=yes use-compression=no\n/ppp profile add name="ARM_ISOLIR" remote-address=ARMISOLIR only-one=yes use-compression=no\n\n/ip hotspot profile set [find] use-radius=yes\n/ppp aaa set use-radius=yes\n:put "=== SELESAI: RADIUS VPN L2TP v7 ==="',
          '#server_ip#,#vpn_user#,#vpn_pass#,#vpn_psk#,#vpn_local_ip#,#secret#,#auth_port#,#acct_port#',
          'Script RADIUS via VPN L2TP/IPsec untuk RouterOS v7, untuk MikroTik di jaringan NAT/private'
        )
      `);

      // Template 3: RADIUS VPN L2TP/IPsec (v6 Legacy)
      await db.query(`
        INSERT INTO mikrotik_script_templates (name, ros_version, script_content, parameters, description) VALUES (
          'RADIUS via VPN L2TP/IPsec (v6)',
          'v6',
          '# ==================================================\n# SCRIPT MIKROTIK - RADIUS VPN L2TP/IPsec - ROS v6\n# ==================================================\n# Khusus RouterOS versi 6.x (legacy)\n# Copy & paste ke Terminal MikroTik Anda\n\n:foreach i in=[/ppp profile find name="ARMTunnel"] do={/ppp profile remove $i}\n/ppp profile add name="ARMTunnel"\n\n:foreach i in=[/interface l2tp-client find name="vpn-radius"] do={/interface l2tp-client remove $i}\n/interface l2tp-client add name="vpn-radius" connect-to="#server_ip#" user="#vpn_user#" password="#vpn_pass#" profile="ARMTunnel" use-ipsec=yes ipsec-secret="#vpn_psk#" disabled=no\n\n:foreach i in=[/radius find comment="Radius Billing VPN"] do={/radius remove $i}\n/radius add service=hotspot,ppp address="#vpn_local_ip#" secret="#secret#" authentication-port=#auth_port# accounting-port=#acct_port# comment="Radius Billing VPN"\n/radius incoming set accept=yes port=3799\n\n:foreach i in=[/ip pool find name="ARMPOOL"]   do={/ip pool remove $i}\n:foreach i in=[/ip pool find name="ARMISOLIR"] do={/ip pool remove $i}\n/ip pool add name="ARMPOOL"   ranges="10.30.192.100-10.30.207.254"\n/ip pool add name="ARMISOLIR" ranges="10.30.208.10-10.30.209.254"\n\n:foreach i in=[/ppp profile find name="ARM_RADIUS"] do={/ppp profile remove $i}\n:foreach i in=[/ppp profile find name="ARM_ISOLIR"] do={/ppp profile remove $i}\n/ppp profile add name="ARM_RADIUS" remote-address=ARMPOOL   only-one=yes use-compression=no\n/ppp profile add name="ARM_ISOLIR" remote-address=ARMISOLIR only-one=yes use-compression=no\n\n/ip hotspot profile set [find] use-radius=yes\n/ppp aaa set use-radius=yes\n:put "=== SELESAI: RADIUS VPN L2TP v6 ==="',
          '#server_ip#,#vpn_user#,#vpn_pass#,#vpn_psk#,#vpn_local_ip#,#secret#,#auth_port#,#acct_port#',
          'Script RADIUS via VPN L2TP/IPsec untuk RouterOS v6.x (legacy), kompatibel penuh dengan ROS lama'
        )
      `);

      console.log('- 3 default Mikrotik Script Templates seeded successfully (Direct IP, VPN L2TP v7, VPN L2TP v6).');
    } else {
      console.log(`- Mikrotik Script Templates sudah ada (${scriptRows.length} template), skip seeding.`);
    }
    console.log('✔ Mikrotik Script Templates initialized.\n');

    // 13. GDRIVE BACKUP TABLES
    console.log('[13] Initializing GDrive Backup tables...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS gdrive_settings (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        folder_id VARCHAR(255) DEFAULT '',
        cron_time VARCHAR(64) DEFAULT '0 2 * * *',
        is_enabled TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB;
    `);
    await db.query(`
      INSERT IGNORE INTO gdrive_settings (id, folder_id, cron_time, is_enabled)
      VALUES (1, '', '0 2 * * *', 0)
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_size VARCHAR(64),
        status ENUM('success', 'failed') DEFAULT 'success',
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    await db.query(
      'INSERT IGNORE INTO role_menu_access (role, menu_id, is_allowed) VALUES (?, ?, ?)',
      ['superadmin', 'gdrive_backup', 1]
    );
    console.log('✔ GDrive Backup tables initialized.\n');

    console.log('========================================================');
    console.log('   🎉 ALL DATABASES INITIALIZED SUCCESSFULLY!           ');
    console.log('   Your system and portal are 100% ready for use.       ');
    console.log('========================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ DATABASE INITIALIZATION FAILED:', err.message);
    process.exit(1);
  }
}

initializeAllDatabases();

