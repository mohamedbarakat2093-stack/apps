import React, { useState } from 'react';
import { X, Tv, Download, Copy, Check, ExternalLink, ShieldCheck, Zap, AlertCircle, Smartphone } from 'lucide-react';

interface ApkInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl?: string;
}

export const ApkInstallModal: React.FC<ApkInstallModalProps> = ({
  isOpen,
  onClose,
  appUrl,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = window.location.origin;

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(currentOrigin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      id="apk-guide-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="apk-guide-modal-content"
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 text-right my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">تثبيت AudioCast على الرسيفر والموبايل</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Android 6.0 - 15
                </span>
              </div>
              <p className="text-xs text-slate-400">Created by Eng: Mohamed Barakat • مدمج بمشغل ExoPlayer Media3</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compatibility badge */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-2">
            <Tv className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">أجهزة الرسيفر و TV Box</div>
              <div className="text-[10px] text-slate-400">ريموت كنترول، أزرار D-pad والأرقام 0-9</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="font-bold text-white">الموبايل والتابلت</div>
              <div className="text-[10px] text-slate-400">تشغيل بالخلفية وإشعارات الوسائط</div>
            </div>
          </div>
        </div>

        {/* Method 1: The fastest direct method on Receiver / TV (No APK file transfer needed) */}
        <div className="p-4 bg-gradient-to-br from-slate-800/90 to-slate-900 border-2 border-emerald-500/50 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs">1</span>
              <span>الطريقة الفورية على الرسيفر أو الموبايل (تثبيت مباشر)</span>
            </div>
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
              الأسرع بدون كمبيوتر
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            يعمل مباشرة عبر متصفح الرسيفر (مثل <strong>Downloader</strong> أو <strong>Chrome</strong> أو <strong>TV Bro</strong>) أو متصفح الموبايل:
          </p>

          <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pr-1">
            <li>افتح المتصفح على جهازك وادخل على الرابط التالي:</li>
          </ol>

          <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-emerald-400 font-mono text-xs select-all break-all dir-ltr text-left">
              {currentOrigin}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الرابط</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            2. اضغط من خيارات المتصفح على <strong>"تثبيت التطبيق"</strong> أو <strong>"Add to Home Screen"</strong> وسيعمل كـ App كامل بملء الشاشة مع محرك ExoPlayer المدمج وريموت الرسيفر.
          </p>
        </div>

        {/* Method 2: Native Android Project with ExoPlayer (Built-in) */}
        <div className="p-4 bg-slate-800/70 border border-slate-700/90 rounded-2xl space-y-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs">2</span>
            <span>بناء ملف APK الأصلي عبر مشروع Android المدمج (Android 6 - 15)</span>
          </div>
          <p className="leading-relaxed text-slate-300">
            تم تضمين مشروع Android كامل وجاهز داخل مجلد <code className="text-emerald-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded">android/</code> يحتوي على:
          </p>
          <ul className="space-y-1 list-disc list-inside text-slate-400 pr-1">
            <li>مشغل <strong>AndroidX Media3 (ExoPlayer 1.2.0)</strong> الأصلي مدمج في الكود.</li>
            <li>تكوين Gradle مع <code className="text-teal-300 font-mono">minSdk 23</code> (أندرويد 6.0) و <code className="text-teal-300 font-mono">targetSdk 35</code> (أندرويد 15).</li>
            <li>معالجة ريموت الرسيفر (OK والأرقام 0-9) وخدمة التشغيل بالخلفية Foreground Service.</li>
          </ul>
          <div className="p-2 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-300 border border-slate-800 flex items-center justify-between">
            <span>cd android &amp;&amp; ./gradlew assembleDebug</span>
          </div>
        </div>

        {/* Method 3: PWABuilder / Public APK */}
        <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">3</span>
            <span>توليد APK عبر PWABuilder:</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            اضغط زر <strong>Share (مشاركة)</strong> في AI Studio لإنشاء رابط عام مفتوح، أو صدّر المشروع عبر <strong>Export to ZIP</strong> ثم ضع الرابط في <strong>PWABuilder.com</strong> وسيتم استخراج ملف الـ APK فوراً.
          </p>
        </div>

        {/* Compatibility Footer */}
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            التطبيق مهيأ بشاشات <strong>Android TV</strong> ودعم مفاتيح ريموت الرسيفر (OK والأرقام وزر الإخفاء).
          </span>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
