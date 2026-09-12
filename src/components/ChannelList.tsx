import React, { useState, useMemo } from 'react';
import { Volume2, Search, Radio, Tv, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Channel, PlayerStatus } from '../types';

interface ChannelListProps {
  channels: Channel[];
  activeChannel: Channel | null;
  status: PlayerStatus;
  onSelectChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: string, e: React.MouseEvent) => void;
  onClearAllChannels: () => void;
}

const ITEMS_PER_PAGE = 40; // خفيف جداً على رامات ومعالج الرسيفر

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  activeChannel,
  status,
  onSelectChannel,
  onDeleteChannel,
  onClearAllChannels,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  // Pagination for weak Android TV boxes (prevents freezing DOM)
  const totalPages = Math.max(1, Math.ceil(filteredChannels.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedChannels = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredChannels.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredChannels, safeCurrentPage]);

  // Reset page when searching or changing group
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
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
          <Tv className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-lg font-bold text-slate-300">لا توجد قنوات محمّلة حالياً</h3>
          <p className="text-sm text-slate-400">
            اضغط على زر <span className="text-blue-400 font-semibold">"إضافة ملف M3U"</span> في الأعلى لاختيار ملف وإضافته للقائمة.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="channel-list-section" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header with Search, Group Selector & Clear All button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100">
              قائمة القنوات ({channels.length})
            </h2>
            {filteredChannels.length !== channels.length && (
              <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded-md">
                المطابقة: {filteredChannels.length}
              </span>
            )}
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
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold cursor-pointer transition-colors"
              >
                نعم، مسح الكل
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button
              id="btn-clear-all-channels"
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl text-rose-400 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/40 hover:border-rose-800 transition-all cursor-pointer"
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
                className="bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-blue-500 cursor-pointer"
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

      {/* Channels Grid / List (Lightweight DOM for Android TV) */}
      <div
        id="channels-scroll-container"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[56vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
      >
        {paginatedChannels.map((channel, idx) => {
          const globalIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE + idx;
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
                if (e.key === 'Enter' || e.keyCode === 13) {
                  onSelectChannel(channel);
                }
              }}
              className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl text-right transition-colors cursor-pointer border focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                isCurrentActive
                  ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-800/70 hover:bg-slate-800 focus:bg-slate-800 border-slate-700/60 hover:border-slate-600 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Play / Active Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isCurrentActive
                      ? isPlaying
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                      : 'bg-slate-700/60 text-slate-400'
                  }`}
                >
                  {isCurrentActive ? (
                    isPlaying ? (
                      <span className="text-xs font-black">▶</span>
                    ) : isLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400">{globalIdx + 1}</span>
                  )}
                </div>

                {/* Logo / Thumbnail if exists */}
                {channel.logo ? (
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
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
                    <h4 className={`text-xs sm:text-sm font-bold truncate ${isCurrentActive ? 'text-emerald-300' : 'text-slate-100'}`}>
                      {channel.name}
                    </h4>
                    {isCurrentActive && (
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ▶ شغالة
                      </span>
                    )}
                  </div>
                  {channel.group && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {channel.group}
                    </p>
                  )}
                </div>
              </div>

              {/* زر حذف القناة */}
              <button
                type="button"
                id={`btn-delete-channel-${channel.id || globalIdx}`}
                onClick={(e) => onDeleteChannel(channel.id, e)}
                title="حذف هذه القناة من القائمة"
                className="opacity-40 group-hover:opacity-100 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls (Easy on TV Remote) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          <span className="text-slate-400 font-mono">
            صفحة <strong className="text-white">{safeCurrentPage}</strong> من <strong className="text-slate-300">{totalPages}</strong>
          </span>

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <span>التالي</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
