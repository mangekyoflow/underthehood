import React, { useState } from 'react';
import { Database, Info } from 'lucide-react';
import { playTick } from '../../lib/sound';
import clsx from 'clsx';

// Multipliers based on production RocksDB / Cassandra benchmarks
const LSM_COMPACTION_CONFIGS = {
  leveled: {
    name: 'Leveled Compaction Strategy (LCS)',
    engine: 'RocksDB / LevelDB Default',
    writeAmp: 15,
    readAmp: 3,
    spaceAmp: 1.15,
    bestFor: 'Read-heavy or balanced read/write workloads with tight disk budgets.',
    pros: 'Predictable point read performance and minimal disk space overhead.',
    cons: 'High write amplification causes accelerated NVMe SSD flash wear.',
    badgeVariant: 'cyan' as const,
  },
  'size-tiered': {
    name: 'Size-Tiered Compaction Strategy (STCS)',
    engine: 'Apache Cassandra / ScyllaDB Default',
    writeAmp: 4,
    readAmp: 12,
    spaceAmp: 1.8,
    bestFor: 'Write-heavy workloads, append-only logs, and message queues.',
    pros: 'Low write amplification and high sustained ingestion throughput.',
    cons: 'High space amplification; requires keeping 50% free disk space to avoid out-of-disk crashes.',
    badgeVariant: 'amber' as const,
  },
  'time-window': {
    name: 'Time-Window Compaction Strategy (TWCS)',
    engine: 'Cassandra / RocksDB Universal for Time-Series',
    writeAmp: 2,
    readAmp: 4,
    spaceAmp: 1.2,
    bestFor: 'Time-series metrics, telemetry logs with TTL expiration.',
    pros: 'Entire old SSTables are dropped cleanly when TTL expires with 0 write amplification.',
    cons: 'Out-of-order writes severely degrade read performance.',
    badgeVariant: 'purple' as const,
  },
} as const;

export const LsmCompactionMatrix: React.FC = () => {
  const [dailyWriteGb, setDailyWriteGb] = useState<number>(200);
  const [strategy, setStrategy] = useState<'leveled' | 'size-tiered' | 'time-window'>('leveled');

  const current = LSM_COMPACTION_CONFIGS[strategy];

  // Daily and yearly SSD flash wear calculations
  const dailyDiskWritesGb = dailyWriteGb * current.writeAmp;
  const yearlyDiskWritesTb = ((dailyDiskWritesGb * 365) / 1024).toFixed(1);
  const threeYearWritesTb = ((dailyDiskWritesGb * 365 * 3) / 1024).toFixed(1);

  return (
    <div className="rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 p-4 font-mono text-xs space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-parchment-200 dark:border-parchment-800">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider text-[11px]">
            Compaction Strategy & Amplification Matrix
          </span>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted bg-parchment-200/70 dark:bg-parchment-800 px-1.5 py-0.5 rounded border border-parchment-300 dark:border-parchment-700">
            Write Amp vs Read Amp vs Space Amp
          </span>
        </div>
        <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted font-sans">
          Comparing RocksDB, Cassandra, and ScyllaDB policies
        </div>
      </div>

      {/* Strategy Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(['leveled', 'size-tiered', 'time-window'] as const).map((key) => {
          const item = LSM_COMPACTION_CONFIGS[key];
          const isSelected = strategy === key;
          return (
            <button
              key={key}
              onClick={() => {
                playTick();
                setStrategy(key);
              }}
              className={clsx(
                'p-3 rounded-xl border text-left transition-all cursor-pointer',
                isSelected
                  ? 'border-purple-500 bg-white dark:bg-parchment-900 text-ink-light dark:text-ink-dark shadow-xs ring-1 ring-purple-500/30'
                  : 'border-parchment-200 dark:border-parchment-800 bg-white/60 dark:bg-parchment-900/40 text-ink-muted dark:text-ink-darkMuted hover:border-parchment-300 dark:hover:border-parchment-700 hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <div className="font-serif font-bold text-sm text-ink-light dark:text-ink-dark">
                {item.name.split(' ')[0]} Compaction
              </div>
              <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted mt-0.5">
                {item.engine}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[9px] font-mono">
                <span className="text-purple-700 dark:text-purple-300 font-semibold">
                  WA: ~{item.writeAmp}x
                </span>
                <span className="text-ink-muted">&bull;</span>
                <span className="text-cyan-700 dark:text-cyan-300 font-semibold">
                  RA: ~{item.readAmp}x
                </span>
                <span className="text-ink-muted">&bull;</span>
                <span className="text-amber-700 dark:text-amber-300 font-semibold">
                  SA: {item.spaceAmp}x
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Write Volume & SSD Flash Wear Simulation */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-ink-light dark:text-ink-dark font-semibold">
            Daily Application Write Ingestion:
          </span>
          <span className="text-purple-700 dark:text-purple-300 font-bold">
            {dailyWriteGb} GB / day
          </span>
        </div>
        <input
          type="range"
          min={20}
          max={1000}
          step={20}
          value={dailyWriteGb}
          onChange={(e) => {
            playTick();
            setDailyWriteGb(Number(e.target.value));
          }}
          className="w-full h-1.5 bg-parchment-200 dark:bg-parchment-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-[9px] text-ink-muted dark:text-ink-darkMuted">
          <span>20 GB/day</span>
          <span>500 GB/day</span>
          <span>1,000 GB/day (1 TB/day)</span>
        </div>

        {/* Calculated Flash Impact Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-parchment-200 dark:border-parchment-800">
          <div className="p-2.5 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              ACTUAL DISK WRITES / DAY
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono">
              {dailyDiskWritesGb >= 1000
                ? `${(dailyDiskWritesGb / 1024).toFixed(1)} TB`
                : `${dailyDiskWritesGb} GB`}
            </div>
            <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted font-sans">
              {current.writeAmp}x Write Amplification
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              1-YEAR SSD WEAR (TBW)
            </div>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
              {yearlyDiskWritesTb} TB
            </div>
            <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted font-sans">
              Total Bytes Written
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              3-YEAR WEAR (TBW)
            </div>
            <div className="text-base font-bold text-ink-light dark:text-ink-dark font-mono">
              {threeYearWritesTb} TB
            </div>
            <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted font-sans">
              Typical server SSD: 600-1400 TBW
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              DISK HEADROOM NEEDED
            </div>
            <div className="text-base font-bold text-purple-700 dark:text-purple-300 font-mono">
              {Math.round((current.spaceAmp - 1) * 100)}% Free
            </div>
            <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted font-sans">
              Required buffer for merges
            </div>
          </div>
        </div>
      </div>

      {/* Tradeoff Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mb-1 uppercase font-mono">
            Advantages
          </div>
          <div className="text-xs text-ink-light dark:text-ink-dark leading-relaxed font-sans">
            {current.pros}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
          <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold mb-1 uppercase font-mono">
            Drawbacks & Bottlenecks
          </div>
          <div className="text-xs text-ink-light dark:text-ink-dark leading-relaxed font-sans">
            {current.cons}
          </div>
        </div>
      </div>

      {/* Deep-dive note */}
      <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-900/70 border border-parchment-200 dark:border-parchment-800 text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed flex items-start gap-2.5 font-sans">
        <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-ink-light dark:text-ink-dark font-semibold">
            The RUM Conjecture (Read, Update, Memory):{' '}
          </span>
          In database storage engine design, it is mathematically impossible to simultaneously
          optimize Read Amplification, Update (Write) Amplification, and Memory (Space) Overhead.
          Leveled LSMs optimize for Reads and Space at the expense of Writes; Size-Tiered LSMs
          optimize for Writes at the expense of Space and Reads; and B+ Trees optimize for Reads at
          the expense of random-write disk fragmentation.
        </div>
      </div>
    </div>
  );
};
