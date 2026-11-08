'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRecitationStore, FSRSRating } from '@/stores/recitation-store';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { useSessionStore } from '@/stores/session-store';
import { VoiceRecognitionEngine } from '@/audio';
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
  FastForward,
  Activity,
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
    setStatus,
    setMicActive,
    setLiveTranscript,
    setAlignedTokens,
    addAlignedToken,
    setAudioLevel,
    setErrorMessage,
    setLastFsrsRating,
    resetRecitation,
  } = useRecitationStore();

  const engineRef = useRef<VoiceRecognitionEngine | null>(null);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);

  const {
    mode,
    ghostTextLevel,
    setGhostTextLevel,
    isHintRevealed,
    revealFullHint,
    currentAyah,
  } = useActiveRecallStore();

  const { incrementRecitedCount } = useSessionStore();

  // Simulated live audio visualization when mic is active
  const [animatedBars, setAnimatedBars] = useState<number[]>(waveformLevels);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (micActive) {
      interval = setInterval(() => {
        setAnimatedBars(
          Array.from({ length: 16 }, () => Math.floor(Math.random() * 85) + 15)
        );
      }, 100);
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
        setLiveTranscript('');
        setAlignedTokens([]);

        if (!engineRef.current) {
          engineRef.current = new VoiceRecognitionEngine({
            modelPath: '/models/zipformer_p_arabic_v3.2.int8.onnx',
            tokensPath: '/models/tokens.txt',
          });
        }

        engineRef.current.setCallbacks({
          onToken: (ev) => {
            addAlignedToken({
              token: ev.token,
              phoneme: ev.token,
              status: 'correct',
              confidence: Math.round(ev.confidence * 100),
            });
          },
          onPartial: (p) => {
            if (p.text) setLiveTranscript(p.text);
          },
          onAudioLevel: (lvl) => {
            setAudioLevel(lvl.rmsLevel);
          },
          onError: (err) => {
            setErrorMessage(err.message);
            setStatus('error');
            setMicActive(false);
          },
        });

        await engineRef.current.startRecording();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setStatus('error');
        setMicActive(false);
      }
    } else {
      setMicActive(false);
      if (engineRef.current && engineRef.current.getStatus() === 'recording') {
        setStatus('processing');
        try {
          const finalRes = await engineRef.current.stopRecording();
          if (finalRes.text) setLiveTranscript(finalRes.text);
          setStatus('completed');
        } catch {
          setStatus('completed');
        }
      } else {
        setStatus('completed');
      }
    }
  };

  const handleFsrsRate = (rating: FSRSRating) => {
    setLastFsrsRating(rating);
    incrementRecitedCount();
    // Reset for next verse
    setTimeout(() => {
      resetRecitation();
    }, 800);
  };

  return (
    <div
      className="fixed bottom-4 inset-x-0 mx-auto max-w-3xl px-4 z-50 transition-all duration-300"
      dir="rtl"
    >
      <div className="bg-mushaf-surface/95 dark:bg-darkMushaf-card/95 backdrop-blur-md border-2 border-mushaf-border-ornate/80 dark:border-darkMushaf-gold/60 rounded-2xl shadow-hud p-4 sm:p-5 select-none">
        
        {/* Top Info Bar: Status Badge, Mode, and Active Ayah */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border text-xs sm:text-sm font-arabic font-medium">
          
          {/* Mode & Target */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-mushaf-emerald/15 text-mushaf-emerald dark:text-darkMushaf-emerald font-bold border border-mushaf-emerald/30">
              {mode === 'acquisition' && 'وضع الحفظ الجديد'}
              {mode === 'retention' && 'وضع المراجعة المتباعدة'}
              {mode === 'transition' && 'اختبار الروابط والانتقال'}
            </span>
            {currentAyah && (
              <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                سورة {currentAyah.surahNameArabic} • آية {currentAyah.ayahNumber}
              </span>
            )}
          </div>

          {/* Recitation Status Badge */}
          <div className="flex items-center gap-1.5">
            {status === 'listening' && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                جاري الاستماع والتسميع...
              </span>
            )}
            {status === 'processing' && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <Activity className="w-4 h-4 animate-spin" />
                معالجة الإشارات الصوتية (Kaldi FBank)...
              </span>
            )}
            {status === 'evaluating' && (
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                <Sparkles className="w-4 h-4" />
                مطابقة الفونيمات (Zipformer 3.2 CTC)...
              </span>
            )}
            {status === 'completed' && (
              <span className="flex items-center gap-1.5 text-mushaf-emerald dark:text-darkMushaf-emerald font-bold">
                <CheckCircle2 className="w-4 h-4" />
                اكتمل التسميع
              </span>
            )}
            {status === 'idle' && (
              <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                اضغط على الميكروفون لبدء التسميع
              </span>
            )}
          </div>

        </div>

        {/* Live Audio Visualizer & Real-time Transcript */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Audio Waveform Bars (16 bars) */}
          <div className="md:col-span-4 flex items-center justify-center gap-1 h-10 px-3 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
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

          {/* Transcript / Alignment Preview */}
          <div className="md:col-span-8 flex items-center justify-between px-3 py-2 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border min-h-[44px]">
            <p className="font-uthmani text-lg sm:text-xl text-mushaf-ink dark:text-darkMushaf-ink leading-tight truncate">
              {liveTranscript || 'التسميع الصوتي المباشر دون كتابة أو لوحة مفاتيح'}
            </p>
            {confidenceScore > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 mr-2 flex-shrink-0">
                {confidenceScore}% مطابقة
              </span>
            )}
          </div>

        </div>

        {/* Detected Errors Warning Banner (if any) */}
        {detectedErrors.length > 0 && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs sm:text-sm text-red-700 dark:text-red-300 font-arabic font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>
              تم رصد تعثر في التسميع: {detectedErrors[0].descriptionAr} (المتوقع: {detectedErrors[0].wordExpected})
            </span>
          </div>
        )}

        {/* Main Controls & FSRS Grading Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-mushaf-border/60 dark:border-darkMushaf-border">
          
          {/* Right Action: Voice Record Toggle & Mode Tools */}
          <div className="flex items-center gap-2">
            
            {/* Primary Microphone Trigger */}
            <button
              onClick={toggleMic}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-arabic font-bold text-sm shadow-md transition-all active:scale-95 ${
                micActive
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-mushaf-emerald hover:bg-emerald-800 text-white dark:bg-darkMushaf-emerald dark:hover:bg-emerald-600'
              }`}
            >
              {micActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{micActive ? 'إيقاف التسميع' : 'بدء التسميع الصوتي'}</span>
            </button>

            {/* Ghost Text Toggle Button */}
            <button
              onClick={() => {
                const nextLevel =
                  ghostTextLevel === 'hidden'
                    ? 'initial_prompt'
                    : ghostTextLevel === 'initial_prompt'
                    ? 'keywords'
                    : ghostTextLevel === 'keywords'
                    ? 'visible'
                    : 'hidden';
                setGhostTextLevel(nextLevel);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/10 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic font-medium transition-colors"
              title="تغيير مستوى النص الشبح (Ghost Text)"
            >
              {ghostTextLevel === 'hidden' ? (
                <EyeOff className="w-4 h-4 text-mushaf-gold" />
              ) : (
                <Eye className="w-4 h-4 text-mushaf-emerald" />
              )}
              <span>
                {ghostTextLevel === 'hidden' && 'إخفاء كامل'}
                {ghostTextLevel === 'initial_prompt' && 'بداية الآية'}
                {ghostTextLevel === 'keywords' && 'كلمات مفتاحية'}
                {ghostTextLevel === 'visible' && 'نص كامل'}
              </span>
            </button>

            {/* Reveal Full Hint Button */}
            {!isHintRevealed && ghostTextLevel !== 'visible' && (
              <button
                onClick={revealFullHint}
                className="px-3 py-2 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-arabic font-medium transition-colors"
              >
                إظهار تلميح
              </button>
            )}

          </div>

          {/* Left Action: FSRS Rating Buttons (Again, Hard, Good, Easy) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-arabic font-semibold text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hidden sm:inline">
              تقييم FSRS:
            </span>
            <button
              onClick={() => handleFsrsRate(1)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-arabic font-bold bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-400 border border-red-500/30 transition-colors"
              title="إعادة (Again): تعثر كامل في الاسترجاع"
            >
              إعادة (1)
            </button>
            <button
              onClick={() => handleFsrsRate(2)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-arabic font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition-colors"
              title="صعب (Hard): تم التسميع مع تردد أو مساعدة"
            >
              صعب (2)
            </button>
            <button
              onClick={() => handleFsrsRate(3)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-arabic font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-colors"
              title="جيد (Good): تسميع صحيح بالكامل"
            >
              جيد (3)
            </button>
            <button
              onClick={() => handleFsrsRate(4)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-arabic font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-400 border border-blue-500/30 transition-colors"
              title="سهل (Easy): استرجاع فوري متقن دون تردد"
            >
              سهل (4)
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
