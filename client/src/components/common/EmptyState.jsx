import React from 'react';
import { Droplets, ArrowRight } from 'lucide-react';
import Button from './Button';

export const EmptyState = ({
  icon,
  title = 'No records found',
  description = 'There are no active records in this registry at this time.',
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center p-8 sm:p-12
        max-w-md mx-auto rounded-3xl bg-red-50/40 border border-dashed border-red-200
        ${className}
      `}
    >
      <div className="w-16 h-16 rounded-2xl bg-white border border-red-100 shadow-sm flex items-center justify-center text-[#C62828] mb-4">
        {icon || <Droplets className="w-8 h-8" />}
      </div>

      <h4 className="text-lg font-black text-slate-900 tracking-tight">{title}</h4>

      {description && (
        <p className="text-sm text-slate-500 font-medium mt-1.5 leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <div className="mt-6">
          <Button
            variant="primary"
            size="sm"
            onClick={onAction}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
