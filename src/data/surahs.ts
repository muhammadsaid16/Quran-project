export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameTransliterated: string;
  nameEnglish: string;
  ayahCount: number;
  startPage: number;
  revelationType: 'Meccan' | 'Medinan';
}

export const SURAHS: SurahMeta[] = [
  { number: 1, nameArabic: 'الفاتحة', nameTransliterated: 'Al-Fatihah', nameEnglish: 'The Opening', ayahCount: 7, startPage: 1, revelationType: 'Meccan' },
  { number: 2, nameArabic: 'البقرة', nameTransliterated: 'Al-Baqarah', nameEnglish: 'The Cow', ayahCount: 286, startPage: 2, revelationType: 'Medinan' },
  { number: 3, nameArabic: 'آل عمران', nameTransliterated: 'Ali \'Imran', nameEnglish: 'Family of Imran', ayahCount: 200, startPage: 50, revelationType: 'Medinan' },
  { number: 4, nameArabic: 'النساء', nameTransliterated: 'An-Nisa', nameEnglish: 'The Women', ayahCount: 176, startPage: 77, revelationType: 'Medinan' },
  { number: 5, nameArabic: 'المائدة', nameTransliterated: 'Al-Ma\'idah', nameEnglish: 'The Table Spread', ayahCount: 120, startPage: 106, revelationType: 'Medinan' },
  { number: 6, nameArabic: 'الأنعام', nameTransliterated: 'Al-An\'am', nameEnglish: 'The Cattle', ayahCount: 165, startPage: 128, revelationType: 'Meccan' },
  { number: 7, nameArabic: 'الأعراف', nameTransliterated: 'Al-A\'raf', nameEnglish: 'The Heights', ayahCount: 206, startPage: 151, revelationType: 'Meccan' },
  { number: 8, nameArabic: 'الأنفال', nameTransliterated: 'Al-Anfal', nameEnglish: 'The Spoils of War', ayahCount: 75, startPage: 177, revelationType: 'Medinan' },
  { number: 9, nameArabic: 'التوبة', nameTransliterated: 'At-Tawbah', nameEnglish: 'The Repentance', ayahCount: 129, startPage: 187, revelationType: 'Medinan' },
  { number: 10, nameArabic: 'يونس', nameTransliterated: 'Yunus', nameEnglish: 'Jonah', ayahCount: 109, startPage: 208, revelationType: 'Meccan' },
  { number: 11, nameArabic: 'هود', nameTransliterated: 'Hud', nameEnglish: 'Hud', ayahCount: 123, startPage: 221, revelationType: 'Meccan' },
  { number: 12, nameArabic: 'يوسف', nameTransliterated: 'Yusuf', nameEnglish: 'Joseph', ayahCount: 111, startPage: 235, revelationType: 'Meccan' },
  { number: 13, nameArabic: 'الرعد', nameTransliterated: 'Ar-Ra\'d', nameEnglish: 'The Thunder', ayahCount: 43, startPage: 249, revelationType: 'Medinan' },
  { number: 14, nameArabic: 'إبراهيم', nameTransliterated: 'Ibrahim', nameEnglish: 'Abraham', ayahCount: 52, startPage: 255, revelationType: 'Meccan' },
  { number: 15, nameArabic: 'الحجر', nameTransliterated: 'Al-Hijr', nameEnglish: 'The Rocky Tract', ayahCount: 99, startPage: 262, revelationType: 'Meccan' },
  { number: 16, nameArabic: 'النحل', nameTransliterated: 'An-Nahl', nameEnglish: 'The Bee', ayahCount: 128, startPage: 267, revelationType: 'Meccan' },
  { number: 17, nameArabic: 'الإسراء', nameTransliterated: 'Al-Isra', nameEnglish: 'The Night Journey', ayahCount: 111, startPage: 282, revelationType: 'Meccan' },
  { number: 18, nameArabic: 'الكهف', nameTransliterated: 'Al-Kahf', nameEnglish: 'The Cave', ayahCount: 110, startPage: 293, revelationType: 'Meccan' },
  { number: 19, nameArabic: 'مريم', nameTransliterated: 'Maryam', nameEnglish: 'Mary', ayahCount: 98, startPage: 305, revelationType: 'Meccan' },
  { number: 20, nameArabic: 'طه', nameTransliterated: 'Ta-Ha', nameEnglish: 'Ta-Ha', ayahCount: 135, startPage: 312, revelationType: 'Meccan' },
  { number: 21, nameArabic: 'الأنبياء', nameTransliterated: 'Al-Anbiya', nameEnglish: 'The Prophets', ayahCount: 112, startPage: 322, revelationType: 'Meccan' },
  { number: 36, nameArabic: 'يس', nameTransliterated: 'Ya-Sin', nameEnglish: 'Ya-Sin', ayahCount: 83, startPage: 440, revelationType: 'Meccan' },
  { number: 55, nameArabic: 'الرحمن', nameTransliterated: 'Ar-Rahman', nameEnglish: 'The Beneficent', ayahCount: 78, startPage: 531, revelationType: 'Medinan' },
  { number: 56, nameArabic: 'الواقعة', nameTransliterated: 'Al-Waqi\'ah', nameEnglish: 'The Inevitable', ayahCount: 96, startPage: 534, revelationType: 'Meccan' },
  { number: 67, nameArabic: 'الملك', nameTransliterated: 'Al-Mulk', nameEnglish: 'The Sovereignty', ayahCount: 30, startPage: 562, revelationType: 'Meccan' },
  { number: 112, nameArabic: 'الإخلاص', nameTransliterated: 'Al-Ikhlas', nameEnglish: 'The Sincerity', ayahCount: 4, startPage: 604, revelationType: 'Meccan' },
  { number: 113, nameArabic: 'الفلق', nameTransliterated: 'Al-Falaq', nameEnglish: 'The Daybreak', ayahCount: 5, startPage: 604, revelationType: 'Meccan' },
  { number: 114, nameArabic: 'الناس', nameTransliterated: 'An-Nas', nameEnglish: 'Mankind', ayahCount: 6, startPage: 604, revelationType: 'Meccan' },
];
