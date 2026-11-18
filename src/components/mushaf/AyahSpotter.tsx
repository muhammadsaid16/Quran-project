'use client';

/**
 * Ayah Spotter — "I am on this page; which ayah did I just recite?"
 *
 * Records one utterance, compares it against every ayah of the visible page
 * (see `PageSpotter`), and jumps the session to the best match: the Mushaf
 * scrolls to that ayah, its words are revealed, and the HUD's target becomes
 * that ayah so recitation continues from exactly there.
 *
 * The microphone and the phoneme database are shared with the HUD through the
 * `shared-engine` modules, so opening the spotter never loads the 70 MB ASR
 * model a second time.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic,
  Square,
  X,
  Loader2,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { getSharedRecognitionEngine, VoiceRecognitionEngine } from '@/audio';
import { getReadyAlignmentEngine, phonemesToText, PhonemeVocabulary } from '@/alignment';
import {
  PageSpotter,
  SpotterMatch,
  SpotterOutcome,
  collectPageCandidates,
} from '@/recitation/page-spotter';
import { useSessionStore } from '@/stores/session-store';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { useRecitationStore } from '@/stores/recitation-store';
import { ayahStateKey, getRenderedAyahWordsByPage } from '@/data/mushaf-layout';
import { MEDINA_PAGES } from '@/data/medina-pages';
import { SURAHS } from '@/data/surahs';
import { toArabicNumerals } from './AyahMarker';

/** Stop automatically after this much silence that follows speech. */
const SILENCE_STOP_MS = 1500;
/** Never record longer than this, even if the reciter keeps talking. */
const MAX_RECORD_MS = 15000;
/** Give up when nothing was heard at all within this window. */
const NO_SPEECH_MS = 8000;
/** Rising-edge threshold on the RMS level (0..100). */
const VOICE_LEVEL = 10;

type Phase = 'idle' | 'starting' | 'listening' | 'analyzing' | 'result' | 'empty' | 'error';

interface AyahSpotterProps {
  open: boolean;
  onClose: () => void;
  pageNumber: number;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'ثقة عالية',
  medium: 'ثقة متوسطة',
  low: 'غير مؤكدة',
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/30',
  low: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
};

export const AyahSpotter: React.FC<AyahSpotterProps> = ({ open, onClose, pageNumber }) => {
  const { setCurrentAyah, revealWordHint, setRevealFromKey } = useActiveRecallStore();
  const resetRecitation = useRecitationStore((s) => s.resetRecitation);

  const [phase, setPhase] = useState<Phase>('idle');
  const [outcome, setOutcome] = useState<SpotterOutcome | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [ready, setReady] = useState(false);

  const spotterRef = useRef<PageSpotter | null>(null);
  const engineRef = useRef<VoiceRecognitionEngine | null>(null);
  const openRef = useRef(open);
  const tokensRef = useRef<{ token: string; index: number; confidence?: number; timestampMs: number }[]>([]);
  const startedAtRef = useRef(0);
  const lastVoiceAtRef = useRef(0);
  const sawSpeechRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const pageRef = useRef(pageNumber);
  const mountedRef = useRef(true);
  const stopInFlightRef = useRef(false);

  pageRef.current = pageNumber;
  openRef.current = open;

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    if (mountedRef.current) setPhase(next);
  }, []);

  // The phoneme database is big; load it once, in the background, so the first
  // tap on "start" does not wait for it.
  useEffect(() => {
    mountedRef.current = true;
    getReadyAlignmentEngine()
      .then((engine) => {
        if (!mountedRef.current) return;
        spotterRef.current = new PageSpotter(engine);
        setReady(true);
      })
      .catch(() => {
        if (mountedRef.current) setReady(false);
      });

    return () => {
      mountedRef.current = false;
      const engine = engineRef.current;
      if (engine && engine.getStatus() === 'recording') {
        engine.stopRecording().catch(() => {});
      }
      // Leaving the Mushaf view must not leave a phantom open panel behind.
      useRecitationStore.getState().setSpotterOpen(false);
    };
  }, []);

  const candidates = useMemo(() => collectPageCandidates(pageNumber), [pageNumber]);

  const stop = useCallback(async () => {
    if (stopInFlightRef.current || phaseRef.current !== 'listening') return;
    stopInFlightRef.current = true;
    setPhaseSafe('analyzing');

    try {
      const engine = getSharedRecognitionEngine();
      if (engine.getStatus() === 'recording') {
        const finalResult = await engine.stopRecording();

        // Some decoders only flush their tokens on stop. Fall back to the
        // final transcript so a fast talker is never reported as silence.
        if (tokensRef.current.length === 0 && finalResult?.text) {
          tokensRef.current = PhonemeVocabulary.tokenize(finalResult.text).map(
            (token, index) => ({
              token,
              index,
              confidence: 0.6,
              timestampMs: index * 60,
            })
          );
        }
      }

      const tokens = tokensRef.current;
      const spotter = spotterRef.current;
      const pageCandidates = collectPageCandidates(pageRef.current);

      if (!spotter) {
        throw new Error('تعذّر تحميل قاعدة بيانات التسميع');
      }

      const result = spotter.identify(tokens, pageCandidates);
      if (!mountedRef.current) return;

      setOutcome(result);
      setPhaseSafe(result.reason === 'match' || result.reason === 'ambiguous' ? 'result' : 'empty');
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'تعذّر تحليل التسميع');
      setPhaseSafe('error');
    } finally {
      stopInFlightRef.current = false;
    }
  }, [setPhaseSafe]);

  // Auto-stop on silence, and hard-stop at the maximum duration.
  useEffect(() => {
    if (phase !== 'listening') return;
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - startedAtRef.current >= MAX_RECORD_MS) {
        void stop();
      } else if (
        sawSpeechRef.current &&
        now - startedAtRef.current >= 1500 &&
        now - lastVoiceAtRef.current >= SILENCE_STOP_MS
      ) {
        void stop();
      } else if (!sawSpeechRef.current && now - startedAtRef.current >= NO_SPEECH_MS) {
        void stop();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, stop]);

  const start = useCallback(async () => {
    setError(null);
    setOutcome(null);
    setLiveTranscript('');
    setLevel(0);
    tokensRef.current = [];
    sawSpeechRef.current = false;
    lastVoiceAtRef.current = Date.now();
    startedAtRef.current = Date.now();
    setPhaseSafe('starting');

    let stream: MediaStream | null = null;
    try {
      if (!spotterRef.current) {
        const engine = await getReadyAlignmentEngine();
        spotterRef.current = new PageSpotter(engine);
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('المتصفح الحالي لا يدعم تسجيل الصوت عبر الميكروفون');
      }

      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!openRef.current || !mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const engine = getSharedRecognitionEngine();
      engineRef.current = engine;
      engine.setCallbacks({
        onToken: (ev) => {
          tokensRef.current.push(ev);
          if (mountedRef.current) {
            setLiveTranscript(phonemesToText(tokensRef.current.map((t) => t.token)));
          }
        },
        onPartial: (partial) => {
          if (partial.text && mountedRef.current) {
            setLiveTranscript(phonemesToText(partial.text));
          }
        },
        onAudioLevel: (lvl) => {
          if (mountedRef.current) setLevel(lvl.rmsLevel);
          if (lvl.rmsLevel >= VOICE_LEVEL) {
            lastVoiceAtRef.current = Date.now();
            sawSpeechRef.current = true;
          }
        },
        onError: (err) => {
          const current = engineRef.current;
          if (current && current.getStatus() === 'recording') {
            current.stopRecording().catch(() => {});
          }
          if (!mountedRef.current) return;
          setError(err.message);
          setPhaseSafe('error');
        },
      });

      await engine.startRecording(stream);
      startedAtRef.current = Date.now();
      lastVoiceAtRef.current = Date.now();
      if (!mountedRef.current) return;
      setPhaseSafe('listening');
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      if (!mountedRef.current) return;
      const errObj = err as { name?: string; message?: string };
      let message = 'تعذّر الوصول إلى الميكروفون';
      if (errObj?.name === 'NotAllowedError' || errObj?.name === 'PermissionDeniedError') {
        message = 'تم رفض إذن الميكروفون. اسمح به من إعدادات المتصفح ثم أعد المحاولة.';
      } else if (errObj?.name === 'NotFoundError') {
        message = 'لم يتم العثور على ميكروفون متصل بجهازك.';
      } else if (errObj?.message) {
        message = errObj.message;
      }
      setError(message);
      setPhaseSafe('error');
    }
  }, [setPhaseSafe]);

  // Opening the panel always starts from a clean slate.
  useEffect(() => {
    if (!open) return;
    setOutcome(null);
    setError(null);
    setLiveTranscript('');
    setPhaseSafe('idle');
  }, [open, setPhaseSafe]);

  // Escape closes the panel and releases the microphone.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const engine = engineRef.current;
        if (engine && engine.getStatus() === 'recording') {
          engine.stopRecording().catch(() => {});
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const applyTarget = useCallback(
    (match: SpotterMatch, startRecitation: boolean) => {
      const { surahNumber, ayahNumber, pageNumber: targetPage } = match.target;
      const session = useSessionStore.getState();
      session.setCurrentPage(targetPage);
      session.setCurrentSurah(surahNumber);

      const pageData = MEDINA_PAGES[targetPage];
      const surah = SURAHS.find((s) => s.number === surahNumber);

      setCurrentAyah({
        surahNumber,
        surahNameArabic: surah?.nameArabic ?? '',
        ayahNumber,
        globalAyahNumber: 0,
        pageNumber: targetPage,
        juzNumber: pageData?.juzNumber ?? 0,
        textUthmani: match.text,
      });

      // Reveal the whole ayah: the reader asked "where is this ayah?", so the
      // text must be visible from its first word — even in concealment mode.
      const ayahKey = ayahStateKey(surahNumber, ayahNumber);
      // Everything from the located ayah onwards stays visible: the reader
      // continues from here, so the following ayahs must be readable.
      setRevealFromKey(ayahKey);
      for (const word of getRenderedAyahWordsByPage(targetPage, surahNumber, ayahNumber)) {
        revealWordHint(ayahKey, word.wordIndex);
      }

      resetRecitation();
      if (startRecitation) {
        useRecitationStore.getState().setPendingAutoStart(true);
      }
      onClose();

      // Let the page re-render for the new ayah, then bring it into view.
      window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>(
          `[data-testid="medina-page"][data-page-number="${targetPage}"] ` +
            `[data-surah-number="${surahNumber}"][data-ayah-number="${ayahNumber}"]`
        );
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const previous = el.style.backgroundColor;
        el.style.backgroundColor = 'rgba(201, 162, 77, 0.22)';
        window.setTimeout(() => {
          el.style.backgroundColor = previous;
        }, 2600);
      }, 80);
    },
    [onClose, resetRecitation, revealWordHint, setCurrentAyah, setRevealFromKey]
  );

  const close = useCallback(() => {
    const engine = engineRef.current;
    if (engine && engine.getStatus() === 'recording') {
      engine.stopRecording().catch(() => {});
    }
    onClose();
  }, [onClose]);

  if (!open) return null;

  const surahNameOf = (match: SpotterMatch) => {
    const surah = SURAHS.find((s) => s.number === match.target.surahNumber);
    return surah?.nameArabic ?? `سورة ${match.target.surahNumber}`;
  };

  const bars = Array.from({ length: 14 }, (_, i) => {
    const wave = Math.sin((i + 1) * 1.7 + level / 12);
    const height = 18 + Math.min(52, level * 0.7) * Math.abs(wave);
    return Math.max(12, Math.round(height));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={close} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="تحديد الآية بالتسميع"
        data-testid="ayah-spotter-panel"
        className="relative w-full max-w-lg mushaf-material bg-mushaf-surface/95 dark:bg-darkMushaf-card/95 backdrop-blur-2xl border border-mushaf-gold/50 dark:border-darkMushaf-gold/40 rounded-2xl shadow-[0_24px_70px_-12px_rgba(0,0,0,0.35)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-mushaf-gold/15 border border-mushaf-gold/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-mushaf-gold dark:text-darkMushaf-gold" />
            </span>
            <div>
              <h2 className="text-sm font-bold font-arabic text-mushaf-ink dark:text-darkMushaf-ink">
                أين أنا في الصفحة؟
              </h2>
              <p className="text-[11px] font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                صفحة {toArabicNumerals(pageNumber)} • {candidates.length} آية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="إغلاق"
            className="p-1.5 rounded-full text-mushaf-ink-muted hover:text-mushaf-ink hover:bg-mushaf-gold/15 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 sm:px-5 pb-5 pt-4 space-y-4">
          {/* Idle: explanation + start */}
          {phase === 'idle' && (
            <>
              <p className="text-xs leading-relaxed font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                اتلُ أي آية من هذه الصفحة. سأقارن تسميعك بكل آيات الصفحة وأحدد الآية،
                ثم نبدأ التسميع من عندها.
              </p>
              {!ready && (
                <p className="flex items-center gap-1.5 text-[11px] font-arabic text-amber-700 dark:text-amber-300">
                  <Loader2 className="w-3 h-3 animate-spin" /> جارٍ تجهيز قاعدة التسميع…
                </p>
              )}
              <button
                type="button"
                data-testid="ayah-spotter-start"
                onClick={() => void start()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-mushaf-emerald text-white text-sm font-bold font-arabic shadow-sm hover:brightness-105 active:scale-[0.99] transition"
              >
                <Mic className="w-4 h-4" /> ابدأ التسميع
              </button>
            </>
          )}

          {/* Starting / listening */}
          {(phase === 'starting' || phase === 'listening') && (
            <>
              <div className="flex items-center justify-center gap-1 h-14">
                {bars.map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-mushaf-emerald/70 dark:bg-darkMushaf-emerald/70 transition-[height] duration-100"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <p
                data-testid="ayah-spotter-transcript"
                className="min-h-[2.5rem] text-center text-sm font-uthmani text-mushaf-ink dark:text-darkMushaf-ink leading-relaxed"
              >
                {liveTranscript || (phase === 'starting' ? 'جارٍ فتح الميكروفون…' : 'أتسمّع…')}
              </p>
              <p className="text-center text-[11px] font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                سأتوقف تلقائياً عند السكوت
              </p>
              <button
                type="button"
                data-testid="ayah-spotter-stop"
                onClick={() => void stop()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mushaf-ink/90 dark:bg-darkMushaf-surface text-white text-sm font-bold font-arabic hover:opacity-90 transition"
              >
                <Square className="w-3.5 h-3.5" /> أوقف وحدّد الآية
              </button>
            </>
          )}

          {phase === 'analyzing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <Loader2 className="w-7 h-7 animate-spin text-mushaf-emerald dark:text-darkMushaf-emerald" />
              <p className="text-sm font-arabic text-mushaf-ink dark:text-darkMushaf-ink">
                أقارن تسميعك بآيات الصفحة…
              </p>
            </div>
          )}

          {/* Result */}
          {phase === 'result' && outcome?.best && (
            <>
              <div className="flex items-center justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold font-arabic ${
                    CONFIDENCE_STYLE[outcome.confidence] ?? CONFIDENCE_STYLE.low
                  }`}
                >
                  {outcome.confidence === 'high' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <HelpCircle className="w-3.5 h-3.5" />
                  )}
                  {CONFIDENCE_LABEL[outcome.confidence] ?? CONFIDENCE_LABEL.low}
                </span>
              </div>

              <div className="rounded-xl border border-mushaf-gold/40 bg-mushaf-parchment/60 dark:bg-darkMushaf-surface/60 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold font-arabic text-mushaf-ink dark:text-darkMushaf-ink">
                    {surahNameOf(outcome.best)} • الآية {toArabicNumerals(outcome.best.target.ayahNumber)}
                  </span>
                  <span className="text-[10px] font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                    صفحة {toArabicNumerals(outcome.best.target.pageNumber)}
                  </span>
                </div>
                <p className="font-uthmani text-lg leading-loose text-mushaf-ink dark:text-darkMushaf-ink line-clamp-3">
                  {outcome.best.text}
                </p>
              </div>

              {outcome.ambiguous && outcome.alternatives.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                    قد تكون إحدى هذه الآيات أيضاً:
                  </p>
                  {[outcome.best, ...outcome.alternatives].map((match, index) => (
                    <button
                      key={match.verseKey}
                      type="button"
                      onClick={() => applyTarget(match, true)}
                      className={`w-full text-right px-3 py-2 rounded-lg border text-xs font-arabic transition-colors ${
                        index === 0
                          ? 'border-mushaf-emerald/40 bg-mushaf-emerald/10 text-mushaf-ink dark:text-darkMushaf-ink'
                          : 'border-mushaf-border dark:border-darkMushaf-border hover:bg-mushaf-gold/10 text-mushaf-ink-muted'
                      }`}
                    >
                      <span className="font-bold">
                        {surahNameOf(match)} • {toArabicNumerals(match.target.ayahNumber)}
                      </span>
                      <span className="block truncate font-uthmani text-[13px] opacity-80">
                        {match.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="ayah-spotter-continue"
                  onClick={() => applyTarget(outcome.best as SpotterMatch, true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mushaf-emerald text-white text-sm font-bold font-arabic shadow-sm hover:brightness-105 transition"
                >
                  <Mic className="w-4 h-4" /> ابدأ التسميع من هنا
                </button>
                <button
                  type="button"
                  onClick={() => applyTarget(outcome.best as SpotterMatch, false)}
                  className="px-3 py-2.5 rounded-xl border border-mushaf-border dark:border-darkMushaf-border text-xs font-bold font-arabic text-mushaf-ink dark:text-darkMushaf-ink hover:bg-mushaf-gold/10 transition"
                >
                  انتقل فقط
                </button>
                <button
                  type="button"
                  onClick={() => void start()}
                  aria-label="أعد المحاولة"
                  className="p-2.5 rounded-xl border border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink-muted hover:bg-mushaf-gold/10 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* No match */}
          {phase === 'empty' && (
            <>
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
                <p className="text-sm font-bold font-arabic text-mushaf-ink dark:text-darkMushaf-ink">
                  لم أتعرّف على الآية
                </p>
                <p className="text-[11px] font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                  تأكد أنك تتلو من هذه الصفحة، وتكلّم بوضوح قريباً من الميكروفون.
                </p>
                {outcome && outcome.alternatives.length > 0 && (
                  <div className="w-full space-y-1.5 pt-1">
                    <p className="text-[11px] font-arabic text-mushaf-ink-muted">
                      أقرب الاحتمالات:
                    </p>
                    {outcome.alternatives.map((match) => (
                      <button
                        key={match.verseKey}
                        type="button"
                        onClick={() => applyTarget(match, true)}
                        className="w-full text-right px-3 py-2 rounded-lg border border-mushaf-border dark:border-darkMushaf-border hover:bg-mushaf-gold/10 text-xs font-arabic text-mushaf-ink-muted"
                      >
                        <span className="font-bold">
                          {surahNameOf(match)} • {toArabicNumerals(match.target.ayahNumber)}
                        </span>
                        <span className="block truncate font-uthmani text-[13px]">{match.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void start()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mushaf-emerald text-white text-sm font-bold font-arabic transition hover:brightness-105"
              >
                <Mic className="w-4 h-4" /> أعد المحاولة
              </button>
            </>
          )}

          {phase === 'error' && (
            <>
              <p className="text-center text-xs font-arabic text-red-700 dark:text-red-300">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void start()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mushaf-emerald text-white text-sm font-bold font-arabic transition hover:brightness-105"
              >
                <Mic className="w-4 h-4" /> أعد المحاولة
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};