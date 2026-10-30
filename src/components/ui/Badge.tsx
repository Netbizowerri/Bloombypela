import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'burgundy' | 'gold' | 'green' | 'cream' | 'neutral' | 'danger';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'burgundy',
  size = 'md',
  className,
  ...props
}) => {
  const variants = {
    burgundy: 'bg-[#faf3f4] text-[#742937] border-[#eacbcf]',
    gold: 'bg-[#faf2dc] text-[#8b5b1a] border-[#f5e3b5]',
    green: 'bg-[#f0f7f2] text-[#155d2c] border-[#b8dec3]',
    cream: 'bg-[#faf6ed] text-stone-800 border-[#ebddc0]',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border uppercase tracking-wider',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
