import React, { useEffect } from 'react';
import { Eye, Play, Pause, Square, Radio, Tv, ArrowRight } from 'lucide-react';
import { Channel, PlayerStatus } from '../types';

interface HiddenScreenOverlayProps {
  isHidden: boolean;
  onRestore: () => void;
  activeChannel: Channel | null;
  status: PlayerStatus;
  onTogglePlayPause: () => void;
  onStop: () => void;
}

export const HiddenScreenOverlay: React.FC<HiddenScreenOverlayProps> = ({
  isHidden,
  onRestore,
  activeChannel,
  status,
  onTogglePlayPause,
  onStop,
}) => {
  // Listen for Home key or Escape to restore or hide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isHome =
        e.key === 'Home' ||
        e.code === 'Home' ||
        e.keyCode === 36 ||
        e.keyCode === 3 ||
        e.key === 'BrowserHome' ||
        e.key === 'GoHome';

      if (isHome && isHidden) {
        onRestore();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHidden, onRestore]);

  if (!isHidden) return null;

  const isPlaying = status === 'playing';

  return (
    <div
      id="hidden-task-screen"
      className="fixed inset-0 z-50 bg-slate-950/98 flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="relative z-10 max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* TV / Remote indicator */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
          <Tv className="w-4 h-4 text-emerald-400" />
          <span>وضع الإخفاء في الخلفية (moveTaskToBack)</span>
        </div>

        {/* Status circle */}
        <div className="relative mx-auto w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
          <Radio className={`w-10 h-10 ${isPlaying ? 'text-emerald-400' : 'text-slate-500'}`} />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">
            {activeChannel ? activeChannel.name : 'AudioCast'}
          </h2>
          <p className="text-sm text-emerald-400 font-medium">
            {isPlaying
              ? 'الصوت والخدمة يعملان في الخلفية بدون انقطاع'
              : status === 'paused'
              ? 'البث متوقف مؤقتاً في الخلفية'
              : 'الخدمة في وضع الاستعداد'}
          </p>
          <p className="text-xs text-slate-400 pt-1">
            (اضغط زر <span className="text-slate-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">Home</span> بالريموت أو الزر أدناه للعودة للشاشة)
          </p>
        </div>

        {/* Quick controls during hidden mode */}
        {activeChannel && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              id="hidden-play-pause-btn"
              type="button"
              onClick={onTogglePlayPause}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              id="hidden-stop-btn"
              type="button"
              onClick={() => {
                onStop();
                onRestore();
              }}
              className="px-4 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 flex items-center gap-2 text-sm font-medium transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>إيقاف</span>
            </button>
          </div>
        )}

        {/* Restore Button */}
        <div className="pt-3">
          <button
            id="btn-restore-app"
            type="button"
            onClick={onRestore}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>إظهار التطبيق (Restore)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
