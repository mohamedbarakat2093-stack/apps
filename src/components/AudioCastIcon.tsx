import React from 'react';

interface AudioCastIconProps {
  className?: string;
  size?: number | string;
  animated?: boolean;
  withGlow?: boolean;
}

/**
 * أيقونة AudioCast الحديثة الدالة على بث الصوت
 * تجمع بين: موجات بث الصوت اللاسلكية + لاقط وباعث الصوت الفضائي + طيف الترددات الحية
 * مصممة لتكون خفيفة بنسبة 100% وتعتمد على تسريع معالج الرسوميات GPU بدون أي عبء على معالج الرسيفر
 */
export const AudioCastIcon: React.FC<AudioCastIconProps> = ({
  className = 'w-10 h-10',
  size,
  animated = false,
  withGlow = false,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={style}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="aci-wave-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#0ea5e9" />
            <stop offset="85%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>

          <radialGradient id="aci-core-grad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="35%" stopColor="#0284c7" />
            <stop offset="75%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#082f49" />
          </radialGradient>

          <radialGradient id="aci-bg-grad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="60%" stopColor="#090d16" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>

        {/* خلفية الأيقونة (شكل هندسي منحني ناعم Squircle) */}
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="22"
          fill="url(#aci-bg-grad)"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeOpacity={withGlow ? '0.45' : '0.2'}
        />

        {/* حلقة داخلية رفيعة */}
        <rect
          x="5"
          y="5"
          width="90"
          height="90"
          rx="19"
          fill="none"
          stroke="url(#aci-wave-grad)"
          strokeWidth="0.8"
          strokeOpacity="0.3"
        />

        {/* موجات بث الصوت اللاسلكية (الجانب الأيمن) */}
        <g className={animated ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}>
          <path
            d="M 64 38 A 15 15 0 0 1 64 60"
            stroke="url(#aci-wave-grad)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M 72 31 A 26 26 0 0 1 72 67"
            stroke="url(#aci-wave-grad)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          <path
            d="M 80 24 A 37 37 0 0 1 80 74"
            stroke="url(#aci-wave-grad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
        </g>

        {/* موجات بث الصوت اللاسلكية (الجانب الأيسر) */}
        <g className={animated ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}>
          <path
            d="M 36 38 A 15 15 0 0 0 36 60"
            stroke="url(#aci-wave-grad)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M 28 31 A 26 26 0 0 0 28 67"
            stroke="url(#aci-wave-grad)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          <path
            d="M 20 24 A 37 37 0 0 0 20 74"
            stroke="url(#aci-wave-grad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
        </g>

        {/* سارية هوائي البث في الأعلى */}
        <line
          x1="50"
          y1="16"
          x2="50"
          y2="34"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* إشعاع الهوائي العلوي */}
        <path
          d="M 44 20 A 7 7 0 0 1 56 20"
          fill="none"
          stroke="#34d399"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />

        {/* النقطة الحية المشعة (Live Emitter Beacon) */}
        <circle cx="50" cy="15" r="3.2" fill="#10b981" />
        <circle cx="50" cy="15" r="1.5" fill="#ffffff" />

        {/* باعث الصوت ومكبر الصوت المركزي */}
        <circle
          cx="50"
          cy="49"
          r="12"
          fill="#090d16"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />
        <circle
          cx="50"
          cy="49"
          r="9.5"
          fill="url(#aci-core-grad)"
        />
        <circle
          cx="50"
          cy="49"
          r="4.5"
          fill="#0f172a"
          stroke="#34d399"
          strokeWidth="1"
        />
        <circle
          cx="50"
          cy="49"
          r="2.2"
          fill="#10b981"
        />
        <circle
          cx="48.8"
          cy="47.8"
          r="0.8"
          fill="#ffffff"
          opacity="0.85"
        />

        {/* طيف الترددات الصوتية التفاعلي في الأسفل (Audio Equalizer Spectrum) */}
        <g transform="translate(26, 78)">
          <rect
            x="0"
            y={animated ? '3' : '4'}
            width="2.5"
            height={animated ? '6' : '5'}
            rx="1.2"
            fill="#38bdf8"
            className={animated ? 'animate-[pulse_1.2s_ease-in-out_infinite]' : ''}
          />
          <rect
            x="5"
            y={animated ? '1' : '2'}
            width="2.5"
            height={animated ? '8' : '7'}
            rx="1.2"
            fill="#38bdf8"
            className={animated ? 'animate-[pulse_0.9s_ease-in-out_infinite_0.1s]' : ''}
          />
          <rect
            x="10"
            y={animated ? '4' : '4'}
            width="2.5"
            height={animated ? '5' : '5'}
            rx="1.2"
            fill="#0ea5e9"
            className={animated ? 'animate-[pulse_1.4s_ease-in-out_infinite_0.2s]' : ''}
          />
          <rect
            x="15"
            y={animated ? '0' : '1'}
            width="2.5"
            height={animated ? '9' : '8'}
            rx="1.2"
            fill="#0284c7"
            className={animated ? 'animate-[pulse_0.8s_ease-in-out_infinite_0.15s]' : ''}
          />
          <rect
            x="20"
            y={animated ? '2' : '3'}
            width="2.5"
            height={animated ? '7' : '6'}
            rx="1.2"
            fill="#10b981"
            className={animated ? 'animate-[pulse_1.1s_ease-in-out_infinite_0.05s]' : ''}
          />
          <rect
            x="25"
            y={animated ? '0' : '0'}
            width="2.5"
            height={animated ? '10' : '9'}
            rx="1.2"
            fill="#34d399"
            className={animated ? 'animate-[pulse_0.7s_ease-in-out_infinite_0.25s]' : ''}
          />
          <rect
            x="30"
            y={animated ? '2' : '3'}
            width="2.5"
            height={animated ? '7' : '6'}
            rx="1.2"
            fill="#10b981"
            className={animated ? 'animate-[pulse_1.1s_ease-in-out_infinite_0.1s]' : ''}
          />
          <rect
            x="35"
            y={animated ? '0' : '1'}
            width="2.5"
            height={animated ? '9' : '8'}
            rx="1.2"
            fill="#0284c7"
            className={animated ? 'animate-[pulse_0.85s_ease-in-out_infinite_0.2s]' : ''}
          />
          <rect
            x="40"
            y={animated ? '4' : '4'}
            width="2.5"
            height={animated ? '5' : '5'}
            rx="1.2"
            fill="#0ea5e9"
            className={animated ? 'animate-[pulse_1.3s_ease-in-out_infinite_0.15s]' : ''}
          />
          <rect
            x="45"
            y={animated ? '1' : '2'}
            width="2.5"
            height={animated ? '8' : '7'}
            rx="1.2"
            fill="#38bdf8"
            className={animated ? 'animate-[pulse_0.95s_ease-in-out_infinite_0.05s]' : ''}
          />
        </g>
      </svg>
    </div>
  );
};
