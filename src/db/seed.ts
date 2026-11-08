/**
 * Database seeding and migration service for Quran Cognitive OS v2.0
 */

import { QuranCognitiveDB, QuranAyah, TransitionEdge } from './schema';
import corpusData from '../data/quran-corpus.json';

export interface SeedResult {
  alreadySeeded: boolean;
  ayahCount: number;
  transitionCount: number;
  durationMs: number;
}

/**
 * Generates transition edges between consecutive ayahs across the entire Quran
 */
export function generateTransitionEdges(ayahs: QuranAyah[]): TransitionEdge[] {
  const edges: TransitionEdge[] = [];
  const sorted = [...ayahs].sort((a, b) => a.id - b.id);

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const isPageBoundary = from.page !== to.page;

    edges.push({
      edge_id: `${from.verse_key}->${to.verse_key}`,
      from_ayah_id: from.verse_key,
      to_ayah_id: to.verse_key,
      from_surah: from.surah,
      from_ayah: from.ayah,
      to_surah: to.surah,
      to_ayah: to.ayah,
      is_page_boundary: isPageBoundary,
      stability: 0,
      difficulty: 0,
      due: null,
      last_review: null,
    });
  }

  return edges;
}

/**
 * Initializes and seeds the Dexie database with the complete 6,236 Ayah corpus
 * and sequential transition edges.
 */
export async function seedQuranDatabase(
  db: QuranCognitiveDB,
  options: { force?: boolean } = {}
): Promise<SeedResult> {
  const startTime = Date.now();

  const existingAyahCount = await db.quran_ayahs.count();
  if (existingAyahCount === 6236 && !options.force) {
    const transitionCount = await db.transition_edges.count();
    return {
      alreadySeeded: true,
      ayahCount: existingAyahCount,
      transitionCount,
      durationMs: Date.now() - startTime,
    };
  }

  if (options.force) {
    await db.quran_ayahs.clear();
    await db.transition_edges.clear();
  }

  const rawAyahs = (corpusData as { ayahs: QuranAyah[] }).ayahs;
  if (!rawAyahs || rawAyahs.length !== 6236) {
    throw new Error(`Corpus dataset corrupted: expected 6,236 ayahs, got ${rawAyahs?.length}`);
  }

  await db.transaction('rw', [db.quran_ayahs, db.transition_edges], async () => {
    // Bulk insert ayahs
    await db.quran_ayahs.bulkAdd(rawAyahs);

    // Generate and bulk insert transition edges
    const transitions = generateTransitionEdges(rawAyahs);
    await db.transition_edges.bulkAdd(transitions);
  });

  const finalAyahCount = await db.quran_ayahs.count();
  const finalTransitionCount = await db.transition_edges.count();

  return {
    alreadySeeded: false,
    ayahCount: finalAyahCount,
    transitionCount: finalTransitionCount,
    durationMs: Date.now() - startTime,
  };
}
