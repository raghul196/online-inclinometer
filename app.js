// Utilizing your stored configuration for initialization
const bubble = document.getElementById('bubble');
const pitchVal = document.getElementById('pitch-val');
const rollVal = document.getElementById('roll-val');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const zeroBtn = document.getElementById('zero-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const audioToggle = document.getElementById('audio-toggle');



let pitchOffset = 0;
let rollOffset = 0;
let lastPitch = 0;
let lastRoll = 0;
let isMeasuring = false;
let zeroOnStart = false;

let isLevel = false;
let audioContext;
let isAudioEnabled = false;
let currentUnit = 'degrees'; // Default unit

function playLevelSound() {
    if (!isAudioEnabled) return;

    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser");
            return;
        }
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = 880; // A5 note
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function handleOrientation(event) {
    if (zeroOnStart) {
    pitchOffset = event.beta;
    rollOffset = event.gamma;
    zeroOnStart = false;
    }

    lastPitch = event.beta;
    lastRoll = event.gamma;
    
    // Beta: front-back tilt (-180 to 180)
    // Gamma: left-right tilt (-90 to 90)
    let x = lastPitch - pitchOffset; 
    let y = lastRoll - rollOffset;

    let displayPitch, displayRoll;
    let unitSymbol;

    if (currentUnit === 'degrees') {
        displayPitch = Math.round(x);
        displayRoll = Math.round(y);
        unitSymbol = '°';
    } else { // 'percent'
        displayPitch = Math.round(Math.tan(x * Math.PI / 180) * 100);
        displayRoll = Math.round(Math.tan(y * Math.PI / 180) * 100);
        unitSymbol = '%';
    }

    // Constrain values for visual bubble
    const maxTilt = 20;
    const multiplier = 5; // Scale movement

    // Update UI
    pitchVal.innerText = `${displayPitch}${unitSymbol}`;
    rollVal.innerText = `${displayRoll}${unitSymbol}`;

    // Move bubble (X and Y are swapped for intuitive flat surface mapping)
    const moveX = Math.max(Math.min(y * multiplier, 100), -100);
    const moveY = Math.max(Math.min(x * multiplier, 100), -100);
    
    bubble.style.transform = `translate(${moveX}px, ${moveY}px)`;
    
    // Visual feedback when level
    const currentlyLevel = Math.round(x) == 0 && Math.round(y) == 0;
    if (currentlyLevel) {
        bubble.classList.replace('bg-cyan-500', 'bg-green-500');
        if (!isLevel) {
            playLevelSound();
        }
    } else {
        bubble.classList.replace('bg-green-500', 'bg-cyan-500');
    }
    isLevel = currentlyLevel;
}

zeroBtn.addEventListener('click', () => {
    if (isMeasuring) {
        pitchOffset = lastPitch;
        rollOffset = lastRoll;
    } else {
        pitchVal.innerText = `0${currentUnit === 'degrees' ? '°' : '%'}`;
        rollVal.innerText = `0${currentUnit === 'degrees' ? '°' : '%'}`;
        zeroOnStart = true;
    }
});

startBtn.addEventListener('click', async () => {
    // Request permission for iOS 13+ devices
    pitchVal.classList.remove('text-cyan-400');
    rollVal.classList.remove('text-cyan-400');
    
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
                startBtn.classList.add('hidden');
                stopBtn.classList.remove('hidden');
                isMeasuring = true;
                
            }
        } catch (err) {
            console.error("Permission denied");
        }
    } else {
        // Non-iOS or older devices
        window.addEventListener('deviceorientation', handleOrientation);
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        isMeasuring = true;
    }
});

stopBtn.addEventListener('click', ()=>{
    window.removeEventListener('deviceorientation', handleOrientation);
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    pitchVal.classList.add('text-cyan-400');
    rollVal.classList.add('text-cyan-400');
    isMeasuring = false;
    zeroOnStart = false;
});

settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
});

audioToggle.addEventListener('click', () => {
    isAudioEnabled = !isAudioEnabled;
    const span = audioToggle.querySelector('span');
    if (isAudioEnabled) {
        audioToggle.classList.remove('bg-slate-700');
        audioToggle.classList.add('bg-cyan-600');
        span.classList.add('translate-x-6');
    } else {
        audioToggle.classList.remove('bg-cyan-600');
        audioToggle.classList.add('bg-slate-700');
        span.classList.remove('translate-x-6');
    }
});

// FAQ Accordion functionality
const faqQuestions = document.querySelectorAll('.faq-question');
faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        const isActive = faqItem.classList.contains('active');

        // Close all other FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });

        // Toggle current item if it wasn't already open
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

