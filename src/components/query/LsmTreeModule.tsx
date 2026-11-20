import React, { useState } from 'react';
import {
  Database,
  HardDrive,
  Layers,
  ArrowDown,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Clock,
  RotateCcw,
  Binary,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MODULES } from '../../data/modulesData';
import {
  LsmState,
  createInitialLsmState,
  insertOrUpdateKey,
  flushMemTable,
  triggerCompaction,
  tracePointLookup,
  ReadPathResult,
  getBloomHashes,
  testBloomFilter,
  BLOOM_SIZE,
} from './LsmEngine';
import { LsmCompactionMatrix } from './LsmCompactionMatrix';
import { LsmPipelineCanvas } from './LsmPipelineCanvas';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { ChallengeCard } from '../common/ChallengeCard';
import { TerminalLog, LogEntry } from '../common/TerminalLog';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface LsmTreeModuleProps {
  onChallengeComplete: (id: string) => void;
  completedChallenges: Record<string, boolean>;
}

export const LsmTreeModule: React.FC<LsmTreeModuleProps> = ({
  onChallengeComplete,
  completedChallenges,
}) => {
  const moduleData = MODULES['lsm-tree'];

  // Storage State
  const [lsmState, setLsmState] = useState<LsmState>(() => createInitialLsmState(4));

  // Interactive inputs
  const [inputKey, setInputKey] = useState('user:101');
  const [inputValue, setInputValue] = useState('{"name":"Alice"}');
  const [searchKey, setSearchKey] = useState('user:101');
  const [bloomProbeKey, setBloomProbeKey] = useState('user:101');
  const [showBloomInspector, setShowBloomInspector] = useState(false);
  const [showCompactionMatrix, setShowCompactionMatrix] = useState(false);
  const [lookupResult, setLookupResult] = useState<ReadPathResult | null>(null);
  const [lastAction, setLastAction] = useState<'write' | 'flush' | 'compact' | 'lookup' | 'idle'>(
    'idle'
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Add Log helper
  const addLog = (
    category: string,
    message: string,
    level: 'info' | 'warn' | 'success' | 'error' = 'info'
  ) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [
      ...prev.slice(-30),
      {
        id: `lsm-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        level,
        category,
        message,
      },
    ]);
  };

  const handleQuickPreset = (
    preset: 'burst_write' | 'tombstone' | 'flush' | 'compact' | 'read_hit' | 'read_miss'
  ) => {
    playTick();
    if (preset === 'burst_write') {
      setLastAction('write');
      let curr = lsmState;
      const baseNum = Math.floor(Math.random() * 800) + 100;
      for (let i = 0; i < 4; i++) {
        const k = `user:${baseNum + i}`;
        const v = `{"name":"User_${baseNum + i}","role":"admin"}`;
        const res = insertOrUpdateKey(curr, k, v, false);
        curr = res.nextState;
        if (res.flushOccurred) {
          addLog(
            'FLUSH-AUTO',
            `MemTable reached capacity! Auto-flushed to L0 as immutable SSTable.`,
            'warn'
          );
          playAlert();
          onChallengeComplete('challenge-lsm-1');
        }
      }
      setLsmState(curr);
      addLog('BURST-WRITE', `Appended 4 sequential records to WAL and MemTable.`, 'success');
    } else if (preset === 'tombstone') {
      setLastAction('write');
      const delKey = 'user:101';
      const res = insertOrUpdateKey(lsmState, delKey, '', true);
      setLsmState(res.nextState);
      addLog(
        'TOMBSTONE',
        `Injected tombstone marker for key "${delKey}". Key is marked deleted without touching disk SSTables yet.`,
        'warn'
      );
      if (res.flushOccurred) onChallengeComplete('challenge-lsm-1');
    } else if (preset === 'flush') {
      handleManualFlush();
      setLastAction('flush');
    } else if (preset === 'compact') {
      handleCompaction();
      setLastAction('compact');
    } else if (preset === 'read_hit') {
      setLastAction('lookup');
      const keyToSearch =
        lsmState.activeMemTable[0]?.key || lsmState.l0Tables[0]?.entries[0]?.key || 'user:101';
      setSearchKey(keyToSearch);
      const result = tracePointLookup(lsmState, keyToSearch);
      setLookupResult(result);
      addLog(
        'READ-PATH',
        `Point query for "${keyToSearch}": ${result.found ? `Found [${result.value}]` : 'Not Found'}.`,
        result.found ? 'success' : 'warn'
      );
    } else if (preset === 'read_miss') {
      setLastAction('lookup');
      const missKey = 'ghost_record_9999';
      setSearchKey(missKey);
      const result = tracePointLookup(lsmState, missKey);
      setLookupResult(result);
      addLog(
        'READ-PATH',
        `Point query for "${missKey}": Definite Negative! Bloom filter bit mismatch prevented unnecessary disk I/O!`,
        'info'
      );
    }
  };

  // Insert handler
  const handleInsert = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputKey.trim()) return;
    playTick();

    const { nextState, flushOccurred, logMessage } = insertOrUpdateKey(
      lsmState,
      inputKey.trim(),
      inputValue.trim(),
      false
    );
    setLsmState(nextState);
    addLog('WRITE-PATH', logMessage, flushOccurred ? 'warn' : 'info');

    if (flushOccurred) {
      playAlert();
      onChallengeComplete('challenge-lsm-1');
    }

    const numMatch = inputKey.match(/\d+/);
    if (numMatch) {
      const nextNum = parseInt(numMatch[0]) + 1;
      setInputKey(inputKey.replace(/\d+/, String(nextNum)));
    }
  };

  // Delete / Tombstone handler
  const handleDelete = () => {
    if (!inputKey.trim()) return;
    playTick();

    const { nextState, flushOccurred, logMessage } = insertOrUpdateKey(
      lsmState,
      inputKey.trim(),
      '',
      true
    );
    setLsmState(nextState);
    addLog('TOMBSTONE', logMessage, 'warn');

    if (flushOccurred) {
      onChallengeComplete('challenge-lsm-1');
    }
  };

  // Manual Flush handler
  const handleManualFlush = () => {
    if (lsmState.activeMemTable.length === 0) return;
    playTick();
    const nextState = flushMemTable(lsmState);
    setLsmState(nextState);
    addLog(
      'FLUSH-WORKER',
      'Manual flush executed. Active MemTable written to disk as immutable L0 SSTable.',
      'info'
    );
    onChallengeComplete('challenge-lsm-1');
  };

  // Compaction handler
  const handleCompaction = () => {
    playTick();
    const { nextState, logMessage } = triggerCompaction(lsmState);
    setLsmState(nextState);
    addLog('COMPACTION', logMessage, 'success');
    playSuccess();
    onChallengeComplete('challenge-lsm-2');
  };

  // Read Path Trace Lookup
  const handleLookup = () => {
    if (!searchKey.trim()) return;
    playTick();
    const result = tracePointLookup(lsmState, searchKey.trim());
    setLookupResult(result);
    addLog(
      'READ-PATH',
      `Point query for "${searchKey}": ${result.found ? `Found [${result.value}]` : result.isTombstone ? 'Deleted (Tombstone)' : 'Not Found'} in ${result.steps.length} checks (Bloom skipped ${result.bloomFilteredCount} tables).`,
      result.found ? 'success' : 'warn'
    );
  };

  // Reset handler
  const handleReset = () => {
    playTick();
    setLsmState(createInitialLsmState(4));
    setLookupResult(null);
    setLogs([]);
  };

  // Bloom hashes for interactive probe
  const probeHashes = getBloomHashes(bloomProbeKey, BLOOM_SIZE);
  // Get active SSTable bloom filter for display (or empty)
  const displayTable = lsmState.l0Tables[0] || lsmState.l1Tables[0] || null;
  const activeBloomBits = displayTable
    ? displayTable.bloomFilterBits
    : new Array(BLOOM_SIZE).fill(0);
  const probeMatch = testBloomFilter(bloomProbeKey, activeBloomBits);

  return (
    <div className="space-y-6">
      {/* Module Title & Configuration Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs backdrop-blur-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple">MODULE 04</Badge>
            <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
              STORAGE ENGINES & LSM ARCHITECTURE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight">
            LSM-Tree Simulator
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl font-sans">
            {moduleData.tagline}
          </p>
        </div>

        {/* Global Storage Actions & Strategy */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-parchment-50 dark:bg-parchment-950 px-3 py-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">Strategy:</span>
            <select
              value={lsmState.compactionStrategy}
              onChange={(e) => {
                playTick();
                setLsmState({
                  ...lsmState,
                  compactionStrategy: e.target.value as 'leveled' | 'size-tiered',
                });
              }}
              className="bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-purple-700 dark:text-purple-300 rounded-lg px-2 py-0.5 font-bold focus:outline-none"
            >
              <option value="leveled">Leveled (RocksDB)</option>
              <option value="size-tiered">Size-Tiered (Cassandra)</option>
            </select>
          </div>

          <button
            onClick={() => setShowBloomInspector(!showBloomInspector)}
            className="px-3 py-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 hover:bg-parchment-100 dark:hover:bg-parchment-800 text-xs font-mono text-ink-light dark:text-ink-dark transition-colors flex items-center gap-1.5"
          >
            <Binary className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Bloom Filter</span>
          </button>

          <button
            onClick={handleManualFlush}
            disabled={lsmState.activeMemTable.length === 0}
            className="px-3 py-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 hover:bg-parchment-100 dark:hover:bg-parchment-800 text-xs font-mono text-ink-light dark:text-ink-dark disabled:opacity-40 transition-colors flex items-center gap-1.5"
            title="Flush in-memory MemTable to disk immediately"
          >
            <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Flush to L0</span>
          </button>

          <button
            onClick={handleCompaction}
            disabled={lsmState.l0Tables.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-medium disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-xs"
            title="Merge L0 SSTables into L1, resolve duplicate versions, and eliminate tombstones"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Trigger Compaction</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 hover:bg-parchment-100 dark:hover:bg-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark transition-colors"
            title="Reset Storage State"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Bloom Filter Inspector (Collapsible) */}
      {showBloomInspector && (
        <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center justify-between text-ink-muted dark:text-ink-darkMuted border-b border-parchment-200 dark:border-parchment-800 pb-2">
            <div className="flex items-center gap-2">
              <Binary className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="font-bold text-ink-light dark:text-ink-dark">
                PROBABILISTIC BLOOM FILTER BIT-ARRAY SIMULATOR
              </span>
            </div>
            <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
              3 Hash Functions: h1(k*31), h2(k*37), h3(k*41) % 32
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-1.5">
              <label className="text-[10px] text-ink-muted dark:text-ink-darkMuted block">
                Probe Key to Test Filter:
              </label>
              <input
                type="text"
                value={bloomProbeKey}
                onChange={(e) => setBloomProbeKey(e.target.value)}
                placeholder="Probe key..."
                className="w-full bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 rounded-xl px-2.5 py-1 text-xs text-ink-light dark:text-ink-dark focus:outline-none focus:border-cyan-500"
              />
              <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
                Hashes &rarr; bits:{' '}
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                  [{probeHashes.join(', ')}]
                </span>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="flex justify-between text-[10px] text-ink-muted dark:text-ink-darkMuted">
                <span>
                  Active 32-Bit Filter Array (
                  {displayTable ? displayTable.id : 'No SSTable on disk yet'}):
                </span>
                <span
                  className={clsx(
                    'font-bold',
                    probeMatch
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {probeMatch
                    ? 'Possible Match (Proceed to Disk)'
                    : 'Definite Negative (Skip Disk Read!)'}
                </span>
              </div>

              {/* 32-bit slot grid */}
              <div className="grid grid-cols-16 gap-1">
                {activeBloomBits.map((bit, idx) => {
                  const isHashed = probeHashes.includes(idx);
                  return (
                    <div
                      key={idx}
                      className={clsx(
                        'p-1 text-center rounded text-[9px] font-bold border transition-all',
                        isHashed && bit === 1
                          ? 'bg-cyan-500 text-white dark:text-black border-cyan-400 shadow-xs'
                          : isHashed && bit === 0
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            : bit === 1
                              ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/60'
                              : 'bg-white dark:bg-parchment-900 text-ink-muted dark:text-ink-darkMuted border-parchment-200 dark:border-parchment-800'
                      )}
                      title={`Bit ${idx}: ${bit} ${isHashed ? '(Probed)' : ''}`}
                    >
                      {bit}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Interactive LSM Pipeline SVG Canvas with Continuous Packet Flows */}
      <LsmPipelineCanvas
        lsmState={lsmState}
        lastAction={lastAction}
        lookupResult={lookupResult}
        onQuickPreset={handleQuickPreset}
      />

      {/* Interactive Write Deck & Point Lookup Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Write / Update / Delete Card */}
        <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted">
              Client Write Path (WAL & MemTable)
            </span>
            <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800/60">
              MemTable Threshold: {lsmState.memTableThreshold} Keys
            </span>
          </div>

          <form onSubmit={handleInsert} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <label className="text-ink-muted dark:text-ink-darkMuted text-[10px] block mb-1">
                  Key:
                </label>
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="e.g. user:101"
                  className="w-full bg-parchment-50 dark:bg-parchment-950 border border-parchment-300 dark:border-parchment-700 rounded-xl px-2.5 py-1.5 text-ink-light dark:text-ink-dark focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-ink-muted dark:text-ink-darkMuted text-[10px] block mb-1">
                  Value Payload:
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder='e.g. {"name":"Bob"}'
                  className="w-full bg-parchment-50 dark:bg-parchment-950 border border-parchment-300 dark:border-parchment-700 rounded-xl px-2.5 py-1.5 text-ink-light dark:text-ink-dark focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Put Key-Value</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 font-mono text-xs transition-colors flex items-center gap-1"
                title="Inserts a Tombstone record marking key as deleted"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete (Tombstone)</span>
              </button>
            </div>
          </form>
        </div>

        {/* Read Path / Point Lookup Card */}
        <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted">
              Read Path Visualizer (Point Lookup)
            </span>
            <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
              Checks MemTable &rarr; Bloom Filters &rarr; L0/L1/L2
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Search key..."
              className="flex-1 bg-parchment-50 dark:bg-parchment-950 border border-parchment-300 dark:border-parchment-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-ink-light dark:text-ink-dark focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleLookup}
              className="px-3.5 py-1.5 rounded-xl bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 border border-parchment-300 dark:border-parchment-700 text-xs font-mono text-ink-light dark:text-ink-dark transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Trace Read</span>
            </button>
          </div>

          {/* Lookup Result Trace Display */}
          {lookupResult && (
            <div className="p-3 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted dark:text-ink-darkMuted">Status:</span>
                <span
                  className={clsx(
                    'font-bold',
                    lookupResult.found
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : lookupResult.isTombstone
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  {lookupResult.found
                    ? 'FOUND LIVE RECORD'
                    : lookupResult.isTombstone
                      ? 'KEY DELETED (TOMBSTONE)'
                      : 'NOT FOUND'}
                </span>
              </div>
              {lookupResult.found && (
                <div className="text-ink-light dark:text-ink-dark truncate">
                  Value:{' '}
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                    {lookupResult.value}
                  </span>{' '}
                  (v{lookupResult.version})
                </div>
              )}
              <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted flex flex-wrap items-center gap-1 pt-1">
                <span>Inspected:</span>
                {lookupResult.steps.map((s, idx) => (
                  <span
                    key={idx}
                    className={clsx(
                      'px-1.5 py-0.5 rounded border',
                      s.result === 'HIT'
                        ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : s.result === 'BLOOM_NEGATIVE'
                          ? 'bg-cyan-50 dark:bg-cyan-950 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300'
                          : 'bg-white dark:bg-parchment-900 border-parchment-200 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted'
                    )}
                  >
                    {s.target} [{s.result}]
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Storage Architecture Diagram Canvas */}
      <div className="rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/60 dark:bg-parchment-950/60 p-5 space-y-5 shadow-xs">
        {/* Row 1: IN-MEMORY LAYER (WAL & Active MemTable) */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span className="font-semibold text-ink-light dark:text-ink-dark">
              IN-MEMORY LAYER (RAM) & DURABILITY WAL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Write-Ahead Log (WAL) */}
            <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Write-Ahead Log (WAL)
                </span>
                <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
                  Sequential Append on Disk
                </span>
              </div>
              <div className="h-28 overflow-y-auto space-y-1 font-mono text-xs">
                {lsmState.wal.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-ink-muted dark:text-ink-darkMuted text-xs italic">
                    WAL truncated (data persisted in SSTables)
                  </div>
                ) : (
                  lsmState.wal.map((e, idx) => (
                    <div
                      key={idx}
                      className="p-1 px-2 rounded-lg bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800/80 flex items-center justify-between text-[11px]"
                    >
                      <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
                        {e.key}
                      </span>
                      <span
                        className={
                          e.isTombstone
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-ink-light dark:text-ink-dark truncate max-w-[140px]'
                        }
                      >
                        {e.isTombstone ? '🗑️ DELETED' : e.value}
                      </span>
                      <span className="text-[9px] text-ink-muted dark:text-ink-darkMuted">
                        v{e.version}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active MemTable */}
            <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Active MemTable (SkipList)
                </span>
                <span className="text-[10px] text-purple-700 dark:text-purple-400">
                  {lsmState.activeMemTable.length} / {lsmState.memTableThreshold} Keys
                </span>
              </div>
              <div className="h-28 overflow-y-auto space-y-1 font-mono text-xs">
                {lsmState.activeMemTable.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-ink-muted dark:text-ink-darkMuted text-xs italic">
                    MemTable empty. Insert keys to begin.
                  </div>
                ) : (
                  lsmState.activeMemTable.map((e, idx) => (
                    <div
                      key={idx}
                      className="p-1 px-2 rounded-lg bg-white dark:bg-parchment-900 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between text-[11px]"
                    >
                      <span className="text-purple-700 dark:text-purple-300 font-semibold">
                        {e.key}
                      </span>
                      <span
                        className={
                          e.isTombstone
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-ink-light dark:text-ink-dark truncate max-w-[140px]'
                        }
                      >
                        {e.isTombstone ? '🗑️ TOMBSTONE' : e.value}
                      </span>
                      <span className="text-[9px] text-ink-muted dark:text-ink-darkMuted">
                        v{e.version}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: DISK PERSISTED SSTABLES (L0, L1, L2) */}
        <div>
          <div className="flex items-center justify-between mb-2 text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="font-semibold text-ink-light dark:text-ink-dark">
                ON-DISK SSTABLES & COMPACTED RUNS
              </span>
            </div>
            <span className="text-ink-muted dark:text-ink-darkMuted">
              Total Disk: {lsmState.metrics.diskSizeBytes} Bytes
            </span>
          </div>

          {/* Level 0: Overlapping Keys */}
          <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-light dark:text-ink-dark">
                  LEVEL 0 (L0)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                  Overlapping Key Ranges
                </span>
              </div>
              <span className="text-xs text-ink-muted dark:text-ink-darkMuted">
                {lsmState.l0Tables.length} SSTables
              </span>
            </div>

            {lsmState.l0Tables.length === 0 ? (
              <div className="py-4 text-center font-mono text-xs text-ink-muted dark:text-ink-darkMuted italic">
                No L0 SSTables yet. Fill MemTable to trigger flush.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {lsmState.l0Tables.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 font-mono text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-[10px] text-ink-muted dark:text-ink-darkMuted border-b border-parchment-200 dark:border-parchment-800 pb-1">
                      <span className="text-purple-700 dark:text-purple-400 font-semibold">
                        {t.id}
                      </span>
                      <span>
                        Range: [{t.minKey} .. {t.maxKey}]
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-20 overflow-y-auto">
                      {t.entries.map((e, idx) => (
                        <div key={idx} className="flex justify-between text-[10px]">
                          <span className="text-ink-light dark:text-ink-dark">{e.key}</span>
                          <span
                            className={
                              e.isTombstone
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-ink-muted dark:text-ink-darkMuted truncate max-w-[80px]'
                            }
                          >
                            {e.isTombstone ? '🗑️' : e.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Level 1 & Level 2: Compacted Non-Overlapping Runs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Level 1 */}
            <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-ink-light dark:text-ink-dark">
                  LEVEL 1 (L1) - Compacted Run
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Non-Overlapping
                </span>
              </div>
              {lsmState.l1Tables.length === 0 ? (
                <div className="py-4 text-center font-mono text-xs text-ink-muted dark:text-ink-darkMuted italic">
                  Empty. Click "Trigger Compaction" to merge L0 &rarr; L1.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {lsmState.l1Tables.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-[11px] font-mono flex items-center justify-between"
                    >
                      <span className="text-purple-700 dark:text-purple-300 font-semibold">
                        {t.id}
                      </span>
                      <span className="text-ink-muted dark:text-ink-darkMuted">
                        Range: [{t.minKey} .. {t.maxKey}]
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {t.entries.length} Keys
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Level 2 */}
            <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-ink-light dark:text-ink-dark">
                  LEVEL 2 (L2) - Deep Storage
                </span>
                <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
                  High Capacity Run
                </span>
              </div>
              {lsmState.l2Tables.length === 0 ? (
                <div className="py-4 text-center font-mono text-xs text-ink-muted dark:text-ink-darkMuted italic">
                  Empty. Compacting full L1 tables will promote runs to L2.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {lsmState.l2Tables.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-[11px] font-mono flex items-center justify-between"
                    >
                      <span className="text-purple-700 dark:text-purple-300 font-semibold">
                        {t.id}
                      </span>
                      <span className="text-ink-muted dark:text-ink-darkMuted">
                        Range: [{t.minKey} .. {t.maxKey}]
                      </span>
                      <span className="text-[10px] text-ink-light dark:text-ink-dark">
                        {t.entries.length} Keys
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compaction Strategy & Amplification Matrix Accordion Toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs text-xs font-mono">
        <div className="flex items-center gap-2 text-ink-light dark:text-ink-dark">
          <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="font-bold">LSM Compaction Policies & SSD Flash Wear Matrix</span>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted hidden sm:inline">
            &bull; Compare Leveled (RocksDB) vs Size-Tiered (Cassandra)
          </span>
        </div>
        <button
          onClick={() => {
            playTick();
            setShowCompactionMatrix(!showCompactionMatrix);
          }}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs',
            showCompactionMatrix
              ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-600 text-purple-800 dark:text-purple-200 font-bold'
              : 'bg-parchment-50 dark:bg-parchment-950 border-parchment-200 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark hover:border-parchment-300 dark:hover:border-parchment-700'
          )}
        >
          <span>{showCompactionMatrix ? 'Hide Matrix' : 'Open Compaction Matrix'}</span>
          {showCompactionMatrix ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {showCompactionMatrix && <LsmCompactionMatrix />}

      {/* LSM Performance Metrics & Amplification Factors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Write Amplification"
          value={lsmState.metrics.writeAmplification}
          unit="x"
          trend="neutral"
          variant="purple"
          description="Bytes written to disk / bytes in user writes"
        />
        <MetricCard
          label="Read Amplification"
          value={lsmState.metrics.readAmplification}
          unit="SSTables"
          trend="neutral"
          variant="purple"
          description="SSTables checked per point query"
        />
        <MetricCard
          label="Space Amplification"
          value={lsmState.metrics.spaceAmplification}
          unit="x"
          trend="neutral"
          variant="zinc"
          description="Disk footprint including dead versions"
        />
        <MetricCard
          label="Live Records"
          value={lsmState.metrics.liveRecordsCount}
          unit="Keys"
          trend="up"
          variant="emerald"
          description={`Tombstones awaiting compaction: ${lsmState.metrics.tombstoneCount}`}
        />
      </div>

      {/* Telemetry Log & Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalLog
          logs={logs}
          onClear={() => setLogs([])}
          title="STORAGE ENGINE WAL & COMPACTION LOG"
          maxHeight="max-h-56"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted">
              Module Challenges
            </h4>
            <span className="text-xs font-mono text-purple-600 dark:text-purple-400">
              Solve by inserting & compacting
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
