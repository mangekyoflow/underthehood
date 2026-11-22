import React, { useState, useEffect } from 'react';
import { QueryModuleId, UserProgress } from '../../types';
import { LsmTreeModule } from './LsmTreeModule';
import { BPlusTreeModule } from './BPlusTreeModule';
import { AcidSimulatorModule } from './AcidSimulatorModule';
import { Badge } from '../common/Badge';
import { playTick } from '../../lib/sound';
import { BookOpen } from 'lucide-react';
import clsx from 'clsx';

interface QueryTrackViewProps {
  initialModuleId?: QueryModuleId;
  progress: UserProgress;
  onChallengeComplete: (id: string) => void;
  onSelectModule?: (id: QueryModuleId) => void;
  onToggleCurriculum?: () => void;
}

const QUERY_MODULES = [
  {
    id: 'lsm-tree' as QueryModuleId,
    num: '05',
    title: 'LSM-Tree Simulator',
    desc: 'RocksDB & Cassandra storage engines',
  },
  {
    id: 'bplus-tree' as QueryModuleId,
    num: '06',
    title: 'B+ Tree Node Splitter',
    desc: 'Relational indexing & page splits',
  },
  {
    id: 'acid-isolation' as QueryModuleId,
    num: '06b',
    title: 'ACID & Isolation Levels',
    desc: 'Concurrency anomalies & MVCC',
  },
] as const;

export const QueryTrackView: React.FC<QueryTrackViewProps> = ({
  initialModuleId = 'lsm-tree',
  progress,
  onChallengeComplete,
  onSelectModule,
  onToggleCurriculum,
}) => {
  const [activeModule, setActiveModule] = useState<QueryModuleId>(initialModuleId);

  useEffect(() => {
    if (initialModuleId && initialModuleId !== activeModule) {
      setActiveModule(initialModuleId);
    }
  }, [initialModuleId, activeModule]);

  const handleSelect = (id: QueryModuleId) => {
    playTick();
    setActiveModule(id);
    onSelectModule?.(id);
  };

  return (
    <div className="space-y-6 py-2">
      {/* Track 02 Intro Banner */}
      <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="purple">TRACK 02 QUERY</Badge>
            <span className="text-xs font-mono text-purple-700 dark:text-purple-400 font-semibold tracking-wider uppercase">
              Database Internals &amp; Storage Engines
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight leading-tight">
            Designed to Query
          </h1>
          <p className="text-sm sm:text-base font-serif italic text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl leading-relaxed">
            Understand how databases store, retrieve, index, and protect data through interactive
            visual simulations of B+ trees, log-structured merge engines, and ACID transactions.
          </p>
        </div>

        {/* Submodule Segmented Pills & Course Index Trigger */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 max-w-full shrink-0">
          {onToggleCurriculum && (
            <button
              onClick={() => {
                playTick();
                onToggleCurriculum();
              }}
              className="px-3 sm:px-3.5 py-1.5 min-h-[38px] rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-800 dark:text-purple-300 font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
              title="Open Course Index (All 39 Modules)"
              aria-label="Open Course Index"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Course Index</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-[10px] font-mono">
                39
              </span>
            </button>
          )}

          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-parchment-200/50 dark:bg-parchment-900/50 border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono overflow-x-auto touch-scroll no-scrollbar max-w-full shrink-0">
            {QUERY_MODULES.map((m) => {
              const isActive = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  className={clsx(
                    'px-3 sm:px-3.5 py-1.5 min-h-[36px] rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                    isActive
                      ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-sm border border-parchment-300 dark:border-parchment-700'
                      : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
                  )}
                >
                  <span
                    className={
                      isActive ? 'text-purple-700 dark:text-purple-400 font-bold' : 'text-ink-muted'
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
          </div>
        </div>
      </div>

      {/* Active Module View */}
      {activeModule === 'lsm-tree' && (
        <LsmTreeModule
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeModule === 'bplus-tree' && (
        <BPlusTreeModule
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeModule === 'acid-isolation' && (
        <AcidSimulatorModule
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
    </div>
  );
};
