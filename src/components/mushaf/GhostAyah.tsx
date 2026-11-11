'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QuranWord } from '@/data/medina-pages';
import { AyahMarker } from './AyahMarker';
import { ayahStateKey } from '@/data/mushaf-layout';
import { CRITICAL, runSpring, SpringHandle } from '@/lib/spring';
import { useReducedMotion } from '@/hooks/useMediaQuery';
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
  /**
   * The concealment state of every word on the PREVIOUS render.
   *
   * It is captured after the render (never during it), so React's double
   * render cannot consume the concealed -> visible transition before the
   * materialize animation gets a chance to play.
   */
  const previousGhostState = useRef<Map<string, boolean>>(new Map());
  /** The element of each word, so a reveal can animate it. */
  const wordElements = useRef<Map<string, HTMLSpanElement>>(new Map());
  /** The materialize spring of each word, so it can be interrupted. */
  const materializeSprings = useRef<Map<string, SpringHandle>>(new Map());

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
  const reducedMotion = useReducedMotion();

  const lineRef = useRef<HTMLDivElement | null>(null);

  // Auto-fit: keep every Mushaf line strictly on ONE line (white-space: nowrap)
  // by scaling the font size down until the widest line fits the container width.
  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;

    const fit = () => {
      const base = isOpeningSpread ? getBaseFontSize() * 1.15 : getBaseFontSize();
      // Max scale-up factor: opening spread stays at base; standard pages can grow
      // up to 1.15× to fill the line width naturally (Mushaf-style full justification
      // achieved via font-size, not stretched inter-word gaps).
      const maxScale = isOpeningSpread ? 1.0 : 1.15;
      el.style.fontSize = `${base}px`;
      let scale = 1;
      for (let i = 0; i < 8; i++) {
        const avail = el.clientWidth;
        const need = el.scrollWidth;
        if (avail <= 0 || need <= 0) break;
        const ratio = avail / need;
        const next = Math.min(scale * ratio, maxScale);
        if (Math.abs(next - scale) < 0.005) break;
        scale = next;
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
  // ALL lines use justify-center with a natural gap — the auto-fit ResizeObserver
  // scales the font-size so the line fills the available width without stretching gaps.
  // Opening spreads and short lines get a slightly larger gap for visual breathing room.
  const isShortLine = words.length <= 5;
  const lineGap = isOpeningSpread
    ? 'gap-3 sm:gap-4 md:gap-5'
    : isShortLine
    ? 'gap-2.5 sm:gap-3 md:gap-4'
    : 'gap-1.5 sm:gap-2 md:gap-2.5';

  // The concealment state of this render, published to the previous-render
  // map after the render completes.
  const ghostStateThisRender = new Map<string, boolean>();

  useEffect(() => {
    previousGhostState.current = ghostStateThisRender;
  });

  /**
   * Materializes a word that has just been recited: it sharpens out of a blur
   * and settles into place.
   *
   * The motion is driven by the spring engine rather than a CSS animation, so
   * it can be interrupted, carries its velocity, and never leaves the word
   * stranded mid-fade if the browser's animation timeline is throttled.
   */
  const materialize = useCallback((wordId: string) => {
    const element = wordElements.current.get(wordId);
    if (!element) return;

    // A second reveal of the same word does not restart the animation.
    if (materializeSprings.current.has(wordId)) return;

    // Reduced motion is not the absence of feedback — the word simply
    // appears, without sharpening out of a blur.
    if (reducedMotion) return;

    const handle = runSpring({
      from: 0,
      to: 1,
      config: {
        stiffness: (2 * Math.PI / CRITICAL.response) ** 2,
        damping: 2 * CRITICAL.damping * Math.sqrt((2 * Math.PI / CRITICAL.response) ** 2),
        mass: 1,
      },
      onUpdate: (progress) => {
        element.style.opacity = String(progress);
        element.style.filter = progress >= 1 ? '' : `blur(${(7 * (1 - progress)).toFixed(2)}px)`;
        element.style.transform =
          progress >= 1 ? '' : `scale(${(0.94 + 0.06 * progress).toFixed(3)})`;
      },
      onRest: () => {
        element.style.opacity = '';
        element.style.filter = '';
        element.style.transform = '';
        materializeSprings.current.delete(wordId);
      },
    });

    materializeSprings.current.set(wordId, handle);
  }, [reducedMotion]);

  // Stop every animation when the line unmounts.
  useEffect(() => {
    const springs = materializeSprings.current;
    return () => {
      springs.forEach((spring) => spring.stop());
      springs.clear();
    };
  }, []);

  return (
    <div
      ref={lineRef}
      className={`mushaf-verse-text w-full flex items-center justify-center flex-nowrap whitespace-nowrap ${lineGap} ${!isOpeningSpread ? 'h-full' : ''}`}
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

        // Reveal state is keyed by a COMPOSITE ayah key (surah * 1000 + ayah):
        // ayah numbers repeat in every surah, so a bare ayah number would let
        // revealing 113:1 also reveal 112:1 and 114:1 on the same page.
        const ayahKey = ayahStateKey(word.surahNumber, word.ayahNumber);

        const isAyahRevealed =
          revealedAyahIds.includes(ayahKey) || isHintRevealed;
        const wordRevealed =
          revealedWordIndices[ayahKey]?.includes(word.wordIndex) ?? false;

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

        if (evalStatus === 'correct' || evalStatus === 'omission') {
          // Words recited correctly (or passed) appear as authentic, dignified Quran text
          statusStyles = '';
          statusBadge = '';
          isVisible = true; // Always show during review
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

        // The word arrived: it was concealed a moment ago and is visible now.
        // The materialize animation plays once, on that transition only.
        const wasGhost = previousGhostState.current.get(word.id) ?? false;
        const justRevealed = wasGhost && isVisible && !isGhost;
        ghostStateThisRender.set(word.id, isGhost);
        if (justRevealed) materialize(word.id);

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
            ref={(el) => {
              if (el) wordElements.current.set(word.id, el);
              else wordElements.current.delete(word.id);
            }}
            className={`relative font-uthmani select-none whitespace-nowrap leading-relaxed py-0.5 inline-flex items-center ${
              isGhost
                ? 'opacity-0 transition-opacity duration-300'
                : 'transition-[background-color,color] duration-300'
            } ${
              word.text.includes('\u06DE') ? 'quran-ornament' : ''
            } ${
              (evalStatus || isVisible) ? 'cursor-pointer' : 'pointer-events-none'
            } ${
              statusStyles
                ? statusStyles
                : isVisible
                ? 'text-mushaf-ink dark:text-darkMushaf-ink'
                : 'cursor-default select-none'
            }`}
            title={
              statusBadge
                ? `${word.text} — ${statusBadge}`
                : undefined
            }
          >
            {/* Tarteel In-Situ Floating Popover — only shown for visible/evaluated words */}
            {isTooltipOpen && isVisible && (evalStatus || isVisible) && (
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
              <span className="waqf-mark text-[0.55em] align-super mx-0.5 select-none font-uthmani font-normal">
                {word.waqfMark}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};
