#!/usr/bin/env python3
"""Generate word_token_bounds.json — exact word boundaries for every Ayah.

ordered_quran_phonemes.json stores reference phonemes as per-Ayah groups
(aya_phonemes_list). The DB is irregular in both directions:

  * Fusion (common): tajweed idgham/iqlab/ghunnah packs 2-10+ Uthmani words
    into ONE group (4,115 Ayahs have group count != word count).
  * Split (disconnected letters): one word like 'الٓمٓ' spans several groups
    ('ءَلِف', 'لَااااااممممِ...').

So neither side indexes 1:1. For every Ayah we choose a monotone partition
into blocks; each block covers >= 1 word and >= 1 group. Block cost is a
weighted edit distance between the normalized letter streams:

  - missing word letter (swallowed by idgham)      : 1.00
  - extra group letter (madd / shadda expansion)   : 0.25
  - mismatched letter                              : 1.40

A global DP over (group, word) picks the minimum-cost partition.

Normalization for letter comparison:
  - all combining marks (harakat, madd markers, small high signs) dropped
  - alef/hamza variants folded to alef: ٱ ٲ أ إ آ ء -> ا
  - waw/yeh carriers folded: ۥ -> و, ۦ/ى -> ي, ؤ -> و, ئ -> ي, ة -> ه
  - tajweed markers dropped: tatweel ـ, qalqalah dot ڇ
  - ghunnah letters kept as real letters: ں -> ن, ۾ -> م

Outputs (block lists, exclusive ranges):
  models/word_token_bounds.json       {verseKey: [[ws, we, gs, ge], ...]}
  public/models/word_token_bounds.json (copy for browser fetch)

Each block says: words[ws..we) are covered by groups[gs..ge). At runtime the
WordMapper tokenizes each group, and distributes a block's tokens over the
block's words (exact outside fusions, proportional inside a fused block).

Usage:
  python3 scripts/build_word_token_bounds.py
"""

import json
import os
import sys
import unicodedata

STOP_SIGNS = {"ۛ", "ۚ", "ۖ", "ۗ", "ۘ", "ۙ", "ۜ"}

KEEP_MAP = {
    "ۥ": "و",
    "ۦ": "ي",
    "ى": "ي",
    "ٱ": "ا",
    "ٲ": "ا",
    "ٳ": "ا",
    "أ": "ا",
    "إ": "ا",
    "آ": "ا",
    "ء": "ا",
    "ؤ": "و",
    "ئ": "ي",
    "ة": "ه",
    "ں": "ن",
    "۾": "م",
}

DROP_CHARS = {"ـ", "ڇ"}

COST_SUB = 1.40
COST_DEL = 1.00  # word letter not covered by the group (idgham swallow)
COST_INS = 0.25  # extra group letter (madd / shadda expansion)

# Search bounds for one block. Splits need <= ~4 groups for one word
# ('كٓهيعٓصٓ' = 4); fusions reach ~10 words. A partition that would need
# more fails loudly (reported as an error) instead of guessing.
GSPAN_MAX = 6
WSPAN_MAX = 14

ANOMALY_FACTOR = 0.5
ANOMALY_FLOOR = 2.0

INF = float("inf")


def normalize(text: str) -> str:
    out = []
    for ch in text:
        if ch in DROP_CHARS:
            continue
        if ch in KEEP_MAP:
            out.append(KEEP_MAP[ch])
            continue
        if unicodedata.category(ch) in ("Mn", "Mc", "Me"):
            continue
        if ch.isalpha():
            out.append(ch)
    return "".join(out)


def edit_cost(a: str, b: str) -> float:
    """Weighted Levenshtein: transform word letters a into group letters b."""
    n, m = len(a), len(b)
    if n == 0 and m == 0:
        return 0.0
    if n == 0:
        return m * COST_INS
    if m == 0:
        return n * COST_DEL
    prev = [j * COST_INS for j in range(m + 1)]
    for i in range(1, n + 1):
        cur = [i * COST_DEL] + [0.0] * m
        ca = a[i - 1]
        row_min = cur[0]
        for j in range(1, m + 1):
            sub = prev[j - 1] + (0.0 if ca == b[j - 1] else COST_SUB)
            delete = prev[j] + COST_DEL
            insert = cur[j - 1] + COST_INS
            v = sub if sub < delete else delete
            if insert < v:
                v = insert
            cur[j] = v
            if v < row_min:
                row_min = v
        prev = cur
    return prev[m]


def extract_words(aya_text: str) -> list:
    return [w for w in aya_text.split() if w and w not in STOP_SIGNS]


def feasible(rem_g: int, rem_w: int) -> bool:
    """Can the remaining grid be consumed within the span caps?"""
    if rem_g < 0 or rem_w < 0:
        return False
    if rem_g == 0 and rem_w == 0:
        return True
    if rem_g == 0 or rem_w == 0:
        return False
    return rem_g <= GSPAN_MAX * rem_w and rem_w <= WSPAN_MAX * rem_g


def partition(words: list, groups: list):
    """Min-cost monotone partition of words x groups into blocks.

    Returns (blocks, total_cost) where blocks[k] = [ws, we, gs, ge]
    (exclusive ends), or None when no valid partition exists.
    """
    W, G = len(words), len(groups)
    if W == 0 or G == 0:
        return None

    norm_words = [normalize(w) for w in words]
    norm_groups = [normalize(g) for g in groups]

    # Fast path: exact 1:1 letter match is provably optimal (costs >= 0).
    if G == W and all(a == b for a, b in zip(norm_words, norm_groups)):
        return [[i, i + 1, i, i + 1] for i in range(W)], 0.0

    # dp[g][w] = min cost to cover groups[g:] with words[w:]
    dp = [[INF] * (W + 1) for _ in range(G + 1)]
    choice = [[None] * (W + 1) for _ in range(G + 1)]
    dp[G][W] = 0.0

    for g in range(G - 1, -1, -1):
        for w in range(W - 1, -1, -1):
            w2_max = min(W, w + WSPAN_MAX)
            g2_max = min(G, g + GSPAN_MAX)
            # One edit matrix per state; every block cost is a lookup into it.
            a = "".join(norm_words[w:w2_max])
            b = "".join(norm_groups[g:g2_max])
            na, nb = len(a), len(b)
            widx = [0]
            for k in range(w, w2_max):
                widx.append(widx[-1] + len(norm_words[k]))
            gidx = [0]
            for k in range(g, g2_max):
                gidx.append(gidx[-1] + len(norm_groups[k]))
            prev = [j * COST_INS for j in range(nb + 1)]
            matrix = [prev]
            for i in range(1, na + 1):
                cur = [i * COST_DEL] + [0.0] * nb
                ca = a[i - 1]
                for j in range(1, nb + 1):
                    sub = prev[j - 1] + (0.0 if ca == b[j - 1] else COST_SUB)
                    delete = prev[j] + COST_DEL
                    insert = cur[j - 1] + COST_INS
                    v = sub if sub < delete else delete
                    if insert < v:
                        v = insert
                    cur[j] = v
                matrix.append(cur)
                prev = cur
            best = INF
            best_t = None
            for w2 in range(w + 1, w2_max + 1):
                row = matrix[widx[w2 - w]]
                for g2 in range(g + 1, g2_max + 1):
                    if not feasible(G - g2, W - w2):
                        continue
                    nxt = dp[g2][w2]
                    if nxt == INF:
                        continue
                    total = row[gidx[g2 - g]] + nxt
                    if total < best:
                        best = total
                        best_t = (g2, w2)
            dp[g][w] = best
            choice[g][w] = best_t

    if dp[0][0] == INF:
        return None

    blocks = []
    g, w = 0, 0
    while g < G and w < W:
        t = choice[g][w]
        if t is None:
            return None
        g2, w2 = t
        blocks.append([w, w2, g, g2])
        g, w = g2, w2
    if g != G or w != W:
        return None
    return blocks, dp[0][0]


def rule_predicted_merge(prev_word: str, next_word: str) -> bool:
    """Independent tajweed cross-check: would these words fuse?"""
    if not prev_word or not next_word:
        return False
    prev_letters = normalize(prev_word)
    next_letters = normalize(next_word)
    if not prev_letters or not next_letters:
        return False
    first = next_letters[0]
    has_tanween = any(m in prev_word for m in "ًٌٍ")
    ends_noon = prev_word.rstrip().endswith("نْ")
    ends_meem = prev_word.rstrip().endswith("مْ")
    if has_tanween or ends_noon:
        if first in "يرملون":
            return True  # idgham
        if first == "ب":
            return True  # iqlab
        if first in "تثجدذزسشصضطظفقك":
            return True  # ikhfa
        return False
    if ends_meem and first == "ب":
        return True  # idgham of meem
    return False


def main() -> int:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_path = os.path.join(root, "models", "ordered_quran_phonemes.json")
    with open(src_path, encoding="utf-8") as f:
        db = json.load(f)

    bounds = {}
    errors = []
    anomalies = []
    join_mismatch = 0
    fusion_ayahs = 0
    split_ayahs = 0
    fused_words = 0
    block_hist = {}  # words-per-block histogram
    rule_agree = rule_total = 0
    rule_disagreements = []
    max_block_words = 0
    max_block_groups = 0

    keys = sorted(db.keys(), key=lambda k: (int(k.split(":")[0]), int(k.split(":")[1])))
    for idx, key in enumerate(keys):
        entry = db[key]
        words = extract_words(entry.get("aya_text", ""))
        groups = entry.get("aya_phonemes_list") or []
        aya_phoneme = (entry.get("aya_phoneme") or "").strip()
        if " ".join(groups) != aya_phoneme:
            join_mismatch += 1

        if not words or not groups:
            errors.append(f"{key}: empty words={len(words)} groups={len(groups)}")
            continue

        result = partition(words, groups)
        if result is None:
            errors.append(
                f"{key}: partition failed (words={len(words)} groups={len(groups)})"
            )
            continue
        blocks, total_cost = result

        # coverage sanity
        cg, cw = 0, 0
        ok = True
        for ws, we, gs, ge in blocks:
            if ws != cw or gs != cg or we <= ws or ge <= gs:
                ok = False
                break
            cw, cg = we, ge
        if not ok or cw != len(words) or cg != len(groups):
            errors.append(f"{key}: block coverage broken")
            continue

        has_fusion = has_split = False
        for ws, we, gs, ge in blocks:
            bw, bg = we - ws, ge - gs
            block_hist[bw] = block_hist.get(bw, 0) + 1
            max_block_words = max(max_block_words, bw)
            max_block_groups = max(max_block_groups, bg)
            if bw > 1:
                has_fusion = True
                fused_words += bw - 1
            if bg > 1:
                has_split = True
            # anomaly: block letter cost vs size
            letters = "".join(normalize(w) for w in words[ws:we])
            gletters = "".join(normalize(g) for g in groups[gs:ge])
            cost = edit_cost(letters, gletters)
            if cost > ANOMALY_FACTOR * max(len(letters), 1) + ANOMALY_FLOOR:
                anomalies.append(
                    f"{key}: block words[{ws}:{we}]={words[ws:we]} "
                    f"groups[{gs}:{ge}]={groups[gs:ge]} cost={cost:.2f} letters={len(letters)}"
                )

        if has_fusion:
            fusion_ayahs += 1
        if has_split:
            split_ayahs += 1

        # tajweed rule cross-check on word boundaries that are NOT fused
        is_merge_boundary = [False] * (len(words) - 1)
        for ws, we, gs, ge in blocks:
            for k in range(ws, we - 1):
                is_merge_boundary[k] = True
        for b in range(len(words) - 1):
            predicted = rule_predicted_merge(words[b], words[b + 1])
            actual = is_merge_boundary[b]
            if predicted == actual:
                rule_agree += 1
            else:
                if len(rule_disagreements) < 40:
                    rule_disagreements.append(
                        f"{key}: boundary {words[b]!r} | {words[b + 1]!r} "
                        f"rule={predicted} dp={actual}"
                    )
            rule_total += 1

        bounds[key] = blocks

        if (idx + 1) % 1000 == 0:
            print(f"  ... {idx + 1}/{len(keys)} ayahs", flush=True)

    print(f"Ayahs processed: {len(bounds)} / {len(db)}")
    print(f"aya_phoneme != join(groups): {join_mismatch}")
    print(f"Ayahs with fusion blocks: {fusion_ayahs}, split blocks: {split_ayahs}")
    print(f"Fused word count (words beyond first per fusion): {fused_words}")
    print(f"Words-per-block histogram: {dict(sorted(block_hist.items()))}")
    print(f"Max block: {max_block_words} words x {max_block_groups} groups")
    print(
        f"Tajweed rule cross-check agreement: {rule_agree}/{rule_total} "
        f"({100.0 * rule_agree / max(rule_total, 1):.2f}%)"
    )
    print(f"Partition errors: {len(errors)}")
    for e in errors[:30]:
        print("  ERR", e)
    print(f"Anomalous blocks: {len(anomalies)}")
    for a in anomalies[:30]:
        print("  ANOM", a)
    print("Sample rule disagreements:")
    for d in rule_disagreements[:15]:
        print("  DIS", d)

    if errors:
        print("FAILED: partition errors present")
        return 1

    out = json.dumps(bounds, ensure_ascii=False, separators=(",", ":"))
    for rel in (
        os.path.join("models", "word_token_bounds.json"),
        os.path.join("public", "models", "word_token_bounds.json"),
    ):
        path = os.path.join(root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"Wrote {rel} ({len(out)} bytes)")

    # sample dumps for manual review
    for key in ("1:1", "2:1", "2:2", "2:4", "10:1", "19:1", "21:2", "36:58", "2:255"):
        if key not in bounds:
            continue
        entry = db[key]
        words = extract_words(entry["aya_text"])
        print(f"\n{key} ({len(words)} words / {len(entry['aya_phonemes_list'])} groups):")
        for ws, we, gs, ge in bounds[key]:
            wlabel = "|".join(words[ws:we])
            glabel = " + ".join(entry["aya_phonemes_list"][gs:ge])
            print(f"   [{wlabel}]  <-  {glabel}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
