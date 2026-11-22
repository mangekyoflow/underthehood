import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, RotateCcw } from 'lucide-react';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import { ChallengeCard } from '../common/ChallengeCard';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { MODULES } from '../../data/modulesData';
import { SynchronizerType } from '../../types/silicon';
import clsx from 'clsx';

interface ClockDomainCrossingVisualizerProps {
  onChallengeComplete?: (id: string) => void;
  completedChallenges?: Record<string, boolean>;
}

// Convert binary number to Gray code string
function toGrayCode(val: number, bits: number = 4): string {
  const gray = val ^ (val >> 1);
  return gray.toString(2).padStart(bits, '0');
}

export const ClockDomainCrossingVisualizer: React.FC<ClockDomainCrossingVisualizerProps> = ({
  onChallengeComplete,
  completedChallenges = {},
}) => {
  const moduleData = MODULES['pre-silicon-emulation'];

  // Clock Domain Frequencies
  const [clkAFreq, setClkAFreq] = useState<number>(1000); // 1000 MHz (1.0 GHz)
  const [clkBFreq, setClkBFreq] = useState<number>(400); // 400 MHz (0.4 GHz)

  // CDC Architecture
  const [synchronizer, setSynchronizer] = useState<SynchronizerType>('none');
  const [fifoCapacity, setFifoCapacity] = useState<number>(8); // 2, 4, 8, 16

  // Simulation State
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [isMetastable, setIsMetastable] = useState<boolean>(false);
  const [metastableEventsCount, setMetastableEventsCount] = useState<number>(0);
  const [dataCorruptionCount, setDataCorruptionCount] = useState<number>(0);

  // FIFO Circular Buffer State
  const [fifoEntries, setFifoEntries] = useState<number[]>([0xa1, 0xb2, 0xc3]);
  const [writePtr, setWritePtr] = useState<number>(3);
  const [readPtr, setReadPtr] = useState<number>(0);

  // Signal Waveform history
  const [waveClkA, setWaveClkA] = useState<number[]>([]);
  const [waveClkB, setWaveClkB] = useState<number[]>([]);
  const [waveData, setWaveData] = useState<number[]>([]);

  // Burst Transmission
  const [burstActive, setBurstActive] = useState<boolean>(false);

  // Trigger Setup/Hold Hazard
  const handleInjectHazard = () => {
    playAlert();

    if (synchronizer === 'none') {
      setIsMetastable(true);
      setMetastableEventsCount((m) => m + 1);
      setDataCorruptionCount((d) => d + 1);
    } else if (synchronizer === 'two-ff') {
      // 2-FF: First FF is metastable, second resolves!
      setIsMetastable(true);
      setTimeout(() => {
        setIsMetastable(false);
      }, 350);
    } else {
      // Async FIFO completely absorbs hazard
      setIsMetastable(false);
    }
  };

  // Trigger Burst Data
  const handleSendBurst = () => {
    playTick();
    setBurstActive(true);

    const burstWords = [0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80];
    let inserted = 0;

    const burstInterval = setInterval(() => {
      if (inserted < burstWords.length) {
        const val = burstWords[inserted];
        setFifoEntries((prev) => {
          if (prev.length >= fifoCapacity) {
            // FIFO Overflow!
            if (synchronizer === 'none') {
              setDataCorruptionCount((c) => c + 1);
              setIsMetastable(true);
            }
            return prev;
          }
          return [...prev, val];
        });
        setWritePtr((p) => (p + 1) % 16);
        inserted++;
      } else {
        clearInterval(burstInterval);
        setBurstActive(false);

        // Check Challenge 1: Sized async FIFO (depth >= 8) with zero metastability
        if (synchronizer === 'async-fifo' && fifoCapacity >= 8 && dataCorruptionCount === 0) {
          if (onChallengeComplete && !completedChallenges['challenge-cdc-1']) {
            playSuccess();
            onChallengeComplete('challenge-cdc-1');
          }
        }
      }
    }, 120);
  };

  // Read consumer loop for Domain B - pauses when document is hidden
  useEffect(() => {
    const readInterval = setInterval(
      () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        setFifoEntries((prev) => {
          if (prev.length > 0) {
            setReadPtr((r) => (r + 1) % 16);
            return prev.slice(1);
          }
          return prev;
        });
      },
      (1000 / clkBFreq) * 150
    );

    return () => clearInterval(readInterval);
  }, [clkBFreq]);

  // Check Challenge 2: Triggered hazard and mitigated via 2-FF or async-fifo
  useEffect(() => {
    if (metastableEventsCount > 0 && (synchronizer === 'two-ff' || synchronizer === 'async-fifo')) {
      if (onChallengeComplete && !completedChallenges['challenge-cdc-2']) {
        playSuccess();
        onChallengeComplete('challenge-cdc-2');
      }
    }
  }, [metastableEventsCount, synchronizer, onChallengeComplete, completedChallenges]);

  // Waveform clock ticking simulation - paused when moving out of the browser tab
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const startTicking = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        setCycleCount((c) => c + 1);
        setWaveClkA((prev) => [...prev.slice(-40), cycleCount % 2]);
        setWaveClkB((prev) => [...prev.slice(-40), Math.floor(cycleCount / 2.5) % 2]);
        setWaveData((prev) => [
          ...prev.slice(-40),
          isMetastable ? 0.5 : cycleCount % 4 === 0 ? 1 : 0,
        ]);
      }, 80);
    };

    startTicking();

    const handleVisibility = () => {
      if (document.hidden) {
        if (timer) clearInterval(timer);
      } else {
        startTicking();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [cycleCount, isMetastable]);

  // Calculated MTBF (Mean Time Between Failures)
  const getMtbfString = () => {
    if (synchronizer === 'none') {
      return '0.002 seconds (IMMEDIATE CRASH)';
    }
    if (synchronizer === 'two-ff') {
      return '140,000 years (1-bit control safe)';
    }
    return '> 1,000,000 years (Dual-Clock Gray FIFO)';
  };

  const handleReset = () => {
    playTick();
    setFifoEntries([]);
    setWritePtr(0);
    setReadPtr(0);
    setIsMetastable(false);
    setMetastableEventsCount(0);
    setDataCorruptionCount(0);
  };

  return (
    <div className="space-y-6">
      {/* CDC Control & Telemetry Overview */}
      <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                VLSI SILICON TIMING
              </span>
              <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
                CLOCK DOMAIN CROSSING (CDC)
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
              CDC Metastability &amp; Asynchronous FIFO Emulation
            </h3>
            <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-1">
              Cross asynchronous clock boundaries between a 1.0 GHz AI accelerator core and a 400
              MHz memory bus without setup/hold timing violations.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendBurst}
              disabled={burstActive}
              className="btn-pop px-3.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:pointer-events-none"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Send 8-Word Burst</span>
            </button>

            <button
              onClick={handleInjectHazard}
              className="btn-pop px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-mono text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Inject Setup/Hold Hazard</span>
            </button>

            <button
              onClick={handleReset}
              className="btn-pop p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 hover:bg-parchment-100 dark:hover:bg-parchment-700 text-ink-muted transition-all cursor-pointer"
              title="Reset CDC State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Telemetry KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-6">
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Synchronizer Scheme
            </div>
            <div className="text-base font-bold text-ink-light dark:text-ink-dark uppercase mt-0.5">
              {synchronizer === 'none'
                ? 'None (Raw Wire)'
                : synchronizer === 'two-ff'
                  ? '2-FF Synchronizer'
                  : 'Dual-Clock Gray FIFO'}
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">
              {synchronizer === 'none'
                ? 'High Metastability Hazard'
                : synchronizer === 'two-ff'
                  ? '1-Bit Flag Synchronizer'
                  : 'Multi-Bit Bus Safe'}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              FIFO Occupancy
            </div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {fifoEntries.length} / {fifoCapacity} words
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">
              Write: {toGrayCode(writePtr)} | Read: {toGrayCode(readPtr)} (Gray)
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Mean Time To Failure (MTBF)
            </div>
            <div
              className={clsx(
                'text-xs font-bold mt-1 truncate',
                synchronizer === 'none'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {getMtbfString()}
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">λ = Tw · fA · fB · e^(tr/τ)</div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Timing Violations
            </div>
            <div
              className={clsx(
                'text-lg font-bold mt-0.5',
                isMetastable || dataCorruptionCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {dataCorruptionCount} corruptions
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">
              {isMetastable ? '⚠ LATCH METASTABLE' : '● STABLE LOGIC'}
            </div>
          </div>
        </div>

        {/* Interactive Dual Clock Domain Architecture Topology Canvas */}
        <div className="p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950/60 shadow-xs mb-6 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                DUAL-CLOCK DOMAIN CROSSING (CDC) BOUNDARY &amp; METASTABILITY TOPOLOGY
              </span>
            </div>
            {/* Quick Interactive Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-ink-muted">CDC Barrier:</span>
              <button
                onClick={() => {
                  playTick();
                  setSynchronizer('none');
                }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                  synchronizer === 'none'
                    ? 'border-rose-400 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                None (Metastable)
              </button>
              <button
                onClick={() => {
                  playTick();
                  setSynchronizer('two-ff');
                }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                  synchronizer === 'two-ff'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                2-FF Synchronizer
              </button>
              <button
                onClick={() => {
                  playTick();
                  setSynchronizer('async-fifo');
                }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                  synchronizer === 'async-fifo'
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                Dual-Clock Async FIFO
              </button>
              <button
                onClick={handleInjectHazard}
                className="px-2 py-0.5 rounded text-[10px] font-semibold border border-rose-400/50 bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 transition-all cursor-pointer flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-rose-500" />
                <span>Inject Violation</span>
              </button>
            </div>
          </div>

          {/* Continuous SVG CDC Topology Canvas */}
          <div className="w-full bg-slate-900/90 rounded-xl p-3 border border-slate-800 relative select-none diagram-canvas-scroll">
            <svg viewBox="0 0 760 190" className="w-full h-auto drop-shadow-sm">
              <defs>
                <marker
                  id="cdc-arrow-blue"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <marker
                  id="cdc-arrow-purple"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#a855f7" />
                </marker>
                {/* Asynchronous boundary crossing paths */}
                <path id="path-cdc-fast-to-barrier" d="M 195 65 L 245 65" />
                <path id="path-cdc-barrier-to-slow" d="M 505 65 L 555 65" />
                <path id="path-cdc-gray-sync" d="M 505 130 L 555 130" />
              </defs>

              {/* Connecting Lines */}
              <line
                x1="195"
                y1="65"
                x2="245"
                y2="65"
                stroke="#38bdf8"
                strokeWidth="2"
                markerEnd="url(#cdc-arrow-blue)"
              />
              <line
                x1="505"
                y1="65"
                x2="555"
                y2="65"
                stroke={isMetastable ? '#ef4444' : '#a855f7'}
                strokeWidth="2"
                markerEnd="url(#cdc-arrow-purple)"
              />
              <line
                x1="505"
                y1="130"
                x2="555"
                y2="130"
                stroke="#10b981"
                strokeWidth="1.8"
                strokeDasharray="3 3"
              />

              {/* Animated Crossing Packets */}
              <circle r="3.5" fill="#38bdf8">
                <animateMotion dur="1.0s" repeatCount="indefinite">
                  <mpath href="#path-cdc-fast-to-barrier" />
                </animateMotion>
              </circle>
              <circle r="3.5" fill={isMetastable ? '#ef4444' : '#a855f7'}>
                <animateMotion dur={isMetastable ? '0.4s' : '1.8s'} repeatCount="indefinite">
                  <mpath href="#path-cdc-barrier-to-slow" />
                </animateMotion>
              </circle>
              <circle r="2.5" fill="#10b981">
                <animateMotion dur="2.2s" repeatCount="indefinite">
                  <mpath href="#path-cdc-gray-sync" />
                </animateMotion>
              </circle>

              {/* DOMAIN A: Fast Clock (1.0 GHz AI Core) */}
              <g transform="translate(15, 20)">
                <rect
                  width="180"
                  height="150"
                  rx="8"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <rect width="180" height="26" rx="8" fill="#1e293b" />
                <text x="10" y="17" fontSize="10" fontWeight="bold" fill="#38bdf8">
                  DOMAIN A (FAST)
                </text>
                <text x="10" y="42" fontSize="9" fontWeight="bold" fill="#ffffff">
                  AI Accelerator Core
                </text>
                <text x="10" y="56" fontSize="8" fill="#38bdf8">
                  clk_a: {clkAFreq} MHz (T = 1.00 ns)
                </text>

                <line x1="10" y1="68" x2="170" y2="68" stroke="#334155" strokeWidth="1" />

                {/* Transmitter Flip-Flop */}
                <g transform="translate(10, 78)">
                  <rect
                    width="70"
                    height="50"
                    rx="4"
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                  />
                  <text
                    x="35"
                    y="16"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="#38bdf8"
                  >
                    D-FF (Tx)
                  </text>
                  <text
                    x="35"
                    y="32"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#ffffff"
                  >
                    q_src
                  </text>
                  <polygon points="4,42 12,46 4,50" fill="#38bdf8" />
                </g>

                {/* Write Pointer Box */}
                <g transform="translate(90, 78)">
                  <rect
                    width="80"
                    height="50"
                    rx="4"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text x="8" y="14" fontSize="7" fill="#94a3b8">
                    wptr bin: {writePtr}
                  </text>
                  <text x="8" y="27" fontSize="7" fontWeight="bold" fill="#38bdf8">
                    gray: {toGrayCode(writePtr)}
                  </text>
                  <text x="8" y="42" fontSize="7" fill="#10b981">
                    Burst: {burstActive ? 'ACTIVE' : 'IDLE'}
                  </text>
                </g>
              </g>

              {/* CDC BOUNDARY & SYNCHRONIZER ISOLATION BARRIER */}
              <g transform="translate(245, 20)">
                <rect
                  width="260"
                  height="150"
                  rx="8"
                  fill="#0f172a"
                  stroke={
                    isMetastable
                      ? '#ef4444'
                      : synchronizer === 'none'
                        ? '#ef4444'
                        : synchronizer === 'two-ff'
                          ? '#f59e0b'
                          : '#10b981'
                  }
                  strokeWidth={isMetastable ? '2.5' : '1.5'}
                />
                <rect width="260" height="26" rx="8" fill="#1e293b" />
                <text
                  x="10"
                  y="17"
                  fontSize="10"
                  fontWeight="bold"
                  fill={
                    isMetastable
                      ? '#ef4444'
                      : synchronizer === 'none'
                        ? '#ef4444'
                        : synchronizer === 'two-ff'
                          ? '#f59e0b'
                          : '#10b981'
                  }
                >
                  {isMetastable
                    ? '⚠ METASTABILITY HAZARD VIOLATION'
                    : synchronizer === 'none'
                      ? 'DIRECT CDC (NO SYNCHRONIZER)'
                      : synchronizer === 'two-ff'
                        ? '2-FLIP-FLOP SYNCHRONIZER'
                        : 'DUAL-CLOCK ASYNCHRONOUS FIFO'}
                </text>

                {synchronizer === 'none' && (
                  <g transform="translate(10, 42)">
                    <text x="0" y="14" fontSize="8" fill="#ef4444" fontWeight="bold">
                      Direct Asynchronous Wire Crossing
                    </text>
                    <text x="0" y="28" fontSize="8" fill="#94a3b8">
                      Setup/Hold aperture (±0.15ns) unprotected.
                    </text>
                    <g transform="translate(0, 40)">
                      <rect
                        width="240"
                        height="35"
                        rx="4"
                        fill="#ef444420"
                        stroke="#ef4444"
                        strokeWidth="1"
                      />
                      <text x="10" y="15" fontSize="8" fontWeight="bold" fill="#ef4444">
                        {isMetastable
                          ? 'VOLTAGE PINNED AT VDD/2 (UNKNOWN)'
                          : 'High Risk of Latch Corruption'}
                      </text>
                      <text x="10" y="26" fontSize="7" fill="#fca5a5">
                        MTBF &lt; 4 hours under high data rate!
                      </text>
                    </g>
                  </g>
                )}

                {synchronizer === 'two-ff' && (
                  <g transform="translate(10, 38)">
                    <text x="0" y="12" fontSize="8" fill="#f59e0b" fontWeight="bold">
                      Cascaded 2-FF Resolving Pipeline
                    </text>
                    <g transform="translate(10, 24)">
                      {/* FF1 */}
                      <rect
                        width="80"
                        height="48"
                        rx="4"
                        fill="#1e293b"
                        stroke={isMetastable ? '#ef4444' : '#f59e0b'}
                        strokeWidth="1"
                      />
                      <text
                        x="40"
                        y="14"
                        textAnchor="middle"
                        fontSize="7"
                        fontWeight="bold"
                        fill="#f59e0b"
                      >
                        Stage 1 FF
                      </text>
                      <text
                        x="40"
                        y="28"
                        textAnchor="middle"
                        fontSize="8"
                        fill={isMetastable ? '#ef4444' : '#cbd5e1'}
                      >
                        {isMetastable ? 'Metastable!' : 'Settling...'}
                      </text>
                      <text x="40" y="40" textAnchor="middle" fontSize="7" fill="#94a3b8">
                        clk_b
                      </text>

                      {/* Arrow */}
                      <line
                        x1="80"
                        y1="24"
                        x2="110"
                        y2="24"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        markerEnd="url(#cdc-arrow-blue)"
                      />

                      {/* FF2 */}
                      <g transform="translate(110, 0)">
                        <rect
                          width="80"
                          height="48"
                          rx="4"
                          fill="#1e293b"
                          stroke="#10b981"
                          strokeWidth="1"
                        />
                        <text
                          x="40"
                          y="14"
                          textAnchor="middle"
                          fontSize="7"
                          fontWeight="bold"
                          fill="#10b981"
                        >
                          Stage 2 FF
                        </text>
                        <text x="40" y="28" textAnchor="middle" fontSize="8" fill="#10b981">
                          Resolved Q
                        </text>
                        <text x="40" y="40" textAnchor="middle" fontSize="7" fill="#94a3b8">
                          clk_b
                        </text>
                      </g>
                    </g>
                    <text x="0" y="98" fontSize="7" fill="#94a3b8">
                      Allows full clk_b period (2.5ns) for intermediate voltage to resolve.
                    </text>
                  </g>
                )}

                {synchronizer === 'async-fifo' && (
                  <g transform="translate(10, 38)">
                    <text x="0" y="12" fontSize="8" fill="#10b981" fontWeight="bold">
                      Dual-Port SRAM + Gray Pointer Synchronization
                    </text>
                    {/* Visual FIFO buffer mini-strip */}
                    <g transform="translate(5, 22)">
                      {Array.from({ length: 8 }).map((_, idx) => {
                        const hasVal = idx < fifoEntries.length;
                        return (
                          <rect
                            key={idx}
                            x={idx * 28}
                            y="0"
                            width="25"
                            height="34"
                            rx="3"
                            fill={hasVal ? '#3b82f640' : '#1e293b'}
                            stroke={hasVal ? '#38bdf8' : '#475569'}
                            strokeWidth="1"
                          />
                        );
                      })}
                    </g>
                    <text x="0" y="78" fontSize="7" fill="#cbd5e1">
                      Buffer Depth: {fifoCapacity} words | Active Elements: {fifoEntries.length}
                    </text>
                    <text x="0" y="94" fontSize="7" fill="#10b981">
                      ✓ Gray pointers change only 1 bit per cycle: zero bus skew!
                    </text>
                  </g>
                )}
              </g>

              {/* DOMAIN B: Slow Clock (400 MHz LPDDR5 Memory Controller) */}
              <g transform="translate(555, 20)">
                <rect
                  width="190"
                  height="150"
                  rx="8"
                  fill="#0f172a"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                />
                <rect width="190" height="26" rx="8" fill="#1e293b" />
                <text x="10" y="17" fontSize="10" fontWeight="bold" fill="#a855f7">
                  DOMAIN B (SLOW)
                </text>
                <text x="10" y="42" fontSize="9" fontWeight="bold" fill="#ffffff">
                  LPDDR5 Memory Bus
                </text>
                <text x="10" y="56" fontSize="8" fill="#a855f7">
                  clk_b: {clkBFreq} MHz (T = 2.50 ns)
                </text>

                <line x1="10" y1="68" x2="180" y2="68" stroke="#334155" strokeWidth="1" />

                {/* Receiver Flip-Flop */}
                <g transform="translate(10, 78)">
                  <rect
                    width="75"
                    height="50"
                    rx="4"
                    fill="#1e293b"
                    stroke="#a855f7"
                    strokeWidth="1.2"
                  />
                  <text
                    x="37"
                    y="16"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="#a855f7"
                  >
                    D-FF (Rx)
                  </text>
                  <text
                    x="37"
                    y="32"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill={isMetastable ? '#ef4444' : '#10b981'}
                  >
                    q_dest
                  </text>
                  <polygon points="4,42 12,46 4,50" fill="#a855f7" />
                </g>

                {/* Read Pointer Box */}
                <g transform="translate(95, 78)">
                  <rect
                    width="85"
                    height="50"
                    rx="4"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text x="8" y="14" fontSize="7" fill="#94a3b8">
                    rptr bin: {readPtr}
                  </text>
                  <text x="8" y="27" fontSize="7" fontWeight="bold" fill="#a855f7">
                    gray: {toGrayCode(readPtr)}
                  </text>
                  <text
                    x="8"
                    y="42"
                    fontSize="7"
                    fill={dataCorruptionCount > 0 ? '#ef4444' : '#10b981'}
                  >
                    Corrupt: {dataCorruptionCount}
                  </text>
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Dual-Clock Timing Waveform & FIFO Circular Buffer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Timing Oscilloscope Waveform (7 cols) */}
          <div className="lg:col-span-7 p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-[11px] text-ink-muted font-bold">
              <span>ASYNCHRONOUS CLOCK EDGES &amp; SETUP/HOLD APERTURE</span>
              <span className="text-ink-muted">Aperture: ±0.15 ns</span>
            </div>

            {/* Waveform Canvas */}
            <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 space-y-3">
              {/* clk_a Fast Clock */}
              <div>
                <div className="flex justify-between text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-1">
                  <span>clk_a ({clkAFreq} MHz)</span>
                  <span>Domain A</span>
                </div>
                <div className="h-8 flex items-end gap-0.5 sm:gap-1 overflow-hidden">
                  {waveClkA.map((v, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'flex-1 min-w-[3px] max-w-[8px] bg-blue-500 rounded-xs transition-all',
                        v ? 'h-7' : 'h-1'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* clk_b Slow Clock */}
              <div>
                <div className="flex justify-between text-[10px] text-purple-600 dark:text-purple-400 font-bold mb-1">
                  <span>clk_b ({clkBFreq} MHz)</span>
                  <span>Domain B</span>
                </div>
                <div className="h-8 flex items-end gap-0.5 sm:gap-1 overflow-hidden">
                  {waveClkB.map((v, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'flex-1 min-w-[3px] max-w-[8px] bg-purple-500 rounded-xs transition-all',
                        v ? 'h-7' : 'h-1'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Destination Latch Voltage */}
              <div>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className={isMetastable ? 'text-rose-600' : 'text-emerald-600'}>
                    q_dest Latch State ({isMetastable ? 'METASTABLE VDD/2' : 'STABLE LOGIC'})
                  </span>
                  <span className="text-ink-muted">Aperture Window</span>
                </div>
                <div className="h-8 flex items-end gap-0.5 sm:gap-1 overflow-hidden">
                  {waveData.map((v, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'flex-1 min-w-[3px] max-w-[8px] rounded-xs transition-all',
                        v === 0.5
                          ? 'h-4 bg-rose-500 animate-pulse'
                          : v === 1
                            ? 'h-7 bg-emerald-500'
                            : 'h-1 bg-parchment-300 dark:bg-parchment-700'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Asynchronous FIFO Circular Buffer Inspector (5 cols) */}
          <div className="lg:col-span-5 p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-[11px] text-ink-muted font-bold">
              <span>ASYNC FIFO CIRCULAR BUFFER</span>
              <span className="text-blue-600 dark:text-blue-400">Depth: {fifoCapacity}</span>
            </div>

            {/* FIFO Slot Grid */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: fifoCapacity }).map((_, idx) => {
                const hasItem = idx < fifoEntries.length;
                const itemVal = fifoEntries[idx];
                const isWrite = idx === writePtr % fifoCapacity;
                const isRead = idx === readPtr % fifoCapacity;

                return (
                  <div
                    key={idx}
                    className={clsx(
                      'p-2 rounded-xl border flex flex-col items-center justify-center transition-all',
                      hasItem
                        ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                    )}
                  >
                    <div className="text-[10px] text-ink-muted">[{idx}]</div>
                    <div className="text-xs my-1">
                      {hasItem ? `0x${itemVal.toString(16).toUpperCase()}` : '—'}
                    </div>
                    <div className="flex items-center gap-1 text-[8px]">
                      {isWrite && <span className="text-emerald-600 font-bold">W</span>}
                      {isRead && <span className="text-purple-600 font-bold">R</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gray Code Pointer Translation Card */}
            <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 space-y-1.5 text-[11px]">
              <div className="text-[10px] text-ink-muted font-bold uppercase">
                Gray Code Pointer Sync
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">wr_ptr (Bin ➔ Gray):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {writePtr.toString(2).padStart(4, '0')} ➔ {toGrayCode(writePtr)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">rd_ptr (Bin ➔ Gray):</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {readPtr.toString(2).padStart(4, '0')} ➔ {toGrayCode(readPtr)}
                </span>
              </div>
              <div className="text-[10px] text-ink-muted pt-1 border-t border-parchment-100 dark:border-parchment-800">
                Only 1 bit toggles per count: immune to multi-bit bus skew!
              </div>
            </div>
          </div>
        </div>

        {/* Tactile Topology & Tuning Controls */}
        <div className="mt-6 pt-6 border-t border-parchment-200 dark:border-parchment-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Synchronizer Mode Toggle */}
            <div className="font-mono text-xs">
              <label className="text-ink-muted dark:text-ink-darkMuted font-bold block mb-1.5">
                CDC Synchronizer Topology
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    playTick();
                    setSynchronizer('none');
                  }}
                  className={clsx(
                    'p-2 rounded-xl border text-center cursor-pointer transition-all',
                    synchronizer === 'none'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-300 font-bold'
                      : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <div className="text-xs">No Synchronizer</div>
                  <div className="text-[10px] text-ink-muted">Direct wire hazard</div>
                </button>

                <button
                  onClick={() => {
                    playTick();
                    setSynchronizer('two-ff');
                  }}
                  className={clsx(
                    'p-2 rounded-xl border text-center cursor-pointer transition-all',
                    synchronizer === 'two-ff'
                      ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold'
                      : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <div className="text-xs">2-FF Synchronizer</div>
                  <div className="text-[10px] text-ink-muted">1-bit control signals</div>
                </button>

                <button
                  onClick={() => {
                    playTick();
                    setSynchronizer('async-fifo');
                  }}
                  className={clsx(
                    'p-2 rounded-xl border text-center cursor-pointer transition-all',
                    synchronizer === 'async-fifo'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <div className="text-xs">Async Gray FIFO</div>
                  <div className="text-[10px] text-ink-muted">Multi-bit bus safe</div>
                </button>
              </div>
            </div>

            {/* FIFO Capacity Selector */}
            <div className="font-mono text-xs">
              <label className="text-ink-muted dark:text-ink-darkMuted font-bold block mb-1.5">
                Dual-Clock FIFO Depth
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 8, 16].map((depth) => (
                  <button
                    key={depth}
                    onClick={() => {
                      playTick();
                      setFifoCapacity(depth);
                    }}
                    className={clsx(
                      'p-2 rounded-xl border text-center cursor-pointer transition-all',
                      fifoCapacity === depth
                        ? 'border-blue-500 bg-blue-500/15 text-blue-800 dark:text-blue-300 font-bold'
                        : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted'
                    )}
                  >
                    <div className="text-xs">{depth} Words</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clock Domain Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono text-xs pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                  Domain A Frequency (AI Core)
                </label>
                <span className="font-bold text-blue-600 dark:text-blue-400">{clkAFreq} MHz</span>
              </div>
              <input
                type="range"
                min="500"
                max="2000"
                step="50"
                value={clkAFreq}
                onChange={(e) => {
                  playTick();
                  setClkAFreq(Number(e.target.value));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                  Domain B Frequency (Memory Bus)
                </label>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {clkBFreq} MHz
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="800"
                step="25"
                value={clkBFreq}
                onChange={(e) => {
                  playTick();
                  setClkBFreq(Number(e.target.value));
                }}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Challenges Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-bold">
            Interactive Silicon CDC Challenges
          </h4>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            {moduleData.challenges.filter((c) => completedChallenges[c.id]).length} /{' '}
            {moduleData.challenges.length} Solved
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleData.challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              isCompleted={!!completedChallenges[c.id]}
              onComplete={(id) => onChallengeComplete?.(id)}
              accentColor="silicon"
            />
          ))}
        </div>
      </div>

      {/* Architecture Deep Dive & Engineering Principle Drawer */}
      <ExplanationDrawer module={moduleData} />
    </div>
  );
};
