import * as fs from 'node:fs';
import * as path from 'node:path';
import { QuranIntegrityVerifier } from './integrity-verifier.ts';
import {
  CANONICAL_SURAHS,
  CANONICAL_JUZS,
  SAJDAH_LOCATIONS,
  TOTAL_SURAHS,
  TOTAL_AYAHS,
  TOTAL_PAGES,
  TOTAL_JUZS,
} from './canonical-metadata.ts';

export interface TestReport {
  suiteName: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  findings: string[];
  executionTimeMs: number;
}

export function runQuranIntegrityTests(projectRoot: string): TestReport {
  const startTime = Date.now();
  const findings: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  function assertCheck(name: string, condition: boolean, detail?: string) {
    totalChecks++;
    if (condition) {
      passedChecks++;
    } else {
      failedChecks++;
      findings.push(`[INTEGRITY FAILURE] ${name}: ${detail || 'Assertion failed'}`);
    }
  }

  // 1. Check Canonical Metadata Constants
  assertCheck('Canonical Surah Count is 114', CANONICAL_SURAHS.length === TOTAL_SURAHS, `Found ${CANONICAL_SURAHS.length}`);
  const totalCanonicalAyahs = CANONICAL_SURAHS.reduce((acc, s) => acc + s.ayahCount, 0);
  assertCheck('Canonical Ayah Total is 6,236', totalCanonicalAyahs === TOTAL_AYAHS, `Found ${totalCanonicalAyahs}`);
  assertCheck('Canonical Juz Count is 30', CANONICAL_JUZS.length === TOTAL_JUZS, `Found ${CANONICAL_JUZS.length}`);
  assertCheck('Canonical Page Count is 604', TOTAL_PAGES === 604);
  assertCheck('Standard Sajdah Positions Count is 15', SAJDAH_LOCATIONS.length === 15);

  // 2. Audit Reference Dataset: models/ordered_quran_phonemes.json
  const phonemesPath = path.join(projectRoot, 'models', 'ordered_quran_phonemes.json');
  if (!fs.existsSync(phonemesPath)) {
    assertCheck('models/ordered_quran_phonemes.json file exists', false, 'File not found at ' + phonemesPath);
  } else {
    try {
      const raw = fs.readFileSync(phonemesPath, 'utf-8');
      const data = JSON.parse(raw);
      const verifier = new QuranIntegrityVerifier();
      const result = verifier.verifyAyahDictionary(data);

      assertCheck(
        'ordered_quran_phonemes.json contains exactly 6,236 Ayahs',
        result.totalAyahsChecked === TOTAL_AYAHS,
        `Found ${result.totalAyahsChecked} ayahs`
      );
      assertCheck(
        'Zero missing canonical Ayah keys (1:1 to 114:6)',
        result.missingKeys.length === 0,
        `Missing: ${result.missingKeys.slice(0, 5).join(', ')}... (total: ${result.missingKeys.length})`
      );
      assertCheck(
        'Zero extraneous keys outside canonical Quran',
        result.extraKeys.length === 0,
        `Extra: ${result.extraKeys.slice(0, 5).join(', ')}`
      );
      assertCheck(
        'All 114 Surahs have exact matching Ayah counts',
        result.invalidSurahAyahCounts.length === 0,
        `Mismatches in: ${result.invalidSurahAyahCounts.map(m => `S${m.surah} (got ${m.actual}, expected ${m.expected})`).join(', ')}`
      );
      assertCheck(
        'All 6,236 Ayahs pass Uthmani character & text integrity',
        result.textIntegrityFailures.length === 0,
        `Defects: ${result.textIntegrityFailures.slice(0, 3).map(f => `${f.key}: ${f.reason}`).join('; ')}`
      );
      assertCheck(
        'Bismillah rules strictly verified (1:1, 9:1, 27:30)',
        result.bismillahFailures.length === 0,
        `Violations: ${result.bismillahFailures.join(', ')}`
      );
      assertCheck(
        'All 15 Sajdah verse locations verified in corpus',
        result.sajdahFindings.every(s => s.found),
        `Missing sajdahs: ${result.sajdahFindings.filter(s => !s.found).map(s => `${s.surah}:${s.ayah}`).join(', ')}`
      );
      assertCheck(
        'All 30 Juz boundaries verified in corpus',
        result.juzBoundaryFindings.every(j => j.startFound),
        `Missing Juz starts: ${result.juzBoundaryFindings.filter(j => !j.startFound).map(j => `Juz ${j.juz} (${j.startExpected})`).join(', ')}`
      );

      findings.push(`[SHA-256 CHECKPOINT] Corpus Checksum: ${result.corpusSha256}`);
    } catch (err: unknown) {
      assertCheck('models/ordered_quran_phonemes.json is valid JSON and parseable', false, String(err));
    }
  }

  // 3. Audit Vocabulary: models/tokens.txt
  const tokensPath = path.join(projectRoot, 'models', 'tokens.txt');
  if (fs.existsSync(tokensPath)) {
    const tokensContent = fs.readFileSync(tokensPath, 'utf-8');
    const tokenLines = tokensContent.split('\n').filter(l => l.trim().length > 0);
    assertCheck('tokens.txt contains 251 Quranic phoneme tokens', tokenLines.length === 251, `Found ${tokenLines.length} tokens`);
    assertCheck('tokens.txt contains CTC <blank> token', tokensContent.includes('<blank> 250'));
  } else {
    assertCheck('models/tokens.txt exists', false);
  }

  // 3b. Audit Authoritative Backend Database Corpus: src/data/quran-corpus.json
  const corpusJsonPath = path.join(projectRoot, 'src', 'data', 'quran-corpus.json');
  if (fs.existsSync(corpusJsonPath)) {
    try {
      const corpusData = JSON.parse(fs.readFileSync(corpusJsonPath, 'utf-8'));
      const ayahsList = corpusData.ayahs || [];
      assertCheck(
        'src/data/quran-corpus.json contains all 6,236 Ayahs',
        ayahsList.length === TOTAL_AYAHS,
        `Found ${ayahsList.length} / 6,236 ayahs`
      );
      assertCheck(
        'src/data/quran-corpus.json metadata matches 114 surahs, 604 pages, 30 juz',
        corpusData.metadata?.total_surahs === 114 &&
          corpusData.metadata?.total_pages === 604 &&
          corpusData.metadata?.total_juz === 30
      );
    } catch (err: unknown) {
      assertCheck('src/data/quran-corpus.json parsing', false, String(err));
    }
  }

  // 4. Audit In-Tree Application Data: src/data/surahs.ts
  const surahsTsPath = path.join(projectRoot, 'src', 'data', 'surahs.ts');
  if (fs.existsSync(surahsTsPath)) {
    const content = fs.readFileSync(surahsTsPath, 'utf-8');
    // Extract array count
    const matches = content.match(/number:\s*(\d+)/g);
    const count = matches ? matches.length : 0;
    if (count < 114) {
      assertCheck(
        'src/data/surahs.ts covers all 114 Surahs',
        false,
        `Found only ${count} / 114 Surahs in src/data/surahs.ts — incomplete frontend dataset!`
      );
    } else {
      assertCheck('src/data/surahs.ts covers all 114 Surahs', true);
    }
  }

  // 5. Audit In-Tree Application Data: src/data/medina-pages.ts
  const pagesTsPath = path.join(projectRoot, 'src', 'data', 'medina-pages.ts');
  if (fs.existsSync(pagesTsPath)) {
    const content = fs.readFileSync(pagesTsPath, 'utf-8');
    const pageKeys = content.match(/^\s*(\d+):\s*\{/gm);
    const pageCount = pageKeys ? pageKeys.length : 0;
    if (pageCount < 604) {
      assertCheck(
        'src/data/medina-pages.ts covers all 604 Medina Mushaf pages',
        false,
        `Found only ${pageCount} / 604 pages in src/data/medina-pages.ts — stubbed sample pages only!`
      );
    } else {
      assertCheck('src/data/medina-pages.ts covers all 604 pages', true);
    }
  }

  const executionTimeMs = Date.now() - startTime;
  return {
    suiteName: 'Quran Text Integrity & Boundary Verification Suite',
    totalChecks,
    passedChecks,
    failedChecks,
    findings,
    executionTimeMs,
  };
}
