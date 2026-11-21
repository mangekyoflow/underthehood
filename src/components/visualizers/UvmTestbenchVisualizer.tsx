import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cpu,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sliders,
  CheckSquare,
  Layers,
  Terminal,
  ShieldCheck,
  Sparkles,
  Binary,
  BarChart3,
} from 'lucide-react';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import { ChallengeCard } from '../common/ChallengeCard';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { MODULES } from '../../data/modulesData';
import { AluOpcode, UvmTransaction, CoverageBin } from '../../types/silicon';
import clsx from 'clsx';

interface UvmTestbenchVisualizerProps {
  onChallengeComplete?: (id: string) => void;
  completedChallenges?: Record<string, boolean>;
}

const ALL_OPCODES: AluOpcode[] = ['ADD', 'SUB', 'MUL', 'AND', 'OR', 'XOR', 'SHL', 'SHR'];

export const UvmTestbenchVisualizer: React.FC<UvmTestbenchVisualizerProps> = ({
  onChallengeComplete,
  completedChallenges = {},
}) => {
  const moduleData = MODULES['uvm-verification'];

  // Testbench Configuration
  const [stimulusMode, setStimulusMode] = useState<'uniform' | 'constrained'>('uniform');
  const [hasSiliconBug, setHasSiliconBug] = useState<boolean>(true); // Hardware silicon overflow bug in DUT
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [clockCycle, setClockCycle] = useState<number>(0);

  // Active Transaction State
  const [currentTx, setCurrentTx] = useState<UvmTransaction>({
    id: 1,
    cycle: 1,
    op: 'ADD',
    a: 0x00000010,
    b: 0x00000020,
    expectedResult: 0x00000030,
    dutResult: 0x00000030,
    isCornerCase: false,
    hasOverflow: false,
    status: 'PASS',
    assertionDetail: 'ADD 0x10 + 0x20 = 0x30 [ASSERTION MATCH]',
  });

  // History & Scoreboard assertions
  const [transactions, setTransactions] = useState<UvmTransaction[]>([]);
  const [passedCount, setPassedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);

  // Coverage Bins (12 total bins)
  const [coverageBins, setCoverageBins] = useState<CoverageBin[]>([
    // Opcode bins
    {
      id: 'op_add',
      name: 'Opcode: ADD',
      category: 'opcode',
      hits: 1,
      targetHits: 3,
      covered: false,
    },
    {
      id: 'op_sub',
      name: 'Opcode: SUB',
      category: 'opcode',
      hits: 0,
      targetHits: 3,
      covered: false,
    },
    {
      id: 'op_mul',
      name: 'Opcode: MUL',
      category: 'opcode',
      hits: 0,
      targetHits: 3,
      covered: false,
    },
    {
      id: 'op_and',
      name: 'Opcode: AND',
      category: 'opcode',
      hits: 0,
      targetHits: 3,
      covered: false,
    },
    { id: 'op_or', name: 'Opcode: OR', category: 'opcode', hits: 0, targetHits: 3, covered: false },
    {
      id: 'op_xor',
      name: 'Opcode: XOR',
      category: 'opcode',
      hits: 0,
      targetHits: 3,
      covered: false,
    },
    {
      id: 'op_shl',
      name: 'Opcode: SHL',
      category: 'opcode',
      hits: 0,
      targetHits: 3,
      covered: false,
    },
    {
      id: 'op_shr',
      name: 'Opcode: SHR',
      category: 'opcode',
      hits: 0,
      targetHits: 3,
      covered: false,
    },
    // Corner case bins
    {
      id: 'corner_zero',
      name: 'Zero Operand (0x0)',
      category: 'corner',
      hits: 0,
      targetHits: 2,
      covered: false,
    },
    {
      id: 'corner_intmax',
      name: 'Max Signed Pos (0x7FFFFFFF)',
      category: 'corner',
      hits: 0,
      targetHits: 2,
      covered: false,
    },
    {
      id: 'corner_intmin',
      name: 'Min Signed Neg (0x80000000)',
      category: 'corner',
      hits: 0,
      targetHits: 2,
      covered: false,
    },
    {
      id: 'corner_overflow',
      name: 'Signed Overflow Condition',
      category: 'overflow',
      hits: 0,
      targetHits: 2,
      covered: false,
    },
  ]);

  // Golden Software ALU Model (Reference Model)
  const computeGoldenAlu = (op: AluOpcode, a: number, b: number) => {
    let result = 0;
    let overflow = false;

    switch (op) {
      case 'ADD': {
        const sum = (a + b) >>> 0;
        result = sum;
        // Signed 32-bit overflow check:
        const aSign = (a & 0x80000000) !== 0;
        const bSign = (b & 0x80000000) !== 0;
        const rSign = (result & 0x80000000) !== 0;
        overflow = aSign === bSign && aSign !== rSign;
        break;
      }
      case 'SUB': {
        const diff = (a - b) >>> 0;
        result = diff;
        const aSign = (a & 0x80000000) !== 0;
        const bSign = (b & 0x80000000) !== 0;
        const rSign = (result & 0x80000000) !== 0;
        overflow = aSign !== bSign && rSign !== aSign;
        break;
      }
      case 'MUL':
        result = Math.imul(a, b) >>> 0;
        break;
      case 'AND':
        result = (a & b) >>> 0;
        break;
      case 'OR':
        result = (a | b) >>> 0;
        break;
      case 'XOR':
        result = (a ^ b) >>> 0;
        break;
      case 'SHL':
        result = (a << (b & 0x1f)) >>> 0;
        break;
      case 'SHR':
        result = (a >>> (b & 0x1f)) >>> 0;
        break;
    }

    return { result, overflow };
  };

  // Hardware Device Under Test (DUT RTL with optional Silicon Bug)
  const computeDutAlu = (
    op: AluOpcode,
    a: number,
    b: number,
    goldenRes: number,
    isOverflow: boolean
  ) => {
    // If silicon bug is active, ALU miscalculates signed overflow on (0x7FFFFFFF + 0x00000001)
    if (hasSiliconBug && op === 'ADD' && isOverflow && (a === 0x7fffffff || b === 0x7fffffff)) {
      // Hardware Bug: Silicon designer inverted MSB carry output during overflow!
      return (goldenRes ^ 0x000000ff) >>> 0;
    }
    return goldenRes;
  };

  // Step 1 Cycle / 1 Transaction
  const executeCycle = useCallback(() => {
    setClockCycle((c) => c + 1);

    let op: AluOpcode;
    let a: number;
    let b: number;
    let isCorner = false;

    if (stimulusMode === 'uniform') {
      // Uniform random generation
      op = ALL_OPCODES[Math.floor(Math.random() * ALL_OPCODES.length)];
      a = Math.floor(Math.random() * 0x100000000) >>> 0;
      b = Math.floor(Math.random() * 0x100000000) >>> 0;
    } else {
      // Constrained-random with corner-case biasing
      const cornerPool = [
        0x00000000,
        0x7fffffff, // INT_MAX
        0x80000000, // INT_MIN
        0xffffffff, // -1 or UINT_MAX
        0x00000001,
        0x7ffffffe,
      ];

      isCorner = true;
      op = ALL_OPCODES[Math.floor(Math.random() * ALL_OPCODES.length)];

      if (Math.random() < 0.6) {
        // Bias toward edge-case addition that causes signed overflow
        op = 'ADD';
        a = 0x7fffffff;
        b = 0x00000001;
      } else {
        a = cornerPool[Math.floor(Math.random() * cornerPool.length)];
        b = cornerPool[Math.floor(Math.random() * cornerPool.length)];
      }
    }

    const { result: expectedResult, overflow: hasOverflow } = computeGoldenAlu(op, a, b);
    const dutResult = computeDutAlu(op, a, b, expectedResult, hasOverflow);

    const isMatch = dutResult === expectedResult;
    const status = isMatch ? 'PASS' : 'FAIL';

    if (status === 'PASS') {
      setPassedCount((p) => p + 1);
    } else {
      setFailedCount((f) => f + 1);
      playAlert();
    }

    const tx: UvmTransaction = {
      id: Date.now() + Math.random(),
      cycle: clockCycle + 1,
      op,
      a,
      b,
      expectedResult,
      dutResult,
      isCornerCase: isCorner,
      hasOverflow,
      status,
      assertionDetail: isMatch
        ? `${op} [0x${a.toString(16).toUpperCase()} ${b.toString(16).toUpperCase()}] -> 0x${dutResult.toString(16).toUpperCase()} [PASS]`
        : `MISMATCH! Expected: 0x${expectedResult.toString(16).toUpperCase()}, Got DUT: 0x${dutResult.toString(16).toUpperCase()} [ASSERTION ERROR]`,
    };

    setCurrentTx(tx);
    setTransactions((prev) => [tx, ...prev.slice(0, 25)]);

    // Update coverage bins
    setCoverageBins((prev) => {
      return prev.map((bin) => {
        let newHits = bin.hits;

        if (bin.id === `op_${op.toLowerCase()}`) newHits += 1;
        if (bin.id === 'corner_zero' && (a === 0 || b === 0)) newHits += 1;
        if (bin.id === 'corner_intmax' && (a === 0x7fffffff || b === 0x7fffffff)) newHits += 1;
        if (bin.id === 'corner_intmin' && (a === 0x80000000 || b === 0x80000000)) newHits += 1;
        if (bin.id === 'corner_overflow' && hasOverflow) newHits += 1;

        return {
          ...bin,
          hits: newHits,
          covered: newHits >= bin.targetHits,
        };
      });
    });
  }, [clockCycle, stimulusMode, hasSiliconBug]);

  // Evaluate challenges based on coverage and assertions
  const coveredBinsCount = coverageBins.filter((b) => b.covered).length;
  const coveragePct = Math.round((coveredBinsCount / coverageBins.length) * 100);

  useEffect(() => {
    // Challenge 1: Reach 100% coverage and catch the unhandled overflow bug
    if (
      coveragePct === 100 &&
      failedCount > 0 &&
      onChallengeComplete &&
      !completedChallenges['challenge-uvm-1']
    ) {
      playSuccess();
      onChallengeComplete('challenge-uvm-1');
    }

    // Challenge 2: Scoreboard assertion verification with at least 10 transactions
    if (
      transactions.length >= 10 &&
      onChallengeComplete &&
      !completedChallenges['challenge-uvm-2']
    ) {
      onChallengeComplete('challenge-uvm-2');
    }
  }, [coveragePct, failedCount, transactions.length, onChallengeComplete, completedChallenges]);

  // Stop auto-run when user moves out of the browser tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsRunning(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Auto-run interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        executeCycle();
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isRunning, executeCycle]);

  // Reset testbench
  const handleReset = () => {
    playTick();
    setIsRunning(false);
    setClockCycle(0);
    setPassedCount(0);
    setFailedCount(0);
    setTransactions([]);
    setCoverageBins((prev) => prev.map((b) => ({ ...b, hits: 0, covered: false })));
  };

  return (
    <div className="space-y-6">
      {/* Testbench Control & Overview Card */}
      <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                PRE-SILICON VERIFICATION
              </span>
              <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
                UVM &amp; COCOTB TESTBENCH HARNESS
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
              UVM Constrained-Random ALU Verification
            </h3>
            <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-1">
              Step through transaction sequences, drive RTL bus pins, inspect the golden model
              scoreboard, and achieve 100% functional coverage.
            </p>
          </div>

          {/* Stepper & Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playTick();
                setIsRunning(!isRunning);
              }}
              className={clsx(
                'btn-pop px-3.5 py-1.5 rounded-xl border font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs',
                isRunning
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                  : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark hover:bg-parchment-100'
              )}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause Test' : 'Run Auto'}</span>
            </button>

            <button
              onClick={() => {
                playTick();
                executeCycle();
              }}
              className="btn-pop px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Step Single Clock Cycle"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Step Cycle</span>
            </button>

            <button
              onClick={handleReset}
              className="btn-pop p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 hover:bg-parchment-100 dark:hover:bg-parchment-700 text-ink-muted transition-all cursor-pointer"
              title="Reset Testbench"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Telemetry HUD Scorecards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-6">
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Clock Cycle
            </div>
            <div className="text-xl font-bold text-ink-light dark:text-ink-dark mt-0.5">
              #{clockCycle}
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">
              Tx ID: #{currentTx.id.toString().slice(-4)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Functional Coverage
            </div>
            <div
              className={clsx(
                'text-xl font-bold flex items-baseline gap-1 mt-0.5',
                coveragePct === 100
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            >
              <span>{coveragePct}%</span>
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">
              {coveredBinsCount} / {coverageBins.length} cover bins hit
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Scoreboard Passed
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {passedCount}
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">Assertions valid</div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Scoreboard Failed
            </div>
            <div
              className={clsx(
                'text-xl font-bold mt-0.5',
                failedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-ink-muted'
              )}
            >
              {failedCount}
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">
              {hasSiliconBug ? 'Silicon Bug Active' : 'RTL Verified Clean'}
            </div>
          </div>
        </div>

        {/* Interactive UVM Testbench Verification Harness Canvas */}
        <div className="p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950/60 shadow-xs mb-6 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                UVM TESTBENCH HARNESS TOPOLOGY &amp; TEST VECTOR STREAM
              </span>
            </div>
            {/* Quick Interactive Stimulus Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-ink-muted">Stimulus Mode:</span>
              <button
                onClick={() => {
                  playTick();
                  setStimulusMode('uniform');
                }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                  stimulusMode === 'uniform'
                    ? 'border-blue-400 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                Uniform Random
              </button>
              <button
                onClick={() => {
                  playTick();
                  setStimulusMode('constrained');
                }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                  stimulusMode === 'constrained'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                Constrained Corner-Case
              </button>
              <button
                onClick={() => {
                  playTick();
                  setHasSiliconBug(!hasSiliconBug);
                }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1',
                  hasSiliconBug
                    ? 'border-rose-400 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                )}
              >
                <span>{hasSiliconBug ? '● Silicon Bug Armed' : '○ Clean Silicon'}</span>
              </button>
            </div>
          </div>

          {/* Continuous SVG UVM Pipeline Diagram */}
          <div className="w-full bg-slate-900/90 rounded-xl p-3 border border-slate-800 relative overflow-hidden select-none">
            <svg viewBox="0 0 760 180" className="w-full h-auto drop-shadow-sm">
              <defs>
                <marker
                  id="uvm-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker
                  id="uvm-arrow-purple"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#a855f7" />
                </marker>
                <marker
                  id="uvm-arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
                </marker>
                {/* Traversal paths for animateMotion */}
                <path id="path-seq-driver" d="M 145 55 L 175 55" />
                <path id="path-driver-dut" d="M 300 55 L 330 55" />
                <path id="path-dut-monitor" d="M 465 55 L 495 55" />
                <path id="path-monitor-sb" d="M 610 55 L 640 55" />
                <path id="path-golden-check" d="M 145 130 L 640 130" />
              </defs>

              {/* Static Connecting Lines */}
              <line
                x1="145"
                y1="55"
                x2="175"
                y2="55"
                stroke="#64748b"
                strokeWidth="2"
                markerEnd="url(#uvm-arrow)"
              />
              <line
                x1="300"
                y1="55"
                x2="330"
                y2="55"
                stroke="#38bdf8"
                strokeWidth="2"
                markerEnd="url(#uvm-arrow)"
              />
              <line
                x1="465"
                y1="55"
                x2="495"
                y2="55"
                stroke="#a855f7"
                strokeWidth="2"
                markerEnd="url(#uvm-arrow-purple)"
              />
              <line
                x1="610"
                y1="55"
                x2="640"
                y2="55"
                stroke="#10b981"
                strokeWidth="2"
                markerEnd="url(#uvm-arrow-emerald)"
              />
              {/* Reference Golden Model bypass path */}
              <path
                d="M 145 130 L 640 130"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                markerEnd="url(#uvm-arrow)"
              />

              {/* Animated Test Vector Packets */}
              {isRunning && (
                <>
                  <circle r="3" fill="#f59e0b">
                    <animateMotion dur="1.2s" repeatCount="indefinite">
                      <mpath href="#path-seq-driver" />
                    </animateMotion>
                  </circle>
                  <circle r="3" fill="#38bdf8">
                    <animateMotion dur="1.2s" repeatCount="indefinite">
                      <mpath href="#path-driver-dut" />
                    </animateMotion>
                  </circle>
                  <circle r="3" fill="#a855f7">
                    <animateMotion dur="1.2s" repeatCount="indefinite">
                      <mpath href="#path-dut-monitor" />
                    </animateMotion>
                  </circle>
                  <circle r="3" fill="#10b981">
                    <animateMotion dur="1.2s" repeatCount="indefinite">
                      <mpath href="#path-monitor-sb" />
                    </animateMotion>
                  </circle>
                  <circle r="2.5" fill="#f59e0b">
                    <animateMotion dur="2.4s" repeatCount="indefinite">
                      <mpath href="#path-golden-check" />
                    </animateMotion>
                  </circle>
                </>
              )}

              {/* BLOCK 1: uvm_sequence */}
              <g transform="translate(15, 20)">
                <rect
                  width="130"
                  height="140"
                  rx="8"
                  fill="#0f172a"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <rect width="130" height="24" rx="8" fill="#1e293b" />
                <text x="10" y="16" fontSize="9" fontWeight="bold" fill="#f59e0b">
                  1. SEQUENCE
                </text>
                <text x="10" y="38" fontSize="9" fontWeight="bold" fill="#ffffff">
                  uvm_sequence
                </text>
                <text x="10" y="52" fontSize="8" fill="#94a3b8">
                  Mode: {stimulusMode}
                </text>
                <line x1="10" y1="62" x2="120" y2="62" stroke="#334155" strokeWidth="1" />
                <text x="10" y="78" fontSize="8" fill="#cbd5e1">
                  req.op: {currentTx.op}
                </text>
                <text x="10" y="92" fontSize="7" fill="#94a3b8">
                  a: 0x{currentTx.a.toString(16).slice(0, 4)}..
                </text>
                <text x="10" y="104" fontSize="7" fill="#94a3b8">
                  b: 0x{currentTx.b.toString(16).slice(0, 4)}..
                </text>
                <text x="10" y="126" fontSize="7" fill="#f59e0b">
                  TLM: start_item()
                </text>
              </g>

              {/* BLOCK 2: uvm_driver */}
              <g transform="translate(175, 20)">
                <rect
                  width="125"
                  height="140"
                  rx="8"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <rect width="125" height="24" rx="8" fill="#1e293b" />
                <text x="10" y="16" fontSize="9" fontWeight="bold" fill="#38bdf8">
                  2. PIN DRIVER
                </text>
                <text x="10" y="38" fontSize="9" fontWeight="bold" fill="#ffffff">
                  uvm_driver
                </text>
                <text x="10" y="52" fontSize="8" fill="#94a3b8">
                  seq_item_port
                </text>
                <line x1="10" y1="62" x2="115" y2="62" stroke="#334155" strokeWidth="1" />
                <text x="10" y="78" fontSize="8" fill="#38bdf8">
                  alu_op [2:0]
                </text>
                <text x="10" y="92" fontSize="8" fill="#cbd5e1">
                  operand_a [31:0]
                </text>
                <text x="10" y="106" fontSize="8" fill="#cbd5e1">
                  operand_b [31:0]
                </text>
                <text x="10" y="126" fontSize="7" fill="#94a3b8">
                  @(posedge clk)
                </text>
              </g>

              {/* BLOCK 3: DUT ALU (Hardware Silicon RTL) */}
              <g transform="translate(330, 20)">
                <rect
                  width="135"
                  height="140"
                  rx="8"
                  fill="#0f172a"
                  stroke={currentTx.status === 'PASS' ? '#a855f7' : '#ef4444'}
                  strokeWidth={currentTx.status === 'PASS' ? '1.5' : '2'}
                />
                <rect width="135" height="24" rx="8" fill="#1e293b" />
                <text x="10" y="16" fontSize="9" fontWeight="bold" fill="#a855f7">
                  3. HARDWARE DUT
                </text>
                <text x="10" y="38" fontSize="9" fontWeight="bold" fill="#ffffff">
                  32-bit ALU Core
                </text>
                <text x="10" y="52" fontSize="8" fill="#94a3b8">
                  Synthesized Gates
                </text>
                <line x1="10" y1="62" x2="125" y2="62" stroke="#334155" strokeWidth="1" />
                <text x="10" y="78" fontSize="8" fill="#cbd5e1">
                  res: 0x{currentTx.dutResult.toString(16).slice(0, 6)}..
                </text>
                <text
                  x="10"
                  y="92"
                  fontSize="8"
                  fill={currentTx.hasOverflow ? '#f59e0b' : '#94a3b8'}
                >
                  overflow: {currentTx.hasOverflow ? 'TRUE (1)' : 'FALSE (0)'}
                </text>
                <g transform="translate(10, 110)">
                  <rect
                    width="115"
                    height="18"
                    rx="3"
                    fill={hasSiliconBug && currentTx.hasOverflow ? '#ef444440' : '#1e293b'}
                    stroke="#334155"
                    strokeWidth="0.8"
                  />
                  <text
                    x="6"
                    y="12"
                    fontSize="7"
                    fill={hasSiliconBug && currentTx.hasOverflow ? '#ef4444' : '#94a3b8'}
                  >
                    {hasSiliconBug && currentTx.hasOverflow
                      ? '⚠ MSB Inverted Bug!'
                      : 'Clean RTL Execution'}
                  </text>
                </g>
              </g>

              {/* BLOCK 4: uvm_monitor */}
              <g transform="translate(495, 20)">
                <rect
                  width="115"
                  height="140"
                  rx="8"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <rect width="115" height="24" rx="8" fill="#1e293b" />
                <text x="10" y="16" fontSize="9" fontWeight="bold" fill="#38bdf8">
                  4. SNIFFER
                </text>
                <text x="10" y="38" fontSize="9" fontWeight="bold" fill="#ffffff">
                  uvm_monitor
                </text>
                <text x="10" y="52" fontSize="8" fill="#94a3b8">
                  Passive Observer
                </text>
                <line x1="10" y1="62" x2="105" y2="62" stroke="#334155" strokeWidth="1" />
                <text x="10" y="78" fontSize="8" fill="#cbd5e1">
                  Samples bus pins
                </text>
                <text x="10" y="92" fontSize="8" fill="#94a3b8">
                  Zero pin load
                </text>
                <text x="10" y="106" fontSize="8" fill="#cbd5e1">
                  Rebuilds item
                </text>
                <text x="10" y="126" fontSize="7" fill="#38bdf8">
                  analysis_port.write()
                </text>
              </g>

              {/* BLOCK 5: uvm_scoreboard */}
              <g transform="translate(640, 20)">
                <rect
                  width="105"
                  height="140"
                  rx="8"
                  fill="#0f172a"
                  stroke={currentTx.status === 'PASS' ? '#10b981' : '#ef4444'}
                  strokeWidth="2"
                />
                <rect width="105" height="24" rx="8" fill="#1e293b" />
                <text x="8" y="16" fontSize="9" fontWeight="bold" fill="#10b981">
                  5. CHECKER
                </text>
                <text x="8" y="38" fontSize="9" fontWeight="bold" fill="#ffffff">
                  Scoreboard
                </text>
                <text x="8" y="52" fontSize="8" fill="#94a3b8">
                  Golden Model
                </text>
                <line x1="8" y1="62" x2="97" y2="62" stroke="#334155" strokeWidth="1" />
                <text x="8" y="78" fontSize="7" fill="#94a3b8">
                  Exp: 0x{currentTx.expectedResult.toString(16).slice(0, 5)}..
                </text>
                <text x="8" y="92" fontSize="7" fill="#94a3b8">
                  Got: 0x{currentTx.dutResult.toString(16).slice(0, 5)}..
                </text>
                <g transform="translate(8, 108)">
                  <rect
                    width="89"
                    height="22"
                    rx="4"
                    fill={currentTx.status === 'PASS' ? '#10b98120' : '#ef444420'}
                    stroke={currentTx.status === 'PASS' ? '#10b981' : '#ef4444'}
                    strokeWidth="1"
                  />
                  <text
                    x="44"
                    y="14"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill={currentTx.status === 'PASS' ? '#10b981' : '#ef4444'}
                  >
                    {currentTx.status}
                  </text>
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Live Cycle Pin Inspector & Functional Coverage Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Cycle Pin Level Waveform / Bus State (6 cols) */}
          <div className="lg:col-span-6 p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-[11px] text-ink-muted font-bold">
              <span>ACTIVE CYCLE BUS PIN SIGNALS</span>
              <span className="text-emerald-600 dark:text-emerald-400">CLK = 1.0 GHz</span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800">
                <span className="text-ink-muted">alu_op [2:0]</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {currentTx.op}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800">
                <span className="text-ink-muted">operand_a [31:0]</span>
                <span className="font-bold text-ink-light dark:text-ink-dark">
                  0x{currentTx.a.toString(16).padStart(8, '0').toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800">
                <span className="text-ink-muted">operand_b [31:0]</span>
                <span className="font-bold text-ink-light dark:text-ink-dark">
                  0x{currentTx.b.toString(16).padStart(8, '0').toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800">
                <span className="text-ink-muted">dut_result [31:0]</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  0x{currentTx.dutResult.toString(16).padStart(8, '0').toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-ink-muted">golden_ref [31:0]</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  0x{currentTx.expectedResult.toString(16).padStart(8, '0').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Stimulus Mode Toggle Controls */}
            <div className="pt-2">
              <label className="text-[11px] text-ink-muted font-bold block mb-2">
                Stimulus Generator Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    playTick();
                    setStimulusMode('uniform');
                  }}
                  className={clsx(
                    'p-2 rounded-xl border text-left cursor-pointer transition-all',
                    stimulusMode === 'uniform'
                      ? 'border-blue-500 bg-blue-500/15 text-blue-800 dark:text-blue-300 font-bold'
                      : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <div className="text-xs">Uniform Random</div>
                  <div className="text-[10px] text-ink-muted font-normal">
                    Misses edge-case corner bugs
                  </div>
                </button>

                <button
                  onClick={() => {
                    playTick();
                    setStimulusMode('constrained');
                  }}
                  className={clsx(
                    'p-2 rounded-xl border text-left cursor-pointer transition-all',
                    stimulusMode === 'constrained'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <div className="text-xs">Constrained Corner-Cases</div>
                  <div className="text-[10px] text-ink-muted font-normal">
                    Hits 0x7FFFFFFF &amp; overflows
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Functional Coverage Grid (6 cols) */}
          <div className="lg:col-span-6 p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-[11px] text-ink-muted font-bold">
              <span>FUNCTIONAL COVERAGE MATRIX ({coveragePct}%)</span>
              <span className="text-emerald-600 dark:text-emerald-400">12 Coverpoints</span>
            </div>

            {/* Coverage bins grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {coverageBins.map((bin) => (
                <div
                  key={bin.id}
                  className={clsx(
                    'p-2 rounded-xl border transition-all flex flex-col justify-between',
                    bin.covered
                      ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/30'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900'
                  )}
                >
                  <div className="text-[10px] font-bold truncate text-ink-light dark:text-ink-dark">
                    {bin.name}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-parchment-100 dark:border-parchment-800 text-[10px]">
                    <span className="text-ink-muted">
                      {bin.hits} / {bin.targetHits}
                    </span>
                    {bin.covered ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">100%</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">HOLE</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bug Injection Toggle */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-ink-muted font-bold">DUT Silicon Bug Status</span>
              <button
                onClick={() => {
                  playTick();
                  setHasSiliconBug(!hasSiliconBug);
                }}
                className={clsx(
                  'px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                  hasSiliconBug
                    ? 'border-rose-400 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    : 'border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                )}
              >
                {hasSiliconBug ? 'Silicon Bug Present (Overflow Inversion)' : 'Silicon Bug Patched'}
              </button>
            </div>
          </div>
        </div>

        {/* Scoreboard Assertion Failure Log Table */}
        <div className="mt-6 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 font-mono text-[11px]">
          <div className="flex items-center justify-between mb-2 text-[10px] font-bold uppercase text-ink-light dark:text-ink-dark">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-500" />
              Scoreboard Assertion Check Log
            </span>
            <span className="text-ink-muted">{transactions.length} assertions evaluated</span>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {transactions.length === 0 ? (
              <span className="text-ink-muted italic">
                Press "Step Cycle" or "Run Auto" to generate verification transactions...
              </span>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={clsx(
                    'p-1.5 rounded-lg flex items-center justify-between gap-2 border text-[11px]',
                    tx.status === 'PASS'
                      ? 'border-emerald-200/60 dark:border-emerald-900/40 bg-white/70 dark:bg-parchment-900/60 text-ink-light dark:text-ink-dark'
                      : 'border-rose-300 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold'
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {tx.status === 'PASS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )}
                    <span>
                      Cycle #{tx.cycle}: {tx.assertionDetail}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase shrink-0">{tx.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Interactive Challenges Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-bold">
            Interactive DV Challenges
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
