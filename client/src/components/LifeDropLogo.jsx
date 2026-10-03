import React from 'react';

export const LifeDropLogo = ({ size = 'default', showTagline = false, className = '' }) => {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const iconWidth = isLarge ? 48 : isSmall ? 28 : 38;
  const iconHeight = isLarge ? 54 : isSmall ? 32 : 42;
  const titleSize = isLarge ? 'text-3xl font-extrabold' : isSmall ? 'text-lg font-bold' : 'text-2xl font-bold';

  return (
    <div className={`lifedrop-brand flex items-center gap-3 ${className}`}>
      {/* LifeDrop Droplet with EKG wave */}
      <div className="lifedrop-logo-icon relative flex-shrink-0" style={{ width: iconWidth, height: iconHeight }}>
        <svg
          viewBox="0 0 100 115"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            <linearGradient id="lifedrop-grad" x1="50" y1="0" x2="50" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E53935" />
              <stop offset="60%" stopColor="#C62828" />
              <stop offset="100%" stopColor="#8E0000" />
            </linearGradient>
            <filter id="lifedrop-shadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#C62828" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Blood Droplet Body */}
          <path
            d="M50 8 C50 8 16 48 16 74 C16 93 31.2 108 50 108 C68.8 108 84 93 84 74 C84 48 50 8 50 8 Z"
            fill="url(#lifedrop-grad)"
            filter="url(#lifedrop-shadow)"
          />

          {/* Gloss highlight */}
          <path
            d="M32 46 C32 46 24 58 24 72 C24 78 26 84 30 89 C28 85 27 80 27 75 C27 63 35 52 35 52 L32 46 Z"
            fill="rgba(255, 255, 255, 0.4)"
          />

          {/* EKG Heartbeat Line (White) */}
          <path
            d="M18 74 L32 74 L37 62 L44 88 L49 68 L53 77 L57 74 L82 74"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pulse Dot */}
          <circle cx="83" cy="74" r="3.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col">
        <div className="flex items-center tracking-tight">
          <span className={`text-[#0F172A] ${titleSize}`} style={{ fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif' }}>
            Life
          </span>
          <span className={`text-[#C62828] ${titleSize}`} style={{ fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif' }}>
            Drop
          </span>
        </div>
        {showTagline && (
          <span className="text-xs font-semibold text-[#C62828] tracking-wider uppercase" style={{ letterSpacing: '0.08em' }}>
            Every Drop Counts
          </span>
        )}
      </div>
    </div>
  );
};
