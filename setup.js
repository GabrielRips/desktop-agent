#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Desktop Agent Setup\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from template...');
    const envExample = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
    fs.writeFileSync(envPath, envExample);
    console.log('✅ .env file created. Please edit it with your API keys.\n');
} else {
    console.log('✅ .env file already exists.\n');
}

// Check Node.js dependencies
console.log('📦 Checking Node.js dependencies...');
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    console.log(`✅ Package.json found with ${Object.keys(packageJson.dependencies || {}).length} dependencies`);
    
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
        console.log('📦 Installing Node.js dependencies...');
        execSync('npm install', { stdio: 'inherit', cwd: __dirname });
        console.log('✅ Node.js dependencies installed.\n');
    } else {
        console.log('✅ Node.js dependencies already installed.\n');
    }
} catch (error) {
    console.error('❌ Error with Node.js dependencies:', error.message);
}

// Check Python dependencies
console.log('🐍 Checking Python dependencies...');
try {
    const requirements = fs.readFileSync(path.join(__dirname, 'requirements.txt'), 'utf8');
    const packages = requirements.trim().split('\n').filter(line => line.trim());
    console.log(`✅ Requirements.txt found with ${packages.length} packages`);
    
    // Check if packages are installed
    try {
        execSync('python -c "import pyaudio, numpy, openwakeword"', { stdio: 'pipe' });
        console.log('✅ Python dependencies already installed.\n');
    } catch (error) {
        console.log('📦 Installing Python dependencies...');
        try {
            execSync('pip install -r requirements.txt', { stdio: 'inherit', cwd: __dirname });
            console.log('✅ Python dependencies installed.\n');
        } catch (pipError) {
            console.log('⚠️  pip install failed, trying pip3...');
            try {
                execSync('pip3 install -r requirements.txt', { stdio: 'inherit', cwd: __dirname });
                console.log('✅ Python dependencies installed with pip3.\n');
            } catch (pip3Error) {
                console.error('❌ Failed to install Python dependencies. Please install manually:');
                console.error('   pip install -r requirements.txt');
                console.error('   or');
                console.error('   pip3 install -r requirements.txt\n');
            }
        }
    }
} catch (error) {
    console.error('❌ Error with Python dependencies:', error.message);
}

// Check API keys
console.log('🔑 Checking API keys...');
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    let missingKeys = [];
    
    lines.forEach(line => {
        if (line.includes('your_') && line.includes('_here')) {
            const keyName = line.split('=')[0];
            missingKeys.push(keyName);
        }
    });
    
    if (missingKeys.length > 0) {
        console.log('⚠️  Missing API keys in .env file:');
        missingKeys.forEach(key => console.log(`   - ${key}`));
        console.log('\n📝 Please edit the .env file and add your API keys:');
        console.log('   - OpenAI API Key: https://platform.openai.com/api-keys');
        console.log('   - Deepgram API Key: https://console.deepgram.com/\n');
    } else {
        console.log('✅ API keys appear to be configured.\n');
    }
} catch (error) {
    console.error('❌ Error checking API keys:', error.message);
}

console.log('🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Edit .env file with your API keys');
console.log('2. Run "npm start" to start the app');
console.log('3. Run "npm run dev" for development mode with DevTools');
console.log('\n📖 See README.md for detailed instructions and troubleshooting.'); 