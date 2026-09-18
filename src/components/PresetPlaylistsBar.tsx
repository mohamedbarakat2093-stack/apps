import React from 'react';
import { Radio, BookOpen, Music, Sparkles, FileAudio, Trophy } from 'lucide-react';
import {
  EGYPTIAN_RADIO_PRESET,
  ANIS_AND_SPORTS_PRESET,
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
      className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2"
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <h2 className="text-xs md:text-sm font-bold text-slate-200">
            أقسام وقوائم القنوات
          </h2>
        </div>
        <span className="text-[10px] text-slate-400">
          (اضغط للتنقل السريع بين الباقات)
        </span>
      </div>

      {/* الأزرار الخمسة بتصميم مدمج ومضغوط وسريع جداً على شاشات التلفاز ومعالجات الرسيفر */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {/* زر 1: قنوات الراديو المصرية */}
        <button
          id="btn-preset-egypt-radio"
          type="button"
          onClick={() => onLoadPreset(EGYPTIAN_RADIO_PRESET)}
          className={`tv-focusable text-right p-2 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-colors ${
            !isAudioChannelsActive && activePresetId === EGYPTIAN_RADIO_PRESET.id
              ? 'bg-amber-950/60 border-amber-500 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-xs font-bold text-white truncate">
                الراديو المصري
              </h3>
              <span className="text-[10px] font-mono text-amber-400 font-bold shrink-0">
                {EGYPTIAN_RADIO_PRESET.channels.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              القرآن الكريم، 9090، شعبي...
            </p>
          </div>
        </button>

        {/* زر 2: راديو أنيس والرياضة */}
        <button
          id="btn-preset-anis-sports"
          type="button"
          onClick={() => onLoadPreset(ANIS_AND_SPORTS_PRESET)}
          className={`tv-focusable text-right p-2 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-colors ${
            !isAudioChannelsActive && activePresetId === ANIS_AND_SPORTS_PRESET.id
              ? 'bg-cyan-950/60 border-cyan-400 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-500'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-xs font-bold text-white truncate">
                راديو أنيس والرياضة
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 font-bold shrink-0">
                {ANIS_AND_SPORTS_PRESET.channels.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              ماكس، سبورت، الكأس، أون سبورت...
            </p>
          </div>
        </button>

        {/* زر 3: أشهر قراء القرآن الكريم */}
        <button
          id="btn-preset-quran-reciters"
          type="button"
          onClick={() => onLoadPreset(QURAN_RECITERS_PRESET)}
          className={`tv-focusable text-right p-2 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-colors ${
            !isAudioChannelsActive && activePresetId === QURAN_RECITERS_PRESET.id
              ? 'bg-emerald-950/60 border-emerald-500 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-xs font-bold text-white truncate">
                قراء القرآن الكريم
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">
                {QURAN_RECITERS_PRESET.channels.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              عبد الباسط، المنشاوي، الحصري...
            </p>
          </div>
        </button>

        {/* زر 4: راديو كلاسيكيات الطرب */}
        <button
          id="btn-preset-egypt-singers"
          type="button"
          onClick={() => onLoadPreset(EGYPTIAN_SINGERS_PRESET)}
          className={`tv-focusable text-right p-2 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-colors ${
            !isAudioChannelsActive && activePresetId === EGYPTIAN_SINGERS_PRESET.id
              ? 'bg-purple-950/60 border-purple-500 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-purple-500'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-xs font-bold text-white truncate">
                كلاسيكيات الطرب
              </h3>
              <span className="text-[10px] font-mono text-purple-400 font-bold shrink-0">
                {EGYPTIAN_SINGERS_PRESET.channels.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              أم كلثوم، حليم، عبد الوهاب...
            </p>
          </div>
        </button>

        {/* زر 5: القنوات الصوتية (ملفات وقنوات المستخدم المرفوعة) */}
        <button
          id="btn-tab-audio-channels"
          type="button"
          onClick={onSelectAudioChannels}
          className={`tv-focusable text-right p-2 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-colors col-span-2 sm:col-span-1 ${
            isAudioChannelsActive
              ? 'bg-blue-950/70 border-blue-400 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <FileAudio className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-xs font-bold text-white truncate">
                القنوات الصوتية
              </h3>
              <span className="text-[10px] font-mono text-blue-400 font-bold shrink-0">
                {uploadedChannelsCount > 0 ? `${uploadedChannelsCount}` : 'ملفاتي'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              ملفاتك المرفوعة (M3U / TXT)
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
