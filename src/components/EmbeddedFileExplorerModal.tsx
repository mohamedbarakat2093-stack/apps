import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  FolderOpen,
  Folder,
  FileText,
  FileCode,
  HardDrive,
  Upload,
  Play,
  CheckCircle2,
  AlertCircle,
  Layers,
  RefreshCw,
  Plus,
  Search,
  FileCheck,
  Eye,
  Link2,
} from 'lucide-react';
import { Channel } from '../types';
import { parsePlaylistFile, ParseResult, isValidStreamUrl } from '../utils/m3uParser';

export interface StorageDirectoryItem {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
}

export interface StorageDeviceOption {
  title: string;
  path: string;
  iconType: 'usb' | 'download' | 'storage' | 'docs';
  description: string;
}

interface EmbeddedFileExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportChannels: (channels: Channel[], fileName: string, overwrite?: boolean) => void;
  onOpenFilePickerNative: () => void;
  existingChannelsCount: number;
}

type ExplorerTab = 'storage' | 'file_input' | 'editor';

export const EmbeddedFileExplorerModal: React.FC<EmbeddedFileExplorerModalProps> = ({
  isOpen,
  onClose,
  onImportChannels,
  onOpenFilePickerNative,
  existingChannelsCount,
}) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('storage');
  const [currentPath, setCurrentPath] = useState<string>('/storage/emulated/0/Download');
  const [folderItems, setFolderItems] = useState<StorageDirectoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<StorageDirectoryItem | null>(null);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [directoryError, setDirectoryError] = useState('');

  // حالة محرر ومعاين الملف المفتوح
  const [fileContent, setFileContent] = useState<string>('');
  const [loadedFileName, setLoadedFileName] = useState<string>('');
  const [shouldOverwrite, setShouldOverwrite] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // استيراد عبر رابط
  const [remoteUrl, setRemoteUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // الكشف عن مسارات الرسيفر الافتراضية
  const defaultStorageOptions: StorageDeviceOption[] = useMemo(() => [
    {
      title: 'فلاشة USB الموصولة (USB Drive)',
      path: '/storage/usbdisk',
      iconType: 'usb',
      description: 'فلاشة الذاكرة USB الموصولة بمدخل الرسيفر أو التلفاز',
    },
    {
      title: 'مجلد التنزيلات (Downloads)',
      path: '/storage/emulated/0/Download',
      iconType: 'download',
      description: 'الملفات المحملة على ذاكرة الجهاز من المتصفح',
    },
    {
      title: 'الذاكرة الداخلية للرسيفر (Internal Storage)',
      path: '/storage/emulated/0',
      iconType: 'storage',
      description: 'الملفات والمجلدات على الذاكرة الأساسية',
    },
    {
      title: 'مجلد المستندات (Documents)',
      path: '/storage/emulated/0/Documents',
      iconType: 'docs',
      description: 'مجلد المستندات وقوائم التشغيل',
    },
  ], []);

  const [storageOptions, setStorageOptions] = useState<StorageDeviceOption[]>(defaultStorageOptions);
  const [isScanningAll, setIsScanningAll] = useState<boolean>(false);

  // تحديث مسارات التخزين الحقيقية من الرسيفر (فلاشات USB المتصلة حالياً)
  useEffect(() => {
    if (!isOpen) return;
    const w = typeof window !== 'undefined' ? (window as any) : null;
    const bridge = w?.AndroidControl || w?.Android;
    if (bridge && typeof bridge.getDefaultStoragePaths === 'function') {
      try {
        const raw = bridge.getDefaultStoragePaths();
        const parsed = JSON.parse(raw || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          const opts: StorageDeviceOption[] = parsed.map((item: any) => ({
            title: item.name.includes('USB') ? item.name : `مجلد: ${item.name}`,
            path: item.path,
            iconType: item.name.toLowerCase().includes('usb') || item.path.toLowerCase().includes('usb') ? 'usb' : 'storage',
            description: item.path,
          }));
          setStorageOptions(opts);
        }
      } catch (err) {
        console.warn('Error reading default storage paths:', err);
      }
    }
  }, [isOpen]);

  // فحص شامل وتلقائي لكل ملفات M3U في الرسيفر والفلاشة بدون البحث يدوياً في المجلدات
  const handleScanAllPlaylists = () => {
    setIsScanningAll(true);
    setDirectoryError('');
    const w = typeof window !== 'undefined' ? (window as any) : null;
    const bridge = w?.AndroidControl || w?.Android;
    if (bridge && typeof bridge.scanAllPlaylists === 'function') {
      try {
        const raw = bridge.scanAllPlaylists();
        const parsed = JSON.parse(raw || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFolderItems(parsed);
          setIsScanningAll(false);
          return;
        }
      } catch (err) {
        console.warn('scanAllPlaylists failed:', err);
      }
    }

    // إذا لم يكن التطبيق يعمل داخل الرسيفر حالياً، جلب مسار التنزيلات
    setTimeout(() => {
      setIsScanningAll(false);
      loadDirectoryPath(currentPath);
    }, 400);
  };

  // فحص مباشر لمحتوى الملف المفتوح حالياً
  const parsedData: ParseResult = useMemo(() => {
    if (!fileContent.trim()) {
      return { success: false, channels: [] };
    }
    return parsePlaylistFile(fileContent, loadedFileName || 'channels.m3u');
  }, [fileContent, loadedFileName]);

  // تصفية القنوات في المعاينة
  const filteredPreviewChannels = useMemo(() => {
    if (!parsedData.channels || parsedData.channels.length === 0) return [];
    if (!searchFilter.trim()) return parsedData.channels;
    const q = searchFilter.toLowerCase();
    return parsedData.channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.group && c.group.toLowerCase().includes(q)) ||
        c.url.toLowerCase().includes(q)
    );
  }, [parsedData.channels, searchFilter]);

  // قراءة المجلد عند تغير المسار
  useEffect(() => {
    if (!isOpen || activeTab !== 'storage') return;
    loadDirectoryPath(currentPath);
  }, [isOpen, currentPath, activeTab]);

  // دالة قراءة المجلد عبر الجسر الأصلي للرسيفر أو محاكاة قائمة الملفات
  const loadDirectoryPath = (path: string) => {
    setIsLoadingDirectory(true);
    setDirectoryError('');
    setSelectedItem(null);

    const w = typeof window !== 'undefined' ? (window as any) : null;
    const bridge = w?.AndroidControl || w?.Android;

    if (bridge && typeof bridge.listDirectory === 'function') {
      try {
        const rawJson = bridge.listDirectory(path);
        const parsed = JSON.parse(rawJson || '[]');
        if (Array.isArray(parsed)) {
          // ترتيب: المجلدات أولاً ثم الملفات
          const sorted = parsed.sort((a: StorageDirectoryItem, b: StorageDirectoryItem) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name, 'ar');
          });
          setFolderItems(sorted);
          setIsLoadingDirectory(false);
          return;
        }
      } catch (err: any) {
        console.warn('Native listDirectory failed:', err);
      }
    }

    // بديل متصفح الويب أو إذا لم تكن صلاحية القراءة متاحة:
    // توفير نماذج الملفات الشائعة التي يمكن النقر عليها وفتحها مباشرة
    setTimeout(() => {
      const mockItems: StorageDirectoryItem[] = [
        { name: 'قنوات_الرياضة_وانيس.m3u', path: `${path}/قنوات_الرياضة_وانيس.m3u`, isDir: false, size: 4096 },
        { name: 'راديو_الرسيفر_المصري.cfg', path: `${path}/راديو_الرسيفر_المصري.cfg`, isDir: false, size: 2150 },
        { name: 'صوتيات_المباريات_المباشرة.txt', path: `${path}/صوتيات_المباريات_المباشرة.txt`, isDir: false, size: 1840 },
        { name: 'إذاعات_القرآن_الكريم.m3u', path: `${path}/إذاعات_القرآن_الكريم.m3u`, isDir: false, size: 5200 },
        { name: 'مجلد_ملفات_USB', path: `${path}/مجلد_ملفات_USB`, isDir: true },
      ];
      setFolderItems(mockItems);
      setIsLoadingDirectory(false);
    }, 150);
  };

  // فتح ملف محدد وقراءة محتواه
  const handleOpenFile = (item: StorageDirectoryItem) => {
    if (item.isDir) {
      setCurrentPath(item.path);
      return;
    }

    setSelectedItem(item);
    setLoadedFileName(item.name);

    const w = typeof window !== 'undefined' ? (window as any) : null;
    const bridge = w?.AndroidControl || w?.Android;

    if (bridge && typeof bridge.readTextFile === 'function') {
      try {
        const text = bridge.readTextFile(item.path);
        if (text && text.trim().length > 0) {
          setFileContent(text);
          setActiveTab('editor');
          return;
        }
      } catch (err) {
        console.warn('Native readTextFile failed:', err);
      }
    }

    setFileContent('');
    setActiveTab('editor');
  };

  // معالجة اختيار ملف محلي من القرص أو الفلاشة عبر المتصفح
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setFileContent(text);
      setActiveTab('editor');
    };
    reader.onerror = () => {
      // محاولة بديلة لترميز Windows-1256
      try {
        const r2 = new FileReader();
        r2.onload = (ev2) => {
          setFileContent((ev2.target?.result as string) || '');
          setActiveTab('editor');
        };
        r2.readAsText(file, 'windows-1256');
      } catch {
        alert('تعذر قراءة محتوى الملف');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // جلب رابط خارجي
  const handleFetchRemoteUrl = async () => {
    const cleanUrl = remoteUrl.trim();
    if (!cleanUrl || !isValidStreamUrl(cleanUrl)) {
      setUrlError('يرجى كتابة رابط صالح يبدأ بـ http:// أو https://');
      return;
    }

    setIsLoadingUrl(true);
    setUrlError('');

    try {
      const res = await fetch(`/api/fetch-playlist?url=${encodeURIComponent(cleanUrl)}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.content) {
        throw new Error(data.error || 'فشل جلب محتوى الرابط');
      }

      const inferredName = cleanUrl.split('/').pop()?.split('?')[0] || 'remote_channels.m3u';
      setLoadedFileName(inferredName);
      setFileContent(data.content);
      setActiveTab('editor');
    } catch (err: any) {
      setUrlError(err.message || 'تعذر تحميل الرابط');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // تنفيذ إضافة القنوات إلى المشغل
  const handleConfirmImport = () => {
    if (!parsedData.success || parsedData.channels.length === 0) {
      alert('لم يتم العثور على أي قنوات صالحة للتشغيل في هذا الملف');
      return;
    }

    onImportChannels(
      parsedData.channels,
      loadedFileName || 'ملف_قنوات.m3u',
      shouldOverwrite
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="embedded-file-explorer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 overflow-hidden animate-in fade-in duration-150 text-right"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl shadow-black overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - خفيف وبسيط ومتوافق مع أندرويد 7 */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  مستعرض وقارئ الملفات المدمج للرسيفر
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  M3U • TXT • CFG
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  Android 7 Nougat
                </span>
              </div>
              <p className="text-xs text-slate-400">
                تطبيق مدمج لتصفح فلاشة USB والذاكرة، وقراءة ملفات القنوات بمختلف الصيغ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="tv-focusable p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="إغلاق المستعرض"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs - أزرار سريعة التنقل بريموت التلفزيون */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 p-1.5 gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`tv-focusable flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-amber-600 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4 shrink-0" />
            <span>فلاشة USB والذاكرة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`tv-focusable flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-blue-600 text-white font-black shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4 shrink-0" />
            <span>محرر وقارئ الملف</span>
            {parsedData.channels.length > 0 && (
              <span className="font-mono text-[10px] px-1.5 rounded-full bg-blue-950 text-blue-200">
                {parsedData.channels.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('file_input')}
            className={`tv-focusable flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'file_input'
                ? 'bg-emerald-600 text-white font-black shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>رفع ملف / رابط URL</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
          {/* TAB 1: RECEIVER STORAGE & USB EXPLORER */}
          {activeTab === 'storage' && (
            <div className="space-y-3">
              {/* Quick Storage Locations */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {storageOptions.map((opt) => (
                  <button
                    key={opt.path}
                    type="button"
                    onClick={() => setCurrentPath(opt.path)}
                    className={`tv-focusable p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      currentPath === opt.path
                        ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="p-1 rounded-lg bg-slate-900 border border-slate-750 text-amber-400">
                        {opt.iconType === 'usb' && <HardDrive className="w-4 h-4" />}
                        {opt.iconType === 'download' && <Folder className="w-4 h-4" />}
                        {opt.iconType === 'storage' && <HardDrive className="w-4 h-4" />}
                        {opt.iconType === 'docs' && <FileText className="w-4 h-4" />}
                      </span>
                      {currentPath === opt.path && (
                        <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded">
                          نشط
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs leading-tight mb-0.5">{opt.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate" dir="ltr">
                        {opt.path}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Current Path Bar & Quick Auto Scan Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-slate-400 shrink-0">المسار:</span>
                  <span className="text-xs font-mono text-slate-200 truncate" dir="ltr">
                    {currentPath}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanAllPlaylists}
                    className="tv-focusable px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="بحث تلقائي عن كل ملفات القنوات في الذاكرة والفلاشة"
                  >
                    <Search className={`w-3.5 h-3.5 ${isScanningAll ? 'animate-spin' : ''}`} />
                    <span>فحص شامل للملفات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadDirectoryPath(currentPath)}
                    className="tv-focusable px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                    title="إعادة فحص المجلد الحالي"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDirectory ? 'animate-spin' : ''}`} />
                    <span>تحديث</span>
                  </button>
                </div>
              </div>

              {/* Directory Content List */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/80 overflow-hidden min-h-[220px]">
                {isLoadingDirectory ? (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                    <span className="text-xs font-bold">جاري فحص وتصفح مجلد الرسيفر...</span>
                  </div>
                ) : folderItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs">لم يتم العثور على ملفات قنوات في هذا المسار</p>
                    <button
                      type="button"
                      onClick={() => onOpenFilePickerNative()}
                      className="tv-focusable px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                    >
                      فتح منتقي ملفات الرسيفر المباشر
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-850">
                    {folderItems.map((item, idx) => {
                      const lower = item.name.toLowerCase();
                      const isM3U = lower.endsWith('.m3u') || lower.endsWith('.m3u8');
                      const isCFG = lower.endsWith('.cfg') || lower.endsWith('.ini');
                      const isTXT = lower.endsWith('.txt') || lower.endsWith('.list');

                      return (
                        <div
                          key={item.path || idx}
                          onClick={() => handleOpenFile(item)}
                          className="tv-focusable p-3 flex items-center justify-between hover:bg-slate-850/80 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                              {item.isDir ? (
                                <Folder className="w-4 h-4 text-amber-400" />
                              ) : isM3U ? (
                                <Play className="w-4 h-4 text-emerald-400" />
                              ) : isCFG ? (
                                <FileCode className="w-4 h-4 text-blue-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-purple-400" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                                <span>{item.name}</span>
                                {!item.isDir && (
                                  <span
                                    className={`text-[9px] font-mono px-1 rounded uppercase ${
                                      isM3U
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                        : isCFG
                                        ? 'bg-blue-950 text-blue-300 border border-blue-700/50'
                                        : 'bg-purple-950 text-purple-300 border border-purple-700/50'
                                    }`}
                                  >
                                    {isM3U ? 'M3U' : isCFG ? 'CFG' : isTXT ? 'TXT' : 'FILE'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate max-w-sm" dir="ltr">
                                {item.path}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 transition-all flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{item.isDir ? 'فتح المجلد' : 'قراءة الملف'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FILE EDITOR & CHANNELS INSPECTOR */}
          {activeTab === 'editor' && (
            <div className="space-y-3">
              {/* File Info & Action Bar */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>الملف: {loadedFileName || 'ملف القنوات الجديد'}</span>
                      {parsedData.format && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700/50 uppercase">
                          {parsedData.format}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-emerald-400">
                      تم استخراج <strong>{parsedData.channels.length}</strong> قناة صوتية صالحة للتشغيل
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={shouldOverwrite}
                      onChange={(e) => setShouldOverwrite(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>استبدال القائمة الحالية</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={parsedData.channels.length === 0}
                    className="tv-focusable px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة ({parsedData.channels.length}) قناة إلى المشغل</span>
                  </button>
                </div>
              </div>

              {/* Parsed Channels Preview List */}
              {parsedData.channels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-300">
                      معاينة القنوات المكتشفة ({parsedData.channels.length} قناة):
                    </span>
                    <div className="relative w-48 sm:w-64">
                      <Search className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="بحث في القنوات..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-7 pl-2 py-1 text-xs text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl bg-slate-950 max-h-48 overflow-y-auto divide-y divide-slate-850">
                    {filteredPreviewChannels.slice(0, 50).map((ch, idx) => (
                      <div key={ch.id || idx} className="p-2 px-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 text-slate-500 font-mono text-[10px] text-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-200 truncate">{ch.name}</span>
                          {ch.group && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                              {ch.group}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]" dir="ltr">
                          {ch.url}
                        </span>
                      </div>
                    ))}
                    {filteredPreviewChannels.length > 50 && (
                      <div className="p-2 text-center text-[10px] text-slate-500">
                        ... و {filteredPreviewChannels.length - 50} قناة إضافية متوفرة في الملف
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Raw File Editor Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>محتوى الملف النصي الخام (يمكنك التعديل أو لصق الروابط هنا):</span>
                  <span className="font-mono text-[10px] text-slate-500">{fileContent.length} حرف</span>
                </div>
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  rows={8}
                  dir="ltr"
                  placeholder={`# الصق أو اكتب أسطر ملف M3U أو CFG أو TXT هنا\nإذاعة القرآن الكريم = https://stream.radiojar.com/8s5u5tpdtwzuv\nراديو أنيس = http://anisfm.ddns.net`}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 3: FILE INPUT & REMOTE URL */}
          {activeTab === 'file_input' && (
            <div className="space-y-4 py-2">
              {/* File Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-750 hover:border-amber-500 rounded-2xl p-6 text-center bg-slate-950/60 hover:bg-slate-900 transition-all cursor-pointer space-y-2 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".m3u,.m3u8,.cfg,.txt,.ini,.list,text/plain,*/*"
                  onChange={handleLocalFileSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-0.5">
                    اضغط لاختيار ملف قنوات من الفلاشة أو الجهاز
                  </h3>
                  <p className="text-xs text-slate-400">
                    يدعم جميع امتدادات القنوات: <strong className="text-amber-400 font-mono">.m3u • .m3u8 • .cfg • .txt • .list</strong>
                  </p>
                </div>
              </div>

              {/* Remote URL Fetcher */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">تحميل ملف قنوات عبر رابط مباشر (URL):</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                    placeholder="https://example.com/channels.m3u أو http://.../iptv.cfg"
                    dir="ltr"
                    className="flex-1 bg-slate-900 border border-slate-750 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleFetchRemoteUrl}
                    disabled={isLoadingUrl}
                    className="tv-focusable px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUrl ? 'animate-spin' : ''}`} />
                    <span>تحميل وقراءة</span>
                  </button>
                </div>
                {urlError && <div className="text-xs text-rose-400 font-bold">{urlError}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            {existingChannelsCount > 0 ? (
              <span>يوجد حالياً {existingChannelsCount} قناة في المشغل</span>
            ) : (
              <span>لا توجد قنوات مرفوعة بعد</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="tv-focusable px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
            {activeTab === 'editor' && parsedData.channels.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                className="tv-focusable px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>إضافة القنوات الآن</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
