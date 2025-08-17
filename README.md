# Desktop Agent

A barebones Electron desktop agent that detects wake words, transcribes speech with Deepgram, sends transcriptions to ChatGPT for responses, and captures and searches screenshots using embeddings.

## Features

- 🎧 **Wake Word Detection**: Uses openwakeword to detect "Co Brain" wake word
- 🎤 **Speech Transcription**: Real-time transcription using Deepgram's Nova-3 model
- 🤖 **ChatGPT Integration**: Sends transcriptions to ChatGPT and displays responses
- 📸 **Screenshot Capture**: Automatic and manual screenshot capture with OCR
- 🔍 **Semantic Search**: Search through screenshots using embeddings and Qdrant vector database
- 🧠 **Embedding Storage**: Stores screenshot text embeddings for semantic similarity search
- 🤖 **AI Context Awareness**: ChatGPT automatically uses relevant screenshot context in responses
- 🖥️ **Modern UI**: Clean, responsive interface with status indicators
- ⌨️ **Global Shortcuts**: Keyboard shortcuts for quick control

## Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **Docker** (for Qdrant vector database)
- **Microphone access** for wake word detection and transcription

## Quick Setup

### 1. Set Up Qdrant Vector Database

The screenpipe functionality requires Qdrant to store screenshot embeddings.

#### Windows
```cmd
# Run the Windows setup script
setup-qdrant.bat
```

#### macOS/Linux
```bash
# Run the bash setup script
chmod +x setup-qdrant.sh
./setup-qdrant.sh
```

#### Manual Docker Setup
```bash
# Start Qdrant container
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

### 2. Run Setup Script

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

### 3. Configure API Keys

Edit the `.env` file and add your API keys:

```env
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Optional: Customize wake word
WAKE_WORD_MODEL=co_brain

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333

# Screenpipe Settings
SCREENSHOT_CAPTURE_INTERVAL=0.17
SCREENSHOT_CAPTURE_ENABLED=true
```

### 4. Get API Keys

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

1. **Wake Word Detection**: The app continuously listens for the "Co Brain" wake word using openwakeword
2. **Speech Transcription**: When the wake word is detected, it starts recording and transcribing speech using Deepgram
3. **ChatGPT Processing**: The final transcription is sent to ChatGPT for processing
4. **Response Display**: ChatGPT's response is displayed in the conversation interface

## Workflow

1. Click "Start Agent" or use the global shortcut
2. Say "Co Brain" to activate the agent
3. Speak your question or request
4. Wait for ChatGPT's response
5. The conversation history is maintained in the interface

## Customization

### Changing the Wake Word

Edit the `WAKE_WORD_MODEL` in your `.env` file. Available models include:
- `co_brain`
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

## Screenpipe Functionality

The desktop agent includes powerful screenshot capture and search capabilities using embeddings and vector similarity search.

### How It Works

1. **Screenshot Capture**: The agent captures screenshots automatically (every 10 seconds by default) or manually
2. **OCR Processing**: Text is extracted from screenshots using Tesseract.js
3. **Embedding Generation**: Text content is converted to embeddings using OpenAI's text-embedding-ada-002 model
4. **Vector Storage**: Embeddings are stored in Qdrant vector database for fast similarity search
5. **Semantic Search**: Search queries are converted to embeddings and matched against stored vectors

### Features

- **Automatic Capture**: Periodic screenshot capture (every 10 seconds by default)
- **Manual Capture**: On-demand screenshot capture via UI button
- **OCR Text Extraction**: Extracts text from screenshots for searchable content
- **Semantic Search**: Find relevant screenshots using natural language queries
- **Vector Similarity**: Uses cosine similarity for accurate semantic matching
- **Statistics**: View total screenshots and disk usage
- **File Management**: Screenshots are stored locally with metadata
- **Automatic Cleanup**: Keeps only the most recent 1000 screenshots to prevent database bloat

### Usage

#### Manual Screenshot Capture
1. Click the 📸 button in the UI
2. The agent will capture the current screen
3. Text will be extracted and stored with embeddings
4. A confirmation message will show the screenshot ID

#### Search Screenshots
1. Click the 🔍 button to open the search modal
2. Enter your search query (e.g., "email from John", "code review", "meeting notes")
3. Press Enter or wait for results
4. View matching screenshots with similarity scores

#### View Statistics
1. Click the 📊 button to see screenpipe statistics
2. View total screenshots stored and disk usage

### Configuration

Edit the screenpipe settings in your `.env` file:

```env
# Screenpipe Settings
SCREENSHOT_CAPTURE_INTERVAL=0.17        # Minutes between automatic captures (0.17 = 10 seconds)
SCREENSHOT_CAPTURE_ENABLED=true      # Enable/disable automatic capture
QDRANT_URL=http://localhost:6333     # Qdrant database URL
```

### Testing Screenpipe

Run the screenpipe test to verify functionality:

```bash
npm run test-screenpipe
```

This will:
- Test screenshot capture and processing
- Verify OCR text extraction
- Test embedding generation and storage
- Validate search functionality
- Check statistics retrieval

### Advanced Features

#### Custom Search Queries
The semantic search supports natural language queries:
- "Show me screenshots with code"
- "Find emails from yesterday"
- "Screenshots with meeting notes"
- "Documents I was working on"

#### Embedding Model
The system uses OpenAI's `text-embedding-ada-002` model which:
- Generates 1536-dimensional embeddings
- Provides excellent semantic understanding
- Supports multiple languages
- Optimized for text similarity tasks

#### Storage Optimization
- Screenshots are compressed and optimized before OCR
- Text is truncated for embedding generation (maintains semantic meaning)
- Qdrant uses efficient vector indexing for fast searches
- Automatic cleanup keeps only the most recent 1000 screenshots
- Prevents database bloat with frequent 10-second captures

## AI Integration with Screen Context

The desktop agent now features intelligent AI integration that automatically uses relevant screenshot context to provide more helpful and contextual responses.

### How It Works

1. **Automatic Context Search**: When you ask the AI a question, it automatically searches your screenshot database for relevant content
2. **Smart Context Injection**: Relevant screenshots are included in the AI's context, allowing it to "see" what's on your screen
3. **Contextual Responses**: The AI can reference and discuss content from your screenshots in its responses

### Example Interactions

**User**: "What was I working on recently?"
**AI**: "Based on your recent screenshots, you've been working on a JavaScript project. I can see code files open with functions related to screen capture and OCR processing. You also have a README file visible that describes a desktop agent application."

**User**: "Can you help me with this email?"
**AI**: "I can see you have an email open about project deadlines. The email mentions a meeting scheduled for Friday at 2 PM. Would you like me to help you draft a response or set a reminder for that meeting?"

**User**: "What's on my screen right now?"
**AI**: "I can see you have a code editor open with what appears to be a Node.js application. There's a function called `captureScreenshot()` and some error handling code. You also have a terminal window visible showing npm install commands."

### Testing AI Integration

Test the AI integration with screen context:

```bash
npm run test-ai-integration
```

This will:
- Initialize both screenpipe and ChatGPT handlers
- Capture a test screenshot
- Run several test queries to demonstrate context awareness
- Show how the AI references screenshot content

### Configuration

The AI integration is automatically enabled when both screenpipe and ChatGPT are properly initialized. No additional configuration is required.

### Benefits

- **Contextual Awareness**: AI understands what you're working on
- **Memory**: AI can reference past work and screenshots
- **Productivity**: More relevant and helpful responses
- **Seamless Integration**: Works automatically without manual intervention

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

- The default wake word is "Co Brain"
- Speak clearly and at a normal volume
- Reduce background noise for better detection
- The detection threshold is set to 0.5 (50% confidence)

## Customization

### Changing the Wake Word

Edit the `WAKE_WORD_MODEL` in your `.env` file. Available models include:
- `co_brain`
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
├── screenpipe-handler.js   # Screenshot capture and search handler
├── wakeword_detector.py    # Python wake word detector
├── setup.js                # Automated setup script
├── setup-qdrant.bat        # Windows Qdrant setup script
├── setup-qdrant.sh         # Unix/Linux Qdrant setup script
├── test-screenpipe.js      # Screenpipe functionality test
├── package.json            # Node.js dependencies
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── screenshots/           # Screenshot storage directory (auto-created)
└── README.md              # This file
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details. 