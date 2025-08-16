const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Virtual Environment Setup...');

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

// Test script to check imports
const testScript = `
import sys
import os

print("Python executable:", sys.executable)
print("Python version:", sys.version)
print("Virtual environment:", os.environ.get('VIRTUAL_ENV', 'Not set'))
print("PATH includes venv:", 'venv' in os.environ.get('PATH', ''))

try:
    import pyaudio
    print("pyaudio imported successfully")
    print("   pyaudio version:", pyaudio.__version__)
except ImportError as e:
    print("pyaudio import failed:", e)

try:
    import numpy
    print("numpy imported successfully")
    print("   numpy version:", numpy.__version__)
except ImportError as e:
    print("numpy import failed:", e)

try:
    import openwakeword
    print("openwakeword imported successfully")
except ImportError as e:
    print("openwakeword import failed:", e)

try:
    import onnxruntime
    print("onnxruntime imported successfully")
except ImportError as e:
    print("onnxruntime import failed:", e)
`;

// Write test script to temporary file
const fs = require('fs');
const testFile = path.join(__dirname, 'temp_test_venv.py');
fs.writeFileSync(testFile, testScript);

console.log('🚀 Running virtual environment test...');

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
        console.log('✅ Virtual environment test passed!');
    } else {
        console.log('❌ Virtual environment test failed!');
    }
});

pythonProcess.on('error', (error) => {
    console.error('❌ Error running test:', error);
}); 