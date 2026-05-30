const db = require('./config/db');

async function fixTelegramDB() {
    try {
        console.log('Initializing telegram_settings table...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS telegram_settings (
                outlet_name VARCHAR(64) PRIMARY KEY,
                bot_token VARCHAR(255),
                chat_id VARCHAR(64),
                is_enabled TINYINT(1) DEFAULT 0,
                last_notified_radacctid INT(11) DEFAULT 0
            ) ENGINE=InnoDB;
        `);
        
        // Cek apakah kolom last_notified_radacctid sudah ada (jika tabel sudah ada sebelumnya)
        const [columns] = await db.query('SHOW COLUMNS FROM telegram_settings');
        const hasColumn = columns.some(c => c.Field === 'last_notified_radacctid');
        
        if (!hasColumn) {
            console.log('Adding last_notified_radacctid column...');
            await db.query('ALTER TABLE telegram_settings ADD COLUMN last_notified_radacctid INT(11) DEFAULT 0');
        }

        // Set last_notified_radacctid ke ID terakhir saat ini agar tidak spam notifikasi lama
        const [maxIdRows] = await db.query('SELECT MAX(radacctid) as max_id FROM radacct');
        const currentMaxId = maxIdRows[0].max_id || 0;
        
        console.log(`Setting last_notified_radacctid to ${currentMaxId} for existing bots to prevent spam.`);
        await db.query('UPDATE telegram_settings SET last_notified_radacctid = ? WHERE last_notified_radacctid = 0', [currentMaxId]);

        console.log('Telegram database fixed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing Telegram DB:', err.message);
        process.exit(1);
    }
}

fixTelegramDB();
