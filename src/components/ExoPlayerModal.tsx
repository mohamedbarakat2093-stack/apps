import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Volume2,
  Tv,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { Channel } from '../types';
import { playerEngine } from '../services/playerService';

interface ExoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeChannel: Channel | null;
}

export const ExoPlayerModal: React.FC<ExoPlayerModalProps> = ({
  isOpen,
  onClose,
  activeChannel,
}) => {
  const [exoInfo, setExoInfo] = useState(playerEngine.getExoPlayerInfo());
  const [isBoosted, setIsBoosted] = useState<boolean>(playerEngine.isAudioBoosted());

  useEffect(() => {
    if (!isOpen) return;

    const updateState = () => {
      setExoInfo(playerEngine.getExoPlayerInfo());
      setIsBoosted(playerEngine.isAudioBoosted());
    };

    updateState();
    const interval = setInterval(updateState, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleBoost = () => {
    const newState = playerEngine.toggleAudioBoost();
    setIsBoosted(newState);
    setExoInfo(playerEngine.getExoPlayerInfo());
  };

  return (
    <div
      id="exoplayer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="exoplayer-modal-container"
        className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-white font-black text-sm">
              EXO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">مشغل ExoPlayer المدمج</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Media3 1.2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                المحرك المعتمد لروابط القنوات الصوتية والبث المباشر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compatibility Banner */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-800/80 to-teal-950/40 border border-emerald-500/30 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>متوافق كلياً مع كافة أجهزة أندرويد</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <Tv className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>أجهزة الرسيفر & Android TV</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>الهواتف الذكية والأجهزة اللوحية</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            يدعم التشغيل من <strong>Android 6.0 (Marshmallow API 23)</strong> حتى <strong>Android 15 (API 35)</strong> مع دعم كامل للريموت كنترول وشاشات اللمس.
          </p>
        </div>

        {/* Current Playback Engine Status */}
        <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              المحرك الحالي النشط:
            </span>
            <span className="font-bold text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {exoInfo.version}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              حجم المخزن المؤقت (Buffer):
            </span>
            <span className="font-mono text-white font-bold text-xs bg-slate-800 px-2 py-0.5 rounded">
              {exoInfo.bufferSeconds}s / {exoInfo.maxBufferSeconds}s
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              مزامنة البث المباشر (Live Sync):
            </span>
            <span className="text-teal-300 font-bold font-mono text-xs">
              {exoInfo.liveSyncSeconds} ثانية
            </span>
          </div>

          {activeChannel && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">القناة المشغلة:</span>
              <span className="text-white font-bold truncate max-w-[200px]">
                {activeChannel.name}
              </span>
            </div>
          )}
        </div>

        {/* TV Box / Receiver Audio Booster (Maximum Clean Volume & Clarity) */}
        <div className={`p-4 rounded-xl border transition-all space-y-3 ${
          isBoosted
            ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/40'
            : 'bg-slate-800/60 border-slate-700/80'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Zap className={`w-4 h-4 ${isBoosted ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
              <span>مضاعفة الصوت بنقاء فائق (Maximum Clean Boost)</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              isBoosted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {isBoosted ? 'مفعّل (نقي وعالي)' : '1X قياسي'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            رفع الصوت لأقصى درجة ممكنة مع الحفاظ على نقاء ووضوح الصوت ومنع التشويه (Distortion) في ترددات البيز (Bass) عبر فلترة الرنين الترددي ومحدد الذروة الذكي.
          </p>

          <button
            type="button"
            onClick={handleToggleBoost}
            className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              isBoosted
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/30'
                : 'bg-slate-700 hover:bg-slate-600 text-amber-300 border border-amber-500/40'
            }`}
          >
            {isBoosted ? (
              <>
                <Zap className="w-4 h-4 fill-current text-slate-950" />
                <span>إيقاف المضاعفة (العودة إلى الصوت الطبيعي 1X)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>تفعيل مضاعفة الصوت (أقصى درجة بنقاء فائق)</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              if (activeChannel) {
                playerEngine.playChannel(activeChannel);
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>إعادة مزامنة البث الحالية</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all border border-slate-600 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
            <span>إغلاق النافذة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
