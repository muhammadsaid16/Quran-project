/**
 * Quran Cognitive OS v2.0 — Database Layer Entry Point
 */

import { QuranCognitiveDB } from './schema';
import { seedQuranDatabase } from './seed';
import { verifyQuranIntegrity } from './integrity';

export * from './schema';
export * from './seed';
export * from './integrity';

// Global singleton instance for client-side execution
let dbInstance: QuranCognitiveDB | null = null;

export function getDatabase(name = 'QuranCognitiveOS'): QuranCognitiveDB {
  if (typeof window === 'undefined') {
    // In SSR or non-browser environments, instantiate on demand
    return new QuranCognitiveDB(name);
  }
  if (!dbInstance) {
    dbInstance = new QuranCognitiveDB(name);
  }
  return dbInstance;
}

export const db = typeof window !== 'undefined' ? getDatabase() : (null as unknown as QuranCognitiveDB);
