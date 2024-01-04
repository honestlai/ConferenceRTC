const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Add a route for the root path to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize WebSocket Server
const wss = new WebSocket.Server({ server });

let clientIdCounter = 0;
const clients = new Map(); // Map to hold client IDs and WebSocket connections

// WebSocket server connection event
wss.on('connection', (ws) => {
    const clientId = ++clientIdCounter;
    clients.set(clientId, ws);

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        parsedMessage.senderId = clientId; // Append sender ID to the message

        clients.forEach((client, id) => {
            if (id !== clientId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsedMessage));
            }
        });
    });

    ws.on('close', () => {
        clients.delete(clientId);
    });
});

// Start the server
server.listen(8080, () => {
    console.log('Server started on port 8080');
});
