import React from 'react';
import { Lock, Globe, Server, Laptop, HardDrive } from 'lucide-react';
import { UrlLifecycleStep } from '../../types/route';
import { playTick } from '../../lib/sound';
import clsx from 'clsx';

interface LatencyWaterfallProps {
  steps: UrlLifecycleStep[];
  currentStepIdx: number;
  onSelectStep: (stepIdx: number) => void;
  protocolMode: 'HTTPS' | 'HTTP';
  dnsCacheMode: string;
}

interface WaterfallPhase {
  name: string;
  category: 'DNS' | 'TCP' | 'TLS' | 'HTTP' | 'RENDER';
  startMs: number;
  durationMs: number;
  endMs: number;
  firstStepIdx: number;
  color: string;
  barColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const LatencyWaterfall: React.FC<LatencyWaterfallProps> = ({
  steps,
  currentStepIdx,
  onSelectStep,
  protocolMode,
  dnsCacheMode,
}) => {
  // Aggregate steps into high-level waterfall phases
  const phases: WaterfallPhase[] = React.useMemo(() => {
    const result: WaterfallPhase[] = [];
    let currentStart = 0;

    // Group steps by phase
    const dnsSteps = steps.filter((s) => s.phase === 'DNS');
    const tcpSteps = steps.filter((s) => s.phase === 'TCP');
    const tlsSteps = steps.filter((s) => s.phase === 'TLS');
    const httpSteps = steps.filter((s) => s.phase === 'HTTP');
    const renderSteps = steps.filter((s) => s.phase === 'RENDER');

    if (dnsSteps.length > 0) {
      const duration = dnsSteps.reduce((acc, s) => acc + s.latencyMs, 0);
      result.push({
        name: 'DNS Resolution',
        category: 'DNS',
        startMs: currentStart,
        durationMs: duration,
        endMs: currentStart + duration,
        firstStepIdx: steps.findIndex((s) => s.phase === 'DNS'),
        color: 'text-sky-600 dark:text-sky-400',
        barColor: 'bg-sky-500',
        icon: Globe,
        description:
          dnsCacheMode === 'browser-hit'
            ? '0ms In-Memory Cache Hit'
            : 'Recursive root -> TLD -> authoritative query',
      });
      currentStart += duration;
    }

    if (tcpSteps.length > 0) {
      const duration = tcpSteps.reduce((acc, s) => acc + s.latencyMs, 0);
      result.push({
        name: 'TCP 3-Way Handshake',
        category: 'TCP',
        startMs: currentStart,
        durationMs: duration,
        endMs: currentStart + duration,
        firstStepIdx: steps.findIndex((s) => s.phase === 'TCP'),
        color: 'text-cyan-600 dark:text-cyan-400',
        barColor: 'bg-cyan-500',
        icon: Server,
        description: 'SYN -> SYN-ACK -> ACK (1.5 RTT transport initialization)',
      });
      currentStart += duration;
    }

    if (tlsSteps.length > 0) {
      const duration = tlsSteps.reduce((acc, s) => acc + s.latencyMs, 0);
      result.push({
        name: 'TLS 1.3 Key Exchange',
        category: 'TLS',
        startMs: currentStart,
        durationMs: duration,
        endMs: currentStart + duration,
        firstStepIdx: steps.findIndex((s) => s.phase === 'TLS'),
        color: 'text-emerald-600 dark:text-emerald-400',
        barColor: 'bg-emerald-500',
        icon: Lock,
        description: 'ECDHE Key Share & Certificate verification (1 RTT)',
      });
      currentStart += duration;
    }

    if (httpSteps.length > 0) {
      const duration = httpSteps.reduce((acc, s) => acc + s.latencyMs, 0);
      result.push({
        name: `HTTP Request & Response (${protocolMode})`,
        category: 'HTTP',
        startMs: currentStart,
        durationMs: duration,
        endMs: currentStart + duration,
        firstStepIdx: steps.findIndex((s) => s.phase === 'HTTP'),
        color: 'text-purple-600 dark:text-purple-400',
        barColor: 'bg-purple-500',
        icon: HardDrive,
        description: 'HTTP GET payload, server application execution & body stream',
      });
      currentStart += duration;
    }

    if (renderSteps.length > 0) {
      const duration = renderSteps.reduce((acc, s) => acc + s.latencyMs, 0);
      result.push({
        name: 'DOM Parsing & Paint',
        category: 'RENDER',
        startMs: currentStart,
        durationMs: duration,
        endMs: currentStart + duration,
        firstStepIdx: steps.findIndex((s) => s.phase === 'RENDER'),
        color: 'text-amber-600 dark:text-amber-400',
        barColor: 'bg-amber-500',
        icon: Laptop,
        description: 'HTML tokenization, CSSOM tree building, layout & composite',
      });
    }

    return result;
  }, [steps, protocolMode, dnsCacheMode]);

  const totalTimeMs = phases.reduce((acc, p) => acc + p.durationMs, 0);
  const currentStep = steps[currentStepIdx];

  return (
    <div className="rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 p-4 space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="font-bold text-xs uppercase tracking-wider text-ink-light dark:text-ink-dark">
            Network Waterfall & Critical Path Gantt (Navigation Timing Level 2)
          </span>
          <span className="text-[11px] text-ink-muted dark:text-ink-darkMuted ml-2">
            Total Time to Interactive:{' '}
            <strong className="text-cyan-700 dark:text-cyan-300">{totalTimeMs} ms</strong>
          </span>
        </div>
        <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
          Click any phase bar to jump simulation
        </span>
      </div>

      {/* Waterfall Visualizer Bars */}
      <div className="space-y-3">
        {phases.map((phase) => {
          const isPhaseActive = currentStep?.phase === phase.category;
          const leftPercent = (phase.startMs / Math.max(1, totalTimeMs)) * 100;
          const widthPercent = Math.max(3, (phase.durationMs / Math.max(1, totalTimeMs)) * 100);
          const Icon = phase.icon;

          return (
            <div
              key={phase.name}
              onClick={() => {
                playTick();
                onSelectStep(phase.firstStepIdx);
              }}
              className={clsx(
                'group p-2.5 rounded-lg border transition-all cursor-pointer',
                isPhaseActive
                  ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/30 shadow-xs ring-1 ring-cyan-500/30'
                  : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900/60 hover:border-parchment-300 dark:hover:border-parchment-700'
              )}
            >
              {/* Phase Meta Row */}
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className={clsx('w-3.5 h-3.5', phase.color)} />
                  <span
                    className={clsx(
                      'font-bold',
                      isPhaseActive
                        ? 'text-ink-light dark:text-ink-dark'
                        : 'text-ink-muted dark:text-ink-darkMuted'
                    )}
                  >
                    {phase.name}
                  </span>
                  <span className="text-ink-muted/70 text-[10px]">({phase.durationMs} ms)</span>
                </div>
                <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
                  <span>
                    {phase.startMs}ms → {phase.endMs}ms
                  </span>
                </div>
              </div>

              {/* Gantt Bar Track */}
              <div className="relative h-3 w-full bg-parchment-200 dark:bg-parchment-800 rounded-full overflow-hidden border border-parchment-300/70 dark:border-parchment-700">
                <div
                  className={clsx(
                    'absolute h-full rounded-full transition-all duration-300',
                    phase.barColor,
                    isPhaseActive
                      ? 'ring-2 ring-white/60 brightness-110'
                      : 'opacity-85 group-hover:opacity-100'
                  )}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                />
              </div>

              {/* Subtitle description */}
              <div className="mt-1.5 text-[10px] text-ink-muted dark:text-ink-darkMuted truncate font-sans">
                {phase.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline scale footer */}
      <div className="pt-2 border-t border-parchment-200 dark:border-parchment-800 flex items-center justify-between text-[10px] text-ink-muted dark:text-ink-darkMuted">
        <span>0 ms (Enter Pressed)</span>
        <span>{Math.round(totalTimeMs / 2)} ms</span>
        <span>{totalTimeMs} ms (Page Visible)</span>
      </div>
    </div>
  );
};
