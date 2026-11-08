# Quran Cognitive OS (Version 2.0)

> **Local-First Quran Memorization & Retention Platform**  
> *Active Recall + Voice-Based Assessment + FSRS Spaced Repetition*

Quran Cognitive OS is a privacy-first, offline-capable platform designed for Quran memorizers. Rather than self-rating or passive reading, it measures active recall using on-device speech recognition (Zipformer Quran 3.2 CTC via WebAssembly) and schedules reviews with the Free Spaced Repetition Scheduler (FSRS).

## Key Documentation
- [Comprehensive Specification & Technical Architecture v2.0](docs/SPEC-v2.md)

## Core Architectural Principles
1. **Zero Text Input During Recitation:** All assessment is voice-driven.
2. **100% Local-First:** Audio never leaves the user's device; inference runs entirely in WebAssembly/ONNX.
3. **Quranic Text Integrity:** Medina Mushaf 15-line layout, Uthmani script, Hafs 'an Asim.
4. **Phoneme Alignment:** Audio CTC token outputs aligned with reference Quranic phonemes (no LM masking errors).
5. **Memory Science:** FSRS scheduling with daily due queues and visual memory heatmaps.
