import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, hint, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 font-body">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#F8F5FF]/80 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-[#A87FE8]/25 text-[#F8F5FF] text-sm font-body appearance-none transition-all duration-200 cursor-pointer',
              'focus:outline-none focus:border-[#A87FE8] focus:ring-1 focus:ring-[#A87FE8]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[#0D0A18] text-[#F8F5FF]">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#F8F5FF]/50 text-xs">
            ▼
          </div>
        </div>
        {error ? (
          <p className="text-xs text-[#E5484D] font-medium">{error}</p>
        ) : hint ? (
          <p className="text-xs text-[#F8F5FF]/50">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
