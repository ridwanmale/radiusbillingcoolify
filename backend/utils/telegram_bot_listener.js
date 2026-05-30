const fetch = require('node-fetch');
const db = require('../config/db');
const { sendTelegramNotification } = require('./telegram');

// In-memory store for Telegram Bot offsets
const botOffsets = new Map();
let isPolling = false;

const formatDT = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatBytes = (bytes) => {
  const b = parseFloat(bytes);
  if (isNaN(b) || b <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const initTelegramBotListener = () => {
  setInterval(async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      const [bots] = await db.query("SELECT outlet_name, bot_token, chat_id FROM telegram_settings WHERE is_enabled = 1 AND (outlet_name = 'Cek Voucher' OR outlet_name = 'Telegram Admin')");
      for (const bot of bots) {
        const token = bot.bot_token;
        if (!token) continue;
        const isAdminBot = bot.outlet_name === 'Telegram Admin';
        try {
          let offset = botOffsets.get(token);
          if (offset === undefined) {
            const initRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=1&offset=-1&timeout=0`);
            const initData = await initRes.json();
            offset = (initData.ok && initData.result.length > 0) ? initData.result[0].update_id + 1 : 0;
            botOffsets.set(token, offset);
          }
          const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&limit=100&timeout=0`);
          const data = await res.json();
          if (data.ok && data.result.length > 0) {
            for (const update of data.result) {
              offset = update.update_id + 1;
              botOffsets.set(token, offset);
              const message = update.message;
              if (!message || !message.text) continue;
              const text = message.text.trim();
              const chatId = message.chat.id;
              console.log(`[Telegram Bot] Received message: "${text}" from Chat ID: ${chatId} (Bot: ${bot.outlet_name})`);
              if (bot.chat_id && bot.chat_id.trim() !== '' && String(chatId) !== String(bot.chat_id).trim()) {
                console.log(`[Telegram Bot] Message ignored. Chat ID ${chatId} does not match configured chat_id ${bot.chat_id.trim()}`);
                continue;
              }

              let cleanText = text;
              
              // Map friendly button labels to commands
              const buttonMapping = {
                '💰 Pendapatan Hari Ini': '/pendapatan_hari_ini',
                '📅 Pendapatan Bulan Ini': '/pendapatan_bulan_ini',
                '🎟 Penjualan Hari Ini': '/penjualan_hari_ini',
                '📆 Penjualan Bulan Ini': '/penjualan_bulan_ini',
                '👥 User Aktif': '/user_aktif',
                '❓ Bantuan': '/help'
              };

              if (buttonMapping[text]) {
                cleanText = buttonMapping[text];
              } else if (text.includes('/')) {
                cleanText = '/' + text.split('/').slice(1).join('/').trim();
              }

              if (cleanText === '/start' || cleanText === '/help') {
                let welcomeMsg = `🤖 <b>Radius Billing Assistant Bot</b>\n\n` +
                                  `🔍 <code>/cek [kode]</code> - Cek status voucher\n`;
                let replyMarkup = null;
                if (isAdminBot) {
                  welcomeMsg += `📊 <b>ADMIN COMMANDS:</b>\n` +
                                `💰 <code>/pendapatan_hari_ini</code>\n` +
                                `📅 <code>/pendapatan_bulan_ini</code>\n` +
                                `🎟 <code>/penjualan_hari_ini</code>\n` +
                                `📆 <code>/penjualan_bulan_ini</code>\n` +
                                `👥 <code>/user_aktif</code>\n`;
                  
                  replyMarkup = {
                    keyboard: [
                      [{ text: '💰 Pendapatan Hari Ini' }, { text: '📅 Pendapatan Bulan Ini' }],
                      [{ text: '🎟 Penjualan Hari Ini' }, { text: '📆 Penjualan Bulan Ini' }],
                      [{ text: '👥 User Aktif' }, { text: '❓ Bantuan' }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: false
                  };
                }
                welcomeMsg += `\n❓ <code>/help</code> - Bantuan`;
                await sendTelegramNotification(token, chatId, welcomeMsg, replyMarkup);
              } else if (isAdminBot && (cleanText.startsWith('/pendapatan') || cleanText.startsWith('/penjualan') || cleanText === '/user_aktif')) {
                await handleAdminCommands(token, chatId, cleanText);
              } else {
                let voucherCode = '';
                if (cleanText.startsWith('/cek ') || cleanText.startsWith('/status ')) voucherCode = cleanText.split(/\s+/)[1];
                else if (!cleanText.includes(' ') && cleanText.length >= 4 && cleanText.length <= 15) voucherCode = cleanText;
                if (voucherCode) await handleVoucherCheck(token, chatId, voucherCode.trim());
              }
            }
          }
        } catch (e) { console.error(e.message); }
      }
    } catch (e) { console.error(e.message); } finally { isPolling = false; }
  }, 5000);
};

const handleAdminCommands = async (token, chatId, commandText) => {
  try {
    const parts = commandText.split(/\s+/);
    const command = parts[0];
    const now = new Date();
    let filterMonth = parseInt(parts[1]) || (now.getMonth() + 1);
    let filterYear = parseInt(parts[2]) || now.getFullYear();

    if (command === '/pendapatan_hari_ini' || command === '/pendapatan_bulan_ini') {
      const isDaily = command === '/pendapatan_hari_ini';
      const title = isDaily ? "HARI INI" : `BULAN ${filterMonth}/${filterYear}`;
      
      const voucherFilter = isDaily ? "AND DATE(vm.sold_at) = CURDATE()" : "AND MONTH(vm.sold_at) = ? AND YEAR(vm.sold_at) = ?";
      const journalFilter = isDaily ? "AND DATE(COALESCE(paid_at, tanggal)) = CURDATE()" : "AND MONTH(COALESCE(paid_at, tanggal)) = ? AND YEAR(COALESCE(paid_at, tanggal)) = ?";
      const pppoeFilter = isDaily ? "AND DATE(payment_date) = CURDATE()" : "AND MONTH(payment_date) = ? AND YEAR(payment_date) = ?";

      console.log(`[Telegram Bot Debug] Running income query. isDaily: ${isDaily}, month: ${filterMonth}, year: ${filterYear}`);
      
      // 1. Voucher Fisik: Join via radusergroup
      // Daily uses pm.hpp (match dashboard "analisis pemasukan" HPP metric)
      // Monthly uses pm.harga (match "total bulan halaman rincian transaksi voucher" Harga metric)
      const physicalSelect = isDaily ? "COALESCE(SUM(pm.hpp), 0)" : "COALESCE(SUM(pm.harga), 0)";
      const [physicalRows] = await db.query(`
        SELECT ${physicalSelect} as income 
        FROM rincian_transaksi_voucher vm
        LEFT JOIN radusergroup rug ON vm.username = rug.username
        LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname
        WHERE vm.status IN ('Terjual', 'Expired') 
        AND vm.batch_id != 'ONLINE-STORE'
        ${voucherFilter}
      `, isDaily ? [] : [filterMonth, filterYear]);
      
      const physical = physicalRows[0]?.income;

      // 2. Voucher Online: Filter category PEMASUKAN and Voucher Online from journal
      const [onlineRows] = await db.query(`
        SELECT COALESCE(SUM(total), 0) as income
        FROM jurnal_keuangan
        WHERE (status IN ('PAID', 'SUCCESS', 'settlement') OR status IS NULL OR status = '') 
        AND jenis LIKE '%Voucher Online%'
        ${journalFilter}
      `, isDaily ? [] : [filterMonth, filterYear]);
      
      const online = onlineRows[0]?.income;

      // 3. PPPoE Billing
      const [pppoeRows] = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as income
        FROM pppoe_payments
        WHERE 1=1
        ${pppoeFilter}
      `, isDaily ? [] : [filterMonth, filterYear]);
      
      const pppoe = pppoeRows[0]?.income;

      const physicalVal = parseFloat(physical) || 0;
      const onlineVal = parseFloat(online) || 0;
      const pppoeVal = parseFloat(pppoe) || 0;
      const totalVal = physicalVal + onlineVal + pppoeVal;

      console.log(`[Telegram Bot Debug] Query results - Physical: ${physicalVal}, Online: ${onlineVal}, PPPoE: ${pppoeVal}, Total: ${totalVal}`);
      
      const msg = `💰 <b>PENDAPATAN ${title}</b>\n\n` +
                  `• Voucher Fisik${isDaily ? ' (HPP)' : ''}: <b>Rp ${physicalVal.toLocaleString('id-ID')}</b>\n` +
                  `• Voucher Online: <b>Rp ${onlineVal.toLocaleString('id-ID')}</b>\n` +
                  `• PPPoE Billing: <b>Rp ${pppoeVal.toLocaleString('id-ID')}</b>\n` +
                  `━━━━━━━━━━━━━━━\n` +
                  `👉 <b>TOTAL: Rp ${totalVal.toLocaleString('id-ID')}</b>`;
      await sendTelegramNotification(token, chatId, msg);

    } else if (command === '/penjualan_hari_ini' || command === '/penjualan_bulan_ini') {
      const isDaily = command === '/penjualan_hari_ini';
      const title = isDaily ? "HARI INI" : `BULAN ${filterMonth}/${filterYear}`;
      
      const voucherFilter = isDaily ? "AND DATE(vm.sold_at) = CURDATE()" : "AND MONTH(vm.sold_at) = ? AND YEAR(vm.sold_at) = ?";
      const journalFilter = isDaily ? "AND DATE(COALESCE(paid_at, tanggal)) = CURDATE()" : "AND MONTH(COALESCE(paid_at, tanggal)) = ? AND YEAR(COALESCE(paid_at, tanggal)) = ?";

      // 1. Physical sales (excl ONLINE-STORE)
      const [[{ physical_count, physical_nominal }]] = await db.query(`
        SELECT COUNT(*) as physical_count, COALESCE(SUM(pm.harga), 0) as physical_nominal
        FROM rincian_transaksi_voucher vm
        LEFT JOIN radusergroup rug ON vm.username = rug.username
        LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname
        WHERE vm.status IN ('Terjual', 'Expired')
        AND vm.batch_id != 'ONLINE-STORE'
        ${voucherFilter}
      `, isDaily ? [] : [filterMonth, filterYear]);

      // 2. Online sales
      const [[{ online_count, online_nominal }]] = await db.query(`
        SELECT COUNT(*) as online_count, COALESCE(SUM(total), 0) as online_nominal
        FROM jurnal_keuangan 
        WHERE (status IN ('PAID', 'SUCCESS', 'settlement') OR status IS NULL OR status = '') 
        AND jenis LIKE '%Voucher Online%'
        ${journalFilter}
      `, isDaily ? [] : [filterMonth, filterYear]);

      const pCount = parseInt(physical_count) || 0;
      const pNominal = parseFloat(physical_nominal) || 0;
      const oCount = parseInt(online_count) || 0;
      const oNominal = parseFloat(online_nominal) || 0;
      
      const msg = `🎟 <b>PENJUALAN VOUCHER ${title}</b>\n\n` +
                  `• Voucher Fisik: <b>${pCount} Voucher</b> (Rp ${pNominal.toLocaleString('id-ID')})\n` +
                  `• Voucher Online: <b>${oCount} Voucher</b> (Rp ${oNominal.toLocaleString('id-ID')})\n` +
                  `━━━━━━━━━━━━━━━\n` +
                  `👉 <b>TOTAL: ${(pCount + oCount)} Voucher</b> (Rp ${(pNominal + oNominal).toLocaleString('id-ID')})`;
      await sendTelegramNotification(token, chatId, msg);

    } else if (command === '/user_aktif') {
      const [[{ active_users }]] = await db.query(`
        SELECT COUNT(DISTINCT username) as active_users FROM radacct 
        WHERE acctstoptime IS NULL 
        AND COALESCE(acctupdatetime, acctstarttime) > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);
      await sendTelegramNotification(token, chatId, `👥 <b>USER AKTIF SAAT INI</b>\n\nTerdeteksi <b>${active_users || 0} User</b> sedang online.`);
    }
  } catch (err) {
    console.error(err.message);
    await sendTelegramNotification(token, chatId, `⚠️ <b>GAGAL:</b> ${err.message}`);
  }
};

const handleVoucherCheck = async (token, chatId, voucherCode) => {
  try {
    const [vRows] = await db.query(`
      SELECT 
        vm.username, 
        vm.status, 
        vm.batch_id,
        vm.outlet_name,
        vm.activated_at,
        vm.expiration_date,
        pm.masa_aktif, 
        pm.satuan, 
        pm.harga, 
        pm.groupname as profile 
      FROM rincian_transaksi_voucher vm 
      LEFT JOIN radusergroup rug ON vm.username = rug.username 
      LEFT JOIN profiles_metadata pm ON rug.groupname = pm.groupname 
      WHERE vm.username = ?
    `, [voucherCode]);
    let vInfo = vRows[0];
    
    if (!vInfo) return await sendTelegramNotification(token, chatId, `❌ <b>VOUCHER TIDAK DITEMUKAN</b>`);
    
    const [sessions] = await db.query(`SELECT acctstarttime, acctstoptime, acctinputoctets, acctoutputoctets, callingstationid as mac FROM radacct WHERE username = ? ORDER BY radacctid DESC`, [voucherCode]);
    const totalBytes = sessions.reduce((sum, s) => sum + (parseInt(s.acctinputoctets) || 0) + (parseInt(s.acctoutputoctets) || 0), 0);
    
    const tipeVoucher = vInfo.batch_id === 'ONLINE-STORE' ? 'Voucher Online' : 'Voucher Fisik';
    const outletAsal = vInfo.outlet_name && vInfo.outlet_name.trim() !== '' ? vInfo.outlet_name : 'System';
    
    let statusText = '';
    let extraInfo = '';
    const now = new Date();
    
    const isExpired = vInfo.expiration_date && now > new Date(vInfo.expiration_date);
    const isOnline = sessions.length > 0 && sessions[0].acctstoptime === null;
    const isOffline = sessions.length > 0 && sessions[0].acctstoptime !== null;
    
    if (isExpired) {
      statusText = '🔴 KADALUARSA (EXPIRED)';
      if (sessions.length > 0) {
        extraInfo = `Login terakhir: ${formatDT(sessions[0].acctstarttime)}\n` +
                    `Kadaluarsa pada: ${formatDT(vInfo.expiration_date)}`;
      } else {
        extraInfo = `Kadaluarsa pada: ${formatDT(vInfo.expiration_date)}`;
      }
    } else if (isOnline) {
      statusText = '⚡️ SEDANG AKTIF (ONLINE)';
      extraInfo = `Sedang digunakan oleh perangkat dengan MAC: ${sessions[0].mac || '-'}\n` +
                  `Login sejak: ${formatDT(sessions[0].acctstarttime)}\n` +
                  `Kadaluarsa pada: ${formatDT(vInfo.expiration_date)}`;
    } else if (isOffline) {
      statusText = '🟠 OFFLINE (AKTIF / SUDAH DIGUNAKAN)';
      extraInfo = `Login terakhir: ${formatDT(sessions[0].acctstarttime)}\n` +
                  `Kadaluarsa pada: ${formatDT(vInfo.expiration_date)}`;
    } else {
      statusText = '🟢 READY / BELUM DIGUNAKAN (READY STOCK)';
      extraInfo = `Voucher belum digunakan (Ready Stock)`;
    }

    const tglAktif = sessions.length > 0 ? formatDT(sessions[0].acctstarttime) : '-';
    
    const msg = `Kode Voucher: <b>${vInfo.username}</b>\n` +
                `Tipe Voucher: <b>${tipeVoucher}</b>\n` +
                `Profil Paket: <b>${vInfo.profile || '-'}</b>\n` +
                `Harga Paket : <b>Rp ${parseFloat(vInfo.harga || 0).toLocaleString('id-ID')}</b>\n` +
                `Masa Aktif  : <b>${vInfo.masa_aktif || '-'} ${vInfo.satuan || ''}</b>\n` +
                `Outlet Asal : <b>${outletAsal}</b>\n` +
                `TGL AKTIF  : <b>${tglAktif}</b>\n` +
                `Pemakaian Data: <b>${formatBytes(totalBytes)}</b>\n\n` +
                `📊 <b>STATUS OPERASIONAL:</b>\n` +
                `<b>${statusText}</b>\n` +
                `${extraInfo}`;

    await sendTelegramNotification(token, chatId, msg);
  } catch (e) { console.error(e); }
};

module.exports = { initTelegramBotListener };
