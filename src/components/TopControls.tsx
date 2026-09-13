import React from 'react';
import { Upload, RefreshCw, EyeOff, Radio, Plus, FileAudio } from 'lucide-react';
import { PlayerStatus } from '../types';

interface TopControlsProps {
  onSelectAudioChannels: () => void;
  onLoadNewFile: () => void;
  onOpenAddChannelModal: () => void;
  onRefreshList: () => void;
  onHideScreen: () => void;
  hasChannels: boolean;
  activeChannelName: string | null;
  activeChannelUrl?: string;
  status: PlayerStatus;
  hasSavedFile: boolean;
  savedFileName?: string;
  isAudioChannelsActive: boolean;
  uploadedChannelsCount: number;
}

export const TopControls: React.FC<TopControlsProps> = ({
  onSelectAudioChannels,
  onLoadNewFile,
  onOpenAddChannelModal,
  onRefreshList,
  onHideScreen,
  hasChannels: _hasChannels,
  activeChannelName,
  activeChannelUrl: _activeChannelUrl,
  status,
  hasSavedFile,
  savedFileName,
  isAudioChannelsActive,
  uploadedChannelsCount,
}) => {
  return (
    <div id="top-controls-container" className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Main Action Buttons Grid */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* زر القنوات الصوتية: يفتح قنوات الملفات المرفوعة من المستخدم */}
          <button
            id="btn-select-audio-channels"
            type="button"
            onClick={onSelectAudioChannels}
            className={`tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all shadow-md cursor-pointer text-sm md:text-base border ${
              isAudioChannelsActive
                ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/40 ring-2 ring-blue-400'
                : 'bg-blue-950/70 hover:bg-blue-900 text-blue-200 border-blue-700/60'
            }`}
            title="عرض القنوات الصوتية الخاصة بملفاتك المرفوعة"
          >
            <FileAudio className="w-4 h-4 text-blue-300" />
            <span>القنوات الصوتية</span>
            {uploadedChannelsCount > 0 && (
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-900/90 text-blue-200 border border-blue-500/40">
                {uploadedChannelsCount}
              </span>
            )}
          </button>

          {/* زر رفع ملف قنوات صوتية جديد/إضافي */}
          <button
            id="btn-load-m3u"
            type="button"
            onClick={onLoadNewFile}
            className="tv-focusable flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 rounded-xl font-bold transition-all cursor-pointer text-sm md:text-base border border-slate-700"
            title="رفع ملف قنوات (M3U, M3U8, CFG, TXT) وإضافته مباشرة إلى القنوات الصوتية"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>رفع ملف قنوات</span>
          </button>

          {/* زر إضافة قناة صوتية مخصصة */}
          <button
            id="btn-add-custom-channel"
            type="button"
            onClick={onOpenAddChannelModal}
            className="tv-focusable flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer text-sm md:text-base border border-emerald-500/50"
            title="إضافة قناة صوتية مخصصة برابط مباشر"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قناة</span>
          </button>

          {/* زرار تحديث القائمة */}
          <button
            id="btn-refresh-list"
            type="button"
            onClick={onRefreshList}
            disabled={!hasSavedFile}
            title={hasSavedFile ? `تحديث الملف: ${savedFileName || 'الملف المحفوظ'}` : 'لا يوجد ملف محفوظ لتحديثه'}
            className={`tv-focusable flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold transition-all text-sm md:text-base ${
              hasSavedFile
                ? 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 border border-slate-700 cursor-pointer'
                : 'bg-slate-800/40 text-slate-500 border border-slate-800/60 cursor-not-allowed opacity-60'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>تحديث القائمة</span>
          </button>

          {/* زرار Hide (إخفاء الشاشة مع إبقاء الخدمة والصوت) */}
          <button
            id="btn-hide-screen"
            type="button"
            onClick={onHideScreen}
            className="tv-focusable flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 rounded-xl font-medium transition-all text-sm md:text-base cursor-pointer"
            title="إخفاء الشاشة مع استمرار البث والصوت في الخلفية"
          >
            <EyeOff className="w-4 h-4 text-slate-400" />
            <span>Hide (إخفاء)</span>
          </button>
        </div>

        {/* Current status chip */}
        <div className="flex items-center gap-3">
          {activeChannelName ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs shadow-inner">
              <span className={`w-2.5 h-2.5 rounded-full ${
                status === 'playing' ? 'bg-emerald-400 animate-pulse' :
                status === 'loading' || status === 'reconnecting' ? 'bg-amber-400 animate-spin' :
                'bg-slate-400'
              }`} />
              <span className="text-slate-200 font-bold truncate max-w-[180px] sm:max-w-xs">
                {activeChannelName}
              </span>
              <span className="text-emerald-400 font-mono font-bold">
                {status === 'playing' ? '● شغال' : status === 'paused' ? 'مؤقت' : status === 'reconnecting' ? 'إعادة اتصال' : 'تحميل...'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-800">
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              <span>لا توجد قناة قيد التشغيل</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
