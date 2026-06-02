const mysql = require('mysql2/promise');

const primaryConfig = {
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'radius',
  password: process.env.DB_PASSWORD || 'adara',
  database: process.env.DB_NAME || 'radius',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
  multipleStatements: true,
  connectTimeout: 2000
};

// sementara arahkan backup ke db juga, atau kosongkan env DB_BACKUP_HOST
const backupConfig = {
  ...primaryConfig,
  host: process.env.DB_BACKUP_HOST || 'db',
  port: parseInt(process.env.DB_BACKUP_PORT || '3306', 10)
};

let primaryPool = mysql.createPool(primaryConfig);
let backupPool = process.env.DB_BACKUP_HOST ? mysql.createPool(backupConfig) : null;

let isPrimaryAlive = true;
let lastCheckTime = 0;

const checkPrimaryStatus = async () => {
  const now = Date.now();
  if (now - lastCheckTime < 10000) return isPrimaryAlive;
  lastCheckTime = now;

  try {
    const conn = await mysql.createConnection({
      ...primaryConfig,
      connectTimeout: 2000
    });
    await conn.ping();
    await conn.end();

    if (!isPrimaryAlive) {
      console.log('[DB Failover] Primary database is back online. Switching back to primary.');
      isPrimaryAlive = true;
    }
  } catch (err) {
    if (isPrimaryAlive) {
      console.error('[DB Failover] Primary database connection failed:', err.message);
      if (backupPool) {
        console.warn('[DB Failover] Routing queries to backup database.');
        isPrimaryAlive = false;
      }
    }
  }
  return isPrimaryAlive;
};

const failoverPoolProxy = {
  query: async function (...args) {
    const primaryActive = await checkPrimaryStatus();

    if (primaryActive || !backupPool) {
      try {
        return await primaryPool.query(...args);
      } catch (err) {
        if (
          backupPool &&
          (err.code === 'ECONNREFUSED' ||
            err.code === 'ETIMEDOUT' ||
            err.code === 'PROTOCOL_CONNECTION_LOST')
        ) {
          console.error('[DB Failover] Primary query failed. Retrying on backup...');
          isPrimaryAlive = false;
          return await backupPool.query(...args);
        }
        throw err;
      }
    } else {
      try {
        return await backupPool.query(...args);
      } catch (err) {
        console.error('[DB Failover] Backup query failed. Trying primary:', err.message);
        return await primaryPool.query(...args);
      }
    }
  },

  execute: async function (...args) {
    const primaryActive = await checkPrimaryStatus();

    if (primaryActive || !backupPool) {
      try {
        return await primaryPool.execute(...args);
      } catch (err) {
        if (
          backupPool &&
          (err.code === 'ECONNREFUSED' ||
            err.code === 'ETIMEDOUT' ||
            err.code === 'PROTOCOL_CONNECTION_LOST')
        ) {
          console.error('[DB Failover] Primary execute failed. Retrying on backup...');
          isPrimaryAlive = false;
          return await backupPool.execute(...args);
        }
        throw err;
      }
    } else {
      try {
        return await backupPool.execute(...args);
      } catch (err) {
        console.error('[DB Failover] Backup execute failed. Trying primary:', err.message);
        return await primaryPool.execute(...args);
      }
    }
  },

  getConnection: async function () {
    const primaryActive = await checkPrimaryStatus();

    if (primaryActive || !backupPool) {
      try {
        return await primaryPool.getConnection();
      } catch (err) {
        if (backupPool) {
          console.error('[DB Failover] Failed to get primary connection. Falling back to backup...');
          isPrimaryAlive = false;
          return await backupPool.getConnection();
        }
        throw err;
      }
    } else {
      return await backupPool.getConnection();
    }
  },

  end: async function () {
    const promises = [primaryPool.end()];
    if (backupPool) promises.push(backupPool.end());
    return Promise.all(promises);
  }
};

module.exports = failoverPoolProxy;