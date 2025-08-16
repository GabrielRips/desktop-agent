#!/bin/bash

echo "🔧 Setting up Python dependencies for Desktop Agent..."

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ python3 is not installed. Please install Python 3 first."
    echo "   You can install it from: https://www.python.org/downloads/"
    echo "   Or use Homebrew: brew install python"
    exit 1
fi

echo "✅ Found python3: $(which python3)"
echo "🔍 Python version: $(python3 --version)"

# Check for PortAudio dependency (required for pyaudio)
echo ""
echo "🔍 Checking system dependencies..."

if command -v brew &> /dev/null; then
    echo "✅ Homebrew found"
    if ! brew list portaudio &> /dev/null; then
        echo "⚠️  PortAudio not found. Installing PortAudio (required for pyaudio)..."
        echo "📦 Running: brew install portaudio"
        brew install portaudio
        echo "✅ PortAudio installed"
    else
        echo "✅ PortAudio already installed"
    fi
else
    echo "❌ Homebrew not found. Please install PortAudio manually:"
    echo "   1. Install Homebrew: https://brew.sh/"
    echo "   2. Run: brew install portaudio"
    echo "   3. Then re-run this script"
    exit 1
fi

echo ""
echo "📦 Installing required Python packages..."

# Install packages from requirements.txt
echo "📋 Installing Python packages..."
echo "   Note: pyaudio may take a while to compile..."

if [ -f "requirements.txt" ]; then
    echo "📋 Installing from requirements.txt..."
    python3 -m pip install -r requirements.txt
else
    echo "📋 Installing packages individually..."
    # Install numpy first (helps with dependencies)
    python3 -m pip install numpy
    
    # Try to install pyaudio with error handling
    if ! python3 -m pip install pyaudio; then
        echo ""
        echo "❌ pyaudio installation failed!"
        echo "🔧 Troubleshooting options:"
        echo "   1. Make sure Xcode command line tools are installed:"
        echo "      xcode-select --install"
        echo "   2. Try installing with conda instead:"
        echo "      conda install pyaudio"
        echo "   3. Or use a pre-built wheel:"
        echo "      python3 -m pip install --only-binary=all pyaudio"
        echo ""
        echo "⚠️  Continuing with other packages..."
    fi
    
    # Install openwakeword
    python3 -m pip install openwakeword
fi

echo ""
echo "🎯 Testing Python setup..."

# Test if packages can be imported
python3 -c "
import sys
print('🔍 Testing package imports...')

try:
    import pyaudio
    print('✅ pyaudio imported successfully')
except ImportError as e:
    print(f'❌ pyaudio import failed: {e}')

try:
    import numpy
    print('✅ numpy imported successfully')
except ImportError as e:
    print(f'❌ numpy import failed: {e}')

try:
    import openwakeword
    print('✅ openwakeword imported successfully')
except ImportError as e:
    print(f'❌ openwakeword import failed: {e}')
"

echo ""
echo "🧪 Testing wake word detector script..."
if [ -f "wakeword_detector.py" ]; then
    echo "📝 Running quick test of wakeword_detector.py..."
    timeout 3 python3 wakeword_detector.py 2>&1 | head -5 || echo "✅ Script runs (stopped after 3 seconds)"
else
    echo "⚠️ wakeword_detector.py not found"
fi

echo ""
echo "✅ Python setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Make sure you have your API keys set in a .env file:"
echo "      - DEEPGRAM_API_KEY=your_deepgram_key"
echo "      - OPENAI_API_KEY=your_openai_key"
echo "   2. Run the app: npm run dev"
echo ""
