const db = require('./config/db');

async function fixCollation() {
  try {
    console.log("Fetching all tables...");
    const [rows] = await db.query("SHOW TABLES");
    const dbName = Object.values(rows[0] || {})[0] ? Object.keys(rows[0])[0] : 'Tables_in_radius';
    
    for (const row of rows) {
      const tableName = row[dbName];
      console.log(`Converting table: ${tableName}`);
      await db.query(`ALTER TABLE \`${tableName}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    }
    console.log("All tables converted to utf8mb4_general_ci.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixCollation();
