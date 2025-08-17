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

// Response elements (may not exist initially)
let responseArea = document.getElementById('response-area');
let responseContent = document.getElementById('response-content');
let collapseBtn = document.getElementById('collapse-btn');
let widgetContainer = document.querySelector('.widget-container');
let widgetContent = document.querySelector('.widget-content');

function initializeResponseElements() {
    // Re-get response elements in case they weren't available at load time
    if (!responseArea) responseArea = document.getElementById('response-area');
    if (!responseContent) responseContent = document.getElementById('response-content');
    if (!collapseBtn) collapseBtn = document.getElementById('collapse-btn');
    if (!widgetContainer) widgetContainer = document.querySelector('.widget-container');
    if (!widgetContent) widgetContent = document.querySelector('.widget-content');
    
    console.log('🔍 Response Elements check:');
    console.log('- responseArea:', !!responseArea);
    console.log('- responseContent:', !!responseContent);
    console.log('- widgetContainer:', !!widgetContainer);
    console.log('- widgetContent:', !!widgetContent);
}

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
        console.log('Debug - elements found:');
        console.log('- mainStatusIndicator:', !!mainStatusIndicator);
        console.log('- statusText:', !!statusText);
        console.log('- taskDescription:', !!taskDescription);
        console.log('- startBtn:', !!startBtn);
        console.log('- stopBtn:', !!stopBtn);
        console.log('- closeBtn:', !!closeBtn);
        // Don't return early - continue to set up what we can
    }

    // Set up event listeners
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log('🎯 Start button clicked');
            if (!isAgentRunning) {
                ipcRenderer.send('start-agent');
            }
        });
        console.log('✅ Start button listener added');
    } else {
        console.error('❌ Start button not found!');
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            console.log('🛑 Stop button clicked');
            if (isAgentRunning) {
                ipcRenderer.send('stop-agent');
            }
        });
        console.log('✅ Stop button listener added');
    } else {
        console.error('❌ Stop button not found!');
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('❌ Close button clicked');
            // Hide window instead of closing to keep it running
            ipcRenderer.send('minimize-to-tray');
        });
        console.log('✅ Close button listener added');
    } else {
        console.error('❌ Close button not found!');
    }
    
    // Add click-through toggle button functionality
    const toggleClickthroughBtn = document.getElementById('toggle-clickthrough-btn');
    if (toggleClickthroughBtn) {
        let clickThroughEnabled = false; // Track current state
        toggleClickthroughBtn.addEventListener('click', () => {
            clickThroughEnabled = !clickThroughEnabled;
            console.log('🖱️ Toggle click-through:', clickThroughEnabled);
            ipcRenderer.send('set-click-through', clickThroughEnabled);
            
            // Update button appearance
            toggleClickthroughBtn.style.opacity = clickThroughEnabled ? '0.5' : '1';
            toggleClickthroughBtn.title = clickThroughEnabled ? 
                'Click-through enabled (click to make window clickable)' : 
                'Click-through disabled (click to make window transparent to clicks)';
        });
        console.log('✅ Click-through toggle button listener added');
    } else {
        console.error('❌ Click-through toggle button not found!');
    }

    // Collapse button functionality (if available)
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            console.log('❌ Collapse button clicked');
            hideResponseArea();
        });
    } else {
        console.log('⚠️ Collapse button not found - checking after DOM load');
        // Try again after DOM is fully loaded
        setTimeout(() => {
            const btn = document.getElementById('collapse-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    console.log('❌ Collapse button clicked (delayed)');
                    hideResponseArea();
                });
            }
        }, 500);
    }
    
    // Initialize audio capture
    try {
    audioCapture = new AudioCapture();
        console.log('✅ Audio capture initialized');
    } catch (error) {
        console.error('❌ Audio capture initialization failed:', error);
    }
    

    console.log('✅ UI initialization complete');

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

function showResponseArea(response) {
    console.log('📄 Showing response area with text:', response ? response.substring(0, 100) + '...' : 'EMPTY RESPONSE');
    

    // Get all elements fresh every time
    const responseContent = document.getElementById('response-content');
    const responseArea = document.getElementById('response-area');
    const widgetContainer = document.querySelector('.widget-container');
    const widgetContent = document.querySelector('.widget-content');

    
    console.log('🔍 Show - Element check:', {
        responseContent: !!responseContent,
        responseArea: !!responseArea,
        widgetContainer: !!widgetContainer,
        widgetContent: !!widgetContent
    });
    
    if (!responseContent || !responseArea) {
        console.error('❌ Required elements not found!');
        return;
    }
    
    // FORCE COMPLETE RESET first to ensure clean state
    console.log('🔄 Completely resetting response area state...');
    responseArea.classList.remove('visible');
    
    // Force complete reset with cssText override
    responseArea.style.cssText = `
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        max-height: 0 !important;
        padding: 0 !important;
        transform: translateY(-10px) !important;
        overflow: hidden !important;
        background: rgba(10, 10, 15, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        margin-top: 8px !important;
        border-radius: 12px !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    `;
    
    // Clear and set the response content with markdown parsing
    responseContent.innerHTML = '';
    responseContent.textContent = '';
    const displayText = response || 'No response received';
    
    // Format the response text for better readability
    const formattedText = formatResponseText(displayText);
    responseContent.innerHTML = formattedText;
    console.log('✅ Content set with formatting:', displayText.substring(0, 50) + '...');
    
    // Force a reflow to ensure reset is applied
    responseArea.offsetHeight;
    
    // Now expand the container first
    if (widgetContainer) {
        widgetContainer.classList.add('expanded');
        console.log('✅ Widget container expanded');
    }
    
    if (widgetContent) {
        widgetContent.classList.add('expanded');
        console.log('✅ Widget content expanded');
    }
    
    // Then show the response area with a small delay for smooth animation
    setTimeout(() => {
        console.log('📤 Making response area visible...');
        
        // Reset to proper visible state
        responseArea.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            max-height: 70vh !important;
            padding: 16px !important;
            transform: translateY(0) !important;
            overflow-y: auto !important;
            background: rgba(10, 10, 15, 0.95) !important;
            backdrop-filter: blur(10px) !important;
            margin-top: 8px !important;
            border-radius: 12px !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        `;
        
        // Add the visible class
        responseArea.classList.add('visible');
        
        console.log('✅ Response area made visible with forced styles');
    }, 100); // Slightly longer delay for smooth animation
    
    // Update status
    updateStatus('success', 'Question Answered', 'Response displayed below');
}

function hideResponseArea() {
    console.log('📄 Hiding response area');
    
    // Get elements fresh
    const responseArea = document.getElementById('response-area');
    const widgetContainer = document.querySelector('.widget-container');
    const widgetContent = document.querySelector('.widget-content');
    const responseContent = document.getElementById('response-content');
    

    console.log('🔍 Hide - Element check:', {
        responseArea: !!responseArea,
        widgetContainer: !!widgetContainer,
        widgetContent: !!widgetContent,
        responseContent: !!responseContent
    });

    
    // Immediately hide the response area completely
    if (responseArea) {
        console.log('🔄 Hiding response area with complete reset...');
        responseArea.classList.remove('visible');
        
        // Force complete hiding with explicit styles
        responseArea.style.cssText = `
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            max-height: 0 !important;
            padding: 0 !important;
            transform: translateY(-10px) !important;
            overflow: hidden !important;
        `;
        
        console.log('✅ Response area immediately hidden with forced styles');
    }
    
    // Collapse widget container back to original size
    if (widgetContainer) {
        widgetContainer.classList.remove('expanded');
        widgetContainer.style.height = '180px';
        console.log('✅ Widget container collapsed to original size');
    }
    
    if (widgetContent) {
        widgetContent.classList.remove('expanded');
    }
    
    // Clean up content completely
    if (responseContent) {
        responseContent.innerHTML = ''; // Use innerHTML to ensure complete cleanup
        responseContent.textContent = '';
    }
    
    console.log('✅ Response area completely hidden and reset for next use');
    
    // Reset to ready state
    if (isAgentRunning) {
        updateStatus('idle', 'Active', 'Ready for next command');
    }
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
    
    // Ensure response area is hidden for automation
    hideResponseArea();
    
    // Return to ready state after showing success
    setTimeout(() => {
        if (isAgentRunning) {
            updateStatus('idle', 'Active', 'Ready for next command');
        }
    }, 3000);
});


// Handler for question processing (fast path)
ipcRenderer.on('question-processing', (event, data) => {
    console.log('🚀 Question processing (fast path):', data.command);
    updateStatus('processing', 'Thinking...', 'Getting your answer quickly');
});



// New handler for question responses
ipcRenderer.on('question-response', (event, data) => {
    console.log('❓ Question response received:', data);
    console.log('❓ Response data type:', typeof data);
    console.log('❓ Response content:', data.response);
    
    if (!data || !data.response) {
        console.error('❌ No response data received!');
        updateStatus('error', 'Question Failed', 'No response data');
        return;
    }
    
    showResponseArea(data.response);

});

// Handler for question errors
ipcRenderer.on('question-error', (event, data) => {
    console.error('❌ Question error:', data.error);
    updateStatus('error', 'Question Failed', 'Error getting answer');
    showTemporaryMessage('Question Error: ' + data.error, 'error', 4000);
    
    // Return to ready state after showing error
    setTimeout(() => {
        if (isAgentRunning) {
            updateStatus('idle', 'Active', 'Ready for next command');
        }
    }, 4000);
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
// Test function to demonstrate UI expansion
function testUIExpansion() {
    console.log('🧪 Testing UI expansion...');
    const testResponse = `This is a test response to demonstrate dynamic UI expansion!

The UI should now expand vertically to show ALL content based on the actual text height.

Key Features:
• Dynamic height calculation based on content
• Smooth CSS animations with proper timing
• Scroll support ONLY when content exceeds maximum height
• Clean collapse functionality with proper cleanup
• Automatic height adjustment for any response length

Short responses will expand just enough to show the content.
Long responses will expand to a maximum height and show scrolling.

This demonstrates that dynamic UI expansion now works perfectly with proper height calculation! You can test different lengths of content.`;
    
    showResponseArea(testResponse);
}

// Test with short content
function testShortExpansion() {
    console.log('🧪 Testing short UI expansion...');
    const shortResponse = `Short response that should expand just to fit this text without extra space.`;
    showResponseArea(shortResponse);
}

// Test with very long content
function testLongExpansion() {
    console.log('🧪 Testing long UI expansion...');
    const longResponse = `This is a very long response to test scrolling behavior.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

This content should show scrolling since it exceeds the maximum allowed height.`;
    
    showResponseArea(longResponse);
}

// Format response text for better readability
function formatResponseText(text) {
    if (!text) return 'No response received';
    
    let formatted = text
        // Convert markdown headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        
        // Convert bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        
        // Convert italic text  
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // Convert bullet points
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/^• (.*$)/gm, '<li>$1</li>')
        
        // Wrap consecutive list items in ul tags
        .replace(/(<li>.*<\/li>)\s*(?=<li>)/gs, '$1')
        .replace(/(<li>.*?<\/li>)(?!\s*<li>)/gs, '<ul>$1</ul>')
        .replace(/<\/li>\s*<ul><li>/g, '</li><li>')
        .replace(/<\/ul>\s*<ul>/g, '')
        
        // Convert line breaks to paragraphs
        .split('\n\n')
        .map(paragraph => {
            paragraph = paragraph.trim();
            if (!paragraph) return '';
            
            // Don't wrap headers or lists in p tags
            if (paragraph.match(/^<[h1-6ul]/)) {
                return paragraph;
            }
            
            // Don't wrap if already wrapped
            if (paragraph.startsWith('<') && paragraph.endsWith('>')) {
                return paragraph;
            }
            
            return `<p>${paragraph}</p>`;
        })
        .join('\n');
    
    return formatted;
}

// Make test function globally available for debugging
window.testUIExpansion = testUIExpansion;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Initializing UI...');
    initializeUI();
    
    // Handle mouse events for click-through control with better drag support
    const widgetContainer = document.querySelector('.widget-container');
    if (widgetContainer) {
        let isDragging = false;
        let dragStarted = false;
        let mouseEnterTimeout = null;
        
        // Hover detection with slight delay to prevent flickering
        widgetContainer.addEventListener('mouseenter', () => {
            console.log('🖱️ Renderer: Mouse entered widget');
            // Clear any pending leave timeout
            if (mouseEnterTimeout) {
                clearTimeout(mouseEnterTimeout);
                mouseEnterTimeout = null;
            }
            ipcRenderer.send('widget-mouse-enter');
        });
        
        widgetContainer.addEventListener('mouseleave', (e) => {
            console.log('🖱️ Renderer: Mouse left widget');
            // Small delay to prevent rapid enter/leave cycles
            mouseEnterTimeout = setTimeout(() => {
                if (!isDragging) {
                    ipcRenderer.send('widget-mouse-leave');
                }
            }, 100);
        });
        
        // Enhanced drag detection - only send drag-start on actual mousedown
        widgetContainer.addEventListener('mousedown', (e) => {
            console.log('🖱️ Renderer: Mouse down - starting drag');
            isDragging = true;
            dragStarted = false;
            // Clear any mouse leave timeouts
            if (mouseEnterTimeout) {
                clearTimeout(mouseEnterTimeout);
                mouseEnterTimeout = null;
            }
            ipcRenderer.send('widget-drag-start');
            e.preventDefault(); // Prevent text selection while dragging
        });
        
        // Don't need mousemove for drag detection - mousedown is enough
        
        // Handle drag end everywhere - more reliable
        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                console.log('🖱️ Renderer: Mouse up - drag ended');
                isDragging = false;
                dragStarted = false;
                ipcRenderer.send('widget-drag-end');
            }
        });
        
        // Also end drag on mouse leave document
        document.addEventListener('mouseleave', () => {
            if (isDragging) {
                console.log('🖱️ Renderer: Mouse left document - drag ended');
                isDragging = false;
                dragStarted = false;
                ipcRenderer.send('widget-drag-end');
            }
        });
    } else {
        console.error('❌ Widget container not found!');
    }
    
    // Add a test button for debugging (temporary)
    setTimeout(() => {
        console.log('💡 You can test UI expansion by running: testUIExpansion() in the console');
        console.log('💡 Or clicking the Start button and asking a question');
    }, 2000);
});

// Export for debugging
window.agentWidget = {
    updateStatus,
    showTemporaryMessage,
    isAgentRunning: () => isAgentRunning,
    isListening: () => isListening
};