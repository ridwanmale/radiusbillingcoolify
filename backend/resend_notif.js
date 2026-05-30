const db = require('./config/db');
const { sendTelegramNotification } = require('./utils/telegram');

async function resendNotif() {
  const connection = await db.getConnection();
  try {
    const [botRows] = await connection.query('SELECT * FROM telegram_settings WHERE (outlet_name = ? OR outlet_name = "Global") AND is_enabled = 1 ORDER BY (outlet_name = ?) DESC LIMIT 1', ['RW06', 'RW06']);
    
    if (botRows.length > 0) {
      const { bot_token, chat_id } = botRows[0];
      
      const session = {
        username: '269928',
        profile: 'Default',
        masa_aktif: 1,
        satuan: 'Jam',
        mac: 'A2:62:1B:76:CB:11',
        acctstarttime: '2026-05-19T01:38:30',
        expiration_date: '2026-05-19T02:38:30'
      };

      const formatDT = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };

      const loginTime = formatDT(session.acctstarttime);
      const expireTime = formatDT(session.expiration_date);
      
      let title = "<b>🚀 Voucher Fisik Aktif! (Resend Test)</b>";

      const message = `${title}\n\n` +
                      `<code>Kode Voucher : </code><code>${session.username}</code>\n` +
                      `<code>Profile      : </code><code>${session.profile || 'Default'}</code>\n` +
                      `<code>Masa Aktif   : </code><code>${session.masa_aktif} ${session.satuan}</code>\n` +
                      `<code>MAC Address  : </code><code>${session.mac || '-'}</code>\n` +
                      `<code>Login        : </code><code>${loginTime}</code>\n` +
                      `<code>Expired      : </code><code>${expireTime}</code>`;
      
      await sendTelegramNotification(bot_token, chat_id, message);
      console.log('Notifikasi terkirim');
    }
  } catch (err) {
    console.error(err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

resendNotif();
