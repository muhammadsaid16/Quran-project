#!/usr/bin/env python3
"""
Downloads Quran Lab Zipformer 3.2 CTC INT8 ONNX model and tokens.
Verifies SHA-256 integrity upon download.
"""

import os
import sys
import urllib.request
import concurrent.futures
import hashlib

MODEL_URL = "https://huggingface.co/Ahmedhodzic/zipformer_p-arabic-v3-web/resolve/main/zipformer_p_arabic_v3.1.int8.onnx"
TOKENS_URL = "https://huggingface.co/Ahmedhodzic/zipformer_p-arabic-v3-web/raw/main/tokens.txt"
PHONEMES_URL = "https://huggingface.co/Ahmedhodzic/zipformer_p-arabic-v3-web/raw/main/ordered_quran_phonemes.json"

EXPECTED_SHA256 = "31755836528da336a6192121cd7bc82cb41752dddb65566fd000b89c8686da6b"
TOTAL_SIZE = 72705392

def download_file(url, dest):
    print(f"Downloading {os.path.basename(dest)}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp, open(dest, "wb") as f:
        f.write(resp.read())
    print(f"Saved {os.path.basename(dest)} ({os.path.getsize(dest)} bytes)")

def download_model_parallel(dest):
    print(f"Downloading {os.path.basename(dest)} in 16 parallel threads ({TOTAL_SIZE / 1024 / 1024:.2f} MB)...")
    num_chunks = 16
    chunk_size = (TOTAL_SIZE + num_chunks - 1) // num_chunks
    with open(dest, "wb") as f:
        f.truncate(TOTAL_SIZE)

    def download_part(idx):
        start = idx * chunk_size
        end = min(TOTAL_SIZE - 1, (idx + 1) * chunk_size - 1)
        if start > end: return
        req = urllib.request.Request(MODEL_URL, headers={"Range": f"bytes={start}-{end}", "User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        with open(dest, "r+b") as f:
            f.seek(start)
            f.write(data)

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_chunks) as pool:
        list(pool.map(download_part, range(num_chunks)))

    hasher = hashlib.sha256()
    with open(dest, "rb") as f:
        while chunk := f.read(1024 * 1024):
            hasher.update(chunk)
    actual_sha = hasher.hexdigest()
    if actual_sha != EXPECTED_SHA256:
        print(f"ERROR: SHA-256 mismatch! Got {actual_sha}, expected {EXPECTED_SHA256}")
        sys.exit(1)
    print("SHA-256 integrity verified successfully!")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    model_dir = os.path.join(project_root, "models")
    os.makedirs(model_dir, exist_ok=True)

    tokens_path = os.path.join(model_dir, "tokens.txt")
    if not os.path.exists(tokens_path):
        download_file(TOKENS_URL, tokens_path)

    phonemes_path = os.path.join(model_dir, "ordered_quran_phonemes.json")
    if not os.path.exists(phonemes_path):
        download_file(PHONEMES_URL, phonemes_path)

    v31_path = os.path.join(model_dir, "zipformer_p_arabic_v3.1.int8.onnx")
    v32_path = os.path.join(model_dir, "zipformer_p_arabic_v3.2.int8.onnx")

    if not os.path.exists(v31_path) or os.path.getsize(v31_path) != TOTAL_SIZE:
        download_model_parallel(v31_path)

    if not os.path.exists(v32_path):
        try:
            os.symlink("zipformer_p_arabic_v3.1.int8.onnx", v32_path)
        except OSError:
            pass

    print("All models and token assets are ready.")

if __name__ == "__main__":
    main()
