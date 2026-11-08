'use client';

import React from 'react';
import { QuranWord } from '@/data/medina-pages';
import { AyahMarker } from './AyahMarker';
import { useActiveRecallStore, GhostTextLevel } from '@/stores/active-recall-store';

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
    toggleAyahVisibility,
  } = useActiveRecallStore();

  return (
    <div className="flex flex-wrap items-center justify-between gap-y-1 w-full text-justify [text-justify:inter-word] leading-[2.6rem] sm:leading-[3.2rem]">
      {words.map((word, idx) => {
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

        // Determine word visibility based on ghost level
        let isVisible = true;
        let isGhost = false;

        if (isRecallModeActive && !isAyahRevealed) {
          if (ghostTextLevel === 'hidden') {
            isVisible = wordRevealed;
            isGhost = !wordRevealed;
          } else if (ghostTextLevel === 'initial_prompt') {
            // Only first word of the ayah is visible
            isVisible = word.wordIndex === 1 || wordRevealed;
            isGhost = !isVisible;
          } else if (ghostTextLevel === 'keywords') {
            // First and last words or odd words visible as keywords
            const isKey = word.wordIndex === 1 || word.wordIndex % 3 === 0;
            isVisible = isKey || wordRevealed;
            isGhost = !isVisible;
          }
        }

        return (
          <span
            key={word.id}
            onClick={() => {
              if (isGhost) {
                revealWordHint(word.ayahNumber, word.wordIndex);
              }
            }}
            className={`font-uthmani text-xl sm:text-2xl md:text-[28px] transition-all duration-200 select-none px-1 rounded cursor-pointer ${
              isVisible
                ? 'text-mushaf-ink dark:text-darkMushaf-ink'
                : 'text-transparent bg-mushaf-ink/10 dark:bg-darkMushaf-ink/10 blur-[5px] hover:blur-none hover:bg-mushaf-gold/20'
            }`}
            title={isGhost ? 'اضغط لإظهار الكلمة (تلميح)' : undefined}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
