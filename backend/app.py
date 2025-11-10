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


    def quantize_input(image: np.ndarray, detail: dict):
        q = detail.get('quantization', (0.0, 0))
        scale, zero_point = q if q is not None else (0.0, 0)
        dtype = detail.get('dtype', None)

        if not scale or scale == 0:
            return image.astype(np.float32), {
                'mode': 'float', 'scale': scale, 'zero_point': zero_point, 'dtype': str(dtype)
            }

        qdata = np.round(image / scale) + zero_point
        qstr = str(dtype).lower() if dtype is not None else ''
        if 'uint8' in qstr:
            qdata = np.clip(qdata, 0, 255).astype(np.uint8)
        elif 'int8' in qstr:
            qdata = np.clip(qdata, -128, 127).astype(np.int8)
        else:
            qdata = qdata.astype(np.int32)

        return qdata, {'mode': 'quant', 'scale': float(scale), 'zero_point': int(zero_point), 'dtype': str(dtype)}


    def dequantize_output(out_tensor: np.ndarray, detail: dict):
        q = detail.get('quantization', (0.0, 0))
        scale, zero_point = q if q is not None else (0.0, 0)
        if not scale or scale == 0:
            return out_tensor.astype(np.float32), {'mode': 'float', 'scale': scale, 'zero_point': zero_point}
        return scale * (out_tensor.astype(np.float32) - zero_point), {'mode': 'dequant', 'scale': float(scale), 'zero_point': int(zero_point)}


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

            input_image = audio_to_mel_image(tmp)
            input_q, input_meta = quantize_input(input_image, input_details[0])

            interpreter.set_tensor(input_details[0]['index'], input_q)
            interpreter.invoke()

            raw_out = interpreter.get_tensor(output_details[0]['index'])
            output_float, out_meta = dequantize_output(raw_out, output_details[0])

            # output_float may already be probabilities (model exported with softmax)
            arr = output_float[0]
            # if values in [0,1] and sum approx 1, treat as probs directly
            if np.all(arr >= -1e-6) and np.all(arr <= 1.0 + 1e-6) and abs(np.sum(arr) - 1.0) < 1e-2:
                probs = arr.astype(float)
                probs_list = probs.tolist()
                logits = arr  # keep same shape for downstream
                prob_mode = 'probabilities'
            else:
                logits = arr
                exps = np.exp(logits - np.max(logits))
                probs = (exps / np.sum(exps)).astype(float)
                probs_list = probs.tolist()
                prob_mode = 'logits+softmax'

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


    @app.route("/predict_debug", methods=["POST"])
    def predict_debug():
        if "file" not in request.files:
            return jsonify({"error": "no file provided"}), 400

        f = request.files["file"]
        tmp = None
        try:
            tmpf = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(f.filename)[1] or ".wav")
            tmp = tmpf.name
            tmpf.close()
            f.save(tmp)

            input_image = audio_to_mel_image(tmp)
            stats = {
                'min': float(np.min(input_image)),
                'max': float(np.max(input_image)),
                'mean': float(np.mean(input_image)),
                'std': float(np.std(input_image)),
                'shape': list(input_image.shape)
            }

            input_q, input_meta = quantize_input(input_image, input_details[0])

            interpreter.set_tensor(input_details[0]['index'], input_q)
            interpreter.invoke()

            raw_out = interpreter.get_tensor(output_details[0]['index'])
            output_float, out_meta = dequantize_output(raw_out, output_details[0])

            arr = output_float[0]
            # detect if interpreter output is already a probability vector
            if np.all(arr >= -1e-6) and np.all(arr <= 1.0 + 1e-6) and abs(np.sum(arr) - 1.0) < 1e-2:
                probs = arr.tolist()
                logits = arr.tolist()
                prob_mode = 'probabilities'
            else:
                logits = arr.tolist()
                exps = np.exp(np.array(logits) - np.max(logits))
                probs = (exps / np.sum(exps)).tolist()
                prob_mode = 'logits+softmax'

            return jsonify({
                'input_stats': stats,
                'input_meta': input_meta,
                'output_meta': out_meta,
                'raw_output': raw_out.tolist(),
                'logits': logits,
                'probs': probs,
                'class_names': class_names,
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


    def quantize_input(image: np.ndarray, detail: dict):
        # detail contains 'quantization' and 'dtype'
        q = detail.get('quantization', (0.0, 0))
        scale, zero_point = q if q is not None else (0.0, 0)
        dtype = detail.get('dtype', None)

        if not scale or scale == 0:
            return image.astype(np.float32), {
                'mode': 'float', 'scale': scale, 'zero_point': zero_point, 'dtype': str(dtype)
            }

        # quantize with rounding
        qdata = np.round(image / scale) + zero_point

        # choose clipping range from dtype
        qstr = str(dtype).lower() if dtype is not None else ''
        if 'uint8' in qstr:
            qdata = np.clip(qdata, 0, 255).astype(np.uint8)
        elif 'int8' in qstr:
            qdata = np.clip(qdata, -128, 127).astype(np.int8)
        else:
            # fallback to int32
            qdata = qdata.astype(np.int32)

        return qdata, {'mode': 'quant', 'scale': float(scale), 'zero_point': int(zero_point), 'dtype': str(dtype)}


    def dequantize_output(out_tensor: np.ndarray, detail: dict):
        q = detail.get('quantization', (0.0, 0))
        scale, zero_point = q if q is not None else (0.0, 0)
        if not scale or scale == 0:
            return out_tensor.astype(np.float32), {'mode': 'float', 'scale': scale, 'zero_point': zero_point}
        return scale * (out_tensor.astype(np.float32) - zero_point), {'mode': 'dequant', 'scale': float(scale), 'zero_point': int(zero_point)}


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

            # Quantize input properly
            input_q, input_meta = quantize_input(input_image, input_details[0])

            # Attach tensor and run
            interpreter.set_tensor(input_details[0]['index'], input_q)
            interpreter.invoke()

            raw_out = interpreter.get_tensor(output_details[0]['index'])
            output_float, out_meta = dequantize_output(raw_out, output_details[0])

            arr = output_float[0]
            if np.all(arr >= -1e-6) and np.all(arr <= 1.0 + 1e-6) and abs(np.sum(arr) - 1.0) < 1e-2:
                probs = arr.astype(float)
                probs_list = probs.tolist()
                logits = arr
                prob_mode = 'probabilities'
            else:
                logits = arr
                exps = np.exp(logits - np.max(logits))
                probs = (exps / np.sum(exps)).astype(float)
                probs_list = probs.tolist()
                prob_mode = 'logits+softmax'

            # Build maps and top_k
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


    @app.route("/predict_debug", methods=["POST"])
    def predict_debug():
        """Returns detailed debug info: input stats, quant params, raw output and dequantized logits."""
        if "file" not in request.files:
            return jsonify({"error": "no file provided"}), 400

        f = request.files["file"]
        tmp = None
        try:
            tmpf = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(f.filename)[1] or ".wav")
            tmp = tmpf.name
            tmpf.close()
            f.save(tmp)

            input_image = audio_to_mel_image(tmp)
            stats = {
                'min': float(np.min(input_image)),
                'max': float(np.max(input_image)),
                'mean': float(np.mean(input_image)),
                'std': float(np.std(input_image)),
                'shape': list(input_image.shape)
            }

            input_q, input_meta = quantize_input(input_image, input_details[0])

            interpreter.set_tensor(input_details[0]['index'], input_q)
            interpreter.invoke()

            raw_out = interpreter.get_tensor(output_details[0]['index'])
            output_float, out_meta = dequantize_output(raw_out, output_details[0])

            arr = output_float[0]
            if np.all(arr >= -1e-6) and np.all(arr <= 1.0 + 1e-6) and abs(np.sum(arr) - 1.0) < 1e-2:
                probs = arr.tolist()
                logits = arr.tolist()
                prob_mode = 'probabilities'
            else:
                logits = arr.tolist()
                exps = np.exp(np.array(logits) - np.max(logits))
                probs = (exps / np.sum(exps)).tolist()
                prob_mode = 'logits+softmax'

            return jsonify({
                'input_stats': stats,
                'input_meta': input_meta,
                'output_meta': out_meta,
                'raw_output': raw_out.tolist(),
                'logits': logits,
                'probs': probs,
                'class_names': class_names,
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
