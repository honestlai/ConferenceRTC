// webrtc.js
let localConnection;
let remoteAudio = document.getElementById('remoteAudio');

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
    localConnection = new RTCPeerConnection();

    localConnection.onicecandidate = event => {
        console.log('ICE Candidate:', event.candidate);
        if (event.candidate) {
            ws.send(JSON.stringify({ 'iceCandidate': event.candidate }));
        }
    };

    localConnection.ontrack = event => {
        console.log('Receiving remote stream');
        if (event.streams && event.streams[0]) {
            remoteAudio.srcObject = event.streams[0];
            console.log('Remote stream set to audio element');
            // Attempt to play audio, may require user interaction due to browser policies
            remoteAudio.play().catch(error => console.error('Error playing audio:', error));
        } else {
            console.error('No stream received');
        }
    };

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            console.log('Local stream obtained');
            stream.getTracks().forEach(track => localConnection.addTrack(track, stream));
            localConnection.createOffer().then(offer => {
                localConnection.setLocalDescription(offer);
                ws.send(JSON.stringify({ 'offer': offer }));
            });
        }).catch(error => console.error('Error accessing media devices:', error));
}

function stopCall() {
    console.log('Stopping call');
    if (localConnection) {
        // Stop all media tracks
        localConnection.getSenders().forEach(sender => {
            if (sender.track) {
                sender.track.stop();
            }
        });

        localConnection.close();
        localConnection = null;
        remoteAudio.srcObject = null; // Clear the audio source
    }
}
