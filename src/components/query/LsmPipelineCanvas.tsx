import React from 'react';
import {
  Database,
  HardDrive,
  Layers,
  ArrowDown,
  RefreshCw,
  Zap,
  Plus,
  Trash2,
  Search,
  FileCode,
  Radio,
} from 'lucide-react';
import { LsmState, ReadPathResult } from './LsmEngine';
import clsx from 'clsx';

interface LsmPipelineCanvasProps {
  lsmState: LsmState;
  lastAction: 'write' | 'flush' | 'compact' | 'lookup' | 'idle';
  lookupResult: ReadPathResult | null;
  onQuickPreset: (
    preset: 'burst_write' | 'tombstone' | 'flush' | 'compact' | 'read_hit' | 'read_miss'
  ) => void;
}

const PIPELINE_ANIMATION_SPEED_SEC = 2.0;

export const LsmPipelineCanvas: React.FC<LsmPipelineCanvasProps> = ({
  lsmState,
  lastAction,
  lookupResult,
  onQuickPreset,
}) => {
  const memTableFull = lsmState.activeMemTable.length >= lsmState.memTableThreshold;
  const l0Count = lsmState.l0Tables.length;
  const l1Count = lsmState.l1Tables.length;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-parchment-50/80 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 relative overflow-hidden shadow-inner space-y-3 font-mono text-xs">
      {/* Canvas Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-ink-muted">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
          <span className="font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider">
            LSM STORAGE PIPELINE &amp; CONTINUOUS I/O FLOW
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            {lsmState.compactionStrategy === 'leveled'
              ? 'Leveled (RocksDB)'
              : 'Size-Tiered (Cassandra)'}
          </span>
        </div>

        {/* Quick Interactive Scenario Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onQuickPreset('burst_write')}
            className="btn-pop px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
            title="Insert 4 keys rapidly to fill MemTable and trigger automatic flush"
          >
            <Plus className="w-3 h-3" />
            <span>Burst 4 Writes</span>
          </button>

          <button
            onClick={() => onQuickPreset('tombstone')}
            className="btn-pop px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
            title="Inject a tombstone deletion marker"
          >
            <Trash2 className="w-3 h-3" />
            <span>Tombstone</span>
          </button>

          <button
            onClick={() => onQuickPreset('flush')}
            disabled={lsmState.activeMemTable.length === 0}
            className="btn-pop px-2 py-1 rounded-lg bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark font-medium text-[11px] shadow-xs cursor-pointer disabled:opacity-40 flex items-center gap-1"
            title="Flush in-memory MemTable to immutable L0 SSTable"
          >
            <ArrowDown className="w-3 h-3 text-purple-600" />
            <span>Flush L0</span>
          </button>

          <button
            onClick={() => onQuickPreset('compact')}
            disabled={l0Count === 0}
            className="btn-pop px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs cursor-pointer disabled:opacity-40 flex items-center gap-1"
            title="Merge sort L0 tables into L1 non-overlapping runs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Compact</span>
          </button>

          <button
            onClick={() => onQuickPreset('read_hit')}
            className="btn-pop px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
            title="Run trace point lookup on existing key"
          >
            <Search className="w-3 h-3" />
            <span>Trace Read</span>
          </button>
        </div>
      </div>

      {/* Live SVG Diagram Canvas with Continuous Animated Flow Streams */}
      <div className="w-full relative flex items-center justify-center py-2">
        <svg
          viewBox="0 0 760 280"
          className="w-full h-auto max-h-[340px] overflow-visible select-none"
        >
          <defs>
            {/* Geometric paths for AnimateMotion */}
            {/* Path 1: Client -> WAL (Sequential Write) */}
            <path id="pathClientToWal" d="M 125 75 L 210 75" />

            {/* Path 2: Client -> MemTable (SkipList Insert) */}
            <path id="pathClientToMemTable" d="M 125 60 C 220 20, 320 20, 395 60" />

            {/* Path 3: MemTable -> L0 Flush (Disk Write) */}
            <path id="pathMemTableToL0" d="M 460 115 C 460 150, 350 170, 310 180" />

            {/* Path 4: L0 -> Compaction Merge Sort -> L1 */}
            <path id="pathL0ToCompactor" d="M 320 205 L 520 205" />

            {/* Path 5: Read Path Trace (Client -> MemTable -> Bloom Filter -> L0/L1) */}
            <path id="pathReadTrace" d="M 125 85 C 260 100, 380 90, 420 85" />
            <path id="pathReadToBloom" d="M 460 110 L 460 175" />
          </defs>

          {/* Boundaries: Memory vs Disk */}
          {/* Top RAM Zone */}
          <rect
            x="375"
            y="15"
            width="370"
            height="120"
            rx="14"
            fill="none"
            stroke="#a855f7"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="opacity-30"
          />
          <text
            x="390"
            y="32"
            className="text-[8.5px] font-mono font-bold fill-purple-700 dark:fill-purple-300 uppercase tracking-wider"
          >
            In-Memory Layer (RAM / Volatile)
          </text>

          {/* Bottom Disk Zone */}
          <rect
            x="195"
            y="145"
            width="550"
            height="120"
            rx="14"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="opacity-30"
          />
          <text
            x="210"
            y="162"
            className="text-[8.5px] font-mono font-bold fill-sky-700 dark:fill-sky-300 uppercase tracking-wider"
          >
            On-Disk Layer (SSD Persistent Storage)
          </text>

          {/* Wires */}
          {/* Wire 1: Client -> WAL */}
          <path
            d="M 125 75 L 210 75"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            className="animate-packet-flow opacity-80"
          />

          {/* Wire 2: Client -> MemTable */}
          <path
            d="M 125 60 C 220 20, 320 20, 395 60"
            fill="none"
            stroke="#a855f7"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="animate-packet-flow opacity-90"
          />

          {/* Wire 3: MemTable -> L0 Flush Wire */}
          <path
            d="M 460 115 C 460 150, 350 170, 310 180"
            fill="none"
            stroke={memTableFull ? '#ef4444' : '#a855f7'}
            strokeWidth={memTableFull ? '3' : '2'}
            strokeDasharray="5 5"
            className={clsx(
              'transition-all',
              memTableFull ? 'animate-packet-flow opacity-100' : 'opacity-40'
            )}
          />

          {/* Wire 4: L0 -> Compaction -> L1 */}
          <path
            d="M 320 205 L 520 205"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className={clsx(
              'transition-opacity duration-300',
              l0Count > 0 ? 'animate-packet-flow opacity-90' : 'opacity-30'
            )}
          />

          {/* CONTINUOUS ANIMATEMOTION PACKET STREAMS */}
          {/* Stream 1: Ingestion write stream (Client -> WAL & MemTable) */}
          {(lastAction === 'write' || lastAction === 'idle') && (
            <g>
              <g>
                <animateMotion dur={`${PIPELINE_ANIMATION_SPEED_SEC}s`} repeatCount="indefinite">
                  <mpath href="#pathClientToWal" />
                </animateMotion>
                <circle r="4.5" fill="#38bdf8" className="shadow-xs animate-pulse" />
              </g>
              <g>
                <animateMotion
                  dur={`${PIPELINE_ANIMATION_SPEED_SEC * 1.2}s`}
                  repeatCount="indefinite"
                >
                  <mpath href="#pathClientToMemTable" />
                </animateMotion>
                <rect
                  x="-35"
                  y="-10"
                  width="70"
                  height="20"
                  rx="10"
                  fill="#a855f7"
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
                  PUT k:v
                </text>
              </g>
            </g>
          )}

          {/* Stream 2: Flush to L0 when MemTable is full or on flush */}
          {(memTableFull || lastAction === 'flush') && (
            <g>
              <animateMotion dur="1.8s" repeatCount="indefinite">
                <mpath href="#pathMemTableToL0" />
              </animateMotion>
              <rect
                x="-42"
                y="-11"
                width="84"
                height="22"
                rx="11"
                fill="#ec4899"
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
                Flush L0 SSTable
              </text>
            </g>
          )}

          {/* Stream 3: Compaction Multi-way merge stream */}
          {l0Count > 0 && (
            <g>
              <animateMotion dur="2.4s" repeatCount="indefinite">
                <mpath href="#pathL0ToCompactor" />
              </animateMotion>
              <rect
                x="-45"
                y="-11"
                width="90"
                height="22"
                rx="11"
                fill="#10b981"
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
                Merge &rarr; L1 Run
              </text>
            </g>
          )}

          {/* Stream 4: Read Path Trace */}
          {lastAction === 'lookup' && (
            <g>
              <g>
                <animateMotion dur="1.8s" repeatCount="indefinite">
                  <mpath href="#pathReadTrace" />
                </animateMotion>
                <rect
                  x="-40"
                  y="-10"
                  width="80"
                  height="20"
                  rx="10"
                  fill="#06b6d4"
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
                  GET {lookupResult ? lookupResult.key : 'key'}
                </text>
              </g>
            </g>
          )}

          {/* NODE 1: CLIENT WRITER (x: 20, y: 35) */}
          <g transform="translate(20, 35)">
            <rect
              width="105"
              height="90"
              rx="16"
              fill="currentColor"
              className="text-white dark:text-parchment-950 stroke-sky-500 stroke-1.5 shadow-sm"
            />
            <circle cx="52" cy="28" r="16" fill="#f0f9ff" className="dark:fill-sky-950" />
            <Zap className="w-5 h-5 text-sky-600 dark:text-sky-400" x="42" y="18" />
            <text
              x="52"
              y="56"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
            >
              Client I/O
            </text>
            <text
              x="52"
              y="68"
              textAnchor="middle"
              className="text-[7.5px] font-mono fill-sky-600 font-semibold"
            >
              Writes &amp; Queries
            </text>
            <rect
              x="6"
              y="74"
              width="93"
              height="12"
              rx="4"
              fill="#f0f9ff"
              className="dark:fill-sky-950/60"
            />
            <text
              x="52"
              y="83"
              textAnchor="middle"
              className="text-[6.5px] font-mono fill-sky-800 dark:fill-sky-200 font-bold"
            >
              Append-Only Flow
            </text>
          </g>

          {/* NODE 2: WRITE-AHEAD LOG (WAL) (x: 210, y: 35) */}
          <g transform="translate(210, 35)">
            <rect
              width="115"
              height="90"
              rx="16"
              fill="currentColor"
              className="text-white dark:text-parchment-950 stroke-cyan-500 stroke-1.5 shadow-sm"
            />
            <circle cx="57" cy="28" r="16" fill="#ecfeff" className="dark:fill-cyan-950" />
            <FileCode className="w-5 h-5 text-cyan-600 dark:text-cyan-400" x="47" y="18" />
            <text
              x="57"
              y="56"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
            >
              WAL on Disk
            </text>
            <text
              x="57"
              y="68"
              textAnchor="middle"
              className="text-[7.5px] font-mono fill-cyan-600 font-semibold"
            >
              Sequential Durability
            </text>
            <rect
              x="6"
              y="74"
              width="103"
              height="12"
              rx="4"
              fill="#ecfeff"
              className="dark:fill-cyan-950/60"
            />
            <text
              x="57"
              y="83"
              textAnchor="middle"
              className="text-[6.5px] font-mono fill-cyan-800 dark:fill-cyan-200 font-bold"
            >
              {lsmState.wal.length} Logged Entries
            </text>
          </g>

          {/* NODE 3: ACTIVE MEMTABLE (RAM) (x: 395, y: 35) */}
          <g transform="translate(395, 35)">
            <rect
              width="130"
              height="95"
              rx="16"
              fill="currentColor"
              className={clsx(
                'text-white dark:text-parchment-950 shadow-sm transition-all',
                memTableFull
                  ? 'stroke-rose-500 stroke-2 animate-pulse'
                  : 'stroke-purple-500 stroke-1.5'
              )}
            />
            <circle cx="65" cy="28" r="16" fill="#faf5ff" className="dark:fill-purple-950" />
            <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" x="55" y="18" />
            <text
              x="65"
              y="56"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
            >
              MemTable (RAM)
            </text>
            <text
              x="65"
              y="68"
              textAnchor="middle"
              className="text-[7.5px] font-mono fill-purple-600 font-semibold"
            >
              Concurrent SkipList
            </text>
            <rect
              x="6"
              y="74"
              width="118"
              height="16"
              rx="4"
              fill={memTableFull ? '#fef2f2' : '#faf5ff'}
              className={memTableFull ? 'dark:fill-rose-950/60' : 'dark:fill-purple-950/60'}
              stroke={memTableFull ? '#fca5a5' : '#e9d5ff'}
              strokeWidth="0.5"
            />
            <text
              x="65"
              y="85"
              textAnchor="middle"
              className={clsx(
                'text-[7px] font-mono font-bold',
                memTableFull ? 'fill-rose-700' : 'fill-purple-700'
              )}
            >
              {lsmState.activeMemTable.length}/{lsmState.memTableThreshold} Keys{' '}
              {memTableFull ? '(FLUSH READY)' : ''}
            </text>
          </g>

          {/* NODE 4: LEVEL 0 SSTABLES (x: 210, y: 165) */}
          <g transform="translate(210, 165)">
            <rect
              width="125"
              height="95"
              rx="16"
              fill="currentColor"
              className="text-white dark:text-parchment-950 stroke-amber-500 stroke-1.5 shadow-sm"
            />
            <circle cx="62" cy="28" r="16" fill="#fffbeb" className="dark:fill-amber-950" />
            <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" x="52" y="18" />
            <text
              x="62"
              y="56"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
            >
              L0 SSTables (Disk)
            </text>
            <text
              x="62"
              y="68"
              textAnchor="middle"
              className="text-[7.5px] font-mono fill-amber-600 font-semibold"
            >
              Overlapping Keys
            </text>
            <rect
              x="6"
              y="74"
              width="113"
              height="15"
              rx="4"
              fill="#fffbeb"
              className="dark:fill-amber-950/60"
              stroke="#fde68a"
              strokeWidth="0.5"
            />
            <text
              x="62"
              y="85"
              textAnchor="middle"
              className="text-[7px] font-mono fill-amber-800 dark:fill-amber-200 font-bold"
            >
              {l0Count} Tables on Disk
            </text>
          </g>

          {/* NODE 5: LEVEL 1 COMPACTED RUNS (x: 520, y: 165) */}
          <g transform="translate(520, 165)">
            <rect
              width="145"
              height="95"
              rx="16"
              fill="currentColor"
              className="text-white dark:text-parchment-950 stroke-emerald-500 stroke-1.5 shadow-sm"
            />
            <circle cx="72" cy="28" r="16" fill="#ecfdf5" className="dark:fill-emerald-950" />
            <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" x="62" y="18" />
            <text
              x="72"
              y="56"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
            >
              L1 Compacted Runs
            </text>
            <text
              x="72"
              y="68"
              textAnchor="middle"
              className="text-[7.5px] font-mono fill-emerald-600 font-semibold"
            >
              Non-Overlapping Sorted
            </text>
            <rect
              x="6"
              y="74"
              width="133"
              height="15"
              rx="4"
              fill="#ecfdf5"
              className="dark:fill-emerald-950/60"
              stroke="#a7f3d0"
              strokeWidth="0.5"
            />
            <text
              x="72"
              y="85"
              textAnchor="middle"
              className="text-[7px] font-mono fill-emerald-800 dark:fill-emerald-200 font-bold"
            >
              {l1Count} Runs &bull; Tombstones Evicted
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
