/**
 * Quran Cognitive OS v2.0 — Dexie.js Schema & Data Models
 * 
 * Local-First IndexedDB Schema for:
 * - quran_ayahs: 6,236 immutable Uthmani ayahs with Medina 15-line pagination & phonemes
 * - memory_cards: FSRS spaced repetition state per ayah and transition
 * - transition_edges: Directed edges connecting sequential ayahs (with page boundary flags)
 * - review_logs: Audit log of audio recitation reviews and alignment metrics
 * - mutashabihat_groups: Similar verse clusters for targeted disambiguation
 */

import Dexie, { Table } from 'dexie';

export interface QuranWord {
  wordIndex: number;
  text: string;
  phoneme?: string;
  waqfMark?: string;
}

export interface QuranAyah {
  id: number; // 1 to 6236 (global index)
  surah: number; // 1 to 114
  ayah: number; // ayah number in surah
  verse_key: string; // e.g. "1:1", "2:255"
  page: number; // 1 to 604 (15-line Medina Mushaf)
  juz: number; // 1 to 30
  hizbQuarter: number; // 1 to 240
  text_uthmani: string; // Medina Uthmani script with full diacritics
  phoneme_sequence: string; // Reference phonetic representation
  phonemes_list: string[]; // Word-by-word phonemic tokens
  words: QuranWord[]; // Word-level metadata
  checksum: string; // SHA-256 of text_uthmani
  source_version: string;
}

export type MemoryTargetType = 'ayah' | 'transition';

export interface MemoryCard {
  id: string; // e.g. "card:ayah:1:1" or "card:transition:1:1->1:2"
  target_type: MemoryTargetType;
  target_id: string; // e.g. "1:1" or "1:1->1:2"
  due: Date | string; // Next scheduled review timestamp
  stability: number; // FSRS S parameter (days)
  difficulty: number; // FSRS D parameter (1-10)
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0: New, 1: Learning, 2: Review, 3: Relearning
  last_review: Date | string | null;
  retrievability?: number; // Estimated retention probability (0.0 - 1.0)
}

export interface TransitionEdge {
  edge_id: string; // e.g. "1:1->1:2"
  from_ayah_id: string; // "1:1"
  to_ayah_id: string; // "1:2"
  from_surah: number;
  from_ayah: number;
  to_surah: number;
  to_ayah: number;
  is_page_boundary: boolean; // True if from_ayah and to_ayah are on different Medina pages
  stability: number;
  difficulty: number;
  due: Date | string | null;
  last_review: Date | string | null;
}

export type ReviewRating = 1 | 2 | 3 | 4; // Again = 1, Hard = 2, Good = 3, Easy = 4
export type ReviewResultStatus = 'passed' | 'failed' | 'needs_review';

export interface ReviewLog {
  log_id: string;
  target_id: string; // verse_key or edge_id
  target_type: MemoryTargetType;
  timestamp: Date | string;
  rating: ReviewRating;
  recording_duration_ms: number;
  inference_duration_ms: number;
  alignment_confidence: number;
  error_count: number;
  error_positions: Array<{
    word_index: number;
    expected: string;
    actual?: string;
    error_type: 'omission' | 'substitution' | 'repetition' | 'sequence_error' | 'uncertain';
  }>;
  result_status: ReviewResultStatus;
}

export interface MutashabihatGroup {
  id: string; // e.g. "mutashabih:001"
  title: string;
  similarity_phrase: string;
  ayah_keys: string[]; // ["2:38", "2:62", ...]
  surah_numbers: number[];
  notes?: string;
}

export class QuranCognitiveDB extends Dexie {
  quran_ayahs!: Table<QuranAyah, number>;
  memory_cards!: Table<MemoryCard, string>;
  transition_edges!: Table<TransitionEdge, string>;
  review_logs!: Table<ReviewLog, string>;
  mutashabihat_groups!: Table<MutashabihatGroup, string>;

  constructor(databaseName = 'QuranCognitiveOS') {
    super(databaseName);

    // Schema versioning
    this.version(1).stores({
      quran_ayahs: 'id, surah, ayah, verse_key, page, juz, hizbQuarter, [surah+ayah]',
      memory_cards: 'id, target_type, target_id, due, state, stability, difficulty, reps, lapses, last_review',
      transition_edges: 'edge_id, from_ayah_id, to_ayah_id, from_surah, to_surah, due, stability',
      review_logs: 'log_id, target_id, target_type, timestamp, rating, result_status',
      mutashabihat_groups: 'id, title, *ayah_keys, *surah_numbers',
    });
  }
}
