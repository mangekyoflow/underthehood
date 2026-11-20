import React, { useRef, useEffect, useState } from 'react';
import { BPlusNode } from '../../types/query';
import {
  ArrowRight,
  Link as LinkIcon,
  Compass,
  Sparkles,
  Binary,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

interface BPlusTreeVisualizerProps {
  root: BPlusNode | null;
  activePath: string[];
  activeLeafScanIds: string[];
  highlightedKey: number | null;
  maxCapacity: number;
}

interface NodeLayout {
  node: BPlusNode;
  level: number;
  colIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const BPlusTreeVisualizer: React.FC<BPlusTreeVisualizerProps> = ({
  root,
  activePath,
  activeLeafScanIds,
  highlightedKey,
  maxCapacity,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });

  if (!root) {
    return (
      <div className="h-64 flex flex-col items-center justify-center font-mono text-xs text-ink-muted dark:text-ink-darkMuted gap-2 border border-parchment-200 dark:border-parchment-800 rounded-2xl bg-white/80 dark:bg-parchment-900/80 shadow-xs">
        <span className="font-semibold text-ink-light dark:text-ink-dark">
          B+ Tree is currently empty.
        </span>
        <span className="text-[11px] text-ink-muted dark:text-ink-darkMuted font-sans">
          Insert numerical keys above or use a preset to visualize tree nodes and leaf splits.
        </span>
      </div>
    );
  }

  // Calculate layout levels
  const levels: BPlusNode[][] = [];
  const buildLevels = (node: BPlusNode, depth: number) => {
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(node);
    if (!node.isLeaf && node.children) {
      node.children.forEach((c) => buildLevels(c, depth + 1));
    }
  };
  buildLevels(root, 0);

  // Collect leaf nodes in linked-list order
  const leaves: BPlusNode[] = [];
  let leafCursor: BPlusNode | null = root;
  while (leafCursor && !leafCursor.isLeaf) {
    leafCursor = leafCursor.children![0];
  }
  while (leafCursor) {
    leaves.push(leafCursor);
    leafCursor = (leafCursor.next as BPlusNode) || null;
  }

  // Compute geometric coordinate mapping for branches
  const levelHeight = 110;
  const nodeWidth = 140;
  const nodeHeight = 54;
  const totalLevels = levels.length;

  const nodeMap = new Map<string, { x: number; y: number }>();

  // Determine canvas width based on largest level
  const maxNodesInLevel = Math.max(...levels.map((l) => l.length), 1);
  const calculatedWidth = Math.max(760, maxNodesInLevel * 170);
  const calculatedHeight = Math.max(340, totalLevels * levelHeight + 60);

  // Position nodes symmetrically
  levels.forEach((levelNodes, levelIdx) => {
    const y = 40 + levelIdx * levelHeight;
    const count = levelNodes.length;
    const spacing = calculatedWidth / (count + 1);

    levelNodes.forEach((node, colIdx) => {
      const x = spacing * (colIdx + 1);
      nodeMap.set(node.id, { x, y });
    });
  });

  // Generate branches (parent -> children)
  const branches: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    isActive: boolean;
    id: string;
  }[] = [];
  levels.forEach((levelNodes) => {
    levelNodes.forEach((parent) => {
      if (!parent.isLeaf && parent.children) {
        const parentPos = nodeMap.get(parent.id);
        if (parentPos) {
          parent.children.forEach((child) => {
            const childPos = nodeMap.get(child.id);
            if (childPos) {
              const isActive = activePath.includes(parent.id) && activePath.includes(child.id);
              branches.push({
                from: { x: parentPos.x, y: parentPos.y + nodeHeight / 2 },
                to: { x: childPos.x, y: childPos.y - nodeHeight / 2 },
                isActive,
                id: `${parent.id}->${child.id}`,
              });
            }
          });
        }
      }
    });
  });

  return (
    <div className="w-full rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 p-4 sm:p-6 shadow-xs space-y-6 overflow-hidden">
      {/* Visualizer Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-ink-muted border-b border-parchment-200 dark:border-parchment-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
          <span className="font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider">
            B+ TREE HIERARCHY &amp; SEARCH TRAVERSAL
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Tree Height: {totalLevels} Levels &bull; Max Fan-Out M = {maxCapacity}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Visited Branch
          </span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Target Key
          </span>
        </div>
      </div>

      {/* Interactive SVG Tree Hierarchy Canvas */}
      <div className="w-full overflow-x-auto relative min-h-[340px] flex justify-center py-2 no-scrollbar">
        <div
          style={{ width: calculatedWidth, height: calculatedHeight }}
          className="relative select-none"
        >
          {/* SVG Connection Lines & Animated Flow Particles */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <linearGradient id="bplusBranchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>

            {/* Tree Branch Edges */}
            {branches.map((b) => {
              const dx = b.to.x - b.from.x;
              const dy = b.to.y - b.from.y;
              const pathD = `M ${b.from.x} ${b.from.y} C ${b.from.x} ${b.from.y + dy * 0.5}, ${b.to.x} ${b.to.y - dy * 0.5}, ${b.to.x} ${b.to.y}`;

              return (
                <g key={b.id}>
                  {/* Background Branch Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={b.isActive ? '#a855f7' : '#cbd5e1'}
                    className={clsx(
                      'transition-all duration-300',
                      b.isActive
                        ? 'dark:stroke-purple-400 stroke-2.5 opacity-90'
                        : 'dark:stroke-parchment-800 stroke-1.5 opacity-40'
                    )}
                  />

                  {/* Animated Traversal Particle when Branch is Active */}
                  {b.isActive && (
                    <g>
                      <circle r="4" fill="#a855f7" className="shadow-xs animate-pulse">
                        <animateMotion dur="1.2s" repeatCount="indefinite" path={pathD} />
                      </circle>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Render Positioned Nodes */}
          {levels.map((levelNodes, levelIdx) =>
            levelNodes.map((node) => {
              const pos = nodeMap.get(node.id) || { x: 0, y: 0 };
              const isVisited = activePath.includes(node.id);
              const isLeafScanned = activeLeafScanIds.includes(node.id);
              const isRoot = levelIdx === 0;

              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    left: `${pos.x - nodeWidth / 2}px`,
                    top: `${pos.y - nodeHeight / 2}px`,
                    width: `${nodeWidth}px`,
                  }}
                  className={clsx(
                    'rounded-xl border p-2 transition-all duration-300 font-mono shadow-md z-10',
                    isVisited || isLeafScanned
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/70 ring-4 ring-purple-500/20 scale-105'
                      : node.isLeaf
                        ? 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-950/90'
                        : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900/90'
                  )}
                >
                  {/* Node Header Pill */}
                  <div className="flex items-center justify-between text-[9px] text-ink-muted dark:text-ink-darkMuted border-b border-parchment-200 dark:border-parchment-800 pb-1 mb-1.5">
                    <span className="font-bold text-ink-light dark:text-ink-dark">
                      {isRoot ? 'ROOT' : node.isLeaf ? 'LEAF' : 'INTERNAL'} #{node.id}
                    </span>
                    <span>
                      {node.keys.length}/{maxCapacity} keys
                    </span>
                  </div>

                  {/* Keys Row */}
                  <div className="flex items-center justify-center gap-1">
                    {node.keys.map((k, kIdx) => {
                      const isKeyTarget = highlightedKey === k;
                      return (
                        <div
                          key={kIdx}
                          className={clsx(
                            'px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-colors flex flex-col items-center min-w-[28px] shadow-2xs',
                            isKeyTarget
                              ? 'bg-amber-400 text-black shadow-md animate-pulse ring-2 ring-amber-300'
                              : isVisited
                                ? 'bg-purple-600 text-white'
                                : node.isLeaf
                                  ? 'bg-parchment-100 dark:bg-parchment-800 text-ink-light dark:text-ink-dark border border-parchment-300 dark:border-parchment-700'
                                  : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          )}
                        >
                          <span>{k}</span>
                          {node.isLeaf && (
                            <span className="text-[7px] font-normal opacity-70">ptr</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Leaf-Level Doubly Linked List Traversal Strip */}
      <div className="pt-3 border-t border-parchment-200 dark:border-parchment-800 space-y-2 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="font-bold text-ink-light dark:text-ink-dark">
              LEAF-LEVEL SEQUENTIAL DOUBLY LINKED LIST
            </span>
          </div>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
            O(K) range scans traverse horizontal next-pointers without root re-evaluations
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 no-scrollbar">
          {leaves.map((leaf, idx) => {
            const isScanned = activeLeafScanIds.includes(leaf.id);
            return (
              <React.Fragment key={leaf.id}>
                <div
                  className={clsx(
                    'p-2 rounded-xl border text-xs flex items-center gap-2 transition-all shrink-0 shadow-xs',
                    isScanned
                      ? 'border-purple-500 bg-purple-500/15 text-purple-800 dark:text-purple-200 ring-2 ring-purple-500/40'
                      : 'border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 text-ink-light dark:text-ink-dark'
                  )}
                >
                  <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
                    Leaf {leaf.id}:
                  </span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    [{leaf.keys.join(', ')}]
                  </span>
                </div>

                {idx < leaves.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-purple-500 shrink-0 animate-pulse" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
