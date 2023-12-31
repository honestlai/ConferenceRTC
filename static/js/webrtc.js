let peerConnection;
let socket;
let messageQueue = [];
let reconnectAttempts = 0;
const maxReconnectAttempts = 5; // Limit the number of reconnection attempts


// Function to fetch the session ID and set up WebRTC
function getSessionIdAndSetupWebRTC() {
    return fetch('/session_id').then(response => response.text()).then(sessionId => {
        initializeWebRTC(sessionId);
        return sessionId; // Return sessionId for further use
    }).catch(error => {
        console.error('Error fetching session ID:', error);
    });
}

// Function to initialize WebRTC peer connection and WebSocket
function initializeWebRTC(sessionId) {
    // Initialize WebRTC peer connection with STUN server configuration
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            sendWebSocketMessage(JSON.stringify({ 'iceCandidate': event.candidate, 'session_id': sessionId }));
        }
    };

    // Handle ontrack events
    peerConnection.ontrack = event => {
        const audioOutput = document.getElementById('audioOutput');
        if (audioOutput && event.streams[0]) {
            audioOutput.srcObject = event.streams[0];
        }
    };

    // Initialize WebSocket and attach event handlers
    initializeWebSocket(sessionId);
}

// Function to initialize WebSocket
function initializeWebSocket(sessionId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("WebSocket connection established.");
        reconnectAttempts = 0;  // Reset reconnection attempts on successful open
        sendQueuedMessages();  // Send queued messages
    };


    socket.onmessage = event => {
        const data = JSON.parse(event.data);

        if (data.answer) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
                .then(() => {
                    onWebRTCConnected(); // Call this only after the connection is successfully established
                })
                .catch(error => {
                    updateDebugBox("Failed to establish WebRTC connection: " + error);
                });
        } else if (data.iceCandidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(data.iceCandidate));
        }
    };

    socket.onclose = () => {
        console.log("WebSocket connection closed.");
        if (reconnectAttempts < maxReconnectAttempts) {
            console.log("Attempting to reconnect...");
            setTimeout(() => initializeWebSocket(sessionId), 3000);
            reconnectAttempts++;
        } else {
            console.log("Max reconnection attempts reached.");
            reconnectAttempts = 0;  // Reset for potential future reconnections
        }
    };
}

// Function to send queued messages
function sendQueuedMessages() {
    while (messageQueue.length > 0) {
        if (socket.readyState === WebSocket.OPEN) {
            const message = messageQueue.shift();
            socket.send(message);
        }
    }
}

// Function to send a message through WebSocket
function sendWebSocketMessage(message) {
    // Only send the message if the WebSocket is in the OPEN state
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
    } else if (socket.readyState !== WebSocket.CLOSING && socket.readyState !== WebSocket.CLOSED) {
        // Queue the message if the WebSocket is not closing or closed
        messageQueue.push(message);
    }
}

// Function to create and send a WebRTC offer
function createAndSendOffer(sessionId) {
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            sendWebSocketMessage(JSON.stringify({ 'offer': peerConnection.localDescription, 'session_id': sessionId }));
        })
        .catch(error => console.error('Error creating offer:', error));
}

// Function to add a media stream to the peer connection
function addMediaStream(stream) {
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
}

// Function to close the WebRTC connection
function closeWebRTCConnection() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
}

// Call this function to start the WebRTC connection
function startWebRTCConnection() {
    getSessionIdAndSetupWebRTC().then(sessionId => {
        createAndSendOffer(sessionId);
    });
}

// Call this function to stop the WebRTC connection
function stopWebRTCConnection() {
    closeWebRTCConnection();
    if (socket) {
        socket.close();
    }
}

// Add this function to your webrtc.js or a similar script
function updateHandshakeBox(text) {
    let handshakeBox = document.getElementById('handshakeBox');
    let timestamp = new Date().toLocaleTimeString();
    if (handshakeBox) {
        handshakeBox.textContent += `[${timestamp}] ${text}\n`;
        handshakeBox.scrollTop = handshakeBox.scrollHeight;
    }
}


