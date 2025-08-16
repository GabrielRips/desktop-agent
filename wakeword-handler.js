const { spawn } = require('child_process');
const path = require('path');

class WakeWordHandler {
    constructor() {
        console.log('🔧 WakeWordHandler constructor called');
        this.pythonProcess = null;
        this.isRunning = false;
        this.onDetectionCallback = null;
        this.audioCapture = null;
        console.log('✅ WakeWordHandler initialized');
    }

    startDetection(callback) {
        console.log('🚀 startDetection called with callback:', typeof callback);
        
        if (this.isRunning) {
            console.log('⚠️ Wake word detection is already running');
            return;
        }

        this.onDetectionCallback = callback;
        this.isRunning = true;
        console.log('✅ Detection state set to running');

        // Get the path to the Python script
        const scriptPath = path.join(__dirname, 'wakeword_detector.py');
        console.log('📁 Script path:', scriptPath);
        
        // Try multiple Python paths - PRIORITIZE VENV FIRST!
        let pythonPath = null;
        const possiblePaths = [
            // Try venv first (where packages are installed!)
            process.platform === 'win32' 
                ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
                : path.join(__dirname, 'venv', 'bin', 'python'),
            process.platform === 'win32' 
                ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
                : path.join(__dirname, 'venv', 'bin', 'python3'),
            // Try system Python (fallback)
            'python3',
            'python',
            // Try common system paths for macOS
            '/opt/homebrew/bin/python3',
            '/usr/local/bin/python3',
            '/usr/bin/python3',
            // Try with full path on Windows
            'C:\\Python311\\python.exe',
            'C:\\Python310\\python.exe',
            'C:\\Python39\\python.exe'
        ];

        console.log('🔍 Testing Python paths...');
        // Check if each path exists
        for (const testPath of possiblePaths) {
            try {
                console.log(`  Testing path: ${testPath}`);
                if (testPath.includes('\\') || testPath.includes('/')) {
                    // It's a file path, check if it exists
                    const fs = require('fs');
                    if (fs.existsSync(testPath)) {
                        pythonPath = testPath;
                        console.log(`✅ Found Python at: ${testPath}`);
                        break;
                    } else {
                        console.log(`❌ Path does not exist: ${testPath}`);
                    }
                } else {
                    // It's a command, assume it exists
                    pythonPath = testPath;
                    console.log(`✅ Using command: ${testPath}`);
                    break;
                }
            } catch (e) {
                console.log(`❌ Error testing path ${testPath}:`, e.message);
            }
        }

        if (!pythonPath) {
            console.error('❌ No Python executable found. Please ensure Python is installed and accessible.');
            this.isRunning = false;
            return;
        }

        console.log('🎯 Final Python path:', pythonPath);
        console.log('🎯 Final script path:', scriptPath);

        try {
            console.log('🚀 Spawning Python process...');
            console.log('📋 Command:', pythonPath, scriptPath);
            console.log('📁 Working directory:', __dirname);
            
            // Set up environment variables for virtual environment
            const env = { ...process.env };
            
            // If using virtual environment Python, set up the environment
            if (pythonPath.includes('venv')) {
                const venvScriptsPath = process.platform === 'win32' 
                    ? path.join(__dirname, 'venv', 'Scripts')
                    : path.join(__dirname, 'venv', 'bin');
                
                // Add venv Scripts/bin to PATH
                env.PATH = `${venvScriptsPath}${path.delimiter}${env.PATH}`;
                env.VIRTUAL_ENV = path.join(__dirname, 'venv');
                
                console.log('🔧 Virtual environment activated:');
                console.log('   VIRTUAL_ENV:', env.VIRTUAL_ENV);
                console.log('   PATH includes:', venvScriptsPath);
            }
            
            this.pythonProcess = spawn(pythonPath, [scriptPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: __dirname,
                env: env
            });
            console.log('✅ Python process spawned successfully');
            console.log('📊 Process PID:', this.pythonProcess.pid);

            this.pythonProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                console.log('📤 Python stdout:', output);
                
                // Split output by lines to handle multiple messages
                const lines = output.split('\n');
                
                for (const line of lines) {
                    if (!line.trim()) continue; // Skip empty lines
                    
                    console.log('🔍 Processing line:', line);
                    
                    // Try to parse JSON output from the Python script
                    try {
                        const detection = JSON.parse(line);
                        console.log('📋 Parsed JSON:', detection);
                        if (detection.type === 'wake_word_detected') {
                            console.log(`🎉 Wake word detected from JSON: ${detection.label} (score: ${detection.score})`);
                            if (this.onDetectionCallback) {
                                console.log('📞 Calling detection callback from JSON...');
                                this.onDetectionCallback(detection);
                            } else {
                                console.log('⚠️ No detection callback set');
                            }
                        }
                    } catch (e) {
                        // If not JSON, check if it's a wake word detection message
                        if (line.includes('WAKE WORD DETECTED:')) {
                            console.log('🎉 Python wake word detection message:', line);
                            // Extract label and score from the message
                            const match = line.match(/WAKE WORD DETECTED: (\w+) \(score: ([\d.]+)\)/);
                            if (match) {
                                const detection = {
                                    type: 'wake_word_detected',
                                    label: match[1],
                                    score: parseFloat(match[2]),
                                    timestamp: Date.now()
                                };
                                console.log('📋 Parsed detection from text:', detection);
                                if (this.onDetectionCallback) {
                                    console.log('📞 Calling detection callback from text...');
                                    this.onDetectionCallback(detection);
                                }
                            } else {
                                console.log('⚠️ Could not parse wake word detection message:', line);
                            }
                        } else {
                            console.log('📝 Other Python output:', line);
                        }
                    }
                }
            });

            this.pythonProcess.stderr.on('data', (data) => {
                console.error('❌ Python stderr:', data.toString());
            });

            this.pythonProcess.on('close', (code) => {
                console.log(`🛑 Wake word detection process exited with code ${code}`);
                this.isRunning = false;
            });

            this.pythonProcess.on('error', (error) => {
                console.error('❌ Error starting wake word detection:', error);
                this.isRunning = false;
            });

            console.log('✅ All event listeners set up successfully');
            console.log('🎧 Python script should now be listening for audio data...');

        } catch (error) {
            console.error('❌ Failed to start wake word detection:', error);
            this.isRunning = false;
        }
    }

    // Method to send audio data to Python script
    sendAudioData(audioBuffer) {
        if (!this.isRunning || !this.pythonProcess) {
            console.log('⚠️ Wake word detection not running, cannot send audio data');
            return;
        }

        try {
            // Convert ArrayBuffer to Buffer
            const buffer = Buffer.from(audioBuffer);
            
            // Send 4-byte length followed by audio data
            const lengthBuffer = Buffer.alloc(4);
            lengthBuffer.writeUInt32LE(buffer.length, 0);
            
            this.pythonProcess.stdin.write(lengthBuffer);
            this.pythonProcess.stdin.write(buffer);
            
            console.log(`📤 Sent audio data: ${buffer.length} bytes`);
        } catch (error) {
            console.error('❌ Error sending audio data:', error);
        }
    }

    stopDetection() {
        console.log('🛑 stopDetection called');
        if (!this.isRunning || !this.pythonProcess) {
            console.log('⚠️ Not running or no process to stop');
            return;
        }

        console.log('🛑 Stopping wake word detection...');
        this.isRunning = false;

        if (this.pythonProcess) {
            console.log('🔇 Killing Python process...');
            this.pythonProcess.kill('SIGTERM');
            this.pythonProcess = null;
            console.log('✅ Python process killed');
        }
    }

    isDetectionRunning() {
        return this.isRunning;
    }
}

module.exports = WakeWordHandler; 