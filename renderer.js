const { ipcRenderer } = require('electron');

// Import audio capture
const AudioCapture = require('./audio-capture');

// DOM elements
const mainStatusIndicator = document.getElementById('main-status');
const statusText = document.getElementById('status-text');
const taskDescription = document.getElementById('task-description');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const closeBtn = document.getElementById('close-btn');
const waveAnimation = document.getElementById('wave-animation');

// State
let isAgentRunning = false;
let isListening = false;
let currentTask = '';
let audioCapture = null;

// Initialize UI
function initializeUI() {
    console.log('🔧 Initializing compact widget UI...');
    
    // Validate required elements exist
    if (!mainStatusIndicator || !statusText || !taskDescription) {
        console.error('❌ Required UI elements not found!');
        return;
    }

    // Set up event listeners
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log('🎯 Start button clicked');
            if (!isAgentRunning) {
                ipcRenderer.send('start-agent');
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            console.log('🛑 Stop button clicked');
            if (isAgentRunning) {
                ipcRenderer.send('stop-agent');
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('❌ Close button clicked');
            // Hide window instead of closing to keep it running
            ipcRenderer.send('minimize-to-tray');
        });
    }

    // Initialize audio capture
    audioCapture = new AudioCapture();
    console.log('🎤 Audio capture initialized');

    // Initialize status
    updateStatus('idle', 'Ready', 'Waiting for wake word...');
    
    console.log('✅ Compact widget UI initialized');
}

// Update main status with animation
function updateStatus(type, statusMsg, taskMsg = '') {
    if (!mainStatusIndicator || !statusText || !taskDescription) return;

    // Remove all existing classes
    mainStatusIndicator.className = 'status-indicator';
    
    // Add appropriate class and update text
    switch (type) {
        case 'listening':
            mainStatusIndicator.classList.add('listening');
            waveAnimation.classList.add('active');
            break;
        case 'processing':
            mainStatusIndicator.classList.add('processing');
            waveAnimation.classList.add('active');
            break;
        case 'success':
            mainStatusIndicator.classList.add('success');
            waveAnimation.classList.remove('active');
            break;
        case 'error':
            mainStatusIndicator.classList.add('error');
            waveAnimation.classList.remove('active');
            break;
        default:
            waveAnimation.classList.remove('active');
            break;
    }

    // Update text content
    statusText.textContent = statusMsg;
    
    // Update task description with smooth animation
    if (taskMsg && taskMsg !== currentTask) {
        currentTask = taskMsg;
        taskDescription.classList.remove('show');
        
        setTimeout(() => {
            taskDescription.textContent = taskMsg;
            taskDescription.classList.add('show');
        }, 150);
    } else if (taskMsg) {
        taskDescription.textContent = taskMsg;
        taskDescription.classList.add('show');
    }
}

// Update button states
function updateButtonStates() {
    if (!startBtn || !stopBtn) return;

    if (isAgentRunning) {
        startBtn.classList.remove('active');
        stopBtn.classList.add('active');
        startBtn.innerHTML = '▶ Start';
        stopBtn.innerHTML = '⏸ Stop';
    } else {
        startBtn.classList.add('active');
        stopBtn.classList.remove('active');
        startBtn.innerHTML = '▶ Start';
        stopBtn.innerHTML = '⏸ Stop';
    }
}

// Show temporary message
function showTemporaryMessage(message, type = 'info', duration = 3000) {
    const tempType = type === 'info' ? 'processing' : type;
    updateStatus(tempType, message, '');
    
    setTimeout(() => {
        if (isAgentRunning) {
            if (isListening) {
                updateStatus('listening', 'Listening...', 'Say your command');
            } else {
                updateStatus('idle', 'Active', 'Waiting for wake word...');
            }
        } else {
            updateStatus('idle', 'Ready', 'Click Start to begin');
        }
    }, duration);
}

// IPC Event Handlers
ipcRenderer.on('agent-started', () => {
    isAgentRunning = true;
    updateButtonStates();
    updateStatus('idle', 'Active', 'Listening for wake word...');
});

ipcRenderer.on('agent-stopped', () => {
    isAgentRunning = false;
    isListening = false;
    updateButtonStates();
    updateStatus('idle', 'Stopped', 'Click Start to begin');
});

ipcRenderer.on('wake-word-detected', (event, detection) => {
    console.log('📢 Wake word detected:', detection);
    updateStatus('listening', 'Wake Word!', 'Listening for command...');
    
    // Brief flash animation
    setTimeout(() => {
        updateStatus('listening', 'Listening...', 'Speak your command now');
    }, 1000);
});

ipcRenderer.on('wake-word-cooldown', (event, data) => {
    const remainingTime = Math.ceil(data.remainingTime / 1000);
    updateStatus('processing', 'Cooldown', `Wait ${remainingTime}s before next command`);
});

ipcRenderer.on('transcription-update', (event, data) => {
    if (data.transcript) {
        updateStatus('listening', 'Transcribing...', `"${data.transcript}"`);
    }
});

ipcRenderer.on('transcription-final', (event, data) => {
    console.log('📝 Final transcription:', data.transcript);
    updateStatus('processing', 'Processing...', `Command: "${data.transcript}"`);
});

// Add handler for speech completion delay
ipcRenderer.on('transcription-delay-start', (event, data) => {
    console.log('⏰ Speech completion delay started');
    updateStatus('processing', 'Completing...', `"${data.transcript}" - waiting for more...`);
});

ipcRenderer.on('transcription-delay-continue', (event, data) => {
    console.log('🔄 Speech continued, resetting delay');
    updateStatus('listening', 'Still Listening...', `"${data.transcript}"`);
});

// Screenshot events
ipcRenderer.on('screenshot-capturing', () => {
    updateStatus('processing', 'Screenshot...', 'Capturing screen context');
});

ipcRenderer.on('screenshot-captured', () => {
    updateStatus('processing', 'Analyzing...', 'Processing visual context');
});

ipcRenderer.on('screenshot-error', (event, error) => {
    console.error('❌ Screenshot error:', error);
    showTemporaryMessage('Screenshot Failed', 'error', 2000);
});

// Automation events
ipcRenderer.on('automation-starting', (event, data) => {
    console.log('🚀 Automation starting:', data.command);
    updateStatus('processing', 'Automating...', 'Executing your command');
});

ipcRenderer.on('automation-success', (event, data) => {
    console.log('✅ Automation successful:', data.result);
    updateStatus('success', 'Success!', 'Command completed successfully');
    showTemporaryMessage('Ready for Next Command', 'success', 2000);
    
    // Return to ready state after showing success
    setTimeout(() => {
        if (isAgentRunning) {
            updateStatus('idle', 'Active', 'Ready for next command');
        }
    }, 3000);
});

ipcRenderer.on('automation-error', (event, data) => {
    console.error('❌ Automation error:', data.error);
    updateStatus('error', 'Error!', 'Automation failed');
    showTemporaryMessage('Ready for Next Command', 'info', 2000);
    
    // Return to ready state after showing error
    setTimeout(() => {
        if (isAgentRunning) {
            updateStatus('idle', 'Active', 'Ready to try again');
        }
    }, 4000);
});

// ChatGPT events (for compatibility)
ipcRenderer.on('chatgpt-response', (event, data) => {
    if (data.error) {
        console.error('❌ AI Error:', data.error);
        showTemporaryMessage('AI Error', 'error', 3000);
    }
    // Success handled by automation events
});

// Audio events
ipcRenderer.on('start-audio-capture', async () => {
    console.log('🎤 Starting audio capture...');
    if (audioCapture) {
        const success = await audioCapture.startCapture((audioBuffer) => {
            // Send audio data to main process for wake word detection
            ipcRenderer.send('audio-data', audioBuffer);
        });
        
        if (success) {
            console.log('✅ Audio capture started successfully');
        } else {
            console.error('❌ Failed to start audio capture');
            updateStatus('error', 'Mic Error', 'Could not access microphone');
        }
    }
});

ipcRenderer.on('stop-audio-capture', () => {
    console.log('🎤 Stopping audio capture...');
    if (audioCapture) {
        audioCapture.stopCapture();
        console.log('✅ Audio capture stopped');
    }
});

// Error events
ipcRenderer.on('error', (event, error) => {
    console.error('❌ System error:', error);
    updateStatus('error', 'System Error', error);
    
    setTimeout(() => {
        if (isAgentRunning) {
            updateStatus('idle', 'Active', 'System recovered');
        } else {
            updateStatus('idle', 'Ready', 'Click Start to begin');
        }
    }, 5000);
});

// Status update events
ipcRenderer.on('status-update', (event, status) => {
    // Update internal state based on system status
    const wasListening = isListening;
    isListening = status.transcription;
    
    // Update UI if listening state changed
    if (wasListening !== isListening && isAgentRunning) {
        if (isListening) {
            updateStatus('listening', 'Listening...', 'Speak your command');
        } else {
            updateStatus('idle', 'Active', 'Waiting for wake word...');
        }
    }
});

// Window controls
function minimizeToTray() {
    // For now, just hide the window
    require('electron').remote.getCurrentWindow().hide();
}

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
            case 'w': // Cmd/Ctrl + W to hide
                event.preventDefault();
                if (closeBtn) closeBtn.click();
                break;
            case 'r': // Cmd/Ctrl + R to restart agent
                event.preventDefault();
                if (isAgentRunning && stopBtn) {
                    stopBtn.click();
                    setTimeout(() => {
                        if (startBtn) startBtn.click();
                    }, 500);
                }
                break;
        }
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);

// Export for debugging
window.agentWidget = {
    updateStatus,
    showTemporaryMessage,
    isAgentRunning: () => isAgentRunning,
    isListening: () => isListening
};