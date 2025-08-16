# Desktop Agent

A barebones Electron desktop agent that detects wake words, transcribes speech with Deepgram, and sends transcriptions to ChatGPT for responses.

## Features

- 🎧 **Wake Word Detection**: Uses openwakeword to detect "Alexa" wake word
- 🎤 **Speech Transcription**: Real-time transcription using Deepgram's Nova-3 model
- 🤖 **ChatGPT Integration**: Sends transcriptions to ChatGPT and displays responses
- 🖥️ **Modern UI**: Clean, responsive interface with status indicators
- ⌨️ **Global Shortcuts**: Keyboard shortcuts for quick control

## Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **Microphone access** for wake word detection and transcription

## Quick Setup

### 1. Run Setup Script

```bash
# Navigate to the desktop-agent directory
cd desktop-agent

# Run the automated setup
npm run setup
```

This will:
- Install Node.js dependencies
- Install Python dependencies
- Create a `.env` file from template
- Check for missing API keys

### 2. Configure API Keys

Edit the `.env` file and add your API keys:

```env
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Optional: Customize wake word
WAKE_WORD_MODEL=alexa_v0.1
```

### 3. Get API Keys

- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Deepgram API Key**: Get from [Deepgram Console](https://console.deepgram.com/)

## Manual Setup

If you prefer to set up manually:

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env  # or use your preferred editor
```

### 3. Python Virtual Environment Setup

The app uses a Python virtual environment to manage dependencies. If you're having issues with Python packages not being found:

#### Windows Setup
```cmd
# Run the Windows setup script
setup-python.bat
```

#### macOS/Linux Setup
```bash
# Run the bash setup script
./setup-python.sh
```

#### Manual Virtual Environment Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Test Virtual Environment
```bash
# Test that the virtual environment is working correctly
npm run test-venv
```

This will verify that all required Python packages (pyaudio, numpy, openwakeword) can be imported successfully.

## Usage

### Development Mode

```bash
npm run dev
```

This will start the app with DevTools open for debugging.

### Production Mode

```bash
npm start
```

### Global Shortcuts

- `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (Mac): Toggle agent on/off
- `Ctrl+Shift+L` (Windows/Linux) or `Cmd+Shift+L` (Mac): Toggle listening mode

## How It Works

1. **Wake Word Detection**: The app continuously listens for the "Alexa" wake word using openwakeword
2. **Speech Transcription**: When the wake word is detected, it starts recording and transcribing speech using Deepgram
3. **ChatGPT Processing**: The final transcription is sent to ChatGPT for processing
4. **Response Display**: ChatGPT's response is displayed in the conversation interface

## Workflow

1. Click "Start Agent" or use the global shortcut
2. Say "Alexa" to activate the agent
3. Speak your question or request
4. Wait for ChatGPT's response
5. The conversation history is maintained in the interface

## Troubleshooting

### Python Issues

If you encounter Python-related errors:

1. Ensure Python is installed and accessible from command line
2. Install the required Python packages: `pip install -r requirements.txt`
3. On Windows, you may need to install PyAudio wheel: `pip install pipwin && pipwin install pyaudio`

### Virtual Environment Issues

If the Electron app can't find Python packages or you get import errors:

1. **Test the virtual environment**: Run `npm run test-venv` to verify all packages are accessible
2. **Recreate the virtual environment**: Delete the `venv` folder and run the setup script again
3. **Check Python path**: Ensure the app is using the virtual environment's Python executable
4. **Manual activation**: Try manually activating the virtual environment and running the Python script:
   ```bash
   # Windows
   venv\Scripts\activate
   python wakeword_detector.py
   
   # macOS/Linux
   source venv/bin/activate
   python wakeword_detector.py
   ```
5. **Check console logs**: Look for virtual environment activation messages in the Electron console

### Audio Issues

- Ensure your microphone is working and accessible
- Check that the app has microphone permissions
- Try restarting the app if audio doesn't work initially

### API Key Issues

- Verify your API keys are correct in the `.env` file
- Check that you have sufficient credits/quota for both OpenAI and Deepgram
- Ensure the API keys are not expired

### Wake Word Detection

- The default wake word is "Alexa"
- Speak clearly and at a normal volume
- Reduce background noise for better detection
- The detection threshold is set to 0.5 (50% confidence)

## Customization

### Changing the Wake Word

Edit the `WAKE_WORD_MODEL` in your `.env` file. Available models include:
- `alexa_v0.1`
- `hey_jarvis_v0.1`
- `hey_siri_v0.1`
- `hey_google_v0.1`

### Modifying ChatGPT Behavior

Edit the system prompt in `chatgpt-handler.js`:

```javascript
{
    role: "system",
    content: "You are a helpful AI assistant. Provide concise, helpful responses."
}
```

### Adjusting Transcription Settings

Modify the Deepgram options in `transcription-handler.js`:

```javascript
const connectionOptions = {
    model: "nova-3",
    language: "en-US",
    smart_format: true,
    punctuate: true,
    interim_results: true
};
```

## File Structure

```
desktop-agent/
├── main.js                 # Main Electron process
├── renderer.js             # Renderer process (UI logic)
├── index.html              # Main UI
├── wakeword-handler.js     # Wake word detection wrapper
├── transcription-handler.js # Deepgram transcription handler
├── chatgpt-handler.js      # ChatGPT integration
├── wakeword_detector.py    # Python wake word detector
├── setup.js                # Automated setup script
├── package.json            # Node.js dependencies
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details. 