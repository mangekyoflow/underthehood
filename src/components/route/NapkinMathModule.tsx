import React from 'react';
import { NapkinMathVisualizer } from '../visualizers/NapkinMathVisualizer';
import { MODULES } from '../../data/modulesData';
import { Badge } from '../common/Badge';
import { ChallengeCard } from '../common/ChallengeCard';
import { Layers, Sparkles, BookOpen, CheckCircle2 } from 'lucide-react';

interface Props {
  onChallengeComplete: (id: string) => void;
  completedChallenges: Record<string, boolean>;
}

export const NapkinMathModule: React.FC<Props> = ({ onChallengeComplete, completedChallenges }) => {
  const moduleData = MODULES['napkin-math'];

  return (
    <div className="space-y-6">
      {/* Module Overview Header */}
      <div className="p-5 rounded-2xl bg-white/80 dark:bg-parchment-900/80 border border-parchment-200 dark:border-parchment-800 shadow-xs backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="cyan">MODULE 04</Badge>
            <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              {moduleData.subtitle}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            {moduleData.title}
          </h2>
          <p className="text-xs sm:text-sm font-sans text-ink-muted dark:text-ink-darkMuted mt-1 max-w-3xl leading-relaxed">
            {moduleData.tagline}
          </p>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-mono shrink-0">
          <Sparkles className="w-4 h-4" />
          <span>Interactive Explorable Math</span>
        </div>
      </div>

      {/* The Core Napkin Math Visualizer */}
      <NapkinMathVisualizer
        onChallengeComplete={onChallengeComplete}
        isChallengeSolved={(id) => !!completedChallenges[id]}
      />

      {/* Guided Challenges & Architectural Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Challenges (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-ink-muted dark:text-ink-darkMuted flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Interactive Napkin Math Challenges
            </h3>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {moduleData.challenges.filter((c) => completedChallenges[c.id]).length} /{' '}
              {moduleData.challenges.length} Completed
            </span>
          </div>

          <div className="space-y-3">
            {moduleData.challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                isCompleted={!!completedChallenges[c.id]}
                onComplete={onChallengeComplete}
                accentColor="network"
              />
            ))}
          </div>
        </div>

        {/* Right: Architectural Breakdown Cards (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-ink-muted dark:text-ink-darkMuted flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Architectural Tiers & Scaling Rules
            </h3>
            <span className="text-xs font-mono text-ink-muted">Capacity Roles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
            {moduleData.architectureDetails.components.map((comp, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white/80 dark:bg-parchment-900/80 border border-parchment-200 dark:border-parchment-800 space-y-1 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-ink-light dark:text-ink-dark">
                    {comp.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {comp.role}
                  </span>
                </div>
                <p className="text-ink-muted dark:text-ink-darkMuted leading-relaxed">
                  {comp.details}
                </p>
              </div>
            ))}
          </div>

          {/* Core Takeaway Card */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-sans text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-mono uppercase font-bold tracking-wider block mb-0.5 text-emerald-800 dark:text-emerald-300 text-[10px]">
                Principal Architect Takeaway
              </strong>
              {moduleData.keyTakeaway}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
