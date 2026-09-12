import React from 'react';
import { Upload, RefreshCw, Play, Pause, EyeOff, Square, Radio, Tv } from 'lucide-react';
import { PlayerStatus } from '../types';

interface TopControlsProps {
  onLoadNewFile: () => void;
  onRefreshList: () => void;
  onTogglePlayPause: () => void;
  onHideScreen: () => void;
  onStop: () => void;
  onOpenApkGuide: () => void;
  hasChannels: boolean;
  activeChannelName: string | null;
  status: PlayerStatus;
  hasSavedFile: boolean;
  savedFileName?: string;
}

export const TopControls: React.FC<TopControlsProps> = ({
  onLoadNewFile,
  onRefreshList,
  onTogglePlayPause,
  onHideScreen,
  onStop,
  onOpenApkGuide,
  hasChannels,
  activeChannelName,
  status,
  hasSavedFile,
  savedFileName,
}) => {
  const isPlayPauseDisabled = !activeChannelName || status === 'loading';
  const isPlaying = status === 'playing';

  return (
    <div id="top-controls-container" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Main Action Buttons Grid */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* زرار إضافة ودمج ملف m3u مع القنوات السابقة */}
          <button
            id="btn-load-m3u"
            type="button"
            onClick={onLoadNewFile}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-blue-600/30 cursor-pointer text-sm md:text-base"
            title="إضافة ملف قنوات جديد ودمجه مع القنوات الحالية دون فقدانها"
          >
            <Upload className="w-4 h-4" />
            <span>إضافة ملف M3U (دمج)</span>
          </button>

          {/* زرار تحديث القائمة */}
          <button
            id="btn-refresh-list"
            type="button"
            onClick={onRefreshList}
            disabled={!hasSavedFile}
            title={hasSavedFile ? `تحديث الملف: ${savedFileName || 'الملف المحفوظ'}` : 'لا يوجد ملف محفوظ لتحديثه'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-sm md:text-base ${
              hasSavedFile
                ? 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 border border-slate-700 cursor-pointer'
                : 'bg-slate-800/40 text-slate-500 border border-slate-800/60 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>تحديث القائمة</span>
          </button>

          {/* زرار Play/Pause (معطّل لحد ما يتحمّل قناة) */}
          <button
            id="btn-play-pause"
            type="button"
            onClick={onTogglePlayPause}
            disabled={isPlayPauseDisabled}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm md:text-base ${
              isPlayPauseDisabled
                ? 'bg-emerald-950/40 text-emerald-700/50 border border-emerald-900/30 cursor-not-allowed opacity-60'
                : isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 cursor-pointer'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 cursor-pointer'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* زرار Hide (إخفاء الشاشة مع إبقاء الخدمة والصوت) */}
          <button
            id="btn-hide-screen"
            type="button"
            onClick={onHideScreen}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 rounded-xl font-medium transition-all text-sm md:text-base cursor-pointer"
            title="إخفاء الشاشة مع استمرار البث والصوت في الخلفية (أو اضغط زر Home بالريموت)"
          >
            <EyeOff className="w-4 h-4 text-slate-400" />
            <span>Hide (إخفاء)</span>
          </button>

          {/* زرار إيقاف Stop (بند 8: إيقاف القناة ومسح آخر قناة شغالة) */}
          {activeChannelName && (
            <button
              id="btn-stop-channel"
              type="button"
              onClick={onStop}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/60 rounded-xl font-medium transition-all text-sm cursor-pointer"
              title="إيقاف التشغيل كلياً ومسح آخر قناة شغالة"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>إيقاف</span>
            </button>
          )}

          {/* زر تثبيت وتشغيل الرسيفر APK */}
          <button
            id="btn-apk-guide"
            type="button"
            onClick={onOpenApkGuide}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 hover:text-emerald-100 border border-emerald-700/60 rounded-xl font-bold transition-all text-sm cursor-pointer shadow-sm"
            title="طريقة تشغيل وتثبيت التطبيق على أجهزة الرسيفر كـ APK"
          >
            <Tv className="w-4 h-4 text-emerald-400" />
            <span>تشغيل الرسيفر (APK)</span>
          </button>
        </div>

        {/* Current status chip */}
        <div className="flex items-center gap-3">
          {activeChannelName ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${
                status === 'playing' ? 'bg-emerald-400 animate-pulse' :
                status === 'loading' || status === 'reconnecting' ? 'bg-amber-400 animate-spin' :
                'bg-slate-400'
              }`} />
              <span className="text-slate-300 font-medium truncate max-w-[180px] sm:max-w-xs">
                {activeChannelName}
              </span>
              <span className="text-slate-500 font-mono">
                {status === 'playing' ? 'شغّال' : status === 'paused' ? 'مؤقت' : status === 'reconnecting' ? 'إعادة اتصال' : 'تحميل...'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              <span>لا توجد قناة قيد التشغيل</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
