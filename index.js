// import './input.css';



// let language = "en";

function updatePageContent() {
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    // Access translation.json structure: translation[key][language]
    if (translation['staticContent'][key] && translation['staticContent'][key][language]) {
      el.innerText = translation['staticContent'][key][language];
    }
  });
}



const requestPermissionBtn = document.getElementById('requestPermissionBtn');
const pitchDisplay = document.getElementById('pitchDisplay');
const statusMessage = document.getElementById('statusMessage');
const dialogPitch = document.getElementById('dialogPitch');
const pitchDialogBox= document.getElementById('pitchDialogBox');
const measureAgainBtn = document.getElementById('measureAgainBtn');
const sendPitchBtn = document.getElementById('sendPitchBtn');

// Extract session_id from the URL (e.g., /mobile/12345)
const sessionId = window.location.pathname.split('/').pop();
const sendUrl = `/mobile/${sessionId}`; 

let currentPitch = null; // Stores the latest pitch value
let lastStablePitch = null; // Used to compare for stability
let stableStartTime = null;
let finalPitch = null;
let stabilityInterval = null; // Reference for the polling interval

// --- Core Measuring Logic: Listener for data ---
function handleDeviceOrientation(event) {
    const beta = event.beta; 

    if (beta !== null) {
        // Calculate roof pitch
        const roofPitch = Math.abs(beta).toFixed(1); 
        
        // Update the display and store the current pitch
        pitchDisplay.textContent = `${roofPitch}°`;
        currentPitch = roofPitch; 

        // Reset stability tracker if the pitch value changes
        if (roofPitch !== lastStablePitch) {
            lastStablePitch = roofPitch;
            stableStartTime = null; // Pitch changed, restart stability timer
            statusMessage.textContent = translation.staticContent["gyro-instructions"][language];
            statusMessage.classList.remove('text-yellow-600');
        }
    } else {
        statusMessage.textContent = translation.staticContent["error-gyro"][language];
        statusMessage.classList.add('text-red-500');
    }
}

// --- Stability Polling Logic: Checks data at a fixed interval ---
function checkStability() {
    if (currentPitch === null) return; // No data yet

    // Check if the current pitch has been stable for long enough
    if (currentPitch === lastStablePitch) {
        if (!stableStartTime) {
            // Start the stability timer
            stableStartTime = Date.now();
            statusMessage.textContent = translation.staticContent["status-holding"][language];
            statusMessage.classList.add('text-yellow-600');
        }

        // Check if 3 seconds have passed
        if (Date.now() - stableStartTime >= 3000) {
            stopMeasurement(currentPitch);
        }
    }
    // If the pitch changed since the last stability check, the orientation listener 
    // will have already handled the reset (see handleDeviceOrientation)
}

// --- Start/Stop/Permission Functions ---

function startMeasurement() {
    // Ensure any previous intervals are cleared
    if (stabilityInterval) clearInterval(stabilityInterval);
    
    // Set initial state
    requestPermissionBtn.disabled = true; 
    requestPermissionBtn.textContent = translation.staticContent["btn-measuring"][language];
    currentPitch = null;
    lastStablePitch = null;
    stableStartTime = null;
    finalPitch = null;

    // Start the data listener
    window.addEventListener('deviceorientation', handleDeviceOrientation);
    
    // Start the stability checker (Polling every 500ms)
    stabilityInterval = setInterval(checkStability, 500); 

    statusMessage.textContent = translation.staticContent["status-measuring"][language];
    statusMessage.classList.remove('text-red-500', 'text-gray-500', 'text-green-600', 'text-yellow-600');
    statusMessage.classList.add('text-blue-600');
    pitchDisplay.textContent = "--°";
}

function stopMeasurement(pitchValue) {
    // 1. Stop measuring and show the dialog box
    clearInterval(stabilityInterval); // Crucial: Stop the polling
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
    
    finalPitch = pitchValue; 
    pitchDialogBox.classList.remove('hidden');
    dialogPitch.textContent = finalPitch;
    
    requestPermissionBtn.textContent = translation.staticContent["btn-stopped"][language];
    requestPermissionBtn.disabled = true;
    statusMessage.textContent = translation.staticContent["status-finished"][language]  + `${finalPitch}°`;
    statusMessage.classList.remove('text-blue-600', 'text-yellow-600');
    statusMessage.classList.add('text-green-600');
}

requestPermissionBtn.addEventListener('click', async () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState === 'granted') {
                startMeasurement();
            } else {
                statusMessage.textContent = translation.staticContent["error-permission"][language];
                statusMessage.classList.add('text-red-500');
            }
        } catch (error) {
            statusMessage.textContent = translation.staticContent["error-request"][language];
            statusMessage.classList.add('text-red-500');
        }
    } else {
        // For non-iOS/older browsers
        startMeasurement();
    }
});

// --- Dialog Button Handlers ---

// 2. On clicking the 'Neu Messen' button the measurement continues like usual.
measureAgainBtn.addEventListener('click', () => {
    pitchDialogBox.classList.add('hidden');
    requestPermissionBtn.textContent = translation.staticContent["gyro-start-measurement"][language];
    requestPermissionBtn.disabled = false; 
    startMeasurement(); 
});

// 3. On clicking the 'Senden' button. it sends the pitch back to the main page.
sendPitchBtn.addEventListener('click', async () => {
    if (finalPitch) {
        try {
            const response = await fetch(sendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'value': finalPitch
                })
            });

            if (response.ok) {
                pitchDialogBox.classList.add('hidden');
                statusMessage.textContent = translation.staticContent["status-success"][language];
                statusMessage.classList.remove('text-red-500');
                statusMessage.classList.add('text-green-600');
                requestPermissionBtn.textContent = "Gesendet";
            } else {
                statusMessage.textContent = translation.staticContent["error-server"][language] + `${response.status}`;
                statusMessage.classList.add('text-red-500');
            }
        } catch (error) {
            statusMessage.textContent = translation.staticContent["error-network"][language];
            statusMessage.classList.add('text-red-500');
        }
    } else {
        statusMessage.textContent = translation.staticContent["status-initial"][language];
        statusMessage.classList.add('text-red-500');
    }
});

// Initial message on load
window.onload = () => {
    updatePageContent()
    statusMessage.textContent = translation.staticContent["status-initial"][language];
    statusMessage.classList.add('text-gray-500');
};
