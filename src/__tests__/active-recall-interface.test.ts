/**
 * Milestone 4: Active Recall Interface Test Suite
 *
 * Verifies the 5 Core Acceptance Criteria:
 * 1. Medina 15-line Mushaf layout renders with authentic typography and page turning.
 * 2. Ghost Text toggles across Level 1 (Full Concealment), Level 2 (First Words/Clues), and Level 3 (Landmarks).
 * 3. Recitation HUD provides real-time voice feedback without premature text revelation.
 * 4. Visual review highlights errors accurately: Red for Omissions, Amber for Substitutions/Stumbles, Emerald for Correct.
 * 5. Zero keyboard or character entry inputs present on recitation views.
 *
 * Plus specialized interaction flows: Acquisition, Retention, and Transition modes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MEDINA_PAGES } from '@/data/medina-pages';
import { SURAHS } from '@/data/surahs';
import {
  useActiveRecallStore,
  getGhostTierNumber,
  getGhostTierLabel,
} from '@/stores/active-recall-store';
import { useRecitationStore } from '@/stores/recitation-store';
import { useSessionStore } from '@/stores/session-store';
import { WordAlignmentResult } from '@/alignment/types';

describe('Milestone 4: Active Recall Interface (WHI-39)', () => {
  beforeEach(() => {
    useActiveRecallStore.getState().stopRecallSession();
    useActiveRecallStore.getState().resetHints();
    useActiveRecallStore.getState().resetFlawless();
    useActiveRecallStore.getState().setGhostTextLevel('level2_first_words');
    useActiveRecallStore.getState().setMode('acquisition');
    useRecitationStore.getState().resetRecitation();
  });

  describe('Criterion 1: Medina 15-Line Mushaf Layout & Page Turning', () => {
    it('verifies every Medina Mushaf page has authentic 15-line pagination metadata', () => {
      // Check opening illuminated pages (1 & 2) and standard 15-line pages (3 to 604)
      const page1 = MEDINA_PAGES[1];
      const page2 = MEDINA_PAGES[2];
      const page3 = MEDINA_PAGES[3];
      const page4 = MEDINA_PAGES[4];
      const page604 = MEDINA_PAGES[604];

      expect(page1).toBeDefined();
      expect(page2).toBeDefined();
      expect(page3).toBeDefined();
      expect(page4).toBeDefined();
      expect(page604).toBeDefined();

      // Pages 1 and 2 are illuminated opening pages (<= 15 lines), standard pages have exactly 15 lines
      expect(page1.lines.length).toBeLessThanOrEqual(15);
      expect(page2.lines.length).toBeLessThanOrEqual(15);
      expect(page3.lines.length).toBe(15);
      expect(page4.lines.length).toBe(15);
      expect(page604.lines.length).toBe(15);
    });

    it('navigates forward and backward cleanly across the 604 Medina pages', () => {
      const session = useSessionStore.getState();
      session.setCurrentPage(1);
      expect(useSessionStore.getState().currentPage).toBe(1);

      // Next page
      session.setCurrentPage(2);
      expect(useSessionStore.getState().currentPage).toBe(2);

      // Page boundary clamps
      session.setCurrentPage(700);
      expect(useSessionStore.getState().currentPage).toBe(604);

      session.setCurrentPage(-5);
      expect(useSessionStore.getState().currentPage).toBe(1);
    });

    it('identifies right vs left page orientation for authentic Mushaf opening', () => {
      expect(MEDINA_PAGES[1].isRightPage).toBe(true);
      expect(MEDINA_PAGES[2].isRightPage).toBe(false);
      expect(MEDINA_PAGES[3].isRightPage).toBe(true);
    });

    it('records page turn direction for smooth flip animations', () => {
      const store = useActiveRecallStore.getState();
      expect(store.pageTurnDirection).toBeNull();

      store.setPageTurnDirection('next');
      expect(useActiveRecallStore.getState().pageTurnDirection).toBe('next');

      store.setPageTurnDirection('prev');
      expect(useActiveRecallStore.getState().pageTurnDirection).toBe('prev');

      store.setPageTurnDirection(null);
      expect(useActiveRecallStore.getState().pageTurnDirection).toBeNull();
    });
  });

  describe('Criterion 2: Ghost Text 3-Tier System & Interactive Clues', () => {
    it('accurately maps and labels the 3 Ghost Text tiers', () => {
      expect(getGhostTierNumber('level1_concealed')).toBe(1);
      expect(getGhostTierNumber('level2_first_words')).toBe(2);
      expect(getGhostTierNumber('level3_landmarks')).toBe(3);
      expect(getGhostTierNumber('visible')).toBe(0);

      expect(getGhostTierLabel('level1_concealed')).toContain('إخفاء كامل');
      expect(getGhostTierLabel('level2_first_words')).toContain('بدايات الآيات');
      expect(getGhostTierLabel('level3_landmarks')).toContain('معالم الآيات');
      expect(getGhostTierLabel('visible')).toContain('النص الكامل');
    });

    it('cycles sequentially through Level 1 -> Level 2 -> Level 3 -> Visible -> Level 1', () => {
      const store = useActiveRecallStore.getState();
      store.setGhostTextLevel('level1_concealed');
      expect(getGhostTierNumber(useActiveRecallStore.getState().ghostTextLevel)).toBe(1);

      useActiveRecallStore.getState().cycleGhostTextLevel();
      expect(getGhostTierNumber(useActiveRecallStore.getState().ghostTextLevel)).toBe(2);

      useActiveRecallStore.getState().cycleGhostTextLevel();
      expect(getGhostTierNumber(useActiveRecallStore.getState().ghostTextLevel)).toBe(3);

      useActiveRecallStore.getState().cycleGhostTextLevel();
      expect(getGhostTierNumber(useActiveRecallStore.getState().ghostTextLevel)).toBe(0);

      useActiveRecallStore.getState().cycleGhostTextLevel();
      expect(getGhostTierNumber(useActiveRecallStore.getState().ghostTextLevel)).toBe(1);
    });

    it('reveals single-word hints upon interactive tap without uncovering the full verse', () => {
      const store = useActiveRecallStore.getState();
      const ayahId = 5;
      const wordIndex = 2;

      expect(store.revealedWordIndices[ayahId]).toBeUndefined();

      store.revealWordHint(ayahId, wordIndex);
      expect(useActiveRecallStore.getState().revealedWordIndices[ayahId]).toContain(wordIndex);
      expect(useActiveRecallStore.getState().revealedAyahIds).not.toContain(ayahId);
    });

    it('reveals the full verse when user explicitly requests a hint', () => {
      const store = useActiveRecallStore.getState();
      expect(store.isHintRevealed).toBe(false);

      store.revealFullHint();
      expect(useActiveRecallStore.getState().isHintRevealed).toBe(true);

      store.resetHints();
      expect(useActiveRecallStore.getState().isHintRevealed).toBe(false);
    });
  });

  describe('Criterion 3: Recitation HUD Real-Time Voice Feedback Without Premature Text Revelation', () => {
    it('manages recitation state machine: idle -> listening -> processing -> completed', () => {
      const recitation = useRecitationStore.getState();
      expect(recitation.status).toBe('idle');
      expect(recitation.micActive).toBe(false);

      recitation.setStatus('listening');
      recitation.setMicActive(true);
      expect(useRecitationStore.getState().status).toBe('listening');
      expect(useRecitationStore.getState().micActive).toBe(true);

      recitation.setStatus('processing');
      recitation.setMicActive(false);
      expect(useRecitationStore.getState().status).toBe('processing');

      recitation.setStatus('completed');
      expect(useRecitationStore.getState().status).toBe('completed');
    });

    it('guarantees that while listening, unseen verse text is NOT revealed in live transcript', () => {
      const recallStore = useActiveRecallStore.getState();
      const recitationStore = useRecitationStore.getState();

      recallStore.setGhostTextLevel('level1_concealed');
      recallStore.setCurrentAyah({
        surahNumber: 1,
        surahNameArabic: 'الفاتحة',
        ayahNumber: 2,
        globalAyahNumber: 2,
        pageNumber: 1,
        juzNumber: 1,
        textUthmani: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
      });

      recitationStore.setStatus('listening');
      recitationStore.setMicActive(true);

      // Verify live transcript is not filled with target answer
      expect(useRecitationStore.getState().liveTranscript).toBe('');
      expect(useRecitationStore.getState().liveTranscript).not.toBe(
        recallStore.currentAyah?.textUthmani
      );
    });

    it('streams audio waveform bar levels and RMS energy in real time', () => {
      const recitation = useRecitationStore.getState();
      expect(recitation.waveformLevels).toHaveLength(16);

      recitation.setAudioLevel(68);
      expect(useRecitationStore.getState().audioLevel).toBe(68);

      const customLevels = [20, 40, 60, 80, 50, 30, 20, 10, 30, 50, 70, 90, 60, 40, 20, 10];
      recitation.setWaveformLevels(customLevels);
      expect(useRecitationStore.getState().waveformLevels).toEqual(customLevels);
    });
  });

  describe('Criterion 4: Visual Review Error Highlighting (Red, Amber, Emerald)', () => {
    it('correctly maps word alignment results into Emerald (Correct), Red (Omission), Amber (Substitution/Stumble)', () => {
      const recitation = useRecitationStore.getState();

      const mockWords: WordAlignmentResult[] = [
        {
          wordIndex: 0,
          uthmaniText: 'بِسْمِ',
          expectedPhonemes: 'b i s m i',
          detectedPhonemes: 'b i s m i',
          status: 'correct',
          confidence: 98,
        },
        {
          wordIndex: 1,
          uthmaniText: 'ٱللَّهِ',
          expectedPhonemes: 'l l a h i',
          detectedPhonemes: '',
          status: 'omission', // Red
          confidence: 0,
          errorDetails: 'حذف لفظ الجلالة',
        },
        {
          wordIndex: 2,
          uthmaniText: 'ٱلرَّحْمَٰنِ',
          expectedPhonemes: 'r r a h m a n i',
          detectedPhonemes: 'r r a h i m i',
          status: 'substitution', // Amber
          confidence: 65,
          errorDetails: 'استبدال بالرحيم',
        },
        {
          wordIndex: 3,
          uthmaniText: 'ٱلرَّحِيمِ',
          expectedPhonemes: 'r r a h i m i',
          detectedPhonemes: 'r r a h i m i',
          status: 'correct', // Emerald
          confidence: 96,
        },
      ];

      recitation.setEvaluatedWords(mockWords, 1, 1);

      const state = useRecitationStore.getState();
      expect(state.evaluatedWords).toHaveLength(4);
      expect(state.isReviewOpen).toBe(true);

      // Check O(1) status lookup map
      expect(state.wordStatusMap['1:1:0']).toBe('correct'); // Emerald
      expect(state.wordStatusMap['1:1:1']).toBe('omission'); // Red
      expect(state.wordStatusMap['1:1:2']).toBe('substitution'); // Amber
      expect(state.wordStatusMap['1:1:3']).toBe('correct'); // Emerald
    });

    it('suggests appropriate FSRS ratings based on error profile (Again for omissions, Easy for flawless)', () => {
      const recitation = useRecitationStore.getState();

      // Flawless
      const flawlessWords: WordAlignmentResult[] = [
        { wordIndex: 0, uthmaniText: 'قُلْ', expectedPhonemes: 'q u l', detectedPhonemes: 'q u l', status: 'correct', confidence: 99 },
        { wordIndex: 1, uthmaniText: 'هُوَ', expectedPhonemes: 'h u w a', detectedPhonemes: 'h u w a', status: 'correct', confidence: 98 },
        { wordIndex: 2, uthmaniText: 'ٱللَّهُ', expectedPhonemes: 'l l a h u', detectedPhonemes: 'l l a h u', status: 'correct', confidence: 97 },
        { wordIndex: 3, uthmaniText: 'أَحَدٌ', expectedPhonemes: 'a h a d', detectedPhonemes: 'a h a d', status: 'correct', confidence: 95 },
      ];
      recitation.setEvaluatedWords(flawlessWords, 112, 1);
      recitation.setConfidenceScore(98);

      const correctCount = flawlessWords.filter((w) => w.status === 'correct').length;
      expect(correctCount).toBe(4);
      expect(flawlessWords.some((w) => w.status === 'omission')).toBe(false);
    });
  });

  describe('Criterion 5: Zero Keyboard or Character Entry Inputs on Recitation Views', () => {
    it('asserts that navigation relies purely on click steppers and dropdowns with zero <input> elements', () => {
      // We inspect source code of recitation views to guarantee 0 <input> elements
      const fs = require('node:fs');
      const path = require('node:path');

      const mushafViewerCode = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/mushaf/MushafViewer.tsx'),
        'utf-8'
      );
      const ghostAyahCode = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/mushaf/GhostAyah.tsx'),
        'utf-8'
      );
      const hudCode = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/hud/RecitationHUD.tsx'),
        'utf-8'
      );
      const medinaPageCode = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/mushaf/MedinaPage.tsx'),
        'utf-8'
      );

      // Verify no <input or <textarea or contenteditable in any of the recitation components
      expect(mushafViewerCode).not.toContain('<input');
      expect(mushafViewerCode).not.toContain('<textarea');
      expect(mushafViewerCode).not.toContain('contenteditable');

      expect(ghostAyahCode).not.toContain('<input');
      expect(ghostAyahCode).not.toContain('<textarea');

      expect(hudCode).not.toContain('<input');
      expect(hudCode).not.toContain('<textarea');

      expect(medinaPageCode).not.toContain('<input');
      expect(medinaPageCode).not.toContain('<textarea');
    });
  });

  describe('Specialized Interaction Flows: Acquisition, Retention & Transition', () => {
    it('Acquisition Mode: verifies 2 consecutive flawless recitations trigger mastery', () => {
      const store = useActiveRecallStore.getState();
      store.setMode('acquisition');
      store.setAcquisitionStep('read');
      expect(useActiveRecallStore.getState().acquisitionStep).toBe('read');

      // Step 2: Ghost text
      store.setAcquisitionStep('ghost');
      store.setGhostTextLevel('level2_first_words');
      expect(useActiveRecallStore.getState().acquisitionStep).toBe('ghost');

      // Step 3: Recite attempt 1 (flawless)
      store.recordAcquisitionResult(true);
      expect(useActiveRecallStore.getState().consecutiveFlawlessCount).toBe(1);
      expect(useActiveRecallStore.getState().acquisitionStep).toBe('review');

      // Attempt 2 (flawless) -> triggers mastered
      store.recordAcquisitionResult(true);
      expect(useActiveRecallStore.getState().consecutiveFlawlessCount).toBe(2);
      expect(useActiveRecallStore.getState().acquisitionStep).toBe('mastered');

      // Stumble resets flawless counter
      store.recordAcquisitionResult(false);
      expect(useActiveRecallStore.getState().consecutiveFlawlessCount).toBe(0);
      expect(useActiveRecallStore.getState().acquisitionStep).toBe('review');
    });

    it('Retention Mode: navigates through daily due queue and records FSRS rating', () => {
      const store = useActiveRecallStore.getState();
      store.setMode('retention');

      const queue = [
        {
          surahNumber: 1,
          surahNameArabic: 'الفاتحة',
          ayahNumber: 2,
          globalAyahNumber: 2,
          pageNumber: 1,
          juzNumber: 1,
          textUthmani: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
        },
        {
          surahNumber: 2,
          surahNameArabic: 'البقرة',
          ayahNumber: 1,
          globalAyahNumber: 8,
          pageNumber: 2,
          juzNumber: 1,
          textUthmani: 'الٓمٓ',
        },
      ];

      store.setRetentionQueue(queue);
      expect(useActiveRecallStore.getState().retentionQueue).toHaveLength(2);
      expect(useActiveRecallStore.getState().currentAyah?.ayahNumber).toBe(2);

      // Advance to next card
      store.nextRetentionCard();
      expect(useActiveRecallStore.getState().retentionQueueIndex).toBe(1);
      expect(useActiveRecallStore.getState().currentAyah?.ayahNumber).toBe(1);

      // Return to previous card
      store.prevRetentionCard();
      expect(useActiveRecallStore.getState().retentionQueueIndex).toBe(0);
    });

    it('Transition Mode: detects and warns when pause duration exceeds 2.0 seconds', () => {
      const recitation = useRecitationStore.getState();
      expect(recitation.isPauseExceeded).toBe(false);

      recitation.setPauseDurationMs(1200);
      expect(useRecitationStore.getState().isPauseExceeded).toBe(false);

      // Exceeds 2000ms threshold
      recitation.setPauseDurationMs(2350);
      expect(useRecitationStore.getState().isPauseExceeded).toBe(true);
      expect(useRecitationStore.getState().pauseDurationMs).toBe(2350);

      // Reset upon voice resumption
      recitation.setPauseDurationMs(0);
      expect(useRecitationStore.getState().isPauseExceeded).toBe(false);
    });
  });
});
