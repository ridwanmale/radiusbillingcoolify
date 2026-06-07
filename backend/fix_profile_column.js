const db = require('./config/db');

async function fixProfileColumn() {
  try {
    console.log('Adding profile column to rincian_transaksi_voucher...');
    const [cols] = await db.query('SHOW COLUMNS FROM rincian_transaksi_voucher');
    const colNames = cols.map(c => c.Field);
    
    if (!colNames.includes('profile')) {
      await db.query("ALTER TABLE rincian_transaksi_voucher ADD COLUMN profile VARCHAR(64) DEFAULT 'Unknown'");
      console.log('Profile column added!');
    } else {
      console.log('Profile column already exists.');
    }

    // Attempt to backfill existing active vouchers
    console.log('Backfilling existing profiles...');
    await db.query(`
      UPDATE rincian_transaksi_voucher vm
      JOIN radusergroup rug ON vm.username = rug.username
      SET vm.profile = rug.groupname
      WHERE vm.profile = 'Unknown' OR vm.profile IS NULL
    `);
    console.log('Backfill complete!');

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

fixProfileColumn();
