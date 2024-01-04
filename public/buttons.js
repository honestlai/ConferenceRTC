// buttons.js
const callButton = document.getElementById('callButton');
const muteButton = document.getElementById('muteButton');
let currentOutputDeviceId = '';

function startAudioPlayback() {
    console.log('Attempting to start audio playback');
    if (remoteAudio.srcObject) {
        remoteAudio.play().catch(error => console.error('Error playing audio:', error));
    } else {
        console.log('No audio srcObject found');
    }
}


function toggleCall() {
    console.log('toggleCall invoked');
    if (callButton.textContent === 'Start Call') {
        console.log('Starting call');
        startCall();
        callButton.textContent = 'Hang Up';
        callButton.classList.add('button-red');
        callButton.classList.remove('button');
        startAudioPlayback();
    } else {
        console.log('Stopping call');
        stopCall();
        callButton.textContent = 'Start Call';
        callButton.classList.remove('button-red');
        callButton.classList.add('button');
    }
}

function toggleMute() {
    console.log('toggleMute invoked');
    if (localStream && localStream.getAudioTracks().length > 0) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack.enabled) {
            console.log('Muting microphone');
            audioTrack.enabled = false;
            muteButton.textContent = 'Mic Muted';
            muteButton.classList.remove('button-gray');
            muteButton.classList.add('button-red');
        } else {
            console.log('Unmuting microphone');
            audioTrack.enabled = true;
            muteButton.textContent = 'Mute Mic';
            muteButton.classList.remove('button-red');
            muteButton.classList.add('button-gray');
        }
    } else {
        console.log('No audio tracks found');
    }
}



callButton.addEventListener('click', toggleCall);
muteButton.addEventListener('click', toggleMute);