import React, { useState } from 'react';
import { X, Tv, Download, Copy, Check, ExternalLink, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

interface ApkInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
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
              <h3 className="text-lg font-black text-white">تثبيت وتشغيل AudioCast على الرسيفر</h3>
              <p className="text-xs text-slate-400">Created by Eng: Mohamed Barakat</p>
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

        {/* Reason for PWABuilder error explained clearly */}
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 space-y-2 text-xs text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>سبب رسالة Missing Name في PWABuilder وكيفية حلها:</span>
          </div>
          <p className="leading-relaxed">
            رابط التطبيق الداخلي (الخاص بالمعاينة) محمي بطلب تسجيل دخول خاص بحسابك السحابي، لذلك عندما يقوم روبوت موقع PWABuilder بزيارة الرابط لا يستطيع قراءة الملفات فيعطي رسالة <em>Missing Name</em>.
          </p>
          <div className="text-emerald-300 font-medium pt-1 border-t border-amber-800/40">
            ✅ <strong>الحل المباشر والفعال:</strong> استخدم أحد الخيارين أدناه لتشغيل أو استخراج التطبيق فوراً.
          </div>
        </div>

        {/* Method 1: The fastest direct method on Receiver / TV (No APK file transfer needed) */}
        <div className="p-4 bg-gradient-to-br from-slate-800/90 to-slate-900 border-2 border-emerald-500/50 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs">1</span>
              <span>الطريقة الأسهل والأنسب للرسيفر (تثبيت كـ App مباشر في ثوانٍ)</span>
            </div>
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
              موصى بها
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            لا تحتاج لتحويل الـ APK أو استخدام فلاشة USB:
          </p>

          <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pr-1">
            <li>افتح متصفح الرسيفر (مثل <strong>Downloader</strong> أو <strong>Chrome</strong> أو <strong>TV Bro</strong>).</li>
            <li>ادخل على الرابط التالي:</li>
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
            3. اضغط من قائمة المتصفح على <strong>"تثبيت التطبيق"</strong> أو <strong>"Add to Home Screen"</strong> وسيظهر فوراً على شاشة الرسيفر كتطبيق كامل مستقل بملء الشاشة مع الريموت كنترول.
          </p>
        </div>

        {/* Method 2: Share / Export Zip to build offline APK */}
        <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-3 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">2</span>
            <span>طريقة الحصول على رابط عام بدون حماية (Public URL) لـ PWABuilder:</span>
          </div>
          <ol className="space-y-1.5 list-decimal list-inside pr-1 text-slate-300 leading-relaxed">
            <li>
              اضغط على زر <strong className="text-white">Share (مشاركة)</strong> في القائمة العلوية لمنصة AI Studio لإنشاء رابط عام مفتوح ومجاني.
            </li>
            <li>
              أو من قائمة الإعدادات اضغط <strong className="text-white">Export to ZIP / GitHub</strong> وارفعه على أي استضافة مجانية مثل <strong>Netlify</strong> أو <strong>Vercel</strong> أو <strong>GitHub Pages</strong> بضغطة زر.
            </li>
            <li>
              ضع الرابط العام في <strong>PWABuilder</strong> وسيتعرف الموقع فوراً على <strong>AudioCast</strong> والوصف والأيقونات وتستطيع تحميل الـ APK فوراً.
            </li>
          </ol>
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
