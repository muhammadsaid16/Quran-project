/**
 * Canonical Metadata for the authoritative Medina Mushaf (Hafs 'an Asim).
 * 114 Surahs, 6,236 Ayahs, 604 Pages, 30 Juz.
 */

export interface CanonicalSurah {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliterated: string;
  ayahCount: number;
  startPage: number;
  startJuz: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface CanonicalJuz {
  juzNumber: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  startPage: number;
}

export interface SajdahLocation {
  surah: number;
  ayah: number;
  isObligatory: boolean;
}

export const CANONICAL_SURAHS: CanonicalSurah[] = [
  { number: 1, nameArabic: 'الفاتحة', nameEnglish: 'The Opening', nameTransliterated: 'Al-Fatihah', ayahCount: 7, startPage: 1, startJuz: 1, revelationType: 'Meccan' },
  { number: 2, nameArabic: 'البقرة', nameEnglish: 'The Cow', nameTransliterated: 'Al-Baqarah', ayahCount: 286, startPage: 2, startJuz: 1, revelationType: 'Medinan' },
  { number: 3, nameArabic: 'آل عمران', nameEnglish: 'Family of Imran', nameTransliterated: 'Ali \'Imran', ayahCount: 200, startPage: 50, startJuz: 3, revelationType: 'Medinan' },
  { number: 4, nameArabic: 'النساء', nameEnglish: 'The Women', nameTransliterated: 'An-Nisa', ayahCount: 176, startPage: 77, startJuz: 4, revelationType: 'Medinan' },
  { number: 5, nameArabic: 'المائدة', nameEnglish: 'The Table Spread', nameTransliterated: 'Al-Ma\'idah', ayahCount: 120, startPage: 106, startJuz: 6, revelationType: 'Medinan' },
  { number: 6, nameArabic: 'الأنعام', nameEnglish: 'The Cattle', nameTransliterated: 'Al-An\'am', ayahCount: 165, startPage: 128, startJuz: 7, revelationType: 'Meccan' },
  { number: 7, nameArabic: 'الأعراف', nameEnglish: 'The Heights', nameTransliterated: 'Al-A\'raf', ayahCount: 206, startPage: 151, startJuz: 8, revelationType: 'Meccan' },
  { number: 8, nameArabic: 'الأنفال', nameEnglish: 'The Spoils of War', nameTransliterated: 'Al-Anfal', ayahCount: 75, startPage: 177, startJuz: 9, revelationType: 'Medinan' },
  { number: 9, nameArabic: 'التوبة', nameEnglish: 'The Repentance', nameTransliterated: 'At-Tawbah', ayahCount: 129, startPage: 187, startJuz: 10, revelationType: 'Medinan' },
  { number: 10, nameArabic: 'يونس', nameEnglish: 'Jonah', nameTransliterated: 'Yunus', ayahCount: 109, startPage: 208, startJuz: 11, revelationType: 'Meccan' },
  { number: 11, nameArabic: 'هود', nameEnglish: 'Hud', nameTransliterated: 'Hud', ayahCount: 123, startPage: 221, startJuz: 11, revelationType: 'Meccan' },
  { number: 12, nameArabic: 'يوسف', nameEnglish: 'Joseph', nameTransliterated: 'Yusuf', ayahCount: 111, startPage: 235, startJuz: 12, revelationType: 'Meccan' },
  { number: 13, nameArabic: 'الرعد', nameEnglish: 'The Thunder', nameTransliterated: 'Ar-Ra\'d', ayahCount: 43, startPage: 249, startJuz: 13, revelationType: 'Medinan' },
  { number: 14, nameArabic: 'إبراهيم', nameEnglish: 'Abraham', nameTransliterated: 'Ibrahim', ayahCount: 52, startPage: 255, startJuz: 13, revelationType: 'Meccan' },
  { number: 15, nameArabic: 'الحجر', nameEnglish: 'The Rocky Tract', nameTransliterated: 'Al-Hijr', ayahCount: 99, startPage: 262, startJuz: 14, revelationType: 'Meccan' },
  { number: 16, nameArabic: 'النحل', nameEnglish: 'The Bee', nameTransliterated: 'An-Nahl', ayahCount: 128, startPage: 267, startJuz: 14, revelationType: 'Meccan' },
  { number: 17, nameArabic: 'الإسراء', nameEnglish: 'The Night Journey', nameTransliterated: 'Al-Isra', ayahCount: 111, startPage: 282, startJuz: 15, revelationType: 'Meccan' },
  { number: 18, nameArabic: 'الكهف', nameEnglish: 'The Cave', nameTransliterated: 'Al-Kahf', ayahCount: 110, startPage: 293, startJuz: 15, revelationType: 'Meccan' },
  { number: 19, nameArabic: 'مريم', nameEnglish: 'Mary', nameTransliterated: 'Maryam', ayahCount: 98, startPage: 305, startJuz: 16, revelationType: 'Meccan' },
  { number: 20, nameArabic: 'طه', nameEnglish: 'Ta-Ha', nameTransliterated: 'Ta-Ha', ayahCount: 135, startPage: 312, startJuz: 16, revelationType: 'Meccan' },
  { number: 21, nameArabic: 'الأنبياء', nameEnglish: 'The Prophets', nameTransliterated: 'Al-Anbiya', ayahCount: 112, startPage: 322, startJuz: 17, revelationType: 'Meccan' },
  { number: 22, nameArabic: 'الحج', nameEnglish: 'The Pilgrimage', nameTransliterated: 'Al-Hajj', ayahCount: 78, startPage: 332, startJuz: 17, revelationType: 'Medinan' },
  { number: 23, nameArabic: 'المؤمنون', nameEnglish: 'The Believers', nameTransliterated: 'Al-Mu\'minun', ayahCount: 118, startPage: 342, startJuz: 18, revelationType: 'Meccan' },
  { number: 24, nameArabic: 'النور', nameEnglish: 'The Light', nameTransliterated: 'An-Nur', ayahCount: 64, startPage: 350, startJuz: 18, revelationType: 'Medinan' },
  { number: 25, nameArabic: 'الفرقان', nameEnglish: 'The Criterion', nameTransliterated: 'Al-Furqan', ayahCount: 77, startPage: 359, startJuz: 18, revelationType: 'Meccan' },
  { number: 26, nameArabic: 'الشعراء', nameEnglish: 'The Poets', nameTransliterated: 'Ash-Shu\'ara', ayahCount: 227, startPage: 367, startJuz: 19, revelationType: 'Meccan' },
  { number: 27, nameArabic: 'النمل', nameEnglish: 'The Ant', nameTransliterated: 'An-Naml', ayahCount: 93, startPage: 377, startJuz: 19, revelationType: 'Meccan' },
  { number: 28, nameArabic: 'القصص', nameEnglish: 'The Stories', nameTransliterated: 'Al-Qasas', ayahCount: 88, startPage: 385, startJuz: 20, revelationType: 'Meccan' },
  { number: 29, nameArabic: 'العنكبوت', nameEnglish: 'The Spider', nameTransliterated: 'Al-\'Ankabut', ayahCount: 69, startPage: 396, startJuz: 20, revelationType: 'Meccan' },
  { number: 30, nameArabic: 'الروم', nameEnglish: 'The Romans', nameTransliterated: 'Ar-Rum', ayahCount: 60, startPage: 404, startJuz: 21, revelationType: 'Meccan' },
  { number: 31, nameArabic: 'لقمان', nameEnglish: 'Luqman', nameTransliterated: 'Luqman', ayahCount: 34, startPage: 411, startJuz: 21, revelationType: 'Meccan' },
  { number: 32, nameArabic: 'السجدة', nameEnglish: 'The Prostration', nameTransliterated: 'As-Sajdah', ayahCount: 30, startPage: 415, startJuz: 21, revelationType: 'Meccan' },
  { number: 33, nameArabic: 'الأحزاب', nameEnglish: 'The Combined Forces', nameTransliterated: 'Al-Ahzab', ayahCount: 73, startPage: 418, startJuz: 21, revelationType: 'Medinan' },
  { number: 34, nameArabic: 'سبأ', nameEnglish: 'Sheba', nameTransliterated: 'Saba', ayahCount: 54, startPage: 428, startJuz: 22, revelationType: 'Meccan' },
  { number: 35, nameArabic: 'فاطر', nameEnglish: 'Originator', nameTransliterated: 'Fatir', ayahCount: 45, startPage: 434, startJuz: 22, revelationType: 'Meccan' },
  { number: 36, nameArabic: 'يس', nameEnglish: 'Ya-Sin', nameTransliterated: 'Ya-Sin', ayahCount: 83, startPage: 440, startJuz: 22, revelationType: 'Meccan' },
  { number: 37, nameArabic: 'الصافات', nameEnglish: 'Those who set the Ranks', nameTransliterated: 'As-Saffat', ayahCount: 182, startPage: 446, startJuz: 23, revelationType: 'Meccan' },
  { number: 38, nameArabic: 'ص', nameEnglish: 'Sad', nameTransliterated: 'Sad', ayahCount: 88, startPage: 453, startJuz: 23, revelationType: 'Meccan' },
  { number: 39, nameArabic: 'الزمر', nameEnglish: 'The Troops', nameTransliterated: 'Az-Zumar', ayahCount: 75, startPage: 458, startJuz: 23, revelationType: 'Meccan' },
  { number: 40, nameArabic: 'غافر', nameEnglish: 'The Forgiver', nameTransliterated: 'Ghafir', ayahCount: 85, startPage: 467, startJuz: 24, revelationType: 'Meccan' },
  { number: 41, nameArabic: 'فصلت', nameEnglish: 'Explained in Detail', nameTransliterated: 'Fussilat', ayahCount: 54, startPage: 477, startJuz: 24, revelationType: 'Meccan' },
  { number: 42, nameArabic: 'الشورى', nameEnglish: 'The Consultation', nameTransliterated: 'Ash-Shura', ayahCount: 53, startPage: 483, startJuz: 25, revelationType: 'Meccan' },
  { number: 43, nameArabic: 'الزخرف', nameEnglish: 'The Ornaments of Gold', nameTransliterated: 'Az-Zukhruf', ayahCount: 89, startPage: 489, startJuz: 25, revelationType: 'Meccan' },
  { number: 44, nameArabic: 'الدخان', nameEnglish: 'The Smoke', nameTransliterated: 'Ad-Dukhan', ayahCount: 59, startPage: 496, startJuz: 25, revelationType: 'Meccan' },
  { number: 45, nameArabic: 'الجاثية', nameEnglish: 'The Crouching', nameTransliterated: 'Al-Jathiyah', ayahCount: 37, startPage: 499, startJuz: 25, revelationType: 'Meccan' },
  { number: 46, nameArabic: 'الأحقاف', nameEnglish: 'The Wind-Curved Sandhills', nameTransliterated: 'Al-Ahqaf', ayahCount: 35, startPage: 502, startJuz: 26, revelationType: 'Meccan' },
  { number: 47, nameArabic: 'محمد', nameEnglish: 'Muhammad', nameTransliterated: 'Muhammad', ayahCount: 38, startPage: 507, startJuz: 26, revelationType: 'Medinan' },
  { number: 48, nameArabic: 'الفتح', nameEnglish: 'The Victory', nameTransliterated: 'Al-Fath', ayahCount: 29, startPage: 511, startJuz: 26, revelationType: 'Medinan' },
  { number: 49, nameArabic: 'الحجرات', nameEnglish: 'The Rooms', nameTransliterated: 'Al-Hujurat', ayahCount: 18, startPage: 515, startJuz: 26, revelationType: 'Medinan' },
  { number: 50, nameArabic: 'ق', nameEnglish: 'Qaf', nameTransliterated: 'Qaf', ayahCount: 45, startPage: 518, startJuz: 26, revelationType: 'Meccan' },
  { number: 51, nameArabic: 'الذاريات', nameEnglish: 'The Winnowing Winds', nameTransliterated: 'Adh-Dhariyat', ayahCount: 60, startPage: 520, startJuz: 26, revelationType: 'Meccan' },
  { number: 52, nameArabic: 'الطور', nameEnglish: 'The Mount', nameTransliterated: 'At-Tur', ayahCount: 49, startPage: 523, startJuz: 27, revelationType: 'Meccan' },
  { number: 53, nameArabic: 'النجم', nameEnglish: 'The Star', nameTransliterated: 'An-Najm', ayahCount: 62, startPage: 526, startJuz: 27, revelationType: 'Meccan' },
  { number: 54, nameArabic: 'القمر', nameEnglish: 'The Moon', nameTransliterated: 'Al-Qamar', ayahCount: 55, startPage: 528, startJuz: 27, revelationType: 'Meccan' },
  { number: 55, nameArabic: 'الرحمن', nameEnglish: 'The Beneficent', nameTransliterated: 'Ar-Rahman', ayahCount: 78, startPage: 531, startJuz: 27, revelationType: 'Medinan' },
  { number: 56, nameArabic: 'الواقعة', nameEnglish: 'The Inevitable', nameTransliterated: 'Al-Waqi\'ah', ayahCount: 96, startPage: 534, startJuz: 27, revelationType: 'Meccan' },
  { number: 57, nameArabic: 'الحديد', nameEnglish: 'The Iron', nameTransliterated: 'Al-Hadid', ayahCount: 29, startPage: 537, startJuz: 27, revelationType: 'Medinan' },
  { number: 58, nameArabic: 'المجادلة', nameEnglish: 'The Pleading Woman', nameTransliterated: 'Al-Mujadila', ayahCount: 22, startPage: 542, startJuz: 28, revelationType: 'Medinan' },
  { number: 59, nameArabic: 'الحشر', nameEnglish: 'The Exile', nameTransliterated: 'Al-Hashr', ayahCount: 24, startPage: 545, startJuz: 28, revelationType: 'Medinan' },
  { number: 60, nameArabic: 'الممتحنة', nameEnglish: 'She that is to be examined', nameTransliterated: 'Al-Mumtahanah', ayahCount: 13, startPage: 549, startJuz: 28, revelationType: 'Medinan' },
  { number: 61, nameArabic: 'الصف', nameEnglish: 'The Ranks', nameTransliterated: 'As-Saf', ayahCount: 14, startPage: 551, startJuz: 28, revelationType: 'Medinan' },
  { number: 62, nameArabic: 'الجمعة', nameEnglish: 'The Congregation', nameTransliterated: 'Al-Jumu\'ah', ayahCount: 11, startPage: 553, startJuz: 28, revelationType: 'Medinan' },
  { number: 63, nameArabic: 'المنافقون', nameEnglish: 'The Hypocrites', nameTransliterated: 'Al-Munafiqun', ayahCount: 11, startPage: 554, startJuz: 28, revelationType: 'Medinan' },
  { number: 64, nameArabic: 'التغابن', nameEnglish: 'The Mutual Disillusion', nameTransliterated: 'At-Taghabun', ayahCount: 18, startPage: 556, startJuz: 28, revelationType: 'Medinan' },
  { number: 65, nameArabic: 'الطلاق', nameEnglish: 'The Divorce', nameTransliterated: 'At-Talaq', ayahCount: 12, startPage: 558, startJuz: 28, revelationType: 'Medinan' },
  { number: 66, nameArabic: 'التحريم', nameEnglish: 'The Prohibition', nameTransliterated: 'At-Tahrim', ayahCount: 12, startPage: 560, startJuz: 28, revelationType: 'Medinan' },
  { number: 67, nameArabic: 'الملك', nameEnglish: 'The Sovereignty', nameTransliterated: 'Al-Mulk', ayahCount: 30, startPage: 562, startJuz: 29, revelationType: 'Meccan' },
  { number: 68, nameArabic: 'القلم', nameEnglish: 'The Pen', nameTransliterated: 'Al-Qalam', ayahCount: 52, startPage: 564, startJuz: 29, revelationType: 'Meccan' },
  { number: 69, nameArabic: 'الحاقة', nameEnglish: 'The Reality', nameTransliterated: 'Al-Haqqah', ayahCount: 52, startPage: 566, startJuz: 29, revelationType: 'Meccan' },
  { number: 70, nameArabic: 'المعارج', nameEnglish: 'The Ascending Stairways', nameTransliterated: 'Al-Ma\'arij', ayahCount: 44, startPage: 568, startJuz: 29, revelationType: 'Meccan' },
  { number: 71, nameArabic: 'نوح', nameEnglish: 'Noah', nameTransliterated: 'Nuh', ayahCount: 28, startPage: 570, startJuz: 29, revelationType: 'Meccan' },
  { number: 72, nameArabic: 'الجن', nameEnglish: 'The Jinn', nameTransliterated: 'Al-Jinn', ayahCount: 28, startPage: 572, startJuz: 29, revelationType: 'Meccan' },
  { number: 73, nameArabic: 'المزمل', nameEnglish: 'The Enshrouded One', nameTransliterated: 'Al-Muzzammil', ayahCount: 20, startPage: 574, startJuz: 29, revelationType: 'Meccan' },
  { number: 74, nameArabic: 'المدثر', nameEnglish: 'The Cloaked One', nameTransliterated: 'Al-Muddaththir', ayahCount: 56, startPage: 575, startJuz: 29, revelationType: 'Meccan' },
  { number: 75, nameArabic: 'القيامة', nameEnglish: 'The Resurrection', nameTransliterated: 'Al-Qiyamah', ayahCount: 40, startPage: 577, startJuz: 29, revelationType: 'Meccan' },
  { number: 76, nameArabic: 'الإنسان', nameEnglish: 'Man', nameTransliterated: 'Al-Insan', ayahCount: 31, startPage: 578, startJuz: 29, revelationType: 'Medinan' },
  { number: 77, nameArabic: 'المرسلات', nameEnglish: 'The Emissaries', nameTransliterated: 'Al-Mursalat', ayahCount: 50, startPage: 580, startJuz: 29, revelationType: 'Meccan' },
  { number: 78, nameArabic: 'النبأ', nameEnglish: 'The Tidings', nameTransliterated: 'An-Naba', ayahCount: 40, startPage: 582, startJuz: 30, revelationType: 'Meccan' },
  { number: 79, nameArabic: 'النازعات', nameEnglish: 'Those who drag forth', nameTransliterated: 'An-Nazi\'at', ayahCount: 46, startPage: 583, startJuz: 30, revelationType: 'Meccan' },
  { number: 80, nameArabic: 'عبس', nameEnglish: 'He Frowned', nameTransliterated: '\'Abasa', ayahCount: 42, startPage: 585, startJuz: 30, revelationType: 'Meccan' },
  { number: 81, nameArabic: 'التكوير', nameEnglish: 'The Overthrowing', nameTransliterated: 'At-Takwir', ayahCount: 29, startPage: 586, startJuz: 30, revelationType: 'Meccan' },
  { number: 82, nameArabic: 'الانفطار', nameEnglish: 'The Cleaving', nameTransliterated: 'Al-Infitar', ayahCount: 19, startPage: 587, startJuz: 30, revelationType: 'Meccan' },
  { number: 83, nameArabic: 'المطففين', nameEnglish: 'The Defrauding', nameTransliterated: 'Al-Mutaffifin', ayahCount: 36, startPage: 587, startJuz: 30, revelationType: 'Meccan' },
  { number: 84, nameArabic: 'الانشقاق', nameEnglish: 'The Splitting Open', nameTransliterated: 'Al-Inshiqaq', ayahCount: 25, startPage: 589, startJuz: 30, revelationType: 'Meccan' },
  { number: 85, nameArabic: 'البروج', nameEnglish: 'The Mansions of the Stars', nameTransliterated: 'Al-Buruj', ayahCount: 22, startPage: 590, startJuz: 30, revelationType: 'Meccan' },
  { number: 86, nameArabic: 'الطارق', nameEnglish: 'The Morning Star', nameTransliterated: 'At-Tariq', ayahCount: 17, startPage: 591, startJuz: 30, revelationType: 'Meccan' },
  { number: 87, nameArabic: 'الأعلى', nameEnglish: 'The Most High', nameTransliterated: 'Al-A\'la', ayahCount: 19, startPage: 591, startJuz: 30, revelationType: 'Meccan' },
  { number: 88, nameArabic: 'الغاشية', nameEnglish: 'The Overwhelming', nameTransliterated: 'Al-Ghashiyah', ayahCount: 26, startPage: 592, startJuz: 30, revelationType: 'Meccan' },
  { number: 89, nameArabic: 'الفجر', nameEnglish: 'The Dawn', nameTransliterated: 'Al-Fajr', ayahCount: 30, startPage: 593, startJuz: 30, revelationType: 'Meccan' },
  { number: 90, nameArabic: 'البلد', nameEnglish: 'The City', nameTransliterated: 'Al-Balad', ayahCount: 20, startPage: 594, startJuz: 30, revelationType: 'Meccan' },
  { number: 91, nameArabic: 'الشمس', nameEnglish: 'The Sun', nameTransliterated: 'Ash-Shams', ayahCount: 15, startPage: 595, startJuz: 30, revelationType: 'Meccan' },
  { number: 92, nameArabic: 'الليل', nameEnglish: 'The Night', nameTransliterated: 'Al-Layl', ayahCount: 21, startPage: 595, startJuz: 30, revelationType: 'Meccan' },
  { number: 93, nameArabic: 'الضحى', nameEnglish: 'The Morning Hours', nameTransliterated: 'Ad-Duha', ayahCount: 11, startPage: 596, startJuz: 30, revelationType: 'Meccan' },
  { number: 94, nameArabic: 'الشرح', nameEnglish: 'The Relief', nameTransliterated: 'Ash-Sharh', ayahCount: 8, startPage: 596, startJuz: 30, revelationType: 'Meccan' },
  { number: 95, nameArabic: 'التين', nameEnglish: 'The Fig', nameTransliterated: 'At-Tin', ayahCount: 8, startPage: 597, startJuz: 30, revelationType: 'Meccan' },
  { number: 96, nameArabic: 'العلق', nameEnglish: 'The Clot', nameTransliterated: 'Al-\'Alaq', ayahCount: 19, startPage: 597, startJuz: 30, revelationType: 'Meccan' },
  { number: 97, nameArabic: 'القدر', nameEnglish: 'The Power', nameTransliterated: 'Al-Qadr', ayahCount: 5, startPage: 598, startJuz: 30, revelationType: 'Meccan' },
  { number: 98, nameArabic: 'البينة', nameEnglish: 'The Clear Proof', nameTransliterated: 'Al-Bayyinah', ayahCount: 8, startPage: 598, startJuz: 30, revelationType: 'Medinan' },
  { number: 99, nameArabic: 'الزلزلة', nameEnglish: 'The Earthquake', nameTransliterated: 'Az-Zalzalah', ayahCount: 8, startPage: 599, startJuz: 30, revelationType: 'Medinan' },
  { number: 100, nameArabic: 'العاديات', nameEnglish: 'The Courser', nameTransliterated: 'Al-\'Adiyat', ayahCount: 11, startPage: 599, startJuz: 30, revelationType: 'Meccan' },
  { number: 101, nameArabic: 'القارعة', nameEnglish: 'The Calamity', nameTransliterated: 'Al-Qari\'ah', ayahCount: 11, startPage: 600, startJuz: 30, revelationType: 'Meccan' },
  { number: 102, nameArabic: 'التكاثر', nameEnglish: 'The Rivalry in World Increase', nameTransliterated: 'At-Takathur', ayahCount: 8, startPage: 600, startJuz: 30, revelationType: 'Meccan' },
  { number: 103, nameArabic: 'العصر', nameEnglish: 'The Declining Day', nameTransliterated: 'Al-\'Asr', ayahCount: 3, startPage: 601, startJuz: 30, revelationType: 'Meccan' },
  { number: 104, nameArabic: 'الهمزة', nameEnglish: 'The Traducer', nameTransliterated: 'Al-Humazah', ayahCount: 9, startPage: 601, startJuz: 30, revelationType: 'Meccan' },
  { number: 105, nameArabic: 'الفيل', nameEnglish: 'The Elephant', nameTransliterated: 'Al-Fil', ayahCount: 5, startPage: 601, startJuz: 30, revelationType: 'Meccan' },
  { number: 106, nameArabic: 'قريش', nameEnglish: 'Quraysh', nameTransliterated: 'Quraysh', ayahCount: 4, startPage: 602, startJuz: 30, revelationType: 'Meccan' },
  { number: 107, nameArabic: 'الماعون', nameEnglish: 'The Small Kindness', nameTransliterated: 'Al-Ma\'un', ayahCount: 7, startPage: 602, startJuz: 30, revelationType: 'Meccan' },
  { number: 108, nameArabic: 'الكوثر', nameEnglish: 'The Abundance', nameTransliterated: 'Al-Kawthar', ayahCount: 3, startPage: 602, startJuz: 30, revelationType: 'Meccan' },
  { number: 109, nameArabic: 'الكافرون', nameEnglish: 'The Disbelievers', nameTransliterated: 'Al-Kafirun', ayahCount: 6, startPage: 603, startJuz: 30, revelationType: 'Meccan' },
  { number: 110, nameArabic: 'النصر', nameEnglish: 'The Divine Support', nameTransliterated: 'An-Nasr', ayahCount: 3, startPage: 603, startJuz: 30, revelationType: 'Medinan' },
  { number: 111, nameArabic: 'المسد', nameEnglish: 'The Palm Fiber', nameTransliterated: 'Al-Masad', ayahCount: 5, startPage: 603, startJuz: 30, revelationType: 'Meccan' },
  { number: 112, nameArabic: 'الإخلاص', nameEnglish: 'The Sincerity', nameTransliterated: 'Al-Ikhlas', ayahCount: 4, startPage: 604, startJuz: 30, revelationType: 'Meccan' },
  { number: 113, nameArabic: 'الفلق', nameEnglish: 'The Daybreak', nameTransliterated: 'Al-Falaq', ayahCount: 5, startPage: 604, startJuz: 30, revelationType: 'Meccan' },
  { number: 114, nameArabic: 'الناس', nameEnglish: 'Mankind', nameTransliterated: 'An-Nas', ayahCount: 6, startPage: 604, startJuz: 30, revelationType: 'Meccan' }
];

export const CANONICAL_JUZS: CanonicalJuz[] = [
  { juzNumber: 1, startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 141, startPage: 1 },
  { juzNumber: 2, startSurah: 2, startAyah: 142, endSurah: 2, endAyah: 252, startPage: 22 },
  { juzNumber: 3, startSurah: 2, startAyah: 253, endSurah: 3, endAyah: 92, startPage: 42 },
  { juzNumber: 4, startSurah: 3, startAyah: 93, endSurah: 4, endAyah: 23, startPage: 62 },
  { juzNumber: 5, startSurah: 4, startAyah: 24, endSurah: 4, endAyah: 147, startPage: 82 },
  { juzNumber: 6, startSurah: 4, startAyah: 148, endSurah: 5, endAyah: 81, startPage: 102 },
  { juzNumber: 7, startSurah: 5, startAyah: 82, endSurah: 6, endAyah: 110, startPage: 121 },
  { juzNumber: 8, startSurah: 6, startAyah: 111, endSurah: 7, endAyah: 87, startPage: 142 },
  { juzNumber: 9, startSurah: 7, startAyah: 88, endSurah: 8, endAyah: 40, startPage: 162 },
  { juzNumber: 10, startSurah: 8, startAyah: 41, endSurah: 9, endAyah: 92, startPage: 182 },
  { juzNumber: 11, startSurah: 9, startAyah: 93, endSurah: 11, endAyah: 5, startPage: 201 },
  { juzNumber: 12, startSurah: 11, startAyah: 6, endSurah: 12, endAyah: 52, startPage: 222 },
  { juzNumber: 13, startSurah: 12, startAyah: 53, endSurah: 14, endAyah: 52, startPage: 242 },
  { juzNumber: 14, startSurah: 15, startAyah: 1, endSurah: 16, endAyah: 128, startPage: 262 },
  { juzNumber: 15, startSurah: 17, startAyah: 1, endSurah: 18, endAyah: 74, startPage: 282 },
  { juzNumber: 16, startSurah: 18, startAyah: 75, endSurah: 20, endAyah: 135, startPage: 302 },
  { juzNumber: 17, startSurah: 21, startAyah: 1, endSurah: 22, endAyah: 78, startPage: 322 },
  { juzNumber: 18, startSurah: 23, startAyah: 1, endSurah: 25, endAyah: 20, startPage: 342 },
  { juzNumber: 19, startSurah: 25, startAyah: 21, endSurah: 27, endAyah: 55, startPage: 362 },
  { juzNumber: 20, startSurah: 27, startAyah: 56, endSurah: 29, endAyah: 45, startPage: 382 },
  { juzNumber: 21, startSurah: 29, startAyah: 46, endSurah: 33, endAyah: 30, startPage: 402 },
  { juzNumber: 22, startSurah: 33, startAyah: 31, endSurah: 36, endAyah: 27, startPage: 422 },
  { juzNumber: 23, startSurah: 36, startAyah: 28, endSurah: 39, endAyah: 31, startPage: 442 },
  { juzNumber: 24, startSurah: 39, startAyah: 32, endSurah: 41, endAyah: 46, startPage: 462 },
  { juzNumber: 25, startSurah: 41, startAyah: 47, endSurah: 45, endAyah: 37, startPage: 482 },
  { juzNumber: 26, startSurah: 46, startAyah: 1, endSurah: 51, endAyah: 30, startPage: 502 },
  { juzNumber: 27, startSurah: 51, startAyah: 31, endSurah: 57, endAyah: 29, startPage: 522 },
  { juzNumber: 28, startSurah: 58, startAyah: 1, endSurah: 66, endAyah: 12, startPage: 542 },
  { juzNumber: 29, startSurah: 67, startAyah: 1, endSurah: 77, endAyah: 50, startPage: 562 },
  { juzNumber: 30, startSurah: 78, startAyah: 1, endSurah: 114, endAyah: 6, startPage: 582 }
];

export const SAJDAH_LOCATIONS: SajdahLocation[] = [
  { surah: 7, ayah: 206, isObligatory: true },
  { surah: 13, ayah: 15, isObligatory: true },
  { surah: 16, ayah: 50, isObligatory: true },
  { surah: 17, ayah: 109, isObligatory: true },
  { surah: 19, ayah: 58, isObligatory: true },
  { surah: 22, ayah: 18, isObligatory: true },
  { surah: 22, ayah: 77, isObligatory: false },
  { surah: 25, ayah: 60, isObligatory: true },
  { surah: 27, ayah: 26, isObligatory: true },
  { surah: 32, ayah: 15, isObligatory: true },
  { surah: 38, ayah: 24, isObligatory: true },
  { surah: 41, ayah: 38, isObligatory: true },
  { surah: 53, ayah: 62, isObligatory: true },
  { surah: 84, ayah: 21, isObligatory: true },
  { surah: 96, ayah: 19, isObligatory: true }
];

export const TOTAL_SURAHS = 114;
export const TOTAL_AYAHS = 6236;
export const TOTAL_PAGES = 604;
export const TOTAL_JUZS = 30;
