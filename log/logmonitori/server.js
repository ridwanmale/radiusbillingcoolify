const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Client connected to dashboard');
    
    // Simpan banyak koneksi SSH berdasarkan terminalId
    const sshClients = {};

    socket.on('start-log', (data) => {
        const { terminalId, host, port, username, password, containerDir, composeFile, serviceName } = data;

        if (!terminalId) return;

        // Tutup koneksi lama di terminal ini jika ada
        if (sshClients[terminalId]) {
            sshClients[terminalId].end();
            delete sshClients[terminalId];
        }

        const sshClient = new Client();
        sshClients[terminalId] = sshClient;

        socket.emit(`log-data-${terminalId}`, `\x1b[33m[SYSTEM]\x1b[0m Connecting to ${host}:${port} as ${username}...\r\n`);

        sshClient.on('ready', () => {
            socket.emit(`log-data-${terminalId}`, `\x1b[32m[SYSTEM]\x1b[0m Connected to ${host}. Executing docker compose logs...\r\n`);

            // Build command
            const composeFlag = composeFile ? `-f ${composeFile}` : '';
            const command = `cd ${containerDir} && docker compose ${composeFlag} logs -f ${serviceName}`;

            sshClient.exec(command, { pty: true }, (err, sshStream) => {
                if (err) {
                    socket.emit(`log-data-${terminalId}`, `\x1b[31m[ERROR]\x1b[0m Failed to execute command: ${err.message}\r\n`);
                    return;
                }

                sshStream.on('data', (data) => {
                    socket.emit(`log-data-${terminalId}`, data.toString('utf-8'));
                }).stderr.on('data', (data) => {
                    socket.emit(`log-data-${terminalId}`, data.toString('utf-8'));
                }).on('close', () => {
                    socket.emit(`log-data-${terminalId}`, `\r\n\x1b[33m[SYSTEM]\x1b[0m Stream closed.\r\n`);
                    if (sshClients[terminalId]) {
                        sshClients[terminalId].end();
                        delete sshClients[terminalId];
                    }
                });
            });
        }).on('error', (err) => {
            socket.emit(`log-data-${terminalId}`, `\x1b[31m[ERROR]\x1b[0m SSH Connection Error: ${err.message}\r\n`);
        }).connect({
            host: host,
            port: port || 22,
            username: username || 'root',
            password: password,
            readyTimeout: 10000
        });
    });

    socket.on('stop-log', (terminalId) => {
        if (sshClients[terminalId]) {
            socket.emit(`log-data-${terminalId}`, `\r\n\x1b[33m[SYSTEM]\x1b[0m Disconnecting from server...\r\n`);
            sshClients[terminalId].end();
            delete sshClients[terminalId];
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        Object.values(sshClients).forEach(client => client.end());
    });
});

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
    console.log(`Log Monitor Server running on http://localhost:${PORT}`);
    console.log(`Please open http://localhost:${PORT} in your browser.`);
});
