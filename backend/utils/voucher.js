const db = require('../config/db');

// Generate unique voucher code
const generateOnlineVoucherCode = async (profileName) => {
  let prefix = '';
  let codeCombination = '';
  let codeLength = null;
  
  if (profileName) {
    const [profileRows] = await db.query('SELECT prefix, code_combination, code_length FROM profiles_metadata WHERE groupname = ?', [profileName]);
    if (profileRows.length > 0) {
      prefix = profileRows[0].prefix || '';
      codeCombination = profileRows[0].code_combination || '';
      codeLength = profileRows[0].code_length;
    }
  }

  let chars = '123456789abcdefghjkmnpqrstuvwxyz'; // Default
  if (codeCombination === 'numeric') {
    chars = '123456789';
  } else if (codeCombination === 'alpha') {
    chars = 'abcdefghjkmnpqrstuvwxyz';
  } else if (codeCombination === 'uppercase') {
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  } else if (codeCombination === 'upalpha') {
    chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  } else if (codeCombination === 'alphanumeric') {
    chars = '123456789abcdefghjkmnpqrstuvwxyz';
  }

  let isUnique = false;
  let result = '';

  while (!isUnique) {
    result = prefix;
    if (!codeCombination) {
      // Default: starts with 1 number, then 6 chars
      const numbers = '123456789';
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
      const defaultChars = '123456789abcdefghjkmnpqrstuvwxyz';
      const len = codeLength ? Math.max(1, codeLength - 1) : 6;
      for (let i = 0; i < len; i++) {
        result += defaultChars.charAt(Math.floor(Math.random() * defaultChars.length));
      }
    } else {
      // Follow custom config
      const len = codeLength ? codeLength : 6;
      for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    const [rows] = await db.query('SELECT 1 FROM rincian_transaksi_voucher WHERE username = ?', [result]);
    if (rows.length === 0) {
      isUnique = true;
    }
  }

  return result;
};

// Register voucher to RADIUS and Metadata
const registerVoucherToRadius = async (voucherCode, profileName) => {
  const [profileRows] = await db.query('SELECT * FROM profiles_metadata WHERE groupname = ?', [profileName]);
  const profile = profileRows[0];

  await db.query('INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)', [voucherCode, 'Cleartext-Password', ':=', voucherCode]);
  await db.query('INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, ?)', [voucherCode, profileName, 1]);
  


  await db.query(`
    INSERT INTO rincian_transaksi_voucher (username, batch_id, status, sold_at, outlet_name)
    VALUES (?, ?, ?, NOW(), ?)
    ON DUPLICATE KEY UPDATE status = 'Terjual', sold_at = NOW()
  `, [voucherCode, 'ONLINE-STORE', 'Terjual', 'Online Store']);
};

module.exports = {
  generateOnlineVoucherCode,
  registerVoucherToRadius
};
