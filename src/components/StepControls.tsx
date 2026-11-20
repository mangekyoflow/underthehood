import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { playTick } from '../lib/sound';

interface Props {
  totalSteps: number;
  currentStep: number;
  onSelectStep: (step: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  lang?: Language;
}

export const StepControls: React.FC<Props> = ({
  totalSteps,
  currentStep,
  onSelectStep,
  onNext,
  onPrev,
  onReset,
  lang = 'en',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const t = TRANSLATIONS[lang];

  // Auto-play loop
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        if (currentStep < totalSteps - 1) {
          onNext();
        } else {
          setIsPlaying(false);
        }
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentStep, totalSteps, onNext]);

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-4 py-3 px-4 rounded-xl bg-white/70 dark:bg-parchment-900/70 border border-parchment-200 dark:border-parchment-800 shadow-xs">
      {/* Step Dots Scrubber */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-semibold text-ink-muted dark:text-ink-darkMuted mr-1">
          {t.stepOf
            .replace('{current}', String(currentStep + 1))
            .replace('{total}', String(totalSteps))}
        </span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                playTick();
                onSelectStep(idx);
              }}
              className={`h-2.5 rounded-full transition-all duration-300 ease-out cursor-pointer ${
                idx === currentStep
                  ? 'w-7 bg-blue-600 dark:bg-blue-400 shadow-sm scale-105'
                  : idx < currentStep
                    ? 'w-2.5 bg-emerald-500/70 dark:bg-emerald-400/70 hover:opacity-100 hover:scale-110'
                    : 'w-2.5 bg-parchment-300 dark:bg-parchment-700 hover:bg-parchment-400 hover:scale-110'
              }`}
              title={`Jump to step ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Button Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause */}
        <button
          onClick={() => {
            playTick();
            setIsPlaying(!isPlaying);
          }}
          className={`btn-pop p-2 rounded-lg border text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            isPlaying
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
              : 'border-parchment-300 dark:border-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
          }`}
          title={isPlaying ? t.pause : t.autoPlay}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isPlaying ? t.pause : t.autoPlay}</span>
        </button>

        {/* Reset */}
        <button
          onClick={() => {
            playTick();
            onReset();
          }}
          className="btn-pop p-2 rounded-lg border border-parchment-300 dark:border-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all cursor-pointer"
          title={t.resetStep}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Prev */}
        <button
          onClick={() => {
            playTick();
            onPrev();
          }}
          disabled={currentStep === 0}
          className="btn-pop px-3 py-1.5 rounded-lg border border-parchment-300 dark:border-parchment-700 text-xs font-mono font-medium text-ink-light dark:text-ink-dark hover:bg-parchment-100 dark:hover:bg-parchment-800 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t.prevStep}</span>
        </button>

        {/* Next */}
        <button
          onClick={() => {
            playTick();
            onNext();
          }}
          disabled={currentStep === totalSteps - 1}
          className="btn-pop px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-semibold shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>{t.nextStep}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
