const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

class TranscriptionHandler {
    constructor() {
        this.deepgramClient = null;
        this.deepgramConnection = null;
        this.keepAliveInterval = null;
        this.isConnected = false;
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
        
        // Speech completion delay settings
        this.speechCompletionDelay = 3000; // 3 second delay before considering speech complete
        this.speechCompletionTimer = null;
        this.lastFinalTranscript = null;
        this.accumulatedTranscript = '';
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

    startTranscription(onTranscript, onError, onDelayUpdate = null) {
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
        this.onDelayUpdateCallback = onDelayUpdate;

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
                            if (isFinal) {
                                // Handle final transcript with delay
                                this.handleFinalTranscript({
                                    transcript: transcript.trim(),
                                    confidence: data.channel.alternatives[0].confidence
                                });
                            } else {
                                // Send interim results immediately
                                this.onTranscriptCallback({
                                    transcript: transcript.trim(),
                                    isFinal: false,
                                    confidence: data.channel.alternatives[0].confidence
                                });
                            }
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
        
        // If there's a pending final transcript, trigger it immediately when stopping
        if (this.speechCompletionTimer && this.lastFinalTranscript && this.onTranscriptCallback) {
            console.log('🏃‍♂️ Triggering pending final transcript before stopping');
            clearTimeout(this.speechCompletionTimer);
            this.onTranscriptCallback({
                transcript: this.accumulatedTranscript,
                isFinal: true,
                confidence: this.lastFinalTranscript.confidence
            });
        }
        
        this.cleanup();
    }

    handleFinalTranscript(transcriptData) {
        console.log('⏰ Handling final transcript with delay:', transcriptData.transcript);
        
        // Check if this is a continuation of speech (timer was already running)
        const isContinuation = this.speechCompletionTimer !== null;
        
        // Clear any existing timer
        if (this.speechCompletionTimer) {
            clearTimeout(this.speechCompletionTimer);
        }
        
        // Update accumulated transcript
        if (transcriptData.transcript.trim() !== '') {
            this.accumulatedTranscript = transcriptData.transcript;
            this.lastFinalTranscript = transcriptData;
        }
        
        // Send appropriate event to main process for UI updates
        if (isContinuation && this.onDelayUpdateCallback) {
            this.onDelayUpdateCallback('continue', { transcript: this.accumulatedTranscript });
        } else if (this.onDelayUpdateCallback) {
            this.onDelayUpdateCallback('start', { transcript: this.accumulatedTranscript });
        }
        
        // Set a timer to wait for more speech
        this.speechCompletionTimer = setTimeout(() => {
            console.log('✅ Speech completion delay expired, triggering final transcript');
            
            if (this.lastFinalTranscript && this.onTranscriptCallback) {
                // Send the accumulated final transcript
                this.onTranscriptCallback({
                    transcript: this.accumulatedTranscript,
                    isFinal: true,
                    confidence: this.lastFinalTranscript.confidence
                });
                
                // Reset state
                this.accumulatedTranscript = '';
                this.lastFinalTranscript = null;
            }
            
            this.speechCompletionTimer = null;
        }, this.speechCompletionDelay);
        
        console.log(`⏱️ Started ${this.speechCompletionDelay}ms delay timer for speech completion`);
    }

    cleanup() {
        // Clear speech completion timer
        if (this.speechCompletionTimer) {
            clearTimeout(this.speechCompletionTimer);
            this.speechCompletionTimer = null;
        }
        
        // Reset transcript state
        this.accumulatedTranscript = '';
        this.lastFinalTranscript = null;
        
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

    setSpeechCompletionDelay(delayMs) {
        if (delayMs > 0) {
            this.speechCompletionDelay = delayMs;
            console.log(`⚙️ Speech completion delay set to ${delayMs}ms`);
        }
    }

    getSpeechCompletionDelay() {
        return this.speechCompletionDelay;
    }

    isTranscriptionActive() {
        return this.isConnected;
    }
}

module.exports = TranscriptionHandler; 