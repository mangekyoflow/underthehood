import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral' | 'alert';
  variant?: 'cyan' | 'blue' | 'purple' | 'amber' | 'emerald' | 'zinc';
  description?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  change,
  trend = 'neutral',
  variant = 'zinc',
  description,
  className,
}) => {
  const [isChanged, setIsChanged] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setIsChanged(true);
      const timer = setTimeout(() => setIsChanged(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const borderColors = {
    cyan: 'border-cyan-500/25 dark:border-cyan-900/40 hover:border-cyan-500/40 bg-white/80 dark:bg-parchment-900/80',
    blue: 'border-blue-500/25 dark:border-blue-900/40 hover:border-blue-500/40 bg-white/80 dark:bg-parchment-900/80',
    purple:
      'border-purple-500/25 dark:border-purple-900/40 hover:border-purple-500/40 bg-white/80 dark:bg-parchment-900/80',
    amber:
      'border-amber-500/25 dark:border-amber-900/40 hover:border-amber-500/40 bg-white/80 dark:bg-parchment-900/80',
    emerald:
      'border-emerald-500/25 dark:border-emerald-900/40 hover:border-emerald-500/40 bg-white/80 dark:bg-parchment-900/80',
    zinc: 'border-parchment-200 dark:border-parchment-800 hover:border-parchment-300 dark:hover:border-parchment-700 bg-white/80 dark:bg-parchment-900/80',
  };

  const flashAnimation = {
    cyan: 'animate-chip-flash',
    blue: 'animate-chip-flash',
    purple: 'animate-chip-flash',
    amber: 'animate-chip-flash-amber',
    emerald: 'animate-chip-flash-emerald',
    zinc: 'animate-chip-flash',
  };

  const textColors = {
    cyan: 'text-cyan-700 dark:text-cyan-300',
    blue: 'text-blue-700 dark:text-blue-300',
    purple: 'text-purple-700 dark:text-purple-300',
    amber: 'text-amber-700 dark:text-amber-300',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    zinc: 'text-ink-light dark:text-ink-dark',
  };

  return (
    <div
      className={clsx(
        'rounded-xl border p-3 sm:p-3.5 transition-all duration-200 flex flex-col justify-between shadow-xs hover:-translate-y-0.5 min-w-0 overflow-hidden',
        borderColors[variant],
        isChanged && flashAnimation[variant],
        className
      )}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-semibold truncate">
          {label}
        </span>
        {change && (
          <span
            className={clsx(
              'text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0',
              trend === 'up' &&
                'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
              trend === 'down' &&
                'bg-parchment-200/70 dark:bg-parchment-800 text-ink-muted dark:text-ink-darkMuted',
              trend === 'alert' &&
                'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25',
              trend === 'neutral' &&
                'bg-parchment-200/70 dark:bg-parchment-800 text-ink-muted dark:text-ink-darkMuted'
            )}
          >
            {change}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 sm:gap-1.5 overflow-hidden min-w-0">
        <span
          key={String(value)}
          className={clsx(
            'text-lg sm:text-xl md:text-2xl font-bold font-mono tracking-tight inline-block truncate',
            textColors[variant],
            isChanged && 'animate-value-swap'
          )}
          title={String(value)}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[10px] sm:text-xs font-mono text-ink-muted dark:text-ink-darkMuted shrink-0">
            {unit}
          </span>
        )}
      </div>

      {description && (
        <div className="mt-1.5 text-[10px] sm:text-[11px] text-ink-muted dark:text-ink-darkMuted leading-tight font-sans line-clamp-2">
          {description}
        </div>
      )}
    </div>
  );
};
