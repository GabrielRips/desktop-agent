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
const screenpipeStatus = document.getElementById('screenpipe-status');

// Screenpipe elements
const captureScreenshotBtn = document.getElementById('capture-screenshot-btn');
const searchScreenshotsBtn = document.getElementById('search-screenshots-btn');
const screenpipeStatsBtn = document.getElementById('screenpipe-stats-btn');
const searchModal = document.getElementById('search-modal');
const statsModal = document.getElementById('stats-modal');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const statsGrid = document.getElementById('stats-grid');

// State
let isAgentRunning = false;
let isListening = false;
let audioCapture = null;

// Initialize UI
function initializeUI() {
    console.log('🔧 Initializing UI...');
    console.log('🔧 Conversation element:', conversationEl);
    console.log('🔧 Mic indicator element:', micIndicator);
    console.log('🔧 Start button element:', startBtn);
    console.log('🔧 Stop button element:', stopBtn);
    
    // Validate that all required elements exist
    if (!conversationEl) {
        console.error('❌ Conversation element not found!');
        return;
    }
    if (!micIndicator) {
        console.error('❌ Mic indicator element not found!');
        return;
    }
    if (!startBtn) {
        console.error('❌ Start button element not found!');
        return;
    }
    if (!stopBtn) {
        console.error('❌ Stop button element not found!');
        return;
    }
    
    console.log('✅ All required DOM elements found');
    
    updateStatusIndicators();
    setupEventListeners();
    ensureScrollToBottom();
    
    // Initialize audio capture
    audioCapture = new AudioCapture();
    console.log('✅ Audio capture initialized in renderer');
    
    // Add initial message
    addMessage('Say "Co Brain" to activate the agent, then speak your question or request.', 'system');
    console.log('✅ UI initialization complete');
}

function startAudioCapture() {
    if (!audioCapture) {
        console.error('❌ Audio capture not initialized');
        return;
    }

    audioCapture.startCapture((audioBuffer) => {
        // Send audio data to main process for wake word detection and transcription
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
    addMessage('🎉 Wake word "co_brain" detected!', 'system');
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
        addMessage('🎉 Wake word "co_brain" detected!', 'system');
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

function testWakeWordDetection() {
    console.log('🧪 Testing wake word detection display...');
    
    // Simulate the exact same event that would be sent from main process
    const testDetection = {
        type: 'wake_word_detected',
        label: 'co_brain',
        score: 0.85,
        timestamp: Date.now()
    };
    
    console.log('🧪 Simulating wake word detection event with data:', testDetection);
    
    // Manually trigger the event handler
    const event = { type: 'test' };
    ipcRenderer.emit('wake-word-detected', event, testDetection);
    
    console.log('🧪 Wake word detection test completed');
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
    
    // Add test button for wake word detection if it exists
    const testWakeWordBtn = document.getElementById('test-wakeword-btn');
    if (testWakeWordBtn) {
        testWakeWordBtn.addEventListener('click', testWakeWordDetection);
    }

    // Screenpipe event listeners
    if (captureScreenshotBtn) {
        captureScreenshotBtn.addEventListener('click', captureScreenshot);
    }
    if (searchScreenshotsBtn) {
        searchScreenshotsBtn.addEventListener('click', openSearchModal);
    }
    if (screenpipeStatsBtn) {
        screenpipeStatsBtn.addEventListener('click', showScreenpipeStats);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
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
    console.log('📝 Adding message to frontend:', content, 'Type:', type);
    console.log('📝 Conversation element exists:', !!conversationEl);
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = content;
    conversationEl.appendChild(messageEl);
    
    console.log('📝 Message added to DOM');
    
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
    addMessage('Say "Co Brain" to activate the agent, then speak your question or request.', 'system');
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
    addMessage('Agent started successfully! Say "Co Brain" to activate.', 'system');
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
    console.log('🎉 FRONTEND: Wake word detected event received!');
    console.log('🎉 FRONTEND: Event object:', event);
    console.log('🎉 FRONTEND: Detection data:', detection);
    console.log('🎉 FRONTEND: Detection type:', detection.type);
    console.log('🎉 FRONTEND: Detection label:', detection.label);
    console.log('🎉 FRONTEND: Detection score:', detection.score);
    
    try {
        addMessage(`🎉 Wake word "${detection.label}" detected!`, 'system');
        setListeningState(true);
        console.log('✅ FRONTEND: Successfully processed wake word detection');
    } catch (error) {
        console.error('❌ FRONTEND: Error processing wake word detection:', error);
    }
    // Audio capture is already running for wake word detection
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
    // Don't stop audio capture - keep it running for wake word detection
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
    
    if (status.screenpipe) screenpipeStatus.classList.add('active');
    else screenpipeStatus.classList.remove('active');
});

ipcRenderer.on('error', (event, error) => {
    addMessage(`Error: ${error}`, 'system');
});

// Screenpipe functions
async function captureScreenshot() {
    try {
        addMessage('📸 Capturing screenshot...', 'system');
        const result = await ipcRenderer.invoke('capture-screenshot');
        
        if (result.success) {
            addMessage(`✅ Screenshot captured! ID: ${result.id}`, 'system');
            addMessage(`Text extracted: ${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`, 'system');
        } else {
            addMessage(`❌ Screenshot capture failed: ${result.error}`, 'system');
        }
    } catch (error) {
        addMessage(`❌ Screenshot error: ${error.message}`, 'system');
    }
}

function openSearchModal() {
    searchModal.classList.add('active');
    searchInput.focus();
}

function closeSearchModal() {
    searchModal.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '';
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
        searchResults.innerHTML = '<div style="text-align: center; opacity: 0.7;">Searching...</div>';
        
        const results = await ipcRenderer.invoke('search-screenshots', { query, limit: 10 });
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div style="text-align: center; opacity: 0.7;">No results found</div>';
            return;
        }

        searchResults.innerHTML = results.map(result => `
            <div class="search-result">
                <div class="search-result-header">
                    <span class="search-result-score">Score: ${(result.score * 100).toFixed(1)}%</span>
                </div>
                <div class="search-result-text">${result.payload.text.substring(0, 200)}${result.payload.text.length > 200 ? '...' : ''}</div>
                <div class="search-result-timestamp">${new Date(result.payload.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
    } catch (error) {
        searchResults.innerHTML = `<div style="text-align: center; color: #ff4757;">Error: ${error.message}</div>`;
    }
}

async function showScreenpipeStats() {
    try {
        const stats = await ipcRenderer.invoke('get-screenpipe-stats');
        
        statsGrid.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.totalScreenshots}</div>
                <div class="stat-label">Total Screenshots</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.diskUsageMB}</div>
                <div class="stat-label">Disk Usage (MB)</div>
            </div>
        `;
        
        statsModal.classList.add('active');
    } catch (error) {
        addMessage(`❌ Failed to get stats: ${error.message}`, 'system');
    }
}

function closeStatsModal() {
    statsModal.classList.remove('active');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);