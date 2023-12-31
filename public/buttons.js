// buttons.js
const callButton = document.getElementById('callButton');
const muteButton = document.getElementById('muteButton');

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
    if (remoteAudio.muted) {
        console.log('Unmuting microphone');
        remoteAudio.muted = false;
        muteButton.textContent = 'Mute Mic';
        muteButton.classList.remove('button-red');
        muteButton.classList.add('button-gray');
    } else {
        console.log('Muting microphone');
        remoteAudio.muted = true;
        muteButton.textContent = 'Mic Muted';
        muteButton.classList.remove('button-gray');
        muteButton.classList.add('button-red');
    }
}

callButton.addEventListener('click', toggleCall);
muteButton.addEventListener('click', toggleMute);
