import React from 'react';
import { Button } from './Button';
import { LucideIcon, PackageOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = PackageOpen,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-stone-300 bg-white/50 backdrop-blur-xs max-w-lg mx-auto my-6',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fbf4f5] text-[#7e2b44] mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-serif text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-1.5 text-sm text-stone-500 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} variant="primary" size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
