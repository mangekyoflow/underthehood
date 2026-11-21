import React, { useState, useEffect, useCallback } from 'react';
import { Network, Laptop, Server } from 'lucide-react';
import { MODULES } from '../../data/modulesData';
import {
  TcpConfig,
  TcpEngineState,
  createInitialTcpState,
  stepTcpSimulation,
} from './TcpSimEngine';
import { TcpLiveChart } from './TcpLiveChart';
import { SimulationControls } from '../common/SimulationControls';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { ChallengeCard } from '../common/ChallengeCard';
import { TerminalLog, LogEntry } from '../common/TerminalLog';
import { playTick } from '../../lib/sound';
import clsx from 'clsx';

interface TcpCongestionModuleProps {
  onChallengeComplete: (id: string) => void;
  completedChallenges: Record<string, boolean>;
}

export const TcpCongestionModule: React.FC<TcpCongestionModuleProps> = ({
  onChallengeComplete,
  completedChallenges,
}) => {
  const moduleData = MODULES['tcp-congestion'];

  // User Config
  const [config, setConfig] = useState<TcpConfig>({
    bandwidthMbps: 50,
    baselineRttMs: 40,
    lossRatePct: 0,
    bufferCapacity: 30,
    crossTraffic: false,
  });

  const [activeAlgo, setActiveAlgo] = useState<'all' | 'reno' | 'cubic' | 'bbr'>('all');
  const [chartMetric, setChartMetric] = useState<'cwnd' | 'throughput' | 'queue'>('cwnd');

  // Simulation State
  const [simState, setSimState] = useState<TcpEngineState>(() => createInitialTcpState(config));
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Calculate Bandwidth-Delay Product (BDP) in packets and bytes
  const bdpBytes = Math.round((config.bandwidthMbps * 1e6 * (config.baselineRttMs / 1000)) / 8);
  const bdpPackets = Math.max(4, Math.round(bdpBytes / 1500));

  // Step simulation function
  const handleStep = useCallback(() => {
    setSimState((prev) => {
      const next = stepTcpSimulation(prev, config);
      const latest = next.history[next.history.length - 1];

      // Challenge detection
      if (config.lossRatePct >= 3 || next.renoLostPackets > prev.renoLostPackets) {
        onChallengeComplete('challenge-tcp-1');
      }
      if (next.bbrState === 'PROBE_BW' && next.timeTick > 10) {
        onChallengeComplete('challenge-tcp-2');
      }

      // Add log
      if (latest && latest.eventDescription) {
        const timeStr = `Tick +${next.timeTick * config.baselineRttMs}ms`;
        setLogs((l) => [
          ...l.slice(-25),
          {
            id: `tcp-${next.timeTick}-${Date.now()}`,
            timestamp: timeStr,
            level: next.renoLostPackets > prev.renoLostPackets ? 'warn' : 'info',
            category: 'TCP-KERNEL',
            message: latest.eventDescription || '',
          },
        ]);
      }

      return next;
    });
  }, [config, onChallengeComplete]);

  // Stop playback when moving out of the browser tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Playback timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      const interval = Math.max(150, 800 / speed);
      timer = setInterval(() => {
        handleStep();
      }, interval);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speed, handleStep]);

  const handleReset = () => {
    setIsPlaying(false);
    setSimState(createInitialTcpState(config));
    setLogs([]);
  };

  const latestPoint = simState.history[simState.history.length - 1] || simState.history[0];

  // Calculate simulated bufferbloat delay (ms added to baseline RTT)
  const pktsPerSec = (config.bandwidthMbps * 1e6) / (1500 * 8);
  const renoBloatMs = Math.round((latestPoint.renoQueue / pktsPerSec) * 1000);
  const bbrBloatMs = Math.round((latestPoint.bbrQueue / pktsPerSec) * 1000);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="cyan">MODULE 02</Badge>
            <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted font-semibold">
              TRANSPORT LAYER DYNAMICS
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight">
            TCP Congestion Control Simulator
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl font-sans">
            {moduleData.tagline}
          </p>
        </div>

        {/* Algorithm Filter Pill (Reno vs Cubic vs BBR) */}
        <div className="flex items-center gap-2">
          <div className="flex bg-parchment-200/50 dark:bg-parchment-950 p-1 rounded-xl border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono">
            <button
              onClick={() => {
                playTick();
                setActiveAlgo('all');
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold',
                activeAlgo === 'all'
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark shadow-xs border border-parchment-300 dark:border-parchment-700'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              All 3
            </button>
            <button
              onClick={() => {
                playTick();
                setActiveAlgo('reno');
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold',
                activeAlgo === 'reno'
                  ? 'bg-cyan-500/10 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-cyan-600'
              )}
            >
              Reno (AIMD)
            </button>
            <button
              onClick={() => {
                playTick();
                setActiveAlgo('cubic');
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold',
                activeAlgo === 'cubic'
                  ? 'bg-emerald-500/10 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-emerald-600'
              )}
            >
              Cubic (Linux)
            </button>
            <button
              onClick={() => {
                playTick();
                setActiveAlgo('bbr');
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold',
                activeAlgo === 'bbr'
                  ? 'bg-purple-500/10 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-purple-600'
              )}
            >
              BBR (Google)
            </button>
          </div>
        </div>
      </div>

      {/* Network Configuration Sliders */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bandwidth */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">Bottleneck Bandwidth:</span>
            <span className="text-cyan-700 dark:text-cyan-300 font-bold">
              {config.bandwidthMbps} Mbps
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={config.bandwidthMbps}
            onChange={(e) => setConfig({ ...config, bandwidthMbps: Number(e.target.value) })}
            className="w-full accent-cyan-600 cursor-pointer"
          />
        </div>

        {/* Latency */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">Baseline RTT:</span>
            <span className="text-cyan-700 dark:text-cyan-300 font-bold">
              {config.baselineRttMs} ms
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={config.baselineRttMs}
            onChange={(e) => setConfig({ ...config, baselineRttMs: Number(e.target.value) })}
            className="w-full accent-cyan-600 cursor-pointer"
          />
        </div>

        {/* Packet Loss */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">Wireless Packet Loss:</span>
            <span
              className={clsx(
                'font-bold',
                config.lossRatePct > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-ink-muted dark:text-ink-darkMuted'
              )}
            >
              {config.lossRatePct}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={config.lossRatePct}
            onChange={(e) => setConfig({ ...config, lossRatePct: Number(e.target.value) })}
            className="w-full accent-rose-600 cursor-pointer"
          />
        </div>

        {/* Router Buffer Size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">Router Buffer Size:</span>
            <span className="text-amber-700 dark:text-amber-300 font-bold">
              {config.bufferCapacity} pkts
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={config.bufferCapacity}
            onChange={(e) => setConfig({ ...config, bufferCapacity: Number(e.target.value) })}
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>
      </div>

      {/* BDP & Bufferbloat Insight Panel */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono shadow-xs">
        <div className="p-3 rounded-lg border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 flex flex-col justify-between">
          <span className="text-ink-muted dark:text-ink-darkMuted text-[10px] uppercase tracking-wider font-semibold">
            Bandwidth-Delay Product (BDP)
          </span>
          <div className="my-1 text-lg font-bold text-cyan-700 dark:text-cyan-300">
            {bdpPackets}{' '}
            <span className="text-xs text-ink-muted dark:text-ink-darkMuted font-normal">
              pkts ({Math.round(bdpBytes / 1024)} KB)
            </span>
          </div>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
            Optimal bytes in-flight to 100% saturate pipe
          </span>
        </div>

        <div className="p-3 rounded-lg border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 flex flex-col justify-between">
          <span className="text-ink-muted dark:text-ink-darkMuted text-[10px] uppercase tracking-wider font-semibold">
            Reno Bufferbloat Added Latency
          </span>
          <div
            className={clsx(
              'my-1 text-lg font-bold',
              renoBloatMs > 20
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-ink-light dark:text-ink-dark'
            )}
          >
            +{renoBloatMs} ms{' '}
            <span className="text-xs text-ink-muted dark:text-ink-darkMuted font-normal">
              (RTT: {config.baselineRttMs + renoBloatMs}ms)
            </span>
          </div>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
            Delay added to interactive traffic by deep queues
          </span>
        </div>

        <div className="p-3 rounded-lg border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 flex flex-col justify-between">
          <span className="text-ink-muted dark:text-ink-darkMuted text-[10px] uppercase tracking-wider font-semibold">
            BBR Bufferbloat Added Latency
          </span>
          <div className="my-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
            +{bbrBloatMs} ms{' '}
            <span className="text-xs text-ink-muted dark:text-ink-darkMuted font-normal">
              (RTT: {config.baselineRttMs + bbrBloatMs}ms)
            </span>
          </div>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
            Paced at bottleneck rate &rarr; empty queue
          </span>
        </div>
      </div>

      {/* Network Topology & Visual Router Buffer */}
      <div className="rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 p-5 bg-grid-pattern shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-semibold">
            Physical Network Pipeline Topology & Bufferbloat Monitor
          </span>
          <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
            1 MSS = 1500 Bytes
          </span>
        </div>

        {/* Animated Network Pipe Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
          {/* Client Node */}
          <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 text-center">
            <Laptop className="w-6 h-6 mx-auto mb-1 text-cyan-600 dark:text-cyan-400" />
            <div className="text-xs font-bold font-mono text-ink-light dark:text-ink-dark">
              CLIENT HOST
            </div>
            <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-1">
              Reno cwnd:{' '}
              <span className="text-cyan-700 dark:text-cyan-300 font-bold">
                {latestPoint.renoCwnd}
              </span>{' '}
              pkts
            </div>
            <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
              Cubic cwnd:{' '}
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                {latestPoint.cubicCwnd || 0}
              </span>{' '}
              pkts
            </div>
            <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
              BBR cwnd:{' '}
              <span className="text-purple-700 dark:text-purple-300 font-bold">
                {latestPoint.bbrCwnd}
              </span>{' '}
              pkts
            </div>
          </div>

          {/* Router Bottleneck & Buffer */}
          <div className="lg:col-span-2 p-4 rounded-xl border border-amber-500/25 dark:border-amber-900/40 bg-amber-500/5 dark:bg-amber-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-700 dark:text-amber-300">
                <Network className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>INTERMEDIATE ROUTER QUEUE</span>
              </div>
              <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
                Capacity: {config.bufferCapacity} pkts
              </span>
            </div>

            {/* Visual Queue Occupancy Slots */}
            <div className="space-y-2">
              {/* Reno Queue Visual */}
              {(activeAlgo === 'all' || activeAlgo === 'reno') && (
                <div>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
                      TCP Reno Queue: {latestPoint.renoQueue} pkts
                    </span>
                    <span
                      className={
                        latestPoint.renoQueue >= config.bufferCapacity
                          ? 'text-rose-600 dark:text-rose-400 animate-pulse font-bold'
                          : 'text-ink-muted'
                      }
                    >
                      {latestPoint.renoQueue >= config.bufferCapacity
                        ? 'BUFFER OVERFLOW!'
                        : `${Math.round((latestPoint.renoQueue / config.bufferCapacity) * 100)}% Full`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-parchment-200 dark:bg-parchment-800 rounded-full border border-parchment-300/70 dark:border-parchment-700 overflow-hidden flex">
                    <div
                      className={clsx(
                        'h-full transition-all duration-300',
                        latestPoint.renoQueue >= config.bufferCapacity
                          ? 'bg-rose-500'
                          : 'bg-cyan-500'
                      )}
                      style={{
                        width: `${Math.min(100, (latestPoint.renoQueue / config.bufferCapacity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Cubic Queue Visual */}
              {(activeAlgo === 'all' || activeAlgo === 'cubic') && (
                <div>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      TCP Cubic Queue: {latestPoint.cubicQueue || 0} pkts
                    </span>
                    <span className="text-ink-muted">
                      {Math.round(((latestPoint.cubicQueue || 0) / config.bufferCapacity) * 100)}%
                      Full
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-parchment-200 dark:bg-parchment-800 rounded-full border border-parchment-300/70 dark:border-parchment-700 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((latestPoint.cubicQueue || 0) / config.bufferCapacity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* BBR Queue Visual */}
              {(activeAlgo === 'all' || activeAlgo === 'bbr') && (
                <div>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-purple-700 dark:text-purple-400 font-semibold">
                      TCP BBR Queue: {latestPoint.bbrQueue} pkts
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      Zero bufferbloat (Paced at BtlBw)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-parchment-200 dark:bg-parchment-800 rounded-full border border-parchment-300/70 dark:border-parchment-700 overflow-hidden flex">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (latestPoint.bbrQueue / config.bufferCapacity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Server Node */}
          <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 text-center">
            <Server className="w-6 h-6 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
            <div className="text-xs font-bold font-mono text-ink-light dark:text-ink-dark">
              DESTINATION SERVER
            </div>
            <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-1">
              Reno:{' '}
              <span className="text-cyan-700 dark:text-cyan-300 font-bold">
                {latestPoint.renoThroughput}
              </span>{' '}
              Mbps
            </div>
            <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
              Cubic:{' '}
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                {latestPoint.cubicThroughput || 0}
              </span>{' '}
              Mbps
            </div>
            <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
              BBR:{' '}
              <span className="text-purple-700 dark:text-purple-300 font-bold">
                {latestPoint.bbrThroughput}
              </span>{' '}
              Mbps
            </div>
          </div>
        </div>

        {/* Live Telemetry Chart */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex bg-parchment-200/50 dark:bg-parchment-950 p-0.5 rounded-xl border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono">
              <button
                onClick={() => {
                  playTick();
                  setChartMetric('cwnd');
                }}
                className={clsx(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                  chartMetric === 'cwnd'
                    ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-2xs'
                    : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
                )}
              >
                cwnd & ssthresh
              </button>
              <button
                onClick={() => {
                  playTick();
                  setChartMetric('throughput');
                }}
                className={clsx(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                  chartMetric === 'throughput'
                    ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-2xs'
                    : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
                )}
              >
                Throughput (Mbps)
              </button>
              <button
                onClick={() => {
                  playTick();
                  setChartMetric('queue');
                }}
                className={clsx(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                  chartMetric === 'queue'
                    ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-2xs'
                    : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
                )}
              >
                Router Queue Depth
              </button>
            </div>

            <div className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
              Elapsed Time: {simState.timeTick} RTTs ({simState.timeTick * config.baselineRttMs} ms)
            </div>
          </div>

          <TcpLiveChart data={simState.history} metric={chartMetric} activeAlgo={activeAlgo} />
        </div>

        {/* Playback bar */}
        <div className="mt-4">
          <SimulationControls
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onStepForward={handleStep}
            onReset={handleReset}
            speed={speed}
            onSpeedChange={setSpeed}
            statusText={isPlaying ? 'SIMULATING TRANSPORT RTT CYCLES' : 'PAUSED'}
            variant="network"
          />
        </div>
      </div>

      {/* Real-Time KPIs & Mathematical Model State */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="TCP Reno (AIMD)"
          value={simState.renoState}
          trend={simState.renoState === 'FAST_RECOVERY' ? 'alert' : 'neutral'}
          change={`cwnd: ${latestPoint.renoCwnd} pkts`}
          variant="cyan"
          description={`ssthresh = ${latestPoint.renoSsthresh} pkts (Losses: ${simState.renoLostPackets})`}
        />
        <MetricCard
          label="TCP Cubic (Linux)"
          value={simState.cubicState}
          trend="up"
          change={`cwnd: ${latestPoint.cubicCwnd || 0} pkts`}
          variant="emerald"
          description={`Polynomial growth W(t) | Wmax=${simState.cubicWmax}`}
        />
        <MetricCard
          label="TCP BBR (Google)"
          value={simState.bbrState}
          trend="up"
          change={`Pacing: ${latestPoint.bbrPacingRate}M`}
          variant="purple"
          description={`BtlBw = ${latestPoint.bbrBtlBw} Mbps | minRTT = ${latestPoint.bbrMinRtt} ms`}
        />
        <MetricCard
          label="BDP Target In-Flight"
          value={bdpPackets}
          unit="pkts"
          trend="neutral"
          variant="zinc"
          description="Physical capacity of the wire"
        />
      </div>

      {/* Telemetry Log & Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalLog
          logs={logs}
          onClear={() => setLogs([])}
          title="TCP STACK CONGESTION & SACK EVENT LOG"
          maxHeight="max-h-56"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-semibold">
              Module Challenges
            </h4>
            <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold">
              Solve by manipulating sliders
            </span>
          </div>

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

      {/* Explanation Drawer */}
      <ExplanationDrawer module={moduleData} />
    </div>
  );
};
