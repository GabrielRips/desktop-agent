const WakeWordHandler = require('./wakeword-handler');

console.log('🧪 Testing WakeWordHandler with Virtual Environment...');

const handler = new WakeWordHandler();

// Test starting detection
console.log('🚀 Starting wake word detection...');
handler.startDetection((detection) => {
    console.log('🎉 WAKE WORD DETECTED CALLBACK TRIGGERED!');
    console.log('📋 Detection data:', detection);
    console.log('📋 Type:', detection.type);
    console.log('📋 Label:', detection.label);
    console.log('📋 Score:', detection.score);
});

// Stop after 15 seconds
setTimeout(() => {
    console.log('🛑 Stopping wake word detection...');
    handler.stopDetection();
    console.log('✅ Test completed');
    process.exit(0);
}, 15000);

// Handle process termination
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, stopping...');
    handler.stopDetection();
    process.exit(0);
}); 