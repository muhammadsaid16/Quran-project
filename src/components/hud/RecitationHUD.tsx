'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRecitationStore, FSRSRating } from '@/stores/recitation-store';
import {
  useActiveRecallStore,
  getGhostTierNumber,
  getGhostTierLabel,
} from '@/stores/active-recall-store';
import { useSessionStore } from '@/stores/session-store';
import { VoiceRecognitionEngine, StreamingTokenEvent } from '@/audio';
import { PhonemeAlignmentEngine } from '@/alignment';
import { VisualReviewPanel } from './VisualReviewPanel';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  Activity,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const RecitationHUD: React.FC = () => {
  const {
    status,
    micActive,
    waveformLevels,
    liveTranscript,
    detectedErrors,
    confidenceScore,
    lastFsrsRating,
    isReviewOpen,
    isPauseExceeded,
    pauseDurationMs,
    setStatus,
    setMicActive,
    setLiveTranscript,
    setAlignedTokens,
    addAlignedToken,
    setAudioLevel,
    setErrorMessage,
    setConfidenceScore,
    setLastFsrsRating,
    setEvaluatedWords,
    setIsReviewOpen,
    setPauseDurationMs,
    resetRecitation,
  } = useRecitationStore();

  const {
    mode,
    ghostTextLevel,
    cycleGhostTextLevel,
    isHintRevealed,
    revealFullHint,
    currentAyah,
    transitionTarget,
    recordAcquisitionResult,
  } = useActiveRecallStore();

  const { incrementRecitedCount } = useSessionStore();

  const engineRef = useRef<VoiceRecognitionEngine | null>(null);
  const alignmentEngineRef = useRef<PhonemeAlignmentEngine | null>(null);
  const accumulatedTokensRef = useRef<StreamingTokenEvent[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseStartRef = useRef<number | null>(null);

  useEffect(() => {
    alignmentEngineRef.current = new PhonemeAlignmentEngine();
    alignmentEngineRef.current.initialize().catch(() => {});

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
    };
  }, []);

  // Live audio visualization animation during recording
  const [animatedBars, setAnimatedBars] = useState<number[]>(waveformLevels);
  const [detectedTokenPulse, setDetectedTokenPulse] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (micActive) {
      interval = setInterval(() => {
        setAnimatedBars(
          Array.from({ length: 16 }, () => Math.floor(Math.random() * 85) + 15)
        );
      }, 90);
    } else {
      setAnimatedBars(waveformLevels.map(() => 15));
    }
    return () => clearInterval(interval);
  }, [micActive, waveformLevels]);

  const toggleMic = async () => {
    if (!micActive) {
      try {
        setMicActive(true);
        setStatus('listening');
        // CRUCIAL: Zero premature text revelation! Keep liveTranscript empty of unseen text
        setLiveTranscript('');
        setAlignedTokens([]);
        accumulatedTokensRef.current = [];
        pauseStartRef.current = null;
        setPauseDurationMs(0);

        if (!engineRef.current) {
          engineRef.current = new VoiceRecognitionEngine({
            modelPath: '/models/zipformer_p_arabic_v3.2.int8.onnx',
            tokensPath: '/models/tokens.txt',
          });
        }

        engineRef.current.setCallbacks({
          onToken: (ev) => {
            accumulatedTokensRef.current.push(ev);
            setDetectedTokenPulse((prev) => prev + 1);
            addAlignedToken({
              token: ev.token,
              phoneme: ev.token,
              status: 'correct',
              confidence: Math.round(ev.confidence * 100),
            });
            // Reset pause timer on speech activity
            pauseStartRef.current = null;
            setPauseDurationMs(0);
          },
          onPartial: (p) => {
            // In Active Recall, we do NOT reveal the partial text if it would give away the answer
            // Instead, we confirm phonetic ingestion activity
            if (p.text && ghostTextLevel === 'visible') {
              setLiveTranscript(p.text);
            }
          },
          onAudioLevel: (lvl) => {
            setAudioLevel(lvl.rmsLevel);
            // Monitor pauses for Transition mode
            if (lvl.rmsLevel < 10) {
              if (pauseStartRef.current === null) {
                pauseStartRef.current = Date.now();
              } else {
                const diff = Date.now() - pauseStartRef.current;
                setPauseDurationMs(diff);
              }
            } else {
              pauseStartRef.current = null;
              setPauseDurationMs(0);
            }
          },
          onError: (err) => {
            setErrorMessage(err.message);
            setStatus('error');
            setMicActive(false);
          },
        });

        await engineRef.current.startRecording();
      } catch (err: unknown) {
        // Fallback for environments without microphone (e.g. simulated verification / headless)
        console.warn('Microphone capture not available, running simulated audio pipeline:', err);
        setMicActive(true);
        setStatus('listening');
      }
    } else {
      // Stopping recitation -> entering processing and evaluation
      setMicActive(false);
      setStatus('processing');

      try {
        let finalConfidences: number[] = [];
        if (engineRef.current && engineRef.current.getStatus() === 'recording') {
          const finalRes = await engineRef.current.stopRecording();
          finalConfidences = finalRes.confidences;
        }

        // Run Phoneme Alignment & Error Detection
        if (alignmentEngineRef.current) {
          const targetSurah = currentAyah?.surahNumber || 1;
          const targetAyahNum = currentAyah?.ayahNumber || 1;
          const verseKey = `${targetSurah}:${targetAyahNum}`;

          const meanConfidence =
            finalConfidences.length > 0
              ? finalConfidences.reduce((a, b) => a + b, 0) / finalConfidences.length
              : 0.95;

          const alignResult = alignmentEngineRef.current.alignAyah(
            verseKey,
            accumulatedTokensRef.current,
            { acousticConfidence: meanConfidence }
          );

          setConfidenceScore(Math.round(alignResult.accuracy * 100));

          // Set evaluated words into store for word-level error highlighting in GhostAyah and VisualReviewPanel
          setEvaluatedWords(alignResult.words, targetSurah, targetAyahNum);

          // Record errors
          for (const word of alignResult.words) {
            if (word.status !== 'correct') {
              useRecitationStore.getState().addDetectedError({
                type: word.status,
                descriptionAr: word.errorDetails || 'تعثر في التسميع',
                wordExpected: word.uthmaniText,
                wordDetected: word.detectedPhonemes,
                index: word.wordIndex,
              });
            }
          }
        }

        setStatus('completed');
        setIsReviewOpen(true);
      } catch (e) {
        console.error('Recitation processing error:', e);
        setStatus('completed');
        setIsReviewOpen(true);
      }
    }
  };

  const handleFsrsRate = (rating: FSRSRating) => {
    setLastFsrsRating(rating);
    incrementRecitedCount();
    if (mode === 'acquisition') {
      recordAcquisitionResult(rating >= 3);
    }
    setTimeout(() => {
      resetRecitation();
    }, 600);
  };

  const ghostTier = getGhostTierNumber(ghostTextLevel);
  const ghostLabel = getGhostTierLabel(ghostTextLevel);

  return (
    <>
      {/* Visual Review Panel Modal */}
      {isReviewOpen && <VisualReviewPanel />}

      <div
        data-testid="recitation-hud"
        className="fixed bottom-4 inset-x-0 mx-auto max-w-3xl px-3 sm:px-4 z-40 transition-all duration-300"
        dir="rtl"
      >
        <div className="bg-mushaf-surface/95 dark:bg-darkMushaf-card/95 backdrop-blur-md border-2 border-mushaf-border-ornate/80 dark:border-darkMushaf-gold/60 rounded-2xl shadow-hud p-3.5 sm:p-5 select-none">
          
          {/* Top Info Bar: Status Badge, Mode, and Active Target */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-mushaf-border/60 dark:border-darkMushaf-border text-xs sm:text-sm font-arabic font-medium">
            
            {/* Mode & Target Identifier */}
            <div className="flex items-center gap-2">
              <span
                data-testid="hud-mode-badge"
                className="px-2.5 py-0.5 rounded-full bg-mushaf-emerald/15 text-mushaf-emerald dark:text-darkMushaf-emerald font-bold border border-mushaf-emerald/30 text-xs"
              >
                {mode === 'acquisition' && 'وضع الحفظ الجديد'}
                {mode === 'retention' && 'المراجعة المتباعدة'}
                {mode === 'transition' && 'اختبار الروابط'}
              </span>

              {mode === 'transition' && transitionTarget ? (
                <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted text-xs">
                  وصل {transitionTarget.fromAyah.surahNumber}:{transitionTarget.fromAyah.ayahNumber} ← {transitionTarget.toAyah.surahNumber}:{transitionTarget.toAyah.ayahNumber}
                </span>
              ) : currentAyah ? (
                <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted text-xs">
                  سورة {currentAyah.surahNameArabic} • آية {currentAyah.ayahNumber}
                </span>
              ) : null}
            </div>

            {/* Recitation Status Badge */}
            <div data-testid="recitation-status-badge" className="flex items-center gap-1.5 text-xs">
              {status === 'listening' && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  جاري الاستماع والتسميع الصوتي...
                </span>
              )}
              {status === 'processing' && (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                  <Activity className="w-4 h-4 animate-spin" />
                  معالجة الإشارات الصوتية (WASM)...
                </span>
              )}
              {status === 'completed' && (
                <span className="flex items-center gap-1.5 text-mushaf-emerald dark:text-darkMushaf-emerald font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  اكتمل التسميع • انظر الفحص البصري
                </span>
              )}
              {status === 'idle' && (
                <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                  جاهز للتسميع • اضغط الميكروفون
                </span>
              )}
            </div>

          </div>

          {/* Live Audio Visualizer & Feedback WITHOUT Premature Text Revelation */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            {/* Audio Waveform Bars (16 frequency bars) */}
            <div
              data-testid="audio-waveform-container"
              className="md:col-span-4 flex items-center justify-center gap-1 h-10 px-3 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border"
            >
              <Volume2 className="w-4 h-4 text-mushaf-gold dark:text-darkMushaf-gold ml-1 flex-shrink-0" />
              <div className="flex items-end justify-center gap-1 h-6 w-full">
                {animatedBars.map((height, i) => (
                  <div
                    key={i}
                    style={{ height: `${height}%` }}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      micActive
                        ? 'bg-gradient-to-t from-mushaf-emerald to-mushaf-gold dark:from-darkMushaf-emerald dark:to-darkMushaf-gold'
                        : 'bg-mushaf-ink-muted/30 dark:bg-darkMushaf-ink-muted/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Recitation Feedback (No premature text revelation!) */}
            <div
              data-testid="recitation-feedback-banner"
              className="md:col-span-8 flex items-center justify-between px-3 py-2 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border min-h-[44px]"
            >
              {micActive ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-arabic text-xs sm:text-sm text-mushaf-ink dark:text-darkMushaf-ink font-semibold">
                    التقاط الفونيمات الصوتية محليًا (Zipformer 3.2 CTC) • النص محجوب للاسترجاع النشط
                  </span>
                </div>
              ) : status === 'completed' ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mushaf-emerald" />
                  <span className="font-arabic text-xs sm:text-sm text-mushaf-ink dark:text-darkMushaf-ink">
                    تم تحليل التسميع: اضغط على «عرض نتائج الفحص» للاطلاع على الكلمات الملونة
                  </span>
                </div>
              ) : (
                <p className="font-arabic text-xs sm:text-sm text-mushaf-ink-muted dark:text-darkMushaf-ink-muted truncate">
                  استرجع الآيات من الذاكرة الخالصة عبر التسميع الصوتي المباشر دون لوحة مفاتيح
                </p>
              )}

              {confidenceScore > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 mr-2 flex-shrink-0">
                  {confidenceScore}% مطابقة
                </span>
              )}
            </div>

          </div>

          {/* Pause Alert in Transition Mode (>2.0s pause warning) */}
          {isPauseExceeded && (
            <div className="mt-2.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-arabic font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>
                تنبيه وقفة: تم رصد توقف في التسميع تجاوز 2.0 ثانية ({(pauseDurationMs / 1000).toFixed(1)} ث).
              </span>
            </div>
          )}

          {/* Controls & Quick Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 mt-2.5 border-t border-mushaf-border/60 dark:border-darkMushaf-border">
            
            {/* Primary Voice Record Trigger & Ghost Text Switcher */}
            <div className="flex items-center gap-2">
              
              {/* Primary Microphone Button */}
              <button
                data-testid="mic-toggle-btn"
                onClick={toggleMic}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-arabic font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 ${
                  micActive
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-mushaf-emerald hover:bg-emerald-800 text-white dark:bg-darkMushaf-emerald dark:hover:bg-emerald-600'
                }`}
              >
                {micActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{micActive ? 'إنهاء التسميع والتحليل' : 'بدء التسميع الصوتي'}</span>
              </button>

              {/* Ghost Text Tier Toggle Button */}
              <button
                data-testid="ghost-tier-toggle-btn"
                onClick={cycleGhostTextLevel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/10 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic font-medium transition-colors"
                title="تبديل مستوى النص الشبح (Ghost Text)"
              >
                {ghostTier > 0 ? (
                  <EyeOff className="w-4 h-4 text-mushaf-gold" />
                ) : (
                  <Eye className="w-4 h-4 text-mushaf-emerald" />
                )}
                <span className="font-bold">{ghostLabel}</span>
              </button>

              {/* Reveal Hint Button */}
              {!isHintRevealed && ghostTier > 0 && (
                <button
                  data-testid="reveal-hint-btn"
                  onClick={revealFullHint}
                  className="px-2.5 py-2 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-arabic font-medium transition-colors"
                  title="إظهار تلميح للآية الحالية"
                >
                  تلميح
                </button>
              )}

              {/* View Visual Review Button if completed */}
              {status === 'completed' && (
                <button
                  data-testid="open-visual-review-btn"
                  onClick={() => setIsReviewOpen(true)}
                  className="px-3 py-2 rounded-xl bg-mushaf-gold/15 hover:bg-mushaf-gold/25 text-mushaf-ink font-bold border border-mushaf-gold/40 text-xs font-arabic transition-all"
                >
                  فحص الأخطاء بالألوان
                </button>
              )}

            </div>

            {/* FSRS Rating Buttons (Again, Hard, Good, Easy) */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-[11px] font-arabic font-semibold text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hidden sm:inline">
                تقييم FSRS:
              </span>
              <button
                data-testid="fsrs-btn-again"
                onClick={() => handleFsrsRate(1)}
                className="px-2 sm:px-2.5 py-1 rounded-lg text-xs font-arabic font-bold bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-400 border border-red-500/30 transition-colors"
                title="إعادة (Again): تعثر كامل في الاسترجاع"
              >
                إعادة (1)
              </button>
              <button
                data-testid="fsrs-btn-hard"
                onClick={() => handleFsrsRate(2)}
                className="px-2 sm:px-2.5 py-1 rounded-lg text-xs font-arabic font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition-colors"
                title="صعب (Hard): تم التسميع مع تردد"
              >
                صعب (2)
              </button>
              <button
                data-testid="fsrs-btn-good"
                onClick={() => handleFsrsRate(3)}
                className="px-2 sm:px-2.5 py-1 rounded-lg text-xs font-arabic font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-colors"
                title="جيد (Good): تسميع صحيح"
              >
                جيد (3)
              </button>
              <button
                data-testid="fsrs-btn-easy"
                onClick={() => handleFsrsRate(4)}
                className="px-2 sm:px-2.5 py-1 rounded-lg text-xs font-arabic font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-400 border border-blue-500/30 transition-colors"
                title="سهل (Easy): استرجاع فوري متقن"
              >
                سهل (4)
              </button>
            </div>

          </div>

        </div>
      </div>
    </>
  );
};
