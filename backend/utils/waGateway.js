const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const axios = require('axios');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

let waSocket = null;
let currentQrBase64 = null;
let isConnected = false;

// Auto-initialize table
const initializeTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS wa_gateway_settings (
        id INT PRIMARY KEY DEFAULT 1,
        provider_type VARCHAR(32) DEFAULT 'baileys',
        api_url VARCHAR(255),
        api_token VARCHAR(255),
        is_enabled TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB;
    `);

    // Ensure api_url column exists for existing tables
    const [cols] = await db.query('SHOW COLUMNS FROM wa_gateway_settings');
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('api_url')) {
      await db.query('ALTER TABLE wa_gateway_settings ADD COLUMN api_url VARCHAR(255) AFTER provider_type');
    }

    await db.query(`
      INSERT IGNORE INTO wa_gateway_settings (id, provider_type, is_enabled)
      VALUES (1, 'baileys', 0)
    `);
  } catch (err) {
    console.error('Failed to init wa_gateway_settings table', err);
  }
};
initializeTable();

// Initialize Baileys Engine
const initBaileys = async () => {
  const authDir = path.join(__dirname, '..', '..', 'baileys_auth_info');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const logger = pino({ level: 'silent' });

  waSocket = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['RadiusBilling', 'Chrome', '1.0.0']
  });

  waSocket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      try {
        currentQrBase64 = await qrcode.toDataURL(qr);
      } catch (err) {
        console.error('Failed to generate QR base64', err);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      isConnected = false;
      console.log('WA Connection closed due to', lastDisconnect.error, ', reconnecting:', shouldReconnect);
      
      if (shouldReconnect) {
        setTimeout(initBaileys, 5000);
      } else {
        // Logged out
        console.log('WA logged out. Deleting auth folder...');
        currentQrBase64 = null;
        waSocket = null;
        try {
          fs.rmSync(authDir, { recursive: true, force: true });
        } catch(e) {}
      }
    } else if (connection === 'open') {
      console.log('WA Connected successfully!');
      isConnected = true;
      currentQrBase64 = null;
    }
  });

  waSocket.ev.on('creds.update', saveCreds);
};

const getStatus = () => {
  return {
    isConnected,
    qrBase64: currentQrBase64
  };
};

const startBaileys = async () => {
  if (!waSocket) {
    await initBaileys();
  }
};

const stopBaileys = () => {
  if (waSocket) {
    waSocket.logout();
    waSocket = null;
    isConnected = false;
    currentQrBase64 = null;
  }
};

const sendViaBaileys = async (phone, message) => {
  if (!isConnected || !waSocket) {
    throw new Error('Baileys Engine is not connected.');
  }
  let formattedPhone = phone.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.substring(1);
  }
  const jid = `${formattedPhone}@s.whatsapp.net`;
  await waSocket.sendMessage(jid, { text: message });
};

const sendViaFonnte = async (phone, message, token) => {
  const url = 'https://api.fonnte.com/send';
  try {
    const response = await axios.post(url, {
      target: phone,
      message: message
    }, {
      headers: {
        'Authorization': token
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Fonnte API Error: ${error.message}`);
  }
};

const sendViaWablas = async (phone, message, token, apiUrl) => {
  if (!apiUrl) throw new Error('Wablas API URL is required');
  const url = `${apiUrl}/api/send-message`;
  try {
    const response = await axios.post(url, {
      phone: phone,
      message: message
    }, {
      headers: {
        'Authorization': token
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Wablas API Error: ${error.message}`);
  }
};

const sendViaWatzap = async (phone, message, token) => {
  const url = 'https://api.watzap.id/v1/send_message';
  try {
    const response = await axios.post(url, {
      api_key: token,
      number_key: phone,
      message: message
    });
    return response.data;
  } catch (error) {
    throw new Error(`Watzap API Error: ${error.message}`);
  }
};

const sendViaRuangwa = async (phone, message, token) => {
  const url = 'https://app.ruangwa.id/api/send_message';
  try {
    // Ruangwa typically uses form data but axios handles basic urlencoded or json if accepted
    const response = await axios.post(url, {
      token: token,
      number: phone,
      message: message
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  } catch (error) {
    throw new Error(`RuangWA API Error: ${error.message}`);
  }
};

// Global Send Message Hub
const sendMessage = async (phone, message) => {
  try {
    const [rows] = await db.query('SELECT * FROM wa_gateway_settings WHERE id = 1');
    if (!rows || rows.length === 0 || rows[0].is_enabled !== 1) {
      console.log('WA Gateway is disabled. Message not sent.');
      return false;
    }

    const settings = rows[0];

    if (settings.provider_type === 'baileys') {
      await sendViaBaileys(phone, message);
    } else if (settings.provider_type === 'fonnte') {
      await sendViaFonnte(phone, message, settings.api_token);
    } else if (settings.provider_type === 'wablas') {
      await sendViaWablas(phone, message, settings.api_token, settings.api_url);
    } else if (settings.provider_type === 'watzap') {
      await sendViaWatzap(phone, message, settings.api_token);
    } else if (settings.provider_type === 'ruangwa') {
      await sendViaRuangwa(phone, message, settings.api_token);
    } else {
      console.log(`Unsupported WA provider: ${settings.provider_type}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('WhatsApp Send Error:', err);
    return false;
  }
};

module.exports = {
  startBaileys,
  stopBaileys,
  getStatus,
  sendMessage
};
