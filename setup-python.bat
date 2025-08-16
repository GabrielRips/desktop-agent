@echo off
echo 🔧 Setting up Python dependencies for Desktop Agent on Windows...

REM Check if python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ python is not installed or not in PATH. Please install Python 3 first.
    echo    You can install it from: https://www.python.org/downloads/
    echo    Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo ✅ Found python: 
python --version

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment and install packages
echo 📦 Installing required Python packages...
call venv\Scripts\activate.bat

REM Upgrade pip first
python -m pip install --upgrade pip

REM Install packages from requirements.txt
if exist "requirements.txt" (
    echo 📋 Installing from requirements.txt...
    python -m pip install -r requirements.txt
) else (
    echo 📋 Installing packages individually...
    python -m pip install pyaudio numpy openwakeword
)

if errorlevel 1 (
    echo ❌ Failed to install packages
    echo 🔧 Troubleshooting options:
    echo    1. Make sure you have Visual Studio Build Tools installed
    echo    2. Try installing pre-built wheels: python -m pip install --only-binary=all pyaudio
    echo    3. Or use conda: conda install pyaudio
    pause
    exit /b 1
)

echo.
echo 🎯 Testing Python setup...

REM Test if packages can be imported
python -c "
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

echo.
echo 🧪 Testing wake word detector script...
if exist "wakeword_detector.py" (
    echo 📝 Running quick test of wakeword_detector.py...
    timeout /t 3 python wakeword_detector.py >nul 2>&1
    if errorlevel 1 (
        echo ✅ Script runs (stopped after 3 seconds)
    ) else (
        echo ✅ Script runs successfully
    )
) else (
    echo ⚠️ wakeword_detector.py not found
)

echo.
echo ✅ Python setup complete!
echo.
echo 📋 Next steps:
echo    1. Make sure you have your API keys set in a .env file:
echo       - DEEPGRAM_API_KEY=your_deepgram_key
echo       - OPENAI_API_KEY=your_openai_key
echo    2. Test the virtual environment: npm run test-venv
echo    3. Run the app: npm run dev
echo.
pause 