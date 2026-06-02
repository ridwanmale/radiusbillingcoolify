const db = require('./config/db');

async function migrate() {
    try {
        console.log('Running database migrations...');
        const [columns] = await db.query(`SHOW COLUMNS FROM portal_settings LIKE 'success_message_html'`);
        if (columns.length === 0) {
            await db.query(`ALTER TABLE portal_settings ADD COLUMN success_message_html TEXT;`);
            console.log('Added success_message_html column to portal_settings');
        } else {
            console.log('success_message_html column already exists');
        }
    } catch (error) {
        console.error('Migration error:', error);
    }
}

migrate().then(() => console.log('Migration check complete.'));
