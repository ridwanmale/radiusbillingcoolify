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
    const container = await findRadiusContainer();
    await dockerRequest('POST', `/containers/${container.Id}/kill?signal=HUP`);
    console.log(`[RADIUS-SYNC] Reload signal sent to ${container.Names?.[0] || container.Id}`);
    return true;
  } catch (err) {
    console.error('[RADIUS-SYNC] Could not send reload signal to radius container:', err.message);
    return false;
  }
}

// alias untuk kompatibilitas kode lama
const syncRadiusClientsConf = reloadRadiusContainer;

module.exports = {
  reloadRadiusContainer,
  syncRadiusClientsConf
};