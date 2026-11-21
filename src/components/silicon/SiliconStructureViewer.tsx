import React, { useState, useEffect } from 'react';
import {
  Layers,
  Cpu,
  Box,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Eye,
  Zap,
  ShieldCheck,
  Activity,
  Compass,
  Flame,
  Info,
  Filter,
  Clock,
} from 'lucide-react';
import { playTick, playSuccess } from '../../lib/sound';
import clsx from 'clsx';

interface SiliconBlock {
  id: string;
  name: string;
  category: 'core' | 'memory' | 'clock' | 'io' | 'cdc';
  areaMm2: number;
  gateCount: string;
  frequency: string;
  metalLayers: string;
  powerW: number;
  description: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DIE_BLOCKS: SiliconBlock[] = [
  {
    id: 'ai-core-0',
    name: 'AI Neural Tensor Core Tile 0',
    category: 'core',
    areaMm2: 3.4,
    gateCount: '4.2M Gates',
    frequency: '1.0 GHz',
    metalLayers: 'M1–M6',
    powerW: 4.8,
    description:
      'High-throughput systolic tensor array executing matrix multiplication (BF16 / INT8) at 1.0 GHz with local register files.',
    color: '#3b82f6',
    x: 40,
    y: 40,
    width: 140,
    height: 120,
  },
  {
    id: 'ai-core-1',
    name: 'AI Neural Tensor Core Tile 1',
    category: 'core',
    areaMm2: 3.4,
    gateCount: '4.2M Gates',
    frequency: '1.0 GHz',
    metalLayers: 'M1–M6',
    powerW: 4.8,
    description:
      'Secondary compute core with vector ALU engines and functional coverage assertion monitors.',
    color: '#3b82f6',
    x: 40,
    y: 180,
    width: 140,
    height: 120,
  },
  {
    id: 'cdc-fifo',
    name: 'Dual-Clock CDC Async FIFO & NoC Router',
    category: 'cdc',
    areaMm2: 0.95,
    gateCount: '850K Gates',
    frequency: 'Asynchronous (1.0 GHz ↔ 400 MHz)',
    metalLayers: 'M1–M5',
    powerW: 0.65,
    description:
      'Dual-port SRAM buffer and Gray-code pointer synchronizers preventing metastability when high-speed AI cores transmit to the memory bus.',
    color: '#10b981',
    x: 200,
    y: 120,
    width: 90,
    height: 100,
  },
  {
    id: 'sram-l2',
    name: 'Shared L2 SRAM Cache Matrix (8 MB)',
    category: 'memory',
    areaMm2: 4.1,
    gateCount: '6T SRAM Array',
    frequency: '1.0 GHz',
    metalLayers: 'M1–M4',
    powerW: 2.1,
    description:
      'High-density 6-transistor SRAM memory banks with ECC error correction and column redundancy for yield enhancement.',
    color: '#8b5cf6',
    x: 310,
    y: 40,
    width: 130,
    height: 110,
  },
  {
    id: 'mem-controller',
    name: 'LPDDR5 Memory Controller & PHY',
    category: 'memory',
    areaMm2: 2.8,
    gateCount: '2.1M Gates',
    frequency: '400 MHz (6.4 Gbps Pin Datarate)',
    metalLayers: 'M1–M7',
    powerW: 2.4,
    description:
      'DFI compliant memory controller managing command queues, rank scheduling, refresh cycles, and analog impedance calibration.',
    color: '#a855f7',
    x: 310,
    y: 170,
    width: 130,
    height: 130,
  },
  {
    id: 'pll-clock',
    name: 'Dual Fractional-N PLL & Clock Generator',
    category: 'clock',
    areaMm2: 0.45,
    gateCount: 'Analog / Mixed-Signal',
    frequency: '1.0 GHz Core / 400 MHz Bus',
    metalLayers: 'M5–M8',
    powerW: 0.35,
    description:
      'Ultra-low jitter Phase-Locked Loops generating synchronous clock domains with programmable dividers and spread-spectrum clocking.',
    color: '#f59e0b',
    x: 200,
    y: 40,
    width: 90,
    height: 65,
  },
  {
    id: 'io-pad-ring',
    name: 'Perimeter I/O Pad Ring & ESD Protection Cells',
    category: 'io',
    areaMm2: 1.6,
    gateCount: '320 Bump Pads',
    frequency: 'Up to 6.4 Gbps',
    metalLayers: 'M7–M8 (Top Thick Copper)',
    powerW: 1.2,
    description:
      'Ball-grid array (BGA) flip-chip copper pillar bumps and back-to-back diode electrostatic discharge (ESD) protection clamps.',
    color: '#64748b',
    x: 10,
    y: 10,
    width: 460,
    height: 320,
  },
];

const TAPE_OUT_STEPS = [
  {
    step: '01',
    title: 'RTL Architecture & Simulation',
    tooling: 'SystemVerilog / Cocotb / VCS',
    desc: 'Hardware description of ALU, registers, and FIFO interfaces. Verified against software golden model.',
  },
  {
    step: '02',
    title: 'Logic Synthesis & Gate Mapping',
    tooling: 'Synopsys Design Compiler / Yosys',
    desc: 'Translates RTL code into standard cell gates (NAND, NOR, DFF) optimized for target foundry process.',
  },
  {
    step: '03',
    title: 'Floorplanning & Power Grid Mesh',
    tooling: 'Cadence Innovus / OpenROAD',
    desc: 'Allocates silicon die area for major IP cores, establishes I/O boundaries, and builds low-IR-drop VDD/VSS mesh.',
  },
  {
    step: '04',
    title: 'Clock Tree Synthesis (CTS)',
    tooling: 'Clock Concurrent Optimization (CCOpt)',
    desc: 'Synthesizes balanced H-tree buffer networks distributing 1 GHz clock across millions of registers with <15ps skew.',
  },
  {
    step: '05',
    title: 'Place & Route (P&R) and Timing Closure',
    tooling: 'Static Timing Analysis (STA) / PrimeTime',
    desc: 'Routes millions of nanometer copper wires (M1–M8) while closing setup/hold timing margins across PVT corners.',
  },
  {
    step: '06',
    title: 'Physical Signoff (DRC/LVS) & Mask Delivery',
    tooling: 'Mentor Calibre / GDSII / OASIS',
    desc: 'Runs Design Rule Checks (DRC) and Layout Versus Schematic (LVS). Emits final GDSII optical photolithography mask data to foundry.',
  },
];

export const SiliconStructureViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'die-layout' | 'cross-section' | 'cell-layout' | 'flow' | 'advanced-packaging'
  >('die-layout');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('ai-core-0');

  // Interactive Die & Transistor Inspection State
  const [ctsClockAnimation, setCtsClockAnimation] = useState<boolean>(true);
  const [thermalOverlay, setThermalOverlay] = useState<boolean>(false);
  const [gateVoltage, setGateVoltage] = useState<number>(0.75); // 0.0V to 0.9V

  // Stop clock animations when user moves out of the browser tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setCtsClockAnimation(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // FinFET Transistor physics calculations
  const vth = 0.35; // Threshold voltage (V)
  const isChannelConducting = gateVoltage >= vth;
  const drainCurrentMa = isChannelConducting ? Math.pow(gateVoltage - vth, 2) * 4.2 : 0.00012; // subthreshold leakage in mA

  // Cross-section layer filters
  const [visibleLayers, setVisibleLayers] = useState({
    metalTop: true,
    metalMid: true,
    metalLocal: true,
    vias: true,
    polyGate: true,
    diffusion: true,
    substrate: true,
  });

  const selectedBlock = DIE_BLOCKS.find((b) => b.id === selectedBlockId) || DIE_BLOCKS[0];

  const handleSelectBlock = (id: string) => {
    playTick();
    setSelectedBlockId(id);
  };

  const toggleLayer = (layerKey: keyof typeof visibleLayers) => {
    playTick();
    setVisibleLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-xs space-y-6">
      {/* Structural Header & Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              PHYSICAL SILICON ARCHITECTURE
            </span>
            <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
              NANOMETER FABRICATION &amp; DIE FLOORPLAN
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight">
            Microchip Physical Structure &amp; Tapeout Flow
          </h2>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl font-sans">
            Explore the physical composition of an AI accelerator SoC: from the macroscopic die
            floorplan and clock distribution tree down to FinFET 3D transistor cross-sections.
          </p>
        </div>

        {/* View mode segmented buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono overflow-x-auto no-scrollbar shrink-0 max-w-full">
          <button
            onClick={() => {
              playTick();
              setActiveTab('die-layout');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'die-layout'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Die Floorplan</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('cross-section');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'cross-section'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Silicon Cross-Section</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('cell-layout');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'cell-layout'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Box className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Standard Cell GDSII</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('flow');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'flow'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Tapeout Pipeline</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('advanced-packaging');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'advanced-packaging'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>2.5D/3D Chiplets &amp; HBM</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Die Floorplan & SoC Layout */}
      {activeTab === 'die-layout' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Interactive Microchip Die Floorplan (7 cols) */}
            <div className="lg:col-span-7 p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 font-mono text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-ink-muted">
                <span className="font-bold text-ink-light dark:text-ink-dark">
                  INTERACTIVE DIE FLOORPLAN (12.5mm × 12.5mm)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playTick();
                      setCtsClockAnimation(!ctsClockAnimation);
                    }}
                    className={clsx(
                      'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1',
                      ctsClockAnimation
                        ? 'border-blue-400 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                    )}
                  >
                    <Clock className="w-3 h-3 text-blue-500" />
                    <span>CTS Clock Pulse</span>
                  </button>
                  <button
                    onClick={() => {
                      playTick();
                      setThermalOverlay(!thermalOverlay);
                    }}
                    className={clsx(
                      'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1',
                      thermalOverlay
                        ? 'border-rose-400 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-xs'
                        : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                    )}
                  >
                    <Flame className="w-3 h-3 text-rose-500" />
                    <span>Thermal Hotspots</span>
                  </button>
                </div>
              </div>

              {/* Die Floorplan SVG Map */}
              <div className="w-full bg-slate-900 rounded-xl p-3 border border-slate-800 relative shadow-inner overflow-hidden">
                <svg viewBox="0 0 480 340" className="w-full h-auto drop-shadow-md select-none">
                  <defs>
                    <radialGradient id="die-hotspot-core" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#ea580c" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </radialGradient>
                    <radialGradient id="die-hotspot-mem" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
                      <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </radialGradient>
                    {/* H-Tree branch motion paths */}
                    <path id="path-cts-branch-tl" d="M 240 170 L 240 100 L 110 100" />
                    <path id="path-cts-branch-tr" d="M 240 170 L 240 100 L 370 100" />
                    <path id="path-cts-branch-bl" d="M 240 170 L 240 240 L 110 240" />
                    <path id="path-cts-branch-br" d="M 240 170 L 240 240 L 370 240" />
                  </defs>

                  {/* Outer Substrate & I/O Ring */}
                  <rect
                    x="5"
                    y="5"
                    width="470"
                    height="330"
                    rx="8"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="2"
                  />

                  {/* Wirebond / Bump Pads around border */}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <rect
                      key={`pad-t-${i}`}
                      x={20 + i * 19}
                      y="8"
                      width="12"
                      height="10"
                      rx="1.5"
                      fill="#e2e8f0"
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                    />
                  ))}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <rect
                      key={`pad-b-${i}`}
                      x={20 + i * 19}
                      y="322"
                      width="12"
                      height="10"
                      rx="1.5"
                      fill="#e2e8f0"
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                    />
                  ))}
                  {Array.from({ length: 16 }).map((_, i) => (
                    <rect
                      key={`pad-l-${i}`}
                      x="8"
                      y={22 + i * 19}
                      width="10"
                      height="12"
                      rx="1.5"
                      fill="#e2e8f0"
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                    />
                  ))}
                  {Array.from({ length: 16 }).map((_, i) => (
                    <rect
                      key={`pad-r-${i}`}
                      x="462"
                      y={22 + i * 19}
                      width="10"
                      height="12"
                      rx="1.5"
                      fill="#e2e8f0"
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                    />
                  ))}

                  {/* Thermal Hotspot Overlays */}
                  {thermalOverlay && (
                    <g>
                      {/* AI Core 0 Hotspot (84°C) */}
                      <ellipse cx="110" cy="100" rx="80" ry="70" fill="url(#die-hotspot-core)" />
                      {/* AI Core 1 Hotspot (86°C Peak) */}
                      <ellipse cx="110" cy="240" rx="85" ry="70" fill="url(#die-hotspot-core)" />
                      {/* L2 SRAM Cache (64°C) */}
                      <ellipse cx="375" cy="95" rx="70" ry="55" fill="url(#die-hotspot-mem)" />
                      {/* LPDDR5 PHY Controller (68°C) */}
                      <ellipse cx="375" cy="235" rx="75" ry="65" fill="url(#die-hotspot-mem)" />

                      {/* Isotherm temperature callouts */}
                      <g transform="translate(110, 100)">
                        <circle
                          cx="0"
                          cy="0"
                          r="14"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          84°C
                        </text>
                      </g>
                      <g transform="translate(110, 240)">
                        <circle
                          cx="0"
                          cy="0"
                          r="15"
                          fill="#dc2626"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="animate-pulse"
                        />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          86°C
                        </text>
                        <text
                          x="0"
                          y="24"
                          textAnchor="middle"
                          fontSize="7"
                          fontWeight="bold"
                          fill="#fca5a5"
                        >
                          PEAK TDP
                        </text>
                      </g>
                      <g transform="translate(375, 95)">
                        <circle
                          cx="0"
                          cy="0"
                          r="12"
                          fill="#d97706"
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fontSize="7"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          64°C
                        </text>
                      </g>
                      <g transform="translate(375, 235)">
                        <circle
                          cx="0"
                          cy="0"
                          r="13"
                          fill="#ea580c"
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          68°C
                        </text>
                      </g>
                    </g>
                  )}

                  {/* H-Tree Balanced Clock Distribution Grid Lines */}
                  <g opacity="0.6" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3">
                    <line x1="240" y1="40" x2="240" y2="300" strokeWidth="2.5" />
                    <line x1="110" y1="100" x2="370" y2="100" />
                    <line x1="110" y1="240" x2="370" y2="240" />
                    {/* Central PLL Clock Root */}
                    <circle
                      cx="240"
                      cy="170"
                      r="6"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </g>

                  {/* CTS Synchronized Pulse Wavefronts */}
                  {ctsClockAnimation && activeTab === 'die-layout' && (
                    <g>
                      {/* Central Root Pulse Ring */}
                      <circle cx="240" cy="170" r="6" fill="none" stroke="#38bdf8" strokeWidth="2">
                        <animate
                          attributeName="r"
                          values="6; 60; 120"
                          dur="1.4s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.9; 0.4; 0"
                          dur="1.4s"
                          repeatCount="indefinite"
                        />
                      </circle>

                      {/* Traveling Clock Pulse Packets to All 4 Quadrants */}
                      <circle r="3.5" fill="#38bdf8">
                        <animateMotion dur="1.4s" repeatCount="indefinite">
                          <mpath href="#path-cts-branch-tl" />
                        </animateMotion>
                      </circle>
                      <circle r="3.5" fill="#38bdf8">
                        <animateMotion dur="1.4s" repeatCount="indefinite">
                          <mpath href="#path-cts-branch-tr" />
                        </animateMotion>
                      </circle>
                      <circle r="3.5" fill="#38bdf8">
                        <animateMotion dur="1.4s" repeatCount="indefinite">
                          <mpath href="#path-cts-branch-bl" />
                        </animateMotion>
                      </circle>
                      <circle r="3.5" fill="#38bdf8">
                        <animateMotion dur="1.4s" repeatCount="indefinite">
                          <mpath href="#path-cts-branch-br" />
                        </animateMotion>
                      </circle>
                    </g>
                  )}

                  {/* Functional Silicon IP Blocks */}
                  {DIE_BLOCKS.filter((b) => b.id !== 'io-pad-ring').map((block) => {
                    const isSelected = block.id === selectedBlockId;
                    return (
                      <g
                        key={block.id}
                        onClick={() => handleSelectBlock(block.id)}
                        className="cursor-pointer transition-transform duration-200"
                      >
                        <rect
                          x={block.x}
                          y={block.y}
                          width={block.width}
                          height={block.height}
                          rx="6"
                          fill={isSelected ? `${block.color}45` : `${block.color}20`}
                          stroke={block.color}
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          className="hover:opacity-90"
                        />
                        <text
                          x={block.x + 8}
                          y={block.y + 18}
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          {block.name.split(' ')[0]} {block.name.split(' ')[1]}
                        </text>
                        <text
                          x={block.x + 8}
                          y={block.y + 32}
                          fontSize="8"
                          fontFamily="monospace"
                          fill="#94a3b8"
                        >
                          {block.frequency}
                        </text>
                        <text
                          x={block.x + 8}
                          y={block.y + block.height - 8}
                          fontSize="8"
                          fontFamily="monospace"
                          fill={block.color}
                          fontWeight="bold"
                        >
                          {block.areaMm2} mm² | {block.gateCount}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span>Click any block to inspect silicon layout &amp; parameters</span>
                <span className="text-blue-500 font-semibold">
                  {ctsClockAnimation
                    ? 'CTS Skew: 12.4 ps (<15 ps target)'
                    : 'CTS Clock Animation Paused'}
                </span>
              </div>
            </div>

            {/* Right: Selected Block Deep Dive Card (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 font-mono space-y-4">
              <div>
                <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
                  Silicon Block Specification
                </span>
                <h3 className="text-base font-bold text-ink-light dark:text-ink-dark mt-0.5">
                  {selectedBlock.name}
                </h3>
                <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-1 leading-relaxed font-sans">
                  {selectedBlock.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800/80">
                  <span className="text-ink-muted">Die Surface Area:</span>
                  <span className="font-bold text-ink-light dark:text-ink-dark">
                    {selectedBlock.areaMm2} mm²
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800/80">
                  <span className="text-ink-muted">Silicon Complexity:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedBlock.gateCount}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800/80">
                  <span className="text-ink-muted">Operating Clock:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {selectedBlock.frequency}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800/80">
                  <span className="text-ink-muted">BEOL Interconnect Stack:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {selectedBlock.metalLayers}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-ink-muted">Dynamic Power Budget:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {selectedBlock.powerW} W
                  </span>
                </div>
              </div>

              {/* Architectural insight */}
              <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 text-[11px] leading-relaxed text-ink-muted">
                <div className="flex items-center gap-1.5 font-bold text-ink-light dark:text-ink-dark mb-1">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  <span>Physical Signoff Requirement:</span>
                </div>
                <span>
                  {selectedBlock.category === 'cdc'
                    ? 'Requires multi-corner Static Timing Analysis (STA) to guarantee zero setup/hold metastability violations between mismatched clock domains.'
                    : selectedBlock.category === 'clock'
                      ? 'Requires balanced Clock Tree Synthesis (CTS) with shielding ground traces on M7/M8 to eliminate clock jitter and phase noise.'
                      : 'Requires electro-migration (EM) signoff and thermal density hotspot inspection to avoid dielectric breakdown under sustained burst execution.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Silicon 3D Cross-Section & Layer Stack */}
      {activeTab === 'cross-section' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Layered Cross-Section Visualization (7 cols) */}
            <div className="lg:col-span-7 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-slate-950 font-mono text-xs space-y-4">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>VERTICAL INTERCONNECT &amp; TRANSISTOR CROSS-SECTION</span>
                <span className="text-emerald-400 font-bold">EUV 3nm FinFET Stack</span>
              </div>

              {/* Vertical Layer Stack Diagram */}
              <div className="space-y-2 select-none">
                {/* M7-M8 Global Power Grid */}
                {visibleLayers.metalTop && (
                  <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 transition-all">
                    <div className="flex justify-between items-center font-bold text-xs">
                      <span>M7 – M8: Global Thick Metal Mesh (Copper / Ruthenium)</span>
                      <span className="text-[10px] text-amber-400">Thickness: ~850 nm</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Low-resistance power distribution grid (VDD/VSS rails) and global H-tree clock
                      distribution trunks.
                    </div>
                  </div>
                )}

                {/* Vias 5-7 */}
                {visibleLayers.vias && (
                  <div className="h-4 flex items-center justify-center gap-8 text-[9px] text-slate-500 border-x border-dashed border-slate-700">
                    <span>↕ V7 Tungsten Vias</span>
                    <span>↕ V6 Vias</span>
                    <span>↕ V5 Vias</span>
                  </div>
                )}

                {/* M4-M6 Semi-Global Interconnect */}
                {visibleLayers.metalMid && (
                  <div className="p-3 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-300 transition-all">
                    <div className="flex justify-between items-center font-bold text-xs">
                      <span>M4 – M6: Semi-Global Signal Routing</span>
                      <span className="text-[10px] text-blue-400">Pitch: ~40 nm</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      High-density bus lines routing between AI Tensor Core, SRAM cache controllers,
                      and CDC Async FIFOs.
                    </div>
                  </div>
                )}

                {/* Vias 1-3 */}
                {visibleLayers.vias && (
                  <div className="h-4 flex items-center justify-center gap-8 text-[9px] text-slate-500 border-x border-dashed border-slate-700">
                    <span>↕ V3 Vias</span>
                    <span>↕ V2 Vias</span>
                    <span>↕ V1 Local Contact Vias</span>
                  </div>
                )}

                {/* M1-M3 Local Interconnect */}
                {visibleLayers.metalLocal && (
                  <div className="p-3 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 transition-all">
                    <div className="flex justify-between items-center font-bold text-xs">
                      <span>M1 – M3: Local Intra-Cell Interconnect</span>
                      <span className="text-[10px] text-cyan-400">Pitch: ~24 nm</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Nanometer wiring connecting logic gates inside ALU flip-flops, adders, and
                      multiplexers.
                    </div>
                  </div>
                )}

                {/* Polysilicon / High-k Metal Gates (HKMG) */}
                {visibleLayers.polyGate && (
                  <div className="p-3 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-300 transition-all">
                    <div className="flex justify-between items-center font-bold text-xs">
                      <span>Gate Electrode: High-k Metal Gate (HKMG, HfO2 + TiN)</span>
                      <span className="text-[10px] text-purple-400">Gate Length: 12 nm</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Wraps around vertical 3D silicon fins on 3 sides to prevent quantum tunneling
                      and sub-threshold leakage current.
                    </div>
                  </div>
                )}

                {/* FinFET 3D Channels & Diffusion */}
                {visibleLayers.diffusion && (
                  <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 transition-all">
                    <div className="flex justify-between items-center font-bold text-xs">
                      <span>Active Layer: 3D FinFET Channels &amp; SiGe Source/Drain</span>
                      <span className="text-[10px] text-emerald-400">Fin Width: 6 nm</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Epitaxial silicon-germanium lattice induces mechanical strain to boost
                      electron and hole mobility.
                    </div>
                  </div>
                )}

                {/* Bulk Silicon Substrate */}
                {visibleLayers.substrate && (
                  <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 transition-all">
                    <div className="flex justify-between items-center font-bold text-xs">
                      <span>Base: P-Type Monocrystalline Silicon Substrate</span>
                      <span className="text-[10px] text-slate-400">300 mm Silicon Ingot Wafer</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Shallow Trench Isolation (STI) silicon dioxide oxide wells isolating adjacent
                      NMOS and PMOS transistors.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Layer Deconstruction Controls (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 font-mono text-xs space-y-4">
              <div>
                <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
                  FIB Layer Inspection Controls
                </span>
                <h3 className="text-base font-bold text-ink-light dark:text-ink-dark mt-0.5">
                  Peel Back Silicon Layers
                </h3>
                <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-1 leading-relaxed font-sans">
                  Toggle individual physical layers to inspect the Back-End-of-Line (BEOL) metal
                  stacks and Front-End-of-Line (FEOL) FinFET gate structures.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-parchment-200 dark:border-parchment-800">
                <button
                  onClick={() => toggleLayer('metalTop')}
                  className={clsx(
                    'w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left',
                    visibleLayers.metalTop
                      ? 'border-amber-400 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <span>M7–M8 Power Grid Mesh</span>
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => toggleLayer('metalMid')}
                  className={clsx(
                    'w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left',
                    visibleLayers.metalMid
                      ? 'border-blue-400 bg-blue-500/10 text-blue-800 dark:text-blue-300 font-bold'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <span>M4–M6 Semi-Global Buses</span>
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => toggleLayer('metalLocal')}
                  className={clsx(
                    'w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left',
                    visibleLayers.metalLocal
                      ? 'border-cyan-400 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 font-bold'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <span>M1–M3 Local Gate Wiring</span>
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => toggleLayer('polyGate')}
                  className={clsx(
                    'w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left',
                    visibleLayers.polyGate
                      ? 'border-purple-400 bg-purple-500/10 text-purple-800 dark:text-purple-300 font-bold'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <span>High-k Metal Gates (HKMG)</span>
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => toggleLayer('diffusion')}
                  className={clsx(
                    'w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left',
                    visibleLayers.diffusion
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <span>FinFET 3D Channels</span>
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => toggleLayer('substrate')}
                  className={clsx(
                    'w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left',
                    visibleLayers.substrate
                      ? 'border-slate-400 bg-slate-500/10 text-slate-800 dark:text-slate-300 font-bold'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  <span>P-Type Silicon Substrate</span>
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Interactive 3D FinFET Gate Inspector */}
              <div className="p-4 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 space-y-3 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-500" />
                    <span>3D FinFET Gate Voltage</span>
                  </span>
                  <span
                    className={clsx(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      isChannelConducting
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-slate-500/15 text-slate-500'
                    )}
                  >
                    {isChannelConducting ? 'ON (INVERSION)' : 'OFF (SUBTHRESHOLD)'}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] text-ink-muted mb-1">
                    <span>Gate Voltage (Vg):</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {gateVoltage.toFixed(2)} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.9"
                    step="0.05"
                    value={gateVoltage}
                    onChange={(e) => {
                      playTick();
                      setGateVoltage(Number(e.target.value));
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-ink-muted mt-0.5">
                    <span>0.0V (Cutoff)</span>
                    <span className="text-amber-500 font-bold">Vth = 0.35V</span>
                    <span>0.9V (Sat)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-parchment-100 dark:border-parchment-800 flex items-center justify-between text-[10px]">
                  <span className="text-ink-muted">Drain Current (Id):</span>
                  <span
                    className={clsx(
                      'font-bold',
                      isChannelConducting
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500'
                    )}
                  >
                    {drainCurrentMa < 0.001
                      ? `${(drainCurrentMa * 1000000).toFixed(1)} nA (Leakage)`
                      : `${drainCurrentMa.toFixed(2)} mA (Drive)`}
                  </span>
                </div>

                {/* 3D FinFET Channel SVG */}
                <div className="w-full bg-slate-950 rounded-lg p-2 border border-slate-800">
                  <svg viewBox="0 0 240 85" className="w-full h-auto">
                    <defs>
                      <path id="path-electron-flow" d="M 30 45 L 210 45" />
                    </defs>
                    {/* Source Region */}
                    <rect
                      x="15"
                      y="25"
                      width="45"
                      height="40"
                      rx="3"
                      fill="#1e293b"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <text
                      x="37"
                      y="48"
                      textAnchor="middle"
                      fontSize="7"
                      fontWeight="bold"
                      fill="#38bdf8"
                    >
                      SOURCE
                    </text>

                    {/* Fin Channel */}
                    <rect
                      x="60"
                      y="35"
                      width="120"
                      height="20"
                      fill={isChannelConducting ? '#10b98130' : '#0f172a'}
                      stroke="#10b981"
                      strokeWidth="1"
                    />

                    {/* High-k Metal Gate Wrapping 3 Sides */}
                    <rect
                      x="95"
                      y="15"
                      width="50"
                      height="60"
                      rx="4"
                      fill="#8b5cf630"
                      stroke="#8b5cf6"
                      strokeWidth="1.5"
                      strokeDasharray={isChannelConducting ? 'none' : '2 2'}
                    />
                    <text
                      x="120"
                      y="28"
                      textAnchor="middle"
                      fontSize="7"
                      fontWeight="bold"
                      fill="#a855f7"
                    >
                      GATE
                    </text>

                    {/* Drain Region */}
                    <rect
                      x="180"
                      y="25"
                      width="45"
                      height="40"
                      rx="3"
                      fill="#1e293b"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <text
                      x="202"
                      y="48"
                      textAnchor="middle"
                      fontSize="7"
                      fontWeight="bold"
                      fill="#38bdf8"
                    >
                      DRAIN
                    </text>

                    {/* Animated Electron Drift Particles when ON */}
                    {isChannelConducting && activeTab === 'cross-section' && (
                      <>
                        <circle r="2" fill="#38bdf8">
                          <animateMotion dur="0.8s" repeatCount="indefinite">
                            <mpath href="#path-electron-flow" />
                          </animateMotion>
                        </circle>
                        <circle r="2" fill="#38bdf8">
                          <animateMotion dur="0.8s" begin="0.4s" repeatCount="indefinite">
                            <mpath href="#path-electron-flow" />
                          </animateMotion>
                        </circle>
                      </>
                    )}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Standard Cell GDSII Layout */}
      {activeTab === 'cell-layout' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: GDSII Mask Layout Canvas (7 cols) */}
            <div className="lg:col-span-7 p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-slate-950 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>D-FLIP-FLOP STANDARD CELL GDSII MASK LAYOUT</span>
                <span className="text-purple-400 font-bold">DFF_X1 CELL (7-TRACK)</span>
              </div>

              {/* Standard cell SVG diagram */}
              <div className="w-full bg-slate-900 rounded-xl p-4 border border-slate-800 relative">
                <svg viewBox="0 0 400 240" className="w-full h-auto drop-shadow-sm select-none">
                  {/* VDD Power Rail (Top) */}
                  <rect x="10" y="10" width="380" height="20" fill="#3b82f6" opacity="0.8" />
                  <text x="20" y="24" fontSize="10" fill="#ffffff" fontWeight="bold">
                    VDD POWER RAIL (M1)
                  </text>

                  {/* N-Well Diffusion Region (PMOS top half) */}
                  <rect
                    x="20"
                    y="38"
                    width="360"
                    height="70"
                    fill="#a855f7"
                    opacity="0.25"
                    stroke="#a855f7"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text x="30" y="52" fontSize="9" fill="#c084fc">
                    N-WELL (PMOS P+ DIFFUSION)
                  </text>

                  {/* Substrate Region (NMOS bottom half) */}
                  <rect
                    x="20"
                    y="125"
                    width="360"
                    height="70"
                    fill="#10b981"
                    opacity="0.2"
                    stroke="#10b981"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text x="30" y="139" fontSize="9" fill="#34d399">
                    P-SUBSTRATE (NMOS N+ DIFFUSION)
                  </text>

                  {/* VSS Ground Rail (Bottom) */}
                  <rect x="10" y="210" width="380" height="20" fill="#64748b" opacity="0.8" />
                  <text x="20" y="224" fontSize="10" fill="#ffffff" fontWeight="bold">
                    VSS GROUND RAIL (M1)
                  </text>

                  {/* Vertical Polysilicon Gates (Red) */}
                  {[70, 120, 170, 220, 270, 320].map((gx, idx) => (
                    <g key={idx}>
                      <rect
                        x={gx}
                        y="30"
                        width="12"
                        height="175"
                        fill="#ef4444"
                        opacity="0.85"
                        rx="1.5"
                      />
                      <circle cx={gx + 6} cy="75" r="3" fill="#ffffff" />
                      <circle cx={gx + 6} cy="160" r="3" fill="#ffffff" />
                    </g>
                  ))}

                  {/* Pin Contacts */}
                  <rect x="60" y="98" width="30" height="16" fill="#f59e0b" rx="2" />
                  <text x="68" y="110" fontSize="9" fill="#000000" fontWeight="bold">
                    D
                  </text>

                  <rect x="160" y="98" width="30" height="16" fill="#f59e0b" rx="2" />
                  <text x="165" y="110" fontSize="8" fill="#000000" fontWeight="bold">
                    CLK
                  </text>

                  <rect x="310" y="98" width="30" height="16" fill="#38bdf8" rx="2" />
                  <text x="318" y="110" fontSize="9" fill="#000000" fontWeight="bold">
                    Q
                  </text>
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Red: Poly Gate • Blue: VDD • Slate: VSS • Gold: Pins</span>
                <span className="text-emerald-400">Standard Master-Slave Flip-Flop</span>
              </div>
            </div>

            {/* Right: Cell Architecture Details (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 font-mono text-xs space-y-4">
              <div>
                <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
                  Library Cell Anatomy
                </span>
                <h3 className="text-base font-bold text-ink-light dark:text-ink-dark mt-0.5">
                  D-Flip-Flop (DFF_X1)
                </h3>
                <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-1 leading-relaxed font-sans">
                  The fundamental state-storage element used in registers, ALU pipelines, and 2-FF
                  clock domain crossing synchronizers.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-parchment-200 dark:border-parchment-800">
                <div className="p-2.5 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
                  <div className="font-bold text-ink-light dark:text-ink-dark">
                    Master Latch Stage:
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    Captures input D when CLK is low; holds state in feedback inverter loop.
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
                  <div className="font-bold text-ink-light dark:text-ink-dark">
                    Slave Latch Stage:
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    Transfers captured bit to output Q on rising clock edge; isolates output from D
                    input changes.
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
                  <div className="font-bold text-rose-600 dark:text-rose-400">
                    Setup/Hold Window (t_setup / t_hold):
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    If signal D transitions inside this 0.12ns window, the master transmission gate
                    cannot cleanly charge the internal node, causing metastability!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: Tapeout Pipeline (RTL to Silicon) */}
      {activeTab === 'flow' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TAPE_OUT_STEPS.map((step) => (
              <div
                key={step.step}
                className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 font-mono text-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-ink-muted mb-1.5">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      PHASE {step.step}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-parchment-200 dark:bg-parchment-800 text-ink-muted truncate max-w-[130px]">
                      {step.tooling}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                    {step.title}
                  </h4>
                  <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-1 leading-relaxed font-sans">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-parchment-200 dark:border-parchment-800/80 flex items-center justify-between text-[10px] text-ink-muted">
                  <span>Signoff Milestone</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 5: 2.5D/3D Chiplet & Advanced Packaging Architecture */}
      {activeTab === 'advanced-packaging' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="font-bold text-ink-light dark:text-ink-dark">
                2.5D / 3D HETEROGENEOUS CHIPLET &amp; HBM3E ADVANCED PACKAGING
              </span>
            </div>
            <div className="text-ink-muted">
              CoWoS-S / CoWoS-L • Through-Silicon Vias (TSV) • Hybrid Bonding (SoIC)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            {/* Packaging Tech 1: TSMC CoWoS */}
            <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-ink-muted">
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase">
                  TSMC CoWoS-S / L
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/20">
                  2.5D Interposer
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                Chip-on-Wafer-on-Substrate
              </h4>
              <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                Full-wafer passive silicon interposer with deep trench capacitors (DTC) and dense
                sub-micron copper redistribution lines (RDL) bridging compute and memory.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Line / Space:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    0.8 µm / 0.8 µm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Interposer Size:</span>
                  <span className="font-bold">Up to 3.3× Reticle limit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Power Penalty:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    &lt; 0.5 pJ / bit
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Target IP:</span>
                  <span className="font-bold text-ink-muted">NVIDIA Blackwell / TPU v5p</span>
                </div>
              </div>
            </div>

            {/* Packaging Tech 2: HBM3e Stack */}
            <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-ink-muted">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  HBM3e Memory Cube
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                  3D DRAM Stack
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                12-High TSV DRAM Stack
              </h4>
              <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                Twelve DRAM silicon dies thinned down to 40 µm, interconnected by over 5,000
                Through-Silicon Vias (TSVs) over an active base logic controller die.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Bandwidth / Stack:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    1.2 TB / s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Bus Width:</span>
                  <span className="font-bold">1024-bit wide interface</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Microbump Pitch:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    35 µm solder bump
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Capacity:</span>
                  <span className="font-bold text-ink-muted">36 GB per 12-Hi stack</span>
                </div>
              </div>
            </div>

            {/* Packaging Tech 3: Intel EMIB */}
            <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-ink-muted">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                  Intel EMIB
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/20">
                  Embedded Bridge
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                Embedded Multi-Die Interconnect
              </h4>
              <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                Tiny silicon bridge chips embedded directly inside standard organic package
                substrate cavity, bridging chiplet edges without expensive full interposers.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Bump Pitch:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">55 µm ➔ 45 µm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Package Yield:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Higher than CoWoS
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Warpage Risk:</span>
                  <span className="font-bold">Low (No large interposer)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Target IP:</span>
                  <span className="font-bold text-ink-muted">Intel Xeon / Gaudi AI</span>
                </div>
              </div>
            </div>

            {/* Packaging Tech 4: Direct Hybrid Bonding */}
            <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-ink-muted">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                  Hybrid Bonding (SoIC)
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/20">
                  True 3D Wafer-on-Wafer
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                Direct Copper-to-Copper (Cu-Cu)
              </h4>
              <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                Solderless direct atomic bonding of copper pads and dielectric interface at room
                temperature, eliminating solder microbumps completely.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Pad Pitch:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    &lt; 1 µm (Sub-micron)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Density Gain:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    10,000× vs Microbumps
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Parasitics:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    &lt; 0.1 fF capacitance
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Target IP:</span>
                  <span className="font-bold text-ink-muted">AMD 3D V-Cache (SRAM stack)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
