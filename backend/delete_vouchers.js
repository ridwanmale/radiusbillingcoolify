const mysql = require('mysql2/promise');

const usernames = ['96gv', '4959', '471685'];

async function deleteVouchers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'radius',
    password: 'radius_password',
    database: 'radius_db'
  });

  try {
    console.log(`Starting deletion for: ${usernames.join(', ')}`);
    
    for (const username of usernames) {
      console.log(`Deleting ${username}...`);
      await connection.execute('DELETE FROM radcheck WHERE username = ?', [username]);
      await connection.execute('DELETE FROM radusergroup WHERE username = ?', [username]);
      await connection.execute('DELETE FROM radreply WHERE username = ?', [username]);
      await connection.execute('DELETE FROM radacct WHERE username = ?', [username]);
      await connection.execute('DELETE FROM vouchers_metadata WHERE username = ?', [username]);
    }
    
    console.log('Deletion completed successfully.');
  } catch (error) {
    console.error('Error during deletion:', error);
  } finally {
    await connection.end();
  }
}

deleteVouchers();
