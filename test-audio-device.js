const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Audio Device Access...');

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

// Create a simple Python script to test audio device access
const testScript = `
import pyaudio
import numpy as np
import time

print("Testing audio device access...")

try:
    p = pyaudio.PyAudio()
    print("PyAudio initialized successfully")
    
    # List devices
    print("Available devices:")
    for i in range(p.get_device_count()):
        try:
            device_info = p.get_device_info_by_index(i)
            if device_info['maxInputChannels'] > 0:
                print(f"  Input device {i}: {device_info['name']}")
        except Exception as e:
            print(f"  Error getting device {i} info: {e}")
    
    # Try to open a stream
    try:
        stream = p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=16000,
            input=True,
            frames_per_buffer=1024
        )
        print("Audio stream opened successfully")
        
        # Try to read some audio
        print("Reading audio data...")
        for i in range(10):
            try:
                data = stream.read(1024, exception_on_overflow=False)
                audio_frame = np.frombuffer(data, dtype=np.int16)
                audio_level = np.abs(audio_frame).mean()
                print(f"Frame {i+1}: Audio level = {audio_level:.2f}")
                time.sleep(0.1)
            except Exception as e:
                print(f"Error reading frame {i+1}: {e}")
        
        stream.close()
        print("Audio stream closed")
        
    except Exception as e:
        print(f"Error opening audio stream: {e}")
    
    p.terminate()
    print("PyAudio terminated")
    
except Exception as e:
    print(f"Error initializing PyAudio: {e}")
`;

// Write test script to temporary file
const fs = require('fs');
const testFile = path.join(__dirname, 'temp_test_audio.py');
fs.writeFileSync(testFile, testScript);

console.log('🚀 Running audio device test...');

const pythonProcess = spawn(pythonPath, [testFile], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname,
    env: env
});

pythonProcess.stdout.on('data', (data) => {
    console.log('📤 Output:', data.toString());
});

pythonProcess.stderr.on('data', (data) => {
    console.error('❌ Error:', data.toString());
});

pythonProcess.on('close', (code) => {
    console.log(`🛑 Test completed with code ${code}`);
    
    // Clean up temporary file
    try {
        fs.unlinkSync(testFile);
    } catch (e) {
        console.log('⚠️ Could not delete temporary file:', e.message);
    }
    
    if (code === 0) {
        console.log('✅ Audio device test passed!');
    } else {
        console.log('❌ Audio device test failed!');
    }
});

pythonProcess.on('error', (error) => {
    console.error('❌ Error running test:', error);
}); 