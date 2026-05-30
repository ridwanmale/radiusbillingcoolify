const db = require('./config/db');

async function checkTable() {
    try {
        const [columns] = await db.query('SHOW COLUMNS FROM telegram_settings');
        console.log('Columns in telegram_settings:', columns.map(c => c.Field));
        
        const [rows] = await db.query('SELECT * FROM telegram_settings');
        console.log('Rows in telegram_settings:', rows);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkTable();
