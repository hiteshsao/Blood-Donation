import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export const Input = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      type = 'text',
      id,
      name,
      required = false,
      disabled = false,
      className = '',
      wrapperClassName = '',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || name || `input-${Math.random().toString(36).substring(2, 9)}`;
    const isPassword = type === 'password';
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={`w-full ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            {label}
            {required && <span className="text-red-600 ml-1 font-black">*</span>}
          </label>
        )}

        <div className="relative rounded-xl">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            name={name}
            type={computedType}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={`
              w-full px-4 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium
              rounded-xl border transition-all duration-150 outline-none
              ${leftIcon ? 'pl-10' : 'pl-4'}
              ${rightIcon || isPassword ? 'pr-11' : 'pr-4'}
              ${
                error
                  ? 'border-red-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 bg-red-50/20'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#C62828] focus:ring-2 focus:ring-red-100'
              }
              ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}
              ${className}
            `}
            {...props}
          />

          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : rightIcon ? (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              {rightIcon}
            </div>
          ) : null}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-1 text-xs text-slate-500 font-medium">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
