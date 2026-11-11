'use client';

import React from 'react';
import { usePWAStore } from '@/stores/pwa-store';
import {
  OFFLINE_PACKAGE_CATEGORIES,
  TOTAL_OFFLINE_SIZE_MB,
  OfflinePackageCategory,
} from '@/lib/offline-installer';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  Brain,
  Cpu,
  BookOpen,
  Type,
  Volume2,
  Database,
  Smartphone,
  HardDrive,
  WifiOff,
  Trash2,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface InstallOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallOfflineModal: React.FC<InstallOfflineModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    isOfflinePackageInstalled,
    downloadStatus,
    downloadProgress,
    downloadError,
    startOfflineDownload,
    deleteOfflinePackage,
    isStoragePersisted,
    requestPersistentStorage,
  } = usePWAStore();

  if (!isOpen) return null;

  const isDownloading = downloadStatus === 'downloading';
  const isCompleted = isOfflinePackageInstalled || downloadStatus === 'completed';

  const renderCategoryIcon = (icon: OfflinePackageCategory['icon']) => {
    switch (icon) {
      case 'brain':
        return <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'cpu':
        return <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'book':
        return <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'type':
        return <Type className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'volume':
        return <Volume2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'database':
        return <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'smartphone':
        return <Smartphone className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      default:
        return <HardDrive className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDownloading) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-16 sm:pt-20 pb-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl my-auto max-h-[calc(100vh-5rem)] overflow-y-auto bg-mushaf-surface dark:bg-darkMushaf-card border-2 border-mushaf-gold/40 dark:border-darkMushaf-gold/50 rounded-3xl shadow-2xl font-arabic transition-all scrollbar-thin">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDownloading}
          className="absolute top-4 left-4 z-20 p-2 rounded-xl text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
          aria-label="إغلاق النافذة"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Ambient Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-mushaf-emerald/15 dark:from-mushaf-emerald/25 via-transparent to-transparent border-b border-mushaf-border dark:border-darkMushaf-border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-mushaf-emerald to-emerald-800 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Download className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-mushaf-gold/20 text-mushaf-gold dark:text-darkMushaf-gold border border-mushaf-gold/30">
                  تشغيل أوفلاين كامل (Local-First)
                </span>
                {isCompleted && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>مثبت ومحفوظ</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-mushaf-ink dark:text-darkMushaf-ink mt-1.5 leading-snug">
                تثبيت المنصة وتحميل موارد العمل بدون إنترنت
              </h2>
              <p className="text-xs sm:text-sm text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mt-1 leading-relaxed">
                حزمة التشغيل المحلية لتحويل «باب الإتقان» إلى برنامج يعمل بكامل وظائفه الذكية
                (التعرف الصوتي، نطق الكلمات، والرسم العثماني) دون الحاجة للاتصال بالإنترنت نهائياً.
              </p>
            </div>
          </div>

          {/* Top Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-5">
            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-mushaf-border/60 dark:border-darkMushaf-border flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-mushaf-emerald" />
              <div>
                <div className="text-[10px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">إجمالي المساحة</div>
                <div className="text-xs sm:text-sm font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                  ~{TOTAL_OFFLINE_SIZE_MB} ميجابايت
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-mushaf-border/60 dark:border-darkMushaf-border flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 text-amber-500" />
              <div>
                <div className="text-[10px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">العمل بدون شبكة</div>
                <div className="text-xs sm:text-sm font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                  100% محلياً
                </div>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-mushaf-border/60 dark:border-darkMushaf-border flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-mushaf-gold" />
              <div>
                <div className="text-[10px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">الخصوصية والأمان</div>
                <div className="text-xs sm:text-sm font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                  تسميع مشفر بجهازك
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Package Contents Breakdown */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-mushaf-ink dark:text-darkMushaf-ink">
              مكونات الحزمة والمساحة المقدرة لكل عنصر:
            </h3>
            <span className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              {OFFLINE_PACKAGE_CATEGORIES.length} عناصر رئيسية
            </span>
          </div>

          <div className="space-y-2.5">
            {OFFLINE_PACKAGE_CATEGORIES.map((category) => {
              const isCategoryCompleted =
                isCompleted ||
                (downloadProgress?.completedCategories.includes(category.id) ?? false);
              const isCategoryActive =
                isDownloading && downloadProgress?.currentCategoryTitle === category.title;

              return (
                <div
                  key={category.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCategoryActive
                      ? 'bg-mushaf-emerald/5 border-mushaf-emerald shadow-sm'
                      : isCategoryCompleted
                      ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-mushaf-parchment/40 dark:bg-darkMushaf-surface/40 border-mushaf-border/60 dark:border-darkMushaf-border/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 shadow-2xs flex-shrink-0 mt-0.5">
                      {renderCategoryIcon(category.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-mushaf-ink dark:text-darkMushaf-ink truncate">
                            {category.title}
                          </h4>
                          <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                            {category.badge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-bold text-mushaf-ink dark:text-darkMushaf-ink font-mono">
                            {category.sizeMB} MB
                          </span>
                          {isCategoryCompleted && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          )}
                          {isCategoryActive && (
                            <Loader2 className="w-4 h-4 text-mushaf-emerald animate-spin flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] sm:text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mt-1 leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Download Progress Box */}
          {isDownloading && downloadProgress && (
            <div className="p-4 sm:p-5 rounded-2xl bg-mushaf-emerald/10 border-2 border-mushaf-emerald text-mushaf-ink dark:text-darkMushaf-ink animate-pulse-subtle">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-2">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-mushaf-emerald" />
                  <span>جاري التحميل والتخزين المحلي...</span>
                </span>
                <span className="font-mono text-mushaf-emerald text-base font-extrabold">
                  {downloadProgress.percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-l from-mushaf-emerald to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mt-2">
                <span className="truncate max-w-[260px] sm:max-w-md">
                  الملف الحالي: <strong className="text-mushaf-ink dark:text-darkMushaf-ink">{downloadProgress.currentFileName}</strong>
                </span>
                <span className="font-mono flex-shrink-0 font-semibold">
                  {downloadProgress.downloadedMB} / {downloadProgress.totalMB} MB
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {downloadError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">حدث خطأ أثناء تحميل الحزمة</p>
                <p className="mt-0.5">{downloadError}</p>
              </div>
            </div>
          )}

          {/* Completion Celebration Card */}
          {isCompleted && !isDownloading && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-100 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs sm:text-sm">
                <p className="font-bold text-sm sm:text-base">
                  تم تثبيت وتحميل كافة موارد المنصة بنجاح! 🎉
                </p>
                <p className="mt-1 leading-relaxed text-emerald-800 dark:text-emerald-200">
                  جميع ملفات الذكاء الاصطناعي، ومحرك التسميع، والخطوط العثمانية، ونطق الكلمات
                  محفوظة الآن في ذاكرة المتصفح الدائمة. يمكنك استخدام المنصة وإجراء التسميع
                  الكامل حتى في وضع الطيران أو عند انقطاع الإنترنت نهائياً.
                </p>
              </div>
            </div>
          )}

          {/* Storage Persistence Notice */}
          {!isStoragePersisted && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>قم بتفعيل «التخزين الدائم» لضمان عدم مسح المتصفح للملفات تلقائياً.</span>
              </div>
              <button
                type="button"
                onClick={requestPersistentStorage}
                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors whitespace-nowrap text-[11px]"
              >
                تفعيل الآن
              </button>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-6 bg-mushaf-parchment/60 dark:bg-darkMushaf-surface/60 border-t border-mushaf-border dark:border-darkMushaf-border flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {isCompleted ? (
            <button
              type="button"
              onClick={deleteOfflinePackage}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-500/10 dark:text-red-400 border border-transparent hover:border-red-500/20 text-xs font-bold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>إلغاء التثبيت وتفريغ المساحة</span>
            </button>
          ) : (
            <div className="text-[11px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted text-center sm:text-right">
              ينصح بالتحميل عبر شبكة واي فاي مستقرة.
            </div>
          )}

          <div className="w-full sm:w-auto flex items-center gap-2">
            {isCompleted ? (
              <>
                <button
                  type="button"
                  onClick={startOfflineDownload}
                  disabled={isDownloading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-black/5 dark:hover:bg-white/10 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-bold transition-all disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة التحقق والتحميل</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-mushaf-emerald hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
                >
                  إغلاق ومتابعة الحفظ
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDownloading}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={startOfflineDownload}
                  disabled={isDownloading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-mushaf-emerald hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحميل...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>بدء التثبيت والتحميل الكامل (~{TOTAL_OFFLINE_SIZE_MB} MB)</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
