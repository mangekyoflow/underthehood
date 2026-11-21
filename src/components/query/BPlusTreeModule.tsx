import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Search,
  RotateCcw,
  Split,
  Filter,
  HardDrive,
  Compass,
  Calculator,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MODULES } from '../../data/modulesData';
import { BPlusNode } from '../../types/query';
import {
  insertKey,
  deleteKey,
  searchKey,
  executeRangeScan,
  calculateTreeMetrics,
  resetNodeCounter,
} from './BPlusTreeEngine';
import { BPlusTreeVisualizer } from './BPlusTreeVisualizer';
import { BPlusFanoutCalculator } from './BPlusFanoutCalculator';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { ChallengeCard } from '../common/ChallengeCard';
import { TerminalLog, LogEntry } from '../common/TerminalLog';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface BPlusTreeModuleProps {
  onChallengeComplete: (id: string) => void;
  completedChallenges: Record<string, boolean>;
}

const INITIAL_BPLUS_KEYS = [10, 20, 30, 40, 50] as const;

export const BPlusTreeModule: React.FC<BPlusTreeModuleProps> = ({
  onChallengeComplete,
  completedChallenges,
}) => {
  const moduleData = MODULES['bplus-tree'];

  // Tree state
  const [maxCapacity, setMaxCapacity] = useState(3);
  const [root, setRoot] = useState<BPlusNode | null>(null);
  const [showFanoutCalculator, setShowFanoutCalculator] = useState(false);

  // Form inputs
  const [inputKey, setInputKey] = useState('25');
  const [searchTarget, setSearchTarget] = useState('25');
  const [rangeMin, setRangeMin] = useState('20');
  const [rangeMax, setRangeMax] = useState('60');

  // Animation & Highlight states
  const [activePath, setActivePath] = useState<string[]>([]);
  const [activeLeafScanIds, setActiveLeafScanIds] = useState<string[]>([]);
  const [highlightedKey, setHighlightedKey] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (
    category: string,
    message: string,
    level: 'info' | 'warn' | 'success' | 'error' = 'info'
  ) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [
      ...prev.slice(-30),
      {
        id: `bplus-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        level,
        category,
        message,
      },
    ]);
  };

  // Seed initial balanced tree on first mount
  useEffect(() => {
    resetNodeCounter();
    let currentRoot: BPlusNode | null = null;
    INITIAL_BPLUS_KEYS.forEach((k) => {
      const res = insertKey(currentRoot, k, maxCapacity);
      currentRoot = res.newRoot;
    });
    setRoot(currentRoot);
    addLog(
      'TREE-INIT',
      `Initialized B+ tree with keys [${INITIAL_BPLUS_KEYS.join(', ')}]. Fan-out order M = ${maxCapacity}.`,
      'info'
    );
  }, [maxCapacity]);

  // Insert handler
  const handleInsert = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const keyNum = parseInt(inputKey, 10);
    if (isNaN(keyNum)) return;
    playTick();

    const { newRoot, splitOccurred, trace } = insertKey(root, keyNum, maxCapacity);
    setRoot(newRoot);
    setHighlightedKey(keyNum);
    setActivePath([]);
    setActiveLeafScanIds([]);

    trace.forEach((t) => {
      addLog('BPLUS-INSERT', t, splitOccurred ? 'warn' : 'info');
    });

    if (splitOccurred) {
      playAlert();
      onChallengeComplete('challenge-bplus-1');
    }

    setInputKey(String(keyNum + 10));
  };

  // Delete handler with underflow borrowing & merging
  const handleDelete = () => {
    const keyNum = parseInt(inputKey, 10);
    if (isNaN(keyNum) || !root) return;
    playTick();

    const { newRoot, deleted, trace } = deleteKey(root, keyNum, maxCapacity);
    setRoot(newRoot);
    setHighlightedKey(null);
    setActivePath([]);
    setActiveLeafScanIds([]);

    trace.forEach((t) => {
      addLog('BPLUS-DELETE', t, deleted ? 'warn' : 'info');
    });

    if (deleted) {
      playAlert();
    }
  };

  // Search handler
  const handleSearch = () => {
    const target = parseInt(searchTarget, 10);
    if (isNaN(target) || !root) return;
    playTick();

    const { found, path, leafId } = searchKey(root, target);
    setActivePath(path);
    setActiveLeafScanIds(leafId ? [leafId] : []);
    setHighlightedKey(found ? target : null);

    if (found) {
      playSuccess();
      addLog(
        'INDEX-LOOKUP',
        `Point query found key ${target} in leaf ${leafId}. Traversal path: ${path.join(' -> ')}`,
        'success'
      );
    } else {
      addLog(
        'INDEX-LOOKUP',
        `Key ${target} NOT found in B+ Tree. Traversal halted at leaf ${leafId}.`,
        'warn'
      );
    }
  };

  // Range Scan handler
  const handleRangeScan = () => {
    const min = parseInt(rangeMin, 10);
    const max = parseInt(rangeMax, 10);
    if (isNaN(min) || isNaN(max) || !root) return;
    playTick();

    const { keys, traversedLeafIds, trace } = executeRangeScan(root, min, max);
    setActivePath([]);
    setActiveLeafScanIds(traversedLeafIds);
    setHighlightedKey(null);

    trace.forEach((t) => addLog('RANGE-SCAN', t, 'info'));
    addLog(
      'RANGE-SCAN',
      `Range scan [${min} .. ${max}] returned ${keys.length} keys: [${keys.join(', ')}] across ${traversedLeafIds.length} linked leaves.`,
      'success'
    );

    playSuccess();
    onChallengeComplete('challenge-bplus-2');
  };

  // Reset tree
  const handleReset = () => {
    playTick();
    resetNodeCounter();
    setRoot(null);
    setActivePath([]);
    setActiveLeafScanIds([]);
    setHighlightedKey(null);
    setLogs([]);
    addLog('TREE-RESET', 'Tree cleared. Ready for manual key entry.', 'info');
  };

  // Preset Seeder
  const handleLoadPreset = (preset: 'sequential' | 'root-split' | 'large') => {
    playTick();
    resetNodeCounter();
    let r: BPlusNode | null = null;
    let keys: number[] = [];

    if (preset === 'sequential') keys = [10, 20, 30, 40, 50, 60];
    if (preset === 'root-split') keys = [15, 25, 35, 45, 55, 65, 75, 85];
    if (preset === 'large') keys = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];

    keys.forEach((k) => {
      const res = insertKey(r, k, maxCapacity);
      r = res.newRoot;
    });

    setRoot(r);
    setActivePath([]);
    setActiveLeafScanIds([]);
    setHighlightedKey(null);
    addLog('PRESET', `Loaded preset "${preset}" with ${keys.length} keys.`, 'info');
    onChallengeComplete('challenge-bplus-1');
  };

  const metrics = calculateTreeMetrics(root, maxCapacity);

  return (
    <div className="space-y-6">
      {/* Title & Configuration Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs backdrop-blur-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple">MODULE 05</Badge>
            <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
              INDEX STRUCTURES & PAGE SPLITS
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight">
            B+ Tree Node Splitter
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl font-sans">
            {moduleData.tagline}
          </p>
        </div>

        {/* Tree Capacity Selector & Presets */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-parchment-50 dark:bg-parchment-950 px-3 py-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">Node Max Keys (M):</span>
            <select
              value={maxCapacity}
              onChange={(e) => {
                playTick();
                setMaxCapacity(Number(e.target.value));
              }}
              className="bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-purple-700 dark:text-purple-300 rounded-lg px-2 py-0.5 font-bold focus:outline-none"
            >
              <option value={3}>3 Keys (Fast Splits)</option>
              <option value={4}>4 Keys (Balanced)</option>
              <option value={5}>5 Keys (High Fan-out)</option>
            </select>
          </div>

          <button
            onClick={() => handleLoadPreset('root-split')}
            className="px-3 py-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 hover:bg-parchment-100 dark:hover:bg-parchment-800 text-xs font-mono text-purple-700 dark:text-purple-300 transition-colors flex items-center gap-1.5"
          >
            <Split className="w-3.5 h-3.5" />
            <span>Force Root Split</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 hover:bg-parchment-100 dark:hover:bg-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark transition-colors"
            title="Reset Tree"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Insertion, Search & Range Scan Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Insert or Delete Key */}
        <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-ink-light dark:text-ink-dark">
              Insert / Delete Key
            </span>
            <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
              Underflow Merges on Delete
            </span>
          </div>
          <form onSubmit={handleInsert} className="flex gap-2">
            <input
              type="number"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="e.g. 25"
              className="w-full bg-parchment-50 dark:bg-parchment-950 border border-parchment-300 dark:border-parchment-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-ink-light dark:text-ink-dark focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-medium transition-colors flex items-center gap-1 shrink-0 shadow-xs"
              title="Insert Key"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Insert</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 font-mono text-xs transition-colors flex items-center shrink-0"
              title="Delete Key (Triggers borrow or merge on underflow)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Search Point Query */}
        <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-ink-light dark:text-ink-dark">
              Search Point Query
            </span>
            <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
              Root-to-Leaf Traversal
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
              placeholder="Search key..."
              className="w-full bg-parchment-50 dark:bg-parchment-950 border border-parchment-300 dark:border-parchment-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-ink-light dark:text-ink-dark focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="px-3 py-1.5 rounded-xl bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 border border-parchment-300 dark:border-parchment-700 font-mono text-xs text-ink-light dark:text-ink-dark transition-colors flex items-center gap-1 shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Find</span>
            </button>
          </div>
        </div>

        {/* Range Scan Query */}
        <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-ink-light dark:text-ink-dark">
              Sequential Range Scan
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400">
              Follows Leaf Linked List
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={rangeMin}
              onChange={(e) => setRangeMin(e.target.value)}
              placeholder="Min"
              className="w-16 bg-parchment-50 dark:bg-parchment-950 border border-parchment-300 dark:border-parchment-700 rounded-xl px-2 py-1.5 text-xs font-mono text-ink-light dark:text-ink-dark text-center focus:outline-none focus:border-purple-500"
            />
            <span className="text-ink-muted dark:text-ink-darkMuted text-xs font-mono">&rarr;</span>
            <input
              type="number"
              value={rangeMax}
              onChange={(e) => setRangeMax(e.target.value)}
              placeholder="Max"
              className="w-16 bg-parchment-50 dark:bg-parchment-950 border border-parchment-300 dark:border-parchment-700 rounded-xl px-2 py-1.5 text-xs font-mono text-ink-light dark:text-ink-dark text-center focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleRangeScan}
              className="flex-1 py-1.5 rounded-xl bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 border border-parchment-300 dark:border-parchment-700 font-mono text-xs text-ink-light dark:text-ink-dark transition-colors flex items-center justify-center gap-1"
            >
              <Filter className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive B+ Tree Graph Visualizer */}
      <BPlusTreeVisualizer
        root={root}
        activePath={activePath}
        activeLeafScanIds={activeLeafScanIds}
        highlightedKey={highlightedKey}
        maxCapacity={maxCapacity}
      />

      {/* Index Scan vs Table Scan Performance Comparison Card */}
      <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 space-y-1.5">
          <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-bold">
            <Compass className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>B+ Tree Index Scan (WHERE id = 42)</span>
          </div>
          <p className="text-ink-muted dark:text-ink-darkMuted text-[11px] leading-relaxed font-sans">
            Traverses from root down to leaf in exactly{' '}
            <strong className="text-purple-700 dark:text-purple-300 font-mono">
              {metrics.height} page reads
            </strong>
            . In PostgreSQL / InnoDB with 10M rows, height is 3 or 4, taking{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono">~0.2 ms</strong>.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 space-y-1.5">
          <div className="flex items-center gap-2 text-ink-light dark:text-ink-dark font-bold">
            <HardDrive className="w-4 h-4 text-ink-muted dark:text-ink-darkMuted" />
            <span>Sequential Table Scan (Without Index)</span>
          </div>
          <p className="text-ink-muted dark:text-ink-darkMuted text-[11px] leading-relaxed font-sans">
            Must read every page on disk sequentially. For 10M rows (80,000 pages of 8KB), requires
            transferring{' '}
            <strong className="text-amber-700 dark:text-amber-400 font-mono">640 MB</strong> from
            SSD, taking{' '}
            <strong className="text-rose-600 dark:text-rose-400 font-mono">~80-250 ms</strong>.
          </p>
        </div>
      </div>

      {/* Fanout & Depth Calculator Accordion Toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs text-xs font-mono">
        <div className="flex items-center gap-2 text-ink-light dark:text-ink-dark">
          <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="font-bold">InnoDB & PostgreSQL Page Fan-out Estimator</span>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted hidden sm:inline">
            &bull; Compute real disk I/O seeks for 1 Billion rows
          </span>
        </div>
        <button
          onClick={() => {
            playTick();
            setShowFanoutCalculator(!showFanoutCalculator);
          }}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs',
            showFanoutCalculator
              ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-600 text-purple-800 dark:text-purple-200 font-bold'
              : 'bg-parchment-50 dark:bg-parchment-950 border-parchment-200 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark hover:border-parchment-300 dark:hover:border-parchment-700'
          )}
        >
          <span>{showFanoutCalculator ? 'Hide Estimator' : 'Open Fan-out Estimator'}</span>
          {showFanoutCalculator ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {showFanoutCalculator && <BPlusFanoutCalculator />}

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Tree Height (Depth)"
          value={metrics.height}
          unit="Levels"
          trend="neutral"
          variant="purple"
          description="Number of disk reads required per point query"
        />
        <MetricCard
          label="Total Nodes"
          value={metrics.totalNodes}
          unit="Pages"
          change={`${metrics.leafNodes} Leaves, ${metrics.internalNodes} Internal`}
          trend="neutral"
          variant="purple"
          description="Database disk page equivalents"
        />
        <MetricCard
          label="Total Indexed Keys"
          value={metrics.totalKeys}
          unit="Keys"
          trend="up"
          variant="zinc"
          description="Active index entries"
        />
        <MetricCard
          label="Capacity Utilization"
          value={`${metrics.capacityUtilizationPct}%`}
          trend="neutral"
          variant="emerald"
          description="Average node fill factor"
        />
      </div>

      {/* Telemetry Log & Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalLog
          logs={logs}
          onClear={() => setLogs([])}
          title="B+ TREE SPLIT & PAGE ALLOCATOR LOG"
          maxHeight="max-h-56"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted">
              Module Challenges
            </h4>
            <span className="text-xs font-mono text-purple-600 dark:text-purple-400">
              Solve by inserting & scanning
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
