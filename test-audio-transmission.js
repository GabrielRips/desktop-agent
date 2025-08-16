const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Audio Data Transmission...');

// Get the path to the virtual environment Python
const pythonPath = process.platform === 'win32' 
    ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
    : path.join(__dirname, 'venv', 'bin', 'python');

console.log('📁 Python path:', pythonPath);

// Set up environment variables for virtual environment
const env = { ...process.env };
const venvScriptsPath = process.platform === 'win32' 
    ? path.join(__dirname, 'venv', 'Scripts')
    : path.join(__dirname, 'venv', 'bin');

// Add venv Scripts/bin to PATH
env.PATH = `${venvScriptsPath}${path.delimiter}${env.PATH}`;
env.VIRTUAL_ENV = path.join(__dirname, 'venv');

console.log('🔧 Environment setup:');
console.log('   VIRTUAL_ENV:', env.VIRTUAL_ENV);
console.log('   PATH includes:', venvScriptsPath);

console.log('🚀 Spawning Python process...');

const pythonProcess = spawn(pythonPath, ['wakeword_detector.py'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname,
    env: env
});

pythonProcess.stdout.on('data', (data) => {
    console.log('📤 Python stdout:', data.toString());
});

pythonProcess.stderr.on('data', (data) => {
    console.error('❌ Python stderr:', data.toString());
});

pythonProcess.on('close', (code) => {
    console.log(`🛑 Python process exited with code ${code}`);
});

pythonProcess.on('error', (error) => {
    console.error('❌ Error running Python process:', error);
});

// Wait a moment for Python to start up
setTimeout(() => {
    console.log('📤 Sending test audio data...');
    
    // Create some test audio data (1 second of silence at 16kHz, 16-bit)
    const sampleRate = 16000;
    const duration = 1; // 1 second
    const numSamples = sampleRate * duration;
    const audioData = new Int16Array(numSamples);
    
    // Fill with some test data (sine wave)
    for (let i = 0; i < numSamples; i++) {
        audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 1000; // 440 Hz tone
    }
    
    // Convert to buffer
    const buffer = Buffer.from(audioData.buffer);
    
    // Send 4-byte length followed by audio data
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(buffer.length, 0);
    
    try {
        pythonProcess.stdin.write(lengthBuffer);
        pythonProcess.stdin.write(buffer);
        console.log(`✅ Sent ${buffer.length} bytes of test audio data`);
    } catch (error) {
        console.error('❌ Error sending audio data:', error);
    }
    
    // Send a few more chunks
    setTimeout(() => {
        console.log('📤 Sending more test audio data...');
        try {
            pythonProcess.stdin.write(lengthBuffer);
            pythonProcess.stdin.write(buffer);
            console.log(`✅ Sent another ${buffer.length} bytes of test audio data`);
        } catch (error) {
            console.error('❌ Error sending audio data:', error);
        }
        
        // Stop after a few seconds
        setTimeout(() => {
            console.log('🛑 Stopping test...');
            pythonProcess.kill('SIGTERM');
        }, 2000);
    }, 1000);
    
}, 2000); 