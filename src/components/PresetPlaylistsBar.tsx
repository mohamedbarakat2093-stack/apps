import React from 'react';
import { Radio, BookOpen, Music, Sparkles, FileAudio } from 'lucide-react';
import {
  EGYPTIAN_RADIO_PRESET,
  QURAN_RECITERS_PRESET,
  EGYPTIAN_SINGERS_PRESET,
  PresetPlaylist,
} from '../data/presetPlaylists';

interface PresetPlaylistsBarProps {
  onLoadPreset: (preset: PresetPlaylist) => void;
  activePresetId?: string;
  onSelectAudioChannels: () => void;
  onUploadNewFile?: () => void;
  uploadedChannelsCount: number;
  isAudioChannelsActive: boolean;
}

export const PresetPlaylistsBar: React.FC<PresetPlaylistsBarProps> = ({
  onLoadPreset,
  activePresetId,
  onSelectAudioChannels,
  uploadedChannelsCount,
  isAudioChannelsActive,
}) => {
  return (
    <div
      id="preset-playlists-section"
      className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-3"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm md:text-base font-bold text-slate-100">
          أقسام وقوائم القنوات
        </h2>
        <span className="text-[11px] font-medium text-slate-400">
          (اضغط على أي قسم لعرض وتشغيل قنواته)
        </span>
      </div>

      {/* الأزرار الأربعة جنباً إلى جنب ونفس الحجم تماماً */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* زر 1: قنوات الراديو المصرية (وأولها إذاعة القرآن الكريم) */}
        <button
          id="btn-preset-egypt-radio"
          type="button"
          onClick={() => onLoadPreset(EGYPTIAN_RADIO_PRESET)}
          className={`tv-focusable text-right p-3.5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between h-full min-h-[105px] ${
            !isAudioChannelsActive && activePresetId === EGYPTIAN_RADIO_PRESET.id
              ? 'bg-amber-950/50 border-amber-500 shadow-md shadow-amber-500/20 ring-1 ring-amber-500'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/60 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                  قنوات الراديو المصرية
                </h3>
                <span className="text-[11px] text-amber-400 font-bold block">
                  ★ أولها إذاعة القرآن الكريم
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
              {EGYPTIAN_RADIO_PRESET.channels.length} إذاعة
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">
            إذاعة القرآن، 9090 FM، نجوم إف إم، راديو مصر، ميجا، نغم، راديو هيتس...
          </p>
        </button>

        {/* زر 2: أشهر قراء القرآن الكريم */}
        <button
          id="btn-preset-quran-reciters"
          type="button"
          onClick={() => onLoadPreset(QURAN_RECITERS_PRESET)}
          className={`tv-focusable text-right p-3.5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between h-full min-h-[105px] ${
            !isAudioChannelsActive && activePresetId === QURAN_RECITERS_PRESET.id
              ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-emerald-500/60 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                  أشهر قراء القرآن الكريم
                </h3>
                <span className="text-[11px] text-emerald-400 font-bold block">
                  تلاوات متواصلة 24/7 لأكابر القراء
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
              {QURAN_RECITERS_PRESET.channels.length} قارئ
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">
            عبد الباسط، المنشاوي، الحصري، مصطفى إسماعيل، البنا، الطبلاوي، العفاسي...
          </p>
        </button>

        {/* زر 3: راديو أشهر مغنين مصر */}
        <button
          id="btn-preset-egypt-singers"
          type="button"
          onClick={() => onLoadPreset(EGYPTIAN_SINGERS_PRESET)}
          className={`tv-focusable text-right p-3.5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between h-full min-h-[105px] ${
            !isAudioChannelsActive && activePresetId === EGYPTIAN_SINGERS_PRESET.id
              ? 'bg-purple-950/50 border-purple-500 shadow-md shadow-purple-500/20 ring-1 ring-purple-500'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-purple-500/60 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-md">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                  راديو أشهر مغنين مصر
                </h3>
                <span className="text-[11px] text-purple-400 font-bold block">
                  روائع كوكب الشرق والعندليب
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
              {EGYPTIAN_SINGERS_PRESET.channels.length} فنان
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">
            أم كلثوم، عبد الحليم حافظ، محمد عبد الوهاب، فريد الأطرش، نجاة، عمرو دياب...
          </p>
        </button>

        {/* زر 4: القنوات الصوتية (ملفات وقنوات المستخدم المرفوعة) */}
        <button
          id="btn-tab-audio-channels"
          type="button"
          onClick={onSelectAudioChannels}
          className={`tv-focusable text-right p-3.5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between h-full min-h-[105px] ${
            isAudioChannelsActive
              ? 'bg-blue-950/50 border-blue-500 shadow-md shadow-blue-500/20 ring-1 ring-blue-500'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-blue-500/60 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <FileAudio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                  القنوات الصوتية
                </h3>
                <span className="text-[11px] text-blue-400 font-bold block">
                  ملفاتك وقنواتك المرفوعة
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-blue-300 shrink-0">
              {uploadedChannelsCount > 0 ? `${uploadedChannelsCount} قناة` : 'ملفاتي'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">
            ملفات M3U, M3U8, CFG, TXT والقنوات الصوتية المخصصة...
          </p>
        </button>
      </div>
    </div>
  );
};
