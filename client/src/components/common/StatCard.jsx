import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendDirection = 'up',
  color = 'red',
  className = '',
  onClick,
}) => {
  const colorMap = {
    red: {
      iconBg: 'bg-red-50 text-[#C62828] border-red-100',
      borderGlow: 'hover:border-red-300',
      accent: 'from-red-500/10 to-transparent',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      borderGlow: 'hover:border-emerald-300',
      accent: 'from-emerald-500/10 to-transparent',
    },
    blue: {
      iconBg: 'bg-blue-50 text-blue-700 border-blue-100',
      borderGlow: 'hover:border-blue-300',
      accent: 'from-blue-500/10 to-transparent',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-700 border-amber-100',
      borderGlow: 'hover:border-amber-300',
      accent: 'from-amber-500/10 to-transparent',
    },
    violet: {
      iconBg: 'bg-violet-50 text-violet-700 border-violet-100',
      borderGlow: 'hover:border-violet-300',
      accent: 'from-violet-500/10 to-transparent',
    },
  };

  const scheme = colorMap[color] || colorMap.red;

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm
        transition-all duration-200 overflow-hidden
        ${scheme.borderGlow}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
        ${className}
      `}
    >
      {/* Background Accent Gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${scheme.accent} rounded-bl-full pointer-events-none`} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <h4 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
            {value}
          </h4>
        </div>

        {icon && (
          <div className={`p-3 rounded-xl border shrink-0 ${scheme.iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center justify-between gap-2 text-xs">
          {subtitle && <span className="text-slate-500 font-medium truncate">{subtitle}</span>}

          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-bold ${
                trendDirection === 'up'
                  ? 'text-emerald-600'
                  : trendDirection === 'down'
                  ? 'text-rose-600'
                  : 'text-slate-500'
              }`}
            >
              {trendDirection === 'up' ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : trendDirection === 'down' ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              <span>{trend}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
