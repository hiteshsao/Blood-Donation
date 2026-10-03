import React from 'react';
import { Droplet } from 'lucide-react';

export const Loader = ({
  message = 'Loading...',
  fullScreen = false,
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: { drop: 'w-5 h-5', container: 'p-3', text: 'text-xs' },
    md: { drop: 'w-8 h-8', container: 'p-4', text: 'text-sm' },
    lg: { drop: 'w-12 h-12', container: 'p-6', text: 'text-base' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />

        {/* Droplet Badge */}
        <div
          className={`
            relative z-10 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828]
            text-white shadow-lg shadow-red-900/30 flex items-center justify-center animate-pulse
            ${currentSize.container}
          `}
        >
          <Droplet className={`${currentSize.drop} fill-white animate-bounce`} />
        </div>
      </div>

      {message && (
        <p className={`font-bold text-slate-700 tracking-wide ${currentSize.text}`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FFF8F8]/90 backdrop-blur-md flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;
