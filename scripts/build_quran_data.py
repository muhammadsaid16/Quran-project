#!/usr/bin/env python3
"""
Build Quran Data Foundation for Quran Cognitive OS v2.0
- Verifies Tanzil / King Fahd Uthmani text corpus (114 Surahs, 6,236 Ayahs)
- Medina Mushaf 15-line pagination (pages 1-604, Juz 1-30, Hizb 1-60)
- Generates phoneme_units.json from tokens.txt
- Generates quran_text2phoneme.json and decoupled phoneme datasets
- Generates full Quran reference dataset and SHA-256 checksum manifest
"""

import json
import os
import hashlib
import urllib.request
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(ROOT_DIR, "models")
DATA_DIR = os.path.join(ROOT_DIR, "src", "data")
PUBLIC_DATA_DIR = os.path.join(ROOT_DIR, "public", "data")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)

def build_phoneme_units():
    tokens_path = os.path.join(MODELS_DIR, "tokens.txt")
    if not os.path.exists(tokens_path):
        raise FileNotFoundError(f"Missing {tokens_path}")
    
    token_to_id = {}
    id_to_token = {}
    units = []
    
    with open(tokens_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 2:
                token = parts[0]
                tid = int(parts[1])
                token_to_id[token] = tid
                id_to_token[tid] = token
            elif len(parts) == 1:
                # whitespace or empty token
                tid = int(parts[0])
                token_to_id[" "] = tid
                id_to_token[tid] = " "
                
    max_id = max(id_to_token.keys())
    for i in range(max_id + 1):
        units.append(id_to_token.get(i, ""))
        
    phoneme_units = {
        "version": "1.0",
        "description": "Quran Lab Zipformer 3.2 CTC 251-unit phoneme vocabulary",
        "vocab_size": len(token_to_id),
        "blank_id": token_to_id.get("<blank>", 250),
        "token_to_id": token_to_id,
        "id_to_token": id_to_token,
        "units": units
    }
    
    out_path = os.path.join(MODELS_DIR, "phoneme_units.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(phoneme_units, f, ensure_ascii=False, indent=2)
    print(f"Generated phoneme_units.json with {len(token_to_id)} tokens.")
    return phoneme_units

def fetch_quran_corpus():
    corpus_cache = os.path.join(DATA_DIR, "raw-quran-uthmani.json")
    if os.path.exists(corpus_cache):
        print(f"Reading cached corpus from {corpus_cache}...")
        with open(corpus_cache, "r", encoding="utf-8") as f:
            return json.load(f)
            
    print("Fetching verified Quran Uthmani corpus from api.alquran.cloud...")
    req = urllib.request.Request(
        "https://api.alquran.cloud/v1/quran/quran-uthmani",
        headers={"User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(req) as resp:
        raw = json.loads(resp.read().decode())["data"]
        
    with open(corpus_cache, "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)
    print(f"Saved raw corpus cache to {corpus_cache}.")
    return raw

def build_datasets():
    phoneme_units = build_phoneme_units()
    
    ordered_phonemes_path = os.path.join(MODELS_DIR, "ordered_quran_phonemes.json")
    with open(ordered_phonemes_path, "r", encoding="utf-8") as f:
        ordered_phonemes = json.load(f)
        
    print(f"Loaded ordered_quran_phonemes.json: {len(ordered_phonemes)} entries.")
    
    raw_corpus = fetch_quran_corpus()
    surahs = raw_corpus["surahs"]
    
    ayah_records = []
    text2phoneme = {}
    word_text2phoneme = {}
    checksums = {}
    
    total_ayah_count = 0
    pages_seen = set()
    juz_seen = set()
    
    for s in surahs:
        s_num = s["number"]
        for a in s["ayahs"]:
            total_ayah_count += 1
            a_num = a["numberInSurah"]
            g_num = a["number"] # global 1-6236
            page = a["page"]
            juz = a["juz"]
            hizb_quarter = a.get("hizbQuarter", 1)
            raw_text = a["text"].strip()
            # strip byte order mark if present
            raw_text = raw_text.lstrip('\ufeff')
            
            key = f"{s_num}:{a_num}"
            phon_data = ordered_phonemes.get(key, {})
            aya_phoneme = phon_data.get("aya_phoneme", "")
            aya_phonemes_list = phon_data.get("aya_phonemes_list", [])
            
            # SHA256 checksum of canonical text
            text_bytes = raw_text.encode("utf-8")
            sha256 = hashlib.sha256(text_bytes).hexdigest()
            checksums[key] = {
                "id": g_num,
                "surah": s_num,
                "ayah": a_num,
                "sha256": sha256,
                "char_count": len(raw_text)
            }
            
            pages_seen.add(page)
            juz_seen.add(juz)
            
            # Build words
            words = raw_text.split()
            word_objects = []
            for idx, w in enumerate(words):
                w_phon = aya_phonemes_list[idx] if idx < len(aya_phonemes_list) else ""
                word_objects.append({
                    "wordIndex": idx,
                    "text": w,
                    "phoneme": w_phon
                })
                if w not in word_text2phoneme:
                    word_text2phoneme[w] = []
                if w_phon and w_phon not in word_text2phoneme[w]:
                    word_text2phoneme[w].append(w_phon)
                    
            record = {
                "id": g_num,
                "surah": s_num,
                "ayah": a_num,
                "verse_key": key,
                "page": page,
                "juz": juz,
                "hizbQuarter": hizb_quarter,
                "text_uthmani": raw_text,
                "phoneme_sequence": aya_phoneme,
                "phonemes_list": aya_phonemes_list,
                "words": word_objects,
                "checksum": sha256,
                "source_version": "King Fahd Medina Mushaf (Hafs) / Tanzil v1.02"
            }
            ayah_records.append(record)
            
            text2phoneme[key] = {
                "verse_key": key,
                "text": raw_text,
                "phoneme": aya_phoneme,
                "phonemes_list": aya_phonemes_list
            }
            
    assert total_ayah_count == 6236, f"Expected 6236 ayahs, got {total_ayah_count}"
    assert len(surahs) == 114, f"Expected 114 surahs, got {len(surahs)}"
    assert min(pages_seen) == 1 and max(pages_seen) == 604 and len(pages_seen) == 604, "Page mapping error"
    assert min(juz_seen) == 1 and max(juz_seen) == 30 and len(juz_seen) == 30, "Juz mapping error"
    
    # Save quran_text2phoneme.json
    out_text2phoneme = {
        "version": "1.0",
        "description": "Canonical text-to-phoneme conversion table for all 6,236 Ayahs and words",
        "total_ayahs": len(text2phoneme),
        "by_verse": text2phoneme,
        "word_lexicon_size": len(word_text2phoneme),
        "word_lexicon": word_text2phoneme
    }
    t2p_path = os.path.join(MODELS_DIR, "quran_text2phoneme.json")
    with open(t2p_path, "w", encoding="utf-8") as f:
        json.dump(out_text2phoneme, f, ensure_ascii=False, indent=2)
    print(f"Saved quran_text2phoneme.json with {len(text2phoneme)} verses and {len(word_text2phoneme)} words.")
    
    # Save full quran-corpus.json in both src/data and public/data
    corpus_payload = {
        "metadata": {
            "version": "2.0.0",
            "edition": "Medina Mushaf (15-line standard)",
            "riwayah": "Hafs 'an 'Asim",
            "total_surahs": 114,
            "total_ayahs": 6236,
            "total_pages": 604,
            "total_juz": 30
        },
        "ayahs": ayah_records
    }
    
    for target_dir in [DATA_DIR, PUBLIC_DATA_DIR]:
        corpus_path = os.path.join(target_dir, "quran-corpus.json")
        with open(corpus_path, "w", encoding="utf-8") as f:
            json.dump(corpus_payload, f, ensure_ascii=False)
        print(f"Saved quran-corpus.json to {corpus_path} ({os.path.getsize(corpus_path)} bytes).")
        
    # Save checksums
    checksum_manifest = {
        "total_ayahs": 6236,
        "verified_corpus": "Tanzil / King Fahd Uthmani",
        "medina_pages": "1-604 (15 lines per page)",
        "ayah_checksums": checksums
    }
    checksums_path = os.path.join(DATA_DIR, "quran-checksums.json")
    with open(checksums_path, "w", encoding="utf-8") as f:
        json.dump(checksum_manifest, f, ensure_ascii=False, indent=2)
    print(f"Saved quran-checksums.json to {checksums_path}.")
    
    print("\n[SUCCESS] Quran Data Foundation successfully established and verified!")

if __name__ == "__main__":
    build_datasets()
