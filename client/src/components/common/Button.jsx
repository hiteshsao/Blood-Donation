import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon = null,
      rightIcon = null,
      fullWidth = false,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none';

    const variants = {
      primary:
        'bg-gradient-to-r from-[#C62828] to-[#991B1B] text-white shadow-md shadow-red-900/20 hover:from-[#B71C1C] hover:to-[#7F1D1D] hover:shadow-lg hover:shadow-red-900/30 focus:ring-red-600 border border-transparent',
      secondary:
        'bg-[#FFF0F0] text-[#C62828] hover:bg-[#FFE0E0] border border-[#FFD0D0] focus:ring-red-400',
      outline:
        'border-2 border-[#C62828] text-[#C62828] bg-transparent hover:bg-red-50/80 focus:ring-red-500',
      ghost:
        'text-slate-700 hover:text-[#C62828] hover:bg-red-50/70 border border-transparent focus:ring-red-400',
      danger:
        'bg-red-700 text-white hover:bg-red-800 shadow-md shadow-red-950/20 focus:ring-red-600',
      sos:
        'bg-gradient-to-r from-red-600 to-rose-700 text-white font-black tracking-wider uppercase shadow-sos hover:brightness-110 focus:ring-red-500 lifedrop-sos-btn',
    };

    const sizes = {
      sm: 'text-xs px-3.5 py-1.5 gap-1.5 rounded-lg',
      md: 'text-sm px-5 py-2.5 gap-2 rounded-xl',
      lg: 'text-base px-6 py-3.5 gap-2.5 rounded-2xl',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`
          ${baseStyles}
          ${variants[variant] || variants.primary}
          ${sizes[size] || sizes.md}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
