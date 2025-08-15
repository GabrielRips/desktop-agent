class AudioCapture {
    constructor() {
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.audioSource = null;
        this.audioProcessor = null;
        this.isCapturing = false;
        this.onAudioData = null;
    }

    async startCapture(onAudioData) {
        if (this.isCapturing) {
            console.log('⚠️ Audio capture already active');
            return true;
        }

        this.onAudioData = onAudioData;

        try {
            console.log('🎤 Starting audio capture...');
            
            // Get microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            console.log('✅ Microphone access granted');

            // Create audio context for processing
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });

            // Create audio source from microphone
            this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Create audio processor for real-time processing
            this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

            // Handle audio data
            this.audioProcessor.onaudioprocess = (event) => {
                if (this.isCapturing && this.onAudioData) {
                    const inputBuffer = event.inputBuffer;
                    const inputData = inputBuffer.getChannelData(0);
                    
                    // Convert to 16-bit PCM
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                    }
                    
                    // Send audio data to callback
                    console.log('🎵 Audio captured, sending buffer size:', pcmData.buffer.byteLength);
                    this.onAudioData(pcmData.buffer);
                }
            };

            // Connect audio nodes
            this.audioSource.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);

            this.isCapturing = true;
            console.log('✅ Audio capture started');
            return true;

        } catch (error) {
            console.error('❌ Error starting audio capture:', error);
            return false;
        }
    }

    stopCapture() {
        if (!this.isCapturing) {
            return;
        }

        console.log('🛑 Stopping audio capture...');
        this.isCapturing = false;

        // Disconnect audio nodes
        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }

        if (this.audioSource) {
            this.audioSource.disconnect();
            this.audioSource = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        console.log('✅ Audio capture stopped');
    }

    isCapturingAudio() {
        return this.isCapturing;
    }
}

module.exports = AudioCapture; 