import React from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'champagne' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  disabled,
  icon,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const isBusy = isLoading || loading;
  const startIcon = leftIcon || icon;
  const baseStyles =
    'inline-flex items-center justify-center font-medium font-body rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A87FE8] focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none cursor-pointer';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-4 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-6 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-8 py-3.5 min-h-[50px] gap-2.5',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-[#6600CC] text-[#F8F5FF] hover:-translate-y-0.5 hover:bg-[#7711DD] hover:shadow-lg hover:shadow-[#6600CC]/30 active:translate-y-0',
    champagne:
      'bg-[#C9A070] text-[#0D0A18] font-semibold hover:-translate-y-0.5 hover:bg-[#D4AF80] hover:shadow-lg hover:shadow-[#C9A070]/30 active:translate-y-0',
    secondary:
      'border border-[#6600CC] text-[#A87FE8] hover:-translate-y-0.5 hover:bg-[#6600CC]/15 hover:border-[#A87FE8] active:translate-y-0',
    outline:
      'border border-white/15 text-[#F8F5FF] hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/30 active:translate-y-0',
    danger:
      'bg-[#E5484D] text-white hover:-translate-y-0.5 hover:bg-[#F0555A] hover:shadow-lg hover:shadow-[#E5484D]/30 active:translate-y-0',
    ghost:
      'text-[#F8F5FF]/70 hover:text-white hover:bg-white/5 active:bg-white/10',
  };

  return (
    <button
      disabled={disabled || isBusy}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {isBusy ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : startIcon ? (
        <span className="shrink-0">{startIcon}</span>
      ) : null}
      <span>{children}</span>
      {rightIcon && !isBusy && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
