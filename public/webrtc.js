// webrtc.js
let localConnection;
let localStream; // Variable to hold the local stream
let localAudio = document.createElement('audio');
let qualityCheckInterval; // Variable to manage the interval for monitoring connection quality
let remoteAudio = document.getElementById('remoteAudio');
localAudio.muted = true; // Mute the local audio to prevent feedback

// In startCall() function, after getting the local stream
localStream.getAudioTracks().forEach(track => {
    track.enabled = false; // Disable the audio track to prevent it from being played back
});

const ws = new WebSocket((window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host);

ws.onopen = () => console.log('WebSocket Connected');
ws.onerror = (error) => console.error('WebSocket Error:', error);
ws.onmessage = (event) => {
    console.log('WebSocket Message:', event.data);
    const data = JSON.parse(event.data);

    if (data.answer) {
        localConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.offer) {
        localConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        localConnection.createAnswer().then(answer => {
            localConnection.setLocalDescription(answer);
            ws.send(JSON.stringify({ 'answer': answer }));
        });
    } else if (data.iceCandidate) {
        localConnection.addIceCandidate(new RTCIceCandidate(data.iceCandidate));
    }
};

function startCall() {
    console.log('Starting call');
    localConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
    });

    localConnection.onicecandidate = event => {
        if (event.candidate) {
            ws.send(JSON.stringify({ 'iceCandidate': event.candidate }));
        }
    };

    localConnection.ontrack = event => {
        if (event.streams && event.streams[0] && event.track.kind === 'audio') {
            remoteAudio.srcObject = event.streams[0]; // Ensure this is the remote stream
            remoteAudio.play().catch(error => console.error('Error playing audio:', error));
        }
    };

    navigator.mediaDevices.getUserMedia({
        audio: { 
            echoCancellation: true,
            latency: { ideal: 0.01 }
        },
        video: false
    }).then(stream => {
        localStream = stream;
        localAudio.srcObject = localStream; // Assign the local stream to the local audio element
        console.log('Local stream obtained');
        stream.getTracks().forEach(track => localConnection.addTrack(track, stream));
        return localConnection.createOffer();
    }).then(offer => {
        return localConnection.setLocalDescription(offer);
    }).then(() => {
        ws.send(JSON.stringify({ 'offer': localConnection.localDescription }));
    }).catch(error => console.error('Error accessing media devices:', error));

    // Start monitoring connection quality
    qualityCheckInterval = setInterval(monitorConnectionQuality, 5000);
}

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

function stopCall() {
    console.log('Stopping call');
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (localConnection) {
        localConnection.close();
        localConnection = null;
        remoteAudio.srcObject = null;
    }

    // Clear the interval for monitoring connection quality
    clearInterval(qualityCheckInterval);
}
