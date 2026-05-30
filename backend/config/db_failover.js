const mysql = require('mysql2/promise');

const primaryConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'radius',
  password: process.env.DB_PASSWORD || 'radius_password',
  database: process.env.DB_NAME || 'radius',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
  multipleStatements: true,
  connectTimeout: 2000
};

// Backup host (LXC 3 - Cloud)
const backupConfig = {
  ...primaryConfig,
  host: process.env.DB_BACKUP_HOST || 'localhost', // Will fallback to localhost if not defined
  port: parseInt(process.env.DB_BACKUP_PORT) || 3306
};

let primaryPool = mysql.createPool(primaryConfig);
let backupPool = process.env.DB_BACKUP_HOST ? mysql.createPool(backupConfig) : null;

let isPrimaryAlive = true;
let lastCheckTime = 0;

// Helper to check primary server status
const checkPrimaryStatus = async () => {
  const now = Date.now();
  // Limit health checks to once every 10 seconds to avoid spamming connections
  if (now - lastCheckTime < 10000) return isPrimaryAlive;
  lastCheckTime = now;

  try {
    const conn = await mysql.createConnection({
      ...primaryConfig,
      connectTimeout: 2000 // 2 seconds timeout for quick check
    });
    await conn.ping();
    await conn.end();
    
    if (!isPrimaryAlive) {
      console.log('?? [DB Failover] Primary Database (LXC 1) is BACK ONLINE. Switching back to Primary.');
      isPrimaryAlive = true;
    }
  } catch (err) {
    if (isPrimaryAlive) {
      console.error('?? [DB Failover] Primary Database (LXC 1) connection failed:', err.message);
      if (backupPool) {
        console.warn('?? [DB Failover] Automatically routing queries to Backup Database (LXC 3).');
        isPrimaryAlive = false;
      }
    }
  }
  return isPrimaryAlive;
};

// Drop-in wrapper that matches the mysql2 pool API transparently
const failoverPoolProxy = {
  // Execute database query with automatic failover fallback
  query: async function (...args) {
    const primaryActive = await checkPrimaryStatus();
    
    if (primaryActive || !backupPool) {
      try {
        return await primaryPool.query(...args);
      } catch (err) {
        // If query fails on primary due to sudden network loss, fallback to backup immediately
        if (backupPool && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
          console.error('?? [DB Failover] Primary Database went down during query execution. Retrying on Backup (LXC 3)...');
          isPrimaryAlive = false;
          return await backupPool.query(...args);
        }
        throw err;
      }
    } else {
      try {
        return await backupPool.query(...args);
      } catch (err) {
        // If backup also fails, try primary one last time in case it recovered
        console.error('?? [DB Failover] Backup Database query failed. Trying Primary as last resort:', err.message);
        return await primaryPool.query(...args);
      }
    }
  },

  // Execute database prepared statement with automatic failover fallback
  execute: async function (...args) {
    const primaryActive = await checkPrimaryStatus();
    
    if (primaryActive || !backupPool) {
      try {
        return await primaryPool.execute(...args);
      } catch (err) {
        if (backupPool && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
          console.error('?? [DB Failover] Primary Database went down during execute execution. Retrying on Backup (LXC 3)...');
          isPrimaryAlive = false;
          return await backupPool.execute(...args);
        }
        throw err;
      }
    } else {
      try {
        return await backupPool.execute(...args);
      } catch (err) {
        console.error('?? [DB Failover] Backup Database execute failed. Trying Primary as last resort:', err.message);
        return await primaryPool.execute(...args);
      }
    }
  },

  // Retrieve raw connection (needed for transactions)
  getConnection: async function () {
    const primaryActive = await checkPrimaryStatus();
    if (primaryActive || !backupPool) {
      try {
        return await primaryPool.getConnection();
      } catch (err) {
        if (backupPool) {
          console.error('?? [DB Failover] Failed to get connection from Primary. Falling back to Backup (LXC 3)...');
          isPrimaryAlive = false;
          return await backupPool.getConnection();
        }
        throw err;
      }
    } else {
      return await backupPool.getConnection();
    }
  },

  // End all connection pools
  end: async function () {
    const promises = [primaryPool.end()];
    if (backupPool) promises.push(backupPool.end());
    return Promise.all(promises);
  }
};

module.exports = failoverPoolProxy;
