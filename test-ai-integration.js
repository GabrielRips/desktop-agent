const dotenv = require('dotenv');
const ChatGPTHandler = require('./chatgpt-handler');
const ScreenpipeHandler = require('./screenpipe-handler');

// Load environment variables
dotenv.config();

async function testAIIntegration() {
    console.log('🧪 Testing AI Integration with Screenpipe Context...\n');

    // Initialize handlers
    const screenpipeHandler = new ScreenpipeHandler();
    const chatGPTHandler = new ChatGPTHandler();

    try {
        // Initialize screenpipe
        console.log('1. Initializing screenpipe handler...');
        const screenpipeSuccess = await screenpipeHandler.initialize(process.env.OPENAI_API_KEY);
        if (!screenpipeSuccess) {
            console.error('❌ Failed to initialize screenpipe');
            return;
        }
        console.log('✅ Screenpipe initialized\n');

        // Initialize ChatGPT
        console.log('2. Initializing ChatGPT handler...');
        const chatgptSuccess = chatGPTHandler.initialize(process.env.OPENAI_API_KEY);
        if (!chatgptSuccess) {
            console.error('❌ Failed to initialize ChatGPT');
            return;
        }
        console.log('✅ ChatGPT initialized\n');

        // Connect screenpipe to ChatGPT
        console.log('3. Connecting screenpipe to ChatGPT...');
        chatGPTHandler.setScreenpipeHandler(screenpipeHandler);
        console.log('✅ Integration complete\n');

        // Capture a screenshot for testing
        console.log('4. Capturing test screenshot...');
        const screenshotResult = await screenpipeHandler.captureAndProcess();
        if (!screenshotResult.success) {
            console.error('❌ Failed to capture screenshot');
            return;
        }
        console.log('✅ Screenshot captured and processed\n');

        // Test AI with context
        console.log('5. Testing AI with screen context...');
        const testQueries = [
            "What's on my screen right now?",
            "Can you see any text in my screenshots?",
            "What was I working on recently?",
            "Tell me about the content in my screenshots"
        ];

        for (const query of testQueries) {
            console.log(`\n🤖 Query: "${query}"`);
            console.log('─'.repeat(50));
            
            await new Promise((resolve) => {
                chatGPTHandler.sendMessage(
                    query,
                    (response) => {
                        console.log(`AI Response: ${response}`);
                        resolve();
                    },
                    (error) => {
                        console.error(`Error: ${error}`);
                        resolve();
                    }
                );
            });
            
            // Wait a bit between queries
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n🎉 AI integration test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 Qdrant is not running. Please start it first:');
            console.log('  Windows: setup-qdrant.bat');
            console.log('  macOS/Linux: ./setup-qdrant.sh');
        }
    }
}

// Check if required environment variables are set
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.error('❌ OPENAI_API_KEY not configured in .env file');
    console.log('Please add your OpenAI API key to the .env file and try again.');
    process.exit(1);
}

// Run the test
testAIIntegration().catch(console.error); 