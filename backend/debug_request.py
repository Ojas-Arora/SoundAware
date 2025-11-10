import requests
import json
import os


def resolve_audio_path(p):
    p = os.path.normpath(p)
    if os.path.isabs(p) and os.path.exists(p):
        return p
    if os.path.exists(p):
        return p
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    cand = os.path.join(repo_root, p)
    if os.path.exists(cand):
        return cand
    cand2 = os.path.join(repo_root, "contexts", p)
    if os.path.exists(cand2):
        return cand2
    parts = p.split(os.sep)
    if parts[0].lower() == 'audio':
        alt = os.path.join(repo_root, 'contexts', *parts)
        if os.path.exists(alt):
            return alt
    return None


path = "audio/applause_no_speech/25295_1.00s_3_no_speech.wav"
file_path = resolve_audio_path(path)
if not file_path:
    print(f"File not found: {path}")
    raise SystemExit(2)

print("Using file:", file_path)
r = requests.post("http://127.0.0.1:5000/predict_debug",
                  files={"file": open(file_path, "rb")})
print(r.status_code)
print(json.dumps(r.json(), indent=2))