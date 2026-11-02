import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const effectiveHint = hint || helperText;

    return (
      <div className="w-full space-y-1.5 font-body">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#F8F5FF]/80 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-[#F8F5FF]/40 pointer-events-none flex items-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-[#A87FE8]/25 text-[#F8F5FF] placeholder-[#F8F5FF]/30 text-sm font-body transition-all duration-200',
              'focus:outline-none focus:border-[#A87FE8] focus:ring-1 focus:ring-[#A87FE8]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 text-[#F8F5FF]/40 flex items-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error ? (
          <p className="text-xs text-[#E5484D] font-medium">{error}</p>
        ) : effectiveHint ? (
          <p className="text-xs text-[#F8F5FF]/50">{effectiveHint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
