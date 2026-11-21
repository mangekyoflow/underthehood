import React, { useState } from 'react';
import { CheckCircle2, Circle, HelpCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Challenge } from '../../types';
import { Language, TRANSLATIONS } from '../../i18n/translations';
import { playSuccess, playTick } from '../../lib/sound';
import clsx from 'clsx';

interface ChallengeCardProps {
  challenge: Challenge;
  isCompleted: boolean;
  onComplete: (challengeId: string) => void;
  accentColor?: 'network' | 'database' | 'security' | 'robotics' | 'silicon';
  className?: string;
  lang?: Language;
}

const CONFETTI_COLORS: Record<string, string[]> = {
  security: ['#10b981', '#3b82f6', '#ffffff'],
  network: ['#06b6d4', '#38bdf8', '#ffffff'],
  robotics: ['#f59e0b', '#fb923c', '#ffffff'],
  silicon: ['#10b981', '#14b8a6', '#ffffff'],
  database: ['#8b5cf6', '#c084fc', '#ffffff'],
};

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  isCompleted,
  onComplete,
  accentColor = 'network',
  className,
  lang = 'en',
}) => {
  const [showHint, setShowHint] = useState(false);
  const t = TRANSLATIONS[lang];

  const handleManualComplete = () => {
    if (!isCompleted) {
      playSuccess();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: CONFETTI_COLORS[accentColor] || CONFETTI_COLORS.security,
        });
      } catch {
        // Confetti fallback
      }
      onComplete(challenge.id);
    }
  };

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 transition-all duration-300 relative overflow-hidden shadow-xs',
        isCompleted
          ? 'border-emerald-500/30 dark:border-emerald-800/60 bg-emerald-500/10 dark:bg-emerald-950/20'
          : 'border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 hover:border-parchment-300 dark:hover:border-parchment-700',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <button
            onClick={handleManualComplete}
            className="mt-0.5 text-ink-muted hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            title={isCompleted ? 'Challenge completed!' : 'Click to complete once verified'}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
            ) : (
              <Circle className="w-5 h-5 text-ink-muted/50 hover:text-emerald-500" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h4
                className={clsx(
                  'text-sm font-serif font-bold transition-colors',
                  isCompleted
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-ink-light dark:text-ink-dark'
                )}
              >
                {challenge.title}
              </h4>
              {isCompleted && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold">
                  {t.challengeSolvedBadge}
                </span>
              )}
            </div>

            <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-1 leading-relaxed">
              {challenge.description}
            </p>

            {showHint && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-300 dark:border-parchment-800 text-xs font-mono text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>{challenge.hint}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={() => {
              playTick();
              setShowHint(!showHint);
            }}
            className="text-[11px] font-mono text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors cursor-pointer"
          >
            <span>{showHint ? t.challengeHideHint : t.challengeHint}</span>
          </button>

          {!isCompleted && (
            <button
              onClick={handleManualComplete}
              className={clsx(
                'text-[11px] font-mono px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer font-semibold',
                accentColor === 'network'
                  ? 'border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                  : accentColor === 'robotics'
                    ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : accentColor === 'silicon'
                      ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300'
              )}
            >
              <Sparkles className="w-3 h-3" />
              <span>{t.challengeVerify}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
