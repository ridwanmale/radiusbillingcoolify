const db = require('./config/db');
const { notifyTelegram } = require('./utils/telegram');

async function test() {
  const tgMessage = `🔔 <b>PEMBAYARAN DUITKU BERHASIL (TEST)</b>\n\n` +
                    `ID Pesanan: <code>INV-1779246798933</code>\n` +
                    `Paket: <b>E-7 Hari</b>\n` +
                    `Nominal: <b>Rp ${Math.round(parseFloat(100.00)).toLocaleString('id-ID')}</b>\n` +
                    `Kode Voucher: <code>7179189494</code>\n\n` +
                    `<i>Voucher telah aktif di server RADIUS.</i>`;
  console.log("Sending test notification to Payment Gateway...");
  const success = await notifyTelegram(tgMessage, 'Payment Gateway');
  console.log("Result:", success ? "SUCCESS" : "FAILED");
  process.exit(0);
}

test();
