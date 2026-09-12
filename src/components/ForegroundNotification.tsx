import React from 'react';
import { Play, Pause, Square, Radio, Disc3, Bell } from 'lucide-react';
import { Channel, PlayerStatus, RetryState } from '../types';

interface ForegroundNotificationProps {
  channel: Channel;
  status: PlayerStatus;
  retryState: RetryState;
  onTogglePlayPause: () => void;
  onStop: () => void;
}

export const ForegroundNotification: React.FC<ForegroundNotificationProps> = ({
  channel,
  status,
  retryState,
  onTogglePlayPause,
  onStop,
}) => {
  const isPlaying = status === 'playing';
  const isReconnecting = status === 'reconnecting';
  const isLoading = status === 'loading';

  return (
    <div
      id="foreground-service-notification"
      className="w-full bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl relative overflow-hidden backdrop-blur-md"
    >
      {/* Background audio glow effect when playing */}
      {isPlaying && (
        <div className="absolute -inset-1 bg-emerald-500/5 blur-xl pointer-events-none" />
      )}

      {/* System Foreground Service Header Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold tracking-wide text-slate-300">
            خدمة البث في الخلفية (Foreground Service & MediaSession)
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            نشط في النظام
          </span>
        </div>

        {retryState.active && (
          <span className="text-amber-400 text-xs font-medium animate-pulse">
            محاولة إعادة الاتصال ({retryState.attempt} من {retryState.maxAttempts})...
          </span>
        )}
      </div>

      {/* Media Content & Direct System Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          {/* Channel Logo / Disc Animation */}
          <div className="relative w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Radio className={`w-6 h-6 ${isPlaying ? 'text-emerald-400' : 'text-slate-400'}`} />
            )}

            {isPlaying && (
              <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </div>

          {/* Channel Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white truncate max-w-sm">
                {channel.name}
              </h3>
              {isPlaying && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  بث نشط
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">
              {channel.group || 'بث مباشر'} • <span className="font-mono text-slate-400">{channel.url}</span>
            </p>
          </div>
        </div>

        {/* Integrated Notification Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Play / Pause Toggle inside notification */}
          <button
            id="notification-btn-play-pause"
            type="button"
            onClick={onTogglePlayPause}
            disabled={isLoading || isReconnecting}
            className={`tv-focusable p-3 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
            }`}
            title={isPlaying ? 'إيقاف مؤقت (Pause)' : 'متابعة التشغيل (Play)'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span className="text-xs">إيقاف مؤقت</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span className="text-xs">تشغيل</span>
              </>
            )}
          </button>

          {/* Stop Button inside notification */}
          <button
            id="notification-btn-stop"
            type="button"
            onClick={onStop}
            className="tv-focusable p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-2 transition-all cursor-pointer"
            title="إيقاف الخدمة والإشعار نهائياً (Stop)"
          >
            <Square className="w-4 h-4 fill-current" />
            <span className="text-xs">إيقاف الخدمة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
