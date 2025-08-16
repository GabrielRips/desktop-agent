import numpy as np
import sys
import json
from openwakeword import Model
import time
import os
import struct

class WakeWordDetector:
    def __init__(self, model_name="co_brain"):
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
                print(f"Custom model loaded successfully with ONNX: {self.model_name}", flush=True)
            except Exception as e:
                print(f"ONNX failed for custom model: {e}", flush=True)
                print("Trying TFLite framework for custom model...", flush=True)
                self.model = Model(wakeword_models=[model_path], inference_framework="tflite")
                self.model_name = model_name
                print(f"Custom model loaded successfully with TFLite: {self.model_name}", flush=True)
        else:
            print(f"Custom model file not found: {model_path}", flush=True)
            print("Falling back to built-in models with TFLite...", flush=True)
            # Use built-in models that might detect "hey" or similar wake words
            self.model = Model(inference_framework="tflite")
            self.model_name = "built-in models"
            print(f"Built-in models loaded successfully with TFLite", flush=True)
        
        # Audio configuration
        self.RATE = 16000       # 16 kHz
        self.CHUNK = 1280       # ~80ms frames
        self.CHANNELS = 1
        
        self.is_listening = False
        print("WakeWordDetector initialization complete", flush=True)
        
    def test_model(self):
        """Test the model with some sample audio to verify it's working"""
        print("Testing model with sample audio...", flush=True)
        try:
            # Create a simple test audio signal (silence)
            test_audio = np.zeros(16000, dtype=np.int16)  # 1 second of silence
            preds = self.model.predict(test_audio)
            print(f"Model test predictions: {preds}", flush=True)
            
            # Test with some random noise
            test_noise = np.random.randint(-1000, 1000, 16000, dtype=np.int16)
            preds_noise = self.model.predict(test_noise)
            print(f"Model test with noise predictions: {preds_noise}", flush=True)
            
            # Show available wake words
            print("Available wake words in model:", flush=True)
            for label in preds.keys():
                print(f"  - {label}", flush=True)
            
            return True
        except Exception as e:
            print(f"Model test failed: {e}", flush=True)
            return False
        
    def process_audio_data(self, audio_data):
        """Process audio data received from frontend"""
        try:
            # Convert audio data to numpy array
            audio_frame = np.frombuffer(audio_data, dtype=np.int16)
            
            # Predict
            preds = self.model.predict(audio_frame)
            
            # Check for detection above 0.5
            for label, score in preds.items():
                if score >= 0.5:
                    # Map common wake word detections to "co_brain"
                    # Built-in models might detect "hey", "hey google", "hey siri", etc.
                    # We'll map these to our desired wake word
                    if any(keyword in label.lower() for keyword in ['hey', 'rhasspy', 'wake', 'co_brain', 'co brain']):
                        detection_msg = {
                            "type": "wake_word_detected",
                            "label": "co_brain",
                            "score": float(score),
                            "timestamp": time.time()
                        }
                        
                        # Print human-readable message for debugging
                        print(f"WAKE WORD DETECTED: co_brain (score: {score:.2f})", flush=True)
                        
                        # Send clean JSON on a separate line for Electron to capture
                        # Use sys.stdout.write to avoid any extra formatting
                        json_str = json.dumps(detection_msg)
                        sys.stdout.write(json_str + '\n')
                        sys.stdout.flush()
                        
                        return True
            
            return False
                    
        except Exception as e:
            print(f"Error processing audio data: {e}", file=sys.stderr, flush=True)
            return False
    
    def start_listening(self):
        """Start listening for audio data from stdin"""
        print("Starting wake word detection (receiving audio from stdin)...", flush=True)
        
        if self.is_listening:
            print("Already listening, skipping...", flush=True)
            return
            
        self.is_listening = True
        print("Wake word detector started and listening for audio data...", flush=True)
        print("Send audio data via stdin to test detection", flush=True)
        
        try:
            frame_count = 0
            while self.is_listening:
                try:
                    # Read audio data from stdin
                    # Expect 4-byte length followed by audio data
                    length_bytes = sys.stdin.buffer.read(4)
                    if not length_bytes:
                        print("No length bytes received, exiting...", flush=True)
                        break
                    
                    length = struct.unpack('<I', length_bytes)[0]
                    audio_data = sys.stdin.buffer.read(length)
                    
                    if not audio_data:
                        print("No audio data received, exiting...", flush=True)
                        break
                    
                    frame_count += 1
                    if frame_count % 100 == 0:  # Log every 100 frames
                        print(f"Processed {frame_count} audio frames...", flush=True)
                    
                    # Process the audio data
                    self.process_audio_data(audio_data)
                                
                except Exception as e:
                    print(f"Error reading audio data: {e}", file=sys.stderr, flush=True)
                    continue
                    
        except Exception as e:
            print(f"Error in audio processing loop: {e}", file=sys.stderr, flush=True)
        finally:
            print("Stopping wake word detection...", flush=True)
            self.stop_listening()
    
    def stop_listening(self):
        """Stop listening for wake word detection"""
        print("Stopping wake word detection...", flush=True)
        self.is_listening = False
        print("Wake word detector stopped.", flush=True)

def main():
    """Main function for standalone testing"""
    print("Starting standalone wake word test...", flush=True)
    detector = WakeWordDetector()
    
    # Test the model first
    if not detector.test_model():
        print("Model test failed, exiting...", flush=True)
        return
    
    try:
        detector.start_listening()
    except KeyboardInterrupt:
        print("Stopping wake word detector (KeyboardInterrupt)...", flush=True)
        detector.stop_listening()

if __name__ == "__main__":
    main() 