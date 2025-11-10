SoundAware backend
===================

This small Flask backend exposes an endpoint to upload an audio file and returns a prediction using the project's TFLite model.

Files added:
- `app.py` - Flask application with `/predict` and `/health`.
- `requirements.txt` - Python dependencies.
- `test_predict.py` - small client to POST an audio file and print the result.

How to run (Windows PowerShell):

1. Create a virtual environment and install dependencies:

   python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt

2. Run the Flask app:

   python app.py

3. In another terminal, test with an example audio file:

   python test_predict.py ..\audio\applause_no_speech\25295_1.00s_3_no_speech.wav

Notes:
- The backend uses `contexts/pred_with_audio.py` for the spectrogram conversion and to read `class_names`.
- The TFLite file is loaded from `contexts/model_int8.tflite` relative to the project root.
- If `tensorflow` is heavy to install, you can use `tflite-runtime` compatible builds instead; that requires code changes to import the interpreter from `tflite_runtime`.

Browser usage & security
------------------------

1) CORS: The server enables CORS so you can call `/predict` from a website using fetch().

2) Optional API key: If you want to restrict access, set an environment variable `PRED_API_KEY` before starting the server. When set, the server will require clients to send `x-api-key` header with that value.

Example (set API key and run on PowerShell):

   $env:PRED_API_KEY = 'your-secret-key'; python app.py

Then clients must include this header in their requests:

   'x-api-key': 'your-secret-key'

