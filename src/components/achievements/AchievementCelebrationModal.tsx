'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  MessageCircle,
  Send,
  Facebook,
  Twitter,
  Image as ImageIcon,
  Lock,
  BookOpen,
  ArrowRight,
  Target,
  AlertCircle,
} from 'lucide-react';
import type { AchievementDefinition, UserAchievement } from '@/db/schema';
import { useSessionStore } from '@/stores/session-store';
import {
  ACHIEVEMENT_TRANSLATIONS,
  TIER_LABELS_ARABIC,
  CATEGORY_LABELS_ARABIC,
} from './achievement-translations';
import { generateAchievementCardPNG } from './achievement-image-generator';
import { toArabicNumerals } from '@/components/mushaf/AyahMarker';

interface AchievementCelebrationModalProps {
  definition: AchievementDefinition;
  data?: UserAchievement;
  currentProgress?: number;
  totalProgress?: number;
  onClose: () => void;
  isNewlyUnlocked?: boolean;
}

export const AchievementCelebrationModal: React.FC<AchievementCelebrationModalProps> = ({
  definition,
  data,
  currentProgress = 0,
  totalProgress,
  onClose,
  isNewlyUnlocked = false,
}) => {
  const { setActiveView } = useSessionStore();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isUnlocked = Boolean(data);

  const translation = ACHIEVEMENT_TRANSLATIONS[definition.id];
  const title = translation?.title || definition.title;
  const description = translation?.description || definition.description;
  const tierLabel = TIER_LABELS_ARABIC[definition.tier] || definition.tier;
  const categoryLabel = CATEGORY_LABELS_ARABIC[definition.category] || definition.category;

  const unlockedAt = data?.unlockedAt;

  // STRICT SECURITY GUARD: ONLY generate PNG image if the achievement is ACTUALLY UNLOCKED
  useEffect(() => {
    if (!isUnlocked) return;

    let active = true;
    const generate = async () => {
      setIsGenerating(true);
      try {
        const blob = await generateAchievementCardPNG({
          title,
          description,
          tier: definition.tier,
          tierLabel,
          unlockedAt,
          appName: 'باب الإتقان',
          categoryLabel,
        });
        if (active) {
          setImageBlob(blob);
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate achievement PNG:', err);
      } finally {
        if (active) setIsGenerating(false);
      }
    };

    generate();

    return () => {
      active = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [isUnlocked, definition, title, description, tierLabel, unlockedAt, categoryLabel]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleDownloadPNG = () => {
    if (!isUnlocked || !imageUrl) {
      showToast('⚠️ لا يمكن تحميل بطاقة إنجاز لم يتم تحقيقه بعد!');
      return;
    }
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `إنجاز-${title.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('تم تحميل بطاقة الإنجاز (PNG) بنجاح! 📥');
  };

  const handleCopyImage = async () => {
    if (!isUnlocked || !imageBlob) {
      showToast('⚠️ لا يمكن مشاركة وسام لم يتم إنجازه بعد!');
      return;
    }
    try {
      if (navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': imageBlob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        showToast('تم نسخ صورة الإنجاز (PNG) إلى الحافظة! يمكنك لصقها الآن مباشرة 📋✨');
      } else {
        handleDownloadPNG();
      }
    } catch (err) {
      console.warn('Clipboard write failed, downloading instead:', err);
      handleDownloadPNG();
    }
  };

  const shareText = `الحمد لله! حققت وسام «${title}» (${tierLabel}) في منصة «باب الإتقان»: ${description} ✨ #باب_الإتقان #حفظ_القرآن`;
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://babalitqan.local';

  const handleShareApp = (platform: 'whatsapp' | 'discord' | 'facebook' | 'twitter' | 'telegram') => {
    if (!isUnlocked) {
      showToast('⚠️ هذا الوسام مغلق؛ لا يمكن مشاركته إلا بعد تحقيقه!');
      return;
    }

    if (platform === 'discord') {
      handleCopyImage();
      const discordText = `**🏆 إنجاز جديد في منصة «باب الإتقان»!**\n> **${title}** (${tierLabel})\n> ${description}\n*(تم نسخ صورة الإنجاز PNG إلى الحافظة، الصقها بـ Ctrl+V)*`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(discordText);
      }
      showToast('تم تجهيز صورة الإنجاز ونصه لديسكورد! الصقها الآن بـ Ctrl+V في القناة 💬');
      return;
    }

    handleCopyImage();

    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      showToast(`تم فتح التطبيق ونسخ صورة الإنجاز (PNG) لإرفاقها! ✨`);
    }
  };

  const tierGlow = {
    bronze: 'from-amber-600/20 via-amber-500/10 to-transparent border-amber-500/40 text-amber-500',
    silver: 'from-slate-400/20 via-slate-300/10 to-transparent border-slate-400/40 text-slate-300',
    gold: 'from-yellow-500/25 via-amber-500/15 to-transparent border-yellow-500/50 text-yellow-400',
    diamond: 'from-cyan-500/25 via-blue-500/15 to-transparent border-cyan-500/50 text-cyan-400',
  }[definition.tier];

  const progressPercentage = Math.min(
    100,
    Math.round(((currentProgress || 0) / definition.threshold) * 100)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 pt-20 pb-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg my-auto max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-mushaf-surface dark:bg-darkMushaf-card border-2 border-mushaf-gold/40 dark:border-darkMushaf-gold/50 rounded-3xl shadow-2xl font-arabic transition-all scrollbar-thin">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 inset-x-4 z-50 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 animate-bounce">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 z-20 p-2 rounded-xl text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Ambient Glow Banner */}
        <div className={`w-full py-8 px-6 bg-gradient-to-b ${
          isUnlocked
            ? tierGlow
            : 'from-slate-700/20 via-slate-800/10 to-transparent border-slate-700/60 text-slate-400'
        } flex flex-col items-center text-center relative border-b border-mushaf-border/40 dark:border-darkMushaf-border/60`}>
          
          {/* Newly Unlocked Celebration Badge */}
          {isNewlyUnlocked && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mushaf-emerald text-white shadow-md mb-3 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>إنجاز جديد تم فتحه للتو! ما شاء الله</span>
            </div>
          )}

          {/* Central Trophy or Lock */}
          <div className="relative my-2">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-900 border-2 ${
              isUnlocked ? 'border-mushaf-gold shadow-xl' : 'border-slate-300 dark:border-slate-700 shadow-md'
            } flex items-center justify-center text-4xl sm:text-5xl transform hover:scale-105 transition-transform`}>
              {isUnlocked ? (
                '🏆'
              ) : (
                <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500" />
              )}
            </div>
            <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold ${
              isUnlocked
                ? 'bg-mushaf-gold text-slate-950 shadow-sm'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
            } whitespace-nowrap`}>
              {isUnlocked ? `وسام ${tierLabel}` : `وسام مغلق (${tierLabel})`}
            </div>
          </div>

          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-mushaf-ink dark:text-white">
            « {title} »
          </h2>

          <p className="mt-1 text-xs text-mushaf-emerald dark:text-emerald-400 font-semibold">
            قسم {categoryLabel}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border dark:border-darkMushaf-border text-center space-y-2">
            <p className="text-sm text-mushaf-ink dark:text-slate-200 leading-relaxed font-medium">
              {description}
            </p>
            {isUnlocked && unlockedAt ? (
              <p className="text-[11px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                تاريخ الإنجاز: {new Date(unlockedAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            ) : (
              <div className="pt-2 text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>لم يتم فتح هذا الوسام بعد؛ واصل التسميع لبلوغه!</span>
              </div>
            )}
          </div>

          {/* If Locked: Show Progress Bar & Call to Action (NO SHARING ALLOWED) */}
          {!isUnlocked ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-mushaf-ink dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-mushaf-gold" />
                    <span>التقدم نحو هذا الوسام:</span>
                  </span>
                  <span>
                    %{toArabicNumerals(progressPercentage)} ({toArabicNumerals(currentProgress)} / {toArabicNumerals(definition.threshold)})
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${progressPercentage}%` }}
                    className="h-full bg-mushaf-gold rounded-full transition-all duration-500"
                  />
                </div>

                <p className="text-[11px] text-mushaf-ink-muted dark:text-slate-400 text-center">
                  متبقي {toArabicNumerals(Math.max(0, definition.threshold - currentProgress))} إنجاز لفتح الوسام رسمياً
                </p>
              </div>

              {/* Action Button: Recite Now */}
              <button
                type="button"
                onClick={() => {
                  setActiveView('mushaf');
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-mushaf-emerald hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <BookOpen className="w-4 h-4" />
                <span>ابدأ التسميع الآن في المصحف لتحقيق هذا الوسام</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-center text-mushaf-ink-muted dark:text-slate-500">
                🔒 لا يمكن مشاركة الوسام أو إصدار بطاقة التهنئة إلا بعد تحقيقه وإنجازه رسمياً بالتسميع.
              </p>
            </div>
          ) : (
            /* If Unlocked: Show PNG Preview & Sharing Options */
            <div className="space-y-4">
              {/* Preview of the Generated PNG Card */}
              {imageUrl && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-mushaf-ink-muted dark:text-darkMushaf-ink-muted flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>معاينة بطاقة الإنجاز الموثقة (PNG):</span>
                  </span>
                  <div className="rounded-xl overflow-hidden border border-mushaf-border dark:border-darkMushaf-border shadow-md">
                    <img
                      src={imageUrl}
                      alt={`بطاقة إنجاز ${title}`}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Share Section Actions */}
              {!showShareMenu ? (
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareMenu(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-mushaf-emerald hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>شارك مع أصدقائك (PNG ومواقع التواصل)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPNG}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink font-bold text-sm border border-mushaf-border dark:border-darkMushaf-border transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4 text-mushaf-gold" />
                    <span>تحميل PNG</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1 border-t border-mushaf-border/60 dark:border-darkMushaf-border">
                  <div className="flex items-center justify-between text-xs font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                    <span>اختر التطبيق للمشاركة:</span>
                    <button
                      type="button"
                      onClick={() => setShowShareMenu(false)}
                      className="text-mushaf-ink-muted hover:text-mushaf-ink dark:hover:text-white text-[11px]"
                    >
                      إخفاء التطبيقات
                    </button>
                  </div>

                  {/* Social Channels Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    
                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleShareApp('whatsapp')}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 transition-all text-xs font-bold active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>واتساب (WhatsApp)</span>
                    </button>

                    {/* Discord */}
                    <button
                      type="button"
                      onClick={() => handleShareApp('discord')}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25 transition-all text-xs font-bold active:scale-95"
                    >
                      <Send className="w-4 h-4 text-indigo-600" />
                      <span>ديسكورد (Discord)</span>
                    </button>

                    {/* Telegram */}
                    <button
                      type="button"
                      onClick={() => handleShareApp('telegram')}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/25 transition-all text-xs font-bold active:scale-95"
                    >
                      <Send className="w-4 h-4 text-sky-500" />
                      <span>تيليجرام (Telegram)</span>
                    </button>

                    {/* Facebook */}
                    <button
                      type="button"
                      onClick={() => handleShareApp('facebook')}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/25 transition-all text-xs font-bold active:scale-95"
                    >
                      <Facebook className="w-4 h-4 text-blue-600" />
                      <span>فيسبوك (Facebook)</span>
                    </button>

                    {/* X / Twitter */}
                    <button
                      type="button"
                      onClick={() => handleShareApp('twitter')}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-800 dark:text-slate-300 border border-slate-500/25 transition-all text-xs font-bold active:scale-95"
                    >
                      <Twitter className="w-4 h-4" />
                      <span>منصة إكس (Twitter)</span>
                    </button>

                    {/* Copy Image / Clipboard */}
                    <button
                      type="button"
                      onClick={handleCopyImage}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-mushaf-gold/15 hover:bg-mushaf-gold/25 text-mushaf-ink dark:text-darkMushaf-gold border border-mushaf-gold/30 transition-all text-xs font-bold active:scale-95"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-mushaf-gold" />}
                      <span>{copied ? 'تم النسخ!' : 'نسخ الصورة (PNG)'}</span>
                    </button>
                  </div>

                  {/* Direct PNG download button */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadPNG}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mushaf-emerald text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل بطاقة الإنجاز كصورة PNG مع اسم التطبيق</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
