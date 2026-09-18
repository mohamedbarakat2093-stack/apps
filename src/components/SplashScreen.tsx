import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  duration = 2000,
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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-slate-100 select-none cursor-pointer"
        >
          {/* حاوية الشعار مع أنيميشن خفيف جداً لا يستهلك طاقة معالج الرسيفر */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="flex flex-col items-center text-center space-y-4 px-6 max-w-sm"
          >
            {/* الشعار المتوهج */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-emerald-600 p-0.5 shadow-xl shadow-cyan-600/20 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                  <Radio className="w-10 h-10 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            </div>

            {/* اسم التطبيق والوصف */}
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-white font-mono">
                AudioCast
              </h1>
              <p className="text-xs text-cyan-300/90 font-medium">
                مشغل البث الصوتي وقنوات M3U
              </p>
            </div>

            {/* خط إشارة ضوئي خفيف */}
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent my-1" />

            {/* شارة المهندس المصمم */}
            <div
              dir="ltr"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-slate-400">Created by:</span>
              <span className="text-blue-400 font-bold">Eng: Mohamed Barakat</span>
            </div>

            {/* مؤشر تحميل بسيط */}
            <div className="pt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>جاري بدء التطبيق...</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
