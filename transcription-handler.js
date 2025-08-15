const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

class TranscriptionHandler {
    constructor() {
        this.deepgramClient = null;
        this.deepgramConnection = null;
        this.keepAliveInterval = null;
        this.isConnected = false;
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
    }

    initialize(apiKey) {
        if (!apiKey) {
            console.error('❌ Deepgram API key is required');
            return false;
        }

        try {
            this.deepgramClient = createClient(apiKey);
            console.log('✅ Deepgram client initialized');
            return true;
        } catch (error) {
            console.error('❌ Error initializing Deepgram client:', error);
            return false;
        }
    }

    startTranscription(onTranscript, onError) {
        if (!this.deepgramClient) {
            console.error('❌ Deepgram client not initialized');
            return false;
        }

        if (this.isConnected) {
            console.log('⚠️ Transcription already active');
            return true;
        }

        this.onTranscriptCallback = onTranscript;
        this.onErrorCallback = onError;

        try {
            console.log('🎤 Starting Deepgram transcription...');
            
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

            console.log('🔗 Creating Deepgram connection with options:', connectionOptions);
            this.deepgramConnection = this.deepgramClient.listen.live(connectionOptions);

            // Setup keep-alive
            this.keepAliveInterval = setInterval(() => {
                if (this.deepgramConnection && this.deepgramConnection.getReadyState() === 1) {
                    this.deepgramConnection.keepAlive();
                }
            }, 10000);

            // Setup event listeners
            this.deepgramConnection.addListener(LiveTranscriptionEvents.Open, () => {
                console.log('✅ Deepgram connection opened');
                this.isConnected = true;
            });

            this.deepgramConnection.addListener(LiveTranscriptionEvents.Transcript, (data) => {
                console.log('📝 Deepgram transcript event received:', JSON.stringify(data));
                
                if (data && data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
                    const transcript = data.channel.alternatives[0].transcript;
                    if (transcript && transcript.trim() !== "") {
                        const isFinal = data.is_final;
                        console.log(`📝 [${isFinal ? 'FINAL' : 'INTERIM'}]: ${transcript}`);
                        
                        if (this.onTranscriptCallback) {
                            this.onTranscriptCallback({
                                transcript: transcript.trim(),
                                isFinal: isFinal,
                                confidence: data.channel.alternatives[0].confidence
                            });
                        }
                    }
                }
            });

            this.deepgramConnection.addListener(LiveTranscriptionEvents.Close, (event) => {
                console.log('🔒 Deepgram connection closed:', event.code, event.reason);
                this.isConnected = false;
                this.cleanup();
            });

            this.deepgramConnection.addListener(LiveTranscriptionEvents.Error, (error) => {
                console.error('❌ Deepgram error:', error);
                if (this.onErrorCallback) {
                    this.onErrorCallback(error);
                }
            });

            this.deepgramConnection.addListener(LiveTranscriptionEvents.Message, (message) => {
                console.log('📨 Deepgram message received:', message);
            });

            console.log('✅ Deepgram transcription started');
            return true;

        } catch (error) {
            console.error('❌ Error starting Deepgram transcription:', error);
            return false;
        }
    }

    sendAudio(audioBuffer) {
        if (!this.isConnected || !this.deepgramConnection) {
            console.log('⚠️ Deepgram not connected, cannot send audio');
            return false;
        }

        try {
            console.log('📤 Sending audio buffer to Deepgram, size:', audioBuffer.byteLength);
            this.deepgramConnection.send(audioBuffer);
            return true;
        } catch (error) {
            console.error('❌ Error sending audio to Deepgram:', error);
            return false;
        }
    }

    stopTranscription() {
        console.log('🛑 Stopping Deepgram transcription...');
        this.isConnected = false;
        this.cleanup();
    }

    cleanup() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }

        if (this.deepgramConnection) {
            if (this.deepgramConnection.getReadyState() === 1 || this.deepgramConnection.getReadyState() === 0) {
                this.deepgramConnection.finish();
            }
            this.deepgramConnection = null;
        }
    }

    isTranscriptionActive() {
        return this.isConnected;
    }
}

module.exports = TranscriptionHandler; 