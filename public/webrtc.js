// Revised webrtc.js

let localConnection;
let localStream;
let remoteAudio = document.getElementById('remoteAudio');
let localClientId = Math.floor(Math.random() * 1000000);
let qualityCheckInterval;
let ws; // WebSocket connection
let iceCandidateQueue = []; // Queue for storing ICE candidates

function connectWebSocket() {
    ws = new WebSocket((window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host);

    ws.onopen = () => {
        console.log('WebSocket Connected');
        // Send any queued ICE candidates
        iceCandidateQueue.forEach(candidate => {
            ws.send(JSON.stringify({ 'iceCandidate': candidate, 'senderId': localClientId }));
        });
        iceCandidateQueue = []; // Clear the queue
    };
    ws.onerror = (error) => console.error('WebSocket Error:', error);
    ws.onmessage = handleWebSocketMessage;
}

function handleWebSocketMessage(event) {
    console.log('WebSocket Message:', event.data);
    const data = JSON.parse(event.data);

    if (data.senderId === localClientId) return;

    if (data.answer) {
        console.log('Received answer');
        localConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.offer) {
        console.log('Received offer');
        localConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        localConnection.createAnswer().then(answer => {
            localConnection.setLocalDescription(answer);
            ws.send(JSON.stringify({ 'answer': answer, 'senderId': localClientId }));
        });
    } else if (data.iceCandidate) {
        console.log('Received ICE candidate');
        localConnection.addIceCandidate(new RTCIceCandidate(data.iceCandidate));
    }
}

function startCall() {
    connectWebSocket(); // Establish WebSocket connection

    localConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    });

    localConnection.onicecandidate = event => {
        if (event.candidate) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 'iceCandidate': event.candidate, 'senderId': localClientId }));
            } else {
                iceCandidateQueue.push(event.candidate); // Queue the candidate
            }
        }
    };

    localConnection.ontrack = event => {
        if (event.streams && event.streams[0]) {
            console.log('Received remote stream');
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().then(() => {
                console.log('Playback started successfully');
            }).catch(error => {
                console.error('Error playing audio:', error);
            });
        }
    };

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
        localStream = stream;
        console.log('Local stream obtained');
        stream.getTracks().forEach(track => localConnection.addTrack(track, stream));
        localConnection.createOffer().then(offer => {
            return localConnection.setLocalDescription(offer);
        }).then(() => {
            ws.onopen = () => {
                console.log('WebSocket Open - Sending offer');
                ws.send(JSON.stringify({ 'offer': localConnection.localDescription, 'senderId': localClientId }));
            };
            if (ws.readyState === WebSocket.OPEN) {
                console.log('WebSocket Already Open - Sending offer');
                ws.send(JSON.stringify({ 'offer': localConnection.localDescription, 'senderId': localClientId }));
            }
        }).catch(error => console.error('Error accessing media devices:', error));
    });
}

function stopCall() {
    console.log('Stopping call');
    if (ws) {
        ws.close(); // Close WebSocket connection
        ws = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (localConnection) {
        localConnection.close();
        localConnection = null;
        remoteAudio.srcObject = null;
    }
}

// Additional functions (adjustBitrate, monitorConnectionQuality)...



function adjustBitrate(newBitrate) {
    localConnection.getSenders().forEach(sender => {
        const params = sender.getParameters();
        if (!params.encodings) {
            params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = newBitrate;
        sender.setParameters(params).catch(e => console.error(e));
    });
}

function monitorConnectionQuality() {
    if (!localConnection) {
        console.log('Connection has been closed.');
        return; // Exit the function if localConnection is null
    }
    localConnection.getStats(null).then(stats => {
        stats.forEach(report => {
            if (report.type === 'inbound-rtp' && !report.isRemote) {
                const { packetsLost, totalPackets, jitter } = report;
                const packetLossRatio = packetsLost / totalPackets;
                if (packetLossRatio > 0.1 || jitter > 30) {
                    adjustBitrate(50000);
                } else {
                    adjustBitrate(100000);
                }
            }
        });
    }).catch(e => console.error(e));
}

// Somewhere in your script, probably in startCall function
qualityCheckInterval = setInterval(monitorConnectionQuality, 5000);

function stopCall() {
    console.log('Stopping call');
    if (qualityCheckInterval) {
        clearInterval(qualityCheckInterval); // Clear the interval
        qualityCheckInterval = null; // Reset the variable
    }
    if (localConnection) {
        localConnection.close();
        localConnection = null;
        remoteAudio.srcObject = null;
    }

    // Clear the interval for monitoring connection quality
    clearInterval(qualityCheckInterval);
}
