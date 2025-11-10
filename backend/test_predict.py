import requests
import sys
import os


def resolve_audio_path(provided_path):
    # Normalize first
    p = os.path.normpath(provided_path)
    if os.path.isabs(p) and os.path.exists(p):
        return p

    # Try relative to current working directory
    if os.path.exists(p):
        return p

    # Try relative to repo root (one level up from this script)
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    candidate = os.path.join(repo_root, p)
    if os.path.exists(candidate):
        return candidate

    # Try inside contexts/audio (common location in this repo)
    candidate2 = os.path.join(repo_root, "contexts", p)
    if os.path.exists(candidate2):
        return candidate2

    # If user passed a path like audio/..., try contexts/audio/...
    parts = p.split(os.sep)
    if parts[0].lower() == "audio":
        alt = os.path.join(repo_root, "contexts", *parts)
        if os.path.exists(alt):
            return alt

    # not found
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_predict.py <path-to-audio-file>")
        sys.exit(1)

    raw_path = sys.argv[1]
    file_path = resolve_audio_path(raw_path)
    if not file_path:
        print(f"File not found: {raw_path}\nTried as given, repo-relative and inside contexts/.")
        sys.exit(2)

    url = "http://127.0.0.1:5000/predict"
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f, "audio/wav")}
        r = requests.post(url, files=files)
        try:
            print(r.status_code)
            print(r.json())
        except Exception:
            print(r.text)


if __name__ == "__main__":
    main()
