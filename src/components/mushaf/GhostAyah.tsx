'use client';

import React, { useEffect, useRef, useState } from 'react';
import { QuranWord } from '@/data/medina-pages';
import { AyahMarker } from './AyahMarker';
import { useActiveRecallStore, getGhostTierNumber } from '@/stores/active-recall-store';
import { useRecitationStore } from '@/stores/recitation-store';
import { useSessionStore } from '@/stores/session-store';
import { Volume2, VolumeX } from 'lucide-react';
import { playWordAudio, stopWordAudio } from '@/audio';

interface GhostAyahProps {
  words: QuranWord[];
  activeAyahTargetId?: number;
  isRecallModeActive?: boolean;
  isOpeningSpread?: boolean;
}

// Base font size per responsive breakpoint (mirrors Tailwind sm/md/lg)
function getBaseFontSize(): number {
  if (typeof window === 'undefined') return 22;
  const w = window.innerWidth;
  if (w >= 1024) return 25;
  if (w >= 768) return 23;
  if (w >= 640) return 20;
  return 17;
}

export const GhostAyah: React.FC<GhostAyahProps> = ({
  words,
  activeAyahTargetId,
  isRecallModeActive = false,
  isOpeningSpread = false,
}) => {
  const {
    ghostTextLevel,
    revealedAyahIds,
    revealedWordIndices,
    isHintRevealed,
    revealWordHint,
    setCurrentAyah,
  } = useActiveRecallStore();

  const { currentPage } = useSessionStore();
  const { wordStatusMap, evaluatedWords } = useRecitationStore();

  const [activeTooltipWordId, setActiveTooltipWordId] = useState<string | null>(null);
  const [playingWordId, setPlayingWordId] = useState<string | null>(null);

  const handlePlayWordAudio = (word: QuranWord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playingWordId === word.id) {
      stopWordAudio();
      setPlayingWordId(null);
      return;
    }
    setPlayingWordId(word.id);
    playWordAudio(word.surahNumber, word.ayahNumber, word.wordIndex, word.text, {
      onEnded: () => setPlayingWordId((curr) => (curr === word.id ? null : curr)),
      onError: () => setPlayingWordId((curr) => (curr === word.id ? null : curr)),
    });
  };

  useEffect(() => {
    if (!activeTooltipWordId) return;
    const handleDocumentClick = () => {
      setActiveTooltipWordId(null);
      stopWordAudio();
      setPlayingWordId(null);
    };
    const timer = setTimeout(() => {
      window.addEventListener('click', handleDocumentClick);
    }, 20);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleDocumentClick);
    };
  }, [activeTooltipWordId]);

  const ghostTier = getGhostTierNumber(ghostTextLevel);

  const lineRef = useRef<HTMLDivElement | null>(null);

  // Auto-fit: keep every Mushaf line strictly on ONE line (white-space: nowrap)
  // by scaling the font size down until the widest line fits the container width.
  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;

    const fit = () => {
      const base = isOpeningSpread ? getBaseFontSize() * 1.15 : getBaseFontSize();
      let scale = 1;
      el.style.fontSize = `${base}px`;
      // Iterate: font metrics are not perfectly linear with size
      for (let i = 0; i < 6; i++) {
        const avail = el.clientWidth;
        const need = el.scrollWidth;
        if (avail <= 0 || need <= avail) break;
        scale *= avail / need;
        el.style.fontSize = `${base * scale}px`;
      }
    };

    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    // Re-fit after webfonts load (Uthmani metrics differ from fallback)
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
    // Re-fit whenever content width can change: new line, ghost/reveal state,
    // or recitation review styles that add padding to words.
  }, [words, wordStatusMap, ghostTextLevel, revealedWordIndices, isHintRevealed, revealedAyahIds, isRecallModeActive, isOpeningSpread]);

  // Medina Mushaf line justification:
  // Short lines (<= 5 words, e.g. opening spreads or end of Surahs) are centered
  // with natural Quranic word spacing. Full lines (> 5 words) are distributed across
  // the Medina page frame with balanced inter-word spacing.
  const isShortLine = words.length <= 5;
  const isCentered = isOpeningSpread || isShortLine;

  return (
    <div
      ref={lineRef}
      className={`w-full flex items-center flex-nowrap whitespace-nowrap ${
        isCentered
          ? 'justify-center gap-2 sm:gap-2.5 md:gap-3.5 lg:gap-4 text-[18px] sm:text-[21px] md:text-[24px] lg:text-[26px]'
          : 'justify-between gap-1 sm:gap-1.5 text-[16px] sm:text-[19px] md:text-[22px] lg:text-[24px]'
      }`}
    >
      {words.map((word) => {
        if (word.isAyahMarker) {
          return (
            <AyahMarker
              key={word.id}
              ayahNumber={word.ayahNumber}
              size="sm"
              onClick={() => {
                setCurrentAyah({
                  surahNumber: word.surahNumber,
                  surahNameArabic: '',
                  ayahNumber: word.ayahNumber,
                  globalAyahNumber: 0,
                  pageNumber: currentPage || 1,
                  juzNumber: 0,
                  textUthmani: '',
                });
                useRecitationStore.getState().resetRecitation();
              }}
              className="cursor-pointer hover:scale-125 transition-transform flex-shrink-0 mx-1 sm:mx-1.5"
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

        if (isRecallModeActive && !isAyahRevealed && ghostTier > 0) {
          // Pure Concealment Mode (No Hints): Words stay hidden until recited with voice
          isVisible = wordRevealed;
          isGhost = !wordRevealed;
        } else {
          // Visible Mode
          isVisible = true;
          isGhost = false;
        }

        // Check if this word has an evaluated alignment status (Visual Review)
        const wordKeyFull = `${word.surahNumber}:${word.ayahNumber}:${word.wordIndex}`;
        const wordKeyAyah = `${word.ayahNumber}:${word.wordIndex}`;
        const evalStatus =
          wordStatusMap[wordKeyFull] ||
          wordStatusMap[wordKeyAyah] ||
          (word.ayahNumber ? undefined : wordStatusMap[`word:${word.wordIndex}`]);

        // Highlight classes based on evaluated status (Tarteel Style)
        let statusStyles = '';
        let statusBadge = '';

        if (evalStatus === 'correct') {
          // Words recited correctly appear as authentic, dignified Quran text (no green background or border)
          statusStyles = '';
          statusBadge = '';
          isVisible = true; // Always show during review
          isGhost = false;
        } else if (evalStatus === 'omission') {
          // Clear Red for Omissions (Tarteel style: missed words flagged in red)
          statusStyles =
            'bg-red-500/20 text-red-800 dark:text-red-300 border-b-2 border-red-500 underline decoration-red-600 decoration-2 font-bold px-1.5 py-0.5 rounded shadow-sm';
          statusBadge = 'كلمة منسية (لم تُقرأ) ✗';
          isVisible = true;
          isGhost = false;
        } else if (
          evalStatus === 'substitution' ||
          evalStatus === 'repetition'
        ) {
          // Warm Amber for Substitutions / Stumbles / Repetitions
          statusStyles =
            'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-b-2 border-amber-500 font-bold px-1.5 py-0.5 rounded shadow-sm';
          statusBadge = 'تنبيه: راجع نطق الكلمة وحركاتها ⚠️';
          isVisible = true;
          isGhost = false;
        } else if (evalStatus === 'uncertain') {
          // Neutral Slate for Acoustic Uncertainty — Never falsely accuse user of error
          statusStyles =
            'bg-slate-500/15 text-slate-800 dark:text-slate-200 border-b-2 border-dashed border-slate-400 font-medium px-1.5 py-0.5 rounded shadow-sm';
          statusBadge = 'غير مؤكد صوتياً (أعد التسميع بوضوح) ❓';
          isVisible = true;
          isGhost = false;
        }

        const isTooltipOpen = activeTooltipWordId === word.id;

        return (
          <span
            key={word.id}
            data-testid={`word-${word.id}`}
            data-ayah-number={word.ayahNumber}
            data-word-index={word.wordIndex}
            data-eval-status={evalStatus || undefined}
            data-ghost-state={isGhost ? 'concealed' : 'visible'}
            onClick={(e) => {
              if (evalStatus || isVisible) {
                const nextOpen = isTooltipOpen ? null : word.id;
                setActiveTooltipWordId(nextOpen);
                if (nextOpen) {
                  handlePlayWordAudio(word, e);
                } else {
                  stopWordAudio();
                  setPlayingWordId(null);
                }
              }
            }}
            className={`relative font-uthmani transition-[background-color,color,filter,box-shadow,transform,opacity] duration-200 select-none whitespace-nowrap leading-relaxed py-0.5 inline-flex items-center ${
              (evalStatus || isVisible) ? 'cursor-pointer' : ''
            } ${
              statusStyles
                ? statusStyles
                : isVisible
                ? wordRevealed
                  ? 'text-mushaf-ink dark:text-darkMushaf-ink bg-mushaf-gold/15 ring-1 ring-mushaf-gold/40 rounded px-1'
                  : 'text-mushaf-ink dark:text-darkMushaf-ink'
                : 'text-transparent bg-mushaf-ink/10 dark:bg-darkMushaf-ink/10 blur-[5px] rounded px-1 cursor-default select-none'
            }`}
            title={
              statusBadge
                ? `${word.text} — ${statusBadge}`
                : undefined
            }
          >
            {/* Tarteel In-Situ Floating Popover with Voice Pronunciation */}
            {isTooltipOpen && (evalStatus || isVisible) && (
              <span
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-arabic font-bold shadow-2xl animate-fade-in pointer-events-auto bg-mushaf-surface dark:bg-darkMushaf-card border-2 border-mushaf-gold/50 text-mushaf-ink dark:text-darkMushaf-ink flex items-center gap-2"
              >
                {/* Voice Pronunciation Audio Button */}
                <button
                  type="button"
                  data-testid={`play-word-audio-${word.id}`}
                  onClick={(e) => handlePlayWordAudio(word, e)}
                  className={`p-1.5 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                    playingWordId === word.id
                      ? 'bg-mushaf-emerald text-white animate-pulse ring-2 ring-mushaf-emerald/50'
                      : 'bg-mushaf-emerald/15 hover:bg-mushaf-emerald/25 text-mushaf-emerald dark:text-emerald-400'
                  }`}
                  title="استمع لنطق الكلمة"
                  aria-label="استمع لنطق الكلمة"
                >
                  {playingWordId === word.id ? (
                    <VolumeX className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <span className="font-uthmani text-sm">{word.text}</span>
                {statusBadge && (
                  <>
                    <span className="text-[11px] font-normal text-mushaf-ink-muted">•</span>
                    <span
                      className={
                        evalStatus === 'correct'
                          ? 'text-emerald-600'
                          : evalStatus === 'omission'
                          ? 'text-red-600 font-bold'
                          : evalStatus === 'uncertain'
                          ? 'text-slate-600 dark:text-slate-300'
                          : 'text-amber-600'
                      }
                    >
                      {statusBadge}
                    </span>
                  </>
                )}
              </span>
            )}

            <span>{word.text}</span>
            {word.waqfMark && (
              <span className="text-[0.5em] text-mushaf-gold dark:text-darkMushaf-gold align-super mx-0.5 select-none font-uthmani font-normal">
                {word.waqfMark}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};
