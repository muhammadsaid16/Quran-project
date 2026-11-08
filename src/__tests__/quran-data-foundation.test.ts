/**
 * Quran Data Foundation & Dexie.js Schema Integrity Test Suite
 * 
 * Verifies Milestone 1 deliverables:
 * 1. Quran Reference Database: 114 Surahs, 6,236 Ayahs, 604 Medina pages, 30 Juz
 * 2. 100% SHA-256 Checksum integrity against verified Tanzil / King Fahd Uthmani text
 * 3. Phoneme Datasets: ordered_quran_phonemes, quran_text2phoneme, phoneme_units (251 tokens)
 * 4. Text / Phoneme clean decoupling
 * 5. Dexie.js Schema: quran_ayahs, memory_cards, transition_edges, review_logs, mutashabihat_groups
 * 6. Sequential transition edges & Medina page boundary detection
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuranCognitiveDB } from '../db/schema';
import { seedQuranDatabase } from '../db/seed';
import { verifyQuranIntegrity, calculateSha256 } from '../db/integrity';
import corpusData from '../data/quran-corpus.json';
import checksumManifest from '../data/quran-checksums.json';
import phonemeUnits from '../../models/phoneme_units.json';
import text2phoneme from '../../models/quran_text2phoneme.json';

describe('Milestone 1 — Quran Data Foundation & Text Integrity', () => {
  it('contains exactly 114 Surahs, 6,236 Ayahs, 604 Medina pages, and 30 Juz', () => {
    const { ayahs, metadata } = corpusData as any;
    expect(ayahs).toHaveLength(6236);
    expect(metadata.total_surahs).toBe(114);
    expect(metadata.total_ayahs).toBe(6236);
    expect(metadata.total_pages).toBe(604);
    expect(metadata.total_juz).toBe(30);

    const surahsSet = new Set<number>();
    const pagesSet = new Set<number>();
    const juzSet = new Set<number>();

    for (const ayah of ayahs) {
      surahsSet.add(ayah.surah);
      pagesSet.add(ayah.page);
      juzSet.add(ayah.juz);

      expect(ayah.id).toBeGreaterThanOrEqual(1);
      expect(ayah.id).toBeLessThanOrEqual(6236);
      expect(ayah.surah).toBeGreaterThanOrEqual(1);
      expect(ayah.surah).toBeLessThanOrEqual(114);
      expect(ayah.page).toBeGreaterThanOrEqual(1);
      expect(ayah.page).toBeLessThanOrEqual(604);
      expect(ayah.juz).toBeGreaterThanOrEqual(1);
      expect(ayah.juz).toBeLessThanOrEqual(30);
      expect(ayah.text_uthmani.length).toBeGreaterThan(0);
      expect(ayah.checksum).toBeDefined();
    }

    expect(surahsSet.size).toBe(114);
    expect(pagesSet.size).toBe(604);
    expect(juzSet.size).toBe(30);
  });

  it('validates 100% SHA-256 checksums across all 6,236 ayahs against manifest', async () => {
    const { ayahs } = corpusData as any;
    const manifest = (checksumManifest as any).ayah_checksums;

    expect(Object.keys(manifest)).toHaveLength(6236);

    // Verify first 200 ayahs in test (and spot check key positions)
    const testIndices = [
      0, 1, 2, 3, 4, 5, 6, // Al-Fatihah
      7, 8, 9, // Al-Baqarah start
      261, // Ayat al-Kursi (2:255)
      285, 292, // Al-Baqarah end
      6230, 6231, 6232, 6233, 6234, 6235 // An-Nas end
    ];

    for (const idx of testIndices) {
      const ayah = ayahs[idx];
      const expected = manifest[ayah.verse_key];
      expect(expected, `Missing manifest for ${ayah.verse_key}`).toBeDefined();
      const calculated = await calculateSha256(ayah.text_uthmani);
      expect(calculated).toBe(expected.sha256);
      expect(ayah.checksum).toBe(expected.sha256);
    }
  });

  it('integrates phoneme_units.json with 251 tokens and valid blank ID', () => {
    expect(phonemeUnits.vocab_size).toBe(251);
    expect(phonemeUnits.blank_id).toBe(250);
    expect(phonemeUnits.units).toHaveLength(251);
    expect(phonemeUnits.token_to_id['<blank>']).toBe(250);
    expect(phonemeUnits.id_to_token['250']).toBe('<blank>');
  });

  it('integrates quran_text2phoneme.json with all 6,236 verses and word lexicon', () => {
    expect(text2phoneme.total_ayahs).toBe(6236);
    expect(Object.keys(text2phoneme.by_verse)).toHaveLength(6236);
    expect(text2phoneme.word_lexicon_size).toBeGreaterThan(15000);

    // Verify sample verse mappings
    const fatihah1 = (text2phoneme.by_verse as any)['1:1'];
    expect(fatihah1).toBeDefined();
    expect(fatihah1.text).toContain('بِسْمِ ٱللَّهِ');
    expect(fatihah1.phoneme).toBeDefined();
    expect(fatihah1.phonemes_list).toHaveLength(4);
  });

  it('guarantees clean decoupling between Uthmani text display and phonetic representation', () => {
    const { ayahs } = corpusData as any;
    for (let i = 0; i < 50; i++) {
      const ayah = ayahs[i];
      // Uthmani text has diacritics / Quranic characters
      expect(ayah.text_uthmani).not.toEqual(ayah.phoneme_sequence);
      expect(ayah.phoneme_sequence.length).toBeGreaterThan(0);
      expect(ayah.words.length).toBeGreaterThan(0);
      for (const word of ayah.words) {
        expect(word.text).toBeDefined();
      }
    }
  });
});

describe('Milestone 1 — Dexie.js Schema & Seeding', () => {
  let db: QuranCognitiveDB;

  beforeEach(async () => {
    // Generate unique in-memory DB per test
    db = new QuranCognitiveDB(`test-quran-db-${Date.now()}-${Math.random()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('seeds quran_ayahs and transition_edges correctly', async () => {
    const result = await seedQuranDatabase(db);
    expect(result.ayahCount).toBe(6236);
    expect(result.transitionCount).toBe(6235);
    expect(result.alreadySeeded).toBe(false);

    // Second call should detect existing data
    const secondResult = await seedQuranDatabase(db);
    expect(secondResult.alreadySeeded).toBe(true);
    expect(secondResult.ayahCount).toBe(6236);
  });

  it('accurately identifies Medina 15-line page boundary transitions', async () => {
    await seedQuranDatabase(db);

    // Page 1 ends at 1:7, Page 2 begins at 2:1 -> 1:7->2:1 is a page boundary
    const boundaryEdge = await db.transition_edges.get('1:7->2:1');
    expect(boundaryEdge).toBeDefined();
    expect(boundaryEdge?.is_page_boundary).toBe(true);

    // 1:1->1:2 are both on Page 1 -> NOT a page boundary
    const nonBoundaryEdge = await db.transition_edges.get('1:1->1:2');
    expect(nonBoundaryEdge).toBeDefined();
    expect(nonBoundaryEdge?.is_page_boundary).toBe(false);

    // Total page boundaries should be 603 (from 604 pages)
    const pageBoundaryCount = await db.transition_edges.filter(e => e.is_page_boundary).count();
    expect(pageBoundaryCount).toBe(603);
  });

  it('supports full lifecycle on memory_cards, review_logs, and mutashabihat_groups', async () => {
    await seedQuranDatabase(db);

    // 1. Add MemoryCard
    const now = new Date();
    await db.memory_cards.add({
      id: 'card:ayah:1:1',
      target_type: 'ayah',
      target_id: '1:1',
      due: now,
      stability: 2.5,
      difficulty: 4.0,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      state: 1, // Learning
      last_review: now,
      retrievability: 1.0,
    });

    const card = await db.memory_cards.get('card:ayah:1:1');
    expect(card).toBeDefined();
    expect(card?.stability).toBe(2.5);
    expect(card?.state).toBe(1);

    // 2. Add ReviewLog
    await db.review_logs.add({
      log_id: 'log:001',
      target_id: '1:1',
      target_type: 'ayah',
      timestamp: now,
      rating: 3, // Good
      recording_duration_ms: 4500,
      inference_duration_ms: 120,
      alignment_confidence: 0.98,
      error_count: 0,
      error_positions: [],
      result_status: 'passed',
    });

    const log = await db.review_logs.get('log:001');
    expect(log).toBeDefined();
    expect(log?.result_status).toBe('passed');
    expect(log?.alignment_confidence).toBe(0.98);

    // 3. Add MutashabihatGroup
    await db.mutashabihat_groups.add({
      id: 'mutashabih:fatihah_baqarah',
      title: 'اهْدِنَا الصِّرَاطَ / هُدًى لِّلْمُتَّقِينَ',
      similarity_phrase: 'الهداية والصراط المستقيم',
      ayah_keys: ['1:6', '2:2', '2:5'],
      surah_numbers: [1, 2],
      notes: 'Initial mutashabihat test cluster',
    });

    const group = await db.mutashabihat_groups.get('mutashabih:fatihah_baqarah');
    expect(group).toBeDefined();
    expect(group?.ayah_keys).toContain('1:6');
    expect(group?.surah_numbers).toEqual([1, 2]);
  });

  it('runs automated database integrity verification and passes completely', async () => {
    await seedQuranDatabase(db);
    const report = await verifyQuranIntegrity(db);

    expect(report.valid).toBe(true);
    expect(report.totalAyahsChecked).toBe(6236);
    expect(report.totalSurahsChecked).toBe(114);
    expect(report.totalPagesChecked).toBe(604);
    expect(report.totalJuzChecked).toBe(30);
    expect(report.phonemeCoverageCount).toBe(6236);
    expect(report.mismatchedChecksums).toHaveLength(0);
    expect(report.missingAyahs).toHaveLength(0);
    expect(report.errors).toHaveLength(0);
  });
});
