import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-2xl',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-white/5 border border-white/5',
        variantStyles[variant],
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};
