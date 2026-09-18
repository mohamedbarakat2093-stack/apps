import React, { useEffect, useState } from 'react';
import { Eye, Radio } from 'lucide-react';
import { Channel, PlayerStatus } from '../types';

interface HiddenScreenOverlayProps {
  isHidden: boolean;
  onRestore: () => void;
  activeChannel: Channel | null;
  status: PlayerStatus;
  onTogglePlayPause?: () => void;
  onStop?: () => void;
  channels?: Channel[];
  onSelectChannel?: (channel: Channel) => void;
}

export const HiddenScreenOverlay: React.FC<HiddenScreenOverlayProps> = ({
  isHidden,
  onRestore,
  activeChannel,
  status,
  channels = [],
  onSelectChannel,
}) => {
  const [showHint, setShowHint] = useState<boolean>(true);
  const [channelToast, setChannelToast] = useState<{ number: number; name: string } | null>(null);
  const digitBufferRef = React.useRef<string>('');
  const digitTimerRef = React.useRef<any>(null);

  // جعل خلفية الصفحة شفافة تماماً عند وضع الإخفاء ليظهر تطبيق التلفاز أو الفيديو تحتها
  useEffect(() => {
    if (isHidden) {
      document.body.classList.add('screen-hidden');
      document.documentElement.classList.add('screen-hidden');
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.style.backgroundColor = 'transparent';
      }

      // إخطار جسر أندرويد بالشفافية إن وجد
      const w = typeof window !== 'undefined' ? (window as any) : null;
      if (w?.AndroidControl?.setScreenHidden) {
        try {
          w.AndroidControl.setScreenHidden(true);
        } catch (_) {}
      }
    } else {
      document.body.classList.remove('screen-hidden');
      document.documentElement.classList.remove('screen-hidden');
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.style.backgroundColor = '';
      }

      const w = typeof window !== 'undefined' ? (window as any) : null;
      if (w?.AndroidControl?.setScreenHidden) {
        try {
          w.AndroidControl.setScreenHidden(false);
        } catch (_) {}
      }
    }

    return () => {
      document.body.classList.remove('screen-hidden');
      document.documentElement.classList.remove('screen-hidden');
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.style.backgroundColor = '';
      }
    };
  }, [isHidden]);

  // إخفاء تلميح الشاشة بعد 6 ثوانٍ لكي تصبح الشاشة شفافة تماماً 100% بدون أي حجب لصورة التلفاز
  useEffect(() => {
    if (!isHidden) return;
    setShowHint(true);
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [isHidden]);

  // الاستماع لزر OK في الريموت (Enter / D-Pad Center / KeyCode 23 / KeyCode 13) لإلغاء الإخفاء فوراً
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // زر OK في مختلف أنواع الريموت وأجهزة الأندرويد والرسيفر
      const isOkKey =
        e.key === 'Enter' ||
        e.code === 'Enter' ||
        e.code === 'NumpadEnter' ||
        e.keyCode === 13 ||
        e.keyCode === 23 || // KEYCODE_DPAD_CENTER في أندرويد تي في
        e.keyCode === 66 || // KEYCODE_ENTER في أندرويد
        e.key === 'Select' ||
        e.key === 'OK' ||
        e.key === 'Ok';

      const isHomeOrBack =
        e.key === 'Home' ||
        e.code === 'Home' ||
        e.keyCode === 36 ||
        e.key === 'Escape' ||
        e.keyCode === 27;

      if (isOkKey || isHomeOrBack) {
        e.preventDefault();
        e.stopPropagation();
        onRestore();
        return;
      }

      // أزرار أرقام الريموت كنترول للتبديل الفوري بين القنوات أثناء مشاهدة التلفزيون
      let digit: string | null = null;
      if (e.key >= '0' && e.key <= '9') {
        digit = e.key;
      } else if (e.code && e.code.startsWith('Digit')) {
        digit = e.code.replace('Digit', '');
      } else if (e.code && e.code.startsWith('Numpad') && e.code.length === 7) {
        digit = e.code.replace('Numpad', '');
      }

      if (digit !== null && channels.length > 0 && onSelectChannel) {
        e.preventDefault();
        e.stopPropagation();
        digitBufferRef.current += digit;
        const candidateNum = parseInt(digitBufferRef.current, 10);

        if (digitTimerRef.current) clearTimeout(digitTimerRef.current);

        const canHaveMore = candidateNum * 10 <= channels.length;
        const delay = canHaveMore ? 380 : 50;

        digitTimerRef.current = setTimeout(() => {
          const chNum = parseInt(digitBufferRef.current, 10);
          digitBufferRef.current = '';
          if (!isNaN(chNum) && chNum > 0) {
            const idx = chNum - 1;
            if (idx >= 0 && idx < channels.length) {
              const ch = channels[idx];
              onSelectChannel(ch);
              setChannelToast({ number: chNum, name: ch.name });
              setShowHint(true);
              setTimeout(() => setChannelToast(null), 3500);
            }
          }
        }, delay);

        setShowHint(true);
        return;
      }

      // أي حركة أو ضغطة أخرى تعيد إظهار التلميح الصغير مؤقتاً
      setShowHint(true);
    };

    // الاستماع لحدث أندرويد الأصلي الخاص بأرقام الريموت
    const handleNativeRemoteNumber = (event: any) => {
      if (!channels.length || !onSelectChannel) return;
      const digit = event.detail?.digit;
      if (digit !== undefined && digit !== null) {
        const fakeKey = new KeyboardEvent('keydown', { key: String(digit), code: `Digit${digit}` });
        window.dispatchEvent(fakeKey);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('remoteNumberPress', handleNativeRemoteNumber as EventListener);
    
    // دعم أزرار الريموت كنترول أثناء الإخفاء (الأخضر لإعادة الإظهار، والتقليب بين القنوات)
    const handleRemoteGreen = () => {
      onRestore();
    };
    const handleRemoteNext = () => {
      if (!channels.length || !onSelectChannel || !activeChannel) return;
      const curIdx = channels.findIndex((c) => c.id === activeChannel.id || c.url === activeChannel.url);
      const nextIdx = (curIdx + 1) % channels.length;
      onSelectChannel(channels[nextIdx]);
      setChannelToast({ number: nextIdx + 1, name: channels[nextIdx].name });
      setShowHint(true);
      setTimeout(() => setChannelToast(null), 3500);
    };
    const handleRemotePrev = () => {
      if (!channels.length || !onSelectChannel || !activeChannel) return;
      const curIdx = channels.findIndex((c) => c.id === activeChannel.id || c.url === activeChannel.url);
      const prevIdx = (curIdx - 1 + channels.length) % channels.length;
      onSelectChannel(channels[prevIdx]);
      setChannelToast({ number: prevIdx + 1, name: channels[prevIdx].name });
      setShowHint(true);
      setTimeout(() => setChannelToast(null), 3500);
    };

    window.addEventListener('audiocast:remote_green', handleRemoteGreen);
    window.addEventListener('audiocast:remote_ch_next', handleRemoteNext);
    window.addEventListener('audiocast:remote_ch_prev', handleRemotePrev);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('remoteNumberPress', handleNativeRemoteNumber as EventListener);
      window.removeEventListener('audiocast:remote_green', handleRemoteGreen);
      window.removeEventListener('audiocast:remote_ch_next', handleRemoteNext);
      window.removeEventListener('audiocast:remote_ch_prev', handleRemotePrev);
    };
  }, [onRestore, channels, onSelectChannel, activeChannel]);

  if (!isHidden) return null;

  const isExoPlayer = activeChannel && (activeChannel.engine === 'exoplayer' || activeChannel.origin === 'user_upload' || Boolean(activeChannel.sourceFileName));

  return (
    <div
      id="transparent-tv-screen"
      onClick={onRestore}
      className="fixed inset-0 z-50 bg-transparent flex flex-col justify-end items-center p-6 cursor-pointer select-none"
      title="اضغط زر OK بالريموت أو انقر هنا لفتح التطبيق"
    >
      {/* إشعار التبديل المباشر بين القنوات بالرقم في الريموت */}
      {channelToast && (
        <div
          id="hidden-channel-toast"
          className="mb-3 px-5 py-2.5 rounded-2xl bg-amber-500/95 text-slate-950 font-black text-sm shadow-2xl flex items-center gap-2.5 animate-bounce"
        >
          <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-lg text-xs font-mono font-bold">
            #{channelToast.number}
          </span>
          <span>{channelToast.name}</span>
        </div>
      )}

      {/* شريط عائم سفلي شفاف وأنيق لا يحجب صورة التلفزيون */}
      <div
        className={`transition-opacity duration-500 ease-in-out ${
          showHint ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        } max-w-lg w-auto mx-auto`}
      >
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/85 border border-slate-700 text-white shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-100 truncate max-w-[180px] sm:max-w-xs">
              {activeChannel?.name || 'البث الصوتي'}
            </span>
            {isExoPlayer && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                ⚡ صوت الرسيفر
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-white/20 shrink-0" />

          <button
            type="button"
            id="btn-transparent-restore"
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            className="tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold shadow transition-all cursor-pointer shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>اضغط <strong className="font-mono bg-blue-800 px-1 py-0.5 rounded text-[11px]">OK</strong> لفتح التطبيق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
