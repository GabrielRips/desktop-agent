# 🧠 CoBrain - Intelligent Desktop Agent

<div align="center">

**An advanced AI-powered desktop assistant that understands voice commands, analyzes your screen, and performs intelligent automation**

[![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

![CoBrain Demo](https://img.shields.io/badge/Status-Active%20Development-brightgreen?style=for-the-badge)

</div>

---

## 🌟 What is CoBrain?

CoBrain is a sophisticated desktop agent that combines **voice recognition**, **computer vision**, and **AI automation** to create an intelligent assistant that truly understands your digital environment. It's like having a personal AI that can see your screen, understand your voice commands, and take actions on your behalf.

### 🎯 Key Capabilities

- 🎤 **Voice-Activated**: Wake word detection with natural speech processing
- 👁️ **Screen Understanding**: AI vision that can analyze what's on your screen
- 🤖 **Smart Automation**: Performs complex macOS automation tasks
- 💬 **Contextual Responses**: Answers questions using both knowledge and screen context
- 🔍 **Visual Search**: Analyzes highlighted text, errors, and screen content
- ⚡ **Intent Detection**: Automatically distinguishes between questions and actions
- 🪟 **Floating UI**: Beautiful, transparent, always-on-top interface

---

## 🚀 Features

### 🎙️ **Advanced Voice Processing**
- **Wake Word Detection**: Just say "CoBrain" to activate
- **Real-time Transcription**: Powered by Deepgram's Nova-3 model
- **Conversational Filtering**: Ignores casual conversations automatically
- **Multi-language Support**: Understands natural speech patterns

### 🖼️ **Intelligent Screen Analysis**
- **Screenshot Analysis**: AI can see and understand your current screen
- **Highlighted Text Recognition**: Explain selected content instantly
- **Error Detection**: Automatically opens relevant help for coding errors
- **Visual Context**: Combines screen content with your questions

### 🔄 **Smart Automation**
- **macOS Integration**: Uses MCP (Model Context Protocol) for system control
- **Application Control**: Open, close, and manage applications
- **File Operations**: Git operations, file management, project navigation
- **Cursor IDE Integration**: Special error handling and AI chat activation

### 🧠 **AI-Powered Intelligence**
- **GPT-4 Vision**: Multi-modal AI that processes text and images
- **Web Search Integration**: Access to real-time information
- **Context Awareness**: Remembers conversation history
- **Intent Classification**: Smart routing between questions and actions

### 🎨 **Modern Interface**
- **Transparent Widget**: Elegant floating interface
- **Status Indicators**: Visual feedback for all operations
- **Dynamic Expansion**: UI adapts based on content
- **Click-through Mode**: Non-intrusive when not in use
- **Drag & Drop**: Repositionable interface

---

## 🛠️ Installation

### Prerequisites

- **Node.js** v16+ 
- **Python** v3.8+
- **macOS** (required for automation features)
- **Docker** (optional, for Qdrant vector search)

### Quick Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd desktop-agent
   npm install
   ```

2. **Setup Python Environment**
   ```bash
   # macOS/Linux
   ./setup-python.sh
   
   # Windows
   setup-python.bat
   ```

3. **Install Additional Dependencies**
   ```bash
   # Install OpenAI Agents framework
   npm install @openai/agents @openai/agents-openai
   
   # Install TypeScript runtime
   npm install --save-dev @types/node tsx
   ```

4. **Configure Environment**
   Create a `.env` file with your API keys:
   ```env
   # Required API Keys
   OPENAI_API_KEY=your_openai_api_key_here
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   
   # Optional Configuration
   WAKE_WORD_MODEL=alexa_v0.1.onnx
   SPEECH_COMPLETION_DELAY=2000
   SCREENSHOT_CAPTURE_ENABLED=true
   QDRANT_URL=http://localhost:6333
   ```

5. **Optional: Setup Qdrant (for browsing history)**
   ```bash
   docker run -d -p 6333:6333 -p 6334:6334 --name qdrant qdrant/qdrant
   ```

### Get API Keys

- **OpenAI API**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Deepgram API**: [console.deepgram.com](https://console.deepgram.com)

---

## 🎮 Usage

### Starting CoBrain

```bash
npm start
```

### Basic Workflow

1. **Activation**: Click "Start" or the app auto-starts
2. **Wake Word**: Say "CoBrain" to activate listening
3. **Command**: Speak your question or action request
4. **Response**: Get intelligent responses or automated actions

### Voice Commands

#### 📖 **Questions** (Displayed in UI)
```
"What is this?" (analyzes current screen)
"Explain this error" (opens Cursor AI if in IDE)
"What's the weather today?"
"Who is the president of America?"
```

#### ⚡ **Actions** (Executes automation)
```
"Open browser"
"Clone this repo" (gets URL from browser)
"Pull latest repo and open it" (compound commands)
"Close this window"
"Take a screenshot"
```

#### 💬 **Conversational** (Ignored automatically)
```
"Tell him I'll reply later"
"Let them know I'm busy"
"I'll talk to you soon"
```

### Advanced Features

#### Screen Analysis
- **Highlight text** on any webpage and ask "What does this mean?"
- **Error debugging**: Ask about errors while in Cursor IDE
- **Visual questions**: "What's on my screen?" "Describe this interface"

#### Automation Shortcuts  
- **"Latest repo"** = `~/Desktop/demo/desktop-agent`
- **"Open it"** = Opens in Cursor IDE
- **Multi-step commands**: Executes each step sequentially

#### UI Controls
- **🖱️ Button**: Toggle click-through mode manually
- **Drag anywhere**: Reposition the floating widget
- **Auto-expansion**: UI grows/shrinks based on content
- **Smart hiding**: Becomes transparent when not needed

---

## 🏗️ Architecture

### Core Components

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   main.js       │  │  chatgpt-       │  │   agent.ts      │
│  (orchestrator) │◄─│  handler.js     │◄─│ (automation)    │
│                 │  │  (AI brain)     │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         ▲                      ▲                      ▲
         │                      │                      │
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ transcription-  │  │  screenpipe-    │  │   wakeword-     │
│ handler.js      │  │  handler.js     │  │   handler.js    │
│ (Deepgram)      │  │ (Qdrant + OCR)  │  │ (OpenWakeWord)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Data Flow

1. **Audio Input** → Wake Word Detection
2. **Activation** → Speech Transcription  
3. **Intent Detection** → Question vs Action routing
4. **Screen Capture** → Visual context analysis
5. **AI Processing** → GPT-4 with vision/tools
6. **Response/Action** → UI display or system automation

### File Structure

```
desktop-agent/
├── 🎛️ Core Engine
│   ├── main.js                 # Main orchestrator
│   ├── renderer.js             # UI controller  
│   └── index.html              # Interface
├── 🤖 AI Components
│   ├── chatgpt-handler.js      # OpenAI integration
│   ├── agent.ts                # Automation agent
│   └── screenpipe-handler.js   # Visual context
├── 🎤 Audio Processing
│   ├── wakeword-handler.js     # Wake word detection
│   ├── transcription-handler.js # Speech-to-text
│   └── wakeword_detector.py    # Python wake word
├── 🔧 Configuration
│   ├── package.json            # Node dependencies
│   ├── requirements.txt        # Python packages
│   └── .env                    # API keys & settings
└── 📁 Data
    ├── screenshots/            # Screen captures
    ├── temp/                   # Temporary files
    └── *.onnx                  # Wake word models
```

---

## ⚙️ Configuration

### Environment Variables

```env
# 🔑 API Keys (Required)
OPENAI_API_KEY=sk-...                    # OpenAI API access
DEEPGRAM_API_KEY=...                     # Speech transcription

# 🎤 Audio Settings
WAKE_WORD_MODEL=alexa_v0.1.onnx         # Wake word model
SPEECH_COMPLETION_DELAY=2000             # Delay before processing (ms)

# 📸 Screenshot Settings  
SCREENSHOT_CAPTURE_ENABLED=true          # Enable screen analysis
SCREENSHOT_CAPTURE_INTERVAL=5            # Periodic capture interval

# 🔍 Search Integration
QDRANT_URL=http://localhost:6333         # Vector database URL

# 🎨 UI Settings
TRANSPARENCY_LEVEL=0.9                   # Window transparency
ALWAYS_ON_TOP=true                       # Keep widget visible
```

### Customization Options

#### Change Wake Word
Replace the `.onnx` file and update `WAKE_WORD_MODEL`:
```bash
# Available models: alexa, hey_jarvis, hey_siri, etc.
WAKE_WORD_MODEL=co_brain.onnx
```

#### Modify AI Behavior
Edit prompts in `chatgpt-handler.js` and `agent.ts`:
```javascript
// Make responses more/less verbose
systemPrompt: "You are a concise AI assistant..."
```

#### UI Theming
Customize CSS in `index.html`:
```css
.widget-container {
    background: rgba(10, 10, 15, 0.95);
    backdrop-filter: blur(10px);
}
```

---

## 🐛 Troubleshooting

### Common Issues

<details>
<summary><strong>🎤 Audio/Microphone Issues</strong></summary>

- **Check permissions**: macOS → System Preferences → Security & Privacy → Microphone
- **Test audio**: `npm run test-audio`
- **Restart audio**: Stop/start the agent
- **Check devices**: Ensure correct microphone is selected

</details>

<details>
<summary><strong>🐍 Python Environment Issues</strong></summary>

```bash
# Test Python setup
npm run test-venv

# Recreate virtual environment  
rm -rf venv
./setup-python.sh

# Manual troubleshooting
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows
python -c "import openwakeword, pyaudio; print('OK')"
```

</details>

<details>
<summary><strong>🔑 API Key Issues</strong></summary>

- **Verify keys**: Check `.env` file format
- **Test connectivity**: App console shows connection status
- **Check quotas**: Ensure sufficient API credits
- **Key format**: OpenAI keys start with `sk-`, Deepgram keys are UUID format

</details>

<details>
<summary><strong>🖼️ Screenshot/Vision Issues</strong></summary>

- **Permissions**: Grant screen recording permissions to Terminal/app
- **Test vision**: Ask "What do you see?" with content visible
- **Debug logs**: Check console for screenshot capture messages
- **Model limits**: Ensure images aren't too large for GPT-4 Vision

</details>

<details>
<summary><strong>🤖 Automation Issues</strong></summary>

```bash
# Test agent framework
npx tsx agent.ts "test command"

# Check MCP server
npm install @steipete/macos-automator-mcp

# Debug automation
# Check console for "AUTOMATION_ACTION:" messages
```

</details>

### Debug Mode

Run with detailed logging:
```bash
DEBUG=* npm start
```

### Performance Tips

- **Reduce screenshot frequency** if system is slow
- **Use smaller wake word models** for faster response
- **Disable Qdrant** if not using browsing history features
- **Adjust `SPEECH_COMPLETION_DELAY`** for your speaking pace

---

## 🚧 Development

### Running Tests

```bash
# Test individual components
npm run test-venv          # Python environment
npm run test-audio         # Audio capture
npm run test-wakeword      # Wake word detection
npm run test-screenpipe    # Visual analysis

# Development mode with DevTools
npm run dev
```

### Adding New Features

1. **Voice Commands**: Add patterns to `detectIntent()` in `main.js`
2. **Automation**: Extend prompts in `agent.ts`  
3. **UI Components**: Modify `renderer.js` and `index.html`
4. **AI Capabilities**: Enhance `chatgpt-handler.js`

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📋 Roadmap

### 🎯 Planned Features

- [ ] **Multi-language support** for wake words and transcription
- [ ] **Custom automation workflows** with visual editor
- [ ] **Plugin system** for third-party integrations
- [ ] **Voice training** for improved wake word accuracy
- [ ] **Batch operations** for complex multi-step tasks
- [ ] **Desktop notification** integration
- [ ] **Cross-platform support** (Windows, Linux)

### 🔄 Recent Updates

- ✅ **Smart conversational filtering** - Ignores casual speech
- ✅ **Enhanced screen analysis** - Better visual understanding  
- ✅ **Improved error handling** - Cursor IDE integration
- ✅ **Click-through interface** - Non-intrusive UI mode
- ✅ **Multi-step automation** - Complex command sequences
- ✅ **Intent classification** - Smart question vs action routing

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** - For GPT-4 and API access
- **Deepgram** - For speech transcription technology  
- **Electron** - For cross-platform desktop framework
- **OpenWakeWord** - For wake word detection
- **Qdrant** - For vector search capabilities

---

<div align="center">

**Built with ❤️ for the future of human-computer interaction**

[Report Bug](../../issues) • [Request Feature](../../issues) • [Documentation](../../wiki)

</div>