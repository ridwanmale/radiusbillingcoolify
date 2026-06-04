const { generateOnlineVoucherCode } = require('./backend/utils/voucher');
async function run() {
  const code = await generateOnlineVoucherCode('test');
  console.log(code);
}
run();
