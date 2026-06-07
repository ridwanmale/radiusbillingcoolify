const db = require('./backend/config/db');
db.query("SELECT vm.batch_id, COALESCE(MAX(rug.groupname), 'Unknown') as profile, COUNT(DISTINCT vm.username) as qty FROM rincian_transaksi_voucher vm LEFT JOIN radusergroup rug ON vm.username = rug.username WHERE vm.batch_id != 'ONLINE-STORE' GROUP BY vm.batch_id ORDER BY vm.created_at DESC LIMIT 5")
  .then(([rows]) => console.log(rows))
  .catch(console.error)
  .finally(() => process.exit(0));
