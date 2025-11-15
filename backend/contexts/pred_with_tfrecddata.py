import tensorflow as tf
import numpy as np

# ✅ Your 24 class names
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

# ✅ TFRecord path
tfrecord_path = "tfrecords/eval.tfrecord"

# Define TFRecord schema
feature_description = {
    "feature": tf.io.FixedLenFeature([], tf.string),
    "shape": tf.io.FixedLenFeature([2], tf.int64),
    "label": tf.io.FixedLenFeature([1], tf.int64)
}

# Parse function
def parse_tfrecord(example_proto):
    example = tf.io.parse_single_example(example_proto, feature_description)
    image = tf.io.decode_raw(example["feature"], tf.float32)
    shape = tf.cast(example["shape"], tf.int32)
    image = tf.reshape(image, [shape[0], shape[1], 1])  # (64, 32, 1)
    label = tf.cast(example["label"][0], tf.int32)
    return image, label

# ✅ Load dataset and pick one random sample
dataset = tf.data.TFRecordDataset(tfrecord_path)
dataset = dataset.map(parse_tfrecord)
sample = next(iter(dataset.shuffle(200).take(1)))

image, label = sample
image = tf.expand_dims(image, axis=0)  # (1, 64, 32, 1)
label_num = int(label.numpy())
print(f"\n🎯 Actual label: {label_num} → {class_names[label_num]}")

# ✅ Load TFLite model
interpreter = tf.lite.Interpreter(model_path="model_int8.tflite")
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Quantize input
input_scale, input_zero_point = input_details[0]['quantization']
input_data = image / input_scale + input_zero_point
input_data = np.clip(input_data, 0, 255).astype(np.uint8)

# ✅ Run inference
interpreter.set_tensor(input_details[0]['index'], input_data)
interpreter.invoke()

# ✅ Dequantize output and get prediction
output_data = interpreter.get_tensor(output_details[0]['index'])
output_scale, output_zero_point = output_details[0]['quantization']
output_float = output_scale * (output_data.astype(np.float32) - output_zero_point)

pred_idx = np.argmax(output_float[0])
print(f"🤖 Predicted label: {pred_idx} → {class_names[pred_idx]}")
