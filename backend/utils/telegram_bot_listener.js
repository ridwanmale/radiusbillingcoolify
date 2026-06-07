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
                '🖨 Generate Voucher': '/preset_menu',
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
                                `👥 <code>/user_aktif</code>\n` +
                                `🖨 <code>/preset_menu</code>\n`;
                  
                  replyMarkup = {
                    keyboard: [
                      [{ text: '💰 Pendapatan Hari Ini' }, { text: '📅 Pendapatan Bulan Ini' }],
                      [{ text: '🎟 Penjualan Hari Ini' }, { text: '📆 Penjualan Bulan Ini' }],
                      [{ text: '🖨 Generate Voucher' }, { text: '👥 User Aktif' }],
                      [{ text: '❓ Bantuan' }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: false
                  };
                }
                welcomeMsg += `\n❓ <code>/help</code> - Bantuan`;
                await require('./telegram').sendTelegramNotification(token, chatId, welcomeMsg, replyMarkup);
              } else if (isAdminBot && (cleanText.startsWith('/pendapatan') || cleanText.startsWith('/penjualan') || cleanText === '/user_aktif')) {
                await handleAdminCommands(token, chatId, cleanText);
              } else if (isAdminBot && (cleanText === '/preset_menu' || cleanText.startsWith('/gen'))) {
                await handleGenerateCommands(token, chatId, cleanText);
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

const handleGenerateCommands = async (token, chatId, commandText) => {
  try {
    const { sendTelegramNotification, sendTelegramDocument } = require('./telegram');
    
    if (commandText === '/preset_menu') {
      const [presets] = await db.query('SELECT * FROM generate_presets ORDER BY id ASC');
      if (presets.length === 0) {
        return await sendTelegramNotification(token, chatId, `⚠️ <b>Belum ada Preset.</b>\nSilakan buat Preset di menu Print Cepat terlebih dahulu.`);
      }
      
      let msg = `🖨 <b>DAFTAR PRESET VOUCHER</b>\n\n`;
      presets.forEach(p => {
        msg += `<b>ID: ${p.id}</b> - ${p.preset_name}\n`;
        msg += `└ Profile: ${p.profile} | Panjang: ${p.panjang_user}\n`;
      });
      
      msg += `\n👉 <b>CARA GENERATE & PRINT:</b>\n`;
      msg += `Ketik perintah: <code>/gen [ID_PRESET] [JUMLAH]</code>\n`;
      msg += `Contoh (bikin 10 pcs dari Preset ID 1): <code>/gen 1 10</code>`;
      
      return await sendTelegramNotification(token, chatId, msg);
    }
    
    if (commandText.startsWith('/gen')) {
      const parts = commandText.split(/\s+/);
      const presetId = parts[1];
      const qty = parseInt(parts[2]) || 1;
      
      if (!presetId || isNaN(qty) || qty < 1 || qty > 1000) {
        return await sendTelegramNotification(token, chatId, `⚠️ <b>Format Salah.</b>\nGunakan: <code>/gen [ID_PRESET] [JUMLAH]</code>\nMaksimal 1000 voucher sekali generate.`);
      }
      
      // Fetch preset
      const [presets] = await db.query('SELECT * FROM generate_presets WHERE id = ?', [presetId]);
      if (presets.length === 0) {
        return await sendTelegramNotification(token, chatId, `⚠️ <b>Preset ID ${presetId} tidak ditemukan.</b>`);
      }
      
      const p = presets[0];
      await sendTelegramNotification(token, chatId, `⏳ <b>Memproses...</b>\nMembuat ${qty} Voucher dari Preset: ${p.preset_name}...`);
      
      // Generate Logic (Copied from backend/routes/vouchers.js)
      const generateCode = (length, charsetType) => {
        let charset = '';
        switch (charsetType) {
          case 'lower': charset = 'abcdefghjkmnpqrstuvwxyz'; break;
          case 'upper': charset = 'ABCDEFGHJKMNPQRSTUVWXYZ'; break;
          case 'numeric': charset = '123456789'; break;
          case 'alpha_num': default: charset = '123456789abcdefghjkmnpqrstuvwxyz'; break;
        }
        let result = '';
        for (let i = 0; i < length; i++) {
          if (charsetType === 'alpha_num' && i === 0) {
            result += '123456789'.charAt(Math.floor(Math.random() * 9));
          } else {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
          }
        }
        return result;
      };

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const batch_id = 'TGBOT-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
        let successCount = 0;
        const generatedCodes = [];
        
        for (let i = 0; i < qty; i++) {
          let uniqueCode = '';
          let isUnique = false;
          let attempts = 0;
          while (!isUnique && attempts < 10) {
            const rawCode = generateCode(p.panjang_user || 6, p.charset_type || 'alpha_num');
            uniqueCode = (p.prefix || '') + rawCode;
            const [exist] = await connection.query('SELECT 1 FROM radcheck WHERE username = ?', [uniqueCode]);
            if (exist.length === 0) isUnique = true;
            attempts++;
          }
          if (!isUnique) continue;
          
          await connection.query('INSERT INTO radcheck (username, attribute, op, value) VALUES (?, "Cleartext-Password", ":=", ?)', [uniqueCode, uniqueCode]);
          await connection.query('INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, ?)', [uniqueCode, p.profile, 1]);
          await connection.query('INSERT INTO rincian_transaksi_voucher (username, batch_id, outlet_name, status) VALUES (?, ?, ?, "Aktif")', [uniqueCode, batch_id, p.server === 'all' ? '' : (p.server || '')]);
          
          generatedCodes.push(uniqueCode);
          successCount++;
        }
        await connection.commit();
        connection.release();

        if (successCount === 0) {
          return await sendTelegramNotification(token, chatId, `⚠️ <b>Gagal membuat voucher.</b> Silakan coba lagi.`);
        }
        
        // Notify success and start generating PDF
        await sendTelegramNotification(token, chatId, `✅ <b>Berhasil Membuat ${successCount} Voucher!</b>\nSedang menyiapkan berkas PDF untuk dicetak, mohon tunggu sebentar...`);
        
        const { generateVoucherPDF } = require('./pdfGenerator');
        try {
          const pdfBuffer = await generateVoucherPDF(batch_id, p.template_id);
          const filename = `Vouchers_${p.preset_name.replace(/\\s+/g, '_')}_${successCount}pcs.pdf`;
          
          await sendTelegramDocument(token, chatId, pdfBuffer, filename, `📄 Berikut adalah file siap cetak untuk ${successCount} Voucher Anda.\nBatch ID: ${batch_id}`);
          
          // Send the actual text codes
          const codesText = generatedCodes.map((c, i) => `${i+1}. ${c}`).join('\n');
          if (generatedCodes.length <= 100) {
            const codesMsg = `🎟 <b>Daftar Kode Voucher:</b>\n<code>${codesText}</code>`;
            await sendTelegramNotification(token, chatId, codesMsg);
          } else {
            const txtBuffer = Buffer.from(`Daftar Kode Voucher (${successCount} pcs) - Batch ID: ${batch_id}\n\n${codesText}`);
            await sendTelegramDocument(token, chatId, txtBuffer, `Kode_Voucher_${batch_id}.txt`, `📄 File Teks daftar kode voucher (${successCount} pcs)`);
          }
        } catch (pdfErr) {
          console.error('PDF Gen Error:', pdfErr);
          await sendTelegramNotification(token, chatId, `⚠️ <b>Berhasil membuat voucher, namun gagal generate PDF.</b>\nCetak manual via Web di Print Cepat.`);
        }

      } catch (genErr) {
        await connection.rollback();
        connection.release();
        console.error('Generate Vouchers Error:', genErr);
        await sendTelegramNotification(token, chatId, `⚠️ <b>Error:</b> ${genErr.message}`);
      }
    }
  } catch (err) {
    console.error(err.message);
    const { sendTelegramNotification } = require('./telegram');
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
