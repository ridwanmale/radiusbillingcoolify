const fetch = require('node-fetch');
const db = require('../config/db');

/**
 * Send a Telegram notification using a bot token and chat ID.
 */
const sendTelegramNotification = async (token, chatId, message, replyMarkup = null) => {
  try {
    const payload = { chat_id: chatId, text: message, parse_mode: 'HTML' };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 10000 // 10 seconds timeout to prevent hanging on unstable connection
    });
    const result = await response.json();
    if (!result.ok) {
      console.error('[Telegram] API Error:', result.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Telegram] Connection Error:', err.message);
    return false;
  }
};

/**
 * Send a notification to the configured Telegram bot (Global or Outlet specific).
 */
const notifyTelegram = async (message, outletName = 'Global') => {
  try {
    let query = 'SELECT * FROM telegram_settings WHERE (outlet_name = ? OR outlet_name = "Global") AND is_enabled = 1 ORDER BY (outlet_name = ?) DESC LIMIT 1';
    let params = [outletName, outletName];

    if (outletName === 'Payment Gateway') {
      query = 'SELECT * FROM telegram_settings WHERE outlet_name = ? AND is_enabled = 1 LIMIT 1';
      params = [outletName];
    }

    const [botRows] = await db.query(query, params);

    if (botRows.length > 0) {
      const { bot_token, chat_id } = botRows[0];
      return await sendTelegramNotification(bot_token, chat_id, message);
    }
    return false;
  } catch (err) {
    console.error('[Telegram Notify] Error:', err.message);
    return false;
  }
};


/**
 * Kirim notifikasi khusus ke Bot Admin
 */
const notifyAdmin = async (message) => {
  return await notifyTelegram(message, 'Admin');
};

module.exports = {
  sendTelegramNotification,
  notifyTelegram,
  notifyAdmin // Pastikan ini diekspor
};

module.exports = {
  sendTelegramNotification,
  notifyTelegram
};
