import os
import numpy as np
import tensorflow as tf
import librosa

class_names = [
    "applause_no_speech", "applause_speech",
    "cat_meowing_no_speech", "cat_meowing_speech",
    "cough_no_speech", "cough_speech",
    "crying_no_speech", "crying_speech",
    "dishes_pot_pan_no_speech", "dishes_pot_pan_speech",
    "dog_barking_no_speech", "dog_barking_speech",
    "doorbell_no_speech", "doorbell_speech",
    "drill_no_speech", "drill_speech",
    "glass_breaking_no_speech", "glass_breaking_speech",
    "gun_shot_no_speech", "gun_shot_speech",
    "slam_no_speech", "slam_speech",
    "toilet_flush_no_speech", "toilet_flush_speech"
]

# Audio preprocessing parameters
SR = 16000
N_MELS = 64
N_FFT = 1024
HOP_LENGTH = 512
TIME_FRAMES = 32  # match your training

def audio_to_mel_image(audio_path):
    """Convert a .wav file to a log-Mel spectrogram image."""
    y, sr = librosa.load(audio_path, sr=SR)
    
    # Compute Mel spectrogram
    mel_spec = librosa.feature.melspectrogram(
        y=y, sr=sr, n_fft=N_FFT, hop_length=HOP_LENGTH, n_mels=N_MELS
    )
    
    # Convert to log scale
    log_mel_spec = librosa.power_to_db(mel_spec)
    
    # Resize to match training width (time frames)
    if log_mel_spec.shape[1] != TIME_FRAMES:
        log_mel_spec = librosa.util.fix_length(log_mel_spec, size=TIME_FRAMES, axis=1)
    
    # Add channel dimension
    image = np.expand_dims(log_mel_spec, axis=-1).astype(np.float32)
    
    # Add batch dimension
    image = np.expand_dims(image, axis=0)  # shape (1, 64, 32, 1)
    return image

# Load TFLite quantized model from the file relative to this script
model_file = os.path.join(os.path.dirname(__file__), "model_int8.tflite")
interpreter = tf.lite.Interpreter(model_path=model_file)
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

def predict_audio(audio_path):
    # Preprocess audio
    input_image = audio_to_mel_image(audio_path)
    
    # Quantize input
    input_scale, input_zero_point = input_details[0]['quantization']
    input_data = input_image / input_scale + input_zero_point
    input_data = np.clip(input_data, 0, 255).astype(np.uint8)
    
    # Run inference
    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()
    
    # Dequantize output
    output_data = interpreter.get_tensor(output_details[0]['index'])
    output_scale, output_zero_point = output_details[0]['quantization']
    output_float = output_scale * (output_data.astype(np.float32) - output_zero_point)
    
    # Get predicted class
    pred_idx = np.argmax(output_float[0])
    print(f" Predicted label: {pred_idx} → {class_names[pred_idx]}")
    return pred_idx, class_names[pred_idx]

# Example usage (only run when executed directly)
if __name__ == "__main__":
    import sys
    audio_path = sys.argv[1] if len(sys.argv) > 1 else "audio/applause_no_speech/25295_1.00s_3_no_speech.wav"
    print(predict_audio(audio_path))
