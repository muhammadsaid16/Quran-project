/**
 * Word-by-Word Quran Pronunciation Audio Service
 *
 * Provides high-fidelity authentic Tajweed recitation audio for individual Quranic words
 * using the global Quran.com WBW CDN (Mahmoud Khalil Al-Husary), with graceful fallback
 * to browser Web Speech API (SpeechSynthesis) when offline.
 */

let activeAudio: HTMLAudioElement | null = null;

export interface WordAudioCallbacks {
  onPlay?: () => void;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Derives the official 3-digit padded CDN URL for a specific word in the Quran.
 * e.g., Surah 1, Ayah 7, Word 0 (1st word) -> https://audio.qurancdn.com/wbw/001_007_001.mp3
 */
export function getWordAudioUrl(surah: number, ayah: number, wordIndex: number): string {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  const w = String(wordIndex + 1).padStart(3, '0');
  return `https://audio.qurancdn.com/wbw/${s}_${a}_${w}.mp3`;
}

/**
 * Stops any currently playing word audio or speech synthesis.
 */
export function stopWordAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio.src = '';
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore synthesis cancel errors
    }
  }
}

/**
 * Plays the pronunciation audio for a specific Quran word.
 * Falls back to Arabic SpeechSynthesis if network/audio is unavailable.
 */
export function playWordAudio(
  surah: number,
  ayah: number,
  wordIndex: number,
  wordText: string,
  callbacks?: WordAudioCallbacks
): Promise<() => void> {
  return new Promise((resolve) => {
    stopWordAudio();

    const audioUrl = getWordAudioUrl(surah, ayah, wordIndex);

    const cleanup = () => {
      stopWordAudio();
    };

    if (typeof window === 'undefined') {
      callbacks?.onError?.(new Error('Audio playback not supported in SSR'));
      resolve(cleanup);
      return;
    }

    try {
      const audio = new Audio(audioUrl);
      activeAudio = audio;

      audio.onplay = () => {
        callbacks?.onPlay?.();
      };

      audio.onended = () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
        callbacks?.onEnded?.();
      };

      audio.onerror = () => {
        // Fallback to Web Speech API
        playSpeechSynthesisFallback(wordText, callbacks);
      };

      audio.play().catch(() => {
        // Autoplay blocked or network error -> fallback to speech synthesis
        playSpeechSynthesisFallback(wordText, callbacks);
      });

      resolve(cleanup);
    } catch {
      playSpeechSynthesisFallback(wordText, callbacks);
      resolve(cleanup);
    }
  });
}

function playSpeechSynthesisFallback(wordText: string, callbacks?: WordAudioCallbacks): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onError?.(new Error('Audio playback and SpeechSynthesis unavailable'));
    callbacks?.onEnded?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    // Clean Arabic letters and basic diacritics for TTS engine
    const clean = wordText.replace(/[^\u0621-\u064A\u064B-\u0652\u0670\u0671]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean || wordText);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.85;

    utterance.onstart = () => {
      callbacks?.onPlay?.();
    };

    utterance.onend = () => {
      callbacks?.onEnded?.();
    };

    utterance.onerror = (e) => {
      callbacks?.onError?.(e);
      callbacks?.onEnded?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    callbacks?.onError?.(err);
    callbacks?.onEnded?.();
  }
}
