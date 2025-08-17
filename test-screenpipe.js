const dotenv = require('dotenv');
const ScreenpipeHandler = require('./screenpipe-handler');

// Load environment variables
dotenv.config();

async function testScreenpipe() {
    console.log('🧪 Testing Screenpipe Handler...\n');

    const screenpipeHandler = new ScreenpipeHandler();

    try {
        // Test initialization
        console.log('1. Testing initialization...');
        const initSuccess = await screenpipeHandler.initialize(process.env.OPENAI_API_KEY);
        if (!initSuccess) {
            console.error('❌ Initialization failed');
            console.log('This might be because Qdrant is not running.');
            console.log('Please start Qdrant first:');
            console.log('  Windows: setup-qdrant.bat');
            console.log('  macOS/Linux: ./setup-qdrant.sh');
            console.log('  Manual: docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant');
            return;
        }
        console.log('✅ Initialization successful\n');

        // Test screenshot capture and processing
        console.log('2. Testing screenshot capture and processing...');
        const result = await screenpipeHandler.captureAndProcess();
        if (result.success) {
            console.log('✅ Screenshot captured and processed successfully');
            console.log(`   ID: ${result.id}`);
            console.log(`   File: ${result.filename}`);
            console.log(`   Text length: ${result.text.length} characters`);
            console.log(`   Timestamp: ${result.timestamp}\n`);
        } else {
            console.error('❌ Screenshot capture failed:', result.error);
            return;
        }

        // Test search functionality
        console.log('3. Testing search functionality...');
        const searchResults = await screenpipeHandler.searchScreenshots('test', 3);
        console.log(`✅ Search completed, found ${searchResults.length} results`);
        searchResults.forEach((result, index) => {
            console.log(`   ${index + 1}. Score: ${result.score.toFixed(3)}, ID: ${result.id}`);
        });
        console.log();

        // Test stats
        console.log('4. Testing stats...');
        const stats = await screenpipeHandler.getStats();
        console.log('✅ Stats retrieved:');
        console.log(`   Total screenshots: ${stats.totalScreenshots}`);
        console.log(`   Disk usage: ${stats.diskUsageMB} MB`);
        console.log();

        // Test cleanup
        console.log('5. Testing cleanup...');
        await screenpipeHandler.cleanup();
        console.log('✅ Cleanup completed\n');

        console.log('🎉 All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 Qdrant is not running. Please start it first:');
            console.log('  Windows: setup-qdrant.bat');
            console.log('  macOS/Linux: ./setup-qdrant.sh');
            console.log('  Manual: docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant');
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
testScreenpipe().catch(console.error); 