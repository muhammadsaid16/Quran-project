# Quran Cognitive OS
## خطة التنفيذ والمعمارية التقنية — Version 2.0

**Project Type:** Local-First Quran Memorization & Retention Platform  
**Architecture:** PWA / Offline-First  
**Status:** Ready for Technical Implementation  
**Core Philosophy:** Active Recall + Voice-Based Assessment + FSRS  

---

# 1. الرؤية والهدف (Vision & Goals)

بناء منصة معرفية متخصصة في حفظ القرآن الكريم ومراجعته، تعتمد على علوم الذاكرة والاسترجاع النشط، وتستخدم التعرف الصوتي لتحليل تسميع المستخدم بدلًا من الاعتماد على التقييم الذاتي.

الهدف ليس توفير مصحف إلكتروني آخر، بل بناء نظام يستطيع:
1. قياس قدرة المستخدم على استرجاع الآيات.
2. تحديد مواضع النسيان والتعثر.
3. اكتشاف الأخطاء في ترتيب الآيات والكلمات.
4. قياس قوة الروابط بين الآيات والصفحات.
5. تنظيم المراجعة باستخدام FSRS.
6. تقديم خريطة معرفية توضح حالة الحفظ لكل آية ومقطع.

## 1.1 مبادئ المشروع (Core Principles)
* لا توجد أي وسيلة لإدخال النصوص أو كتابة الحروف أثناء التسميع.
* جميع اختبارات الحفظ تعتمد على الصوت.
* معالجة الصوت تتم محليًا على جهاز المستخدم (Zero server audio transmission).
* لا يتم إرسال التسجيلات إلى أي خادم (Privacy-first).
* لا يحتاج التطبيق إلى حساب أو اتصال دائم بالإنترنت.
* لا توجد إعلانات أو اشتراكات أو مشتريات داخل التطبيق.
* سلامة النص القرآني مقدمة على أي اعتبار تقني أو بصري.

---

# 2. القرارات التقنية الأساسية (Technical Stack)

| العنصر | القرار |
| :--- | :--- |
| Framework | Next.js App Router |
| Language | TypeScript |
| UI | React + Tailwind CSS |
| State | Zustand |
| Local Database | IndexedDB + Dexie.js |
| PWA | Service Worker |
| Audio Capture | Web Audio API + AudioWorklet |
| Speech Recognition | Zipformer Quran 3.2 |
| Inference Runtime | sherpa-onnx / ONNX Runtime |
| Memory Scheduling | ts-fsrs |
| Storage | Local-First |
| Synchronization | غير مطلوبة في MVP |

## 2.1 محرك التعرف الصوتي (Speech Recognition Model)
اعتماد: **Quran Lab — Zipformer Quran 3.2**
* 65.5 مليون Parameter.
* 251 رمزًا صوتيًا قرآنيًا.
* Streaming CTC.
* ONNX INT8 (`zipformer_p_arabic_v3.2.int8.onnx`).
* يعمل دون اتصال بالإنترنت.
* مصمم لتلاوة القرآن برواية حفص عن عاصم.
* يتعامل مع الفونيمات والخصائص الصوتية المرتبطة بالتلاوة.

**تنبيه معماري:** الموديل لا يحول التسميع إلى نص عربي عادي. لذلك لن نستخدم مقارنة النصوص التقليدية باعتبارها آلية التقييم الأساسية. سنستخدم المخرجات الصوتية للموديل ونطابقها مع التمثيل الفونيمي المرجعي للقرآن.

## 2.2 متطلبات المعالجة الصوتية (Audio Processing Requirements)
يجب تمرير الصوت إلى الموديل بالشكل التالي:
* Sample Rate: 16,000 Hz.
* Channels: Mono.
* Features: 80-dimensional Kaldi FBank.
* Window: Povey.
* Runtime: Streaming CTC.
* Token Decoding: باستخدام `tokens.txt` الرسمي.
* تحذير: يجب عدم استخدام Mel Spectrogram عادي بدلًا من Kaldi FBank.

## 2.3 شرط التوافق قبل التنفيذ (Milestone 0 Feasibility Gate)
قبل بناء الواجهة النهائية، يجب تنفيذ Proof of Concept للتأكد من إمكانية تشغيل نسخة Zipformer 3.2 داخل WebAssembly باستخدام sherpa-onnx، بما يشمل نموذج Zipformer2 CTC المحدد.
إذا احتاج الأمر إلى بناء نسخة WASM مخصصة، يتم ذلك دون نقل معالجة الصوت إلى خدمة سحابية.

---

# 3. نطاق النسخة الأولى MVP

تتكون النسخة الأولى من ستة محركات أساسية:
1. **Quran Data Engine**: النص المعتمد بالرسم العثماني، الفهرسة، التمثيل الفونيمي المرجعي.
2. **Voice Recognition Engine**: التقاط الصوت، استخراج ميزات Kaldi 80-dim، الاستدلال المباشر عبر WASM.
3. **Phoneme Alignment Engine**: مطابقة الرموز الناتجة مع الفونيمات المرجعية باستخدام CTC alignment / DTW.
4. **Active Recall Engine**: أوضاع الاسترجاع النشط، النص الشبح (Ghost Text)، التسميع الكامل، روابط الانتقال.
5. **FSRS Memory Engine**: جدولة المراجعات المتباعدة باستخدام خوارزمية FSRS (`ts-fsrs`).
6. **Memory Analytics Engine**: الخريطة الحرارية للمصحف (Heatmap)، إحصائيات الاسترجاع والتعثر.

---

# 4. تجربة المستخدم (User Experience)

## 4.1 الشاشة الرئيسية Dashboard
* إجمالي الآيات التي بدأ المستخدم حفظها.
* الآيات المتقنة وفق سجل الاختبارات.
* الآيات المستحقة للمراجعة اليوم (Daily Due Queue).
* المقاطع التي تحتاج إلى تثبيت.
* توزيع حالة الذاكرة في المصحف.
* آخر جلسات التسميع.
* مؤشر التقدم.

## 4.2 أنماط التعلم (Learning Modes)
* **Acquisition Mode (وضع الحفظ الجديد):** اختيار السورة/الآيات، قراءة أولية، إخفاء النص (تدريجي أو كامل)، تسميع صوتي، تحليل فوري وإظهار مواضع التعثر، تكرار حتى الإتقان.
* **Retention Mode (وضع المراجعة المتباعدة):** استخراج البطاقات المستحقة عبر FSRS، عرض نطاق الاختبار دون إظهار الإجابة، تسميع صوتي، تحليل ومطابقة، تقييم FSRS وتحديث الموعد.
* **Transition Mode (اختبار الروابط):** اختبار الانتقال الصوتي السلس بين نهاية آية وبداية التالية، أو عند نهايات الصفحات.

---

# 5. المعمارية الداخلية لمحرك الصوت (Audio Pipeline)

1. **Audio Capture Layer:** Web Audio API + AudioWorklet، أخذ عينات 16kHz Mono.
2. **Feature Extraction Layer:** 80-dimensional Kaldi FBank (Povey window).
3. **Recognition Layer:** WebAssembly sherpa-onnx، تشغيل `zipformer_p_arabic_v3.2.int8.onnx`، استخراج تسلسل الرموز دون استخدام LM يعمي الأخطاء.
4. **Phoneme Alignment Layer:** ربط الرموز بالمرجع الفونيمي (`tokens.txt`, `ordered_quran_phonemes.json`, `quran_text2phoneme.json`).
5. **Error Analysis Engine:** تصنيف الأخطاء (Correct, Omission, Substitution, Repetition, Sequence Error, Uncertain) وربطها بالكلمات القرآنية بدقة.

---

# 6. محرك الاسترجاع النشط (Active Recall Features)
* **Ghost Text:** 3 مستويات (إخفاء كامل، إظهار كلمات مفتاحية، إظهار بداية المقطع).
* **Full Recitation:** سرد المقطع من الذاكرة بالكامل.
* **Context-Decoupled Recall:** اختبار الآية بمعزل عن موقعها أو رقمها.
* **Previous Ayah Recall:** استدعاء الآية السابقة بناء على الحالية.
* **Transition Recall:** تسميع الانتقال بين آيتين متتاليتين.

---

# 7. محرك الذاكرة FSRS Memory Engine
* الاعتماد على مكتبة `ts-fsrs`.
* بطاقات الآيات (Ayah Cards) وبطاقات الانتقال (Transition Cards).
* درجات التقييم (Again=1, Hard=2, Good=3, Easy=4).
* Retention المستهدف الافتراضي: 90%.

---

# 8. مصحف المدينة والخريطة الحرارية (Quran Memory Heatmap)
* مصحف المدينة 15 سطرًا في الصفحة.
* الرسم العثماني المعتمد، الخط والأرقام وعلامات الوقف.
* مؤشر احتمالية الاسترجاع (Retrievability):
  * >= 95%: محايد (متقن).
  * 85% - 94%: أصفر / كهرماني (يحتاج مراجعة).
  * < 85%: برتقالي / أحمر (معرض للنسيان).

---

# 9. المخطط المحلي لقاعدة البيانات (Dexie.js Schema)
* `QuranAyah`: id, surah, ayah, page, juz, text_uthmani, phoneme_sequence, source_version.
* `MemoryCard`: id, target_type, target_id, due, stability, difficulty, reps, lapses, state, last_review.
* `TransitionEdge`: edge_id, from_ayah_id, to_ayah_id, is_page_boundary, stability, difficulty, due.
* `ReviewLog`: log_id, target_id, timestamp, rating, recording_duration_ms, inference_duration_ms, alignment_confidence, error_count, error_positions, result_status.
* `MutashabihatGroup`: بنية مهيأة للمرحلة التالية.

---

# 10. خطة المراحل (Milestones)

* **Milestone 0 — Technical Feasibility Spike:** تجربة Zipformer 3.2 CTC على sherpa-onnx WASM، واستخراج Kaldi FBank، وقياس السرعة واستهلاك الذاكرة.
* **Milestone 1 — Quran Data Foundation:** قاعدة بيانات القرآن بالرسم العثماني والفونيمات المرجعية والتحقق من صحة 6,236 آية.
* **Milestone 2 — Voice Recognition Engine:** خط المعالجة الصوتية الحي في المتصفح.
* **Milestone 3 — Alignment & Error Detection:** خوارزميات المطابقة الفونيمية وتصنيف التعثر والأخطاء.
* **Milestone 4 — Active Recall Interface:** واجهة المصحف والتسميع والنص الشبح.
* **Milestone 5 — FSRS Integration:** دمج `ts-fsrs` وجدولة المراجعات اليومية.
* **Milestone 6 — Analytics & Heatmap:** الخريطة الحرارية للمصحف 15 سطرًا.
* **Milestone 7 — PWA & Full Offline Quality:** تفعيل Service Worker والتخزين المحلي دون إنترنت واختبارات الجودة الشاملة.
