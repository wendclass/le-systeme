import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-8 sm:p-12 rounded-3xl border border-[#A87FE8]/20 bg-[#0D0A18]/50 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 font-body',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6600CC]/30 to-[#A87FE8]/20 border border-[#A87FE8]/30 flex items-center justify-center text-[#A87FE8] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2 font-body">
        {title}
      </h3>
      <p className="text-xs text-[#F8F5FF]/60 mb-6 leading-relaxed max-w-xs">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
