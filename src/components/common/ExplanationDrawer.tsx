import React, { useState } from 'react';
import { BookOpen, Cpu, FlaskConical, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { ModuleDefinition } from '../../data/modulesData';
import { Badge } from './Badge';
import clsx from 'clsx';

interface ExplanationDrawerProps {
  module: ModuleDefinition;
  className?: string;
}

export const ExplanationDrawer: React.FC<ExplanationDrawerProps> = ({ module, className }) => {
  const [activeTab, setActiveTab] = useState<'concept' | 'architecture' | 'takeaway'>('concept');
  const [isExpanded, setIsExpanded] = useState(true);

  const isNetwork = module.trackId === 'route';

  return (
    <div
      className={clsx(
        'rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-xs overflow-hidden transition-all',
        className
      )}
    >
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-3.5 border-b border-parchment-200 dark:border-parchment-800 bg-parchment-100/60 dark:bg-parchment-950/60">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
          <Badge
            variant={
              module.trackId === 'route'
                ? 'cyan'
                : module.trackId === 'query'
                  ? 'purple'
                  : module.trackId === 'actuate'
                    ? 'amber'
                    : 'emerald'
            }
          >
            TRACK{' '}
            {module.trackId === 'route'
              ? '01 ROUTE'
              : module.trackId === 'query'
                ? '02 QUERY'
                : module.trackId === 'actuate'
                  ? '03 ACTUATE'
                  : '04 TAPEOUT'}
          </Badge>
          <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted shrink-0">
            MODULE {module.number}
          </span>
          <span className="text-ink-muted/40 dark:text-ink-darkMuted/40 hidden sm:inline shrink-0 font-mono">
            •
          </span>
          <h3 className="text-sm sm:text-base font-serif font-bold text-ink-light dark:text-ink-dark truncate min-w-0">
            {module.title}
          </h3>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="flex bg-parchment-200/50 dark:bg-parchment-950 rounded-xl p-0.5 border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('concept')}
              className={clsx(
                'px-2.5 sm:px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                activeTab === 'concept'
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Concept</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={clsx(
                'px-2.5 sm:px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                activeTab === 'architecture'
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Architecture</span>
            </button>

            <button
              onClick={() => setActiveTab('takeaway')}
              className={clsx(
                'px-2.5 sm:px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                activeTab === 'takeaway'
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center text-ink-muted hover:text-ink-light dark:hover:text-ink-dark rounded-lg hover:bg-parchment-200/60 dark:hover:bg-parchment-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
            aria-label={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 text-sm text-ink-light dark:text-ink-dark leading-relaxed max-h-[380px] overflow-y-auto font-sans">
          {activeTab === 'concept' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted mb-1 font-semibold">
                  Core Engineering Principle
                </h4>
                <p className="text-ink-light dark:text-ink-dark text-sm leading-relaxed">
                  {module.concept}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono text-ink-light dark:text-ink-dark flex items-start gap-2.5">
                <FlaskConical
                  className={clsx(
                    'w-4 h-4 shrink-0 mt-0.5',
                    module.trackId === 'route'
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : module.trackId === 'query'
                        ? 'text-purple-600 dark:text-purple-400'
                        : module.trackId === 'actuate'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                  )}
                />
                <div>
                  <span className="font-bold text-ink-light dark:text-ink-dark">
                    Observe in Simulator:{' '}
                  </span>
                  {module.tagline}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted mb-2 font-semibold">
                System Topology & Component Roles
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {module.architectureDetails.components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-serif font-bold text-sm text-ink-light dark:text-ink-dark">
                        {comp.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-parchment-200/80 dark:bg-parchment-800 text-ink-muted dark:text-ink-darkMuted font-semibold">
                        {comp.role}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                      {comp.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'takeaway' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
                <div className="flex items-center gap-2 mb-2">
                  <Target
                    className={clsx(
                      'w-4 h-4',
                      isNetwork
                        ? 'text-cyan-600 dark:text-cyan-400'
                        : 'text-purple-600 dark:text-purple-400'
                    )}
                  />
                  <h4 className="text-sm font-serif font-bold text-ink-light dark:text-ink-dark">
                    Key Systems Engineering Insight
                  </h4>
                </div>
                <p className="text-ink-light dark:text-ink-dark text-sm leading-relaxed font-serif italic">
                  {module.keyTakeaway}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-ink-muted dark:text-ink-darkMuted pt-1">
                <span>Designed for high-throughput & low-latency engineering</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  Verified Mental Model ✓
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
