import React, { useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { playTick } from '../../lib/sound';
import clsx from 'clsx';

export const BPlusFanoutCalculator: React.FC = () => {
  const [pageSizeKb, setPageSizeKb] = useState<number>(16); // 16KB default for InnoDB
  const [keySizeBytes, setKeySizeBytes] = useState<number>(8); // BIGINT 8 bytes
  const [pointerSizeBytes, setPointerSizeBytes] = useState<number>(6); // 6-byte child page pointer
  const [recordPayloadBytes, setRecordPayloadBytes] = useState<number>(200); // 200B leaf row payload

  const pageBytes = pageSizeKb * 1024;
  // Internal node fanout: each entry has (key + pointer)
  const entrySize = keySizeBytes + pointerSizeBytes;
  const internalFanout = Math.floor(pageBytes / entrySize);

  // Leaf node capacity: rows per leaf page
  const rowsPerLeaf = Math.floor(pageBytes / (keySizeBytes + recordPayloadBytes));

  // Tree capacity by height
  const height1Rows = rowsPerLeaf;
  const height2Rows = internalFanout * rowsPerLeaf;
  const height3Rows = internalFanout * internalFanout * rowsPerLeaf;
  const height4Rows = internalFanout * internalFanout * internalFanout * rowsPerLeaf;

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} Billion`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)} Million`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(0)} Thousand`;
    return num.toLocaleString();
  };

  return (
    <div className="rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 p-4 font-mono text-xs space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-parchment-200 dark:border-parchment-800">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider text-[11px]">
            B+ Tree Fan-out & Page Capacity Estimator
          </span>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted bg-parchment-200/70 dark:bg-parchment-800 px-1.5 py-0.5 rounded border border-parchment-300 dark:border-parchment-700 font-semibold">
            Fan-out B = {internalFanout} pointers/page
          </span>
        </div>
        <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted font-sans">
          Models PostgreSQL & MySQL InnoDB 16KB block allocation
        </div>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 shadow-2xs">
        <div>
          <label className="text-[10px] text-ink-muted dark:text-ink-darkMuted block mb-1 font-semibold">
            Disk Page Size
          </label>
          <div className="flex gap-1">
            {[4, 8, 16, 64].map((sz) => (
              <button
                key={sz}
                onClick={() => {
                  playTick();
                  setPageSizeKb(sz);
                }}
                className={clsx(
                  'flex-1 py-1 rounded-lg text-[10px] border transition-colors cursor-pointer',
                  pageSizeKb === sz
                    ? 'bg-purple-500/10 dark:bg-purple-950 border-purple-500 text-purple-700 dark:text-purple-300 font-bold'
                    : 'bg-parchment-100 dark:bg-parchment-950 border-parchment-300 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
                )}
              >
                {sz}KB
              </button>
            ))}
          </div>
          <span className="text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1 block font-sans">
            {pageSizeKb === 16
              ? 'MySQL InnoDB default'
              : pageSizeKb === 8
                ? 'PostgreSQL default'
                : 'OS page'}
          </span>
        </div>

        <div>
          <label className="text-[10px] text-ink-muted dark:text-ink-darkMuted block mb-1 font-semibold">
            Primary Key Size
          </label>
          <div className="flex gap-1">
            {[
              { label: 'INT', bytes: 4 },
              { label: 'BIGINT', bytes: 8 },
              { label: 'UUID', bytes: 16 },
            ].map((k) => (
              <button
                key={k.bytes}
                onClick={() => {
                  playTick();
                  setKeySizeBytes(k.bytes);
                }}
                className={clsx(
                  'flex-1 py-1 rounded-lg text-[10px] border transition-colors cursor-pointer',
                  keySizeBytes === k.bytes
                    ? 'bg-purple-500/10 dark:bg-purple-950 border-purple-500 text-purple-700 dark:text-purple-300 font-bold'
                    : 'bg-parchment-100 dark:bg-parchment-950 border-parchment-300 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
                )}
              >
                {k.label} ({k.bytes}B)
              </button>
            ))}
          </div>
          <span className="text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1 block font-sans">
            Larger keys reduce fan-out and increase tree height
          </span>
        </div>

        <div>
          <label className="text-[10px] text-ink-muted dark:text-ink-darkMuted block mb-1 font-semibold">
            Child Pointer Size
          </label>
          <div className="flex gap-1">
            {[6, 8].map((ptr) => (
              <button
                key={ptr}
                onClick={() => {
                  playTick();
                  setPointerSizeBytes(ptr);
                }}
                className={clsx(
                  'flex-1 py-1 rounded-lg text-[10px] border transition-colors cursor-pointer',
                  pointerSizeBytes === ptr
                    ? 'bg-purple-500/10 dark:bg-purple-950 border-purple-500 text-purple-700 dark:text-purple-300 font-bold'
                    : 'bg-parchment-100 dark:bg-parchment-950 border-parchment-300 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
                )}
              >
                {ptr} bytes
              </button>
            ))}
          </div>
          <span className="text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1 block font-sans">
            InnoDB uses 6-byte page offset pointers
          </span>
        </div>

        <div>
          <label className="text-[10px] text-ink-muted dark:text-ink-darkMuted block mb-1 font-semibold">
            Average Row Payload
          </label>
          <input
            type="number"
            min={50}
            max={2000}
            step={50}
            value={recordPayloadBytes}
            onChange={(e) => setRecordPayloadBytes(Math.max(50, Number(e.target.value)))}
            className="w-full bg-parchment-100 dark:bg-parchment-950 border border-parchment-300 dark:border-parchment-700 rounded-lg px-2 py-1 text-ink-light dark:text-ink-dark text-xs focus:outline-none focus:border-purple-500"
          />
          <span className="text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1 block font-sans">
            Stored in clustered index leaves
          </span>
        </div>
      </div>

      {/* Tree Height vs Capacity Matrix */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-ink-light dark:text-ink-dark">
          Max Indexed Rows vs. Tree Depth (Disk I/O Seeks)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
            <div className="flex items-center justify-between text-[10px] text-ink-muted dark:text-ink-darkMuted mb-1">
              <span>DEPTH 1 (Root only)</span>
              <span className="text-purple-700 dark:text-purple-400 font-bold">1 Disk Read</span>
            </div>
            <div className="text-base font-bold text-ink-light dark:text-ink-dark font-mono">
              {formatNumber(height1Rows)} rows
            </div>
            <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1 font-sans">
              Leaf root page fits {rowsPerLeaf} records
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
            <div className="flex items-center justify-between text-[10px] text-ink-muted dark:text-ink-darkMuted mb-1">
              <span>DEPTH 2 (Root + Leaf)</span>
              <span className="text-purple-700 dark:text-purple-400 font-bold">2 Disk Reads</span>
            </div>
            <div className="text-base font-bold text-ink-light dark:text-ink-dark font-mono">
              {formatNumber(height2Rows)} rows
            </div>
            <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1 font-sans">
              {internalFanout} leaf pages × {rowsPerLeaf} rows
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-500/10 dark:bg-purple-950/20 border border-purple-500/30">
            <div className="flex items-center justify-between text-[10px] text-purple-700 dark:text-purple-400 mb-1 font-semibold">
              <span>DEPTH 3 (Standard OLTP)</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">3 Disk Reads</span>
            </div>
            <div className="text-base font-bold text-purple-700 dark:text-purple-300 font-mono">
              {formatNumber(height3Rows)} rows
            </div>
            <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1 font-sans">
              Indexes hundreds of millions with only 3 I/Os
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
            <div className="flex items-center justify-between text-[10px] text-ink-muted dark:text-ink-darkMuted mb-1">
              <span>DEPTH 4 (Enterprise Scale)</span>
              <span className="text-purple-700 dark:text-purple-400 font-bold">4 Disk Reads</span>
            </div>
            <div className="text-base font-bold text-ink-light dark:text-ink-dark font-mono">
              {formatNumber(height4Rows)} rows
            </div>
            <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1 font-sans">
              Handles multi-billion row tables
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Takeaway */}
      <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-900/70 border border-parchment-200 dark:border-parchment-800 text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed flex items-start gap-2.5 font-sans">
        <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-ink-light dark:text-ink-dark font-semibold">
            Why B+ Trees dominate Relational Databases:{' '}
          </span>
          Unlike binary trees (O(log₂ N) height), a 16KB B+ Tree has a massive branching fan-out
          factor (B ≈ {internalFanout}). A 3-level tree indexes over {formatNumber(height3Rows)}{' '}
          records while requiring at most 3 page accesses. Because the root and internal branch
          nodes fit easily in the InnoDB Buffer Pool (RAM), point lookups typically perform only 1
          single physical disk read.
        </div>
      </div>
    </div>
  );
};
