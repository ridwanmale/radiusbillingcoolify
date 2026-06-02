require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const { notifyTelegram, sendTelegramNotification } = require('./utils/telegram');
const { initTelegramBotListener } = require('./utils/telegram_bot_listener');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
const voucherRoutes = require('./routes/vouchers');
const portalRoutes = require('./routes/portal');
const profileRoutes = require('./routes/profiles');
const dashboardRoutes = require('./routes/dashboard');
const outletRoutes = require('./routes/outlets');
const settingRoutes = require('./routes/settings');
const nasRoutes = require('./routes/nas');
const rekapRoutes = require('./routes/rekap');
const transactionRoutes = require('./routes/transactions');
const { router: logRoutes } = require('./routes/logs');
const authRoutes = require('./routes/auth');
const vpnRoutes = require('./routes/vpn');
const onlineStoreRoutes = require('./routes/online_store');
const deviceControlRoutes = require('./routes/device_control');
const replyMessagesRoutes = require('./routes/reply_messages');
const pppoePackageRoutes = require('./routes/pppoe_packages');
const pppoeCustomerRoutes = require('./routes/pppoe_customers');
const pppoeMonitoringRoutes = require('./routes/pppoe_monitoring');
const pppoeBillingRoutes = require('./routes/pppoe_billing');
const pppoeRedirectRoutes = require('./routes/pppoe_redirect');
const paymentMethodsRoutes = require('./routes/payment_methods');
const paymentDetectionRoutes = require('./routes/payment_detections');
const voucherTypesRoutes = require('./routes/voucher_types');
const mikrotikScriptRoutes = require('./routes/mikrotik_scripts');
const backupRoutes = require('./routes/backup');


// API Routes (Dahulukan API)
app.use('/api/vouchers', voucherRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/nas', nasRoutes);
app.use('/api/rekap', rekapRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/vpn', vpnRoutes);
app.use('/api/online-store', onlineStoreRoutes);
app.use('/api/device-control', deviceControlRoutes);
app.use('/api/reply-messages', replyMessagesRoutes);
app.use('/api/pppoe-packages', pppoePackageRoutes);
app.use('/api/pppoe-customers', pppoeCustomerRoutes);
app.use('/api/pppoe-monitoring', pppoeMonitoringRoutes);
app.use('/api/pppoe-billing', pppoeBillingRoutes);
app.use('/api/pppoe', pppoeRedirectRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/payment-detections', paymentDetectionRoutes);
app.use('/api/voucher-types', voucherTypesRoutes);
app.use('/api/mikrotik-scripts', mikrotikScriptRoutes);
app.use('/api/backup', backupRoutes);


// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Proxy Frontend (CATCH-ALL: Sisanya lempar ke Frontend)
// Taruh di paling bawah agar tidak mengganggu jalur API
app.use('/', createProxyMiddleware({
  target: process.env.FRONTEND_URL || 'http://127.0.0.1:5173',
  changeOrigin: true,
  ws: true,
  logLevel: 'debug'
}));

// Database migration check for enable_midtrans column
// Database failover migration helper running on individual database pool
const upgradePool = async (pool, name) => {
  if (!pool) return;
  try {
    // 1. Upgrade portal_settings table
    // 1. Ensure portal_settings table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portal_settings (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        portal_title VARCHAR(128) DEFAULT 'Wi-Fi Voucher Store',
        portal_description VARCHAR(255) DEFAULT 'Beli voucher internet instan 24 jam',
        primary_color VARCHAR(20) DEFAULT '#6366f1',
        is_active BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB;
    `);

    const [cols] = await pool.query('SHOW COLUMNS FROM portal_settings');
    
    
    
    // 2. Create mikrotik_script_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mikrotik_script_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        ros_version VARCHAR(10) NOT NULL,
        script_content TEXT NOT NULL,
        parameters TEXT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);



    const colNames = cols.map(c => c.Field);

    const columnsToAdd = {
      'portal_title': 'VARCHAR(128) DEFAULT "Wi-Fi Voucher Store"',
      'portal_description': 'VARCHAR(255) DEFAULT "Beli voucher internet instan 24 jam"',
      'primary_color': 'VARCHAR(20) DEFAULT "#6366f1"',
      'qris_static_string': 'TEXT',
      'notification_token': 'VARCHAR(64)',
      'is_active': 'BOOLEAN DEFAULT TRUE',
      'duitku_merchant_code': 'VARCHAR(128)',
      'duitku_api_key': 'VARCHAR(128)',
      'duitku_is_sandbox': 'BOOLEAN DEFAULT FALSE',
      'tripay_api_key': 'VARCHAR(128)',
      'tripay_private_key': 'VARCHAR(128)',
      'tripay_merchant_code': 'VARCHAR(128)',
      'tripay_is_sandbox': 'BOOLEAN DEFAULT FALSE',
      'enable_payment_bridge': 'BOOLEAN DEFAULT TRUE',
      'enable_midtrans': 'BOOLEAN DEFAULT FALSE',
      'enable_duitku': 'BOOLEAN DEFAULT FALSE',
      'enable_tripay': 'BOOLEAN DEFAULT FALSE',
      'enable_schedule': 'BOOLEAN DEFAULT FALSE',
      'open_time': 'VARCHAR(5) DEFAULT "08:00"',
      'close_time': 'VARCHAR(5) DEFAULT "22:00"'
    };

    for (const [col, definition] of Object.entries(columnsToAdd)) {
      if (!colNames.includes(col)) {
        await pool.query(`ALTER TABLE portal_settings ADD COLUMN ${col} ${definition}`);
        console.log(`[DB UPGRADE] Column ${col} successfully added on ${name}.`);
      }
    }

    // Ensure row id=1 exists
    await pool.query('INSERT INTO portal_settings (id) VALUES (1) ON DUPLICATE KEY UPDATE id=id');


    // 2. Upgrade settings table
    const [settingsCols] = await pool.query('SHOW COLUMNS FROM settings');
    const settingsColNames = settingsCols.map(c => c.Field);
    if (!settingsColNames.includes('payment_gateway_config')) {
      await pool.query('ALTER TABLE settings ADD COLUMN payment_gateway_config JSON DEFAULT NULL');
      console.log(`[DB UPGRADE] Column payment_gateway_config successfully added on ${name}.`);
    }
    if (!settingsColNames.includes('voucher_auto_delete_enabled')) {
      await pool.query('ALTER TABLE settings ADD COLUMN voucher_auto_delete_enabled TINYINT(1) DEFAULT 0');
      console.log(`[DB UPGRADE] Column voucher_auto_delete_enabled successfully added on ${name}.`);
    }
    if (!settingsColNames.includes('voucher_auto_delete_interval')) {
      await pool.query('ALTER TABLE settings ADD COLUMN voucher_auto_delete_interval VARCHAR(32) DEFAULT \'1_month\'');
      console.log(`[DB UPGRADE] Column voucher_auto_delete_interval successfully added on ${name}.`);
    }

    // 3. Upgrade profiles_metadata table
    const [profCols] = await pool.query('SHOW COLUMNS FROM profiles_metadata');
    const profColNames = profCols.map(c => c.Field);
    if (!profColNames.includes('prefix')) {
      await pool.query('ALTER TABLE profiles_metadata ADD COLUMN prefix VARCHAR(32) DEFAULT NULL');
      console.log(`[DB UPGRADE] Column prefix successfully added on ${name}.`);
    }
    if (!profColNames.includes('code_combination')) {
      await pool.query('ALTER TABLE profiles_metadata ADD COLUMN code_combination VARCHAR(32) DEFAULT NULL');
      console.log(`[DB UPGRADE] Column code_combination successfully added on ${name}.`);
    }
    if (!profColNames.includes('code_length')) {
      await pool.query('ALTER TABLE profiles_metadata ADD COLUMN code_length INT DEFAULT NULL');
      console.log(`[DB UPGRADE] Column code_length successfully added on ${name}.`);
    }

    // 4. Create Backup Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_backup_settings (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        bot_token VARCHAR(128) DEFAULT '',
        chat_id VARCHAR(64) DEFAULT '',
        cron_time VARCHAR(64) DEFAULT '0 2 * * *',
        is_enabled TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB;
    `);
    await pool.query(`
      INSERT IGNORE INTO telegram_backup_settings (id, bot_token, chat_id, cron_time, is_enabled)
      VALUES (1, '', '', '0 2 * * *', 0)
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ftp_settings (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        host VARCHAR(255) DEFAULT '',
        port INT DEFAULT 21,
        username VARCHAR(255) DEFAULT '',
        password VARCHAR(255) DEFAULT '',
        remote_path VARCHAR(255) DEFAULT '/',
        cron_time VARCHAR(64) DEFAULT '0 2 * * *',
        is_enabled TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB;
    `);
    await pool.query(`
      INSERT IGNORE INTO ftp_settings (id, host, port, username, password, remote_path, cron_time, is_enabled)
      VALUES (1, '', 21, '', '', '/', '0 2 * * *', 0)
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_size VARCHAR(64),
        status ENUM('success', 'failed') DEFAULT 'success',
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    await pool.query(
      'INSERT IGNORE INTO role_menu_access (role, menu_id, is_allowed) VALUES (?, ?, ?)',
      ['superadmin', 'telegram_backup', 1]
    );

    console.log(`[DB UPGRADE] Completed schema verification on ${name}.`);
  } catch (err) {
    console.error(`[DB UPGRADE ERROR] Failed to upgrade database on ${name}:`, err.message);
  }
};

// Database migration check running on both Primary (LXC 1) and Backup (LXC 3) Pools
const initDbUpgrades = async () => {
  console.log('[DB UPGRADE] Starting database schema migrations...');
  await upgradePool(db, 'Radius Database');
  console.log('[DB UPGRADE] Finished database schema migrations check.');
};
initDbUpgrades();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API Gateway running on port ${PORT} (all interfaces)`);
});

// =============================================
// SCHEDULED JOB: Hapus otomatis voucher expired & Transaksi Pending
// =============================================
const cleanupJobs = async () => {
  const connection = await db.getConnection();
  try {
    // 1. Bersihkan Voucher Expired
    const [expiredRows] = await connection.query(`
      SELECT DISTINCT rc.username
      FROM radcheck rc
      WHERE rc.attribute IN ('Expiration', 'Voucher-Expiration')
      AND (
        (rc.value LIKE '%-%' AND STR_TO_DATE(rc.value, '%Y-%m-%d %H:%i:%s') < NOW()) OR
        (rc.value LIKE '% %' AND STR_TO_DATE(rc.value, '%d %b %Y %H:%i:%s') < NOW())
      )
    `);

    if (expiredRows.length > 0) {
      const usernames = expiredRows.map(r => r.username);
      const placeholders = usernames.map(() => '?').join(',');
      await connection.beginTransaction();
      await connection.query(`DELETE FROM radcheck WHERE username IN (${placeholders})`, usernames);
      await connection.query(`DELETE FROM radreply WHERE username IN (${placeholders})`, usernames);
      await connection.query(`UPDATE rincian_transaksi_voucher SET status = 'Expired' WHERE username IN (${placeholders})`, usernames);
      await connection.commit();
      console.log(`[Cleanup] Berhasil membersihkan ${usernames.length} voucher expired.`);
    }

    // 1b. Auto Delete Berkala (Voucher Expired/Nonaktif)
    try {
      const [settings] = await connection.query('SELECT voucher_auto_delete_enabled, voucher_auto_delete_interval FROM settings WHERE id = 1');
      if (settings.length > 0 && settings[0].voucher_auto_delete_enabled) {
        const intervalStr = settings[0].voucher_auto_delete_interval || '1_month';
        let sqlInterval = '1 MONTH';
        if (intervalStr === '1_week') sqlInterval = '1 WEEK';
        else if (intervalStr === '1_month') sqlInterval = '1 MONTH';
        else if (intervalStr === '2_months') sqlInterval = '2 MONTH';
        else if (intervalStr === '3_months') sqlInterval = '3 MONTH';
        else if (intervalStr === '6_months') sqlInterval = '6 MONTH';

        const [toDeleteRows] = await connection.query(`SELECT username FROM rincian_transaksi_voucher WHERE status IN ('Expired', 'Nonaktif') AND created_at < DATE_SUB(NOW(), INTERVAL ` + sqlInterval + `)`);
        if (toDeleteRows.length > 0) {
          const toDeleteUsernames = toDeleteRows.map(r => r.username);
          const placeholders = toDeleteUsernames.map(() => '?').join(',');
          await connection.beginTransaction();
          await connection.query(`DELETE FROM radcheck WHERE username IN (` + placeholders + `)`, toDeleteUsernames);
          await connection.query(`DELETE FROM radreply WHERE username IN (` + placeholders + `)`, toDeleteUsernames);
          await connection.query(`DELETE FROM radusergroup WHERE username IN (` + placeholders + `)`, toDeleteUsernames);
          await connection.query(`DELETE FROM rincian_transaksi_voucher WHERE username IN (` + placeholders + `)`, toDeleteUsernames);
          await connection.commit();
          console.log(`[Auto-Delete Cleanup] Berhasil menghapus otomatis ` + toDeleteUsernames.length + ` voucher expired (lebih dari ` + sqlInterval + `).`);
        }
      }
    } catch (autoDelErr) {
      console.error('[Auto-Delete Cleanup Error]:', autoDelErr.message);
    }

    // 2. Bersihkan Transaksi Pending > 3 Hari
    const [delTrx] = await connection.query(`
      DELETE FROM jurnal_keuangan 
      WHERE status = 'PENDING' 
      AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
    `);
    if (delTrx.affectedRows > 0) {
      console.log(`[Cleanup] Berhasil menghapus ${delTrx.affectedRows} transaksi pending lama.`);
    }

  } catch (err) {
    console.error('[Cleanup] Error during execution:', err.message);
  } finally {
    if (connection) connection.release();
  }
};
setInterval(() => cleanupJobs().catch(err => console.error('[Cleanup Interval] Error:', err.message)), 5 * 60 * 1000); // Jalankan setiap 5 menit

// =============================================
// PPPoE BILLING JOBS: Auto Generate Invoice & Auto Isolir
// =============================================
const pppoeBillingJobs = async () => {
  const connection = await db.getConnection();
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. AUTO GENERATE INVOICE
    // Find active customers with next_invoice_date <= today
    const [custToInvoice] = await connection.query(`
      SELECT c.*, p.price as package_price
      FROM pppoe_customers c
      JOIN pppoe_packages p ON c.package_id = p.id
      WHERE c.next_invoice_date <= ? AND c.status = 'active'
    `, [todayStr]);

    for (const cust of custToInvoice) {
      // Check if invoice already exists for this period
      const [existing] = await connection.query(
        'SELECT id FROM pppoe_invoices WHERE customer_id = ? AND status = "unpaid" AND invoice_date = ?',
        [cust.id, todayStr]
      );
      
      if (existing.length === 0) {
        const invNum = `INV-${todayStr.replace(/-/g, '')}-${cust.id}-${Math.floor(Math.random() * 1000)}`;
        await connection.beginTransaction();
        
        await connection.query(
          `INSERT INTO pppoe_invoices (
            invoice_number, customer_id, package_id, billing_cycle_type, 
            amount, status, invoice_date, due_date, isolir_date
          ) VALUES (?, ?, ?, ?, ?, 'unpaid', ?, ?, ?)`,
          [
            invNum, cust.id, cust.package_id, cust.billing_cycle_type,
            cust.package_price, todayStr, cust.next_isolir_date, cust.next_isolir_date
          ]
        );
        
        await connection.query(
          'UPDATE pppoe_customers SET billing_status = "unpaid", last_invoice_date = ? WHERE id = ?',
          [todayStr, cust.id]
        );
        
        await connection.query(
          'INSERT INTO pppoe_billing_logs (customer_id, action, description, created_by) VALUES (?, "invoice_generated", ?, "System")',
          [cust.id, `Auto generate invoice ${invNum}`]
        );
        
        await connection.commit();
        console.log(`[PPPoE Billing] Auto generated invoice ${invNum} for customer ${cust.name}`);
      }
    }

    // 2. AUTO ISOLIR
    // Find customers with unpaid/overdue invoices whose isolir_date <= today
    const [custToIsolir] = await connection.query(`
      SELECT i.id as invoice_id, c.*, p.slug as package_slug
      FROM pppoe_invoices i
      JOIN pppoe_customers c ON i.customer_id = c.id
      JOIN pppoe_packages p ON c.package_id = p.id
      WHERE i.status IN ('unpaid', 'overdue') AND i.isolir_date <= ? AND c.status != 'isolir'
    `, [todayStr]);

    for (const cust of custToIsolir) {
      await connection.beginTransaction();
      
      // Update customer status to isolir
      await connection.query(
        'UPDATE pppoe_customers SET status = "isolir", billing_status = "isolir" WHERE id = ?',
        [cust.id]
      );
      
      // Update invoice status to overdue
      await connection.query(
        'UPDATE pppoe_invoices SET status = "overdue" WHERE id = ?',
        [cust.invoice_id]
      );
      
      // Move to isolir group in RADIUS
      await connection.query(
        'UPDATE radusergroup SET groupname = ? WHERE username = ?',
        ['ARM_ISOLIR', cust.pppoe_username]
      );
      
      await connection.query(
        'INSERT INTO pppoe_billing_logs (customer_id, invoice_id, action, description, created_by) VALUES (?, ?, "customer_isolated", "Auto isolir due to unpaid invoice", "System")',
        [cust.id, cust.invoice_id]
      );
      
      await connection.commit();
      
      // Telegram Notification
      const tgMessage = `<b>« ISOLIR OTOMATIS</b>\n\nPelanggan: <b>${cust.name}</b>\nUsername: <code>${cust.pppoe_username}</code>\nStatus: Terisolir (Tagihan Belum Dibayar)`;
      await notifyTelegram(tgMessage);

      console.log(`[PPPoE Billing] Auto isolated customer ${cust.name} due to unpaid invoice`);
      
      // TODO: Disconnect session if online (optional but recommended)
    }

  } catch (err) {
    console.error('[PPPoE Billing Job] Error during execution:', err.message);
  } finally {
    if (connection) connection.release();
  }
};
setInterval(() => pppoeBillingJobs().catch(err => console.error('[PPPoE Billing Interval] Error:', err.message)), 60 * 60 * 1000); // Jalankan setiap 1 jam
pppoeBillingJobs().catch(err => console.error('[PPPoE Billing Startup] Error:', err.message)); // Run on startup

// =============================================
// TELEGRAM JOB: Notifikasi voucher pertama login
// =============================================
// (sendTelegramNotification moved to utils/telegram.js)

let isCheckingLogins = false;
const checkFirstLogins = async () => {
  if (isCheckingLogins) return;
  isCheckingLogins = true;

  const connection = await db.getConnection();
  try {
    const [minLastIdRows] = await connection.query('SELECT MIN(last_notified_radacctid) as min_id FROM telegram_settings');
    let lastId = minLastIdRows[0]?.min_id || 0;
    // Note: If lastId is 0, it will check all historical records.

    const [newSessions] = await connection.query(`
      SELECT ra.radacctid, ra.username, ra.acctstarttime, ra.callingstationid as mac,
             rug.groupname as profile,
             pm.masa_aktif, pm.satuan,
             vm.outlet_name,
             vm.batch_id,
             vm.expiration_date
      FROM radacct ra
      LEFT JOIN rincian_transaksi_voucher vm ON ra.username = vm.username
      LEFT JOIN radusergroup rug ON ra.username = rug.username AND rug.groupname != 'MAC_LOCK_ENABLED'
      LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname
      WHERE ra.radacctid > ?
      ORDER BY ra.radacctid ASC
    `, [lastId]);

    for (const session of newSessions) {
      const [prevCount] = await connection.query('SELECT COUNT(*) as total FROM radacct WHERE username = ? AND radacctid < ?', [session.username, session.radacctid]);
      const isFirstLogin = prevCount[0].total === 0;
      const isOnlineVoucher = session.batch_id === 'ONLINE-STORE';

      // Notify on first login
      if (isFirstLogin) {
        const [botRows] = await connection.query('SELECT * FROM telegram_settings WHERE (outlet_name = ? OR outlet_name = "Global") AND is_enabled = 1 ORDER BY (outlet_name = ?) DESC LIMIT 1', [session.outlet_name || 'Global', session.outlet_name]);
        
        if (botRows.length > 0) {
          const { bot_token, chat_id } = botRows[0];
          
          const formatDT = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const pad = (n) => String(n).padStart(2, '0');
            return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
          };

          const loginTime = formatDT(session.acctstarttime);
          const expireTime = formatDT(session.expiration_date);
          
          let title = "<b>🚀 Voucher Fisik Aktif!</b>";
          if (isOnlineVoucher) {
            title = "<b>🌐 Voucher Online Aktif!</b>";
          }

          const message = `${title}\n\n` +
                          `<code>Kode Voucher : </code><code>${session.username}</code>\n` +
                          `<code>Profile      : </code><code>${session.profile || 'Default'}</code>\n` +
                          `<code>Masa Aktif   : </code><code>${session.masa_aktif} ${session.satuan}</code>\n` +
                          `<code>MAC Address  : </code><code>${session.mac || '-'}</code>\n` +
                          `<code>Login        : </code><code>${loginTime}</code>\n` +
                          `<code>Expired      : </code><code>${expireTime}</code>`;
          await sendTelegramNotification(bot_token, chat_id, message);
          console.log(`[Telegram] Notifikasi dikirim untuk user: ${session.username} (${isOnlineVoucher ? 'Online' : 'Physical'})`);
        }
      }
      
      // Update the watermark immediately after processing each record to avoid duplicates on crash
      await connection.query('UPDATE telegram_settings SET last_notified_radacctid = ? WHERE last_notified_radacctid < ?', [session.radacctid, session.radacctid]);
    }
  } catch (err) {
    console.error('[Telegram Job] Error during execution:', err.message);
  } finally {
    isCheckingLogins = false;
    if (connection) connection.release();
  }
};

// Run checking job immediately on startup and then every 30 seconds
checkFirstLogins().catch(err => console.error('[Telegram Startup] Error:', err.message)); 
setInterval(() => checkFirstLogins().catch(err => console.error('[Telegram Interval] Error:', err.message)), 30 * 1000);

// =============================================
// TELEGRAM BOT LISTENER: Cek Voucher Command
// =============================================
if (process.env.ENABLE_TELEGRAM_BOT_LISTENER === 'true') {
  console.log('🚀 [Telegram Bot] Initializing "Cek Voucher" bot listener...');
  try {
    initTelegramBotListener();
  } catch (err) {
    console.error('[Telegram Bot Startup] Error:', err.message);
  }
} else {
  console.log('[Telegram Bot] Listener disabled (ENABLE_TELEGRAM_BOT_LISTENER is not true).');
}

// =============================================
// BACKUP CRON JOBS (TELEGRAM & FTP)
// =============================================
const cron = require('node-cron');
const { performBackup: performTelegramBackup } = require('./utils/telegramBackupService');
const { performFTPBackup } = require('./utils/ftpBackupService');

let telegramBackupTask = null;
let ftpBackupTask = null;

const scheduleBackups = async () => {
  try {
    // We use db.query directly to avoid connection leaks
    const [tSettings] = await db.query('SELECT * FROM telegram_backup_settings WHERE id = 1');
    const [fSettings] = await db.query('SELECT * FROM ftp_settings WHERE id = 1');

    // --- TELEGRAM SCHEDULE ---
    if (telegramBackupTask) {
      telegramBackupTask.stop();
      telegramBackupTask = null;
    }
    if (tSettings.length > 0 && tSettings[0].is_enabled) {
      const tCron = tSettings[0].cron_time || '0 2 * * *';
      console.log(`[Backup] Scheduling Telegram daily backup at: ${tCron}`);
      telegramBackupTask = cron.schedule(tCron, async () => {
        console.log('[Backup] Executing scheduled Telegram backup...');
        try {
          await performTelegramBackup();
        } catch (error) {
          console.error('[Backup] Scheduled Telegram backup failed:', error.message);
        }
      });
    }

    // --- FTP SCHEDULE ---
    if (ftpBackupTask) {
      ftpBackupTask.stop();
      ftpBackupTask = null;
    }
    if (fSettings.length > 0 && fSettings[0].is_enabled) {
      const fCron = fSettings[0].cron_time || '0 2 * * *';
      console.log(`[Backup] Scheduling FTP daily backup at: ${fCron}`);
      ftpBackupTask = cron.schedule(fCron, async () => {
        console.log('[Backup] Executing scheduled FTP backup...');
        try {
          await performFTPBackup();
        } catch (error) {
          console.error('[Backup] Scheduled FTP backup failed:', error.message);
        }
      });
    }

  } catch (err) {
    // If tables don't exist yet, it will fail silently
  }
};

// Check for schedule on startup and every 5 minutes to see if settings changed
scheduleBackups();
setInterval(scheduleBackups, 5 * 60 * 1000);
