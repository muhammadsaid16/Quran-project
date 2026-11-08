export interface QuranWord {
  id: string;
  text: string;
  ayahNumber: number;
  surahNumber: number;
  wordIndex: number;
  isAyahMarker?: boolean;
}

export type MushafLine =
  | {
      lineNumber: number;
      type: 'surah_header';
      surahNumber: number;
      surahName: string;
      revelationType: string;
      ayahCount: number;
    }
  | {
      lineNumber: number;
      type: 'basmalah';
      text: string;
    }
  | {
      lineNumber: number;
      type: 'text';
      words: QuranWord[];
    };

export interface MedinaPageData {
  pageNumber: number;
  juzNumber: number;
  hizbQuarter: string;
  isRightPage: boolean;
  surahHeaderName: string;
  lines: MushafLine[];
}

export const MEDINA_PAGES: Record<number, MedinaPageData> = {
  // Page 1: Al-Fatihah (7 lines of text inside illuminated frame)
  1: {
    pageNumber: 1,
    juzNumber: 1,
    hizbQuarter: 'الحزب 1',
    isRightPage: true,
    surahHeaderName: 'سُورَةُ الفَاتِحَةِ',
    lines: [
      {
        lineNumber: 1,
        type: 'surah_header',
        surahNumber: 1,
        surahName: 'الفَاتِحَةِ',
        revelationType: 'مَكِّيَّة',
        ayahCount: 7,
      },
      {
        lineNumber: 2,
        type: 'basmalah',
        text: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
      },
      {
        lineNumber: 3,
        type: 'text',
        words: [
          { id: '1:1:1', text: 'بِسۡمِ', surahNumber: 1, ayahNumber: 1, wordIndex: 1 },
          { id: '1:1:2', text: 'ٱللَّهِ', surahNumber: 1, ayahNumber: 1, wordIndex: 2 },
          { id: '1:1:3', text: 'ٱلرَّحۡمَٰنِ', surahNumber: 1, ayahNumber: 1, wordIndex: 3 },
          { id: '1:1:4', text: 'ٱلرَّحِيمِ', surahNumber: 1, ayahNumber: 1, wordIndex: 4 },
          { id: '1:1:5', text: '١', surahNumber: 1, ayahNumber: 1, wordIndex: 5, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 4,
        type: 'text',
        words: [
          { id: '1:2:1', text: 'ٱلۡحَمۡدُ', surahNumber: 1, ayahNumber: 2, wordIndex: 1 },
          { id: '1:2:2', text: 'لِلَّهِ', surahNumber: 1, ayahNumber: 2, wordIndex: 2 },
          { id: '1:2:3', text: 'رَبِّ', surahNumber: 1, ayahNumber: 2, wordIndex: 3 },
          { id: '1:2:4', text: 'ٱلۡعَٰلَمِينَ', surahNumber: 1, ayahNumber: 2, wordIndex: 4 },
          { id: '1:2:5', text: '٢', surahNumber: 1, ayahNumber: 2, wordIndex: 5, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 5,
        type: 'text',
        words: [
          { id: '1:3:1', text: 'ٱلرَّحۡمَٰنِ', surahNumber: 1, ayahNumber: 3, wordIndex: 1 },
          { id: '1:3:2', text: 'ٱلرَّحِيمِ', surahNumber: 1, ayahNumber: 3, wordIndex: 2 },
          { id: '1:3:3', text: '٣', surahNumber: 1, ayahNumber: 3, wordIndex: 3, isAyahMarker: true },
          { id: '1:4:1', text: 'مَٰلِكِ', surahNumber: 1, ayahNumber: 4, wordIndex: 1 },
          { id: '1:4:2', text: 'item-separator', surahNumber: 1, ayahNumber: 4, wordIndex: 2 },
          { id: '1:4:3', text: 'يَوۡمِ', surahNumber: 1, ayahNumber: 4, wordIndex: 3 },
          { id: '1:4:4', text: 'ٱلدِّينِ', surahNumber: 1, ayahNumber: 4, wordIndex: 4 },
          { id: '1:4:5', text: '٤', surahNumber: 1, ayahNumber: 4, wordIndex: 5, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 6,
        type: 'text',
        words: [
          { id: '1:5:1', text: 'إِيَّاكَ', surahNumber: 1, ayahNumber: 5, wordIndex: 1 },
          { id: '1:5:2', text: 'نَعۡبُدُ', surahNumber: 1, ayahNumber: 5, wordIndex: 2 },
          { id: '1:5:3', text: 'وَإِيَّاكَ', surahNumber: 1, ayahNumber: 5, wordIndex: 3 },
          { id: '1:5:4', text: 'نَسۡتَعِينُ', surahNumber: 1, ayahNumber: 5, wordIndex: 4 },
          { id: '1:5:5', text: '٥', surahNumber: 1, ayahNumber: 5, wordIndex: 5, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 7,
        type: 'text',
        words: [
          { id: '1:6:1', text: 'ٱهۡدِنَا', surahNumber: 1, ayahNumber: 6, wordIndex: 1 },
          { id: '1:6:2', text: 'ٱلصِّرَٰطَ', surahNumber: 1, ayahNumber: 6, wordIndex: 2 },
          { id: '1:6:3', text: 'ٱلۡمُسۡتَقِيمَ', surahNumber: 1, ayahNumber: 6, wordIndex: 3 },
          { id: '1:6:4', text: '٦', surahNumber: 1, ayahNumber: 6, wordIndex: 4, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 8,
        type: 'text',
        words: [
          { id: '1:7:1', text: 'صِرَٰطَ', surahNumber: 1, ayahNumber: 7, wordIndex: 1 },
          { id: '1:7:2', text: 'ٱلَّذِينَ', surahNumber: 1, ayahNumber: 7, wordIndex: 2 },
          { id: '1:7:3', text: 'أَنۡعَمۡتَ', surahNumber: 1, ayahNumber: 7, wordIndex: 3 },
          { id: '1:7:4', text: 'عَلَيۡهِمۡ', surahNumber: 1, ayahNumber: 7, wordIndex: 4 },
        ],
      },
      {
        lineNumber: 9,
        type: 'text',
        words: [
          { id: '1:7:5', text: 'غَيۡرِ', surahNumber: 1, ayahNumber: 7, wordIndex: 5 },
          { id: '1:7:6', text: 'ٱلۡمَغۡضُوبِ', surahNumber: 1, ayahNumber: 7, wordIndex: 6 },
          { id: '1:7:7', text: 'عَلَيۡهِمۡ', surahNumber: 1, ayahNumber: 7, wordIndex: 7 },
          { id: '1:7:8', text: 'وَلَا', surahNumber: 1, ayahNumber: 7, wordIndex: 8 },
          { id: '1:7:9', text: 'ٱلضَّآلِّينَ', surahNumber: 1, ayahNumber: 7, wordIndex: 9 },
          { id: '1:7:10', text: '٧', surahNumber: 1, ayahNumber: 7, wordIndex: 10, isAyahMarker: true },
        ],
      },
    ],
  },

  // Page 2: Al-Baqarah (Standard 15-line Medina layout)
  2: {
    pageNumber: 2,
    juzNumber: 1,
    hizbQuarter: 'الحزب 1',
    isRightPage: false,
    surahHeaderName: 'سُورَةُ البَقَرَةِ',
    lines: [
      {
        lineNumber: 1,
        type: 'surah_header',
        surahNumber: 2,
        surahName: 'البَقَرَةِ',
        revelationType: 'مَدَنِيَّة',
        ayahCount: 286,
      },
      {
        lineNumber: 2,
        type: 'basmalah',
        text: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
      },
      {
        lineNumber: 3,
        type: 'text',
        words: [
          { id: '2:1:1', text: 'الٓمٓ', surahNumber: 2, ayahNumber: 1, wordIndex: 1 },
          { id: '2:1:2', text: '١', surahNumber: 2, ayahNumber: 1, wordIndex: 2, isAyahMarker: true },
          { id: '2:2:1', text: 'ذَٰلِكَ', surahNumber: 2, ayahNumber: 2, wordIndex: 1 },
          { id: '2:2:2', text: 'ٱلۡكِتَٰبُ', surahNumber: 2, ayahNumber: 2, wordIndex: 2 },
          { id: '2:2:3', text: 'لَا', surahNumber: 2, ayahNumber: 2, wordIndex: 3 },
          { id: '2:2:4', text: 'رَيۡبَۛ', surahNumber: 2, ayahNumber: 2, wordIndex: 4 },
          { id: '2:2:5', text: 'فِيهِۛ', surahNumber: 2, ayahNumber: 2, wordIndex: 5 },
          { id: '2:2:6', text: 'هُدࣰى', surahNumber: 2, ayahNumber: 2, wordIndex: 6 },
          { id: '2:2:7', text: 'لِّلۡمُتَّقِينَ', surahNumber: 2, ayahNumber: 2, wordIndex: 7 },
          { id: '2:2:8', text: '٢', surahNumber: 2, ayahNumber: 2, wordIndex: 8, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 4,
        type: 'text',
        words: [
          { id: '2:3:1', text: 'ٱلَّذِينَ', surahNumber: 2, ayahNumber: 3, wordIndex: 1 },
          { id: '2:3:2', text: 'يُؤۡمِنُونَ', surahNumber: 2, ayahNumber: 3, wordIndex: 2 },
          { id: '2:3:3', text: 'بِٱلۡغَيۡبِ', surahNumber: 2, ayahNumber: 3, wordIndex: 3 },
          { id: '2:3:4', text: 'وَيُقِيمُونَ', surahNumber: 2, ayahNumber: 3, wordIndex: 4 },
          { id: '2:3:5', text: 'ٱلصَّلَوٰةَ', surahNumber: 2, ayahNumber: 3, wordIndex: 5 },
        ],
      },
      {
        lineNumber: 5,
        type: 'text',
        words: [
          { id: '2:3:6', text: 'وَمِمَّا', surahNumber: 2, ayahNumber: 3, wordIndex: 6 },
          { id: '2:3:7', text: 'رَزَقۡنَٰهُمۡ', surahNumber: 2, ayahNumber: 3, wordIndex: 7 },
          { id: '2:3:8', text: 'يُنفِقُونَ', surahNumber: 2, ayahNumber: 3, wordIndex: 8 },
          { id: '2:3:9', text: '٣', surahNumber: 2, ayahNumber: 3, wordIndex: 9, isAyahMarker: true },
          { id: '2:4:1', text: 'وَٱلَّذِينَ', surahNumber: 2, ayahNumber: 4, wordIndex: 1 },
          { id: '2:4:2', text: 'يُؤۡمِنُونَ', surahNumber: 2, ayahNumber: 4, wordIndex: 2 },
        ],
      },
      {
        lineNumber: 6,
        type: 'text',
        words: [
          { id: '2:4:3', text: 'بِمَآ', surahNumber: 2, ayahNumber: 4, wordIndex: 3 },
          { id: '2:4:4', text: 'أُنزِلَ', surahNumber: 2, ayahNumber: 4, wordIndex: 4 },
          { id: '2:4:5', text: 'إِلَيۡكَ', surahNumber: 2, ayahNumber: 4, wordIndex: 5 },
          { id: '2:4:6', text: 'وَمَآ', surahNumber: 2, ayahNumber: 4, wordIndex: 6 },
          { id: '2:4:7', text: 'أُنزِلَ', surahNumber: 2, ayahNumber: 4, wordIndex: 7 },
          { id: '2:4:8', text: 'مِن', surahNumber: 2, ayahNumber: 4, wordIndex: 8 },
          { id: '2:4:9', text: 'قَبۡلِكَ', surahNumber: 2, ayahNumber: 4, wordIndex: 9 },
        ],
      },
      {
        lineNumber: 7,
        type: 'text',
        words: [
          { id: '2:4:10', text: 'وَبِٱلۡأٓخِرَةِ', surahNumber: 2, ayahNumber: 4, wordIndex: 10 },
          { id: '2:4:11', text: 'هُمۡ', surahNumber: 2, ayahNumber: 4, wordIndex: 11 },
          { id: '2:4:12', text: 'يُوقِنُونَ', surahNumber: 2, ayahNumber: 4, wordIndex: 12 },
          { id: '2:4:13', text: '٤', surahNumber: 2, ayahNumber: 4, wordIndex: 13, isAyahMarker: true },
          { id: '2:5:1', text: 'أُو۟لَـٰٓئِكَ', surahNumber: 2, ayahNumber: 5, wordIndex: 1 },
          { id: '2:5:2', text: 'عَلَىٰ', surahNumber: 2, ayahNumber: 5, wordIndex: 2 },
        ],
      },
      {
        lineNumber: 8,
        type: 'text',
        words: [
          { id: '2:5:3', text: 'هُدࣰى', surahNumber: 2, ayahNumber: 5, wordIndex: 3 },
          { id: '2:5:4', text: 'مِّن', surahNumber: 2, ayahNumber: 5, wordIndex: 4 },
          { id: '2:5:5', text: 'رَّبِّهِمۡۖ', surahNumber: 2, ayahNumber: 5, wordIndex: 5 },
          { id: '2:5:6', text: 'وَأُو۟لَـٰٓئِكَ', surahNumber: 2, ayahNumber: 5, wordIndex: 6 },
          { id: '2:5:7', text: 'هُمُ', surahNumber: 2, ayahNumber: 5, wordIndex: 7 },
          { id: '2:5:8', text: 'ٱلۡمُفۡلِحُونَ', surahNumber: 2, ayahNumber: 5, wordIndex: 8 },
          { id: '2:5:9', text: '٥', surahNumber: 2, ayahNumber: 5, wordIndex: 9, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 9,
        type: 'text',
        words: [
          { id: '2:6:1', text: 'إِنَّ', surahNumber: 2, ayahNumber: 6, wordIndex: 1 },
          { id: '2:6:2', text: 'ٱلَّذِينَ', surahNumber: 2, ayahNumber: 6, wordIndex: 2 },
          { id: '2:6:3', text: 'كَفَرُوا۟', surahNumber: 2, ayahNumber: 6, wordIndex: 3 },
          { id: '2:6:4', text: 'سَوَآءٌ', surahNumber: 2, ayahNumber: 6, wordIndex: 4 },
          { id: '2:6:5', text: 'عَلَيۡهِمۡ', surahNumber: 2, ayahNumber: 6, wordIndex: 5 },
        ],
      },
      {
        lineNumber: 10,
        type: 'text',
        words: [
          { id: '2:6:6', text: 'ءَأَنذَرۡتَهُمۡ', surahNumber: 2, ayahNumber: 6, wordIndex: 6 },
          { id: '2:6:7', text: 'أَمۡ', surahNumber: 2, ayahNumber: 6, wordIndex: 7 },
          { id: '2:6:8', text: 'لَمۡ', surahNumber: 2, ayahNumber: 6, wordIndex: 8 },
          { id: '2:6:9', text: 'تُنذِرۡهُمۡ', surahNumber: 2, ayahNumber: 6, wordIndex: 9 },
          { id: '2:6:10', text: 'لَا', surahNumber: 2, ayahNumber: 6, wordIndex: 10 },
          { id: '2:6:11', text: 'يُؤۡمِنُونَ', surahNumber: 2, ayahNumber: 6, wordIndex: 11 },
          { id: '2:6:12', text: '٦', surahNumber: 2, ayahNumber: 6, wordIndex: 12, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 11,
        type: 'text',
        words: [
          { id: '2:7:1', text: 'خَتَمَ', surahNumber: 2, ayahNumber: 7, wordIndex: 1 },
          { id: '2:7:2', text: 'ٱللَّهُ', surahNumber: 2, ayahNumber: 7, wordIndex: 2 },
          { id: '2:7:3', text: 'عَلَىٰ', surahNumber: 2, ayahNumber: 7, wordIndex: 3 },
          { id: '2:7:4', text: 'قُلُوبِهِمۡ', surahNumber: 2, ayahNumber: 7, wordIndex: 4 },
          { id: '2:7:5', text: 'وَعَلَىٰ', surahNumber: 2, ayahNumber: 7, wordIndex: 5 },
          { id: '2:7:6', text: 'سَمۡعِهِمۡۖ', surahNumber: 2, ayahNumber: 7, wordIndex: 6 },
        ],
      },
      {
        lineNumber: 12,
        type: 'text',
        words: [
          { id: '2:7:7', text: 'وَعَلَىٰٓ', surahNumber: 2, ayahNumber: 7, wordIndex: 7 },
          { id: '2:7:8', text: 'أَبۡصَٰرِهِمۡ', surahNumber: 2, ayahNumber: 7, wordIndex: 8 },
          { id: '2:7:9', text: 'غِشَٰوَةࣱۖ', surahNumber: 2, ayahNumber: 7, wordIndex: 9 },
          { id: '2:7:10', text: 'وَلَهُمۡ', surahNumber: 2, ayahNumber: 7, wordIndex: 10 },
          { id: '2:7:11', text: 'عَذَابٌ', surahNumber: 2, ayahNumber: 7, wordIndex: 11 },
          { id: '2:7:12', text: 'عَظِيمࣱ', surahNumber: 2, ayahNumber: 7, wordIndex: 12 },
          { id: '2:7:13', text: '٧', surahNumber: 2, ayahNumber: 7, wordIndex: 13, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 13,
        type: 'text',
        words: [
          { id: '2:8:1', text: 'وَمِنَ', surahNumber: 2, ayahNumber: 8, wordIndex: 1 },
          { id: '2:8:2', text: 'ٱلنَّاسِ', surahNumber: 2, ayahNumber: 8, wordIndex: 2 },
          { id: '2:8:3', text: 'مَن', surahNumber: 2, ayahNumber: 8, wordIndex: 3 },
          { id: '2:8:4', text: 'يَقُولُ', surahNumber: 2, ayahNumber: 8, wordIndex: 4 },
          { id: '2:8:5', text: 'ءَامَنَّا', surahNumber: 2, ayahNumber: 8, wordIndex: 5 },
          { id: '2:8:6', text: 'بِٱللَّهِ', surahNumber: 2, ayahNumber: 8, wordIndex: 6 },
          { id: '2:8:7', text: 'وَبِٱلۡيَوۡمِ', surahNumber: 2, ayahNumber: 8, wordIndex: 7 },
        ],
      },
      {
        lineNumber: 14,
        type: 'text',
        words: [
          { id: '2:8:8', text: 'ٱلۡأٓخِرِ', surahNumber: 2, ayahNumber: 8, wordIndex: 8 },
          { id: '2:8:9', text: 'وَمَا', surahNumber: 2, ayahNumber: 8, wordIndex: 9 },
          { id: '2:8:10', text: 'هُم', surahNumber: 2, ayahNumber: 8, wordIndex: 10 },
          { id: '2:8:11', text: 'بِمُؤۡمِنِينَ', surahNumber: 2, ayahNumber: 8, wordIndex: 11 },
          { id: '2:8:12', text: '٨', surahNumber: 2, ayahNumber: 8, wordIndex: 12, isAyahMarker: true },
          { id: '2:9:1', text: 'يُخَٰدِعُونَ', surahNumber: 2, ayahNumber: 9, wordIndex: 1 },
          { id: '2:9:2', text: 'ٱللَّهَ', surahNumber: 2, ayahNumber: 9, wordIndex: 2 },
        ],
      },
      {
        lineNumber: 15,
        type: 'text',
        words: [
          { id: '2:9:3', text: 'وَٱلَّذِينَ', surahNumber: 2, ayahNumber: 9, wordIndex: 3 },
          { id: '2:9:4', text: 'ءَامَنُوا۟', surahNumber: 2, ayahNumber: 9, wordIndex: 4 },
          { id: '2:9:5', text: 'وَمَا', surahNumber: 2, ayahNumber: 9, wordIndex: 5 },
          { id: '2:9:6', text: 'يَخۡدَعُونَ', surahNumber: 2, ayahNumber: 9, wordIndex: 6 },
          { id: '2:9:7', text: 'إِلَّآ', surahNumber: 2, ayahNumber: 9, wordIndex: 7 },
          { id: '2:9:8', text: 'أَنفُسَهُمۡ', surahNumber: 2, ayahNumber: 9, wordIndex: 8 },
          { id: '2:9:9', text: 'وَمَا', surahNumber: 2, ayahNumber: 9, wordIndex: 9 },
          { id: '2:9:10', text: 'يَشۡعُرُونَ', surahNumber: 2, ayahNumber: 9, wordIndex: 10 },
          { id: '2:9:11', text: '٩', surahNumber: 2, ayahNumber: 9, wordIndex: 11, isAyahMarker: true },
        ],
      },
    ],
  },

  // Page 604: Al-Ikhlas, Al-Falaq, An-Nas (Final page of Medina Mushaf, 15 lines)
  604: {
    pageNumber: 604,
    juzNumber: 30,
    hizbQuarter: 'الحزب 60',
    isRightPage: false,
    surahHeaderName: 'سُورَةُ الإِخْلَاصِ - الفَلَقِ - النَّاسِ',
    lines: [
      {
        lineNumber: 1,
        type: 'surah_header',
        surahNumber: 112,
        surahName: 'الإِخۡلَاصِ',
        revelationType: 'مَكِّيَّة',
        ayahCount: 4,
      },
      {
        lineNumber: 2,
        type: 'basmalah',
        text: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
      },
      {
        lineNumber: 3,
        type: 'text',
        words: [
          { id: '112:1:1', text: 'قُلۡ', surahNumber: 112, ayahNumber: 1, wordIndex: 1 },
          { id: '112:1:2', text: 'هُوَ', surahNumber: 112, ayahNumber: 1, wordIndex: 2 },
          { id: '112:1:3', text: 'ٱللَّهُ', surahNumber: 112, ayahNumber: 1, wordIndex: 3 },
          { id: '112:1:4', text: 'أَحَدٌ', surahNumber: 112, ayahNumber: 1, wordIndex: 4 },
          { id: '112:1:5', text: '١', surahNumber: 112, ayahNumber: 1, wordIndex: 5, isAyahMarker: true },
          { id: '112:2:1', text: 'ٱللَّهُ', surahNumber: 112, ayahNumber: 2, wordIndex: 1 },
          { id: '112:2:2', text: 'ٱلصَّمَدُ', surahNumber: 112, ayahNumber: 2, wordIndex: 2 },
          { id: '112:2:3', text: '٢', surahNumber: 112, ayahNumber: 2, wordIndex: 3, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 4,
        type: 'text',
        words: [
          { id: '112:3:1', text: 'لَمۡ', surahNumber: 112, ayahNumber: 3, wordIndex: 1 },
          { id: '112:3:2', text: 'يَلِدۡ', surahNumber: 112, ayahNumber: 3, wordIndex: 2 },
          { id: '112:3:3', text: 'وَلَمۡ', surahNumber: 112, ayahNumber: 3, wordIndex: 3 },
          { id: '112:3:4', text: 'يُولَدۡ', surahNumber: 112, ayahNumber: 3, wordIndex: 4 },
          { id: '112:3:5', text: '٣', surahNumber: 112, ayahNumber: 3, wordIndex: 5, isAyahMarker: true },
          { id: '112:4:1', text: 'وَلَمۡ', surahNumber: 112, ayahNumber: 4, wordIndex: 1 },
          { id: '112:4:2', text: 'يَكُن', surahNumber: 112, ayahNumber: 4, wordIndex: 2 },
          { id: '112:4:3', text: 'لَّهُۥ', surahNumber: 112, ayahNumber: 4, wordIndex: 3 },
          { id: '112:4:4', text: 'كُفُوًا', surahNumber: 112, ayahNumber: 4, wordIndex: 4 },
          { id: '112:4:5', text: 'أَحَدُۢ', surahNumber: 112, ayahNumber: 4, wordIndex: 5 },
          { id: '112:4:6', text: '٤', surahNumber: 112, ayahNumber: 4, wordIndex: 6, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 5,
        type: 'surah_header',
        surahNumber: 113,
        surahName: 'الفَلَقِ',
        revelationType: 'مَكِّيَّة',
        ayahCount: 5,
      },
      {
        lineNumber: 6,
        type: 'basmalah',
        text: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
      },
      {
        lineNumber: 7,
        type: 'text',
        words: [
          { id: '113:1:1', text: 'قُلۡ', surahNumber: 113, ayahNumber: 1, wordIndex: 1 },
          { id: '113:1:2', text: 'أَعُوذُ', surahNumber: 113, ayahNumber: 1, wordIndex: 2 },
          { id: '113:1:3', text: 'بِرَبِّ', surahNumber: 113, ayahNumber: 1, wordIndex: 3 },
          { id: '113:1:4', text: 'ٱلۡفَلَقِ', surahNumber: 113, ayahNumber: 1, wordIndex: 4 },
          { id: '113:1:5', text: '١', surahNumber: 113, ayahNumber: 1, wordIndex: 5, isAyahMarker: true },
          { id: '113:2:1', text: 'مِن', surahNumber: 113, ayahNumber: 2, wordIndex: 1 },
          { id: '113:2:2', text: 'شَرِّ', surahNumber: 113, ayahNumber: 2, wordIndex: 2 },
          { id: '113:2:3', text: 'مَا', surahNumber: 113, ayahNumber: 2, wordIndex: 3 },
          { id: '113:2:4', text: 'خَلَقَ', surahNumber: 113, ayahNumber: 2, wordIndex: 4 },
          { id: '113:2:5', text: '٢', surahNumber: 113, ayahNumber: 2, wordIndex: 5, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 8,
        type: 'text',
        words: [
          { id: '113:3:1', text: 'وَمِن', surahNumber: 113, ayahNumber: 3, wordIndex: 1 },
          { id: '113:3:2', text: 'شَرِّ', surahNumber: 113, ayahNumber: 3, wordIndex: 2 },
          { id: '113:3:3', text: 'غَاسِقٍ', surahNumber: 113, ayahNumber: 3, wordIndex: 3 },
          { id: '113:3:4', text: 'إِذَا', surahNumber: 113, ayahNumber: 3, wordIndex: 4 },
          { id: '113:3:5', text: 'وَقَبَ', surahNumber: 113, ayahNumber: 3, wordIndex: 5 },
          { id: '113:3:6', text: '٣', surahNumber: 113, ayahNumber: 3, wordIndex: 6, isAyahMarker: true },
          { id: '113:4:1', text: 'وَمِن', surahNumber: 113, ayahNumber: 4, wordIndex: 1 },
          { id: '113:4:2', text: 'شَرِّ', surahNumber: 113, ayahNumber: 4, wordIndex: 2 },
          { id: '113:4:3', text: 'ٱلنَّفَّـٰثَٰتِ', surahNumber: 113, ayahNumber: 4, wordIndex: 3 },
        ],
      },
      {
        lineNumber: 9,
        type: 'text',
        words: [
          { id: '113:4:4', text: 'فِي', surahNumber: 113, ayahNumber: 4, wordIndex: 4 },
          { id: '113:4:5', text: 'ٱلۡعُقَدِ', surahNumber: 113, ayahNumber: 4, wordIndex: 5 },
          { id: '113:4:6', text: '٤', surahNumber: 113, ayahNumber: 4, wordIndex: 6, isAyahMarker: true },
          { id: '113:5:1', text: 'وَمِن', surahNumber: 113, ayahNumber: 5, wordIndex: 1 },
          { id: '113:5:2', text: 'شَرِّ', surahNumber: 113, ayahNumber: 5, wordIndex: 2 },
          { id: '113:5:3', text: 'حَاسِدٍ', surahNumber: 113, ayahNumber: 5, wordIndex: 3 },
          { id: '113:5:4', text: 'إِذَا', surahNumber: 113, ayahNumber: 5, wordIndex: 4 },
          { id: '113:5:5', text: 'حَسَدَ', surahNumber: 113, ayahNumber: 5, wordIndex: 5 },
          { id: '113:5:6', text: '٥', surahNumber: 113, ayahNumber: 5, wordIndex: 6, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 10,
        type: 'surah_header',
        surahNumber: 114,
        surahName: 'النَّاسِ',
        revelationType: 'مَكِّيَّة',
        ayahCount: 6,
      },
      {
        lineNumber: 11,
        type: 'basmalah',
        text: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
      },
      {
        lineNumber: 12,
        type: 'text',
        words: [
          { id: '114:1:1', text: 'قُلۡ', surahNumber: 114, ayahNumber: 1, wordIndex: 1 },
          { id: '114:1:2', text: 'أَعُوذُ', surahNumber: 114, ayahNumber: 1, wordIndex: 2 },
          { id: '114:1:3', text: 'بِرَبِّ', surahNumber: 114, ayahNumber: 1, wordIndex: 3 },
          { id: '114:1:4', text: 'ٱلنَّاسِ', surahNumber: 114, ayahNumber: 1, wordIndex: 4 },
          { id: '114:1:5', text: '١', surahNumber: 114, ayahNumber: 1, wordIndex: 5, isAyahMarker: true },
          { id: '114:2:1', text: 'مَلِكِ', surahNumber: 114, ayahNumber: 2, wordIndex: 1 },
          { id: '114:2:2', text: 'ٱلنَّاسِ', surahNumber: 114, ayahNumber: 2, wordIndex: 2 },
          { id: '114:2:3', text: '٢', surahNumber: 114, ayahNumber: 2, wordIndex: 3, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 13,
        type: 'text',
        words: [
          { id: '114:3:1', text: 'إِلَٰهِ', surahNumber: 114, ayahNumber: 3, wordIndex: 1 },
          { id: '114:3:2', text: 'ٱلنَّاسِ', surahNumber: 114, ayahNumber: 3, wordIndex: 2 },
          { id: '114:3:3', text: '٣', surahNumber: 114, ayahNumber: 3, wordIndex: 3, isAyahMarker: true },
          { id: '114:4:1', text: 'مِن', surahNumber: 114, ayahNumber: 4, wordIndex: 1 },
          { id: '114:4:2', text: 'شَرِّ', surahNumber: 114, ayahNumber: 4, wordIndex: 2 },
          { id: '114:4:3', text: 'ٱلۡوَسۡوَاسِ', surahNumber: 114, ayahNumber: 4, wordIndex: 3 },
          { id: '114:4:4', text: 'ٱلۡخَنَّاسِ', surahNumber: 114, ayahNumber: 4, wordIndex: 4 },
          { id: '114:4:5', text: '٤', surahNumber: 114, ayahNumber: 4, wordIndex: 5, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 14,
        type: 'text',
        words: [
          { id: '114:5:1', text: 'ٱلَّذِى', surahNumber: 114, ayahNumber: 5, wordIndex: 1 },
          { id: '114:5:2', text: 'يُوَسۡوِسُ', surahNumber: 114, ayahNumber: 5, wordIndex: 2 },
          { id: '114:5:3', text: 'فِى', surahNumber: 114, ayahNumber: 5, wordIndex: 3 },
          { id: '114:5:4', text: 'صُدُورِ', surahNumber: 114, ayahNumber: 5, wordIndex: 4 },
          { id: '114:5:5', text: 'ٱلنَّاسِ', surahNumber: 114, ayahNumber: 5, wordIndex: 5 },
          { id: '114:5:6', text: '٥', surahNumber: 114, ayahNumber: 5, wordIndex: 6, isAyahMarker: true },
        ],
      },
      {
        lineNumber: 15,
        type: 'text',
        words: [
          { id: '114:6:1', text: 'مِنَ', surahNumber: 114, ayahNumber: 6, wordIndex: 1 },
          { id: '114:6:2', text: 'ٱلۡجِنَّةِ', surahNumber: 114, ayahNumber: 6, wordIndex: 2 },
          { id: '114:6:3', text: 'وَٱلنَّاسِ', surahNumber: 114, ayahNumber: 6, wordIndex: 3 },
          { id: '114:6:4', text: '٦', surahNumber: 114, ayahNumber: 6, wordIndex: 4, isAyahMarker: true },
        ],
      },
    ],
  },
};
