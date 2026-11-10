import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWordAudioUrl, playWordAudio, stopWordAudio } from '@/audio/word-audio';

describe('Word-by-Word Quran Pronunciation Audio Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stopWordAudio();
    (global as any).window = {
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
      },
    };
  });

  afterEach(() => {
    stopWordAudio();
  });

  describe('getWordAudioUrl', () => {
    it('correctly pads surah, ayah, and 1-indexed word number into 3-digit CDN format', () => {
      // Surah 1 (Al-Fatiha), Ayah 1, Word 0 ("بِسْمِ" -> word #1)
      expect(getWordAudioUrl(1, 1, 0)).toBe('https://audio.qurancdn.com/wbw/001_001_001.mp3');

      // Surah 1, Ayah 1, Word 3 ("ٱلرَّحِيمِ" -> word #4)
      expect(getWordAudioUrl(1, 1, 3)).toBe('https://audio.qurancdn.com/wbw/001_001_004.mp3');

      // Surah 1, Ayah 7, Word 0 ("صِرَٰطَ" -> word #1)
      expect(getWordAudioUrl(1, 7, 0)).toBe('https://audio.qurancdn.com/wbw/001_007_001.mp3');

      // Surah 112 (Al-Ikhlas), Ayah 1, Word 0 ("قُلْ" -> word #1)
      expect(getWordAudioUrl(112, 1, 0)).toBe('https://audio.qurancdn.com/wbw/112_001_001.mp3');

      // Surah 2 (Al-Baqarah), Ayah 255, Word 49
      expect(getWordAudioUrl(2, 255, 49)).toBe('https://audio.qurancdn.com/wbw/002_255_050.mp3');
    });
  });

  describe('playWordAudio & stopWordAudio', () => {
    it('initiates playback via HTMLAudioElement and handles callbacks', async () => {
      const mockPlay = vi.fn().mockResolvedValue(undefined);
      const mockPause = vi.fn();

      // Mock global Audio
      const originalAudio = global.Audio;
      (global as any).Audio = class {
        src = '';
        currentTime = 0;
        play = mockPlay;
        pause = mockPause;
        onplay: (() => void) | null = null;
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
      };

      const onPlay = vi.fn();
      const onEnded = vi.fn();

      const cleanup = await playWordAudio(1, 1, 0, 'بِسْمِ', {
        onPlay,
        onEnded,
      });

      expect(mockPlay).toHaveBeenCalledTimes(1);

      cleanup();
      expect(mockPause).toHaveBeenCalled();

      global.Audio = originalAudio;
    });

    it('falls back to SpeechSynthesis if Audio.play rejects', async () => {
      const mockSpeak = vi.fn();
      const mockCancel = vi.fn();

      (global as any).window = {
        speechSynthesis: {
          speak: mockSpeak,
          cancel: mockCancel,
        },
      };
      (global as any).SpeechSynthesisUtterance = class {
        text: string;
        lang = '';
        rate = 1;
        constructor(text: string) {
          this.text = text;
        }
      };

      const originalAudio = global.Audio;
      (global as any).Audio = class {
        play = vi.fn().mockRejectedValue(new Error('Network error'));
        pause = vi.fn();
      };

      await playWordAudio(1, 7, 0, 'صِرَٰطَ');

      expect(mockSpeak).toHaveBeenCalled();

      global.Audio = originalAudio;
    });
  });
});
