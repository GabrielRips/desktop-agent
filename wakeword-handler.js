const { spawn } = require('child_process');
const path = require('path');

class WakeWordHandler {
    constructor() {
        console.log('🔧 WakeWordHandler constructor called');
        this.pythonProcess = null;
        this.isRunning = false;
        this.onDetectionCallback = null;
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
            
            this.pythonProcess = spawn(pythonPath, [scriptPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: __dirname
            });
            console.log('✅ Python process spawned successfully');
            console.log('📊 Process PID:', this.pythonProcess.pid);

            this.pythonProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                console.log('📤 Python stdout:', output);
                
                // Try to parse JSON output from the Python script
                try {
                    const detection = JSON.parse(output);
                    console.log('📋 Parsed JSON:', detection);
                    if (detection.type === 'wake_word_detected') {
                        console.log(`🎉 Wake word detected: ${detection.label} (score: ${detection.score})`);
                        if (this.onDetectionCallback) {
                            console.log('📞 Calling detection callback...');
                            this.onDetectionCallback(detection);
                        } else {
                            console.log('⚠️ No detection callback set');
                        }
                    }
                } catch (e) {
                    console.log('📝 Not JSON, checking for detection message...');
                    // If not JSON, check if it's a wake word detection message
                    if (output.includes('WAKE WORD DETECTED:')) {
                        console.log('🎉 Python wake word detection:', output);
                        // Extract label and score from the message
                        const match = output.match(/WAKE WORD DETECTED: (\w+) \(score: ([\d.]+)\)/);
                        if (match) {
                            const detection = {
                                type: 'wake_word_detected',
                                label: match[1],
                                score: parseFloat(match[2]),
                                timestamp: Date.now()
                            };
                            console.log('📋 Parsed detection:', detection);
                            if (this.onDetectionCallback) {
                                console.log('📞 Calling detection callback...');
                                this.onDetectionCallback(detection);
                            }
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
            console.log('🎧 Python script should now be listening for wake words...');

        } catch (error) {
            console.error('❌ Failed to start wake word detection:', error);
            this.isRunning = false;
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