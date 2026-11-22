import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  X,
  Clock,
  Search,
  Route,
  Database,
  Bot,
  Microchip,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import {
  Lesson,
  TrackId,
  NavigationTab,
  ModuleId,
  RouteModuleId,
  QueryModuleId,
  ActuateModuleId,
  SiliconModuleId,
} from '../types';
import { Language, TRANSLATIONS } from '../i18n/translations';
import clsx from 'clsx';

interface Props {
  lessons: Lesson[];
  activeLessonId: string;
  onSelectLesson: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectSystemsModule?: (tab: NavigationTab, moduleId: ModuleId) => void;
  currentSuiteTab?: NavigationTab;
  activeRouteModule?: RouteModuleId;
  activeQueryModule?: QueryModuleId;
  activeActuateModule?: ActuateModuleId;
  activeSiliconModule?: SiliconModuleId;
}

interface SystemsModuleItem {
  id: ModuleId;
  trackId: 'route' | 'query' | 'actuate' | 'silicon';
  number: string;
  title: string;
  subtitle: string;
  duration: string;
  stepCountText: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  keyConcepts: string[];
}

const SYSTEMS_MODULES: readonly SystemsModuleItem[] = [
  // Track 01: Route (Network & Distributed Systems)
  {
    id: 'url-lifecycle',
    trackId: 'route',
    number: '01',
    title: 'The Life of a URL Request',
    subtitle: 'Internet Plumbing & Packet Lifecycles',
    duration: '10 min',
    stepCountText: '8 steps',
    level: 'Intermediate',
    keyConcepts: [
      'DNS',
      'TCP 3-Way Handshake',
      'TLS 1.3',
      'HTTP/2',
      'CDN',
      'Anycast',
      'ARP',
      'IP Routing',
    ],
  },
  {
    id: 'tcp-congestion',
    trackId: 'route',
    number: '02',
    title: 'TCP Congestion: BBR vs Cubic',
    subtitle: 'Congestion Control, Loss vs Delay & Bufferbloat',
    duration: '8 min',
    stepCountText: '6 steps',
    level: 'Intermediate',
    keyConcepts: [
      'BBR',
      'Cubic',
      'AIMD',
      'Bufferbloat',
      'Packet Loss',
      'BtlBw',
      'RTprop',
      'Bottleneck Bandwidth',
    ],
  },
  {
    id: 'http-race',
    trackId: 'route',
    number: '03',
    title: 'HTTP Head-of-Line Blocking',
    subtitle: 'HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)',
    duration: '8 min',
    stepCountText: '6 steps',
    level: 'Intermediate',
    keyConcepts: [
      'Head-of-Line Blocking',
      'HTTP/2 Multiplexing',
      'QUIC',
      'UDP Streams',
      'Connection Migration',
      'TCP HOL',
    ],
  },
  {
    id: 'napkin-math',
    trackId: 'route',
    number: '04',
    title: 'Napkin Math Capacity Planning',
    subtitle: 'From Product Idea to Servers, Bandwidth & Storage',
    duration: '10 min',
    stepCountText: '7 steps',
    level: 'Intermediate',
    keyConcepts: [
      'Orders of Magnitude',
      'QPS Estimation',
      'Server Headroom',
      'Cache Sizing',
      'Durable Storage Growth',
      'Redis RAM',
    ],
  },

  // Track 02: Query (Storage Engines & Distributed Databases)
  {
    id: 'lsm-tree',
    trackId: 'query',
    number: '05',
    title: 'Log-Structured Merge Tree',
    subtitle: 'Write-Optimized Storage: RocksDB & Cassandra',
    duration: '8 min',
    stepCountText: '6 steps',
    level: 'Advanced',
    keyConcepts: [
      'MemTable',
      'Write-Ahead Log (WAL)',
      'SSTable',
      'Compaction',
      'Bloom Filter',
      'Write Amplification',
    ],
  },
  {
    id: 'bplus-tree',
    trackId: 'query',
    number: '06',
    title: 'B+ Tree Page Splits & Concurrency',
    subtitle: 'Relational Indexing: PostgreSQL & MySQL InnoDB',
    duration: '8 min',
    stepCountText: '6 steps',
    level: 'Advanced',
    keyConcepts: [
      'B+ Tree',
      'Page Splits',
      'High Fan-Out',
      'Leaf Node Pointers',
      'InnoDB',
      'Sequential Range Scan',
    ],
  },
  {
    id: 'acid-isolation',
    trackId: 'query',
    number: '06b',
    title: 'ACID Isolation & Anomaly Matrix',
    subtitle: 'Dirty Reads, Non-Repeatable Reads & Phantom Records',
    duration: '7 min',
    stepCountText: '4 levels',
    level: 'Advanced',
    keyConcepts: [
      'ACID',
      'Read Committed',
      'Repeatable Read',
      'Serializable',
      'Dirty Reads',
      'Phantom Rows',
      'Write Skew',
    ],
  },

  // Track 03: Actuate (Robotics & Physical AI)
  {
    id: 'pid-control-loop',
    trackId: 'actuate',
    number: '07',
    title: 'PID Closed-Loop Motion Control',
    subtitle: 'Feedback Tuning, Overshoot & Windup Guard',
    duration: '9 min',
    stepCountText: '6 steps',
    level: 'Intermediate',
    keyConcepts: [
      'PID Controller',
      'Proportional Gain (Kp)',
      'Integral Gain (Ki)',
      'Derivative Gain (Kd)',
      'Anti-Windup',
      'Overshoot',
    ],
  },
  {
    id: 'ros2-teleoperation',
    trackId: 'actuate',
    number: '08',
    title: 'ROS 2 Real-Time Teleoperation',
    subtitle: 'DDS QoS Deadlines & Buffer Bloat',
    duration: '8 min',
    stepCountText: '5 steps',
    level: 'Advanced',
    keyConcepts: [
      'ROS 2',
      'DDS',
      'QoS Policies',
      'Best-Effort vs Reliable',
      'Zenoh Router',
      'Network Jitter',
      'Bufferbloat',
    ],
  },
  {
    id: 'inverse-kinematics',
    trackId: 'actuate',
    number: '09',
    title: 'Inverse Kinematics & Jacobians',
    subtitle: 'Geometric Damped Least Squares & Singularities',
    duration: '7 min',
    stepCountText: '4 steps',
    level: 'Advanced',
    keyConcepts: [
      'Inverse Kinematics',
      'Jacobian Matrix',
      'Damped Least Squares (DLS)',
      'Kinematic Singularity',
      'Degrees of Freedom',
    ],
  },
  {
    id: 'foc-motor-control',
    trackId: 'actuate',
    number: '10',
    title: 'Field Oriented Motor Control (FOC)',
    subtitle: 'Clarke/Park Transforms & Space Vector PWM',
    duration: '8 min',
    stepCountText: '5 steps',
    level: 'Advanced',
    keyConcepts: [
      'Clarke Transform',
      'Park Transform',
      'Space Vector PWM (SVPWM)',
      'Id/Iq Decoupling',
      'PMSM/BLDC Inverter',
    ],
  },
  {
    id: 'actuator-structure',
    trackId: 'actuate',
    number: '10b',
    title: 'Actuator Anatomy & Gearing',
    subtitle: 'Harmonic Reducers, Cycloidal Drives & Stator/Rotor Flux',
    duration: '8 min',
    stepCountText: '3 modes',
    level: 'Advanced',
    keyConcepts: [
      'Harmonic Drive',
      'Cycloidal Reducer',
      'Zero Backlash',
      'Stator/Rotor Flux',
      'Torque Power Cascade',
      'CAD Assembly',
    ],
  },

  // Track 04: Tapeout (VLSI & Pre-Silicon Emulation)
  {
    id: 'uvm-verification',
    trackId: 'silicon',
    number: '11',
    title: 'UVM Hardware Verification Engine',
    subtitle: 'Coverage-Driven Constrained Random Tests',
    duration: '8 min',
    stepCountText: '5 steps',
    level: 'Advanced',
    keyConcepts: [
      'Universal Verification Methodology (UVM)',
      'Constrained Random Testing',
      'Functional Coverage Bins',
      'Scoreboard & Driver',
      'SystemVerilog',
    ],
  },
  {
    id: 'pre-silicon-emulation',
    trackId: 'silicon',
    number: '12',
    title: 'Pre-Silicon FPGA Emulation',
    subtitle: 'Multi-Clock Synchronizers & MTBF',
    duration: '7 min',
    stepCountText: '4 steps',
    level: 'Advanced',
    keyConcepts: [
      'FPGA Emulation',
      'Clock Domain Crossing (CDC)',
      '2-FF Synchronizer',
      'Asynchronous FIFO',
      'Metastability & MTBF',
    ],
  },
  {
    id: 'riscv-pipeline',
    trackId: 'silicon',
    number: '13',
    title: 'RISC-V 5-Stage Pipelined Core',
    subtitle: 'Data Forwarding, Stalls & Control Branch Flushes',
    duration: '8 min',
    stepCountText: '5 steps',
    level: 'Advanced',
    keyConcepts: [
      '5-Stage Pipeline (IF/ID/EX/MEM/WB)',
      'Data Forwarding Bypass',
      'Load-Use Hazard Stall',
      'Control Branch Flush',
      'Hardware Bubbles',
    ],
  },
  {
    id: 'silicon-structure',
    trackId: 'silicon',
    number: '13b',
    title: 'Silicon Structure & Die Layout',
    subtitle: 'Wafer Floorplanning, Metal Interconnect Stack & GAA Transistors',
    duration: '8 min',
    stepCountText: '3 modes',
    level: 'Advanced',
    keyConcepts: [
      '300mm Silicon Wafer',
      'Die Floorplan',
      '14-Layer Metal Stack (M1–M14)',
      'RC Wire Delay',
      'GAA Nanosheet Transistors',
    ],
  },
];

type TrackCategoryFilter = 'all' | 'security' | 'route' | 'query' | 'actuate' | 'silicon';

export const LessonSidebar: React.FC<Props> = ({
  lessons,
  activeLessonId,
  onSelectLesson,
  isOpen,
  onClose,
  lang,
  onSelectSystemsModule,
  currentSuiteTab = 'security',
  activeRouteModule = 'url-lifecycle',
  activeQueryModule = 'lsm-tree',
  activeActuateModule = 'pid-control-loop',
  activeSiliconModule = 'uvm-verification',
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TrackCategoryFilter>('all');
  const t = TRANSLATIONS[lang];

  // Reset filters when sidebar opens so all tracks (Route, Query, Actuate, Silicon, Security) are readily available
  useEffect(() => {
    if (isOpen) {
      setFilterText('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Security Tracks definition
  const securityTrackGroups = useMemo(
    () => [
      {
        id: 'auth' as TrackId,
        title: t.trackAuth,
        color: 'text-indigo-600 dark:text-indigo-400',
        badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
      },
      {
        id: 'exploits' as TrackId,
        title: t.trackExploits,
        color: 'text-rose-600 dark:text-rose-400',
        badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
      },
      {
        id: 'architecture' as TrackId,
        title: t.trackArch,
        color: 'text-blue-600 dark:text-blue-400',
        badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      },
      {
        id: 'crypto' as TrackId,
        title: t.trackCrypto,
        color: 'text-purple-600 dark:text-purple-400',
        badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      },
    ],
    [t]
  );

  // Filtered Security Lessons
  const filteredSecurityLessons = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return lessons.filter((l) => {
      if (selectedCategory !== 'all' && selectedCategory !== 'security') return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        l.subtitle.toLowerCase().includes(q) ||
        l.trackTitle.toLowerCase().includes(q) ||
        l.keyConcepts.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [lessons, filterText, selectedCategory]);

  // Filtered Systems Modules
  const filteredSystemsModules = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return SYSTEMS_MODULES.filter((m) => {
      if (selectedCategory !== 'all' && selectedCategory !== m.trackId) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.number.toLowerCase().includes(q) ||
        m.trackId.toLowerCase().includes(q) ||
        m.keyConcepts.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [filterText, selectedCategory]);

  // Total matching count across all modules
  const totalMatchingCount = filteredSecurityLessons.length + filteredSystemsModules.length;

  // Counts per category for the filter chips (based on current search query)
  const categoryCounts = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const countCategory = (cat: TrackCategoryFilter) => {
      if (cat === 'all') {
        const sec = lessons.filter(
          (l) =>
            !q ||
            l.title.toLowerCase().includes(q) ||
            l.subtitle.toLowerCase().includes(q) ||
            l.keyConcepts.some((c) => c.toLowerCase().includes(q))
        ).length;
        const sys = SYSTEMS_MODULES.filter(
          (m) =>
            !q ||
            m.title.toLowerCase().includes(q) ||
            m.subtitle.toLowerCase().includes(q) ||
            m.number.toLowerCase().includes(q) ||
            m.keyConcepts.some((c) => c.toLowerCase().includes(q))
        ).length;
        return sec + sys;
      }
      if (cat === 'security') {
        return lessons.filter(
          (l) =>
            !q ||
            l.title.toLowerCase().includes(q) ||
            l.subtitle.toLowerCase().includes(q) ||
            l.keyConcepts.some((c) => c.toLowerCase().includes(q))
        ).length;
      }
      return SYSTEMS_MODULES.filter(
        (m) =>
          m.trackId === cat &&
          (!q ||
            m.title.toLowerCase().includes(q) ||
            m.subtitle.toLowerCase().includes(q) ||
            m.number.toLowerCase().includes(q) ||
            m.keyConcepts.some((c) => c.toLowerCase().includes(q)))
      ).length;
    };

    return {
      all: countCategory('all'),
      security: countCategory('security'),
      route: countCategory('route'),
      query: countCategory('query'),
      actuate: countCategory('actuate'),
      silicon: countCategory('silicon'),
    };
  }, [lessons, filterText]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for outside-click dismissal on mobile & desktop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 left-0 z-50 w-84 sm:w-96 md:w-[460px] max-w-[90vw] bg-parchment-100 dark:bg-parchment-950 border-r border-parchment-200 dark:border-parchment-800 shadow-2xl flex flex-col transition-transform duration-300 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-parchment-200 dark:border-parchment-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif font-bold text-base text-ink-light dark:text-ink-dark block leading-none">
                {t.courseIndex}
              </span>
              <span className="text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted mt-1 block">
                39 Interactive Modules across 5 Tracks
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-parchment-200 dark:hover:bg-parchment-800 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors cursor-pointer"
            aria-label="Close Course Index"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search Field */}
        <div className="p-3 border-b border-parchment-200 dark:border-parchment-800 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-ink-muted" />
            <input
              type="text"
              placeholder="Search all 39 modules (e.g. PKCE, BBR, LSM, PID, FOC, RISC-V)..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-base sm:text-xs font-mono rounded-xl bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark focus:outline-none focus:border-blue-500 shadow-xs"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-2.5 top-2.5 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark p-0.5 rounded cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Track Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 touch-scroll">
            {(
              [
                { id: 'all', label: t.filterAll || 'All', count: categoryCounts.all },
                { id: 'security', label: 'Security', count: categoryCounts.security },
                { id: 'route', label: 'Route', count: categoryCounts.route },
                { id: 'query', label: 'Query', count: categoryCounts.query },
                { id: 'actuate', label: 'Actuate', count: categoryCounts.actuate },
                { id: 'silicon', label: 'Tapeout', count: categoryCounts.silicon },
              ] as const
            ).map((chip) => {
              const isSelected = selectedCategory === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setSelectedCategory(chip.id)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border min-h-[30px]',
                    isSelected
                      ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                      : 'border-parchment-300 dark:border-parchment-700 text-ink-muted dark:text-ink-darkMuted hover:bg-parchment-200 dark:hover:bg-parchment-800'
                  )}
                >
                  <span>{chip.label}</span>
                  <span
                    className={clsx(
                      'text-[9px] px-1 py-0.2 rounded-full font-bold',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-parchment-200 dark:bg-parchment-800 text-ink-muted'
                    )}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modules List (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {totalMatchingCount === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-parchment-200 dark:bg-parchment-800 flex items-center justify-center mx-auto text-ink-muted">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
                No modules found matching &ldquo;{filterText}&rdquo;
              </p>
              <button
                onClick={() => {
                  setFilterText('');
                  setSelectedCategory('all');
                }}
                className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition-colors shadow-xs"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <>
              {/* SECTION: Track 01 Route */}
              {(selectedCategory === 'all' || selectedCategory === 'route') &&
                filteredSystemsModules.some((m) => m.trackId === 'route') && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold px-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Route className="w-3.5 h-3.5" />
                        Track 01: Route (Network & Distributed Systems)
                      </span>
                      <span className="text-[10px] opacity-75">
                        ({filteredSystemsModules.filter((m) => m.trackId === 'route').length})
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {filteredSystemsModules
                        .filter((m) => m.trackId === 'route')
                        .map((mod) => {
                          const isActive =
                            currentSuiteTab === 'route' && activeRouteModule === mod.id;
                          return (
                            <button
                              key={mod.id}
                              onClick={() => {
                                onSelectSystemsModule?.('route', mod.id);
                                onClose();
                              }}
                              className={clsx(
                                'w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 border cursor-pointer min-h-[56px]',
                                isActive
                                  ? 'bg-white dark:bg-parchment-900 border-cyan-500/50 shadow-sm ring-1 ring-cyan-500/30'
                                  : 'border-transparent hover:bg-parchment-200/60 dark:hover:bg-parchment-900/40'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 shrink-0">
                                    {mod.number}
                                  </span>
                                  <span
                                    className={clsx(
                                      'text-xs font-serif font-bold truncate',
                                      isActive
                                        ? 'text-cyan-700 dark:text-cyan-400'
                                        : 'text-ink-light dark:text-ink-dark'
                                    )}
                                  >
                                    {mod.title}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                  {mod.level}
                                </span>
                              </div>

                              <p className="text-[10px] font-sans text-ink-muted dark:text-ink-darkMuted line-clamp-1 pl-7">
                                {mod.subtitle}
                              </p>

                              <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted pl-7">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> {mod.duration}
                                </span>
                                <span>•</span>
                                <span>{mod.stepCountText}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

              {/* SECTION: Track 02 Query */}
              {(selectedCategory === 'all' || selectedCategory === 'query') &&
                filteredSystemsModules.some((m) => m.trackId === 'query') && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold px-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        Track 02: Query (Storage Engines & Databases)
                      </span>
                      <span className="text-[10px] opacity-75">
                        ({filteredSystemsModules.filter((m) => m.trackId === 'query').length})
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {filteredSystemsModules
                        .filter((m) => m.trackId === 'query')
                        .map((mod) => {
                          const isActive =
                            currentSuiteTab === 'query' && activeQueryModule === mod.id;
                          return (
                            <button
                              key={mod.id}
                              onClick={() => {
                                onSelectSystemsModule?.('query', mod.id);
                                onClose();
                              }}
                              className={clsx(
                                'w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 border cursor-pointer min-h-[56px]',
                                isActive
                                  ? 'bg-white dark:bg-parchment-900 border-purple-500/50 shadow-sm ring-1 ring-purple-500/30'
                                  : 'border-transparent hover:bg-parchment-200/60 dark:hover:bg-parchment-900/40'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 shrink-0">
                                    {mod.number}
                                  </span>
                                  <span
                                    className={clsx(
                                      'text-xs font-serif font-bold truncate',
                                      isActive
                                        ? 'text-purple-700 dark:text-purple-400'
                                        : 'text-ink-light dark:text-ink-dark'
                                    )}
                                  >
                                    {mod.title}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 bg-purple-500/10 text-purple-700 dark:text-purple-400">
                                  {mod.level}
                                </span>
                              </div>

                              <p className="text-[10px] font-sans text-ink-muted dark:text-ink-darkMuted line-clamp-1 pl-7">
                                {mod.subtitle}
                              </p>

                              <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted pl-7">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> {mod.duration}
                                </span>
                                <span>•</span>
                                <span>{mod.stepCountText}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

              {/* SECTION: Track 03 Actuate */}
              {(selectedCategory === 'all' || selectedCategory === 'actuate') &&
                filteredSystemsModules.some((m) => m.trackId === 'actuate') && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold px-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" />
                        Track 03: Actuate (Robotics & Physical AI)
                      </span>
                      <span className="text-[10px] opacity-75">
                        ({filteredSystemsModules.filter((m) => m.trackId === 'actuate').length})
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {filteredSystemsModules
                        .filter((m) => m.trackId === 'actuate')
                        .map((mod) => {
                          const isActive =
                            currentSuiteTab === 'actuate' && activeActuateModule === mod.id;
                          return (
                            <button
                              key={mod.id}
                              onClick={() => {
                                onSelectSystemsModule?.('actuate', mod.id);
                                onClose();
                              }}
                              className={clsx(
                                'w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 border cursor-pointer min-h-[56px]',
                                isActive
                                  ? 'bg-white dark:bg-parchment-900 border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                                  : 'border-transparent hover:bg-parchment-200/60 dark:hover:bg-parchment-900/40'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0">
                                    {mod.number}
                                  </span>
                                  <span
                                    className={clsx(
                                      'text-xs font-serif font-bold truncate',
                                      isActive
                                        ? 'text-amber-700 dark:text-amber-400'
                                        : 'text-ink-light dark:text-ink-dark'
                                    )}
                                  >
                                    {mod.title}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                  {mod.level}
                                </span>
                              </div>

                              <p className="text-[10px] font-sans text-ink-muted dark:text-ink-darkMuted line-clamp-1 pl-7">
                                {mod.subtitle}
                              </p>

                              <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted pl-7">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> {mod.duration}
                                </span>
                                <span>•</span>
                                <span>{mod.stepCountText}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

              {/* SECTION: Track 04 Tapeout / Silicon */}
              {(selectedCategory === 'all' || selectedCategory === 'silicon') &&
                filteredSystemsModules.some((m) => m.trackId === 'silicon') && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold px-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Microchip className="w-3.5 h-3.5" />
                        Track 04: Tapeout (VLSI & Silicon Emulation)
                      </span>
                      <span className="text-[10px] opacity-75">
                        ({filteredSystemsModules.filter((m) => m.trackId === 'silicon').length})
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {filteredSystemsModules
                        .filter((m) => m.trackId === 'silicon')
                        .map((mod) => {
                          const isActive =
                            currentSuiteTab === 'silicon' && activeSiliconModule === mod.id;
                          return (
                            <button
                              key={mod.id}
                              onClick={() => {
                                onSelectSystemsModule?.('silicon', mod.id);
                                onClose();
                              }}
                              className={clsx(
                                'w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 border cursor-pointer min-h-[56px]',
                                isActive
                                  ? 'bg-white dark:bg-parchment-900 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                                  : 'border-transparent hover:bg-parchment-200/60 dark:hover:bg-parchment-900/40'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0">
                                    {mod.number}
                                  </span>
                                  <span
                                    className={clsx(
                                      'text-xs font-serif font-bold truncate',
                                      isActive
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-ink-light dark:text-ink-dark'
                                    )}
                                  >
                                    {mod.title}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 bg-purple-500/10 text-purple-700 dark:text-purple-400">
                                  {mod.level}
                                </span>
                              </div>

                              <p className="text-[10px] font-sans text-ink-muted dark:text-ink-darkMuted line-clamp-1 pl-7">
                                {mod.subtitle}
                              </p>

                              <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted pl-7">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> {mod.duration}
                                </span>
                                <span>•</span>
                                <span>{mod.stepCountText}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

              {/* SECTION: Security Tracks (4 Sub-Tracks) */}
              {(selectedCategory === 'all' || selectedCategory === 'security') &&
                securityTrackGroups.map((track) => {
                  const trackLessons = filteredSecurityLessons.filter((l) => l.track === track.id);
                  if (trackLessons.length === 0) return null;

                  return (
                    <div key={track.id} className="space-y-2">
                      <div className="text-[11px] font-mono uppercase tracking-wider font-bold px-2 flex items-center justify-between">
                        <span className={clsx('flex items-center gap-1.5', track.color)}>
                          <Shield className="w-3.5 h-3.5" />
                          Security: {track.title}
                        </span>
                        <span className="text-[10px] opacity-75 font-mono">
                          ({trackLessons.length})
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {trackLessons.map((lesson) => {
                          const isActive =
                            currentSuiteTab === 'security' && lesson.id === activeLessonId;
                          const levelText =
                            lesson.level === 'Beginner'
                              ? t.levelBeginner
                              : lesson.level === 'Intermediate'
                                ? t.levelIntermediate
                                : t.levelAdvanced;

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => {
                                onSelectLesson(lesson.id);
                                onClose();
                              }}
                              className={clsx(
                                'w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 border cursor-pointer min-h-[56px]',
                                isActive
                                  ? 'bg-white dark:bg-parchment-900 border-blue-500/50 shadow-sm ring-1 ring-blue-500/30'
                                  : 'border-transparent hover:bg-parchment-200/60 dark:hover:bg-parchment-900/40'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 shrink-0">
                                    S
                                  </span>
                                  <span
                                    className={clsx(
                                      'text-xs font-serif font-bold truncate',
                                      isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-ink-light dark:text-ink-dark'
                                    )}
                                  >
                                    {lesson.title}
                                  </span>
                                </div>
                                <span
                                  className={clsx(
                                    'text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0',
                                    lesson.level === 'Beginner'
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                      : lesson.level === 'Intermediate'
                                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                        : 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                                  )}
                                >
                                  {levelText}
                                </span>
                              </div>

                              <p className="text-[10px] font-sans text-ink-muted dark:text-ink-darkMuted line-clamp-1 pl-7">
                                {lesson.subtitle}
                              </p>

                              <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted pl-7">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> {lesson.duration}
                                </span>
                                <span>•</span>
                                <span>{lesson.steps.length} steps</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-parchment-200 dark:border-parchment-800 text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            39 Interactive Modules across 5 Tracks
          </span>
          <span className="text-[10px] bg-parchment-200 dark:bg-parchment-800 px-1.5 py-0.5 rounded">
            Esc to close
          </span>
        </div>
      </div>
    </>
  );
};
