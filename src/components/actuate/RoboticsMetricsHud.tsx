import React from 'react';
import { StepMetricValue, ModuleMetricMeta } from '../../data/roboticsTutorialData';
import { Gauge, Clock, Zap, Shield, Activity, Cpu } from 'lucide-react';
import clsx from 'clsx';

interface RoboticsMetricsHudProps {
  metrics: Record<string, StepMetricValue>;
  metricConfigs: ModuleMetricMeta[];
  stepNumber: number;
}

export const RoboticsMetricsHud: React.FC<RoboticsMetricsHudProps> = ({
  metrics,
  metricConfigs,
  stepNumber,
}) => {
  const getIconForIndex = (idx: number) => {
    switch (idx % 6) {
      case 0:
        return <Gauge className="w-3.5 h-3.5 text-amber-500" />;
      case 1:
        return <Activity className="w-3.5 h-3.5 text-cyan-500" />;
      case 2:
        return <Clock className="w-3.5 h-3.5 text-indigo-500" />;
      case 3:
        return <Zap className="w-3.5 h-3.5 text-emerald-500" />;
      case 4:
        return <Shield className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  const getStatusColor = (status?: 'good' | 'warn' | 'bad' | 'neutral') => {
    switch (status) {
      case 'good':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'warn':
        return 'text-amber-600 dark:text-amber-400';
      case 'bad':
        return 'text-rose-600 dark:text-rose-400';
      case 'neutral':
      default:
        return 'text-sky-600 dark:text-sky-400';
    }
  };

  const getStatusDot = (status?: 'good' | 'warn' | 'bad' | 'neutral') => {
    switch (status) {
      case 'good':
        return 'bg-emerald-500 shadow-emerald-500/50';
      case 'warn':
        return 'bg-amber-500 shadow-amber-500/50';
      case 'bad':
        return 'bg-rose-500 shadow-rose-500/50';
      case 'neutral':
      default:
        return 'bg-sky-500 shadow-sky-500/50';
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
      {metricConfigs.map((cfg, idx) => {
        const metric = metrics[cfg.key] || {
          label: cfg.label,
          value: '—',
          status: 'neutral',
          sublabel: cfg.description,
        };

        return (
          <div
            key={cfg.key}
            className="p-3 sm:p-4 rounded-xl border border-parchment-200/80 dark:border-parchment-800/80 bg-white/90 dark:bg-parchment-900/90 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group min-w-0"
          >
            {/* Top row: Icon + Label + Status Dot */}
            <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {getIconForIndex(idx)}
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted truncate">
                  {metric.label || cfg.label}
                </span>
              </div>
              <span
                className={clsx(
                  'w-2 h-2 rounded-full shrink-0 shadow-xs transition-colors',
                  getStatusDot(metric.status)
                )}
                title={`Status: ${metric.status || 'nominal'}`}
              />
            </div>

            {/* Middle row: Large Metric Value */}
            <div
              key={`${stepNumber}-${cfg.key}`}
              className={clsx(
                'text-base sm:text-xl lg:text-2xl font-mono font-bold tracking-tight transition-all duration-300 truncate',
                getStatusColor(metric.status)
              )}
              title={metric.value}
            >
              {metric.value}
            </div>

            {/* Bottom row: Sublabel / description */}
            <div
              className="text-[10px] sm:text-[11px] font-mono text-ink-muted/90 dark:text-ink-darkMuted/90 mt-1 truncate"
              title={metric.sublabel || cfg.description}
            >
              {metric.sublabel || cfg.description}
            </div>
          </div>
        );
      })}
    </div>
  );
};
