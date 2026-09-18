import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopControls } from './components/TopControls';
import { ForegroundNotification } from './components/ForegroundNotification';
import { ChannelList } from './components/ChannelList';
import { HiddenScreenOverlay } from './components/HiddenScreenOverlay';
import { UploadM3UModal } from './components/UploadM3UModal';
import { EmbeddedFileExplorerModal } from './components/EmbeddedFileExplorerModal';
import { ExoPlayerModal } from './components/ExoPlayerModal';
import { PresetPlaylistsBar } from './components/PresetPlaylistsBar';
import { ReceiverRemoteBar } from './components/ReceiverRemoteBar';
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
import { AudioCastIcon } from './components/AudioCastIcon';

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
  // Navigation / View state - يستعيد الحالة السابقة المحفوظة مباشرة حتى لا يبدأ من البداية عند فتح التطبيق
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    try {
      const v = localStorage.getItem(STORAGE_ACTIVE_VIEW_KEY) as ActiveView;
      if (v === 'audio_channels' || v === 'preset') return v;
    } catch (_) {}
    return 'preset';
  });
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    try {
      const p = localStorage.getItem(STORAGE_ACTIVE_PRESET_KEY);
      if (p) return p;
    } catch (_) {}
    return EGYPTIAN_RADIO_PRESET.id;
  });

  // Channels state
  const [uploadedChannels, setUploadedChannels] = useState<Channel[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USER_AUDIO_CHANNELS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USER_FILES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [presetChannels, setPresetChannels] = useState<Channel[]>(() => {
    try {
      const pId = localStorage.getItem(STORAGE_ACTIVE_PRESET_KEY);
      const found = ALL_PRESETS.find((p) => p.id === pId);
      if (found) return found.channels;
    } catch (_) {}
    return EGYPTIAN_RADIO_PRESET.channels;
  });

  // Player state - يستعيد القناة الأخيرة مباشرة للعمل فوراً
  const [activeChannel, setActiveChannel] = useState<Channel | null>(() => {
    try {
      const last = localStorage.getItem(STORAGE_LAST_PLAYED_KEY);
      if (last) {
        return JSON.parse(last);
      }
    } catch (_) {}
    return null;
  });
  const [previousChannel, setPreviousChannel] = useState<Channel | null>(null);
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((text: string, type: 'error' | 'success' | 'info' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage({ text, type });
    const duration = type === 'error' ? 500 : 2500;
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  }, []);

  // 1. التهيئة الأولية واستعادة البيانات المحفوظة والتشغيل التلقائي المباشر
  useEffect(() => {
    // إعداد مستمعات محرك تشغيل الصوت Hls.js و ExoPlayer (بدون إشعارات تشغيل أو إيقاف)
    playerEngine.setCallbacks({
      onStatusChange: (status) => setPlayerStatus(status),
      onActiveChannelChange: (channel) => setActiveChannel(channel),
      onRetryUpdate: (retry) => setRetryState(retry),
      onErrorToast: () => {}, // إخفاء إشعارات الخطأ المزعجة وتشغيل القنوات بصمت ونقاء
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
          playerEngine.playChannel(lastChannel, true).catch(() => {});
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

    const handleOpenExplorerEvent = () => {
      setIsEmbeddedExplorerOpen(true);
    };

    window.addEventListener('keydown', handleRemoteKeys);
    window.addEventListener('audiocast:open_embedded_explorer', handleOpenExplorerEvent);
    return () => {
      window.removeEventListener('keydown', handleRemoteKeys);
      window.removeEventListener('audiocast:open_embedded_explorer', handleOpenExplorerEvent);
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

  // فتح مستعرض ملفات الجهاز أو الفلاش ميموري المدمج بالتطبيق مباشرة بدون استدعاء مدير ملفات الرسيفر الخارجي
  const handleTriggerNativeFilePicker = () => {
    setIsEmbeddedExplorerOpen(true);
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

    // تشغيل أول قناة في الباقة
    if (preset.channels.length > 0) {
      const firstChannel = preset.channels[0];
      setTimeout(() => {
        handleSelectChannel(firstChannel);
      }, 150);
    }
  };

  // اختيار قناة والتشغيل المباشر للصوت
  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel((currentActive) => {
      if (currentActive && currentActive.id !== channel.id) {
        setPreviousChannel(currentActive);
      }
      return channel;
    });
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
    showToast(
      newState
        ? 'تم تفعيل مضاعفة وتضخيم الصوت 2.85X (+9 dB) بنجاح'
        : 'تم إيقاف مضاعفة الصوت والعودة للمستوى الافتراضي',
      'info'
    );
  };

  // القنوات المعروضة حالياً وفقاً للزر المضغوط
  const currentChannels = activeView === 'audio_channels' ? uploadedChannels : presetChannels;
  const currentTitle =
    activeView === 'audio_channels'
      ? 'القنوات الصوتية (ملفاتك المرفوعة)'
      : ALL_PRESETS.find((p) => p.id === activePresetId)?.title || 'قائمة القنوات';

  // معالجة أزرار ريموت الرسيفر (Dreamax B9S2X / Amlogic Remote Controls)
  const handleRecallLastChannel = useCallback(() => {
    if (previousChannel) {
      handleSelectChannel(previousChannel);
    }
  }, [previousChannel]);

  const handleNextChannel = useCallback(() => {
    if (currentChannels.length === 0) return;
    const curIdx = activeChannel
      ? currentChannels.findIndex((c) => c.id === activeChannel.id || c.url === activeChannel.url)
      : -1;
    const nextIdx = (curIdx + 1) % currentChannels.length;
    handleSelectChannel(currentChannels[nextIdx]);
  }, [currentChannels, activeChannel]);

  const handlePrevChannel = useCallback(() => {
    if (currentChannels.length === 0) return;
    const curIdx = activeChannel
      ? currentChannels.findIndex((c) => c.id === activeChannel.id || c.url === activeChannel.url)
      : 0;
    const prevIdx = (curIdx - 1 + currentChannels.length) % currentChannels.length;
    handleSelectChannel(currentChannels[prevIdx]);
  }, [currentChannels, activeChannel]);

  // الاستماع لأحداث ريموت الرسيفر المباشرة (أزرار الألوان، Recall، CH+/-، إلخ)
  useEffect(() => {
    const onRemoteRed = () => handleToggleAudioBoost();
    const onRemoteGreen = () => setIsHiddenScreen((prev) => !prev);
    const onRemoteYellow = () => handleLoadPreset(ANIS_AND_SPORTS_PRESET);
    const onRemoteBlue = () => handleSelectAudioChannelsView();
    const onRemoteChNext = () => handleNextChannel();
    const onRemoteChPrev = () => handlePrevChannel();
    const onRemoteRecall = () => handleRecallLastChannel();
    const onRemotePlayPause = () => handleTogglePlayPause();
    const onRemoteStop = () => handleStop();

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // أزرار الألوان في ريموت الرسيفر (تتوافق أيضاً مع F1-F4)
      if (e.key === 'F1' || e.code === 'F1') {
        e.preventDefault();
        onRemoteRed();
      } else if (e.key === 'F2' || e.code === 'F2') {
        e.preventDefault();
        onRemoteGreen();
      } else if (e.key === 'F3' || e.code === 'F3') {
        e.preventDefault();
        onRemoteYellow();
      } else if (e.key === 'F4' || e.code === 'F4') {
        e.preventDefault();
        onRemoteBlue();
      } else if (e.key === 'PageDown' || e.code === 'PageDown') {
        e.preventDefault();
        onRemoteChNext();
      } else if (e.key === 'PageUp' || e.code === 'PageUp') {
        e.preventDefault();
        onRemoteChPrev();
      }
    };

    window.addEventListener('audiocast:remote_red', onRemoteRed);
    window.addEventListener('audiocast:remote_green', onRemoteGreen);
    window.addEventListener('audiocast:remote_yellow', onRemoteYellow);
    window.addEventListener('audiocast:remote_blue', onRemoteBlue);
    window.addEventListener('audiocast:remote_ch_next', onRemoteChNext);
    window.addEventListener('audiocast:remote_ch_prev', onRemoteChPrev);
    window.addEventListener('audiocast:remote_recall', onRemoteRecall);
    window.addEventListener('audiocast:remote_play_pause', onRemotePlayPause);
    window.addEventListener('audiocast:remote_stop', onRemoteStop);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('audiocast:remote_red', onRemoteRed);
      window.removeEventListener('audiocast:remote_green', onRemoteGreen);
      window.removeEventListener('audiocast:remote_yellow', onRemoteYellow);
      window.removeEventListener('audiocast:remote_blue', onRemoteBlue);
      window.removeEventListener('audiocast:remote_ch_next', onRemoteChNext);
      window.removeEventListener('audiocast:remote_ch_prev', onRemoteChPrev);
      window.removeEventListener('audiocast:remote_recall', onRemoteRecall);
      window.removeEventListener('audiocast:remote_play_pause', onRemotePlayPause);
      window.removeEventListener('audiocast:remote_stop', onRemoteStop);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    handleNextChannel,
    handlePrevChannel,
    handleRecallLastChannel,
    isAudioBoosted,
  ]);

  return (
    <div
      className={`min-h-screen ${
        isHiddenScreen ? 'bg-transparent' : 'bg-slate-950'
      } text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white`}
    >
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
                <AudioCastIcon className="w-8 h-8 shrink-0" withGlow={true} />
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

            {/* أدوات التحكم (Controls) مع زر "القنوات الصوتية" وزر مضاعفة الصوت 3X وزر إيقاف الخدمة */}
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
              onStop={handleStop}
            />

            {/* شريط أزرار الريموت كنترول للرسيفرات (Dreamax B9S2X / أندرويد) للألوان الأربعة والوظائف السريعة */}
            <ReceiverRemoteBar
              isAudioBoosted={isAudioBoosted}
              onToggleAudioBoost={handleToggleAudioBoost}
              onToggleHideScreen={handleHideScreen}
              onSelectAnisSports={() => handleLoadPreset(ANIS_AND_SPORTS_PRESET)}
              onSelectAudioChannels={handleSelectAudioChannelsView}
              onRecallLastChannel={handleRecallLastChannel}
              hasPreviousChannel={Boolean(previousChannel)}
            />

            {/* بطاقة الخدمة النشطة وتتضمن زر إيقاف الخدمة الذي كان موجوداً */}
            {activeChannel && (
              <ForegroundNotification
                channel={activeChannel}
                status={playerStatus}
                retryState={retryState}
                onStop={handleStop}
                onOpenExoPlayerModal={() => setIsExoPlayerModalOpen(true)}
              />
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
