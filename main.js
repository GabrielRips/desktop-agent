const { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import handlers
const WakeWordHandler = require('./wakeword-handler');
const TranscriptionHandler = require('./transcription-handler');
const ChatGPTHandler = require('./chatgpt-handler');
const ScreenpipeHandler = require('./screenpipe-handler');
const AgentExecutor = require('./agent-executor');

// Simple intent detection function
function detectIntent(text) {
    const lowerText = text.toLowerCase().trim();
    console.log('🔍 Main detectIntent called with:', lowerText);
    
    // SPECIAL CASE: Conversational statements should be ignored
    console.log('🔍 Checking conversational patterns for:', `"${lowerText}"`);
    
    const conversationalPatterns = [
        /tell\s+(him|her|them|someone)/,  // Removed ^ to be more flexible
        /let\s+(him|her|them|someone)\s+know/,
        /(i'?ll|ill)\s+(talk|speak)\s+to/,
        /(i'?ll|ill)\s+call/,
        /(i'?ll|ill)\s+see/,
        /(i'?ll|ill)\s+reply/,
        /(i'?ll|ill)\s+get\s+back/,
        /(i'?ll|ill)\s+respond/,
        /(i'?ll|ill)\s+message/,
        /(i'?ll|ill)\s+text/
    ];
    
    const isConversational = conversationalPatterns.some((pattern, index) => {
        const matches = pattern.test(lowerText);
        console.log(`  Pattern ${index + 1}: ${pattern} -> ${matches ? 'MATCH' : 'no match'}`);
        return matches;
    });
    
    if (isConversational) {
        console.log('✅ Conversational statement detected - ignoring:', lowerText);
        return 'ignore';
    } else {
        console.log('❌ No conversational patterns matched for:', lowerText);
    }
    
    // SPECIAL CASE: Error-related questions should be treated as actions for Cursor AI
    const errorPatterns = [
        /error/,
        /bug/,
        /issue/,
        /problem/,
        /fix\s+this/,
        /what.*wrong/,
        /why.*not\s+work/,
        /debug/,
        /broken/,
        /exception/,
        /crash/
    ];
    
    const isErrorRelated = errorPatterns.some(pattern => pattern.test(lowerText));
    if (isErrorRelated) {
        console.log('🔧 Error-related query detected - routing as ACTION for Cursor handling');
        return 'action';
    }
    
    // Question patterns (for general questions only)
    const questionPatterns = [
        /^how(\s+do|\s+does|\s+did|\s+can|\s+to|\s+much|\s+many)/,
        /^why(\s+is|\s+are|\s+do|\s+does|\s+did)/,
        /^when(\s+is|\s+are|\s+was|\s+were|\s+do|\s+does|\s+did)/,
        /^where(\s+is|\s+are|\s+was|\s+were|\s+do|\s+does|\s+did)/,
        /^who(\s+is|\s+are|\s+was|\s+were)/,
        /^which(\s+is|\s+are|\s+was|\s+were)/,
        /^can\s+you(\s+tell|\s+explain|\s+describe)/,
        /^tell\s+me(\s+about)/,
        /^explain/,
        /^describe/,
        /weather/,
        /time(\s+is\s+it)?$/,
        /^\w+\s+today\?*$/
    ];
    
    // Action patterns (automation commands)
    const actionPatterns = [
        /^(open|launch|start|run)/,
        /^(close|quit|exit|stop)/,
        /^(click|press|tap)/,
        /^(type|write|enter)/,
        /^(go\s+to|navigate)/,
        /^(copy|paste|cut)/,
        /^(save|download|upload)/,
        /^(delete|remove|clear)/,
        /^(create|make|new)/,
        /^(find|search|look)/,
        /^(clone|git|pull|fetch|checkout)/,
        /^(take\s+a?\s?screenshot|screenshot)/,
        /browser|window|application|app|terminal|finder/
    ];
    
    // Check for question patterns first
    const isQuestion = questionPatterns.some(pattern => pattern.test(lowerText));
    if (isQuestion) {
        console.log('✅ Matched question pattern');
        return 'question';
    }
    
    // Check for action patterns
    const isAction = actionPatterns.some(pattern => pattern.test(lowerText));
    if (isAction) {
        console.log('🤖 Matched action pattern');
        return 'action';
    }
    
    // Default to question for ambiguous cases (faster path)
    console.log('❓ No specific pattern matched, defaulting to question');
    return 'question';
}

// Note: We now let the AI intelligently determine if screen analysis is needed
// instead of using hardcoded patterns

// Global variables
let mainWindow;
let wakeWordHandler;
let transcriptionHandler;
let chatGPTHandler;
let screenpipeHandler;
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
        visualEffectState: 'active',
        hasShadow: false, // Remove shadow to reduce visual footprint
        acceptFirstMouse: true, // Accept clicks immediately
        fullscreenWindowTitle: false, // Don't interfere with fullscreen apps
        thickFrame: false // Prevent thick frame interference
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // Always start with click-through DISABLED - window should be clickable by default
        setClickThrough(false);
        console.log('🖱️ Window shown - keeping clickable for easy interaction');
        
        // Don't auto-enable click-through - let the hover logic handle it
    });

    // Handle mouse enter/leave to control click-through
    mainWindow.webContents.on('dom-ready', () => {
        console.log('🖱️ DOM ready - click-through will be managed by hover events');
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

    // Initialize Screenpipe Handler
    screenpipeHandler = new ScreenpipeHandler();
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.warn('⚠️ OpenAI API key not configured for screenpipe. Screen analysis will be disabled.');
        mainWindow.webContents.send('warning', 'OpenAI API key not configured for screenpipe. Screen analysis will be disabled.');
    } else {
        screenpipeHandler.initialize(process.env.OPENAI_API_KEY).then((success) => {
            if (success) {
                console.log('✅ Screenpipe handler initialized successfully');
                
                // Connect screenpipe handler to ChatGPT handler
                if (chatGPTHandler) {
                    chatGPTHandler.setScreenpipeHandler(screenpipeHandler);
                    console.log('✅ Screenpipe context integration enabled');
                }
                
                // Start periodic screenshot capture if enabled
                if (process.env.SCREENSHOT_CAPTURE_ENABLED === 'true') {
                    const interval = parseFloat(process.env.SCREENSHOT_CAPTURE_INTERVAL) || 0.083; // 5 seconds default
                    screenpipeHandler.startPeriodicCapture(interval);
                }
            } else {
                console.error('❌ Failed to initialize screenpipe handler');
                mainWindow.webContents.send('error', 'Failed to initialize screenpipe handler. Check your OpenAI API key and ensure Qdrant is running.');
            }
        });
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
                
                // Quick intent detection to choose fast or slow path
                const intent = detectIntent(transcriptData.transcript);
                console.log('🎯 Detected intent:', intent, 'for:', transcriptData.transcript);
                console.log('📸 Screenshot available:', !!lastScreenshot);
                
                // Handle ignored conversational statements
                if (intent === 'ignore') {
                    console.log('💬 Ignoring conversational statement, resuming listening...');
                    // Restart listening immediately
                    setTimeout(() => {
                        if (isAgentRunning && !isListening) {
                            startListening();
                            updateStatus();
                        }
                    }, 500);
                    return;
                }
                
                // Add debug logging for intent detection
                if (intent === 'question') {
                    console.log('✅ Question detected, taking fast path');
                } else {
                    console.log('🤖 Action detected, taking automation path');
                }
                
                if (intent === 'question') {
                    // FAST PATH: Direct to ChatGPT for questions
                    console.log('🚀 Taking fast path for question...');
                    console.log('📋 Question route - stopping transcription to avoid interference');
                    stopListening(); // Stop listening for questions too to avoid interference
                    
                    mainWindow.webContents.send('question-processing', { command: transcriptData.transcript });
                    
                    // Always pass screenshot for questions - let AI decide if it needs to analyze it
                    const screenshotToUse = lastScreenshot;
                    
                    console.log('🔍 Question analysis:', {
                        hasScreenshot: !!lastScreenshot,
                        willPassScreenshot: !!screenshotToUse,
                        directScreenshotAnalysis: true
                    });
                    
                    chatGPTHandler.sendMessage(
                        transcriptData.transcript,
                        (response) => {
                            console.log('💬 ChatGPT question response received successfully');
                            console.log('📄 Response length:', response.length, 'characters');
                            mainWindow.webContents.send('question-response', { 
                                command: transcriptData.transcript,
                                response: response 
                            });
                            
                            // Resume transcription after question
                            setTimeout(() => {
                                if (isAgentRunning && !isListening) {
                                    console.log('🔄 Resuming after question response...');
                                    startListening();
                                    updateStatus();
                                }
                            }, 1000);
                        },
                        (error) => {
                            console.error('❌ ChatGPT question error details:', error);
                            mainWindow.webContents.send('question-error', { 
                                command: transcriptData.transcript,
                                error: error 
                            });
                            
                            // Resume transcription after error
                            setTimeout(() => {
                                if (isAgentRunning && !isListening) {
                                    console.log('🔄 Resuming after question error...');
                                    startListening();
                                    updateStatus();
                                }
                            }, 1000);
                        },
                        screenshotToUse, // Pass current screenshot for analysis
                        true  // Explicitly mark as question
                    );
                    

                    
                } else if (agentExecutor && agentExecutor.isReady()) {
                    // SLOW PATH: Full automation for actions
                    console.log('🤖 Executing automation via agent.ts...');
                    
                    // Stop transcription while executing to avoid interference
                    console.log('⏸️ Pausing transcription during automation execution...');
                    stopListening(); // Use proper stop function to maintain state
                    
                    mainWindow.webContents.send('automation-starting', { command: transcriptData.transcript });
                    
                    try {
                        const result = await agentExecutor.executeCommand(transcriptData.transcript, lastScreenshot);
                        
                        if (result.success) {
                            console.log('✅ Agent response successful:', result.output);
                            console.log('🎯 Response type:', result.type);
                            
                            if (result.type === 'question') {
                                // For questions: send to UI for display
                                mainWindow.webContents.send('question-response', { 
                                    command: transcriptData.transcript,
                                    response: result.output 
                                });
                            } else {
                                // For actions: send automation success
                                mainWindow.webContents.send('automation-success', { 
                                    command: transcriptData.transcript,
                                    result: result.output 
                                });
                            }
                            // Also send as chatgpt-response for UI compatibility
                            mainWindow.webContents.send('chatgpt-response', { response: result.output });
                        } else {
                            console.error('❌ Agent response failed:', result.error);
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
                                startListening();
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
                                startListening();
                                updateStatus();
                            }
                        }, 1000); // Brief delay before resuming
                    }
                } else {
                    console.log('ℹ️ Agent executor not ready, falling back to ChatGPT for action');
                    // Fallback to ChatGPT handler if agent executor is not ready
                    mainWindow.webContents.send('automation-starting', { command: transcriptData.transcript });
                    
                    chatGPTHandler.sendMessage(
                        transcriptData.transcript,
                        (response) => {
                            console.log('🤖 ChatGPT fallback response:', response);
                            mainWindow.webContents.send('automation-success', { 
                                command: transcriptData.transcript,
                                result: response 
                            });
                        },
                        (error) => {
                            console.error('❌ ChatGPT fallback error:', error);
                            mainWindow.webContents.send('automation-error', { 
                                command: transcriptData.transcript,
                                error: error 
                            });
                        },
                        lastScreenshot
                    );
                    
                    // Resume transcription after fallback
                    setTimeout(() => {
                        if (isAgentRunning && !isListening) {
                            console.log('🔄 Resuming after fallback...');
                            startListening();
                            updateStatus();
                        }
                    }, 1000);
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

// Click-through management
function setClickThrough(enabled) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
        console.log(enabled ? '🖱️ Click-through enabled' : '🖱️ Click-through disabled');
    }
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

ipcMain.on('set-click-through', (event, enabled) => {
    setClickThrough(enabled);
});

// Handle widget interaction states
let leaveTimeout = null;
let isDragging = false;

ipcMain.on('widget-mouse-enter', () => {
    console.log('🖱️ Mouse entered widget area');
    // Clear any pending re-enable timeout
    if (leaveTimeout) {
        clearTimeout(leaveTimeout);
        leaveTimeout = null;
    }
    // IMMEDIATELY disable click-through - no delay
    setClickThrough(false);
});

ipcMain.on('widget-mouse-leave', () => {
    console.log('🖱️ Mouse left widget area');
    // Only re-enable click-through if not currently dragging with a longer delay
    if (!isDragging) {
        leaveTimeout = setTimeout(() => {
            if (!isDragging && mainWindow && !mainWindow.isDestroyed()) {
                setClickThrough(true);
                console.log('🖱️ Re-enabled click-through after mouse leave');
            }
        }, 2000); // Increased to 2 seconds to give more time to interact
    }
});

// Handle drag events
ipcMain.on('widget-drag-start', () => {
    console.log('🖱️ Widget drag started');
    isDragging = true;
    // Clear any pending timeouts
    if (leaveTimeout) {
        clearTimeout(leaveTimeout);
        leaveTimeout = null;
    }
    // Ensure click-through is disabled
    setClickThrough(false);
});

ipcMain.on('widget-drag-end', () => {
    console.log('🖱️ Widget drag ended');
    isDragging = false;
    // Longer delay before potentially re-enabling click-through to allow for more interactions
    setTimeout(() => {
        if (!isDragging) {
            setClickThrough(true);
            console.log('🖱️ Re-enabled click-through after drag end');
        }
    }, 1000); // Increased to 1 second
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
    
    if (screenpipeHandler) {
        await screenpipeHandler.cleanup();
    }
    
    if (agentExecutor) {
        await agentExecutor.cleanup();
    }
    
    console.log('✅ Cleanup completed');
}); 