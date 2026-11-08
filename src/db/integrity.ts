/**
 * Automated Quran Text & Corpus Integrity Verification Suite
 * 
 * Asserts 100% checksum parity against Tanzil / King Fahd Medina Mushaf,
 * verifying all 6,236 ayahs, 114 surahs, 604 pages, and 30 juz.
 */

import { QuranCognitiveDB, QuranAyah } from './schema';
import checksumManifest from '../data/quran-checksums.json';

export interface IntegrityCheckResult {
  valid: boolean;
  totalAyahsChecked: number;
  totalSurahsChecked: number;
  totalPagesChecked: number;
  totalJuzChecked: number;
  mismatchedChecksums: Array<{
    verse_key: string;
    expected: string;
    actual: string;
  }>;
  missingAyahs: string[];
  phonemeCoverageCount: number;
  pageBoundaryTransitionCount: number;
  errors: string[];
}

/**
 * Native Web Crypto / Node crypto SHA-256 implementation
 */
export async function calculateSha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for Node test environment if crypto.subtle is unavailable
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(text, 'utf8').digest('hex');
  }
}

/**
 * Validates the Dexie database against the canonical checksum manifest
 */
export async function verifyQuranIntegrity(db: QuranCognitiveDB): Promise<IntegrityCheckResult> {
  const ayahs = await db.quran_ayahs.toArray();
  const manifest = checksumManifest as {
    ayah_checksums: Record<string, { sha256: string; char_count: number }>;
  };

  const errors: string[] = [];
  const mismatchedChecksums: IntegrityCheckResult['mismatchedChecksums'] = [];
  const missingAyahs: string[] = [];

  const surahsSet = new Set<number>();
  const pagesSet = new Set<number>();
  const juzSet = new Set<number>();
  let phonemeCoverageCount = 0;

  const ayahMap = new Map<string, QuranAyah>();
  for (const a of ayahs) {
    ayahMap.set(a.verse_key, a);
    surahsSet.add(a.surah);
    pagesSet.add(a.page);
    juzSet.add(a.juz);

    if (a.phoneme_sequence && a.phoneme_sequence.trim().length > 0) {
      phonemeCoverageCount++;
    }
  }

  // Verify against every entry in the manifest
  for (const [verseKey, expected] of Object.entries(manifest.ayah_checksums)) {
    const ayah = ayahMap.get(verseKey);
    if (!ayah) {
      missingAyahs.push(verseKey);
      continue;
    }

    const calculatedHash = await calculateSha256(ayah.text_uthmani);
    if (calculatedHash !== expected.sha256) {
      mismatchedChecksums.push({
        verse_key: verseKey,
        expected: expected.sha256,
        actual: calculatedHash,
      });
    }
  }

  if (ayahs.length !== 6236) {
    errors.push(`Total ayah count mismatch: expected 6,236, found ${ayahs.length}`);
  }
  if (surahsSet.size !== 114) {
    errors.push(`Total surahs mismatch: expected 114, found ${surahsSet.size}`);
  }
  if (pagesSet.size !== 604) {
    errors.push(`Total pages mismatch: expected 604, found ${pagesSet.size}`);
  }
  if (juzSet.size !== 30) {
    errors.push(`Total juz mismatch: expected 30, found ${juzSet.size}`);
  }
  if (mismatchedChecksums.length > 0) {
    errors.push(`Detected ${mismatchedChecksums.length} text checksum mismatches!`);
  }
  if (missingAyahs.length > 0) {
    errors.push(`Missing ${missingAyahs.length} required ayahs!`);
  }
  if (phonemeCoverageCount !== 6236) {
    errors.push(`Phoneme sequence missing on ${6236 - phonemeCoverageCount} ayahs!`);
  }

  // Count page boundary transitions
  const pageBoundaryCount = await db.transition_edges.filter(e => Boolean(e.is_page_boundary)).count();

  return {
    valid: errors.length === 0,
    totalAyahsChecked: ayahs.length,
    totalSurahsChecked: surahsSet.size,
    totalPagesChecked: pagesSet.size,
    totalJuzChecked: juzSet.size,
    mismatchedChecksums,
    missingAyahs,
    phonemeCoverageCount,
    pageBoundaryTransitionCount: pageBoundaryCount,
    errors,
  };
}
