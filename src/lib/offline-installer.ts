/**
 * باب الإتقان — Offline Package & Installation Service
 *
 * Manages downloading, pre-caching, and verifying all local resources required
 * to run Quran Cognitive OS 100% offline without any internet connection.
 *
 * Includes:
 * 1. FastConformer STT Neural Network (83.0 MB)
 * 2. Sherpa-WASM & Audio Worklet Runtime (13.3 MB)
 * 3. Lexicon & Phoneme Token Alignment Bounds (0.8 MB)
 * 4. Authentic King Fahd Complex Quranic Fonts (0.45 MB)
 * 5. Word-by-Word Recitation Audio (Surah Al-Fatiha + on-demand caching)
 * 6. App Shell, Medina Pages, Dexie DB & PWA Manifest
 */

export interface OfflineResourceFile {
  url: string;
  expectedSize: number;
  label: string;
  isOptional?: boolean;
}

export interface OfflinePackageCategory {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  sizeMB: number;
  sizeBytes: number;
  badge: string;
  icon: 'brain' | 'cpu' | 'book' | 'type' | 'volume' | 'database' | 'smartphone';
  files: OfflineResourceFile[];
}

export interface DownloadProgress {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  downloadedMB: number;
  totalMB: number;
  currentFileName: string;
  currentCategoryTitle: string;
  completedCategories: string[];
}

export const CACHE_NAME = 'quran-cognitive-os-v2';
export const OFFLINE_INSTALLED_STORAGE_KEY = 'babalitqan_offline_installed_v2';

// 29 Word audio files for Surah Al-Fatiha from Quran.com CDN
const FATIHA_WORD_COUNTS = [4, 4, 2, 3, 4, 3, 9];
const FATIHA_AUDIO_FILES: OfflineResourceFile[] = [];
FATIHA_WORD_COUNTS.forEach((count, ayahIdx) => {
  const a = ayahIdx + 1;
  for (let w = 1; w <= count; w++) {
    const sStr = '001';
    const aStr = String(a).padStart(3, '0');
    const wStr = String(w).padStart(3, '0');
    FATIHA_AUDIO_FILES.push({
      url: `https://audio.qurancdn.com/wbw/${sStr}_${aStr}_${wStr}.mp3`,
      expectedSize: 22000,
      label: `نطق كلمة (${a}:${w}) سورة الفاتحة`,
      isOptional: true,
    });
  }
});

export const OFFLINE_PACKAGE_CATEGORIES: OfflinePackageCategory[] = [
  {
    id: 'ai_model',
    title: 'نموذج الذكاء الاصطناعي الصوتي (FastConformer ASR)',
    subtitle: 'محرك التسميع والتعرف على التلاوة القرآنية',
    description:
      'نموذج شبكة عصبية هجينة عالي الدقة يعمل محلياً بالكامل لتحويل التلاوة الصوتية مباشرة إلى نص عربي مشكول دون إرسال أي صوت لخوادم خارجية، مع خصوصية تامة وسرعة استجابة فائقة.',
    sizeMB: 83.0,
    sizeBytes: 86995970,
    badge: 'نموذج الذكاء الاصطناعي',
    icon: 'brain',
    files: [
      {
        url: '/models/fastconformer/qurankarim-fastconformer-mixed.onnx',
        expectedSize: 86983112,
        label: 'نموذج FastConformer المشكول (ONNX)',
      },
      {
        url: '/models/fastconformer/tokens.txt',
        expectedSize: 12858,
        label: 'قاموس الرموز والحروف الصوتية (Tokens)',
      },
    ],
  },
  {
    id: 'wasm_runtime',
    title: 'محرك المعالجة الصوتية بالمتصفح (Sherpa-WASM)',
    subtitle: 'نواة تشغيل النماذج ومعالجة الترددات',
    description:
      'بيئة تشغيل WebAssembly فائقة الكفاءة لمعالجة الإشارات الصوتية ومطابقة مخارج الحروف وترددات 16kHz وحساب الطاقة الصوتية RMS دون استهلاك لموارد المعالج أو البطارية.',
    sizeMB: 13.3,
    sizeBytes: 13943540,
    badge: 'محرك التشغيل البرمجي',
    icon: 'cpu',
    files: [
      {
        url: '/sherpa-wasm/prebuilt/asr.wasm',
        expectedSize: 13788938,
        label: 'ملف التجميع الثنائي للتعرف الصوتي (ASR WASM)',
      },
      {
        url: '/sherpa-wasm/index.js',
        expectedSize: 52833,
        label: 'مشغل Sherpa WASM Loader',
      },
      {
        url: '/sherpa-wasm/asr-B3QtWJoU.js',
        expectedSize: 96808,
        label: 'محرك استدعاء مهام الاستدلال الصوتي',
      },
      {
        url: '/audio-processors/audio-capture-processor.js',
        expectedSize: 4961,
        label: 'معالج AudioWorklet لتسجيل الميكروفون عالي التردد',
      },
    ],
  },
  {
    id: 'word_bounds',
    title: 'فهرس وحدود الكلمات القرآنية والمطابقة الفونيمية',
    subtitle: 'تحديد مواضع الكلمات وأخطاء التلاوة',
    description:
      'فهرس شامل يربط كل كلمة من كلمات المصحف البالغ عددها 77,430 كلمة بموضعها الزمني والصوتي، لاكتشاف أخطاء السقط أو الإبدال والتوقفات غير الصحيحة لحظياً أثناء القراءة.',
    sizeMB: 0.8,
    sizeBytes: 822296,
    badge: 'الفهرس القرآني',
    icon: 'book',
    files: [
      {
        url: '/models/word_token_bounds.json',
        expectedSize: 822296,
        label: 'فهرس وحدود الكلمات القرآنية بالكامل',
      },
    ],
  },
  {
    id: 'fonts',
    title: 'خطوط المصحف الشريف العثمانية الأصلية',
    subtitle: 'مجمع الملك فهد لطباعة المصحف الشريف بالمدينة النبوية',
    description:
      'حزمة الخطوط الرسمية المعتمدة لطباعة مصحف المدينة برواية حفص عن عاصم، متضمنة جميع علامات الوقف وضبط التجويد وتراكيب الحركات العثمانية دون تشويه أو تقطع.',
    sizeMB: 0.45,
    sizeBytes: 445368,
    badge: 'الرسم العثماني',
    icon: 'type',
    files: [
      {
        url: '/fonts/UthmanicHafs1_Ver09_fixed.woff2',
        expectedSize: 90788,
        label: 'خط حفص العثماني المعدل المعتمد',
      },
      {
        url: '/fonts/AmiriQuran-Regular.woff2',
        expectedSize: 45680,
        label: 'خط المصحف الأميري عالي الضبط',
      },
      {
        url: '/fonts/UthmanTN1_Ver10.woff2',
        expectedSize: 68528,
        label: 'خط عثمان طه النسخي',
      },
      {
        url: '/fonts/UthmanTN1B_Ver10.woff2',
        expectedSize: 67216,
        label: 'خط عثمان طه النسخي العريض',
      },
      {
        url: '/fonts/Symbols1_Ver02.woff2',
        expectedSize: 173156,
        label: 'علامات وفواصل الآيات وأرقام السور',
      },
    ],
  },
  {
    id: 'word_audio',
    title: 'النطق الصوتي للكلمات (الشيخ محمود خليل الحصري)',
    subtitle: 'نطق الكلمات المفردة والمطابقة اللفظية',
    description:
      'حزمة النطق الصوتي الأصيل لكلمات الفاتحة وقصار السور لضبط مخارج الحروف، مع التخزين التلقائي الذكي لأي صفحة يراجعها الحافظ، والاعتماد على محرك التوليد الصوتي للمتصفح عند غياب النت.',
    sizeMB: 0.6,
    sizeBytes: 638000,
    badge: 'نطق الكلمات',
    icon: 'volume',
    files: FATIHA_AUDIO_FILES,
  },
  {
    id: 'quran_database',
    title: 'بيانات المصحف الشريف ونظام التكرار FSRS',
    subtitle: '6,236 آية، 604 صفحة، 114 سورة، 30 جزءاً',
    description:
      'قاعدة البيانات الكاملة مفهرسة محلياً داخل المتصفح (IndexedDB)، متضمنة تقسيمات المصحف، خوارزمية التكرار المتباعد FSRS لحساب احتمالية الاسترجاع، وسجل جلسات التسميع.',
    sizeMB: 2.8,
    sizeBytes: 2936000,
    badge: 'قاعدة البيانات',
    icon: 'database',
    files: [], // Stored inside IndexedDB directly
  },
  {
    id: 'pwa_shell',
    title: 'تطبيق الويب التقدمي (PWA) وأيقونات المنصة',
    subtitle: 'تشغيل المنصة كبرنامج مستقل بملء الشاشة',
    description:
      'ملف التعريف Manifest وشعار المحراب الأصيل وأيقونات التطبيق، لتثبيت منصة «باب الإتقان» كبرنامج رسمي على شاشة سطح المكتب في الحاسوب أو الهاتف المحمول للفتح الفوري.',
    sizeMB: 0.05,
    sizeBytes: 52000,
    badge: 'تطبيق سطح المكتب والهاتف',
    icon: 'smartphone',
    files: [
      {
        url: '/manifest.webmanifest',
        expectedSize: 733,
        label: 'ملف تعريف تطبيق الويب التقدمي (Manifest)',
      },
      {
        url: '/icons/mihrab-logo.svg',
        expectedSize: 730,
        label: 'شعار المحراب القرآني',
      },
      {
        url: '/icons/icon-192x192.svg',
        expectedSize: 718,
        label: 'أيقونة التطبيق (192x192)',
      },
      {
        url: '/icons/icon-512x512.svg',
        expectedSize: 705,
        label: 'أيقونة التطبيق عالية الدقة (512x512)',
      },
    ],
  },
];

export const TOTAL_OFFLINE_SIZE_BYTES = OFFLINE_PACKAGE_CATEGORIES.reduce(
  (sum, cat) => sum + cat.sizeBytes,
  0
);

export const TOTAL_OFFLINE_SIZE_MB = Number(
  (TOTAL_OFFLINE_SIZE_BYTES / (1024 * 1024)).toFixed(1)
);

/**
 * Checks if the offline package is currently cached in the browser.
 */
export async function isOfflinePackageCached(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Fast path: localStorage indicator
  try {
    if (localStorage.getItem(OFFLINE_INSTALLED_STORAGE_KEY) === 'true') {
      return true;
    }
  } catch {
    // Ignore storage errors
  }

  // Verification path: check if cache contains the FastConformer model
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(
        '/models/fastconformer/qurankarim-fastconformer-mixed.onnx'
      );
      if (match) {
        try {
          localStorage.setItem(OFFLINE_INSTALLED_STORAGE_KEY, 'true');
        } catch {
          // Ignore storage set errors
        }
        return true;
      }
    } catch {
      // Ignore cache match errors
    }
  }

  return false;
}

/**
 * Downloads and caches all required offline files with byte-level progress reporting.
 */
export async function downloadAndCacheOfflinePackage(
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Request storage persistence if available so the browser doesn't evict the cache
  if (navigator.storage && navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch {
      // Ignore persistence rejection
    }
  }

  const cache = typeof caches !== 'undefined' ? await caches.open(CACHE_NAME) : null;
  const completedCategories: string[] = [];
  let downloadedBytes = 0;

  for (const category of OFFLINE_PACKAGE_CATEGORIES) {
    if (signal?.aborted) {
      throw new Error('تم إلغاء عملية التثبيت والتحميل من قبل المستخدم');
    }

    // Skip categories that don't have direct files to download (e.g. IndexedDB)
    if (category.files.length === 0) {
      downloadedBytes += category.sizeBytes;
      completedCategories.push(category.id);
      if (onProgress) {
        onProgress({
          percent: Math.min(
            100,
            Math.round((downloadedBytes / TOTAL_OFFLINE_SIZE_BYTES) * 100)
          ),
          downloadedBytes,
          totalBytes: TOTAL_OFFLINE_SIZE_BYTES,
          downloadedMB: Number((downloadedBytes / (1024 * 1024)).toFixed(1)),
          totalMB: TOTAL_OFFLINE_SIZE_MB,
          currentFileName: category.title,
          currentCategoryTitle: category.title,
          completedCategories: [...completedCategories],
        });
      }
      continue;
    }

    for (const file of category.files) {
      if (signal?.aborted) {
        throw new Error('تم إلغاء عملية التثبيت والتحميل من قبل المستخدم');
      }

      if (onProgress) {
        onProgress({
          percent: Math.min(
            100,
            Math.round((downloadedBytes / TOTAL_OFFLINE_SIZE_BYTES) * 100)
          ),
          downloadedBytes,
          totalBytes: TOTAL_OFFLINE_SIZE_BYTES,
          downloadedMB: Number((downloadedBytes / (1024 * 1024)).toFixed(1)),
          totalMB: TOTAL_OFFLINE_SIZE_MB,
          currentFileName: file.label,
          currentCategoryTitle: category.title,
          completedCategories: [...completedCategories],
        });
      }

      try {
        const response = await fetch(file.url, { signal });
        if (!response.ok) {
          if (file.isOptional) {
            // Optional files (e.g. sample audio) can fail without failing the whole install
            downloadedBytes += file.expectedSize;
            continue;
          }
          throw new Error(`فشل تحميل الملف: ${file.label} (رمز الخطأ: ${response.status})`);
        }

        let blob: Blob;

        // Stream reader for live byte-level progress reporting
        if (response.body && typeof response.body.getReader === 'function') {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              downloadedBytes += value.length;
              if (onProgress) {
                onProgress({
                  percent: Math.min(
                    100,
                    Math.round((downloadedBytes / TOTAL_OFFLINE_SIZE_BYTES) * 100)
                  ),
                  downloadedBytes,
                  totalBytes: TOTAL_OFFLINE_SIZE_BYTES,
                  downloadedMB: Number((downloadedBytes / (1024 * 1024)).toFixed(1)),
                  totalMB: TOTAL_OFFLINE_SIZE_MB,
                  currentFileName: file.label,
                  currentCategoryTitle: category.title,
                  completedCategories: [...completedCategories],
                });
              }
            }
          }

          blob = new Blob(chunks as unknown as BlobPart[], {
            type: response.headers.get('content-type') || 'application/octet-stream',
          });
        } else {
          blob = await response.blob();
          downloadedBytes += blob.size;
        }

        // Save into Cache Storage
        if (cache) {
          await cache.put(
            file.url,
            new Response(blob, {
              status: 200,
              statusText: 'OK',
              headers: response.headers,
            })
          );
        }
      } catch (err) {
        if (signal?.aborted) throw err;
        if (file.isOptional) {
          downloadedBytes += file.expectedSize;
          continue;
        }
        console.error(`[Offline Installer] Error caching ${file.url}:`, err);
        throw err;
      }
    }

    completedCategories.push(category.id);
  }

  // Mark as fully installed
  try {
    localStorage.setItem(OFFLINE_INSTALLED_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage write error
  }

  if (onProgress) {
    onProgress({
      percent: 100,
      downloadedBytes: TOTAL_OFFLINE_SIZE_BYTES,
      totalBytes: TOTAL_OFFLINE_SIZE_BYTES,
      downloadedMB: TOTAL_OFFLINE_SIZE_MB,
      totalMB: TOTAL_OFFLINE_SIZE_MB,
      currentFileName: 'اكتمل التحميل والتثبيت بنجاح',
      currentCategoryTitle: 'تم إعداد كل الموارد',
      completedCategories: OFFLINE_PACKAGE_CATEGORIES.map((c) => c.id),
    });
  }

  return true;
}

/**
 * Removes cached offline package files to free up disk space if requested by the user.
 */
export async function clearOfflinePackage(): Promise<void> {
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      for (const req of keys) {
        const url = new URL(req.url);
        if (
          url.pathname.startsWith('/models/') ||
          url.pathname.startsWith('/sherpa-wasm/') ||
          url.pathname.startsWith('/fonts/') ||
          url.hostname === 'audio.qurancdn.com'
        ) {
          await cache.delete(req);
        }
      }
    } catch (err) {
      console.warn('[Offline Installer] Cache clear error:', err);
    }
  }

  try {
    localStorage.removeItem(OFFLINE_INSTALLED_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
