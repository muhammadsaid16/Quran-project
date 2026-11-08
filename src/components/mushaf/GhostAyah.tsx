'use client';

import React from 'react';
import { QuranWord } from '@/data/medina-pages';
import { AyahMarker } from './AyahMarker';
import { useActiveRecallStore, getGhostTierNumber } from '@/stores/active-recall-store';
import { useRecitationStore } from '@/stores/recitation-store';

interface GhostAyahProps {
  words: QuranWord[];
  activeAyahTargetId?: number;
  isRecallModeActive?: boolean;
}

export const GhostAyah: React.FC<GhostAyahProps> = ({
  words,
  activeAyahTargetId,
  isRecallModeActive = false,
}) => {
  const {
    ghostTextLevel,
    revealedAyahIds,
    revealedWordIndices,
    isHintRevealed,
    revealWordHint,
  } = useActiveRecallStore();

  const { wordStatusMap, evaluatedWords } = useRecitationStore();

  const ghostTier = getGhostTierNumber(ghostTextLevel);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 sm:gap-x-2 md:gap-x-2.5 gap-y-1 w-full leading-[2.8rem] sm:leading-[3.4rem] md:leading-[3.8rem] text-center">
      {words.map((word) => {
        if (word.isAyahMarker) {
          return (
            <AyahMarker
              key={word.id}
              ayahNumber={word.ayahNumber}
              size="md"
              className="cursor-pointer hover:scale-110 transition-transform"
            />
          );
        }

        const isAyahRevealed =
          revealedAyahIds.includes(word.ayahNumber) || isHintRevealed;
        const wordRevealed =
          revealedWordIndices[word.ayahNumber]?.includes(word.wordIndex) ?? false;

        // Determine word visibility based on ghost level (tier 1, 2, 3 or 0=visible)
        let isVisible = true;
        let isGhost = false;

        if (isRecallModeActive && !isAyahRevealed) {
          if (ghostTier === 1) {
            // Level 1: Full Concealment — all words hidden
            isVisible = wordRevealed;
            isGhost = !wordRevealed;
          } else if (ghostTier === 2) {
            // Level 2: First Words / Clues — first 1-2 words visible (0-indexed: 0 and 1)
            isVisible = word.wordIndex === 0 || word.wordIndex === 1 || wordRevealed;
            isGhost = !isVisible;
          } else if (ghostTier === 3) {
            // Level 3: Key Landmarks — anchor words and structural connectors visible
            const isLandmark =
              word.wordIndex === 0 ||
              word.wordIndex % 3 === 0;
            isVisible = isLandmark || wordRevealed;
            isGhost = !isVisible;
          } else {
            // Tier 0: Visible
            isVisible = true;
            isGhost = false;
          }
        }

        // Check if this word has an evaluated alignment status (Visual Review)
        const wordKeyFull = `${word.surahNumber}:${word.ayahNumber}:${word.wordIndex}`;
        const wordKeyAyah = `${word.ayahNumber}:${word.wordIndex}`;
        const wordKeyIdx = `word:${word.wordIndex}`;
        const evalStatus =
          wordStatusMap[wordKeyFull] ||
          wordStatusMap[wordKeyAyah] ||
          wordStatusMap[wordKeyIdx];

        // Highlight classes based on evaluated status
        let statusStyles = '';
        let statusBadge = '';

        if (evalStatus === 'correct') {
          // Emerald for Correct
          statusStyles =
            'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-b-2 border-emerald-500 font-bold px-1 rounded shadow-sm';
          statusBadge = 'صحيح (Emerald)';
          isVisible = true; // Always show during review
          isGhost = false;
        } else if (evalStatus === 'omission') {
          // Red for Omissions
          statusStyles =
            'bg-red-500/20 text-red-700 dark:text-red-300 border-b-2 border-red-500 underline decoration-wavy decoration-red-500 font-bold px-1 rounded shadow-sm';
          statusBadge = 'حذف / لم يُتلى (Red)';
          isVisible = true;
          isGhost = false;
        } else if (
          evalStatus === 'substitution' ||
          evalStatus === 'repetition' ||
          evalStatus === 'uncertain'
        ) {
          // Amber for Substitutions / Stumbles / Repetitions
          statusStyles =
            'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-b-2 border-amber-500 font-bold px-1 rounded shadow-sm';
          statusBadge = 'تعثر / استبدال (Amber)';
          isVisible = true;
          isGhost = false;
        }

        return (
          <span
            key={word.id}
            data-testid={`word-${word.id}`}
            data-ayah-number={word.ayahNumber}
            data-word-index={word.wordIndex}
            data-eval-status={evalStatus || undefined}
            data-ghost-state={isGhost ? 'concealed' : 'visible'}
            onClick={() => {
              if (isGhost) {
                revealWordHint(word.ayahNumber, word.wordIndex);
              }
            }}
            className={`font-uthmani text-xl sm:text-2xl md:text-[28px] transition-all duration-200 select-none px-1 rounded cursor-pointer ${
              statusStyles
                ? statusStyles
                : isVisible
                ? wordRevealed
                  ? 'text-mushaf-ink dark:text-darkMushaf-ink bg-mushaf-gold/15 ring-1 ring-mushaf-gold/40'
                  : 'text-mushaf-ink dark:text-darkMushaf-ink'
                : 'text-transparent bg-mushaf-ink/10 dark:bg-darkMushaf-ink/10 blur-[5px] hover:blur-none hover:bg-mushaf-gold/20'
            }`}
            title={
              statusBadge
                ? `${word.text} — ${statusBadge}`
                : isGhost
                ? 'اضغط لإظهار الكلمة (تلميح)'
                : undefined
            }
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
