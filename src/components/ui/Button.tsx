import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'burgundy' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none rounded-lg tracking-wide cursor-pointer';

    const variants = {
      // Primary: Emerald Green (matching "Bloom" in logo)
      primary:
        'bg-[#155d2c] hover:bg-[#104923] active:bg-[#0a3318] text-white shadow-sm focus-visible:ring-[#155d2c]',
      // Gold: Metallic Warm Gold (matching gold arc & "BY Pela" in logo)
      gold:
        'bg-[#c9932b] hover:bg-[#af7820] active:bg-[#8b5b1a] text-white shadow-sm focus-visible:ring-[#c9932b]',
      // Burgundy: Deep Espresso Burgundy (matching "Nourish. Naturally." in logo)
      burgundy:
        'bg-[#742937] hover:bg-[#5e222d] active:bg-[#42161f] text-white shadow-sm focus-visible:ring-[#742937]',
      secondary:
        'bg-[#faf2dc] text-[#8b5b1a] hover:bg-[#f5e3b5] border border-[#eccd84] shadow-xs focus-visible:ring-[#c9932b]',
      outline:
        'border border-[#155d2c]/40 bg-transparent text-[#155d2c] hover:bg-[#f0f7f2] active:bg-[#dbeef1] focus-visible:ring-[#155d2c]',
      ghost:
        'bg-transparent text-stone-700 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400',
      danger:
        'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm focus-visible:ring-red-500',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2.5 h-10 gap-2',
      lg: 'text-base px-6 py-3 h-12 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
