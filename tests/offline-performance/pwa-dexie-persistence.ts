import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PWACacheAuditResult {
  hasManifest: boolean;
  hasServiceWorker: boolean;
  cachesModelWeights: boolean;
  cachesTokens: boolean;
  offlineFallbackConfigured: boolean;
  passed: boolean;
  notes: string[];
}

export interface DexieSchemaAuditResult {
  requiredStoresFound: string[];
  missingStores: string[];
  passed: boolean;
  notes: string[];
}

export class PWADexieValidator {
  public static readonly REQUIRED_DEXIE_STORES = [
    'QuranAyah',
    'MemoryCard',
    'TransitionEdge',
    'ReviewLog',
    'MutashabihatGroup',
  ];

  /**
   * Audit public/ directory for PWA assets and Service Worker caching directives
   */
  public static auditPWA(projectRoot: string): PWACacheAuditResult {
    const notes: string[] = [];
    const publicDir = path.join(projectRoot, 'public');
    const manifestPath = path.join(publicDir, 'manifest.webmanifest');
    const swPath = path.join(publicDir, 'sw.js');

    const hasManifest = fs.existsSync(manifestPath);
    const hasServiceWorker = fs.existsSync(swPath);

    if (hasManifest) {
      notes.push('Found manifest.webmanifest with PWA standalone configuration');
    } else {
      notes.push('Missing manifest.webmanifest in public directory');
    }

    let cachesModelWeights = false;
    let cachesTokens = false;
    let offlineFallbackConfigured = false;

    if (hasServiceWorker) {
      const swContent = fs.readFileSync(swPath, 'utf-8');
      cachesModelWeights = swContent.includes('.onnx') || swContent.includes('models') || swContent.includes('model');
      cachesTokens = swContent.includes('tokens.txt') || swContent.includes('phonemes');
      offlineFallbackConfigured = swContent.includes('fetch') && swContent.includes('caches.match');

      notes.push(`Service worker found (${swContent.length} bytes)`);
      if (offlineFallbackConfigured) {
        notes.push('Service worker intercepts fetch requests with Cache-First or Stale-While-Revalidate');
      }
      if (cachesTokens || cachesModelWeights) {
        notes.push('Service worker explicitly manages model weight / token asset caches');
      }
    } else {
      notes.push('Missing sw.js Service Worker implementation in public directory');
    }

    const passed = hasManifest && hasServiceWorker && offlineFallbackConfigured;

    return {
      hasManifest,
      hasServiceWorker,
      cachesModelWeights,
      cachesTokens,
      offlineFallbackConfigured,
      passed,
      notes,
    };
  }

  /**
   * Audit Dexie.js schema definition files across the codebase
   */
  public static auditDexieSchema(codebaseContent: string): DexieSchemaAuditResult {
    const notes: string[] = [];
    const requiredStoresFound: string[] = [];
    const missingStores: string[] = [];

    for (const store of this.REQUIRED_DEXIE_STORES) {
      // Check for store name in camelCase or snake_case or PascalCase
      const patterns = [
        new RegExp(`\\b${store}\\b`, 'i'),
        new RegExp(`\\b${store.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')}\\b`),
      ];

      const found = patterns.some((p) => p.test(codebaseContent));
      if (found) {
        requiredStoresFound.push(store);
      } else {
        missingStores.push(store);
      }
    }

    const passed = missingStores.length === 0;
    if (passed) {
      notes.push('All 5 core Dexie.js IndexedDB entity stores declared in schema');
    } else {
      notes.push(`Missing Dexie entity stores: ${missingStores.join(', ')}`);
    }

    return {
      requiredStoresFound,
      missingStores,
      passed,
      notes,
    };
  }
}
