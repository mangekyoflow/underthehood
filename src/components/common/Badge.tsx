import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose' | 'zinc';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'zinc',
  size = 'sm',
  className,
}) => {
  const variantStyles = {
    cyan: 'bg-cyan-500/10 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-500/25 dark:border-cyan-800/60',
    purple:
      'bg-purple-500/10 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-500/25 dark:border-purple-800/60',
    amber:
      'bg-amber-500/10 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-500/25 dark:border-amber-800/60',
    emerald:
      'bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 dark:border-emerald-800/60',
    rose: 'bg-rose-500/10 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-500/25 dark:border-rose-800/60',
    zinc: 'bg-parchment-200/60 dark:bg-parchment-800 text-ink-muted dark:text-ink-darkMuted border-parchment-300 dark:border-parchment-700',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-mono rounded-md border tracking-tight',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
