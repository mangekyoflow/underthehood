import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Zap,
  Code2,
  Copy,
  Check,
  Cpu,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Plus,
  Minus,
  RefreshCw,
  FastForward,
} from 'lucide-react';
import { RoboticsTutorialStep, StepChapter } from '../../data/roboticsTutorialData';
import { playTick, playSuccess } from '../../lib/sound';
import clsx from 'clsx';

interface RoboticsTutorialCardProps {
  steps: RoboticsTutorialStep[];
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  onApplyAction: (step: RoboticsTutorialStep) => void;
  lastAppliedActionStep?: number | null;
}

export const RoboticsTutorialCard: React.FC<RoboticsTutorialCardProps> = ({
  steps,
  currentStepIndex,
  onSelectStep,
  onApplyAction,
  lastAppliedActionStep,
}) => {
  const [activeTab, setActiveTab] = useState<'narrative' | 'math' | 'code'>('narrative');
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [justApplied, setJustApplied] = useState<boolean>(false);

  const step = steps[currentStepIndex] || steps[0];

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      onSelectStep(currentStepIndex + 1);
    } else {
      onSelectStep(0);
    }
  }, [currentStepIndex, steps.length, onSelectStep]);

  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      onSelectStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, onSelectStep]);

  // Auto-play timer with configurable speed (1x: 5.5s, 2x: 2.75s)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isAutoPlaying) {
      const interval = playbackSpeed === 1 ? 5500 : 2750;
      timer = setInterval(() => {
        handleNextStep();
      }, interval);
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, playbackSpeed, handleNextStep]);

  // Keyboard navigation for Left/Right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        playTick();
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        playTick();
        handlePrevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStep, handlePrevStep]);

  // Pause on page blur / visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsAutoPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleActionClick = () => {
    playSuccess();
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2200);
    onApplyAction(step);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getChapterBadge = (chapter: StepChapter) => {
    switch (chapter) {
      case 'problem':
        return {
          label: 'PROBLEM',
          badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
        };
      case 'solution':
        return {
          label: 'SOLUTION',
          badgeClass:
            'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        };
      case 'technique':
        return {
          label: 'TECHNIQUE',
          badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
        };
      case 'insight':
        return {
          label: 'INSIGHT',
          badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
        };
      case 'recap':
        return {
          label: 'RECAP',
          badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        };
      case 'setup':
      default:
        return {
          label: 'SETUP',
          badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
        };
    }
  };

  const getCalloutIcon = (kind: 'insight' | 'warn' | 'tip') => {
    switch (kind) {
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'tip':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'insight':
      default:
        return <Lightbulb className="w-4 h-4 text-blue-500" />;
    }
  };

  const isCurrentStepApplied = lastAppliedActionStep === currentStepIndex || justApplied;
  const chapterInfo = getChapterBadge(step.chapter);

  return (
    <div className="rounded-2xl border border-parchment-200/80 dark:border-parchment-800/80 bg-white/95 dark:bg-parchment-900/95 shadow-sm overflow-hidden transition-all space-y-0">
      {/* 1. Step Scrubber Controls Bar (Designed to Scale style) */}
      <div className="p-3 sm:p-4 bg-parchment-100/70 dark:bg-parchment-950/70 border-b border-parchment-200/80 dark:border-parchment-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Player Controls (Prev, Play/Pause, Next, Speed) */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 shrink-0">
          <button
            onClick={() => {
              playTick();
              handlePrevStep();
            }}
            disabled={currentStepIndex === 0}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark hover:bg-parchment-200/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 text-xs font-mono font-semibold min-h-[38px] justify-center"
            title="Previous Step (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setIsAutoPlaying(!isAutoPlaying);
            }}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-2xs min-h-[38px]',
              isAutoPlaying
                ? 'bg-amber-600 text-white border-amber-600 animate-pulse'
                : 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark border-parchment-300 dark:border-parchment-700 hover:bg-parchment-200/60'
            )}
            title={isAutoPlaying ? 'Pause Auto-Play' : 'Start Auto-Play'}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => {
              playTick();
              handleNextStep();
            }}
            disabled={currentStepIndex === steps.length - 1}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark hover:bg-parchment-200/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 text-xs font-mono font-semibold min-h-[38px] justify-center"
            title="Next Step (Right Arrow)"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Speed Toggle (1x / 2x) */}
          <button
            onClick={() => {
              playTick();
              setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white/70 dark:bg-parchment-800/70 text-[11px] font-mono font-bold text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[38px]"
            title="Playback Speed"
          >
            <FastForward className="w-3 h-3 text-amber-500" />
            <span>{playbackSpeed}x</span>
          </button>
        </div>

        {/* Right / Center: Segmented Step Buttons with Short Names */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 touch-scroll">
          {steps.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            return (
              <button
                key={idx}
                onClick={() => {
                  playTick();
                  onSelectStep(idx);
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 min-h-[36px]',
                  isActive
                    ? 'bg-amber-600 text-white font-bold shadow-xs ring-2 ring-amber-500/30'
                    : 'bg-white/80 dark:bg-parchment-800/80 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark border border-parchment-200 dark:border-parchment-700 hover:bg-parchment-200/60'
                )}
                title={`Step ${s.step}: ${s.title}`}
              >
                <span
                  className={clsx(
                    'opacity-80 text-[10px]',
                    isActive ? 'text-white' : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  {s.step}.
                </span>
                <span>{s.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Top Header & Tab Controls */}
      <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-parchment-200/80 dark:border-parchment-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Step Badge & Chapter Pill */}
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border',
              chapterInfo.badgeClass
            )}
          >
            {chapterInfo.label} • STEP {step.step} OF {step.totalSteps}
          </span>
          <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted hidden sm:inline">
            {step.phase}
          </span>
        </div>

        {/* Tab switchers: Narrative, Math, Driver Code */}
        <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-parchment-200/60 dark:bg-parchment-800/60 text-xs font-mono">
          <button
            onClick={() => {
              playTick();
              setActiveTab('narrative');
            }}
            className={clsx(
              'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'narrative'
                ? 'bg-white dark:bg-parchment-700 text-ink-light dark:text-ink-dark font-bold shadow-2xs'
                : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
            )}
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Narrative</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('math');
            }}
            className={clsx(
              'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'math'
                ? 'bg-white dark:bg-parchment-700 text-ink-light dark:text-ink-dark font-bold shadow-2xs'
                : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
            )}
          >
            <Cpu className="w-3 h-3 text-cyan-500" />
            <span>Physics &amp; Math</span>
          </button>

          {step.codeSnippet && (
            <button
              onClick={() => {
                playTick();
                setActiveTab('code');
              }}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'code'
                  ? 'bg-white dark:bg-parchment-700 text-ink-light dark:text-ink-dark font-bold shadow-2xs'
                  : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <Code2 className="w-3 h-3 text-blue-500" />
              <span>Driver Code</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Step Content */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* TAB 1: Narrative + Changes + Callout (Designed to Scale layout) */}
        {activeTab === 'narrative' && (
          <div className="space-y-4">
            {/* Step Title & Main Explanation */}
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark leading-tight">
                {step.title}
              </h2>
              <p className="text-sm sm:text-base text-ink-light dark:text-ink-dark mt-2.5 leading-relaxed">
                {step.narrative}
              </p>
            </div>

            {/* Dynamics Deep Dive Box */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-parchment-100/60 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 text-xs sm:text-sm text-ink-muted dark:text-ink-darkMuted leading-relaxed">
              <span className="font-bold text-ink-light dark:text-ink-dark block mb-1">
                Robotics Dynamics Deep Dive:
              </span>
              {step.deepDive}
            </div>

            {/* CHANGES IN THIS STEP (Diff block with +, -, ~ bullets) */}
            {step.changes && step.changes.length > 0 && (
              <div className="p-4 rounded-xl border border-parchment-200/90 dark:border-parchment-800/90 bg-parchment-50/50 dark:bg-parchment-950/40 space-y-2.5">
                <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 text-amber-500" />
                  <span>Changes In This Step</span>
                </div>
                <div className="space-y-1.5">
                  {step.changes.map((change, cIdx) => {
                    const isAdded = change.startsWith('+');
                    const isRemoved = change.startsWith('-');
                    const isModified = change.startsWith('~');

                    const text = change.replace(/^[+\-~]\s*/, '');

                    return (
                      <div
                        key={cIdx}
                        className={clsx(
                          'flex items-start gap-2 text-xs font-mono p-1.5 rounded-lg border transition-colors',
                          isAdded &&
                            'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/20',
                          isRemoved &&
                            'bg-rose-500/10 text-rose-900 dark:text-rose-200 border-rose-500/20',
                          isModified &&
                            'bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/20',
                          !isAdded &&
                            !isRemoved &&
                            !isModified &&
                            'bg-parchment-200/50 dark:bg-parchment-800/50 text-ink-light dark:text-ink-dark border-transparent'
                        )}
                      >
                        <span className="mt-0.5 shrink-0">
                          {isAdded && (
                            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                          {isRemoved && (
                            <Minus className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          )}
                          {isModified && (
                            <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          )}
                        </span>
                        <span className="leading-relaxed">{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CALLOUT BOX (High-contrast Insight / Warning / Tip card) */}
            {step.callout && (
              <div
                className={clsx(
                  'p-4 rounded-xl border flex items-start gap-3 shadow-2xs transition-all',
                  step.callout.kind === 'warn' &&
                    'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/70',
                  step.callout.kind === 'tip' &&
                    'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/70',
                  step.callout.kind === 'insight' &&
                    'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/70'
                )}
              >
                <div className="p-1.5 rounded-lg bg-white dark:bg-parchment-800 shrink-0 mt-0.5 shadow-2xs">
                  {getCalloutIcon(step.callout.kind)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'text-[10px] font-mono font-bold tracking-wider uppercase',
                        step.callout.kind === 'warn' && 'text-amber-700 dark:text-amber-300',
                        step.callout.kind === 'tip' && 'text-emerald-700 dark:text-emerald-300',
                        step.callout.kind === 'insight' && 'text-blue-700 dark:text-blue-300'
                      )}
                    >
                      {step.callout.kind.toUpperCase()}
                    </span>
                    {step.callout.title && (
                      <span className="text-xs font-serif font-bold text-ink-light dark:text-ink-dark">
                        • {step.callout.title}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-ink-light dark:text-ink-dark leading-relaxed font-sans">
                    {step.callout.text}
                  </p>
                </div>
              </div>
            )}

            {/* Interactive Action Trigger Deck */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-parchment-100/50 dark:from-amber-950/30 dark:via-amber-950/15 dark:to-parchment-900/50 border border-amber-300 dark:border-amber-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-white dark:bg-amber-600">
                    INTERACTIVE ACTION
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200">
                    {step.interactiveAction.badge}
                  </span>
                </div>
                <p className="text-xs font-sans text-ink-light dark:text-ink-dark">
                  {step.interactiveAction.description}
                </p>
              </div>

              <button
                onClick={handleActionClick}
                className={clsx(
                  'px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer w-full sm:w-auto shrink-0 shadow-sm min-h-[42px]',
                  isCurrentStepApplied
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white'
                )}
              >
                {isCurrentStepApplied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                    <span>Simulation Configured!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-200 animate-pulse" />
                    <span>⚡ Run Simulation Scenario</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Physics & Mathematics */}
        {activeTab === 'math' && (
          <div className="space-y-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted">
              Governing Mathematical Physics &amp; Closed-Form Derivations
            </h3>

            {step.formula && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-cyan-300 font-mono text-sm sm:text-base overflow-x-auto shadow-inner">
                <code>{step.formula}</code>
              </div>
            )}

            {step.formulaExplanation && (
              <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-darkMuted leading-relaxed">
                {step.formulaExplanation}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 font-mono text-xs space-y-1">
                <span className="font-bold text-amber-700 dark:text-amber-400 block uppercase">
                  Physical Unit Balance
                </span>
                <span className="text-ink-muted">
                  Torque (Nm) = Force (N) × Distance (m) = Current (A) × Flux (Wb) × Pole Pairs
                </span>
              </div>
              <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 font-mono text-xs space-y-1">
                <span className="font-bold text-cyan-700 dark:text-cyan-400 block uppercase">
                  Control Loop Nyquist Rate
                </span>
                <span className="text-ink-muted">
                  Current Loop: 25-50 kHz | Velocity Loop: 1-5 kHz | Position/Trajectory: 250-1000
                  Hz
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Production Driver Code */}
        {activeTab === 'code' && step.codeSnippet && (
          <div className="space-y-2">
            <div className="rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-950 text-slate-100 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between px-3.5 py-2 bg-parchment-900/90 border-b border-parchment-800 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{step.codeSnippet.filename}</span>
                </div>
                <button
                  onClick={() => handleCopyCode(step.codeSnippet!.code)}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 text-xs font-mono overflow-x-auto text-amber-300 leading-relaxed">
                <code>{step.codeSnippet.code}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
