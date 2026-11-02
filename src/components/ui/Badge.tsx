import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'champagne' | 'purple';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-white/10 text-[#F8F5FF] border border-white/10',
    success: 'bg-[#2FA77A]/15 text-[#2FA77A] border border-[#2FA77A]/30',
    warning: 'bg-[#C9A070]/15 text-[#C9A070] border border-[#C9A070]/30',
    error: 'bg-[#E5484D]/15 text-[#E5484D] border border-[#E5484D]/30',
    info: 'bg-[#A87FE8]/15 text-[#A87FE8] border border-[#A87FE8]/30',
    champagne: 'bg-[#C9A070]/20 text-[#C9A070] border border-[#C9A070]/40',
    purple: 'bg-[#6600CC]/20 text-[#A87FE8] border border-[#6600CC]/40',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.05em] font-body transition-colors select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
