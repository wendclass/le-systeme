import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, helperText, id, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const effectiveHint = hint || helperText;

    return (
      <div className="w-full space-y-1.5 font-body">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-[#F8F5FF]/80 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-[#0D0A18]/80 border border-[#A87FE8]/25 text-[#F8F5FF] placeholder-[#F8F5FF]/30 text-sm font-body transition-all duration-200 resize-y',
            'focus:outline-none focus:border-[#A87FE8] focus:ring-1 focus:ring-[#A87FE8]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[#E5484D] font-medium">{error}</p>
        ) : effectiveHint ? (
          <p className="text-xs text-[#F8F5FF]/50">{effectiveHint}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
