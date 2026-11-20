import React, { useState, useEffect } from 'react';
import { SiliconModuleId, UserProgress } from '../../types';
import { UvmTestbenchVisualizer } from '../visualizers/UvmTestbenchVisualizer';
import { ClockDomainCrossingVisualizer } from '../visualizers/ClockDomainCrossingVisualizer';
import { SiliconStructureViewer } from './SiliconStructureViewer';
import { Badge } from '../common/Badge';
import { playTick } from '../../lib/sound';
import { Layers, Cpu, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface SiliconTrackViewProps {
  initialModuleId?: SiliconModuleId | 'silicon-structure';
  progress: UserProgress;
  onChallengeComplete: (id: string) => void;
  onSelectModule?: (id: SiliconModuleId | 'silicon-structure') => void;
}

export const SiliconTrackView: React.FC<SiliconTrackViewProps> = ({
  initialModuleId = 'uvm-verification',
  progress,
  onChallengeComplete,
  onSelectModule,
}) => {
  const [activeView, setActiveView] = useState<SiliconModuleId | 'silicon-structure'>(
    initialModuleId
  );

  useEffect(() => {
    if (initialModuleId && initialModuleId !== activeView) {
      setActiveView(initialModuleId);
    }
  }, [initialModuleId]);

  const modules = [
    {
      id: 'uvm-verification' as SiliconModuleId,
      num: '09',
      title: 'UVM & Cocotb Verification',
      desc: 'Constrained-random testbench & functional coverage',
    },
    {
      id: 'pre-silicon-emulation' as SiliconModuleId,
      num: '10',
      title: 'Pre-Silicon Emulation & CDC',
      desc: 'Clock domain crossing, metastability & async FIFOs',
    },
  ];

  const handleSelectModule = (id: SiliconModuleId) => {
    playTick();
    setActiveView(id);
    onSelectModule?.(id);
  };

  const handleSelectStructure = () => {
    playTick();
    setActiveView('silicon-structure');
    onSelectModule?.('silicon-structure');
  };

  return (
    <div className="space-y-6 py-2">
      {/* Track 04 Intro Banner */}
      <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="emerald">TRACK 04 TAPEOUT</Badge>
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold tracking-wider uppercase">
              VLSI, Design Verification &amp; Pre-Silicon Emulation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight leading-tight">
            Designed to Tapeout
          </h1>
          <p className="text-sm sm:text-base font-serif italic text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl leading-relaxed">
            Master modern hardware verification, nanometer silicon structure, and pre-silicon
            emulation: drive stimulus through UVM harnesses, inspect die floorplans and FinFET
            cross-sections, and eliminate clock domain crossing hazards.
          </p>
        </div>

        {/* Submodule Segmented Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-parchment-200/50 dark:bg-parchment-900/50 border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono overflow-x-auto no-scrollbar max-w-full shrink-0">
          {modules.map((m) => {
            const isActive = activeView === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectModule(m.id)}
                className={clsx(
                  'px-3 sm:px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-sm border border-parchment-300 dark:border-parchment-700'
                    : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
                )}
              >
                <span
                  className={
                    isActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-ink-muted'
                  }
                >
                  {m.num}
                </span>
                <span>
                  {m.title.split(' ')[0]} {m.title.split(' ')[1]}
                </span>
              </button>
            );
          })}

          {/* Silicon Structure & Die Layout Tab */}
          <button
            onClick={handleSelectStructure}
            className={clsx(
              'px-3 sm:px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
              activeView === 'silicon-structure'
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold shadow-sm border border-emerald-500/40'
                : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Silicon Structure &amp; Die</span>
          </button>
        </div>
      </div>

      {/* Active Module View */}
      {activeView === 'uvm-verification' && (
        <UvmTestbenchVisualizer
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeView === 'pre-silicon-emulation' && (
        <ClockDomainCrossingVisualizer
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeView === 'silicon-structure' && <SiliconStructureViewer />}
    </div>
  );
};
