const db = require('./config/db');

async function upgrade() {
  try {
    const connection = await db.getConnection();
    try {
      await connection.query('ALTER TABLE generate_presets ADD COLUMN template_id VARCHAR(50) DEFAULT NULL');
      console.log('Successfully added template_id column to generate_presets');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Column template_id already exists.');
      } else {
        console.error('Error:', err.message);
      }
    } finally {
      connection.release();
    }
  } catch(err) {
    console.error('DB connect error:', err);
  }
  process.exit();
}

upgrade();
