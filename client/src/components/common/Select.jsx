import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export const Select = React.forwardRef(
  (
    {
      label,
      options = [],
      placeholder = 'Select an option',
      error,
      helperText,
      id,
      name,
      required = false,
      disabled = false,
      className = '',
      wrapperClassName = '',
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || name || `select-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className={`w-full ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            {label}
            {required && <span className="text-red-600 ml-1 font-black">*</span>}
          </label>
        )}

        <div className="relative rounded-xl">
          <select
            ref={ref}
            id={selectId}
            name={name}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            className={`
              w-full px-4 py-2.5 bg-white text-slate-900 text-sm font-medium
              rounded-xl border transition-all duration-150 outline-none appearance-none cursor-pointer pr-10
              ${
                error
                  ? 'border-red-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 bg-red-50/20'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#C62828] focus:ring-2 focus:ring-red-100'
              }
              ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-slate-400">
                {placeholder}
              </option>
            )}
            {options.map((opt) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const lbl = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={val} value={val} className="text-slate-900 font-medium">
                  {lbl}
                </option>
              );
            })}
            {children}
          </select>

          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p id={`${selectId}-helper`} className="mt-1 text-xs text-slate-500 font-medium">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
