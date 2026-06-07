const db = require('./backend/config/db');

async function run() {
  console.time('Subquery');
  await db.query(`SELECT vm.username as voucher_code, (SELECT value FROM radcheck WHERE username = vm.username AND attribute = 'Cleartext-Password' LIMIT 1) as password FROM rincian_transaksi_voucher vm WHERE COALESCE(vm.status, 'Aktif') IN ('Aktif', 'Nonaktif')`);
  console.timeEnd('Subquery');

  console.time('LeftJoin');
  await db.query(`SELECT vm.username as voucher_code, rc_pass.value as password FROM rincian_transaksi_voucher vm LEFT JOIN radcheck rc_pass ON vm.username = rc_pass.username AND rc_pass.attribute = 'Cleartext-Password' WHERE COALESCE(vm.status, 'Aktif') IN ('Aktif', 'Nonaktif') GROUP BY vm.username, rc_pass.value`);
  console.timeEnd('LeftJoin');
  process.exit();
}

run();
