import React from 'react';
import { RefreshCw, EyeOff, Radio, FileAudio, Cpu, Volume2, Zap, FolderOpen, Square } from 'lucide-react';
import { PlayerStatus } from '../types';

interface TopControlsProps {
  onSelectAudioChannels: () => void;
  onLoadNewFile?: () => void;
  onOpenEmbeddedExplorer?: () => void;
  onRefreshList: () => void;
  onHideScreen: () => void;
  onOpenExoPlayerModal?: () => void;
  isAudioBoosted?: boolean;
  onToggleAudioBoost: () => void;
  hasChannels: boolean;
  activeChannelName: string | null;
  activeChannelUrl?: string;
  status: PlayerStatus;
  hasSavedFile: boolean;
  savedFileName?: string;
  isAudioChannelsActive: boolean;
  uploadedChannelsCount: number;
  onStop?: () => void;
}

export const TopControls: React.FC<TopControlsProps> = ({
  onSelectAudioChannels,
  onLoadNewFile,
  onOpenEmbeddedExplorer,
  onRefreshList,
  onHideScreen,
  onOpenExoPlayerModal,
  isAudioBoosted = false,
  onToggleAudioBoost,
  hasChannels: _hasChannels,
  activeChannelName,
  activeChannelUrl: _activeChannelUrl,
  status,
  hasSavedFile,
  savedFileName,
  isAudioChannelsActive,
  uploadedChannelsCount,
  onStop,
}) => {
  return (
    <div id="top-controls-container" className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Main Action Buttons Grid - أزرار مدمجة وصغيرة الحجم */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* زر القنوات الصوتية: يفتح قنوات الملفات المرفوعة من المستخدم */}
          <button
            id="btn-select-audio-channels"
            type="button"
            onClick={onSelectAudioChannels}
            className={`tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-xs border ${
              isAudioChannelsActive
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-blue-950/70 hover:bg-blue-900 text-blue-200 border-blue-700/60'
            }`}
            title="عرض القنوات الصوتية الخاصة بملفاتك المرفوعة"
          >
            <FileAudio className="w-3.5 h-3.5 text-blue-300" />
            <span>القنوات الصوتية</span>
            {uploadedChannelsCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-blue-900 text-blue-200 border border-blue-500/40">
                {uploadedChannelsCount}
              </span>
            )}
          </button>

          {/* تطبيق قارئ ومستعرض الملفات المدمج M3U/TXT/CFG */}
          <button
            id="btn-embedded-file-explorer"
            type="button"
            onClick={onOpenEmbeddedExplorer || onLoadNewFile}
            className="tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-200 rounded-lg font-bold transition-all cursor-pointer text-xs border border-amber-700/60"
            title="تطبيق مدمج لقراءة واستعراض ملفات القنوات (M3U, TXT, CFG) من USB والرسيفر"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>قارئ ملفات M3U/TXT/CFG</span>
          </button>

          {/* زرار تحديث القائمة */}
          <button
            id="btn-refresh-list"
            type="button"
            onClick={onRefreshList}
            disabled={!hasSavedFile}
            title={hasSavedFile ? `تحديث الملف: ${savedFileName || 'الملف المحفوظ'}` : 'لا يوجد ملف محفوظ لتحديثه'}
            className={`tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all text-xs ${
              hasSavedFile
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 cursor-pointer'
                : 'bg-slate-800/40 text-slate-500 border border-slate-800/60 cursor-not-allowed opacity-60'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تحديث القائمة</span>
          </button>

          {/* زرار Hide (إخفاء الشاشة مع إبقاء الخدمة والصوت) */}
          <button
            id="btn-hide-screen"
            type="button"
            onClick={onHideScreen}
            className="tv-focusable flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold transition-all text-xs cursor-pointer"
            title="إخفاء الشاشة مع استمرار البث والصوت في الخلفية"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            <span>إخفاء (Hide)</span>
          </button>

          {/* زر مشغل ExoPlayer المدمج */}
          {onOpenExoPlayerModal && (
            <button
              id="btn-open-exoplayer-modal"
              type="button"
              onClick={onOpenExoPlayerModal}
              className="tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border border-amber-500/50 font-medium transition-all text-xs cursor-pointer"
              title="مشغل ExoPlayer المدمج (Media3) للرسيفر والموبايل"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>مشغل ExoPlayer</span>
            </button>
          )}

          {/* زر مضاعفة صوت التطبيق لأقصى درجة نقية */}
          <button
            id="btn-toggle-audio-boost"
            type="button"
            onClick={onToggleAudioBoost}
            className={`tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all text-xs cursor-pointer border ${
              isAudioBoosted
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
            }`}
            title="مضاعفة الصوت لأقصى درجة نقية وعالية بدون تشويه"
          >
            {isAudioBoosted ? (
              <>
                <Zap className="w-3.5 h-3.5 fill-current text-slate-950" />
                <span>مضاعفة الصوت (مفعّل)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>مضاعفة الصوت</span>
              </>
            )}
          </button>
        </div>

        {/* Current status chip & Stop Service Button */}
        <div className="flex items-center gap-2">
          {activeChannelName ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs">
              <span className={`w-2 h-2 rounded-full ${
                status === 'playing' ? 'bg-emerald-400 animate-pulse' :
                status === 'loading' || status === 'reconnecting' ? 'bg-amber-400 animate-spin' :
                'bg-slate-400'
              }`} />
              <span className="text-slate-200 font-bold truncate max-w-[150px] sm:max-w-[220px]">
                {activeChannelName}
              </span>
              <span className="text-emerald-400 font-mono text-[11px] font-bold">
                {status === 'playing' ? '● شغال' : status === 'reconnecting' ? 'إعادة اتصال' : 'تحميل...'}
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-800">
              <Radio className="w-3 h-3 text-slate-500" />
              <span>لا توجد قناة قيد التشغيل</span>
            </div>
          )}

          {/* زر إيقاف الخدمة الذي طلبه المستخدم */}
          {activeChannelName && onStop && (
            <button
              id="btn-stop-service"
              type="button"
              onClick={onStop}
              className="tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold transition-all text-xs cursor-pointer shadow-sm shadow-rose-950/40"
              title="إيقاف الخدمة والصوت نهائياً (Stop Service)"
            >
              <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
              <span>إيقاف الخدمة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
