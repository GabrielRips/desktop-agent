const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testTranscription() {
    console.log('🧪 Testing Deepgram transcription...');
    
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
        console.error('❌ DEEPGRAM_API_KEY not found');
        return;
    }
    
    try {
        const deepgram = createClient(apiKey);
        console.log('✅ Deepgram client created');
        
        const connectionOptions = {
            model: "nova-2",
            language: "en-US",
            smart_format: true,
            punctuate: true,
            interim_results: true,
            encoding: "linear16",
            channels: 1,
            sample_rate: 16000,
            no_delay: true,
            diarize: false
        };
        
        console.log('🔗 Creating connection with options:', connectionOptions);
        const connection = deepgram.listen.live(connectionOptions);
        
        let transcriptReceived = false;
        
        connection.addListener(LiveTranscriptionEvents.Open, () => {
            console.log('✅ Connection opened');
            
            // Send some silence to test the connection
            const silenceBuffer = new Int16Array(1600).buffer; // 100ms of silence at 16kHz
            console.log('📤 Sending test audio buffer...');
            connection.send(silenceBuffer);
            
            // Close after a short delay
            setTimeout(() => {
                console.log('🔒 Closing connection...');
                connection.finish();
            }, 2000);
        });
        
        connection.addListener(LiveTranscriptionEvents.Transcript, (data) => {
            console.log('📝 Transcript received:', JSON.stringify(data));
            transcriptReceived = true;
        });
        
        connection.addListener(LiveTranscriptionEvents.Close, (event) => {
            console.log('🔒 Connection closed:', event.code, event.reason);
            if (transcriptReceived) {
                console.log('✅ Transcription test successful!');
            } else {
                console.log('⚠️ No transcription received, but connection worked');
            }
        });
        
        connection.addListener(LiveTranscriptionEvents.Error, (error) => {
            console.error('❌ Deepgram error:', error);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testTranscription(); 