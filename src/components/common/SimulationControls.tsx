import React from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Gauge } from 'lucide-react';
import clsx from 'clsx';
import { playTick } from '../../lib/sound';

interface SimulationControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  onReset: () => void;
  canStepForward?: boolean;
  canStepBackward?: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  currentStep?: number;
  totalSteps?: number;
  statusText?: string;
  variant?: 'network' | 'database';
  className?: string;
}

const SIMULATION_SPEEDS = [0.5, 1, 2, 4] as const;

const SIMULATION_VARIANT_ACCENTS = {
  network: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20',
  database: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20',
} as const;

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isPlaying,
  onPlayPause,
  onStepForward,
  onStepBackward,
  onReset,
  canStepForward = true,
  canStepBackward = true,
  speed,
  onSpeedChange,
  currentStep,
  totalSteps,
  statusText,
  variant = 'network',
  className,
}) => {
  const handleAction = (callback?: () => void) => {
    if (!callback) return;
    playTick();
    callback();
  };

  const activeAccent = SIMULATION_VARIANT_ACCENTS[variant];

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-sm backdrop-blur-xs',
        className
      )}
    >
      {/* Playback Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleAction(onPlayPause)}
          className={clsx(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-xs font-mono transition-all shadow-xs cursor-pointer',
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
              : activeAccent
          )}
          title={isPlaying ? 'Pause Simulation (Space)' : 'Play Simulation (Space)'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {currentStep && totalSteps && currentStep >= totalSteps ? 'Replay' : 'Play'}
              </span>
            </>
          )}
        </button>

        {onStepBackward && (
          <button
            onClick={() => handleAction(onStepBackward)}
            disabled={!canStepBackward || isPlaying}
            className="p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 text-ink-light dark:text-ink-dark disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Step Backward (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {onStepForward && (
          <button
            onClick={() => handleAction(onStepForward)}
            disabled={!canStepForward || isPlaying}
            className="p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 text-ink-light dark:text-ink-dark disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Step Forward (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => handleAction(onReset)}
          className="p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors cursor-pointer"
          title="Reset Simulation (R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Progress & Status */}
      {typeof currentStep === 'number' && typeof totalSteps === 'number' && (
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 min-w-[120px]">
            <div className="flex justify-between items-center text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted font-semibold">
              <span>
                STEP {currentStep} OF {totalSteps}
              </span>
              <span>{Math.round((currentStep / Math.max(totalSteps, 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-parchment-200 dark:bg-parchment-800 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full transition-all duration-300 rounded-full',
                  variant === 'network' ? 'bg-cyan-500' : 'bg-purple-500'
                )}
                style={{ width: `${(currentStep / Math.max(totalSteps, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {statusText && (
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 font-mono text-xs text-ink-muted dark:text-ink-darkMuted">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">{statusText}</span>
        </div>
      )}

      {/* Speed Controls */}
      <div className="flex items-center gap-1 bg-parchment-100 dark:bg-parchment-950 p-1 rounded-xl border border-parchment-200 dark:border-parchment-800">
        <Gauge className="w-3.5 h-3.5 text-ink-muted dark:text-ink-darkMuted ml-1.5 mr-0.5" />
        {SIMULATION_SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => {
              playTick();
              onSpeedChange(s);
            }}
            className={clsx(
              'px-2 py-0.5 rounded-lg text-xs font-mono transition-all cursor-pointer',
              speed === s
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-2xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
            )}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};
