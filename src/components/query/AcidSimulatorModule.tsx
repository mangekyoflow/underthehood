import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Database,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  User,
  HelpCircle,
  Layers,
  ArrowRight,
  GitPullRequest,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { MODULES } from '../../data/modulesData';
import { IsolationLevel, AnomalyScenarioId, DatabaseRow } from '../../types/query';
import { SCENARIOS } from './AcidEngine';
import { AcidConcurrencyCanvas } from './AcidConcurrencyCanvas';
import { SimulationControls } from '../common/SimulationControls';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { ChallengeCard } from '../common/ChallengeCard';
import { TerminalLog, LogEntry } from '../common/TerminalLog';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface AcidSimulatorModuleProps {
  onChallengeComplete: (id: string) => void;
  completedChallenges: Record<string, boolean>;
}

export const AcidSimulatorModule: React.FC<AcidSimulatorModuleProps> = ({
  onChallengeComplete,
  completedChallenges,
}) => {
  const moduleData = MODULES['acid-isolation'];

  // Current Scenario & Isolation
  const [selectedScenarioId, setSelectedScenarioId] = useState<AnomalyScenarioId>('dirty-read');
  const [isolationLevel, setIsolationLevel] = useState<IsolationLevel>('READ_UNCOMMITTED');
  const [concurrencyModel, setConcurrencyModel] = useState<'MVCC' | '2PL'>('MVCC');

  const currentScenario = SCENARIOS[selectedScenarioId];

  // Execution Step State
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Compute live table rows based on executed steps up to currentStepIdx
  const { currentRows, anomalyTriggered, activeLockInfo } = React.useMemo<{
    currentRows: DatabaseRow[];
    anomalyTriggered: boolean;
    activeLockInfo: { rowId: string; mode: string; tx: string } | null;
  }>(() => {
    let rows: DatabaseRow[] = JSON.parse(JSON.stringify(currentScenario.initialRows));
    let anomalyTriggered = false;
    let lockInfo: { rowId: string; mode: string; tx: string } | null = null;

    const executedSteps = currentScenario.steps.slice(0, currentStepIdx + 1);

    executedSteps.forEach((step) => {
      if (step.anomalyWarning) {
        const isPrevented = currentScenario.preventedBy.includes(isolationLevel);
        if (!isPrevented) {
          anomalyTriggered = true;
        }
      }

      if (step.operation === 'UPDATE' && step.targetRowId) {
        const target = rows.find((r) => r.id === step.targetRowId);
        if (target) {
          if (step.newValues?.balance !== undefined) target.balance = step.newValues.balance;
          if (step.newValues?.status !== undefined) target.status = step.newValues.status;
          lockInfo = { rowId: step.targetRowId, mode: 'EXCLUSIVE (X-LOCK)', tx: step.txId };
        }
      } else if (step.operation === 'INSERT' && step.newValues) {
        const isPrevented = currentScenario.preventedBy.includes(isolationLevel);
        if (
          isolationLevel === 'READ_UNCOMMITTED' ||
          isolationLevel === 'READ_COMMITTED' ||
          !isPrevented
        ) {
          if (!rows.some((r) => r.id === step.newValues!.id)) {
            rows.push(step.newValues as DatabaseRow);
          }
        }
      } else if (step.operation === 'ROLLBACK') {
        rows = JSON.parse(JSON.stringify(currentScenario.initialRows));
        lockInfo = null;
      } else if (step.operation === 'COMMIT') {
        lockInfo = null;
      }
    });

    return { currentRows: rows, anomalyTriggered, activeLockInfo: lockInfo };
  }, [currentScenario, currentStepIdx, isolationLevel]);

  // Step change side effects
  useEffect(() => {
    const currentStep = currentScenario.steps[currentStepIdx];
    if (!currentStep) return;

    const timeStr = new Date().toTimeString().split(' ')[0];
    const isPrevented = currentScenario.preventedBy.includes(isolationLevel);

    let logMessage = `[${currentStep.txId}] ${currentStep.queryText} -> ${currentStep.explanation}`;
    let level: 'info' | 'warn' | 'success' | 'error' = 'info';

    if (currentStep.anomalyWarning) {
      if (isPrevented) {
        logMessage += ` [ISOLATION SAFE: ${isolationLevel} prevented this anomaly!]`;
        level = 'success';
      } else {
        logMessage += ` [ALERT: ${currentStep.anomalyWarning}]`;
        level = 'error';
        playAlert();
      }
    }

    setLogs((prev) => [
      ...prev.slice(-30),
      {
        id: `${currentStep.id}-${Date.now()}`,
        timestamp: timeStr,
        level,
        category: currentStep.txId,
        message: logMessage,
      },
    ]);

    // Challenge triggers
    if (
      selectedScenarioId === 'dirty-read' &&
      isolationLevel === 'READ_UNCOMMITTED' &&
      currentStepIdx >= 3
    ) {
      onChallengeComplete('challenge-acid-1');
    }
    if (
      selectedScenarioId === 'non-repeatable-read' &&
      isolationLevel === 'REPEATABLE_READ' &&
      currentStepIdx >= 5
    ) {
      onChallengeComplete('challenge-acid-2');
    }
  }, [currentStepIdx, currentScenario, isolationLevel, selectedScenarioId]);

  // Playback timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isPlaying) {
      const delay = Math.max(200, 1500 / speed);
      timer = setTimeout(() => {
        if (currentStepIdx < currentScenario.steps.length - 1) {
          setCurrentStepIdx((prev) => prev + 1);
          playTick();
        } else {
          setIsPlaying(false);
          playSuccess();
        }
      }, delay);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, currentStepIdx, currentScenario.steps.length, speed]);

  const handleScenarioChange = (id: AnomalyScenarioId) => {
    playTick();
    setSelectedScenarioId(id);
    setCurrentStepIdx(0);
    setIsPlaying(false);
    setLogs([]);
  };

  const handleIsolationChange = (level: IsolationLevel) => {
    playTick();
    setIsolationLevel(level);
    setCurrentStepIdx(0);
    setIsPlaying(false);
  };

  const isCurrentLevelSafe = currentScenario.preventedBy.includes(isolationLevel);
  const isDeadlockScenario = selectedScenarioId === 'deadlock';

  return (
    <div className="space-y-6">
      {/* Title & Scenario Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs backdrop-blur-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple">MODULE 06</Badge>
            <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
              TRANSACTION ISOLATION & CONCURRENCY
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight">
            ACID & Transaction Isolation Simulator
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl font-sans">
            {moduleData.tagline}
          </p>
        </div>

        {/* Anomaly Scenario & Concurrency Model Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-parchment-50 dark:bg-parchment-950 px-3 py-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">Engine:</span>
            <select
              value={concurrencyModel}
              onChange={(e) => {
                playTick();
                setConcurrencyModel(e.target.value as 'MVCC' | '2PL');
              }}
              className="bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-purple-700 dark:text-purple-300 rounded-lg px-2 py-0.5 font-bold focus:outline-none"
            >
              <option value="MVCC">MVCC (PostgreSQL / MySQL)</option>
              <option value="2PL">Strict 2PL (Pessimistic Locking)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-parchment-50 dark:bg-parchment-950 px-3 py-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">Scenario:</span>
            <select
              value={selectedScenarioId}
              onChange={(e) => handleScenarioChange(e.target.value as AnomalyScenarioId)}
              className="bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-purple-700 dark:text-purple-300 rounded-lg px-2 py-0.5 font-bold focus:outline-none focus:border-purple-500"
            >
              {Object.values(SCENARIOS).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Isolation Level Selector Deck */}
      <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted font-semibold">
          ANSI SQL ISOLATION LEVEL:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {(
            [
              'READ_UNCOMMITTED',
              'READ_COMMITTED',
              'REPEATABLE_READ',
              'SERIALIZABLE',
            ] as IsolationLevel[]
          ).map((lvl) => {
            const isSelected = isolationLevel === lvl;
            return (
              <button
                key={lvl}
                onClick={() => handleIsolationChange(lvl)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl border text-center transition-all',
                  isSelected
                    ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-600 text-purple-800 dark:text-purple-200 font-bold shadow-xs'
                    : 'border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 hover:bg-parchment-100 dark:hover:bg-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
                )}
              >
                {lvl.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Concurrent Transaction Flow Canvas with Continuous Motion Packets */}
      <AcidConcurrencyCanvas
        scenario={currentScenario}
        currentStepIdx={currentStepIdx}
        isolationLevel={isolationLevel}
        concurrencyModel={concurrencyModel}
        currentRows={currentRows}
        anomalyTriggered={anomalyTriggered}
        activeLockInfo={activeLockInfo}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onNextStep={() => {
          if (currentStepIdx < currentScenario.steps.length - 1) {
            playTick();
            setCurrentStepIdx((prev) => prev + 1);
          }
        }}
        onPrevStep={() => {
          if (currentStepIdx > 0) {
            playTick();
            setCurrentStepIdx((prev) => prev - 1);
          }
        }}
        onReset={() => {
          playTick();
          setCurrentStepIdx(0);
          setIsPlaying(false);
        }}
        onSelectIsolation={handleIsolationChange}
        onSelectScenario={handleScenarioChange}
      />

      {/* Main Execution Arena: Timeline & Shared Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Shared Database Table & MVCC / Wait-For Graph Inspector */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5 font-bold">
                <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Shared Database Table (`accounts`)
              </span>
              {activeLockInfo && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {activeLockInfo.mode} by {activeLockInfo.tx}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {currentRows.map((row) => (
                <div
                  key={row.id}
                  className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 font-mono text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-ink-light dark:text-ink-dark">{row.name}</span>
                    <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
                      {row.balance !== undefined ? `$${row.balance}` : row.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-muted dark:text-ink-darkMuted pt-1 border-t border-parchment-200 dark:border-parchment-800/80">
                    <span>ID: {row.id}</span>
                    <span>
                      {concurrencyModel === 'MVCC' ? `xmin: ${row.xmin}` : 'Row Lock: Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deadlock Wait-For Graph (if deadlock scenario) */}
          {isDeadlockScenario && currentStepIdx >= 4 && (
            <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 font-mono text-xs space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>WAIT-FOR GRAPH CYCLE DETECTED</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-parchment-950 border border-rose-200 dark:border-rose-900/40 text-center space-y-1 text-[11px]">
                <div className="text-cyan-700 dark:text-cyan-300">
                  Transaction 1 &rarr; waits for Row 2 (held by T2)
                </div>
                <div className="text-rose-600 dark:text-rose-400 font-bold">
                  &darr; DIRECTED CYCLE &uarr;
                </div>
                <div className="text-purple-700 dark:text-purple-300">
                  Transaction 2 &rarr; waits for Row 1 (held by T1)
                </div>
              </div>
              <p className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
                Database engine terminates one transaction with a serialization abort to restore
                lock graph acyclicity.
              </p>
            </div>
          )}

          {/* Anomaly Safety Status Card */}
          <div
            className={clsx(
              'p-4 rounded-2xl border font-mono text-xs space-y-2 shadow-xs',
              isCurrentLevelSafe
                ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                : 'border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'
            )}
          >
            <div className="flex items-center gap-2">
              {isCurrentLevelSafe ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              )}
              <span className="font-bold">
                {isDeadlockScenario
                  ? 'DEADLOCK RESOLUTION'
                  : isCurrentLevelSafe
                    ? 'ANOMALY PREVENTED'
                    : 'ANOMALY PERMITTED'}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
              {isCurrentLevelSafe
                ? currentScenario.explanation.howLevelFixesIt
                : currentScenario.explanation.whyItHappens}
            </p>
          </div>
        </div>

        {/* Right 2 Columns: Side-by-Side Timeline Execution */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/60 dark:bg-parchment-950/60 space-y-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-ink-muted dark:text-ink-darkMuted border-b border-parchment-200 dark:border-parchment-800 pb-2">
            <span>TRANSACTION A (T1) TIMELINE</span>
            <span>TRANSACTION B (T2) TIMELINE</span>
          </div>

          {/* Steps Timeline Grid */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {currentScenario.steps.map((step, idx) => {
              const isCurrent = idx === currentStepIdx;
              const isPast = idx < currentStepIdx;
              const isT1 = step.txId === 'T1';

              return (
                <div
                  key={step.id}
                  className={clsx(
                    'grid grid-cols-2 gap-4 items-center text-xs font-mono transition-all',
                    isCurrent ? 'opacity-100 scale-[1.01]' : isPast ? 'opacity-70' : 'opacity-30'
                  )}
                >
                  {/* T1 Step Column */}
                  {isT1 ? (
                    <div
                      className={clsx(
                        'p-2.5 rounded-xl border flex flex-col gap-1',
                        isCurrent
                          ? 'border-cyan-400 dark:border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/30'
                          : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-light dark:text-ink-dark'
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] text-cyan-700 dark:text-cyan-400 font-bold">
                        <span>
                          STEP {idx + 1}: T1 {step.operation}
                        </span>
                        {isCurrent && <span className="animate-pulse">&bull; ACTIVE</span>}
                      </div>
                      <code className="text-ink-light dark:text-ink-dark text-[11px] font-mono">
                        {step.queryText}
                      </code>
                    </div>
                  ) : (
                    <div className="h-6 border-r border-dashed border-parchment-300 dark:border-parchment-800/80 mr-auto" />
                  )}

                  {/* T2 Step Column */}
                  {!isT1 ? (
                    <div
                      className={clsx(
                        'p-2.5 rounded-xl border flex flex-col gap-1',
                        isCurrent
                          ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/30'
                          : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-light dark:text-ink-dark'
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] text-purple-700 dark:text-purple-400 font-bold">
                        <span>
                          STEP {idx + 1}: T2 {step.operation}
                        </span>
                        {isCurrent && <span className="animate-pulse">&bull; ACTIVE</span>}
                      </div>
                      <code className="text-ink-light dark:text-ink-dark text-[11px] font-mono">
                        {step.queryText}
                      </code>
                    </div>
                  ) : (
                    <div className="h-6 border-l border-dashed border-parchment-300 dark:border-parchment-800/80 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Step Explanation Callout */}
          {currentScenario.steps[currentStepIdx] && (
            <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-ink-muted dark:text-ink-darkMuted text-[10px]">
                <span>EXPLANATION FOR STEP {currentStepIdx + 1}</span>
                <span className="text-purple-700 dark:text-purple-400 font-bold">
                  TRANSACTION {currentScenario.steps[currentStepIdx].txId}
                </span>
              </div>
              <p className="text-ink-light dark:text-ink-dark text-xs font-sans">
                {currentScenario.steps[currentStepIdx].explanation}
              </p>
            </div>
          )}

          {/* Playback bar */}
          <SimulationControls
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onStepForward={() => {
              if (currentStepIdx < currentScenario.steps.length - 1) {
                setCurrentStepIdx((prev) => prev + 1);
              }
            }}
            onStepBackward={() => {
              if (currentStepIdx > 0) {
                setCurrentStepIdx((prev) => prev - 1);
              }
            }}
            onReset={() => {
              setIsPlaying(false);
              setCurrentStepIdx(0);
            }}
            canStepForward={currentStepIdx < currentScenario.steps.length - 1}
            canStepBackward={currentStepIdx > 0}
            speed={speed}
            onSpeedChange={setSpeed}
            currentStep={currentStepIdx + 1}
            totalSteps={currentScenario.steps.length}
            statusText={
              isPlaying
                ? 'EXECUTING STEP SEQUENCE'
                : currentStepIdx === currentScenario.steps.length - 1
                  ? 'TRANSACTION COMPLETED'
                  : 'PAUSED'
            }
            variant="database"
          />
        </div>
      </div>

      {/* Telemetry Log & Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalLog
          logs={logs}
          onClear={() => setLogs([])}
          title="DATABASE ENGINE MVCC & LOCK MANAGER LOG"
          maxHeight="max-h-56"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted">
              Module Challenges
            </h4>
            <span className="text-xs font-mono text-purple-700 dark:text-purple-400">
              Solve by changing isolation levels
            </span>
          </div>

          {moduleData.challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              isCompleted={!!completedChallenges[c.id]}
              onComplete={onChallengeComplete}
              accentColor="database"
            />
          ))}
        </div>
      </div>

      {/* Explanation Drawer */}
      <ExplanationDrawer module={moduleData} />
    </div>
  );
};
