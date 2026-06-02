const http = require('http');

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
const RADIUS_CONTAINER_PREFIX = process.env.RADIUS_CONTAINER_PREFIX || 'radius-';

function dockerRequest(method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path,
        method,
        headers: { 'Content-Type': 'application/json' }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : {});
            } catch {
              resolve(data);
            }
          } else {
            reject(new Error(`Docker API returned status ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function findRadiusContainer() {
  const containers = await dockerRequest('GET', '/containers/json');

  const match = containers.find((container) => {
    const names = container.Names || [];
    return names.some((name) => name.startsWith(`/${RADIUS_CONTAINER_PREFIX}`));
  });

  if (!match) {
    throw new Error(`No running radius container found with prefix: ${RADIUS_CONTAINER_PREFIX}`);
  }

  return match;
}

async function reloadRadiusContainer() {
  try {
    // 1. Coba reload lewat Docker API lokal (untuk setup single VPS)
    const container = await findRadiusContainer();
    await dockerRequest('POST', `/containers/${container.Id}/kill?signal=HUP`);
    console.log(`[RADIUS-SYNC] Reload signal sent locally to ${container.Names?.[0] || container.Id}`);
    return true;
  } catch (err) {
    // 2. Jika gagal lokal, fallback ke Webhook eksternal (untuk setup terpisah)
    console.log('[RADIUS-SYNC] Local docker container not found, attempting remote webhook...');
    
    return new Promise((resolve) => {
      const dbHost = process.env.DB_HOST || '127.0.0.1';
      const req = http.request(
        {
          hostname: dbHost,
          port: 8080,
          path: '/',
          method: 'GET',
          timeout: 5000 // 5 seconds timeout
        },
        (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[RADIUS-SYNC] Successfully reloaded remote FreeRADIUS at ${dbHost}:8080`);
            resolve(true);
          } else {
            console.error(`[RADIUS-SYNC] Remote webhook returned status ${res.statusCode}`);
            resolve(false);
          }
        }
      );

      req.on('timeout', () => {
        req.destroy();
        console.error('[RADIUS-SYNC] Remote webhook timed out');
        resolve(false);
      });

      req.on('error', (e) => {
        console.error(`[RADIUS-SYNC] Could not reach remote webhook at ${dbHost}:8080 - ${e.message}`);
        resolve(false);
      });

      req.end();
    });
  }
}

// alias untuk kompatibilitas kode lama
const syncRadiusClientsConf = reloadRadiusContainer;

module.exports = {
  reloadRadiusContainer,
  syncRadiusClientsConf
};