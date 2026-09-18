import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileText,
  Link2,
  HardDrive,
  Copy,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { parsePlaylistFile } from '../utils/m3uParser';

export const ANIS_AND_SPORTS_M3U_CONTENT = `#EXTM3U
#EXTINF:-1,Anis Max 1
http://radio.anisfm.vip/live/mx/1?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 2
http://radio.anisfm.vip/live/mx/2?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 3
http://radio.anisfm.vip/live/mx/3?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 4
http://radio.anisfm.vip/live/mx/4?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 5
http://radio.anisfm.vip/live/mx/5?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 6
http://radio.anisfm.vip/live/mx/6?token=83KD1PUVP8#
#EXTINF:-1,Anis Sport 1
http://radio.anisfm.vip/live/pn/1?token=83KD1PUVP8#
#EXTINF:-1,Anis Sport 2
http://radio.anisfm.vip/live/pn/2?token=83KD1PUVP8#
#EXTINF:-1,Anis Sport 3
http://radio.anisfm.vip/live/pn/3?token=83KD1PUVP8#
#EXTINF:-1,Anis Sport 4
http://radio.anisfm.vip/live/pn/4?token=83KD1PUVP8#
#EXTINF:-1,Anis Sport 5
http://radio.anisfm.vip/live/pn/5?token=83KD1PUVP8#
#EXTINF:-1,Anis Sport 6
http://radio.anisfm.vip/live/pn/6?token=83KD1PUVP8#
#EXTINF:-1,Anis Sport 7
http://radio.anisfm.vip/live/pn/7?token=83KD1PUVP8#
#EXTINF:-1,Anis Sport 8
http://radio.anisfm.vip/live/pn/8?token=83KD1PUVP8#
#EXTINF:-1,Anis Sport 9
http://radio.anisfm.vip/live/pn/9?token=83KD1PUVP8#
#EXTINF:-1,Anis Italy 1
http://radio.anisfm.vip/live/it/1?token=83KD1PUVP8#
#EXTINF:-1,Anis Italy 2
http://radio.anisfm.vip/live/it/2?token=83KD1PUVP8#
#EXTINF:-1,Anis DE 1
http://radio.anisfm.vip/live/gr/1?token=83KD1PUVP8#
#EXTINF:-1,Anis DE 2
http://radio.anisfm.vip/live/gr/2?token=83KD1PUVP8#
#EXTINF:-1,Anis Thm8h 1
http://radio.anisfm.vip/live/sa/1?token=83KD1PUVP8#
#EXTINF:-1,Anis Thm8h 2
http://radio.anisfm.vip/live/sa/2?token=83KD1PUVP8#
#EXTINF:-1,Anis Thm8h 3
http://radio.anisfm.vip/live/sa/3?token=83KD1PUVP8#
#EXTINF:-1,Anis Shasha
http://radio.anisfm.vip/live/sha/1?token=83KD1PUVP8#
#EXTINF:-1,Anis Shahid
http://radio.anisfm.vip/live/sha/2?token=83KD1PUVP8#
#EXTINF:-1,Anis EN 1
http://radio.anisfm.vip/live/pn/1EN?token=83KD1PUVP8#
#EXTINF:-1,Anis EN 2
http://radio.anisfm.vip/live/pn/2EN?token=83KD1PUVP8#
#EXTINF:-1,Anis FR 1
http://radio.anisfm.vip/live/pn/1FR?token=83KD1PUVP8#
#EXTINF:-1,Anis FR 2
http://radio.anisfm.vip/live/pn/2FR?token=83KD1PUVP8#
#EXTINF:-1,Anis Xtra 1
http://radio.anisfm.vip/live/sha/XR1?token=83KD1PUVP8#
#EXTINF:-1,Anis Xtra 2
http://radio.anisfm.vip/live/sha/XR2?token=83KD1PUVP8#
#EXTINF:-1,Anis Al Kass 1
http://radio.anisfm.vip/live/sha/K1?token=83KD1PUVP8#
#EXTINF:-1,Anis Al Kass 2
http://radio.anisfm.vip/live/sha/K2?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 1 Low
http://radio.anisfm.vip/live/mx/1L?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 2 Low
http://radio.anisfm.vip/live/mx/2L?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 3 Low
http://radio.anisfm.vip/live/mx/3L?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 4 Low
http://radio.anisfm.vip/live/mx/4L?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 5 Low
http://radio.anisfm.vip/live/mx/5L?token=83KD1PUVP8#
#EXTINF:-1,Anis Max 6 Low
http://radio.anisfm.vip/live/mx/6L?token=83KD1PUVP8#
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/freetv-app/logos/master/images/al-shabab-wal-riyada.png" group-title="إذاعات الرياضة العربية",أون سبورت إف إم 93.7 (ON Sport FM مصر)
https://carina.streamerr.co:2020/stream/OnSportFM
#EXTINF:-1 tvg-logo="https://radiomars.ma/wp-content/uploads/2026/03/radiomars.ma_.png" group-title="إذاعات الرياضة العربية",راديو مارس الرياضي (Radio Mars 91.2 FM - المغرب)
https://radiomars.ice.infomaniak.ch/radiomars-128.mp3
#EXTINF:-1 tvg-logo="https://cdn-icons-png.flaticon.com/512/1165/1165187.png" group-title="إذاعات الرياضة العربية",إذاعة يو إف إم الرياضية (UFM Radio KSA 90.0 FM - السعودية)
http://stream.ufmradio.com:8000/;`;

interface UploadM3UModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportContent: (content: string, sourceName: string, overwrite?: boolean) => void;
  onOpenFilePicker: () => void;
  existingChannelsCount: number;
}

type TabMode = 'file' | 'paste' | 'url';

export const UploadM3UModal: React.FC<UploadM3UModalProps> = ({
  isOpen,
  onClose,
  onImportContent,
  onOpenFilePicker,
  existingChannelsCount,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('file');
  const [pastedText, setPastedText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [shouldOverwrite, setShouldOverwrite] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');

  // فحص استباقي سريع لعدد القنوات في النص الملصوق
  const previewParse = useMemo(() => {
    if (!pastedText.trim()) return null;
    return parsePlaylistFile(pastedText, 'preview.m3u');
  }, [pastedText]);

  if (!isOpen) return null;

  // استيراد النص الملصوق
  const handleImportPastedText = () => {
    if (!pastedText.trim()) return;
    const name = customFileName.trim() || 'قنوات_صوتية.m3u';
    onImportContent(pastedText, name, shouldOverwrite);
    setPastedText('');
    setCustomFileName('');
    onClose();
  };

  // لصق من الحافظة
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clip = await navigator.clipboard.readText();
        if (clip) {
          setPastedText(clip);
        }
      }
    } catch {
      // ignore
    }
  };

  // تحميل واستيراد من رابط URL خارجي
  const handleFetchUrl = async () => {
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setUrlError('يرجى كتابة رابط ملف القنوات (M3U URL)');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setUrlError('يجب أن يبدأ الرابط بـ http:// أو https://');
      return;
    }

    setIsLoadingUrl(true);
    setUrlError('');

    try {
      const res = await fetch(`/api/fetch-playlist?url=${encodeURIComponent(cleanUrl)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.content) {
        throw new Error(data.error || 'تعذر جلب محتوى الرابط');
      }

      const inferredName = cleanUrl.split('/').pop()?.split('?')[0] || 'قنوات_عبر_الرابط.m3u';
      onImportContent(data.content, inferredName, shouldOverwrite);
      setUrlInput('');
      onClose();
    } catch (err: any) {
      setUrlError(err?.message || 'فشل في تحميل الرابط. تأكد من أن الرابط مباشر وصالح.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  return (
    <div
      id="modal-upload-m3u"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                إضافة ملف القنوات الصوتية (M3U / TXT / CFG)
              </h2>
              <p className="text-xs text-slate-400">
                مخصص للرسيفر والشاشة والموبايل لتنزيل القنوات الصوتية وعرضها فوراً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tv-focusable p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`tv-focusable flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'file'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
            <span>فلاشة USB / ملف من الجهاز</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`tv-focusable flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>لصق نص ملف القنوات (M3U)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`tv-focusable flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span>رابط عبر النت (URL)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: FILE PICKER (USB / STORAGE) */}
          {activeTab === 'file' && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <HardDrive className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  رفع ملف القنوات من الفلاشة أو ذاكرة الرسيفر
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  يدعم تشغيل ملفات القنوات بصيغ (M3U, M3U8, TXT, CFG). سيتم استخراج أسماء وروابط القنوات وحفظها في خانة &quot;القنوات الصوتية&quot;.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
                <button
                  type="button"
                  id="btn-open-file-browser"
                  onClick={() => {
                    onOpenFilePicker();
                    onClose();
                  }}
                  className="tv-focusable flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>اختر ملف من الفلاشة / الذاكرة</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE M3U TEXT DIRECTLY */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300">
                  الصق أسطر ملف M3U أو TXT هنا:
                </span>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="tv-focusable px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>لصق من الحافظة</span>
                </button>
              </div>

              <textarea
                id="textarea-m3u-content"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={7}
                dir="ltr"
                placeholder={`#EXTM3U\n#EXTINF:-1,إذاعة القرآن الكريم\nhttps://stream.radiojar.com/8s5u82pmstzuv\n#EXTINF:-1,أون سبورت FM\nhttps://carina.streamerr.co:2020/stream/OnSportFM`}
                className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition-colors resize-none leading-relaxed"
              />

              {/* Real-time parse status badge */}
              {previewParse && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    previewParse.success && previewParse.channels.length > 0
                      ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {previewParse.success && previewParse.channels.length > 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        تم التعرف على{' '}
                        <strong className="text-white">{previewParse.channels.length} قناة</strong>{' '}
                        بنجاح (الصيغة: {previewParse.format?.toUpperCase()})
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{previewParse.error || 'لم يتم العثور على روابط قنوات صالحة'}</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="اسم الملف (اختياري، مثلاً: قنواتي_المفضلة.m3u)"
                  className="flex-1 bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none"
                />
              </div>

              <button
                id="btn-import-pasted-text"
                type="button"
                disabled={!pastedText.trim() || (previewParse ? !previewParse.success : false)}
                onClick={handleImportPastedText}
                className={`tv-focusable w-full py-3.5 px-4 font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all ${
                  pastedText.trim() && (!previewParse || previewParse.success)
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>
                  استيراد القنوات وتنزيلها بالتطبيق (
                  {previewParse?.channels?.length ? `${previewParse.channels.length} قناة` : 'الآن'}
                  )
                </span>
              </button>
            </div>
          )}

          {/* TAB 3: USB FLASH DRIVE / DEVICE STORAGE */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      اختيار ملف من فلاشة USB أو ذاكرة الرسيفر
                    </h3>
                    <p className="text-xs text-slate-400">
                      الصيغ المدعومة تلقائياً: M3U, M3U8, TXT, CFG, INI
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 space-y-1">
                  <p className="font-bold text-amber-300">نصائح للرسيفر وأجهزة TV Box:</p>
                  <p>1. قم بنسخ ملف قنواتك على فلاشة USB وضعها في مدخل USB بالرسيفر.</p>
                  <p>2. اضغط على الزر الأخضر أدناه لفتح متصفح الملفات واختيار الملف.</p>
                  <p>
                    3. إذا لم يظهر متصفح ملفات على ريموت الرسيفر، يرجى استخدام تبويب{' '}
                    <strong className="text-white">"لصق نص الملف"</strong> أو{' '}
                    <strong className="text-cyan-300">"راديو أنيس والرياضة"</strong> كحل مباشر
                    وفوري.
                  </p>
                </div>
              </div>

              <button
                id="btn-trigger-native-file-picker"
                type="button"
                onClick={() => {
                  onOpenFilePicker();
                  onClose();
                }}
                className="tv-focusable w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Upload className="w-5 h-5 shrink-0" />
                <span>فتح متصفح الملفات لاختيار ملف القنوات</span>
              </button>
            </div>
          )}

          {/* TAB 4: FETCH FROM URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  أدخل رابط ملف القنوات المباشر (M3U / TXT URL):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    id="input-m3u-url"
                    dir="ltr"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setUrlError('');
                    }}
                    placeholder="http://example.com/playlist.m3u"
                    className="flex-1 bg-slate-950 border border-slate-750 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none font-mono"
                  />
                </div>
              </div>

              {urlError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}

              <button
                id="btn-fetch-url-playlist"
                type="button"
                disabled={isLoadingUrl || !urlInput.trim()}
                onClick={handleFetchUrl}
                className={`tv-focusable w-full py-3.5 px-4 font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all ${
                  !isLoadingUrl && urlInput.trim()
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isLoadingUrl ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري تحميل الملف وفحص القنوات...</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5 shrink-0" />
                    <span>تحميل واستيراد القنوات من الرابط</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Overwrite or Append Toggle */}
          {existingChannelsCount > 0 && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                لديك حالياً {existingChannelsCount} قناة في القنوات الصوتية
              </span>
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={shouldOverwrite}
                  onChange={(e) => setShouldOverwrite(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>استبدال القنوات السابقة (بدلاً من الإضافة عليها)</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
