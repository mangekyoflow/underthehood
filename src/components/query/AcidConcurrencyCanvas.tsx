import React from 'react';
import {
  Database,
  Lock,
  Unlock,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  User,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { IsolationLevel, AnomalyScenarioId, DatabaseRow, TransactionStep } from '../../types/query';
import { ScenarioDefinition } from './AcidEngine';
import clsx from 'clsx';

interface AcidConcurrencyCanvasProps {
  scenario: ScenarioDefinition;
  currentStepIdx: number;
  isolationLevel: IsolationLevel;
  concurrencyModel: 'MVCC' | '2PL';
  currentRows: DatabaseRow[];
  anomalyTriggered: boolean;
  activeLockInfo: { rowId: string; mode: string; tx: string } | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onReset: () => void;
  onSelectIsolation: (lvl: IsolationLevel) => void;
  onSelectScenario: (sc: AnomalyScenarioId) => void;
}

export const AcidConcurrencyCanvas: React.FC<AcidConcurrencyCanvasProps> = ({
  scenario,
  currentStepIdx,
  isolationLevel,
  concurrencyModel,
  currentRows,
  anomalyTriggered,
  activeLockInfo,
  isPlaying,
  onTogglePlay,
  onNextStep,
  onPrevStep,
  onReset,
  onSelectIsolation,
  onSelectScenario,
}) => {
  const currentStep = scenario.steps[currentStepIdx] || scenario.steps[0];
  const isSafe = scenario.preventedBy.includes(isolationLevel);
  const isDeadlock = scenario.id === 'deadlock';
  const totalSteps = scenario.steps.length;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-parchment-50/80 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 relative overflow-hidden shadow-inner space-y-4 font-mono text-xs">
      {/* Canvas Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-ink-muted">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
          <span className="font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider">
            CONCURRENT TRANSACTION FLOW &amp; LOCK SCHEDULER
          </span>
          <span
            className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full border font-bold',
              isSafe
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            )}
          >
            {isSafe ? 'ISOLATION SAFE' : 'ANOMALY HAZARD'}
          </span>
        </div>

        {/* Playback & Step Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onPrevStep}
            disabled={currentStepIdx === 0}
            className="px-2.5 py-1 rounded-lg border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-xs font-bold disabled:opacity-30 cursor-pointer shadow-xs"
          >
            Prev
          </button>

          <button
            onClick={onTogglePlay}
            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play Scenario'}</span>
          </button>

          <button
            onClick={onNextStep}
            disabled={currentStepIdx === totalSteps - 1}
            className="px-2.5 py-1 rounded-lg border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-xs font-bold disabled:opacity-30 cursor-pointer shadow-xs"
          >
            Next
          </button>

          <button
            onClick={onReset}
            className="p-1 rounded-lg border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted hover:text-ink-light cursor-pointer shadow-xs"
            title="Reset Scenario"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Concurrency Flow Canvas */}
      <div className="w-full relative flex items-center justify-center py-2">
        <svg
          viewBox="0 0 760 260"
          className="w-full h-auto max-h-[320px] overflow-visible select-none"
        >
          <defs>
            {/* Transmission Paths */}
            {/* T1 -> Database Engine */}
            <path id="pathT1ToDb" d="M 145 90 L 320 90" />

            {/* T2 -> Database Engine */}
            <path id="pathT2ToDb" d="M 615 90 L 440 90" />

            {/* Dirty Read Leak Wire: T1 -> T2 */}
            <path id="pathDirtyLeak" d="M 145 125 C 260 190, 500 190, 615 125" />
          </defs>

          {/* Connected Wires */}
          {/* Wire 1: T1 -> Database */}
          <path
            d="M 145 90 L 320 90"
            fill="none"
            stroke="#a855f7"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            className={clsx(
              'transition-all',
              currentStep.txId === 'T1' ? 'animate-packet-flow opacity-100' : 'opacity-30'
            )}
          />

          {/* Wire 2: T2 -> Database */}
          <path
            d="M 615 90 L 440 90"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            className={clsx(
              'transition-all',
              currentStep.txId === 'T2' ? 'animate-packet-flow opacity-100' : 'opacity-30'
            )}
          />

          {/* Wire 3: Uncommitted Dirty Read Leak (When anomaly occurs) */}
          {anomalyTriggered && (
            <path
              d="M 145 125 C 260 190, 500 190, 615 125"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="animate-packet-flow opacity-90"
            />
          )}

          {/* CONTINUOUS STREAMING ANIMATEMOTION QUERY PACKETS */}
          {currentStep.txId === 'T1' && (
            <g>
              <animateMotion dur="1.8s" repeatCount="indefinite">
                <mpath href="#pathT1ToDb" />
              </animateMotion>
              <rect
                x="-45"
                y="-11"
                width="90"
                height="22"
                rx="11"
                fill="#9333ea"
                className="shadow-md"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="6.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {currentStep.operation} {currentStep.targetRowId || ''}
              </text>
            </g>
          )}

          {currentStep.txId === 'T2' && (
            <g>
              <animateMotion dur="1.8s" repeatCount="indefinite">
                <mpath href="#pathT2ToDb" />
              </animateMotion>
              <rect
                x="-45"
                y="-11"
                width="90"
                height="22"
                rx="11"
                fill="#0891b2"
                className="shadow-md"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="6.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {currentStep.operation} {currentStep.targetRowId || ''}
              </text>
            </g>
          )}

          {/* Dirty Leak Packet */}
          {anomalyTriggered && (
            <g>
              <animateMotion dur="2.2s" repeatCount="indefinite">
                <mpath href="#pathDirtyLeak" />
              </animateMotion>
              <rect
                x="-48"
                y="-11"
                width="96"
                height="22"
                rx="11"
                fill="#ef4444"
                className="shadow-md"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="6.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Dirty Leak ⚠
              </text>
            </g>
          )}

          {/* NODE 1: TRANSACTION 1 CLIENT (x: 25, y: 35) */}
          <g transform="translate(25, 35)">
            <rect
              width="120"
              height="110"
              rx="16"
              fill="currentColor"
              className="text-white dark:text-parchment-950 stroke-purple-500 stroke-1.5 shadow-sm"
            />
            <circle cx="60" cy="28" r="16" fill="#faf5ff" className="dark:fill-purple-950" />
            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" x="50" y="18" />
            <text
              x="60"
              y="56"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
            >
              Transaction 1
            </text>
            <text
              x="60"
              y="68"
              textAnchor="middle"
              className="text-[7.5px] font-mono fill-purple-600 font-semibold"
            >
              Client Session A
            </text>
            <rect
              x="6"
              y="74"
              width="108"
              height="28"
              rx="4"
              fill="#faf5ff"
              className="dark:fill-purple-950/60"
              stroke="#e9d5ff"
              strokeWidth="0.5"
            />
            <text
              x="60"
              y="85"
              textAnchor="middle"
              className="text-[6.5px] font-mono fill-purple-700 dark:fill-purple-300 font-bold truncate"
            >
              {currentStep.txId === 'T1' ? currentStep.queryText.substring(0, 18) : 'Awaiting Turn'}
            </text>
            <text x="60" y="96" textAnchor="middle" className="text-[6px] font-mono fill-ink-muted">
              txid = 201
            </text>
          </g>

          {/* NODE 2: SHARED DATABASE ENGINE & LOCK MANAGER (x: 320, y: 25) */}
          <g transform="translate(320, 25)">
            <rect
              width="120"
              height="150"
              rx="18"
              fill="currentColor"
              className={clsx(
                'text-white dark:text-parchment-950 shadow-md transition-all',
                anomalyTriggered
                  ? 'stroke-rose-500 stroke-2'
                  : isSafe
                    ? 'stroke-emerald-500 stroke-2'
                    : 'stroke-purple-500 stroke-1.5'
              )}
            />
            <circle cx="60" cy="28" r="16" fill="#f8fafc" className="dark:fill-parchment-900" />
            <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" x="50" y="18" />
            <text
              x="60"
              y="54"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
            >
              Database Core
            </text>
            <text x="60" y="64" textAnchor="middle" className="text-[7px] font-mono fill-ink-muted">
              {concurrencyModel === 'MVCC' ? 'MVCC Engine' : 'Strict 2PL Engine'}
            </text>

            {/* Row balances preview */}
            <g transform="translate(8, 70)">
              {currentRows.slice(0, 2).map((row, idx) => (
                <g key={row.id} transform={`translate(0, ${idx * 28})`}>
                  <rect
                    width="104"
                    height="24"
                    rx="4"
                    fill="#f8fafc"
                    className="dark:fill-parchment-900/80"
                    stroke="#cbd5e1"
                    strokeWidth="0.5"
                  />
                  <text
                    x="6"
                    y="11"
                    className="text-[7px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                  >
                    {row.id}: ${row.balance}
                  </text>
                  <text x="6" y="20" className="text-[6px] font-mono fill-ink-muted">
                    {activeLockInfo && activeLockInfo.rowId === row.id
                      ? `🔒 ${activeLockInfo.mode}`
                      : `xmin: ${row.xmin}`}
                  </text>
                </g>
              ))}
            </g>

            {/* Lock / Isolation Status Banner */}
            <rect
              x="8"
              y="128"
              width="104"
              height="16"
              rx="4"
              fill={anomalyTriggered ? '#fef2f2' : isSafe ? '#f0fdf4' : '#faf5ff'}
              className={
                anomalyTriggered
                  ? 'dark:fill-rose-950/60'
                  : isSafe
                    ? 'dark:fill-emerald-950/60'
                    : 'dark:fill-purple-950/60'
              }
              stroke={anomalyTriggered ? '#fca5a5' : isSafe ? '#86efac' : '#d8b4fe'}
              strokeWidth="0.5"
            />
            <text
              x="60"
              y="139"
              textAnchor="middle"
              className={clsx(
                'text-[6.5px] font-mono font-bold',
                anomalyTriggered ? 'fill-rose-600' : isSafe ? 'fill-emerald-600' : 'fill-purple-600'
              )}
            >
              {anomalyTriggered
                ? '✕ ANOMALY DETECTED'
                : isSafe
                  ? '✓ ISOLATION ENFORCED'
                  : isolationLevel}
            </text>
          </g>

          {/* NODE 3: TRANSACTION 2 CLIENT (x: 615, y: 35) */}
          <g transform="translate(615, 35)">
            <rect
              width="120"
              height="110"
              rx="16"
              fill="currentColor"
              className="text-white dark:text-parchment-950 stroke-cyan-500 stroke-1.5 shadow-sm"
            />
            <circle cx="60" cy="28" r="16" fill="#ecfeff" className="dark:fill-cyan-950" />
            <User className="w-5 h-5 text-cyan-600 dark:text-cyan-400" x="50" y="18" />
            <text
              x="60"
              y="56"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
            >
              Transaction 2
            </text>
            <text
              x="60"
              y="68"
              textAnchor="middle"
              className="text-[7.5px] font-mono fill-cyan-600 font-semibold"
            >
              Client Session B
            </text>
            <rect
              x="6"
              y="74"
              width="108"
              height="28"
              rx="4"
              fill="#ecfeff"
              className="dark:fill-cyan-950/60"
              stroke="#bae6fd"
              strokeWidth="0.5"
            />
            <text
              x="60"
              y="85"
              textAnchor="middle"
              className="text-[6.5px] font-mono fill-cyan-700 dark:fill-cyan-300 font-bold truncate"
            >
              {currentStep.txId === 'T2' ? currentStep.queryText.substring(0, 18) : 'Awaiting Turn'}
            </text>
            <text x="60" y="96" textAnchor="middle" className="text-[6px] font-mono fill-ink-muted">
              txid = 202
            </text>
          </g>

          {/* Deadlock Cycle Graph Indicator (if deadlock scenario) */}
          {isDeadlock && currentStepIdx >= 3 && (
            <g transform="translate(260, 190)">
              <rect
                width="240"
                height="55"
                rx="12"
                fill="#fff1f2"
                className="dark:fill-rose-950/50"
                stroke="#f43f5e"
                strokeWidth="1"
              />
              <text
                x="120"
                y="20"
                textAnchor="middle"
                className="text-[8.5px] font-mono font-bold fill-rose-700 dark:fill-rose-300"
              >
                ⚠ DEADLOCK CYCLE: T1 &rarr; Row 2 (T2) &bull; T2 &rarr; Row 1 (T1)
              </text>
              <text
                x="120"
                y="34"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-rose-600"
              >
                Engine terminates T2 to restore Wait-For acyclicity
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Current Step Description Strip */}
      <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Step {currentStepIdx + 1}/{totalSteps}: [{currentStep.txId}] {currentStep.operation}
          </span>
          <code className="text-xs font-bold text-ink-light dark:text-ink-dark">
            {currentStep.queryText}
          </code>
        </div>
        <span className="text-[11px] text-ink-muted dark:text-ink-darkMuted font-sans">
          {currentStep.explanation}
        </span>
      </div>
    </div>
  );
};
