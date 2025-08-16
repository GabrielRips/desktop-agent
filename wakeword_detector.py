import pyaudio
import numpy as np
import sys
import json
from openwakeword import Model
import time
import os

class WakeWordDetector:
    def __init__(self, model_name="alexa_v0.1"):
        print(f"Initializing WakeWordDetector with model: {model_name}", flush=True)
        
        # Get the path to the custom model file  
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, f"{model_name}.onnx")
        
        print(f"Looking for custom model at: {model_path}", flush=True)
        if os.path.exists(model_path):
            print("Loading custom openwakeword model...", flush=True)
            try:
                # Try ONNX first for custom model
                self.model = Model(wakeword_models=[model_path], inference_framework="onnx")
                self.model_name = model_name
                print(f"✅ Custom model loaded successfully with ONNX: {self.model_name}", flush=True)
            except Exception as e:
                print(f"⚠️ ONNX failed for custom model: {e}", flush=True)
                print("🔄 Trying TFLite framework for custom model...", flush=True)
                self.model = Model(wakeword_models=[model_path], inference_framework="tflite")
                self.model_name = model_name
                print(f"✅ Custom model loaded successfully with TFLite: {self.model_name}", flush=True)
        else:
            print(f"❌ Custom model file not found: {model_path}", flush=True)
            print("🔄 Falling back to built-in models with TFLite...", flush=True)
            self.model = Model(inference_framework="tflite")
            self.model_name = "built-in models"
            print(f"✅ Built-in models loaded successfully with TFLite", flush=True)
        
        # PyAudio configuration
        self.RATE = 16000       # 16 kHz
        self.CHUNK = 1280       # ~80ms frames
        self.CHANNELS = 1
        self.FORMAT = pyaudio.paInt16
        
        print("Initializing PyAudio...", flush=True)
        self.p = pyaudio.PyAudio()
        print("PyAudio initialized", flush=True)
        
        self.stream = None
        self.is_listening = False
        print("WakeWordDetector initialization complete", flush=True)
        
    def start_listening(self):
        """Start listening for wake word detection"""
        print("Starting wake word detection...", flush=True)
        
        if self.is_listening:
            print("Already listening, skipping...", flush=True)
            return
            
        self.is_listening = True
        
        try:
            print("Opening audio stream...", flush=True)
            self.stream = self.p.open(
                format=self.FORMAT,
                channels=self.CHANNELS,
                rate=self.RATE,
                input=True,
                frames_per_buffer=self.CHUNK
            )
            print("Audio stream opened successfully", flush=True)
            print("Wake word detector started and listening...", flush=True)
            print("Say 'Alexa' to test detection", flush=True)
            
            frame_count = 0
            while self.is_listening:
                try:
                    frame_count += 1
                    if frame_count % 100 == 0:  # Log every 100 frames (about 8 seconds)
                        print(f"Processed {frame_count} audio frames...", flush=True)
                    
                    # Read a frame
                    data = self.stream.read(self.CHUNK, exception_on_overflow=False)
                    audio_frame = np.frombuffer(data, dtype=np.int16)
                    
                    # Predict
                    preds = self.model.predict(audio_frame)
                    
                    # Log predictions occasionally
                    if frame_count % 200 == 0:  # Log every 200 frames
                        max_score = max(preds.values()) if preds else 0
                        max_label = max(preds, key=preds.get) if preds else "none"
                        print(f"Current max prediction: {max_label} = {max_score:.3f}", flush=True)
                    
                    # Check for detection above 0.5
                    for label, score in preds.items():
                        if score >= 0.5:
                            detection_msg = {
                                "type": "wake_word_detected",
                                "label": label,
                                "score": float(score),
                                "timestamp": time.time()
                            }
                            print(f"WAKE WORD DETECTED: {label} (score: {score:.2f})", flush=True)
                            
                            # Print to stdout for Electron to capture
                            print(json.dumps(detection_msg), flush=True)
                                
                except Exception as e:
                    print(f"Error in audio processing: {e}", file=sys.stderr, flush=True)
                    continue
                    
        except Exception as e:
            print(f"Error starting audio stream: {e}", file=sys.stderr, flush=True)
        finally:
            print("Stopping wake word detection...", flush=True)
            self.stop_listening()
    
    def stop_listening(self):
        """Stop listening for wake word detection"""
        print("Stopping wake word detection...", flush=True)
        self.is_listening = False
        if self.stream:
            print("Closing audio stream...", flush=True)
            self.stream.stop_stream()
            self.stream.close()
        if self.p:
            print("Terminating PyAudio...", flush=True)
            self.p.terminate()
        print("Wake word detector stopped.", flush=True)

def main():
    """Main function for standalone testing"""
    print("Starting standalone wake word test...", flush=True)
    detector = WakeWordDetector()
    
    try:
        detector.start_listening()
    except KeyboardInterrupt:
        print("Stopping wake word detector (KeyboardInterrupt)...", flush=True)
        detector.stop_listening()

if __name__ == "__main__":
    main() 