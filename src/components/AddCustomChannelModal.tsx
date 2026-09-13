import React, { useState } from 'react';
import { Plus, X, Radio, Link as LinkIcon } from 'lucide-react';
import { Channel } from '../types';

interface AddCustomChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddChannel: (channel: Channel) => void;
  nextChannelNumber: number;
}

export const AddCustomChannelModal: React.FC<AddCustomChannelModalProps> = ({
  isOpen,
  onClose,
  onAddChannel,
  nextChannelNumber,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [group, setGroup] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || `قناة صوتية ${nextChannelNumber}`;
    const cleanUrl = url.trim();

    if (!cleanUrl) {
      setError('يرجى كتابة رابط البث (URL)');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('rtmp://')) {
      setError('يجب أن يبدأ الرابط بـ http:// أو https://');
      return;
    }

    const newChannel: Channel = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      url: cleanUrl,
      group: group.trim() || 'قنوات مخصصة',
    };

    onAddChannel(newChannel);
    setName('');
    setUrl('');
    setGroup('');
    setError('');
    onClose();
  };

  return (
    <div
      id="modal-add-custom-channel"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">إضافة قناة صوتية</h3>
              <p className="text-xs text-slate-400">
                رقم القناة الجديد في القائمة: <strong className="text-emerald-400">#{nextChannelNumber}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tv-focusable p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              اسم القناة:
            </label>
            <input
              type="text"
              id="input-channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`مثال: راديو القرآن أو قناة ${nextChannelNumber}`}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>رابط البث الصوتي (URL):</span>
              <button
                type="button"
                onClick={() => {
                  setUrl('http://audio.megashare.store/live6');
                  if (!name) setName('قناة صوتية Live 6');
                }}
                className="text-[10px] text-orange-400 hover:text-orange-300 underline cursor-pointer"
              >
                تجربة رابط البث (Live 6)
              </button>
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                id="input-channel-url"
                required
                dir="ltr"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://audio.megashare.store/live6"
                className="w-full pr-3.5 pl-9 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              المجموعة / التصنيف (اختياري):
            </label>
            <input
              type="text"
              id="input-channel-group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="مثال: إذاعات إخبارية، قنوات دينية..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="tv-focusable px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              id="btn-confirm-add-channel"
              className="tv-focusable flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة وتشغيل الآن</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
