const db = require('./backend/config/db');

async function migrate() {
    try {
        await db.query("ALTER TABLE portal_settings ADD COLUMN history_auto_delete_enabled BOOLEAN DEFAULT FALSE");
        console.log("Added history_auto_delete_enabled");
    } catch (e) {
        console.log("history_auto_delete_enabled:", e.message);
    }
    
    try {
        await db.query("ALTER TABLE portal_settings ADD COLUMN history_auto_delete_days INT DEFAULT 30");
        console.log("Added history_auto_delete_days");
    } catch (e) {
        console.log("history_auto_delete_days:", e.message);
    }
    process.exit(0);
}
migrate();
