import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopControls } from './components/TopControls';
import { ForegroundNotification } from './components/ForegroundNotification';
import { ChannelList } from './components/ChannelList';
import { HiddenScreenOverlay } from './components/HiddenScreenOverlay';
import { UploadM3UModal } from './components/UploadM3UModal';
import { EmbeddedFileExplorerModal } from './components/EmbeddedFileExplorerModal';
import { ExoPlayerModal } from './components/ExoPlayerModal';
import { PresetPlaylistsBar } from './components/PresetPlaylistsBar';
import { SplashScreen } from './components/SplashScreen';
import { parsePlaylistFile } from './utils/m3uParser';
import { playerEngine } from './services/playerService';
import {
  EGYPTIAN_RADIO_PRESET,
  QURAN_RECITERS_PRESET,
  EGYPTIAN_SINGERS_PRESET,
  ANIS_AND_SPORTS_PRESET,
  ALL_PRESETS,
  PresetPlaylist,
} from './data/presetPlaylists';
import { Channel, PlayerStatus, RetryState, ActiveView } from './types';
import { AlertCircle, CheckCircle2, Info, Radio, Sparkles } from 'lucide-react';

const STORAGE_USER_AUDIO_CHANNELS_KEY = 'm3u_user_audio_channels';
const STORAGE_USER_FILES_KEY = 'm3u_user_files_list';
const STORAGE_LAST_PLAYED_KEY = 'm3u_last_played_channel';
const STORAGE_ACTIVE_VIEW_KEY = 'm3u_active_view';
const STORAGE_ACTIVE_PRESET_KEY = 'm3u_active_preset_id';

interface UploadedFileRecord {
  id: string;
  name: string;
  count: number;
  uploadedAt: number;
}

export default function App() {
  // Navigation / View state
  const [activeView, setActiveView] = useState<ActiveView>('preset');
  const [activePresetId, setActivePresetId] = useState<string>(EGYPTIAN_RADIO_PRESET.id);

  // Channels state
  const [uploadedChannels, setUploadedChannels] = useState<Channel[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRecord[]>([]);
  const [presetChannels, setPresetChannels] = useState<Channel[]>(EGYPTIAN_RADIO_PRESET.channels);

  // Player state
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');
  const [retryState, setRetryState] = useState<RetryState>({
    attempt: 0,
    maxAttempts: 3,
    delaySeconds: 0,
    active: false,
  });

  // UI state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [isHiddenScreen, setIsHiddenScreen] = useState<boolean>(false);
  const [autoplayBlockedChannel, setAutoplayBlockedChannel] = useState<Channel | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isEmbeddedExplorerOpen, setIsEmbeddedExplorerOpen] = useState<boolean>(false);
  const [isExoPlayerModalOpen, setIsExoPlayerModalOpen] = useState<boolean>(false);
  const [isAudioBoosted, setIsAudioBoosted] = useState<boolean>(() => playerEngine.isAudioBoosted());
  // شاشة البداية (Splash Screen) تظهر لمرة واحدة فقط عند فتح التطبيق ولا تستهلك المعالج
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('audiocast_splash_shown');
    } catch (_) {
      return true;
    }
  });

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
    try {
      sessionStorage.setItem('audiocast_splash_shown', 'true');
    } catch (_) {}
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((text: string, type: 'error' | 'success' | 'info' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage({ text, type });
    // رسالة الخطأ أو "القناة مش شغالة" لا تبقى أكثر من نصف ثانية (500ms) حسب طلب المستخدم
    const duration = type === 'error' ? 500 : 2500;
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  }, []);

  // 1. التهيئة الأولية واستعادة البيانات المحفوظة
  useEffect(() => {
    // إعداد مستمعات محرك تشغيل الصوت Hls.js
    playerEngine.setCallbacks({
      onStatusChange: (status) => setPlayerStatus(status),
      onActiveChannelChange: (channel) => setActiveChannel(channel),
      onRetryUpdate: (retry) => setRetryState(retry),
      onErrorToast: (msg) => showToast(msg, 'error'),
      onAudioBoostChange: (boosted) => setIsAudioBoosted(boosted),
    });

    // استعادة ملفات وقنوات المستخدم المرفوعة أو تهيئتها التلقائية بباقة الرياضة وراديو أنيس
    try {
      const storedAudioChannels = localStorage.getItem(STORAGE_USER_AUDIO_CHANNELS_KEY);
      if (storedAudioChannels) {
        const parsed: Channel[] = JSON.parse(storedAudioChannels);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // استبعاد أي قنوات افتراضية قديمة لراديو أنيس تم تخزينها تلقائياً سابقاً
          const cleanUserChannels = parsed.filter(
            (ch) => ch.sourceFileName !== 'باقة راديو أنيس والرياضة العربية' && !ch.id.startsWith('default_audio_')
          );
          const normalized: Channel[] = cleanUserChannels.map((ch) => ({
            ...ch,
            origin: 'user_upload',
            engine: 'exoplayer',
          }));
          setUploadedChannels(normalized);
        }
      } else {
        // القنوات الصوتية تبدأ فارغة ونظيفة حتى يقوم المستخدم برفع ملفه الخاص
        setUploadedChannels([]);
      }

      const storedFiles = localStorage.getItem(STORAGE_USER_FILES_KEY);
      if (storedFiles) {
        const parsedFiles: UploadedFileRecord[] = JSON.parse(storedFiles);
        if (Array.isArray(parsedFiles)) {
          const cleanFiles = parsedFiles.filter((f) => f.id !== 'init_anis_sports');
          setUploadedFiles(cleanFiles);
        }
      } else {
        setUploadedFiles([]);
      }

      const savedView = localStorage.getItem(STORAGE_ACTIVE_VIEW_KEY) as ActiveView | null;
      if (savedView === 'audio_channels') {
        setActiveView('audio_channels');
      }

      const savedPresetId = localStorage.getItem(STORAGE_ACTIVE_PRESET_KEY);
      if (savedPresetId) {
        const matchingPreset = ALL_PRESETS.find((p) => p.id === savedPresetId);
        if (matchingPreset) {
          setActivePresetId(matchingPreset.id);
          setPresetChannels(matchingPreset.channels);
        }
      }
    } catch (err) {
      console.warn('Error restoring cache:', err);
    }

    // استئناف آخر قناة كانت شغالة وتأكيد كتم الأصوات الأخرى
    try {
      const lastPlayedStr = localStorage.getItem(STORAGE_LAST_PLAYED_KEY);
      if (lastPlayedStr) {
        let lastChannel: Channel = JSON.parse(lastPlayedStr);
        // تحديث رابط القناة تلقائياً من القوائم الحديثة في حال كانت مسجلة برابط قديم
        for (const preset of ALL_PRESETS) {
          const fresh = preset.channels.find((c) => c.id === lastChannel.id || c.name === lastChannel.name);
          if (fresh) {
            lastChannel = { ...lastChannel, url: fresh.url };
            localStorage.setItem(STORAGE_LAST_PLAYED_KEY, JSON.stringify(lastChannel));
            break;
          }
        }

        if (lastChannel && lastChannel.url) {
          playerEngine.playChannel(lastChannel, true)
            .then((played) => {
              if (played) {
                showToast(`تم استئناف تشغيل: "${lastChannel.name}"`, 'success');
              } else {
                setAutoplayBlockedChannel(lastChannel);
              }
            })
            .catch(() => {
              setAutoplayBlockedChannel(lastChannel);
            });
        }
      }
    } catch (e) {
      console.warn('Error checking last played channel:', e);
    }

    // دعم مفتاح Home وأزرار ريموت الرسيفر والشاشات
    const handleRemoteKeys = (e: KeyboardEvent) => {
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

    // استقبال محتوى ملفات M3U المقروءة مباشرة من الفلاشة عبر كود أندرويد الأصلي على الرسيفر
    (window as any).onNativeFileRead = (content: string, fileName: string) => {
      if (content && content.trim().length > 0) {
        processUploadedFile(content, fileName || 'قنوات_الرسيفر_الصوتية.m3u', true);
        showToast('تمت إضافة قنوات الملف بنجاح في القنوات الصوتية', 'success');
      }
    };

    window.addEventListener('keydown', handleRemoteKeys);
    return () => {
      window.removeEventListener('keydown', handleRemoteKeys);
      delete (window as any).onNativeFileRead;
    };
  }, [showToast]);

  // الضغط على زر "القنوات الصوتية": يعرض قنوات ملفات المستخدم المرفوعة
  const handleSelectAudioChannelsView = () => {
    setActiveView('audio_channels');
    try {
      localStorage.setItem(STORAGE_ACTIVE_VIEW_KEY, 'audio_channels');
    } catch (e) {
      // ignore
    }

    // إذا لم تكن هناك أي ملفات مرفوعة بعد، نفتح نافذة الرفع فوراً للمساعدة
    if (uploadedChannels.length === 0) {
      handleLoadNewFileClick();
      showToast('قم برفع ملفك الأول (M3U, CFG, TXT) لتنزيل قنواته في القنوات الصوتية', 'info');
    } else {
      showToast(`تم فتح خانة القنوات الصوتية (${uploadedChannels.length} قناة)`, 'info');
    }
  };

  // فتح تطبيق مستعرض وقارئ ملفات القنوات المدمج (M3U / TXT / CFG)
  const handleLoadNewFileClick = () => {
    setIsEmbeddedExplorerOpen(true);
  };

  // فتح مستعرض ملفات الجهاز أو الفلاش ميموري (يدعم جسر أندرويد للرسيفر أولاً)
  const handleTriggerNativeFilePicker = () => {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    if (w?.ExoPlayer?.openNativeFilePicker) {
      try {
        w.ExoPlayer.openNativeFilePicker();
        return;
      } catch (_) {}
    } else if (w?.Android?.openNativeFilePicker) {
      try {
        w.Android.openNativeFilePicker();
        return;
      } catch (_) {}
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // معالجة رفع ملف جديد عبر مستعرض الملفات: تنزل جميع قنواته في خانة "القنوات الصوتية" حصراً
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let content = '';

      // محاولة 1: قراءة الملف بواسطة file.text() الحديثة والآمنة
      if (typeof file.text === 'function') {
        try {
          content = await file.text();
        } catch (_) {
          content = '';
        }
      }

      // محاولة 2: استخدام FileReader مع محاولات بديلة لتفادي مشاكل الصلاحيات في أندرويد 6-9
      if (!content) {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => {
            try {
              const r2 = new FileReader();
              r2.onload = () => resolve((r2.result as string) || '');
              r2.onerror = () => reject(new Error('فشل قراءة الملف عبر FileReader'));
              r2.readAsBinaryString(file);
            } catch (err) {
              reject(err);
            }
          };
          reader.readAsText(file, 'utf-8');
        });
      }

      if (content && content.trim().length > 0) {
        processUploadedFile(content, file.name, false);
      } else {
        showToast('الملف فارغ أو لم يتم العثور على أسطر صالحة بداخله', 'error');
      }
    } catch (err) {
      console.warn('File read error on receiver:', err);
      showToast(
        'تعذر قراءة ملف USB مباشرة من المتصفح. يرجى فتح نافذة "إضافة قنوات" واستخدام خيار "لصق نص الملف" بنقرة واحدة.',
        'error'
      );
    }
  };

  // معالجة وحفظ الملفات في خانة "القنوات الصوتية" (تدعم الاستبدال أو الإضافة)
  const processUploadedFile = (content: string, fileName: string, overwrite = false) => {
    const result = parsePlaylistFile(content, fileName);

    if (!result.success || result.channels.length === 0) {
      showToast(
        result.error ||
          'لم يتم إضافة أي قنوات: لم يتم العثور على روابط قنوات صالحة تبدأ بـ http:// أو https:// (صيغ مدعومة: M3U, TXT, CFG)',
        'error'
      );
      return;
    }

    // وسم القنوات بالملف والمصدر وتفعيل مشغل ExoPlayer
    const taggedChannels: Channel[] = result.channels.map((ch, idx) => ({
      ...ch,
      id: ch.id || `upload_${Date.now()}_${idx}`,
      origin: 'user_upload',
      sourceFileName: fileName,
      engine: 'exoplayer',
    }));

    // دمج القنوات في خانة "القنوات الصوتية" مع منع التكرار برابط البث
    setUploadedChannels((prev) => {
      const existingUrls = new Set(prev.map((c) => c.url));
      const newChannels = overwrite
        ? taggedChannels
        : taggedChannels.filter((c) => !existingUrls.has(c.url));

      // إذا كانت جميع القنوات مضافة مسبقاً ولم يتم اختيار الاستبدال
      if (!overwrite && newChannels.length === 0) {
        showToast(
          `جميع قنوات الملف (${taggedChannels.length} قناة) موجودة بالفعل مسبقاً في القنوات الصوتية`,
          'info'
        );
        setActiveView('audio_channels');
        return prev;
      }

      const merged = overwrite ? taggedChannels : [...prev, ...newChannels];

      try {
        localStorage.setItem(STORAGE_USER_AUDIO_CHANNELS_KEY, JSON.stringify(merged));
      } catch (err) {
        console.warn('Error caching user channels:', err);
      }

      // إضافة اسم الملف لسجل الملفات
      const targetCount = (overwrite ? taggedChannels : newChannels).length;
      const newRecord: UploadedFileRecord = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: fileName,
        count: targetCount,
        uploadedAt: Date.now(),
      };

      setUploadedFiles((prevFiles) => {
        const updatedFiles = [newRecord, ...prevFiles.filter((f) => f.name !== fileName)];
        try {
          localStorage.setItem(STORAGE_USER_FILES_KEY, JSON.stringify(updatedFiles));
        } catch (e) {
          // ignore
        }
        return updatedFiles;
      });

      // التحويل التلقائي لخانة "القنوات الصوتية"
      setActiveView('audio_channels');
      try {
        localStorage.setItem(STORAGE_ACTIVE_VIEW_KEY, 'audio_channels');
      } catch (e) {
        // ignore
      }

      // إشعار النجاح الصريح: تم اضافة وتنزيل القنوات
      showToast(`تم تنزيل وعرض القنوات الصوتية بنجاح (${targetCount} قناة)`, 'success');

      // تشغيل أول قناة مضافة فورياً بمحرك التشغيل المدمج
      const firstChannel = (overwrite ? taggedChannels : newChannels)[0];
      if (firstChannel) {
        setTimeout(() => {
          handleSelectChannel(firstChannel);
          showToast(`جاري تشغيل: "${firstChannel.name}"...`, 'info');
        }, 200);
      }

      return merged;
    });
  };

  // استيراد القنوات المكتشفة من تطبيق مستعرض الملفات المدمج (M3U / TXT / CFG)
  const handleImportChannelsFromExplorer = (channels: Channel[], fileName: string, overwrite = false) => {
    const taggedChannels: Channel[] = channels.map((ch, idx) => ({
      ...ch,
      id: ch.id || `explorer_${Date.now()}_${idx}`,
      origin: 'user_upload',
      sourceFileName: fileName,
      engine: 'exoplayer',
    }));

    setUploadedChannels((prev) => {
      const existingUrls = new Set(prev.map((c) => c.url));
      const newChannels = overwrite
        ? taggedChannels
        : taggedChannels.filter((c) => !existingUrls.has(c.url));

      if (!overwrite && newChannels.length === 0) {
        showToast(
          `جميع قنوات الملف (${taggedChannels.length} قناة) موجودة مسبقاً في القنوات الصوتية`,
          'info'
        );
        setActiveView('audio_channels');
        return prev;
      }

      const merged = overwrite ? taggedChannels : [...prev, ...newChannels];
      try {
        localStorage.setItem(STORAGE_USER_AUDIO_CHANNELS_KEY, JSON.stringify(merged));
        localStorage.setItem(STORAGE_ACTIVE_VIEW_KEY, 'audio_channels');
      } catch (err) {
        console.warn('Error caching user channels:', err);
      }

      // تحديث سجل الملفات
      setUploadedFiles((oldFiles) => {
        const updated = oldFiles.filter((f) => f.name !== fileName);
        const nextList = [
          {
            id: `file_${Date.now()}`,
            name: fileName,
            count: channels.length,
            uploadedAt: Date.now(),
          },
          ...updated,
        ];
        try {
          localStorage.setItem(STORAGE_USER_FILES_KEY, JSON.stringify(nextList));
        } catch (_) {}
        return nextList;
      });

      // تشغيل أول قناة مضافة تلقائياً
      const firstChannel = (overwrite ? taggedChannels : newChannels)[0];
      if (firstChannel) {
        setTimeout(() => {
          handleSelectChannel(firstChannel);
        }, 150);
      }

      return merged;
    });

    setActiveView('audio_channels');
    showToast(`تم فتح وقراءة (${channels.length}) قناة من ملف "${fileName}" بنجاح!`, 'success');
  };

  // عند الضغط على أي من باقات الراديو: تظهر قنواتها في القائمة
  const handleLoadPreset = (preset: PresetPlaylist) => {
    setActiveView('preset');
    setActivePresetId(preset.id);
    setPresetChannels(preset.channels);

    try {
      localStorage.setItem(STORAGE_ACTIVE_VIEW_KEY, 'preset');
      localStorage.setItem(STORAGE_ACTIVE_PRESET_KEY, preset.id);
    } catch (e) {
      // ignore
    }

    showToast(`تم فتح ${preset.title} (${preset.channels.length} قناة)`, 'success');

    // تشغيل أول قناة في الباقة
    if (preset.channels.length > 0) {
      const firstChannel = preset.channels[0];
      setTimeout(() => {
        handleSelectChannel(firstChannel);
      }, 150);
    }
  };

  // اختيار قناة والتشغيل
  const handleSelectChannel = (channel: Channel) => {
    setAutoplayBlockedChannel(null);
    playerEngine.enforceExclusiveAudioFocus();
    playerEngine.playChannel(channel);
  };

  // Play / Pause
  const handleTogglePlayPause = () => {
    if (autoplayBlockedChannel) {
      const ch = autoplayBlockedChannel;
      setAutoplayBlockedChannel(null);
      playerEngine.playChannel(ch);
      return;
    }
    playerEngine.togglePlayPause();
  };

  // إخفاء الشاشة مع استمرار الصوت في الخلفية
  const handleHideScreen = () => {
    setIsHiddenScreen(true);
    playerEngine.maintainBackgroundPlayback();
  };

  const handleRestoreScreen = () => {
    setIsHiddenScreen(false);
  };

  // إيقاف التشغيل كلياً
  const handleStop = () => {
    playerEngine.stop(true);
    setAutoplayBlockedChannel(null);
    showToast('تم إيقاف القناة وإغلاق الخدمة', 'info');
  };

  // حذف قناة من القائمة
  const handleDeleteChannel = (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (activeView === 'audio_channels') {
      setUploadedChannels((prev) => {
        const target = prev.find((c) => c.id === channelId);
        const updated = prev.filter((c) => c.id !== channelId);
        if (activeChannel?.id === channelId) {
          playerEngine.stop(true);
        }
        try {
          localStorage.setItem(STORAGE_USER_AUDIO_CHANNELS_KEY, JSON.stringify(updated));
        } catch (e) {
          // ignore
        }
        showToast(`تم حذف قناة "${target?.name || 'المحددة'}" من القنوات الصوتية`, 'info');
        return updated;
      });
    } else {
      setPresetChannels((prev) => {
        const target = prev.find((c) => c.id === channelId);
        const updated = prev.filter((c) => c.id !== channelId);
        if (activeChannel?.id === channelId) {
          playerEngine.stop(true);
        }
        showToast(`تم حذف قناة "${target?.name || 'المحددة'}" مؤقتاً`, 'info');
        return updated;
      });
    }
  };

  // تفريغ القائمة
  const handleClearAllChannels = () => {
    if (activeChannel) {
      playerEngine.stop(true);
    }
    if (activeView === 'audio_channels') {
      setUploadedChannels([]);
      setUploadedFiles([]);
      try {
        localStorage.removeItem(STORAGE_USER_AUDIO_CHANNELS_KEY);
        localStorage.removeItem(STORAGE_USER_FILES_KEY);
      } catch (e) {
        // ignore
      }
      showToast('تم تفريغ خانة القنوات الصوتية بالكامل', 'info');
    } else {
      setPresetChannels([]);
      showToast('تم مسح قنوات الباقة الحالية', 'info');
    }
  };

  // تحديث القائمة
  const handleRefreshList = () => {
    if (activeView === 'audio_channels') {
      showToast(`القنوات الصوتية محدثة (${uploadedChannels.length} قناة من ${uploadedFiles.length} ملف)`, 'success');
    } else {
      const matchingPreset = ALL_PRESETS.find(
        (p) => p.id === activePresetId
      );
      if (matchingPreset) {
        setPresetChannels(matchingPreset.channels);
        showToast(`تمت استعادة قنوات "${matchingPreset.title}"`, 'success');
      }
    }
  };

  const handleToggleAudioBoost = () => {
    const newState = playerEngine.toggleAudioBoost();
    setIsAudioBoosted(newState);
  };

  // القنوات المعروضة حالياً وفقاً للزر المضغوط
  const currentChannels = activeView === 'audio_channels' ? uploadedChannels : presetChannels;
  const currentTitle =
    activeView === 'audio_channels'
      ? 'القنوات الصوتية (ملفاتك المرفوعة)'
      : ALL_PRESETS.find((p) => p.id === activePresetId)?.title || 'قائمة القنوات';

  return (
    <div
      className={`min-h-screen ${
        isHiddenScreen ? 'bg-transparent' : 'bg-slate-950'
      } text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white`}
    >
      {/* شاشة البداية والترحيب الخفيفة - تعمل مرة واحدة فقط عند فتح التطبيق وتتلاشى تماماً */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* Hidden file picker for user uploads without any format restrictions */}
      <input
        ref={fileInputRef}
        type="file"
        id="hidden-m3u-file-picker"
        accept="*/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* شاشة الإخفاء التام الشفافة مع استمرار الصوت في الخلفية وظهور تطبيق التلفاز تحتها */}
      {isHiddenScreen && (
        <HiddenScreenOverlay
          isHidden={isHiddenScreen}
          activeChannel={activeChannel}
          status={playerStatus}
          onRestore={handleRestoreScreen}
          onTogglePlayPause={handleTogglePlayPause}
          onStop={handleStop}
          channels={currentChannels}
          onSelectChannel={handleSelectChannel}
        />
      )}

      {/* Modal: تطبيق مستعرض وقارئ ملفات القنوات المدمج للرسيفر (M3U / TXT / CFG) */}
      <EmbeddedFileExplorerModal
        isOpen={isEmbeddedExplorerOpen}
        onClose={() => setIsEmbeddedExplorerOpen(false)}
        onImportChannels={handleImportChannelsFromExplorer}
        onOpenFilePickerNative={handleTriggerNativeFilePicker}
        existingChannelsCount={uploadedChannels.length}
      />

      {/* Modal: إضافة ملف القنوات الصوتية الشامل للرسيفر والموبايل */}
      <UploadM3UModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImportContent={processUploadedFile}
        onOpenFilePicker={handleTriggerNativeFilePicker}
        existingChannelsCount={uploadedChannels.length}
      />

      {/* Toast Alert */}
      {!isHiddenScreen && toastMessage && (
        <div
          id="app-toast-alert"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-950 border-rose-500 text-rose-100'
              : toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-100'
              : 'bg-slate-900 border-blue-500 text-slate-100'
          }`}
        >
          {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main App Content - يختفي تماماً في وضع الإخفاء لتظهر شاشة التلفاز كصورة من تحته */}
      {!isHiddenScreen && (
        <>
          <main className="flex-1 max-w-6xl w-full mx-auto p-2.5 sm:p-4 space-y-2.5">
            {/* App Bar / Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-white">AudioCast</h1>
                    {/* Created by placed to the left before Eng: Mohamed Barakat */}
                    <div
                      id="header-author-badge"
                      dir="ltr"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                    >
                      <span className="text-slate-400 font-medium">Created by :</span>
                      <span className="text-blue-400 font-bold">Eng: Mohamed Barakat</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* أقسام وقوائم القنوات (زر القنوات الصوتية الخاص بالملفات المرفوعة + أزرار باقات الراديو) */}
            <PresetPlaylistsBar
              onLoadPreset={handleLoadPreset}
              activePresetId={activePresetId}
              onSelectAudioChannels={handleSelectAudioChannelsView}
              onUploadNewFile={handleLoadNewFileClick}
              uploadedChannelsCount={uploadedChannels.length}
              isAudioChannelsActive={activeView === 'audio_channels'}
            />

            {/* Autoplay resume prompt if browser blocked autoplay policy */}
            {autoplayBlockedChannel && !activeChannel && (
              <div
                id="autoplay-resume-banner"
                className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-emerald-200 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    آخر قناة كانت تعمل: <strong className="text-white">{autoplayBlockedChannel.name}</strong>
                  </span>
                </div>
                <button
                  id="btn-confirm-autoplay"
                  type="button"
                  onClick={() => handleSelectChannel(autoplayBlockedChannel)}
                  className="tv-focusable px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  استئناف التشغيل الآن
                </button>
              </div>
            )}

            {/* أدوات التحكم (Controls) مع زر "القنوات الصوتية" وزر مضاعفة الصوت 3X */}
            <TopControls
              onSelectAudioChannels={handleSelectAudioChannelsView}
              onLoadNewFile={handleLoadNewFileClick}
              onOpenEmbeddedExplorer={() => setIsEmbeddedExplorerOpen(true)}
              onRefreshList={handleRefreshList}
              onHideScreen={handleHideScreen}
              onOpenExoPlayerModal={() => setIsExoPlayerModalOpen(true)}
              isAudioBoosted={isAudioBoosted}
              onToggleAudioBoost={handleToggleAudioBoost}
              hasChannels={currentChannels.length > 0}
              activeChannelName={activeChannel ? activeChannel.name : null}
              activeChannelUrl={activeChannel?.url}
              status={playerStatus}
              hasSavedFile={uploadedChannels.length > 0}
              savedFileName={uploadedFiles[0]?.name}
              isAudioChannelsActive={activeView === 'audio_channels'}
              uploadedChannelsCount={uploadedChannels.length}
            />

            {/* خدمة Foreground Service وإشعار النظام ومفاتيح الميديا في الخلفية */}
            {activeChannel && (
              <ForegroundNotification
                channel={activeChannel}
                status={playerStatus}
                retryState={retryState}
                onTogglePlayPause={handleTogglePlayPause}
                onStop={handleStop}
                onOpenExoPlayerModal={() => setIsExoPlayerModalOpen(true)}
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

            {/* قائمة القنوات (تظهر قنوات الباقة أو خانة القنوات الصوتية للملفات المرفوعة) */}
            <ChannelList
              channels={currentChannels}
              activeChannel={activeChannel}
              status={playerStatus}
              title={currentTitle}
              activeView={activeView}
              onSelectChannel={handleSelectChannel}
              onDeleteChannel={handleDeleteChannel}
              onClearAllChannels={handleClearAllChannels}
              onUploadNewFile={handleLoadNewFileClick}
            />
          </main>

          {/* Footer: نقل Created by : Eng: Mohamed Barakat تحت على اليسار وحذف كل الكلام القديم */}
          <footer className="border-t border-slate-900/80 py-4 px-6 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-start">
              <div
                id="footer-created-by"
                dir="ltr"
                className="flex items-center gap-1.5 text-xs text-slate-400"
              >
                <span className="text-slate-500 font-medium">Created by :</span>
                <span className="text-blue-400 font-bold hover:text-blue-300 transition-colors">
                  Eng: Mohamed Barakat
                </span>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* مشغل ExoPlayer المدمج ومركز التحكم */}
      <ExoPlayerModal
        isOpen={isExoPlayerModalOpen}
        onClose={() => setIsExoPlayerModalOpen(false)}
        activeChannel={activeChannel}
      />
    </div>
  );
}
