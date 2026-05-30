/**
 * PPPoE Management Initialization Script
 * This script creates the necessary tables for PPPoE management and billing.
 */

const db = require('./config/db');

const initPPPoE = async () => {
  try {
    console.log('Starting PPPoE tables initialization...');

    // 1. Extend 'nas' table to support MikroTik API
    try {
      await db.query(`
        ALTER TABLE nas 
        ADD COLUMN api_user VARCHAR(64) DEFAULT 'admin' AFTER acct_port,
        ADD COLUMN api_password VARCHAR(128) DEFAULT NULL AFTER api_user,
        ADD COLUMN api_port INT DEFAULT 8728 AFTER api_password;
      `);
      console.log('Table nas extended successfully.');
    } catch (e) {
      if (e.code === 'ER_DUP_COLUMN' || e.code === 'ER_DUP_FIELDNAME') {
        console.log('Columns in nas already exist, skipping...');
      } else {
        throw e;
      }
    }

    // 2. Create 'pppoe_packages' table
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
    console.log('Table pppoe_packages created.');

    // 3. Create 'pppoe_customers' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        pppoe_username VARCHAR(64) NOT NULL UNIQUE,
        pppoe_password VARCHAR(128) NOT NULL,
        router_id INT NOT NULL,
        package_id INT NOT NULL,
        billing_cycle_type ENUM('profile', 'fixed', 'monthly') DEFAULT 'profile',
        billing_start_date DATE,
        activation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        next_invoice_date DATE,
        next_isolir_date DATE,
        last_payment_date DATE,
        days_overdue INT DEFAULT 0,
        status ENUM('active', 'isolir', 'tunggakan', 'nonaktif') DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_router (router_id),
        INDEX idx_package (package_id),
        INDEX idx_status (status),
        FOREIGN KEY (router_id) REFERENCES nas(id) ON DELETE CASCADE,
        FOREIGN KEY (package_id) REFERENCES pppoe_packages(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_customers created.');

    // 4. Create 'pppoe_monitoring' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_monitoring (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        pppoe_username VARCHAR(64) NOT NULL,
        session_id VARCHAR(100),
        ip_address VARCHAR(45),
        start_time TIMESTAMP NULL,
        end_time TIMESTAMP NULL,
        upload_bytes BIGINT DEFAULT 0,
        download_bytes BIGINT DEFAULT 0,
        session_time INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_username (pppoe_username),
        INDEX idx_start_time (start_time),
        FOREIGN KEY (customer_id) REFERENCES pppoe_customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_monitoring created.');

    // 5. Create 'pppoe_history' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT,
        admin_username VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_action (action),
        INDEX idx_created (created_at),
        FOREIGN KEY (customer_id) REFERENCES pppoe_customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_history created.');

    // 6. Create 'pppoe_billing' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_billing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
        due_date DATE NOT NULL,
        paid_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_status (status),
        INDEX idx_due_date (due_date),
        FOREIGN KEY (customer_id) REFERENCES pppoe_customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_billing created.');

    // 7. Create 'pppoe_invoices' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        total_amount DECIMAL(15, 2) NOT NULL,
        paid_amount DECIMAL(15, 2) DEFAULT 0.00,
        status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
        pdf_path VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_status (status),
        INDEX idx_due_date (due_date),
        FOREIGN KEY (customer_id) REFERENCES pppoe_customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_invoices created.');

    // 8. Create 'pppoe_payments' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        invoice_id INT,
        payment_date DATE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method VARCHAR(50),
        reference_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_invoice (invoice_id),
        INDEX idx_payment_date (payment_date),
        FOREIGN KEY (customer_id) REFERENCES pppoe_customers(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES pppoe_invoices(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_payments created.');

    // 9. Create 'pppoe_billing_cycle' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_billing_cycle (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        cycle_days INT NOT NULL,
        invoice_day INT NOT NULL,
        due_day INT NOT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_billing_cycle created.');

    // 10. Create 'pppoe_auto_isolir' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_auto_isolir (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enabled BOOLEAN DEFAULT TRUE,
        grace_period_days INT DEFAULT 3,
        auto_isolir_enabled BOOLEAN DEFAULT TRUE,
        auto_remove_isolir_enabled BOOLEAN DEFAULT TRUE,
        notification_days_before INT DEFAULT 7,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_auto_isolir created.');

    // 11. Create 'pppoe_billing_settings' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_billing_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tax_rate DECIMAL(5, 2) DEFAULT 0.00,
        late_fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'IDR',
        invoice_prefix VARCHAR(10) DEFAULT 'INV',
        next_invoice_number INT DEFAULT 1000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_billing_settings created.');

    // 12. Create 'pppoe_redirect_settings' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_redirect_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        redirect_enabled BOOLEAN DEFAULT TRUE,
        redirect_message VARCHAR(255) DEFAULT 'Mohon lunasi tagihan Anda',
        redirect_url VARCHAR(255) DEFAULT '/pppoe/warning',
        block_https BOOLEAN DEFAULT TRUE,
        block_games BOOLEAN DEFAULT TRUE,
        block_whatsapp BOOLEAN DEFAULT TRUE,
        allow_http BOOLEAN DEFAULT TRUE,
        custom_message TEXT,
        redirect_delay INT DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_redirect_settings created.');

    // 13. Create 'pppoe_redirect_logs' table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pppoe_redirect_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        pppoe_username VARCHAR(64),
        action VARCHAR(50) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_username (pppoe_username),
        INDEX idx_created (created_at),
        FOREIGN KEY (customer_id) REFERENCES pppoe_customers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('Table pppoe_redirect_logs created.');

    // Insert default redirect settings
    await db.query(`
      INSERT IGNORE INTO pppoe_redirect_settings 
      (redirect_enabled, redirect_message, redirect_url, block_https, block_games, block_whatsapp, allow_http, redirect_delay)
      VALUES (TRUE, 'Mohon lunasi tagihan Anda', '/pppoe/warning', TRUE, TRUE, TRUE, TRUE, 3)
    `);
    console.log('Default redirect settings inserted.');

    // Insert default billing settings
    await db.query(`
      INSERT IGNORE INTO pppoe_billing_settings 
      (tax_rate, late_fee_percentage, currency, invoice_prefix, next_invoice_number)
      VALUES (0.00, 0.00, 'IDR', 'INV', 1000)
    `);
    console.log('Default billing settings inserted.');

    // Insert default auto isolir settings
    await db.query(`
      INSERT IGNORE INTO pppoe_auto_isolir 
      (enabled, grace_period_days, auto_isolir_enabled, auto_remove_isolir_enabled, notification_days_before)
      VALUES (TRUE, 3, TRUE, TRUE, 7)
    `);
    console.log('Default auto isolir settings inserted.');

    // Add PPPoE menus to role_menu_access
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
      'pppoe_billing_settings',
      'pppoe_redirect_settings',
      'pppoe_redirect_logs'
    ];

    for (const menuId of pppoeMenus) {
      await db.query(
        'INSERT IGNORE INTO role_menu_access (role, menu_id, is_allowed) VALUES (?, ?, ?)',
        ['superadmin', menuId, 1]
      );
    }
    console.log('Superadmin permissions added for PPPoE menus.');

    console.log('PPPoE initialization complete.');
    process.exit(0);
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
};

// Execute the initialization
initPPPoE();
