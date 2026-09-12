import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopControls } from './components/TopControls';
import { ForegroundNotification } from './components/ForegroundNotification';
import { ChannelList } from './components/ChannelList';
import { HiddenScreenOverlay } from './components/HiddenScreenOverlay';
import { ApkInstallModal } from './components/ApkInstallModal';
import { parseM3U, DEFAULT_SAMPLE_M3U } from './utils/m3uParser';
import { playerEngine } from './services/playerService';
import { Channel, PlayerStatus, RetryState, StoredPlaylist } from './types';
import { AlertCircle, CheckCircle2, Info, Radio, Sparkles, Tv, FileText } from 'lucide-react';

const STORAGE_PLAYLIST_KEY = 'm3u_playlist_cache';
const STORAGE_LAST_CHANNEL_KEY = 'm3u_last_played_channel';

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [savedPlaylist, setSavedPlaylist] = useState<StoredPlaylist | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');
  const [retryState, setRetryState] = useState<RetryState>({
    attempt: 0,
    maxAttempts: 3,
    delaySeconds: 0,
    active: false,
  });
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [isHiddenScreen, setIsHiddenScreen] = useState<boolean>(false);
  const [autoplayBlockedChannel, setAutoplayBlockedChannel] = useState<Channel | null>(null);
  const [showApkGuide, setShowApkGuide] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((text: string, type: 'error' | 'success' | 'info' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // 1. عند فتح التطبيق:
  // - يتحقق: هل فيه ملف m3u محفوظ من قبل؟
  //   - لو أيوه -> يقرأه ويملأ القائمة تلقائياً
  //   - لو لأ -> القائمة تفضل فاضية لحد ما يدوس "تحميل"
  // - يتحقق: هل فيه "آخر قناة" كانت شغالة قبل الإغلاق؟
  //   - لو أيوه -> يشغّلها تلقائياً
  //   - لو لأ -> يستنى تفاعل المستخدم
  useEffect(() => {
    // Setup player callbacks
    playerEngine.setCallbacks({
      onStatusChange: (status) => setPlayerStatus(status),
      onActiveChannelChange: (channel) => setActiveChannel(channel),
      onRetryUpdate: (retry) => setRetryState(retry),
      onErrorToast: (msg) => showToast(msg, 'error'),
    });

    let loadedChannels: Channel[] = [];

    // التحقق من ملف M3U محفوظ من قبل
    try {
      const cached = localStorage.getItem(STORAGE_PLAYLIST_KEY);
      if (cached) {
        const parsedData: StoredPlaylist = JSON.parse(cached);
        if (parsedData && parsedData.rawContent) {
          const result = parseM3U(parsedData.rawContent);
          if (result.success && result.channels.length > 0) {
            setChannels(result.channels);
            setSavedPlaylist(parsedData);
            loadedChannels = result.channels;
          }
        }
      }
    } catch (e) {
      console.warn('Error reading cached playlist:', e);
    }

    // التحقق من آخر قناة كانت شغالة قبل الإغلاق
    try {
      const cachedChannel = localStorage.getItem(STORAGE_LAST_CHANNEL_KEY);
      if (cachedChannel) {
        const lastChan: Channel = JSON.parse(cachedChannel);
        if (lastChan && lastChan.url) {
          // محاولة تشغيل آخر قناة تلقائياً (البند 1)
          playerEngine.playChannel(lastChan, true).catch((err) => {
            console.warn('Autoplay restriction encountered:', err);
            // If browser prevents unprompted autoplay, store for one-tap resume
            setAutoplayBlockedChannel(lastChan);
          });
        }
      }
    } catch (e) {
      console.warn('Error checking last played channel:', e);
    }

    // 7. عند الضغط على Home أو أزرار الريموت في Android TV / Box
    // نفس سلوك Hide تلقائياً (الصوت يفضل شغال في الخلفية)
    const handleRemoteHomeKey = (e: KeyboardEvent) => {
      // Android Keycodes:
      // 3 = KEYCODE_HOME
      // 4 = KEYCODE_BACK
      // 36 = Home on keyboard
      // 179 = KEYCODE_MEDIA_PAUSE
      // 85 = KEYCODE_MEDIA_PLAY_PAUSE
      const isHome =
        e.key === 'Home' ||
        e.code === 'Home' ||
        e.keyCode === 36 ||
        e.keyCode === 3 ||
        e.key === 'BrowserHome' ||
        e.key === 'GoHome';

      if (isHome) {
        e.preventDefault();
        setIsHiddenScreen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleRemoteHomeKey);
    return () => {
      window.removeEventListener('keydown', handleRemoteHomeKey);
    };
  }, [showToast]);

  // 2. عند الضغط على "تحميل ملف m3u جديد"
  // - يفتح File Picker، يختار ملف، يحفظ مساره ومحتواه
  const handleLoadNewFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processM3UContent(content, file.name);
    };

    reader.onerror = () => {
      showToast('الملف مش سليم', 'error');
    };

    reader.readAsText(file);
  };

  // 2. عند الضغط على "تحديث القائمة"
  // - يستخدم نفس المسار/الملف المحفوظ من قبل من غير ما يفتح File Picker
  const handleRefreshList = () => {
    if (!savedPlaylist || !savedPlaylist.rawContent) {
      showToast('لا يوجد ملف محفوظ لتحديثه', 'error');
      return;
    }

    processM3UContent(savedPlaylist.rawContent, savedPlaylist.fileName, true);
  };

  const processM3UContent = (content: string, fileName: string, isRefresh = false) => {
    const result = parseM3U(content);

    // لو الملف فاضي أو تالف -> رسالة "الملف مش سليم" بدل ما يكراش
    if (!result.success || result.channels.length === 0) {
      showToast('الملف مش سليم', 'error');
      return;
    }

    if (isRefresh) {
      // Refresh re-applies the saved content
      const playlistData: StoredPlaylist = {
        fileName,
        rawContent: content,
        channels: result.channels,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_PLAYLIST_KEY, JSON.stringify(playlistData));
      } catch (err) {
        console.warn('Could not save to localStorage:', err);
      }
      setChannels(result.channels);
      setSavedPlaylist(playlistData);
      showToast(`تم تحديث القائمة بنجاح (${result.channels.length} قناة)`, 'success');
      return;
    }

    // الدمج والتركيب على القنوات القديمة (Merge channels without duplicates)
    setChannels((prevChannels) => {
      const existingUrls = new Set(prevChannels.map((c) => c.url));
      const newUniqueChannels = result.channels.filter((c) => !existingUrls.has(c.url));
      const merged = [...prevChannels, ...newUniqueChannels];

      const playlistData: StoredPlaylist = {
        fileName: prevChannels.length > 0 ? `${savedPlaylist?.fileName || 'قائمة'} + ${fileName}` : fileName,
        rawContent: prevChannels.length > 0 ? `${savedPlaylist?.rawContent || ''}\n${content}` : content,
        channels: merged,
        savedAt: Date.now(),
      };

      try {
        localStorage.setItem(STORAGE_PLAYLIST_KEY, JSON.stringify(playlistData));
      } catch (err) {
        console.warn('Could not save to localStorage:', err);
      }

      setSavedPlaylist(playlistData);

      const addedCount = newUniqueChannels.length;
      showToast(
        prevChannels.length > 0
          ? `تم دمج ${addedCount} قناة جديدة (إجمالي القنوات الآن: ${merged.length})`
          : `تم تحميل ${merged.length} قناة من "${fileName}" بنجاح`,
        'success'
      );

      return merged;
    });
  };

  // حذف قناة معينة من القائمة
  const handleDeleteChannel = (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChannels((prev) => {
      const target = prev.find((c) => c.id === channelId);
      const updated = prev.filter((c) => c.id !== channelId);

      // If deleted channel is active, stop it
      if (activeChannel?.id === channelId) {
        playerEngine.stop(true);
      }

      // Update storage
      if (savedPlaylist) {
        const updatedPlaylist = {
          ...savedPlaylist,
          channels: updated,
        };
        try {
          localStorage.setItem(STORAGE_PLAYLIST_KEY, JSON.stringify(updatedPlaylist));
        } catch (err) {
          console.warn('Failed to update storage after channel deletion', err);
        }
        setSavedPlaylist(updatedPlaylist);
      }

      showToast(`تم حذف قناة "${target?.name || 'المحددة'}" من القائمة`, 'info');
      return updated;
    });
  };

  // تفريغ ومسح القائمة كاملة
  const handleClearAllChannels = () => {
    // Stop playback if playing
    if (activeChannel) {
      playerEngine.stop(true);
    }
    setChannels([]);
    setSavedPlaylist(null);
    try {
      localStorage.removeItem(STORAGE_PLAYLIST_KEY);
      localStorage.removeItem('m3u_last_played_channel');
    } catch (e) {
      console.warn('Failed to clear playlist storage', e);
    }
    showToast('تم مسح جميع القنوات وتفريغ القائمة بالكامل', 'info');
  };

  // Quick load demo/sample M3U for instant testing
  const handleLoadSampleM3U = () => {
    processM3UContent(DEFAULT_SAMPLE_M3U, 'قائمة_إذاعات_وقنوات_تجريبية.m3u');
  };

  // 3. عند الضغط على قناة من القائمة
  const handleSelectChannel = (channel: Channel) => {
    setAutoplayBlockedChannel(null);
    playerEngine.playChannel(channel);
  };

  // 5. عند الضغط على Play/Pause
  const handleTogglePlayPause = () => {
    if (autoplayBlockedChannel) {
      const ch = autoplayBlockedChannel;
      setAutoplayBlockedChannel(null);
      playerEngine.playChannel(ch);
      return;
    }
    playerEngine.togglePlayPause();
  };

  // 6. عند الضغط على Hide
  const handleHideScreen = () => {
    setIsHiddenScreen(true);
  };

  const handleRestoreScreen = () => {
    setIsHiddenScreen(false);
  };

  // 8. عند إيقاف القناة أو إغلاق التطبيق نهائياً
  const handleStop = () => {
    playerEngine.stop(true);
    setAutoplayBlockedChannel(null);
    showToast('تم إيقاف القناة وإغلاق الخدمة', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Hidden file picker input */}
      <input
        ref={fileInputRef}
        type="file"
        id="hidden-m3u-file-picker"
        accept=".m3u,.m3u8,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Screen Hide Overlay (Items 6 & 7) */}
      <HiddenScreenOverlay
        isHidden={isHiddenScreen}
        onRestore={handleRestoreScreen}
        activeChannel={activeChannel}
        status={playerStatus}
        onTogglePlayPause={handleTogglePlayPause}
        onStop={handleStop}
      />

      {/* Toast / Alert Notification */}
      {toastMessage && (
        <div
          id="app-toast-alert"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-950 border-rose-500 text-rose-100'
              : toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-100'
              : 'bg-slate-900 border-slate-700 text-slate-100'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main App Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5 flex-1">
        {/* App Title Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  AudioCast
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  M3U
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700">
                  Created by <strong className="text-blue-400 font-bold">Eng: Mohamed Barakat</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Sample Playlist shortcut if empty */}
          {channels.length === 0 && (
            <button
              id="btn-load-sample"
              type="button"
              onClick={handleLoadSampleM3U}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>تحميل قائمة قنوات تجريبية جاهزة</span>
            </button>
          )}
        </header>

        {/* Autoplay resume prompt if browser blocked autoplay policy */}
        {autoplayBlockedChannel && !activeChannel && (
          <div
            id="autoplay-resume-banner"
            className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-emerald-200"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                تم العثور على آخر قناة كانت تعمل قبل الإغلاق: <strong className="text-white">{autoplayBlockedChannel.name}</strong>
              </span>
            </div>
            <button
              id="btn-confirm-autoplay"
              type="button"
              onClick={() => handleSelectChannel(autoplayBlockedChannel)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-emerald-600/30"
            >
              استئناف التشغيل الآن
            </button>
          </div>
        )}

        {/* 1. أدوات التحكم العلوية (Top Controls) */}
        <TopControls
          onLoadNewFile={handleLoadNewFileClick}
          onRefreshList={handleRefreshList}
          onTogglePlayPause={handleTogglePlayPause}
          onHideScreen={handleHideScreen}
          onStop={handleStop}
          onOpenApkGuide={() => setShowApkGuide(true)}
          hasChannels={channels.length > 0}
          activeChannelName={activeChannel ? activeChannel.name : null}
          status={playerStatus}
          hasSavedFile={!!savedPlaylist}
          savedFileName={savedPlaylist?.fileName}
        />

        {/* Modal: APK Installation & Receiver Setup Guide */}
        <ApkInstallModal
          isOpen={showApkGuide}
          onClose={() => setShowApkGuide(false)}
          appUrl={window.location.origin}
        />

        {/* 3 & 5. Foreground Service & MediaSession System Notification */}
        {activeChannel && (
          <ForegroundNotification
            channel={activeChannel}
            status={playerStatus}
            retryState={retryState}
            onTogglePlayPause={handleTogglePlayPause}
            onStop={handleStop}
          />
        )}

        {/* Reconnecting Status Banner */}
        {retryState.active && (
          <div
            id="reconnection-status-banner"
            className="bg-amber-950/70 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between text-amber-200 text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <span>
                انقطع البث مؤقتاً. جاري إعادة الاتصال تلقائياً: المحاولة {retryState.attempt} من {retryState.maxAttempts} (بعد {retryState.delaySeconds} ثوانٍ)...
              </span>
            </div>
          </div>
        )}

        {/* 1 & 3. قائمة القنوات تحت (Channels list below) */}
        <ChannelList
          channels={channels}
          activeChannel={activeChannel}
          status={playerStatus}
          onSelectChannel={handleSelectChannel}
          onDeleteChannel={handleDeleteChannel}
          onClearAllChannels={handleClearAllChannels}
        />
      </main>

      {/* Footer info & developer credits */}
      <footer className="border-t border-slate-900 py-3.5 px-4 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-6xl mx-auto w-full">
        <div>
          AudioCast • مشغل قنوات وبثوث M3U (MediaSession Foreground Service)
        </div>
        <div className="flex items-center gap-1 text-slate-300 font-medium">
          <span>Created by</span>
          <span className="text-blue-400 font-bold">Eng: Mohamed Barakat</span>
        </div>
      </footer>
    </div>
  );
}
