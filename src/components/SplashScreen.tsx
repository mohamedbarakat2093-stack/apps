import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wifi } from 'lucide-react';
import { AudioCastIcon } from './AudioCastIcon';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  duration = 1800,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    // السماح بالتخطي الفوري عند الضغط على أي زر بالريموت كنترول أو النقر على الشاشة
    const handleSkip = () => {
      setIsVisible(false);
    };

    window.addEventListener('keydown', handleSkip, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleSkip);
    };
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onFinish}>
      {isVisible && (
        <motion.div
          id="app-splash-screen"
          onClick={() => setIsVisible(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617] text-slate-100 select-none cursor-pointer overflow-hidden"
          style={{ willChange: 'opacity, transform' }}
        >
          {/* هالة إضاءة خلفية هادئة مسرعة عتادياً */}
          <div className="absolute w-72 h-72 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

          {/* حاوية الشعار والأنيميشن الخفيف المسرع بواسطة معالج الرسوميات GPU */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center text-center space-y-4 px-6 max-w-sm"
          >
            {/* أيقونة بث الصوت مع حلقات موجات البث المتوسعة في الخلفية */}
            <div className="relative flex items-center justify-center">
              {/* حلقة بث موجات الصوت المتوسعة 1 */}
              <div className="absolute w-28 h-28 rounded-3xl border border-cyan-500/20 animate-ping opacity-60 pointer-events-none" />
              {/* حلقة بث موجات الصوت المتوسعة 2 */}
              <div className="absolute w-36 h-36 rounded-full border border-emerald-500/15 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-40 pointer-events-none" />

              {/* الأيقونة العصرية الجديدة لبث الصوت */}
              <div className="relative z-10 drop-shadow-[0_10px_25px_rgba(14,165,233,0.35)]">
                <AudioCastIcon
                  className="w-24 h-24 sm:w-28 sm:h-28"
                  animated={true}
                  withGlow={true}
                />
              </div>

              {/* نقطة البث الحي الخضراء في أعلى الزاوية */}
              <span className="absolute -top-1 -right-1 z-20 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-sm shadow-emerald-400/80" />
              </span>
            </div>

            {/* اسم التطبيق والوصف الدال على بث الصوت */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 font-mono">
                  AudioCast
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-cyan-200/90 font-medium tracking-wide">
                بث الصوت المباشر وقنوات M3U
              </p>
            </div>

            {/* خط إشارة ضوئي خفيف */}
            <div className="w-28 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent my-1 opacity-80" />

            {/* شارة المهندس المصمم */}
            <div
              dir="ltr"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300 shadow-inner"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Created by:</span>
              <span className="text-blue-400 font-bold">Eng: Mohamed Barakat</span>
            </div>

            {/* مؤشر بدء البث السريع */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <Wifi className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>جاري تهيئة البث الصوتي...</span>
            </div>
          </motion.div>

          {/* تلميح تخطي خفيف في الأسفل */}
          <div className="absolute bottom-4 text-[10px] text-slate-600">
            اضغط OK أو أي زر للتخطي
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
