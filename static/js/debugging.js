// debugging.js

function updateDebugBox(type, text) {
    let debugBox = document.getElementById('debugBox');
    let timestamp = new Date().toLocaleTimeString();

    let formattedMessage = `[${timestamp}] [${type}] ${text}\n`;

    if (debugBox) {
        debugBox.textContent += formattedMessage;
        debugBox.scrollTop = debugBox.scrollHeight;
    }
}


function safelySendWebSocketMessage(message) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
        updateDebugBox('Sent: ' + message);
    } else if (socket.readyState === WebSocket.CONNECTING) {
        // Queue the message if the WebSocket is still connecting
        messageQueue.push(message);
    } else {
        updateDebugBox('WebSocket not connected. Unable to send message.');
    }
}


function addWebSocketDebugging() {
    if (!socket) {
        return; // Exit if socket is not defined
    }

    let originalSocketOnOpen = socket.onopen;
    let originalSocketOnMessage = socket.onmessage;
    let originalSocketOnError = socket.onerror;
    let originalSocketOnClose = socket.onclose;

    socket.onopen = () => {
        originalSocketOnOpen?.apply(this, arguments);
        updateDebugBox("WebSocket connection established.");
    };

    socket.onmessage = event => {
        originalSocketOnMessage?.apply(this, arguments);
        let data = JSON.parse(event.data);
        if (data.offer || data.answer || data.iceCandidate) {
            updateDebugBox("Received WebRTC message: " + event.data);
        }
    };

    socket.onerror = error => {
        originalSocketOnError?.apply(this, arguments);
        updateDebugBox("WebSocket error: " + error);
    };

    socket.onclose = () => {
        originalSocketOnClose?.apply(this, arguments);
        updateDebugBox("WebSocket connection closed.");
    };
}

// Ensure this function is called after the socket has been initialized
