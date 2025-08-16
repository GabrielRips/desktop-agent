const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import handlers
const WakeWordHandler = require('./wakeword-handler');
const TranscriptionHandler = require('./transcription-handler');
const ChatGPTHandler = require('./chatgpt-handler');

// Global variables
let mainWindow;
let wakeWordHandler;
let transcriptionHandler;
let chatGPTHandler;

// State
let isAgentRunning = false;
let isListening = false;
let currentTranscript = '';
let lastWakeWordTime = 0;
const WAKE_WORD_COOLDOWN = 3000; // 3 seconds cooldown

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'icon.png'), // Optional: add an icon
        show: false
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function initializeHandlers() {
    console.log('🔧 Initializing handlers...');

    // Initialize wake word handler
    wakeWordHandler = new WakeWordHandler();

    // Initialize transcription handler
    transcriptionHandler = new TranscriptionHandler();
    if (!process.env.DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY === 'your_deepgram_api_key_here') {
        console.error('❌ Deepgram API key not configured');
        mainWindow.webContents.send('error', 'Deepgram API key not configured. Please add your DEEPGRAM_API_KEY to the .env file.');
    } else if (!transcriptionHandler.initialize(process.env.DEEPGRAM_API_KEY)) {
        console.error('❌ Failed to initialize Deepgram');
        mainWindow.webContents.send('error', 'Failed to initialize Deepgram. Check your API key.');
    } else {
        console.log('✅ Deepgram initialized successfully');
    }

    // Initialize ChatGPT handler
    chatGPTHandler = new ChatGPTHandler();
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.error('❌ OpenAI API key not configured');
        mainWindow.webContents.send('error', 'OpenAI API key not configured. Please add your OPENAI_API_KEY to the .env file.');
    } else if (!chatGPTHandler.initialize(process.env.OPENAI_API_KEY)) {
        console.error('❌ Failed to initialize OpenAI');
        mainWindow.webContents.send('error', 'Failed to initialize OpenAI. Check your API key.');
    } else {
        console.log('✅ OpenAI initialized successfully');
    }

    console.log('✅ Handlers initialized');
}

function startAgent() {
    if (isAgentRunning) {
        console.log('⚠️ Agent is already running');
        return;
    }

    console.log('🚀 Starting desktop agent...');
    isAgentRunning = true;

    // Start wake word detection
    wakeWordHandler.startDetection((detection) => {
        console.log('�� Wake word detected in main.js callback:', detection);
        console.log('🎉 Detection type:', detection.type);
        console.log('🎉 Detection label:', detection.label);
        console.log('🎉 Detection score:', detection.score);
        console.log('🎉 Main window exists:', !!mainWindow);
        console.log('🎉 Main window destroyed:', mainWindow ? mainWindow.isDestroyed() : 'N/A');
        
        // Check cooldown
        const now = Date.now();
        if (now - lastWakeWordTime < WAKE_WORD_COOLDOWN) {
            console.log('⏰ Wake word ignored due to cooldown');
            const remainingTime = WAKE_WORD_COOLDOWN - (now - lastWakeWordTime);
            mainWindow.webContents.send('wake-word-cooldown', { remainingTime });
            return;
        }
        
        lastWakeWordTime = now;
        console.log('📤 Sending wake-word-detected to frontend:', detection);
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('wake-word-detected', detection);
                console.log('✅ Wake word detection sent to frontend successfully');
            } catch (error) {
                console.error('❌ Error sending wake word detection to frontend:', error);
            }
        } else {
            console.error('❌ Cannot send wake word detection - mainWindow not available or destroyed');
        }
        
        console.log('🚀 Starting transcription after wake word detection...');
        // Start listening for speech
        startListening();
    });

    // Start audio capture immediately for wake word detection
    mainWindow.webContents.send('start-audio-capture');

    // Update status
    updateStatus();
    mainWindow.webContents.send('agent-started');
    console.log('✅ Agent started');
}

function stopAgent() {
    if (!isAgentRunning) {
        console.log('⚠️ Agent is not running');
        return;
    }

    console.log('🛑 Stopping desktop agent...');
    isAgentRunning = false;
    isListening = false;

    // Stop wake word detection
    wakeWordHandler.stopDetection();

    // Stop transcription
    transcriptionHandler.stopTranscription();

    // Stop audio capture
    mainWindow.webContents.send('stop-audio-capture');

    // Update status
    updateStatus();
    mainWindow.webContents.send('agent-stopped');
    console.log('✅ Agent stopped');
}

function startListening() {
    if (!isAgentRunning || isListening) {
        console.log('⚠️ Cannot start listening - agent not running or already listening');
        return;
    }

    console.log('🎤 Starting transcription...');
    isListening = true;
    currentTranscript = '';

    console.log('🔧 Starting Deepgram transcription handler...');
    // Start Deepgram transcription
    const transcriptionStarted = transcriptionHandler.startTranscription(
        (transcriptData) => {
            console.log('📝 Transcription callback received:', transcriptData);
            // Handle transcript updates
            if (transcriptData.isFinal) {
                console.log('📝 Final transcript:', transcriptData.transcript);
                mainWindow.webContents.send('transcription-final', transcriptData);
                
                // Send to ChatGPT
                console.log('🤖 Sending to ChatGPT:', transcriptData.transcript);
                chatGPTHandler.sendMessage(
                    transcriptData.transcript,
                    (response) => {
                        console.log('🤖 ChatGPT response:', response);
                        mainWindow.webContents.send('chatgpt-response', { response });
                    },
                    (error) => {
                        console.error('❌ ChatGPT error:', error);
                        mainWindow.webContents.send('chatgpt-response', { error });
                    }
                );
                
                // Stop listening after getting final transcript
                stopListening();
            } else {
                // Update interim transcript
                currentTranscript = transcriptData.transcript;
                mainWindow.webContents.send('transcription-update', transcriptData);
            }
        },
        (error) => {
            console.error('❌ Transcription error:', error);
            mainWindow.webContents.send('error', `Transcription error: ${error}`);
            stopListening();
        }
    );

    if (transcriptionStarted) {
        console.log('✅ Transcription handler started successfully');
    } else {
        console.error('❌ Failed to start transcription handler');
    }

    // Audio capture is already running for wake word detection
    updateStatus();
}

function stopListening() {
    if (!isListening) {
        return;
    }

    console.log('🔇 Stopping transcription...');
    isListening = false;
    currentTranscript = '';

    transcriptionHandler.stopTranscription();
    // Don't stop audio capture - keep it running for wake word detection
    updateStatus();
}

function updateStatus() {
    const status = {
        wakeword: isAgentRunning,
        transcription: isListening,
        chatgpt: chatGPTHandler && chatGPTHandler.openai !== null
    };
    
    mainWindow.webContents.send('status-update', status);
}

// IPC handlers
ipcMain.on('start-agent', () => {
    startAgent();
});

ipcMain.on('stop-agent', () => {
    stopAgent();
});

ipcMain.on('start-listening', () => {
    startListening();
});

ipcMain.on('stop-listening', () => {
    stopListening();
});

ipcMain.on('audio-data', (event, audioBuffer) => {
    // Send audio data to wake word detection and transcription
    console.log('📥 Received audio data from renderer, size:', audioBuffer.byteLength);
    console.log('📥 Agent running:', isAgentRunning);
    console.log('📥 Wake word handler exists:', !!wakeWordHandler);
    console.log('📥 Transcription handler exists:', !!transcriptionHandler);
    console.log('📥 Transcription active:', transcriptionHandler ? transcriptionHandler.isTranscriptionActive() : false);
    
    // Send to wake word handler if agent is running
    if (wakeWordHandler && isAgentRunning) {
        console.log('📤 Sending audio to wake word handler...');
        wakeWordHandler.sendAudioData(audioBuffer);
    } else {
        console.log('⚠️ Not sending to wake word handler - agent not running or handler not available');
    }
    
    // Send to transcription handler if listening
    if (transcriptionHandler && transcriptionHandler.isTranscriptionActive()) {
        console.log('📤 Sending audio to transcription handler...');
        transcriptionHandler.sendAudio(audioBuffer);
    } else {
        console.log('⚠️ Transcription handler not active, ignoring audio data for transcription');
    }
});

// App lifecycle
app.whenReady().then(() => {
    console.log('🚀 Electron app is ready');
    
    createWindow();
    initializeHandlers();
    
    // Register global shortcuts
    globalShortcut.register('CommandOrControl+Shift+A', () => {
        if (isAgentRunning) {
            stopAgent();
        } else {
            startAgent();
        }
    });
    
    globalShortcut.register('CommandOrControl+Shift+L', () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('will-quit', () => {
    console.log('🛑 App is quitting, cleaning up...');
    
    // Unregister all shortcuts
    globalShortcut.unregisterAll();
    
    // Stop all handlers
    if (wakeWordHandler) {
        wakeWordHandler.stopDetection();
    }
    
    if (transcriptionHandler) {
        transcriptionHandler.stopTranscription();
    }
    
    console.log('✅ Cleanup completed');
}); 