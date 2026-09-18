import React from 'react';
import { Volume2, EyeOff, Trophy, FileAudio, RotateCcw, Hash } from 'lucide-react';

interface ReceiverRemoteBarProps {
  isAudioBoosted: boolean;
  onToggleAudioBoost: () => void;
  onToggleHideScreen: () => void;
  onSelectAnisSports: () => void;
  onSelectAudioChannels: () => void;
  onRecallLastChannel?: () => void;
  hasPreviousChannel?: boolean;
}

/**
 * شريط أزرار الريموت كنترول الخاص بأجهزة الاستقبال والرسيفرات الذكية (مثل Dreamax B9S2X معالجات Amlogic S905X / S905D)
 * يعرض مفاتيح الألوان الأربعة القياسية للرسيفر مع دعم كامل للنقر والضغط المباشر من الريموت كنترول
 */
export const ReceiverRemoteBar: React.FC<ReceiverRemoteBarProps> = ({
  isAudioBoosted,
  onToggleAudioBoost,
  onToggleHideScreen,
  onSelectAnisSports,
  onSelectAudioChannels,
  onRecallLastChannel,
  hasPreviousChannel = false,
}) => {
  return (
    <div
      id="receiver-remote-bar"
      className="bg-slate-900 border border-slate-800 rounded-xl p-2 select-none shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
        {/* Helper Title */}
        <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>اختصارات ريموت الرسيفر (Dreamax / أندرويد):</span>
        </div>

        {/* 4 Colored Remote Buttons & Remote Action Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* الزر الأحمر: مضاعفة الصوت */}
          <button
            id="btn-remote-red"
            type="button"
            onClick={onToggleAudioBoost}
            className={`tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
              isAudioBoosted
                ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-200 hover:border-rose-500/60'
            }`}
            title="الزر الأحمر بالريموت: تبديل مضاعفة الصوت 2.85X"
          >
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 shrink-0 flex items-center justify-center text-[9px] text-white font-black">
              ●
            </span>
            <span className="font-semibold text-rose-300">أحمر:</span>
            <span>مضاعفة الصوت {isAudioBoosted ? '(شغال)' : ''}</span>
            <Volume2 className="w-3 h-3 text-rose-400" />
          </button>

          {/* الزر الأخضر: إخفاء الشاشة الفوري (لمشاهدة بث الستالايت Multi-stream مع استمرار الصوت) */}
          <button
            id="btn-remote-green"
            type="button"
            onClick={onToggleHideScreen}
            className="tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-xs bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/60 text-slate-200 transition-all cursor-pointer"
            title="الزر الأخضر بالريموت: إخفاء الواجهة لمتابعة مباراة التلفاز مع استمرار الصوت بالخلفية"
          >
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 shrink-0 flex items-center justify-center text-[9px] text-white font-black">
              ●
            </span>
            <span className="font-semibold text-emerald-300">أخضر:</span>
            <span>إخفاء الشاشة</span>
            <EyeOff className="w-3 h-3 text-emerald-400" />
          </button>

          {/* الزر الأصفر: راديو أنيس والرياضة */}
          <button
            id="btn-remote-yellow"
            type="button"
            onClick={onSelectAnisSports}
            className="tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-xs bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 text-slate-200 transition-all cursor-pointer"
            title="الزر الأصفر بالريموت: الانتقال المباشر لباقة راديو أنيس والرياضة"
          >
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 shrink-0 flex items-center justify-center text-[9px] text-slate-950 font-black">
              ●
            </span>
            <span className="font-semibold text-amber-300">أصفر:</span>
            <span>راديو أنيس والرياضة</span>
            <Trophy className="w-3 h-3 text-amber-400" />
          </button>

          {/* الزر الأزرق: القنوات الصوتية المرفوعة */}
          <button
            id="btn-remote-blue"
            type="button"
            onClick={onSelectAudioChannels}
            className="tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-xs bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/60 text-slate-200 transition-all cursor-pointer"
            title="الزر الأزرق بالريموت: الانتقال المباشر لخانة القنوات الصوتية"
          >
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 shrink-0 flex items-center justify-center text-[9px] text-white font-black">
              ●
            </span>
            <span className="font-semibold text-blue-300">أزرق:</span>
            <span>القنوات الصوتية</span>
            <FileAudio className="w-3 h-3 text-blue-400" />
          </button>

          {/* زر Recall / استرجاع القناة السابقة */}
          {hasPreviousChannel && onRecallLastChannel && (
            <button
              id="btn-remote-recall"
              type="button"
              onClick={onRecallLastChannel}
              className="tv-focusable hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="زر Recall بالريموت للرجوع لآخر قناة كنت تشغلها"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Recall (القناة السابقة)</span>
            </button>
          )}

          {/* تنويه مفاتيح الأرقام وتقليب الصفحات */}
          <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-0.5 text-slate-300">
              <Hash className="w-3 h-3 text-emerald-400" />
              <strong>0-9</strong> تشغيل برقم القناة
            </span>
            <span>•</span>
            <span className="text-slate-300">
              <strong>CH+/-</strong> تقليب القنوات
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
