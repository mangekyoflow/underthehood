import React, { useState, useEffect } from 'react';
import { RouteModuleId, UserProgress } from '../../types';
import { UrlLifecycleModule } from './UrlLifecycleModule';
import { TcpCongestionModule } from './TcpCongestionModule';
import { HttpRaceModule } from './HttpRaceModule';
import { NapkinMathModule } from './NapkinMathModule';
import { Badge } from '../common/Badge';
import { playTick } from '../../lib/sound';
import clsx from 'clsx';

interface RouteTrackViewProps {
  initialModuleId?: RouteModuleId;
  progress: UserProgress;
  onChallengeComplete: (id: string) => void;
  onSelectModule?: (id: RouteModuleId) => void;
}

export const RouteTrackView: React.FC<RouteTrackViewProps> = ({
  initialModuleId = 'url-lifecycle',
  progress,
  onChallengeComplete,
  onSelectModule,
}) => {
  const [activeModule, setActiveModule] = useState<RouteModuleId>(initialModuleId);

  useEffect(() => {
    if (initialModuleId && initialModuleId !== activeModule) {
      setActiveModule(initialModuleId);
    }
  }, [initialModuleId]);

  const modules = [
    {
      id: 'url-lifecycle' as RouteModuleId,
      num: '01',
      title: 'The Life of a URL Request',
      desc: 'DNS, TCP, TLS 1.3 & HTTP stack',
    },
    {
      id: 'tcp-congestion' as RouteModuleId,
      num: '02',
      title: 'TCP Congestion Control',
      desc: 'Reno vs BBR, cwnd, and bufferbloat',
    },
    {
      id: 'http-race' as RouteModuleId,
      num: '03',
      title: 'HTTP/1.1 vs HTTP/2 vs HTTP/3',
      desc: 'Multiplexing & Head-of-Line blocking',
    },
    {
      id: 'napkin-math' as RouteModuleId,
      num: '04',
      title: 'Napkin Math Capacity',
      desc: 'Order-of-magnitude systems sizing',
    },
  ];

  const handleSelect = (id: RouteModuleId) => {
    playTick();
    setActiveModule(id);
    onSelectModule?.(id);
  };

  return (
    <div className="space-y-6 py-2">
      {/* Track 01 Intro Banner */}
      <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan">TRACK 01 ROUTE</Badge>
            <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold tracking-wider uppercase">
              Internet Plumbing &amp; Packet Lifecycles
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight leading-tight">
            Designed to Route
          </h1>
          <p className="text-sm sm:text-base font-serif italic text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl leading-relaxed">
            Understand how data travels across physical networks, how protocols establish state, and
            what happens when packets encounter bufferbloat and packet drops.
          </p>
        </div>

        {/* Submodule Segmented Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-parchment-200/50 dark:bg-parchment-900/50 border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono overflow-x-auto no-scrollbar max-w-full shrink-0">
          {modules.map((m) => {
            const isActive = activeModule === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelect(m.id)}
                className={clsx(
                  'px-3 sm:px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-sm border border-parchment-300 dark:border-parchment-700'
                    : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
                )}
              >
                <span
                  className={
                    isActive ? 'text-cyan-700 dark:text-cyan-400 font-bold' : 'text-ink-muted'
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

      {/* Active Module View */}
      {activeModule === 'url-lifecycle' && (
        <UrlLifecycleModule
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeModule === 'tcp-congestion' && (
        <TcpCongestionModule
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeModule === 'http-race' && (
        <HttpRaceModule
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeModule === 'napkin-math' && (
        <NapkinMathModule
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
    </div>
  );
};
