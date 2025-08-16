const { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import handlers
const WakeWordHandler = require('./wakeword-handler');
const TranscriptionHandler = require('./transcription-handler');
const ChatGPTHandler = require('./chatgpt-handler');
const AgentExecutor = require('./agent-executor');

// Global variables
let mainWindow;
let wakeWordHandler;
let transcriptionHandler;
let chatGPTHandler;
let agentExecutor;

// State
let isAgentRunning = false;
let isListening = false;
let currentTranscript = '';
let lastWakeWordTime = 0;
let lastScreenshot = null; // Store the most recent screenshot
const WAKE_WORD_COOLDOWN = 3000; // 3 seconds cooldown

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 320,
        height: 180,
        x: 50, // Position near top-left of screen
        y: 50,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        frame: false, // Remove window frame for clean look
        transparent: true, // Enable transparency
        alwaysOnTop: true, // Keep on top of all windows
        resizable: false, // Fixed size
        skipTaskbar: true, // Don't show in taskbar
        focusable: true, // Can receive focus
        show: false,
        backgroundColor: '#00000040', // Semi-transparent background
        vibrancy: 'dark', // macOS vibrancy effect
        visualEffectState: 'active'
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

async function initializeHandlers() {
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
        // Set speech completion delay (configurable, default is 3000ms)
        const speechDelay = process.env.SPEECH_COMPLETION_DELAY || 3000;
        transcriptionHandler.setSpeechCompletionDelay(parseInt(speechDelay));
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

    // Initialize Agent Executor
    agentExecutor = new AgentExecutor();
    if (!(await agentExecutor.initialize())) {
        console.error('❌ Failed to initialize Agent Executor');
        mainWindow.webContents.send('error', 'Failed to initialize automation executor. Check your setup.');
    } else {
        console.log('✅ Agent Executor initialized successfully');
    }

    console.log('✅ Handlers initialized');
}

async function captureScreenshot() {
    try {
        console.log('📸 Capturing screenshot...');
        mainWindow.webContents.send('screenshot-capturing');
        
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 }
        });
        
        if (sources.length === 0) {
            throw new Error('No screen sources found');
        }
        
        // Use the primary screen (first source)
        const screenshot = sources[0].thumbnail;
        const base64Data = screenshot.toDataURL().split(',')[1]; // Remove data:image/png;base64, prefix
        
        lastScreenshot = base64Data;
        console.log('✅ Screenshot captured successfully');
        mainWindow.webContents.send('screenshot-captured');
        
        return base64Data;
    } catch (error) {
        console.error('❌ Error capturing screenshot:', error);
        mainWindow.webContents.send('screenshot-error', error.message);
        return null;
    }
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
        
        // Capture screenshot when wake word is detected
        captureScreenshot().then(() => {
            console.log('📸 Screenshot captured, starting transcription...');
            // Start listening for speech
            startListening();
        }).catch((error) => {
            console.error('❌ Screenshot capture failed, continuing with audio only:', error);
            // Start listening for speech even if screenshot fails
            startListening();
        });
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
        async (transcriptData) => {
            console.log('📝 Transcription callback received:', transcriptData);
            // Handle transcript updates
            if (transcriptData.isFinal) {
                console.log('📝 Final transcript:', transcriptData.transcript);
                mainWindow.webContents.send('transcription-final', transcriptData);
                
                // Send directly to agent.ts for analysis and execution
                console.log('🤖 Sending directly to agent.ts:', transcriptData.transcript);
                console.log('📸 Screenshot available:', !!lastScreenshot);
                
                if (agentExecutor && agentExecutor.isReady()) {
                    console.log('🤖 Executing automation via agent.ts...');
                    
                    // Stop transcription while executing to avoid interference
                    console.log('⏸️ Pausing transcription during automation execution...');
                    stopListening(); // Use proper stop function to maintain state
                    
                    mainWindow.webContents.send('automation-starting', { command: transcriptData.transcript });
                    
                    try {
                        const result = await agentExecutor.executeCommand(transcriptData.transcript, lastScreenshot);
                        
                        if (result.success) {
                            console.log('✅ Agent automation successful:', result.output);
                            mainWindow.webContents.send('automation-success', { 
                                command: transcriptData.transcript,
                                result: result.output 
                            });
                            // Also send as chatgpt-response for UI compatibility
                            mainWindow.webContents.send('chatgpt-response', { response: result.output });
                        } else {
                            console.error('❌ Agent automation failed:', result.error);
                            mainWindow.webContents.send('automation-error', { 
                                command: transcriptData.transcript,
                                error: result.error 
                            });
                            mainWindow.webContents.send('chatgpt-response', { error: result.error });
                        }
                        
                        // Resume transcription after automation completes
                        console.log('▶️ Resuming transcription after automation...');
                        setTimeout(() => {
                            if (isAgentRunning && !isListening) {
                                console.log('🔄 Restarting listening for next wake word...');
                                // Don't restart transcription automatically, let wake word trigger it
                                updateStatus();
                            }
                        }, 1000); // Brief delay before resuming
                    } catch (error) {
                        console.error('❌ Agent automation error:', error);
                        mainWindow.webContents.send('automation-error', { 
                            command: transcriptData.transcript,
                            error: error.message 
                        });
                        mainWindow.webContents.send('chatgpt-response', { error: error.message });
                        
                        // Resume transcription after automation error
                        console.log('▶️ Resuming transcription after automation error...');
                        setTimeout(() => {
                            if (isAgentRunning && !isListening) {
                                console.log('🔄 Ready for next wake word after error...');
                                // Don't restart transcription automatically, let wake word trigger it
                                updateStatus();
                            }
                        }, 1000); // Brief delay before resuming
                    }
                } else {
                    console.log('ℹ️ Agent executor not ready, falling back to ChatGPT only');
                    // Fallback to ChatGPT handler if agent executor is not ready
                    chatGPTHandler.sendMessage(
                        transcriptData.transcript,
                        (response) => {
                            console.log('🤖 ChatGPT fallback response:', response);
                            mainWindow.webContents.send('chatgpt-response', { response });
                        },
                        (error) => {
                            console.error('❌ ChatGPT fallback error:', error);
                            mainWindow.webContents.send('chatgpt-response', { error });
                        },
                        lastScreenshot
                    );
                    
                    // Stop listening after fallback ChatGPT response
                    stopListening();
                }
                
                // Clear screenshot after use
                lastScreenshot = null;
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
        },
        (eventType, data) => {
            // Handle delay events for UI updates
            if (eventType === 'start') {
                console.log('⏰ Speech completion delay started');
                mainWindow.webContents.send('transcription-delay-start', data);
            } else if (eventType === 'continue') {
                console.log('🔄 Speech continued, resetting delay');
                mainWindow.webContents.send('transcription-delay-continue', data);
            }
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

ipcMain.on('minimize-to-tray', () => {
    if (mainWindow) {
        mainWindow.hide();
    }
});

ipcMain.on('show-widget', () => {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
});

ipcMain.on('toggle-widget', () => {
    if (mainWindow) {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    }
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
app.whenReady().then(async () => {
    console.log('🚀 Electron app is ready');
    
    createWindow();
    await initializeHandlers();
    
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

    // Global shortcut to show/hide widget
    globalShortcut.register('CommandOrControl+Shift+W', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
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

app.on('will-quit', async () => {
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
    
    if (agentExecutor) {
        await agentExecutor.cleanup();
    }
    
    console.log('✅ Cleanup completed');
}); 