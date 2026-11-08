/**
 * Quran Cognitive OS v2.0 — Daily Due Queue Service
 * Dynamically computes and partitions spaced repetition review items:
 *  - Due Cards: Previously studied cards (Learning, Review, Relearning) where due <= now
 *  - New Cards: Unlearned cards (State.New) available for initial acquisition
 */

import { QuranCognitiveDB, MemoryCard, MemoryTargetType } from '../db/schema';
import { FSRSScheduler } from './scheduler';
import { State } from './types';
import {
  DailyDueQueue,
  DueQueueQueryOptions,
  DueQueueSummary,
} from './types';

export class DailyDueQueueManager {
  /**
   * Retrieves and partitions the daily study queue into Due cards and New cards.
   */
  public static async getDailyDueQueue(
    db: QuranCognitiveDB,
    options: DueQueueQueryOptions = {}
  ): Promise<DailyDueQueue> {
    const asOfDate = options.asOfDate ? new Date(options.asOfDate) : new Date();

    // 1. Fetch all cards where due <= asOfDate using Dexie indexed range
    const candidateCards = await db.memory_cards
      .where('due')
      .belowOrEqual(asOfDate)
      .toArray();

    // In case unreviewed cards were created with due in the future or not captured above,
    // also fetch New cards if needed
    let newCardsPool: MemoryCard[] = [];
    if (options.limitNew === undefined || options.limitNew > 0) {
      newCardsPool = await db.memory_cards
        .where('state')
        .equals(State.New)
        .toArray();
    }

    // Combine and deduplicate
    const cardMap = new Map<string, MemoryCard>();
    for (const card of candidateCards) {
      cardMap.set(card.id, card);
    }
    for (const card of newCardsPool) {
      cardMap.set(card.id, card);
    }

    const allCards = Array.from(cardMap.values());

    // 2. Apply filtering
    const filteredCards = await this.filterCards(db, allCards, options, asOfDate);

    // 3. Partition into Due vs New
    const rawDueCards: MemoryCard[] = [];
    const rawNewCards: MemoryCard[] = [];

    let learningCount = 0;
    let reviewCount = 0;
    let relearningCount = 0;
    let overdueCount = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const overdueThreshold = new Date(asOfDate.getTime() - oneDayMs);

    for (const card of filteredCards) {
      // Calculate dynamic current retrievability
      const currentR = FSRSScheduler.getCardRetrievability(card, asOfDate);
      const cardWithR: MemoryCard = {
        ...card,
        retrievability: currentR,
      };

      if (card.state === State.New && card.reps === 0) {
        rawNewCards.push(cardWithR);
      } else {
        // Due card must have due <= asOfDate
        const cardDueDate = new Date(card.due);
        if (cardDueDate <= asOfDate) {
          rawDueCards.push(cardWithR);

          if (card.state === State.Learning) learningCount++;
          else if (card.state === State.Review) reviewCount++;
          else if (card.state === State.Relearning) relearningCount++;

          if (cardDueDate <= overdueThreshold) {
            overdueCount++;
          }
        }
      }
    }

    // 4. Sort Due cards
    const sortedDue = this.sortDueCards(rawDueCards, options.sortBy ?? 'urgency');

    // 5. Sort New cards in Quranic sequence
    const sortedNew = this.sortNewCards(rawNewCards);

    // 6. Apply limits
    const limitedDue = options.limitDue !== undefined && options.limitDue > 0
      ? sortedDue.slice(0, options.limitDue)
      : sortedDue;

    const limitedNew = options.limitNew !== undefined && options.limitNew > 0
      ? sortedNew.slice(0, options.limitNew)
      : sortedNew;

    // Calculate average retrievability among due cards
    let totalR = 0;
    for (const c of sortedDue) {
      totalR += c.retrievability ?? 0;
    }
    const averageRetrievability = sortedDue.length > 0
      ? Math.round((totalR / sortedDue.length) * 10000) / 10000
      : 1.0;

    const summary: DueQueueSummary = {
      totalDueCount: sortedDue.length,
      newCount: sortedNew.length,
      learningCount,
      reviewCount,
      relearningCount,
      overdueCount,
      averageRetrievability,
      asOfDate,
    };

    return {
      dueCards: limitedDue,
      newCards: limitedNew,
      allDue: [...limitedDue, ...limitedNew],
      summary,
    };
  }

  /**
   * Filters cards based on target type, surah, juz, page, or page boundaries.
   */
  private static async filterCards(
    db: QuranCognitiveDB,
    cards: MemoryCard[],
    options: DueQueueQueryOptions,
    asOfDate: Date
  ): Promise<MemoryCard[]> {
    let result = cards;

    // Target type filter: 'ayah' | 'transition' | 'all'
    if (options.targetType && options.targetType !== 'all') {
      result = result.filter((c) => c.target_type === options.targetType);
    }

    // Page boundaries filter (only relevant for transitions)
    if (options.onlyPageBoundaries) {
      const boundaryEdgeIds = new Set<string>();
      const boundaryEdges = await db.transition_edges
        .filter((e) => e.is_page_boundary)
        .toArray();
      for (const e of boundaryEdges) {
        boundaryEdgeIds.add(e.edge_id);
      }
      result = result.filter(
        (c) => c.target_type === 'transition' && boundaryEdgeIds.has(c.target_id)
      );
    }

    // Surah filter
    if (options.surah !== undefined) {
      result = result.filter((c) => {
        if (c.target_type === 'ayah') {
          const [s] = c.target_id.split(':');
          return parseInt(s, 10) === options.surah;
        } else if (c.target_type === 'transition') {
          const [from] = c.target_id.split('->');
          const [s] = from.split(':');
          return parseInt(s, 10) === options.surah;
        }
        return false;
      });
    }

    // Page or Juz filter (requires cross-referencing with quran_ayahs)
    if (options.page !== undefined || options.juz !== undefined) {
      // Build lookup map of verse keys to page / juz
      const verseKeysNeeded = new Set<string>();
      for (const c of result) {
        if (c.target_type === 'ayah') {
          verseKeysNeeded.add(c.target_id);
        } else if (c.target_type === 'transition') {
          const [from] = c.target_id.split('->');
          verseKeysNeeded.add(from);
        }
      }

      const ayahRecords = await db.quran_ayahs
        .where('verse_key')
        .anyOf(Array.from(verseKeysNeeded))
        .toArray();

      const verseMetadataMap = new Map<string, { page: number; juz: number }>();
      for (const r of ayahRecords) {
        verseMetadataMap.set(r.verse_key, { page: r.page, juz: r.juz });
      }

      result = result.filter((c) => {
        const key = c.target_type === 'ayah' ? c.target_id : c.target_id.split('->')[0];
        const meta = verseMetadataMap.get(key);
        if (!meta) return false;

        if (options.page !== undefined && meta.page !== options.page) {
          return false;
        }
        if (options.juz !== undefined && meta.juz !== options.juz) {
          return false;
        }
        return true;
      });
    }

    return result;
  }

  /**
   * Sorts due cards by urgency (most overdue first, then lowest retrievability),
   * or by specific requested sort strategy.
   */
  private static sortDueCards(
    cards: MemoryCard[],
    strategy: 'due' | 'urgency' | 'retrievability' | 'quranic_order'
  ): MemoryCard[] {
    const list = [...cards];

    switch (strategy) {
      case 'retrievability':
        // Lowest retrievability (most fragile memory) first
        return list.sort((a, b) => (a.retrievability ?? 0) - (b.retrievability ?? 0));

      case 'urgency':
        // Due date earliest first; if tied, lowest retrievability first
        return list.sort((a, b) => {
          const timeA = new Date(a.due).getTime();
          const timeB = new Date(b.due).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return (a.retrievability ?? 0) - (b.retrievability ?? 0);
        });

      case 'quranic_order':
        return this.sortByQuranicOrder(list);

      case 'due':
      default:
        return list.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
    }
  }

  /**
   * Sorts new cards in strict Quranic sequence (Surah 1:1, 1:2, ..., Surah 114:6).
   */
  private static sortNewCards(cards: MemoryCard[]): MemoryCard[] {
    return this.sortByQuranicOrder(cards);
  }

  /**
   * Generic Quranic ordering helper for Ayah and Transition cards.
   */
  private static sortByQuranicOrder(cards: MemoryCard[]): MemoryCard[] {
    return [...cards].sort((a, b) => {
      const getOrderKey = (card: MemoryCard) => {
        const id = card.target_type === 'ayah' ? card.target_id : card.target_id.split('->')[0];
        const [surah, ayah] = id.split(':').map((v) => parseInt(v, 10));
        return (surah || 0) * 10000 + (ayah || 0);
      };

      const keyA = getOrderKey(a);
      const keyB = getOrderKey(b);
      return keyA - keyB;
    });
  }
}

/**
 * Standalone convenience helper for fetching daily due queue.
 */
export async function getDailyDueQueue(
  db: QuranCognitiveDB,
  options?: DueQueueQueryOptions
): Promise<DailyDueQueue> {
  return DailyDueQueueManager.getDailyDueQueue(db, options);
}
