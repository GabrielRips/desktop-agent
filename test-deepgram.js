const { createClient } = require('@deepgram/sdk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testDeepgram() {
    console.log('🧪 Testing Deepgram API key...');
    
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
        console.error('❌ DEEPGRAM_API_KEY not found in environment');
        return;
    }
    
    console.log('🔑 API Key found (first 10 chars):', apiKey.substring(0, 10) + '...');
    
    try {
        const deepgram = createClient(apiKey);
        console.log('✅ Deepgram client created successfully');
        
        // Test the API key by making a simple request
        const response = await deepgram.manage.getProjects();
        console.log('✅ Deepgram API key is valid!');
        console.log('📊 Projects found:', response.projects?.length || 0);
        
        return true;
    } catch (error) {
        console.error('❌ Deepgram API key test failed:', error.message);
        return false;
    }
}

// Run the test
testDeepgram().then(success => {
    if (success) {
        console.log('🎉 Deepgram API key is working correctly!');
    } else {
        console.log('💥 Deepgram API key has issues. Please check your key.');
    }
    process.exit(success ? 0 : 1);
}); 