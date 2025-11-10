import os
import tempfile
import traceback
import numpy as np
from flask import Flask, request, jsonify
import importlib.util

from flask_cors import CORS


def load_pred_module(project_root):
    pred_path = os.path.join(project_root, "contexts", "pred_with_audio.py")
    spec = importlib.util.spec_from_file_location("pred_with_audio", pred_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def create_app():
    app = Flask(__name__)
    CORS(app)

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # Load helper module that contains preprocessing and class names
    pred_mod = load_pred_module(project_root)
    audio_to_mel_image = getattr(pred_mod, "audio_to_mel_image")
    class_names = getattr(pred_mod, "class_names")

    # Try to reuse interpreter loaded by pred_with_audio.py if present
    interpreter = getattr(pred_mod, "interpreter", None)
    input_details = getattr(pred_mod, "input_details", None)
    output_details = getattr(pred_mod, "output_details", None)

    if interpreter is None:
        import tensorflow as tf
        model_path = os.path.join(project_root, "contexts", "model_int8.tflite")
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

    # Optional API key enforcement
    API_KEY = os.environ.get("PRED_API_KEY")

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.route("/predict", methods=["POST"])
    def predict():
        if API_KEY:
            key = request.headers.get("x-api-key")
            if key != API_KEY:
                return jsonify({"error": "missing or invalid API key"}), 401

        if "file" not in request.files:
            return jsonify({"error": "no file provided"}), 400

        f = request.files["file"]
        if f.filename == "":
            return jsonify({"error": "empty filename"}), 400

        tmp = None
        try:
            tmpf = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(f.filename)[1] or ".wav")
            tmp = tmpf.name
            tmpf.close()
            f.save(tmp)

            # Preprocess
            input_image = audio_to_mel_image(tmp)  # shape (1, H, W, 1)

            # Quantize input if model requires it
            q = input_details[0].get('quantization', (0.0, 0))
            input_scale, input_zero_point = q if q is not None else (0.0, 0)
            dtype = input_details[0].get('dtype', None)

            if not input_scale or input_scale == 0:
                input_data = input_image.astype(np.float32)
            else:
                input_data = input_image / input_scale + input_zero_point
                # clip according to typical uint8 range
                if dtype is not None and str(dtype).lower().find('uint8') != -1:
                    input_data = np.clip(input_data, 0, 255).astype(np.uint8)
                else:
                    input_data = input_data.astype(np.int8)

            interpreter.set_tensor(input_details[0]['index'], input_data)
            interpreter.invoke()

            output_data = interpreter.get_tensor(output_details[0]['index'])
            out_q = output_details[0].get('quantization', (0.0, 0))
            out_scale, out_zero = out_q if out_q is not None else (0.0, 0)

            if not out_scale or out_scale == 0:
                output_float = output_data.astype(np.float32)
            else:
                output_float = out_scale * (output_data.astype(np.float32) - out_zero)

            logits = output_float[0]

            # Softmax to probabilities (stable)
            try:
                exps = np.exp(logits - np.max(logits))
                probs = (exps / np.sum(exps)).astype(float)
            except Exception:
                # fallback: normalize if possible
                probs = logits.astype(float)
                s = np.sum(probs)
                if s != 0:
                    probs = (probs / s)

            probs_list = probs.tolist()

            # Build scores map and top_k
            scores_map = {class_names[i]: float(probs_list[i]) for i in range(min(len(class_names), len(probs_list)))}
            top_k_idx = np.argsort(probs)[::-1][:3]
            top_k = [{"label": class_names[int(i)], "score": float(probs_list[int(i)])} for i in top_k_idx]

            pred_idx = int(np.argmax(probs))
            pred_label = class_names[pred_idx] if 0 <= pred_idx < len(class_names) else str(pred_idx)

            return jsonify({
                "pred_idx": pred_idx,
                "pred_label": pred_label,
                "scores": probs_list,
                "scores_map": scores_map,
                "top_k": top_k,
            })

        except Exception as e:
            tb = traceback.format_exc()
            return jsonify({"error": str(e), "trace": tb}), 500
        finally:
            if tmp and os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
import os
import tempfile
import traceback
import numpy as np
from flask import Flask, request, jsonify
import importlib.util
import os
from flask_cors import CORS


def load_pred_module(project_root):
    pred_path = os.path.join(project_root, "contexts", "pred_with_audio.py")
    spec = importlib.util.spec_from_file_location("pred_with_audio", pred_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def create_app():
    app = Flask(__name__)
    # Enable CORS for browser-based uploads (allow all origins by default).
    # You can restrict origins by passing resources and origins to CORS().
    CORS(app)

    # compute project root relative to this file
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # load helper module (contains audio_to_mel_image and class_names)
    pred_mod = load_pred_module(project_root)
    audio_to_mel_image = getattr(pred_mod, "audio_to_mel_image")
    class_names = getattr(pred_mod, "class_names")

    # load TFLite interpreter with correct model path
    try:
        import tensorflow as tf
        model_path = os.path.join(project_root, "contexts", "model_int8.tflite")
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
    except Exception:
        # If tensorflow isn't available or model can't be loaded, raise on startup
        raise

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"})

    # Optional API key enforcement: set env var PRED_API_KEY to require
    API_KEY = os.environ.get("PRED_API_KEY")

    @app.route("/predict", methods=["POST"])
    def predict():
        # If API_KEY is set, require header 'x-api-key' to match
        if API_KEY:
            key = request.headers.get("x-api-key")
            if key != API_KEY:
                return jsonify({"error": "missing or invalid API key"}), 401
        if "file" not in request.files:
            return jsonify({"error": "no file provided"}), 400

        f = request.files["file"]
        if f.filename == "":
            return jsonify({"error": "empty filename"}), 400

        tmp = None
        try:
            # save uploaded file to a temporary file
            tmpf = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(f.filename)[1] or ".wav")
            tmp = tmpf.name
            tmpf.close()
            f.save(tmp)

            # Convert to mel-image using the project's helper
            input_image = audio_to_mel_image(tmp)  # shape (1, H, W, 1)

            # Quantize input according to model input details
            input_scale, input_zero_point = input_details[0].get('quantization', (0.0, 0))
            if input_scale == 0 or input_scale is None:
                # avoid division by zero; assume float model
                input_data = input_image.astype(np.float32)
            else:
                input_data = input_image / input_scale + input_zero_point
                input_data = np.clip(input_data, 0, 255).astype(np.uint8)

            # Set tensor and invoke
            interpreter.set_tensor(input_details[0]['index'], input_data)
            interpreter.invoke()

            # Read output and dequantize
            output_data = interpreter.get_tensor(output_details[0]['index'])
            out_scale, out_zero = output_details[0].get('quantization', (0.0, 0))
            if out_scale == 0 or out_scale is None:
                output_float = output_data.astype(np.float32)
            else:
                output_float = out_scale * (output_data.astype(np.float32) - out_zero)

            # If output is a batch, take first
            logits = output_float[0]

            # convert logits to probabilities safely
            try:
                exps = np.exp(logits - np.max(logits))
                probs = (exps / np.sum(exps)).tolist()
            except Exception:
                probs = logits.tolist()

            pred_idx = int(np.argmax(logits))
            pred_label = class_names[pred_idx] if 0 <= pred_idx < len(class_names) else str(pred_idx)

            return jsonify({
                "pred_idx": pred_idx,
                "pred_label": pred_label,
                "scores": probs,
            })

        except Exception as e:
            tb = traceback.format_exc()
            return jsonify({"error": str(e), "trace": tb}), 500
        finally:
            if tmp and os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
