// Initialize variables
let peerConnection;
let socket;
let messageQueue = []; // Message queue for WebSocket messages

function safelySendWebSocketMessage(message) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
    } else {
        messageQueue.push(message);
    }
}

// Function to initialize the WebSocket connection and set up WebRTC handlers
function setupWebRTC(sessionId) {
    // Initialize WebRTC peer connection
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });


    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            safelySendWebSocketMessage(JSON.stringify({'iceCandidate': event.candidate, 'session_id': sessionId}));
        }
    };

    // Force WSS connection
    const wsUrl = `wss://${window.location.host}/ws`;

    // Set up WebSocket connection
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('WebSocket connected');
        // Send any queued messages
        while(messageQueue.length > 0) {
            let message = messageQueue.shift();
            socket.send(message);
        }
    };

    socket.onmessage = event => {
        let data = JSON.parse(event.data);

        if (data.answer) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.iceCandidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(data.iceCandidate));
        }
    };

    // Error handling
    socket.onerror = error => {
        console.error('WebSocket error:', error);
    };
}

// Function to handle media stream (to be called from specific page scripts)
function addMediaStream(stream) {
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
}

// Function to create and send an offer (to be called from specific page scripts)
function createAndSendOffer(sessionId) {
    peerConnection.createOffer().then(offer => {
        return peerConnection.setLocalDescription(offer);
    }).then(() => {
        safelySendWebSocketMessage(JSON.stringify({'offer': peerConnection.localDescription, 'session_id': sessionId}));
    }).catch(error => console.error('Error creating offer:', error));
}
