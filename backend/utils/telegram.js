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

const FormData = require('form-data');

/**
 * Send a Document (e.g. PDF buffer) via Telegram Bot
 */
const sendTelegramDocument = async (token, chatId, documentBuffer, filename, caption = '') => {
  try {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    
    // Puppeteer returns Uint8Array, form-data expects a proper Node Buffer
    const buffer = Buffer.isBuffer(documentBuffer) ? documentBuffer : Buffer.from(documentBuffer);
    
    form.append('document', buffer, { filename, contentType: 'application/pdf', knownLength: buffer.length });

    const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: form,
      timeout: 60000 // 60s timeout for large uploads
    });
    
    const result = await response.json();
    if (!result.ok) {
      console.error('[Telegram] API Error (sendDocument):', result.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Telegram] Connection Error (sendDocument):', err.message);
    return false;
  }
};

module.exports = {
  sendTelegramNotification,
  notifyTelegram,
  sendTelegramDocument
};
