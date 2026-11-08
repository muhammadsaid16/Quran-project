# Technical Decision & Architecture Report: Milestone 5
## FSRS Integration & Daily Due Queue (ts-fsrs Spaced Repetition Engine)

- **Document ID:** DECISION-2026-11-08-M5
- **Author:** Backend Engineer (`bcc1a59d-ae22-4828-bab3-300aca7a0db2`, WhiteRoom Labs)
- **Status:** APPROVED / PRODUCTION INTEGRATION COMPLETE
- **Target Project:** Quran Cognitive OS (Local-First Memorization & Retention Platform)
- **Date:** November 8, 2026
- **Tracking Issue:** WHI-40

---

## 1. Executive Summary & Verification Matrix

| Acceptance Criteria | Engineering Requirement | Verification Result / Evidence | Status |
| :--- | :--- | :--- | :--- |
| **1. ts-fsrs Configuration (R=0.90)** | ts-fsrs integrated and configured with target retention of 90% (R=0.90) and deterministic intervals (`enable_fuzz = false`). | Verified `DEFAULT_REQUEST_RETENTION = 0.90`, `DEFAULT_ENABLE_FUZZ = false`. Dynamic retrievability formula $R(t) = \left(1 + \text{factor} \times \frac{t}{S}\right)^{-1}$ accurately models decay. | **PASSED** |
| **2. Automated Rating Derivation** | Automated rating logic mapping recitation error classification directly into FSRS ratings (Again=1, Hard=2, Good=3, Easy=4). | `RatingDerivator` maps flawless recitations to Easy (4), minor repetitions/hesitations to Good (3), single omissions/substitutions or struggle to Hard (2), and multiple errors/sequence breakdown to Again (1). Verified with unit metrics & `AyahAlignmentResult`. | **PASSED** |
| **3. Daily Due Queue Query** | Dynamic Dexie.js query retrieving cards where `due <= now`, strictly partitioned into New and Due items. | `DailyDueQueueManager` executes range queries on Dexie IndexedDB `due` and `state`, partitioning into `dueCards` (Review, Learning, Relearning) and `newCards` (State.New), with urgency sorting and comprehensive summary statistics. | **PASSED** |
| **4. Independent Transition Edge Cards** | Inter-ayah and page boundary transition cards scheduled and updated independently from Ayah cards. | `FSRSService.recordTransitionRecitation` schedules transition cards (`card:transition:from->to`) independently from Ayah cards (`card:ayah:from`), while synchronizing the `transition_edges` table and page-boundary flags. | **PASSED** |
| **5. Scheduling Determinism & State Stability** | Automated test suite verifying scheduling determinism, interval expansion, and state stability transitions. | `src/__tests__/fsrs-memory-engine.test.ts` executes **16 comprehensive tests** proving 100% determinism across 50 iterations, state progression (New -> Learning -> Review -> Relearning), and Dexie audit persistence. | **PASSED** |

---

## 2. Architecture & Pipeline Specification

```
                                [Recitation Audio Input]
                                           │
                                           ▼
                       [Milestone 2: Voice Recognition Engine]
                                           │
                                           ▼
                     [Milestone 3: Phoneme Alignment Engine]
                     (AyahAlignmentResult & Recitation Diagnostics)
                                           │
                                           ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                        Milestone 5: FSRS Memory Engine                      │
    │                                                                             │
    │   ┌─────────────────────────────────────────────────────────────────────┐   │
    │   │                         RatingDerivator                             │   │
    │   │   - Easy (4): Flawless, 0 omissions/subs/reps, high confidence      │   │
    │   │   - Good (3): Correct recitation, minor repetition/hesitation       │   │
    │   │   - Hard (2): Single omission/substitution, noticeable struggle     │   │
    │   │   - Again (1): Multiple errors, severe stumbling, sequence jump     │   │
    │   └──────────────────────────────────┬──────────────────────────────────┘   │
    │                                      │                                      │
    │                                      ▼                                      │
    │   ┌─────────────────────────────────────────────────────────────────────┐   │
    │   │                          FSRSScheduler                              │   │
    │   │   - ts-fsrs wrapper configured at R=0.90 (90% target retention)     │   │
    │   │   - 100% deterministic interval calculation (enable_fuzz = false)   │   │
    │   │   - S (Stability) & D (Difficulty) updates via repeat()             │   │
    │   │   - State machine: New (0) -> Learning (1) -> Review (2)            │   │
    │   │                    Review (2) -> Relearning (3) on Again (1)        │   │
    │   └──────────────────┬───────────────────────────────┬──────────────────┘   │
    │                      │                               │                      │
    │                      ▼                               ▼                      │
    │           [Ayah Memory Cards]            [Transition Edge Cards]            │
    │           - Target: card:ayah:1:1        - Target: card:trans:1:7->2:1      │
    │           - Independent schedule         - Independent schedule             │
    │                                          - Page-boundary flags              │
    └──────────────────────┬───────────────────────────────┬──────────────────────┘
                           │                               │
                           ▼                               ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                          Dexie.js IndexedDB Schema                          │
    │                                                                             │
    │   - memory_cards: Stores all active and new cards with due, S, D, state     │
    │   - transition_edges: Synchronized with stability, difficulty, due dates    │
    │   - review_logs: Audit trail of duration, confidence, error details, rating │
    └──────────────────────────────────────┬──────────────────────────────────────┘
                                           │
                                           ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                          Daily Due Queue Manager                            │
    │                                                                             │
    │   - Range query: due <= asOfDate                                            │
    │   - Partition: Due Cards (Learning/Review/Relearning) vs New Cards (New)    │
    │   - Filters: Target Type (Ayah / Transition), Surah, Juz, Page, Boundary    │
    │   - Sorting: Urgency (most overdue first) / Quranic sequential order        │
    │   - Analytics: Summary metrics & dynamic retrievability decay R(t)          │
    └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Engineering Decisions & Design Invariants

### 3.1 Retention Configuration (R=0.90)
Quran memorization requires higher baseline retention than standard vocabulary flashcards due to the sacrosanct nature of Quranic text. The FSRS engine is configured with `request_retention = 0.90` (90% target retention). `enable_fuzz` is disabled (`false`) to guarantee reproducible test evaluation and deterministic scheduling.

### 3.2 Rating Derivation Rules
Recitation errors are translated into FSRS ratings following strict clinical rules:
1. **Again (1):**
   - Sequence jump / verse transposition (`isSequenceJump: true`).
   - Multiple content errors (omissions + substitutions >= 2).
   - Severe stumbling (3+ repetitions or 2 repetitions with < 80% accuracy).
   - Low acoustic confidence (< 0.50) or inability to articulate verse.
   - Overall phoneme accuracy below 65%.
2. **Hard (2):**
   - Single content error (exactly 1 omission OR 1 substitution) recovered with struggle.
   - Noticeable stumbling (2 repetitions) even if content was ultimately correct.
   - Significant hesitation (>= 3000ms delay).
   - Moderate accuracy (65% - 82%).
3. **Good (3):**
   - Zero omissions and zero substitutions.
   - Minor hesitation (1500ms - 3000ms) or single brief self-correction/repetition.
   - Accuracy between 82% and 95%.
4. **Easy (4):**
   - Zero omissions, zero substitutions, zero repetitions.
   - Smooth cadence (hesitation < 1500ms), high accuracy (>= 95%), and high acoustic confidence (>= 75%).

### 3.3 Independent Transition Edge Scheduling
Stumbling at the transition between ayahs—particularly when turning the page in the 15-line Medina Mushaf—is a primary memorization failure mode. Transition edge cards (`card:transition:from->to`) are maintained and scheduled as independent FSRS cards. Reviewing an Ayah does not mutate the transition card, and stumbling on a transition does not penalize the stability of the constituent Ayahs.

### 3.4 Due Queue Partitioning
The daily review queue separates `Due Cards` (items already in Learning, Review, or Relearning whose scheduled due timestamp is `<= now`) from `New Cards` (unlearned verses in `State.New`). This ensures users are not overwhelmed with new content while critical reviews are pending, maintaining cognitive load balance.

---

## 4. Test Verification Summary

- **Test Suite:** `src/__tests__/fsrs-memory-engine.test.ts`
- **Total Tests:** 16 tests
- **Result:** 100% Passed (0 failures)
- **Repo-Wide Suite:** 76/76 tests passing across all 5 test files (`audio-engine`, `phoneme-alignment-engine`, `quran-data-foundation`, `qa-master`, and `fsrs-memory-engine`).
- **Production Build:** `next build` static export succeeded with 0 errors.
