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
    let sshClient = null;
    let stream = null;

    socket.on('start-log', (data) => {
        const { host, port, username, password, containerDir, serviceName } = data;

        if (sshClient) {
            sshClient.end();
        }

        sshClient = new Client();

        socket.emit('log-data', `\x1b[33m[SYSTEM]\x1b[0m Connecting to ${host}:${port} as ${username}...\r\n`);

        sshClient.on('ready', () => {
            socket.emit('log-data', `\x1b[32m[SYSTEM]\x1b[0m Connected to ${host}. Executing docker compose logs...\r\n`);

            // Tentukan file docker-compose berdasarkan direktori
            let composeFile = '';
            if (containerDir.includes('core')) composeFile = '-f docker-compose_core.yml';
            else if (containerDir.includes('web')) composeFile = '-f docker-compose_web.yml';
            else if (containerDir.includes('portal') || containerDir.includes('armradius')) composeFile = '-f docker-compose_portalonlinevoucher.yml';
            
            // Build command
            const command = `cd ${containerDir} && docker compose ${composeFile} logs -f ${serviceName}`;

            sshClient.exec(command, { pty: true }, (err, sshStream) => {
                if (err) {
                    socket.emit('log-data', `\x1b[31m[ERROR]\x1b[0m Failed to execute command: ${err.message}\r\n`);
                    return;
                }

                stream = sshStream;

                stream.on('data', (data) => {
                    socket.emit('log-data', data.toString('utf-8'));
                }).stderr.on('data', (data) => {
                    socket.emit('log-data', data.toString('utf-8'));
                }).on('close', () => {
                    socket.emit('log-data', `\r\n\x1b[33m[SYSTEM]\x1b[0m Stream closed.\r\n`);
                    sshClient.end();
                });
            });
        }).on('error', (err) => {
            socket.emit('log-data', `\x1b[31m[ERROR]\x1b[0m SSH Connection Error: ${err.message}\r\n`);
        }).connect({
            host: host,
            port: port || 22,
            username: username || 'root',
            password: password,
            readyTimeout: 10000
        });
    });

    socket.on('stop-log', () => {
        if (sshClient) {
            socket.emit('log-data', `\r\n\x1b[33m[SYSTEM]\x1b[0m Disconnecting from server...\r\n`);
            sshClient.end();
            sshClient = null;
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        if (sshClient) {
            sshClient.end();
        }
    });
});

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
    console.log(`Log Monitor Server running on http://localhost:${PORT}`);
    console.log(`Please open http://localhost:${PORT} in your browser.`);
});
