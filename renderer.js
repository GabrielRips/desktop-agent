const { ipcRenderer } = require('electron');

// Import audio capture
const AudioCapture = require('./audio-capture');

// DOM elements
const conversationEl = document.getElementById('conversation');
const transcriptEl = document.getElementById('transcript');
const transcriptTextEl = document.getElementById('transcript-text');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const clearBtn = document.getElementById('clear-btn');
const scrollBtn = document.getElementById('scroll-btn');
const testBtn = document.getElementById('test-btn');
const debugBtn = document.getElementById('debug-btn');
const fullTestBtn = document.getElementById('full-test-btn');
const micIndicator = document.getElementById('mic-indicator');
const wakewordStatus = document.getElementById('wakeword-status');
const transcriptionStatus = document.getElementById('transcription-status');
const chatgptStatus = document.getElementById('chatgpt-status');

// State
let isAgentRunning = false;
let isListening = false;
let audioCapture = null;

// Initialize UI
function initializeUI() {
    updateStatusIndicators();
    setupEventListeners();
    ensureScrollToBottom();
    
    // Initialize audio capture
    audioCapture = new AudioCapture();
    console.log('✅ Audio capture initialized in renderer');
}

function startAudioCapture() {
    if (!audioCapture) {
        console.error('❌ Audio capture not initialized');
        return;
    }

    audioCapture.startCapture((audioBuffer) => {
        // Send audio data to main process for transcription
        console.log('📤 Sending audio data to main process, size:', audioBuffer.byteLength);
        ipcRenderer.send('audio-data', audioBuffer);
    });
}

function stopAudioCapture() {
    if (audioCapture) {
        audioCapture.stopCapture();
    }
}

function testTranscription() {
    // Simulate transcription for testing
    console.log('🧪 Testing transcription display...');
    
    // Simulate interim transcription
    addMessage('🎤 Testing interim transcription...', 'interim');
    
    setTimeout(() => {
        // Remove interim and add final
        const interimMessage = conversationEl.querySelector('.message.interim');
        if (interimMessage) {
            interimMessage.remove();
        }
        addMessage('This is a test transcription message', 'user');
        
        // Simulate ChatGPT response
        setTimeout(() => {
            addMessage('This is a test ChatGPT response to verify the system is working.', 'assistant');
        }, 1000);
    }, 2000);
}

function debugTranscription() {
    // Debug function to test transcription flow
    console.log('🔍 Debugging transcription flow...');
    
    // Simulate wake word detection
    addMessage('🎉 Wake word "alexa" detected!', 'system');
    setListeningState(true);
    
    // Simulate transcription updates
    setTimeout(() => {
        addMessage('🎤 Hello world', 'interim');
    }, 500);
    
    setTimeout(() => {
        addMessage('🎤 Hello world, how are you', 'interim');
    }, 1000);
    
    setTimeout(() => {
        addMessage('🎤 Hello world, how are you today', 'interim');
    }, 1500);
    
    // Simulate final transcription
    setTimeout(() => {
        const interimMessage = conversationEl.querySelector('.message.interim');
        if (interimMessage) {
            interimMessage.remove();
        }
        addMessage('Hello world, how are you today?', 'user');
        setListeningState(false);
        
        // Simulate ChatGPT response
        setTimeout(() => {
            addMessage('Hello! I\'m doing well, thank you for asking. How can I help you today?', 'assistant');
        }, 1000);
    }, 2000);
}

function testFullTranscription() {
    console.log('🧪 Testing full transcription flow...');
    
    // Simulate the entire flow
    addMessage('🧪 Starting full transcription test...', 'system');
    
    // Simulate wake word detection
    setTimeout(() => {
        addMessage('🎉 Wake word "alexa" detected!', 'system');
        setListeningState(true);
    }, 500);
    
    // Simulate audio capture starting
    setTimeout(() => {
        addMessage('🎤 Audio capture started...', 'system');
    }, 1000);
    
    // Simulate transcription updates
    setTimeout(() => {
        addMessage('🎤 Hello', 'interim');
    }, 1500);
    
    setTimeout(() => {
        addMessage('🎤 Hello, how are', 'interim');
    }, 2000);
    
    setTimeout(() => {
        addMessage('🎤 Hello, how are you today?', 'interim');
    }, 2500);
    
    // Simulate final transcription
    setTimeout(() => {
        const interimMessage = conversationEl.querySelector('.message.interim');
        if (interimMessage) {
            interimMessage.remove();
        }
        addMessage('Hello, how are you today?', 'user');
        setListeningState(false);
        
        // Simulate ChatGPT response
        setTimeout(() => {
            addMessage('Hello! I\'m doing well, thank you for asking. How can I help you today?', 'assistant');
        }, 1000);
    }, 3000);
}

function setupEventListeners() {
    startBtn.addEventListener('click', startAgent);
    stopBtn.addEventListener('click', stopAgent);
    clearBtn.addEventListener('click', clearConversation);
    scrollBtn.addEventListener('click', scrollToBottom);
    testBtn.addEventListener('click', testTranscription);
    debugBtn.addEventListener('click', debugTranscription);
    fullTestBtn.addEventListener('click', testFullTranscription);
    micIndicator.addEventListener('click', toggleListening);
}

function updateStatusIndicators() {
    // These will be updated by IPC messages from main process
    wakewordStatus.classList.remove('active');
    transcriptionStatus.classList.remove('active');
    chatgptStatus.classList.remove('active');
}

function ensureScrollToBottom() {
    // Force scroll to bottom after a short delay
    setTimeout(scrollToBottom, 100);
}

function scrollToBottom() {
    // Multiple approaches to ensure scrolling works
    try {
        // Method 1: Direct scrollTop
        conversationEl.scrollTop = conversationEl.scrollHeight;
        
        // Method 2: Scroll to the last message
        const messages = conversationEl.querySelectorAll('.message');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        
        // Method 3: Force scroll after a delay
        setTimeout(() => {
            conversationEl.scrollTop = conversationEl.scrollHeight;
        }, 50);
        
    } catch (error) {
        console.error('Scroll error:', error);
    }
}

function addMessage(content, type = 'system') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = content;
    conversationEl.appendChild(messageEl);
    
    // Scroll to bottom immediately
    scrollToBottom();
    
    // Additional scroll checks to ensure it works
    setTimeout(scrollToBottom, 10);
    setTimeout(scrollToBottom, 50);
    setTimeout(scrollToBottom, 100);
}

function updateTranscript(text) {
    if (text && text.trim()) {
        transcriptTextEl.textContent = text;
        transcriptEl.classList.remove('hidden');
        // Also update the transcript in the conversation area
        let transcriptMessage = conversationEl.querySelector('.message.transcript');
        if (!transcriptMessage) {
            transcriptMessage = document.createElement('div');
            transcriptMessage.className = 'message transcript';
            conversationEl.appendChild(transcriptMessage);
        }
        transcriptMessage.textContent = `🎤 ${text}`;
        scrollToBottom();
    } else {
        transcriptEl.classList.add('hidden');
        // Remove transcript message from conversation
        const transcriptMessage = conversationEl.querySelector('.message.transcript');
        if (transcriptMessage) {
            transcriptMessage.remove();
        }
    }
}

function setListeningState(listening) {
    isListening = listening;
    if (listening) {
        micIndicator.classList.add('listening');
        micIndicator.textContent = '🔴';
    } else {
        micIndicator.classList.remove('listening');
        micIndicator.textContent = '🎤';
    }
}

function startAgent() {
    if (isAgentRunning) return;
    
    ipcRenderer.send('start-agent');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    addMessage('Starting desktop agent...', 'system');
}

function stopAgent() {
    if (!isAgentRunning) return;
    
    ipcRenderer.send('stop-agent');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    setListeningState(false);
    addMessage('Stopping desktop agent...', 'system');
}

function clearConversation() {
    conversationEl.innerHTML = '';
    addMessage('Say "Alexa" to activate the agent, then speak your question or request.', 'system');
}

function toggleListening() {
    if (!isAgentRunning) {
        addMessage('Please start the agent first.', 'system');
        return;
    }
    
    if (isListening) {
        ipcRenderer.send('stop-listening');
    } else {
        ipcRenderer.send('start-listening');
    }
}

// IPC event listeners
ipcRenderer.on('agent-started', () => {
    isAgentRunning = true;
    addMessage('Agent started successfully! Say "Alexa" to activate.', 'system');
});

ipcRenderer.on('agent-stopped', () => {
    isAgentRunning = false;
    setListeningState(false);
    addMessage('Agent stopped.', 'system');
});

ipcRenderer.on('start-audio-capture', () => {
    console.log('🎤 Starting audio capture from main process');
    startAudioCapture();
});

ipcRenderer.on('stop-audio-capture', () => {
    console.log('🛑 Stopping audio capture from main process');
    stopAudioCapture();
});

ipcRenderer.on('wake-word-detected', (event, detection) => {
    console.log('Wake word detected:', detection);
    addMessage(`🎉 Wake word "${detection.label}" detected!`, 'system');
    setListeningState(true);
    // Start audio capture when wake word is detected
    startAudioCapture();
});

ipcRenderer.on('wake-word-cooldown', (event, data) => {
    addMessage(`⏰ Wake word ignored - please wait ${data.remainingTime}ms`, 'system');
});

ipcRenderer.on('transcription-update', (event, data) => {
    updateTranscript(data.transcript);
    // Also add interim transcriptions to conversation
    if (data.transcript && data.transcript.trim()) {
        // Update or add interim message
        let interimMessage = conversationEl.querySelector('.message.interim');
        if (!interimMessage) {
            interimMessage = document.createElement('div');
            interimMessage.className = 'message interim';
            conversationEl.appendChild(interimMessage);
        }
        interimMessage.textContent = `🎤 ${data.transcript}`;
        scrollToBottom();
    }
});

ipcRenderer.on('transcription-final', (event, data) => {
    updateTranscript('');
    // Remove interim message and add final user message
    const interimMessage = conversationEl.querySelector('.message.interim');
    if (interimMessage) {
        interimMessage.remove();
    }
    addMessage(data.transcript, 'user');
    // Stop audio capture when transcription is final
    stopAudioCapture();
});

ipcRenderer.on('chatgpt-response', (event, data) => {
    if (data.error) {
        addMessage(`Error: ${data.error}`, 'system');
    } else {
        addMessage(data.response, 'assistant');
    }
    setListeningState(false);
});

ipcRenderer.on('status-update', (event, status) => {
    if (status.wakeword) wakewordStatus.classList.add('active');
    else wakewordStatus.classList.remove('active');
    
    if (status.transcription) transcriptionStatus.classList.add('active');
    else transcriptionStatus.classList.remove('active');
    
    if (status.chatgpt) chatgptStatus.classList.add('active');
    else chatgptStatus.classList.remove('active');
});

ipcRenderer.on('error', (event, error) => {
    addMessage(`Error: ${error}`, 'system');
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);