const db = require('./config/db');

async function addDuitkuSettings() {
    try {
        console.log('Adding Duitku settings columns to portal_settings...');
        
        // Cek apakah tabel portal_settings ada
        const [tables] = await db.query("SHOW TABLES LIKE 'portal_settings'");
        if (tables.length === 0) {
            console.log('Table portal_settings not found. Creating it...');
            await db.query(`
                CREATE TABLE portal_settings (
                    id INT PRIMARY KEY DEFAULT 1,
                    portal_title VARCHAR(128) DEFAULT 'Wi-Fi Voucher Store',
                    portal_description VARCHAR(255) DEFAULT 'Beli voucher internet instan 24 jam',
                    primary_color VARCHAR(20) DEFAULT '#6366f1',
                    qris_static_string TEXT,
                    notification_token VARCHAR(64),
                    is_active BOOLEAN DEFAULT TRUE,
                    duitku_merchant_code VARCHAR(128),
                    duitku_api_key VARCHAR(255),
                    duitku_is_sandbox BOOLEAN DEFAULT TRUE
                ) ENGINE=InnoDB;
            `);
            await db.query('INSERT INTO portal_settings (id) VALUES (1) ON DUPLICATE KEY UPDATE id=id');
        } else {
            const [columns] = await db.query('SHOW COLUMNS FROM portal_settings');
            const hasMerchant = columns.some(c => c.Field === 'duitku_merchant_code');
            
            if (!hasMerchant) {
                await db.query('ALTER TABLE portal_settings ADD COLUMN duitku_merchant_code VARCHAR(128)');
                await db.query('ALTER TABLE portal_settings ADD COLUMN duitku_api_key VARCHAR(255)');
                await db.query('ALTER TABLE portal_settings ADD COLUMN duitku_is_sandbox BOOLEAN DEFAULT TRUE');
                console.log('Columns added successfully.');
            } else {
                console.log('Columns already exist.');
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

addDuitkuSettings();
