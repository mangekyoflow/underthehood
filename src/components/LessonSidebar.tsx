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
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  Lesson,
  TrackId,
  NavigationTab,
  RouteModuleId,
  QueryModuleId,
  ActuateModuleId,
  SiliconModuleId,
  ModuleId,
  UserProgress,
} from '../types';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { playTick } from '../lib/sound';

interface Props {
  lessons: Lesson[];
  activeLessonId: string;
  onSelectLesson: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentSuiteTab?: NavigationTab;
  activeRouteModule?: RouteModuleId;
  activeQueryModule?: QueryModuleId;
  activeActuateModule?: ActuateModuleId;
  activeSiliconModule?: SiliconModuleId;
  onSelectSystemsModule?: (tab: NavigationTab, moduleId: ModuleId) => void;
  progress?: UserProgress;
}

interface SystemsModuleItem {
  id: ModuleId;
  tab: NavigationTab;
  number: string;
  title: string;
  subtitle: string;
  level: string;
  meta: string;
  accent: string;
}

const SYSTEMS_MODULES: {
  trackId: string;
  trackTitle: string;
  tab: NavigationTab;
  icon: typeof Route;
  items: SystemsModuleItem[];
}[] = [
  {
    trackId: 'route',
    trackTitle: '05. Internet Plumbing & Protocols (Route)',
    tab: 'route',
    icon: Route,
    items: [
      {
        id: 'url-lifecycle',
        tab: 'route',
        number: '24',
        title: 'The Life of a URL Request',
        subtitle: 'Hop-by-hop packet journey: DNS, TCP, TLS 1.3 & HTTP/2',
        level: 'Intermediate',
        meta: '16 steps',
        accent: 'text-cyan-600 dark:text-cyan-400',
      },
      {
        id: 'tcp-congestion',
        tab: 'route',
        number: '25',
        title: 'TCP Congestion Control Simulator',
        subtitle: 'TCP Reno vs BBR, cwnd dynamics, pacing rate & bufferbloat',
        level: 'Advanced',
        meta: 'Live simulation',
        accent: 'text-cyan-600 dark:text-cyan-400',
      },
      {
        id: 'http-race',
        tab: 'route',
        number: '26',
        title: 'HTTP/1.1 vs HTTP/2 vs HTTP/3 Protocol Race',
        subtitle: 'Multiplexing, Head-of-Line blocking & QUIC streams',
        level: 'Intermediate',
        meta: '3-lane race',
        accent: 'text-cyan-600 dark:text-cyan-400',
      },
      {
        id: 'napkin-math',
        tab: 'route',
        number: '27',
        title: 'Napkin Math Capacity Planning',
        subtitle: 'Order-of-magnitude systems sizing & latency numbers',
        level: 'Beginner',
        meta: '8 calculators',
        accent: 'text-cyan-600 dark:text-cyan-400',
      },
    ],
  },
  {
    trackId: 'query',
    trackTitle: '06. Database Internals & Storage (Query)',
    tab: 'query',
    icon: Database,
    items: [
      {
        id: 'lsm-tree',
        tab: 'query',
        number: '28',
        title: 'RocksDB LSM-Tree Storage Engine',
        subtitle: 'WAL, MemTable, Bloom filter & Leveled Compaction',
        level: 'Advanced',
        meta: 'Interactive engine',
        accent: 'text-purple-600 dark:text-purple-400',
      },
      {
        id: 'bplus-tree',
        tab: 'query',
        number: '29',
        title: 'PostgreSQL B+ Tree Node Splitter',
        subtitle: 'Order M tree indexing, leaf chains & median promotion',
        level: 'Intermediate',
        meta: 'Visual splitter',
        accent: 'text-purple-600 dark:text-purple-400',
      },
      {
        id: 'acid-isolation',
        tab: 'query',
        number: '30',
        title: 'ACID & Transaction Isolation Simulator',
        subtitle: 'Dirty reads, phantom reads, lost updates & MVCC snapshots',
        level: 'Advanced',
        meta: '4 isolation levels',
        accent: 'text-purple-600 dark:text-purple-400',
      },
    ],
  },
  {
    trackId: 'actuate',
    trackTitle: '07. Robotics & Physical AI (Actuate)',
    tab: 'actuate',
    icon: Bot,
    items: [
      {
        id: 'pid-control-loop',
        tab: 'actuate',
        number: '31',
        title: 'PID Control Loop Tuning',
        subtitle: 'Proportional, Integral, Derivative dynamics & anti-windup',
        level: 'Intermediate',
        meta: 'Physics simulator',
        accent: 'text-amber-600 dark:text-amber-400',
      },
      {
        id: 'ros2-teleoperation',
        tab: 'actuate',
        number: '32',
        title: 'ROS2 Teleoperation & DDS Pub/Sub',
        subtitle: 'Real-time pub/sub, QoS loss-resilience & node graph',
        level: 'Advanced',
        meta: 'DDS simulator',
        accent: 'text-amber-600 dark:text-amber-400',
      },
      {
        id: 'inverse-kinematics',
        tab: 'actuate',
        number: '33',
        title: '3-DOF Inverse Kinematics Solver',
        subtitle: 'Planar arm coordinates, forward & analytical inverse kinematics',
        level: 'Advanced',
        meta: 'Interactive arm',
        accent: 'text-amber-600 dark:text-amber-400',
      },
    ],
  },
  {
    trackId: 'silicon',
    trackTitle: '08. VLSI & Pre-Silicon Emulation (Tapeout)',
    tab: 'silicon',
    icon: Microchip,
    items: [
      {
        id: 'uvm-verification',
        tab: 'silicon',
        number: '34',
        title: 'UVM Verification Architecture',
        subtitle: 'Constrained random stimulus, scoreboards & coverage',
        level: 'Advanced',
        meta: 'RTL testbench',
        accent: 'text-emerald-600 dark:text-emerald-400',
      },
      {
        id: 'pre-silicon-emulation',
        tab: 'silicon',
        number: '35',
        title: 'Pre-Silicon Hardware Emulation',
        subtitle: 'FPGA acceleration, speed-bridges & transactors',
        level: 'Advanced',
        meta: 'HW co-simulation',
        accent: 'text-emerald-600 dark:text-emerald-400',
      },
    ],
  },
];

export const LessonSidebar: React.FC<Props> = ({
  lessons,
  activeLessonId,
  onSelectLesson,
  isOpen,
  onClose,
  lang,
  currentSuiteTab = 'security',
  activeRouteModule = 'url-lifecycle',
  activeQueryModule = 'lsm-tree',
  activeActuateModule = 'pid-control-loop',
  activeSiliconModule = 'uvm-verification',
  onSelectSystemsModule,
  progress,
}) => {
  const [filterText, setFilterText] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | NavigationTab>('all');
  const t = TRANSLATIONS[lang];

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

  const securityTracks: { id: TrackId; title: string; trackNum: string }[] = [
    { id: 'auth', title: '01. Identity & Authentication Protocols', trackNum: '01' },
    { id: 'exploits', title: '02. Web Exploits & Browser Security', trackNum: '02' },
    { id: 'architecture', title: '03. Cloud Infrastructure & Zero Trust', trackNum: '03' },
    { id: 'crypto', title: '04. Applied Cryptography & Ciphers', trackNum: '04' },
  ];

  // Filter Security Lessons
  const filteredSecurityLessons = useMemo(() => {
    if (activeTabFilter !== 'all' && activeTabFilter !== 'security') {
      return [];
    }
    if (!filterText.trim()) return lessons;
    const q = filterText.toLowerCase();
    return lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.subtitle.toLowerCase().includes(q) ||
        l.keyConcepts.some((c) => c.toLowerCase().includes(q))
    );
  }, [lessons, filterText, activeTabFilter]);

  // Filter Systems Tracks & Modules
  const filteredSystemsModules = useMemo(() => {
    return SYSTEMS_MODULES.map((track) => {
      if (activeTabFilter !== 'all' && activeTabFilter !== track.tab) {
        return { ...track, items: [] };
      }
      if (!filterText.trim()) return track;
      const q = filterText.toLowerCase();
      const matchingItems = track.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          track.trackTitle.toLowerCase().includes(q)
      );
      return { ...track, items: matchingItems };
    }).filter((track) => track.items.length > 0);
  }, [filterText, activeTabFilter]);

  // Total completed modules
  const completedCount = useMemo(() => {
    if (!progress) return 0;
    let count = 0;
    // Security completed challenges check
    lessons.forEach((l) => {
      if (progress.completedChallenges[`challenge-${l.id}`]) count++;
    });
    // Systems visited or completed
    Object.values(progress.visitedModules || {}).forEach((visited) => {
      if (visited) count++;
    });
    return Math.min(35, count);
  }, [progress, lessons]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-y-0 left-0 z-50 w-80 sm:w-96 md:w-[420px] max-w-[90vw] bg-parchment-100 dark:bg-parchment-950 border-r border-parchment-200 dark:border-parchment-800 shadow-2xl flex flex-col transition-transform duration-300"
        role="dialog"
        aria-label="Course Index"
      >
        <div className="p-4 border-b border-parchment-200 dark:border-parchment-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base text-ink-light dark:text-ink-dark block leading-tight">
                  {t.courseIndex}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  35 Modules
                </span>
              </div>
              <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-0.5 block">
                Explorable explanations for systems & security
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Course Index"
            className="p-1.5 rounded-lg hover:bg-parchment-200 dark:hover:bg-parchment-800 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-parchment-200 dark:border-parchment-800 space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search 35 modules (e.g. DNS, BBR, B+ Tree, PKCE)..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-8.5 pr-8 py-1.5 text-xs font-mono rounded-xl bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark focus:outline-none focus:border-blue-500 placeholder:text-ink-muted/70 transition-colors"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-2.5 top-2.5 text-ink-muted hover:text-ink-light cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px] font-mono">
            {[
              { id: 'all', label: 'All (35)' },
              { id: 'security', label: 'Security (23)' },
              { id: 'route', label: 'Route (4)' },
              { id: 'query', label: 'Query (3)' },
              { id: 'actuate', label: 'Actuate (3)' },
              { id: 'silicon', label: 'Silicon (2)' },
            ].map((tab) => {
              const isSelected = activeTabFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playTick();
                    setActiveTabFilter(tab.id as 'all' | NavigationTab);
                  }}
                  className={`px-2 py-0.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-parchment-900 text-parchment-50 dark:bg-parchment-100 dark:text-parchment-950 font-bold'
                      : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-6">
          {(activeTabFilter === 'all' || activeTabFilter === 'security') &&
            securityTracks.map((track) => {
              const trackLessons = filteredSecurityLessons.filter((l) => l.track === track.id);
              if (trackLessons.length === 0) return null;

              return (
                <div key={track.id} className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-parchment-800 dark:text-parchment-300 font-bold px-2 py-1 flex items-center justify-between border-b border-parchment-200/80 dark:border-parchment-800/80">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {track.title}
                    </span>
                    <span className="text-[10px] font-mono opacity-60">
                      ({trackLessons.length})
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    {trackLessons.map((lesson) => {
                      const isActive =
                        currentSuiteTab === 'security' && lesson.id === activeLessonId;
                      const isCompleted = progress?.completedChallenges[`challenge-${lesson.id}`];

                      // Global lesson index in course (1-based)
                      const lessonGlobalIndex = lessons.findIndex((l) => l.id === lesson.id) + 1;
                      const numStr = String(lessonGlobalIndex).padStart(2, '0');

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            playTick();
                            onSelectLesson(lesson.id);
                            onClose();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 border cursor-pointer ${
                            isActive
                              ? 'bg-white dark:bg-parchment-900 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/20'
                              : 'border-transparent hover:bg-parchment-200/50 dark:hover:bg-parchment-900/40'
                          }`}
                        >
                          <span className="font-mono text-[11px] font-bold text-ink-muted dark:text-ink-darkMuted pt-0.5 w-5 flex-shrink-0">
                            {numStr}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-serif font-bold truncate ${
                                  isActive
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-ink-light dark:text-ink-dark'
                                }`}
                              >
                                {lesson.title}
                              </span>
                              {isCompleted && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              )}
                            </div>

                            <p className="text-[10px] text-ink-muted dark:text-ink-darkMuted line-clamp-1 mt-0.5">
                              {lesson.subtitle}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] ${
                                  lesson.level === 'Beginner'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : lesson.level === 'Intermediate'
                                      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                      : 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                                }`}
                              >
                                {lesson.level}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> {lesson.duration}
                              </span>
                              <span>•</span>
                              <span>{lesson.steps.length} steps</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {filteredSystemsModules.map((track) => {
            const Icon = track.icon;
            return (
              <div key={track.trackId} className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-parchment-800 dark:text-parchment-300 font-bold px-2 py-1 flex items-center justify-between border-b border-parchment-200/80 dark:border-parchment-800/80">
                  <span className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    {track.trackTitle}
                  </span>
                  <span className="text-[10px] font-mono opacity-60">({track.items.length})</span>
                </div>

                <div className="space-y-1 pt-1">
                  {track.items.map((item) => {
                    const isActive =
                      currentSuiteTab === item.tab &&
                      (item.tab === 'route'
                        ? activeRouteModule === item.id
                        : item.tab === 'query'
                          ? activeQueryModule === item.id
                          : item.tab === 'actuate'
                            ? activeActuateModule === item.id
                            : activeSiliconModule === item.id);

                    const isVisited = progress?.visitedModules[item.id];

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          playTick();
                          if (onSelectSystemsModule) {
                            onSelectSystemsModule(item.tab, item.id);
                          }
                          onClose();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 border cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-parchment-900 border-cyan-500/50 shadow-xs ring-1 ring-cyan-500/20'
                            : 'border-transparent hover:bg-parchment-200/50 dark:hover:bg-parchment-900/40'
                        }`}
                      >
                        <span className="font-mono text-[11px] font-bold text-ink-muted dark:text-ink-darkMuted pt-0.5 w-5 flex-shrink-0">
                          {item.number}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-serif font-bold truncate ${
                                isActive
                                  ? 'text-cyan-700 dark:text-cyan-400'
                                  : 'text-ink-light dark:text-ink-dark'
                              }`}
                            >
                              {item.title}
                            </span>
                            {isVisited && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                            )}
                          </div>

                          <p className="text-[10px] text-ink-muted dark:text-ink-darkMuted line-clamp-1 mt-0.5">
                            {item.subtitle}
                          </p>

                          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] ${
                                item.level === 'Beginner'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                  : item.level === 'Intermediate'
                                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                    : 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                              }`}
                            >
                              {item.level}
                            </span>
                            <span>•</span>
                            <span>{item.meta}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3.5 border-t border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-900/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted">
            <span>{completedCount} of 35 modules completed</span>
            <span className="font-bold">{Math.round((completedCount / 35) * 100)}%</span>
          </div>
          <div className="w-full bg-parchment-200 dark:bg-parchment-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, (completedCount / 35) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted/80 pt-0.5">
            <span>Press Esc to close</span>
            <span>Free & Open Source</span>
          </div>
        </div>
      </div>
    </>
  );
};
export default LessonSidebar;
