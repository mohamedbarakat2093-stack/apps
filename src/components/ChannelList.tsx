import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Volume2, Search, Radio, Tv, Trash2, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import { Channel, PlayerStatus } from '../types';

interface ChannelListProps {
  channels: Channel[];
  activeChannel: Channel | null;
  status: PlayerStatus;
  title?: string;
  activeView?: 'audio_channels' | 'preset';
  onSelectChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: string, e: React.MouseEvent) => void;
  onClearAllChannels: () => void;
  onUploadNewFile?: () => void;
}

const ITEMS_PER_PAGE = 40; // خفيف وسريع على رامات ومعالج الرسيفر

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  activeChannel,
  status,
  title,
  activeView,
  onSelectChannel,
  onDeleteChannel,
  onClearAllChannels,
  onUploadNewFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // حالة إدخال أرقام الريموت كنترول للوصول السريع
  const [enteredDigits, setEnteredDigits] = useState<string>('');
  const [channelJumpToast, setChannelJumpToast] = useState<{ number: number; name?: string; notFound?: boolean } | null>(null);
  const digitTimeoutRef = useRef<any>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Extract unique groups
  const groups = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < channels.length; i++) {
      const g = channels[i].group;
      if (g) set.add(g);
    }
    return Array.from(set);
  }, [channels]);

  // Filter channels based on search and selected group
  const filteredChannels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query && selectedGroup === 'all') {
      return channels;
    }

    return channels.filter((c) => {
      const matchesQuery =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.group && c.group.toLowerCase().includes(query));

      const matchesGroup = selectedGroup === 'all' || c.group === selectedGroup;

      return matchesQuery && matchesGroup;
    });
  }, [channels, searchQuery, selectedGroup]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredChannels.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedChannels = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredChannels.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredChannels, safeCurrentPage]);

  // استماع لأرقام الريموت كنترول للوصول المباشر للقناة
  // ملاحظة مهمة: تم استبعاد keycode 13 و 23 و 66 (مفاتيح OK / Enter / Dpad Center)
  // والاعتماد فقط على المفاتيح التي تمثل أرقام حقيقية
  useEffect(() => {
    if (channels.length === 0) return;

    const handleRemoteNumberPress = (e: KeyboardEvent) => {
      // تجاهل أزرار التأكيد أو الاختيار في الريموت (OK / Enter / Dpad Center)
      if (
        e.key === 'Enter' ||
        e.key === 'Ok' ||
        e.key === 'Select' ||
        e.code === 'Enter' ||
        e.code === 'NumpadEnter' ||
        e.keyCode === 13 ||
        e.keyCode === 23 || // Android KEYCODE_DPAD_CENTER
        e.keyCode === 66    // Android KEYCODE_ENTER
      ) {
        return;
      }

      // تجنب اعتراض الأرقام إذا كان المستخدم يكتب في حقل إدخال
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      let digit: string | null = null;

      // 1. فحص حرف e.key
      if (/^[0-9]$/.test(e.key)) {
        digit = e.key;
      } else if (e.code && /^Digit[0-9]$/.test(e.code)) {
        digit = e.code.replace('Digit', '');
      } else if (e.code && /^Numpad[0-9]$/.test(e.code)) {
        digit = e.code.replace('Numpad', '');
      } else if (e.keyCode >= 48 && e.keyCode <= 57) {
        // مفاتيح 0-9 القياسية
        digit = String(e.keyCode - 48);
      } else if (e.keyCode >= 96 && e.keyCode <= 105) {
        // مفاتيح Numpad 0-9
        digit = String(e.keyCode - 96);
      }

      if (digit !== null) {
        // تجميع الأرقام المكتوبة وراء بعض (مثلاً ضغط 1 ثم 2 ليصبح 12)
        setEnteredDigits((prev) => {
          const newNumberStr = prev + digit;

          if (digitTimeoutRef.current) clearTimeout(digitTimeoutRef.current);

          digitTimeoutRef.current = setTimeout(() => {
            const channelNumber = parseInt(newNumberStr, 10);
            if (!isNaN(channelNumber) && channelNumber > 0) {
              const targetIndex = channelNumber - 1; // 1-based index
              if (targetIndex >= 0 && targetIndex < channels.length) {
                const targetChannel = channels[targetIndex];
                // الانتقال للصفحة التي تحتوي هذه القناة
                const targetPage = Math.floor(targetIndex / ITEMS_PER_PAGE) + 1;
                setCurrentPage(targetPage);
                // تشغيل القناة مباشرة لتجربتها والتأكد منها فورياً
                onSelectChannel(targetChannel);

                // إشعار مرئي بالرقم واسم القناة على الشاشة
                setChannelJumpToast({ number: channelNumber, name: targetChannel.name });

                // نقل الفوكس للعنصر في الشاشة
                setTimeout(() => {
                  const elem = document.getElementById(`channel-item-${targetIndex}`);
                  elem?.focus();
                  elem?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              } else {
                setChannelJumpToast({ number: channelNumber, notFound: true });
              }
            }
            setEnteredDigits('');

            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = setTimeout(() => {
              setChannelJumpToast(null);
            }, 3000);
          }, 1000);

          return newNumberStr;
        });
      }
    };

    window.addEventListener('keydown', handleRemoteNumberPress);
    return () => {
      window.removeEventListener('keydown', handleRemoteNumberPress);
      if (digitTimeoutRef.current) clearTimeout(digitTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [channels, onSelectChannel]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleGroupChange = (val: string) => {
    setSelectedGroup(val);
    setCurrentPage(1);
  };

  if (channels.length === 0) {
    return (
      <div
        id="empty-channel-list"
        className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400 shadow-inner">
          <Tv className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-lg font-bold text-slate-200">
            {activeView === 'audio_channels' ? 'لا توجد ملفات قنوات صوتية حتى الآن' : 'لا توجد قنوات محمّلة حالياً'}
          </h3>
          <p className="text-sm text-slate-400">
            {activeView === 'audio_channels'
              ? 'يمكنك رفع ملف أو أكثر (M3U, CFG, TXT) لتنزيل جميع القنوات في هذه الخانة وتشغيلها بسهولة وبأعلى جودة.'
              : 'اضغط على أحد أزرار الراديو الجاهزة أو اضغط على "القنوات الصوتية" لرفع ملفاتك الخاصة.'}
          </p>
        </div>
        {onUploadNewFile && (
          <button
            type="button"
            onClick={onUploadNewFile}
            className="tv-focusable px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/30 cursor-pointer"
          >
            رفع ملف قنوات (M3U / CFG / TXT)
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="channel-list-section" className="relative bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* مؤشر إدخال رقم القناة بالريموت (OSD Channel Number Box) */}
      {enteredDigits && (
        <div
          id="remote-channel-input-osd"
          className="fixed top-20 right-6 sm:right-12 z-50 bg-slate-950/95 border-2 border-emerald-400 text-white px-6 py-4 rounded-3xl shadow-2xl shadow-black/80 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
            <Hash className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-bold">الانتقال للقناة بالريموت:</p>
            <div className="text-4xl font-black font-mono tracking-widest text-emerald-300 drop-shadow-md">
              {enteredDigits}
              <span className="animate-pulse">_</span>
            </div>
          </div>
        </div>
      )}

      {/* تنبيه نتيجة الانتقال للقناة */}
      {channelJumpToast && (
        <div
          id="remote-channel-toast"
          className={`fixed top-20 right-6 sm:right-12 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-bold animate-in fade-in zoom-in-95 duration-200 ${
            channelJumpToast.notFound
              ? 'bg-rose-950/95 border-rose-500 text-rose-200 shadow-rose-950/50'
              : 'bg-emerald-950/95 border-emerald-400 text-emerald-200 shadow-emerald-950/50'
          }`}
        >
          {channelJumpToast.notFound ? (
            <span>القناة رقم {channelJumpToast.number} غير موجودة بالقائمة!</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>
                قناة رقم {channelJumpToast.number}: <strong className="text-white">{channelJumpToast.name}</strong> (جاري التشغيل)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Header with Search, Group Selector, Clear All & Remote Numbers Hint */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100">
              {title || 'قائمة القنوات'} ({channels.length})
            </h2>
            {filteredChannels.length !== channels.length && (
              <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded-md">
                المطابقة: {filteredChannels.length}
              </span>
            )}
          </div>

          {/* تلميح دعم أرقام الريموت كنترول */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/70 border border-slate-700/80 text-[11px] text-slate-300 font-medium">
            <span className="w-4 h-4 rounded-md bg-blue-600/30 text-blue-400 font-mono font-bold flex items-center justify-center text-[10px] border border-blue-500/30">
              1-9
            </span>
            <span>أرقام الريموت تفتح القناة مباشرة</span>
          </div>

          {/* زر مسح الكل */}
          {showClearConfirm ? (
            <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-800 px-2.5 py-1 rounded-xl text-xs">
              <span className="text-rose-200">تأكيد مسح كل القنوات؟</span>
              <button
                type="button"
                onClick={() => {
                  onClearAllChannels();
                  setShowClearConfirm(false);
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold cursor-pointer transition-colors"
              >
                نعم، مسح الكل
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button
              id="btn-clear-all-channels"
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="tv-focusable flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl text-rose-400 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/40 hover:border-rose-800 transition-all cursor-pointer"
              title="مسح قائمة القنوات بالكامل"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح الكل</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="channel-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="بحث في القنوات..."
              className="w-full pl-3 pr-9 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Group Filter (if available) */}
          {groups.length > 0 && (
            <div className="relative">
              <select
                id="channel-group-filter"
                value={selectedGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="tv-focusable bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">كل المجموعات ({channels.length})</option>
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Channels Grid / List with High Visibility TV Remote Focus & Hover Animation */}
      <div
        id="channels-scroll-container"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[58vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
      >
        {paginatedChannels.map((channel, idx) => {
          const globalIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE + idx;
          const channelNumber = globalIdx + 1;
          const isCurrentActive = activeChannel?.id === channel.id || activeChannel?.url === channel.url;
          const isPlaying = isCurrentActive && status === 'playing';
          const isLoading = isCurrentActive && (status === 'loading' || status === 'reconnecting');

          return (
            <div
              key={channel.id || globalIdx}
              id={`channel-item-${globalIdx}`}
              tabIndex={0}
              onClick={() => onSelectChannel(channel)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66) {
                  e.preventDefault();
                  onSelectChannel(channel);
                }
              }}
              className={`tv-focusable group flex items-center justify-between gap-2.5 p-3 rounded-2xl text-right cursor-pointer border transition-all duration-150 select-none ${
                isCurrentActive
                  ? 'tv-channel-active bg-gradient-to-l from-emerald-950/90 to-slate-900 border-emerald-500 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-slate-500 text-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Play / Active Icon with Channel Number */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isCurrentActive
                      ? isPlaying
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
                        : 'bg-amber-500 text-white shadow-lg shadow-amber-500/40'
                      : 'bg-slate-700/70 text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-focus:bg-blue-600 group-focus:text-white'
                  }`}
                >
                  {isCurrentActive ? (
                    isPlaying ? (
                      <span className="text-sm font-black">▶</span>
                    ) : isLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )
                  ) : (
                    <span className="text-xs font-mono font-bold">{channelNumber}</span>
                  )}
                </div>

                {/* Logo / Thumbnail if exists */}
                {channel.logo ? (
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      loading="lazy"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}

                {/* Channel Meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className={`text-sm font-bold truncate transition-colors ${
                      isCurrentActive 
                        ? 'text-emerald-300' 
                        : 'text-slate-100 group-hover:text-blue-300 group-focus:text-blue-300'
                    }`}>
                      {channel.name}
                    </h4>
                    {isCurrentActive && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        {isPlaying ? '▶ شغالة' : 'مؤقت'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {channel.group && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {channel.group}
                      </p>
                    )}
                    {channel.sourceFileName && (
                      <span className="text-[10px] text-blue-300 font-medium bg-blue-950/70 border border-blue-800/60 px-1.5 py-0.2 rounded">
                        {channel.sourceFileName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* رقم القناة في الزاوية للريموت */}
              <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-300 group-focus:text-blue-300 pl-1 font-bold">
                #{channelNumber}
              </span>

              {/* زر حذف القناة */}
              <button
                type="button"
                id={`btn-delete-channel-${channel.id || globalIdx}`}
                onClick={(e) => onDeleteChannel(channel.id, e)}
                title="حذف هذه القناة من القائمة"
                className="opacity-40 group-hover:opacity-100 group-focus:opacity-100 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 p-1.5 rounded-xl transition-all shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls with high visibility TV Focus */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="tv-focusable flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded-xl transition-all cursor-pointer font-bold border border-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
            <span>الصفحة السابقة</span>
          </button>

          <span className="text-slate-300 font-mono text-sm">
            صفحة <strong className="text-emerald-400 text-base">{safeCurrentPage}</strong> من <strong className="text-slate-300">{totalPages}</strong>
          </span>

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="tv-focusable flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded-xl transition-all cursor-pointer font-bold border border-slate-700"
          >
            <span>الصفحة التالية</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
