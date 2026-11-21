import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { StepControls } from './components/StepControls';
import { StepExplanationCard } from './components/common/StepExplanationCard';
import { ThreatModelCard } from './components/ThreatModelCard';
import { LessonSidebar } from './components/LessonSidebar';
import { DeepDiveSection } from './components/DeepDiveSection';
import { SearchModal } from './components/SearchModal';
import { LESSONS } from './data/lessons';
import {
  SecurityTrackId,
  RouteModuleId,
  QueryModuleId,
  ActuateModuleId,
  SiliconModuleId,
  ModuleId,
  NavigationTab,
  UserProgress,
} from './types';
import { Language, TRANSLATIONS } from './i18n/translations';
import { loadUserProgress, markModuleVisited, markChallengeCompleted } from './lib/storage';
import { playSuccess } from './lib/sound';

// 23 Security Visualizers
import { OAuthPkceVisualizer } from './components/visualizers/OAuthPkceVisualizer';
import { JwtVisualizer } from './components/visualizers/JwtVisualizer';
import { WebAuthnVisualizer } from './components/visualizers/WebAuthnVisualizer';
import { SessionManagementVisualizer } from './components/visualizers/SessionManagementVisualizer';
import { CsrfVisualizer } from './components/visualizers/CsrfVisualizer';
import { XssCspVisualizer } from './components/visualizers/XssCspVisualizer';
import { SqlInjectionVisualizer } from './components/visualizers/SqlInjectionVisualizer';
import { CorsVisualizer } from './components/visualizers/CorsVisualizer';
import { SsrfVisualizer } from './components/visualizers/SsrfVisualizer';
import { ClickjackingVisualizer } from './components/visualizers/ClickjackingVisualizer';
import { CommandInjectionVisualizer } from './components/visualizers/CommandInjectionVisualizer';
import { ZeroTrustVisualizer } from './components/visualizers/ZeroTrustVisualizer';
import { RateLimitingVisualizer } from './components/visualizers/RateLimitingVisualizer';
import { IdorVisualizer } from './components/visualizers/IdorVisualizer';
import { SupplyChainVisualizer } from './components/visualizers/SupplyChainVisualizer';
import { TlsHandshakeVisualizer } from './components/visualizers/TlsHandshakeVisualizer';
import { PasswordHashingVisualizer } from './components/visualizers/PasswordHashingVisualizer';
import { E2eeVisualizer } from './components/visualizers/E2eeVisualizer';
import { MassAssignmentVisualizer } from './components/visualizers/MassAssignmentVisualizer';
import { ContainerEscapeVisualizer } from './components/visualizers/ContainerEscapeVisualizer';
import { OpenRedirectVisualizer } from './components/visualizers/OpenRedirectVisualizer';
import { ReplayAttackVisualizer } from './components/visualizers/ReplayAttackVisualizer';
import { PrototypePollutionVisualizer } from './components/visualizers/PrototypePollutionVisualizer';

// Systems Engineering Views (Designed to Route, Query, Actuate & Tapeout)
import { RouteTrackView } from './components/route/RouteTrackView';
import { QueryTrackView } from './components/query/QueryTrackView';
import { ActuateTrackView } from './components/actuate/ActuateTrackView';
import { SiliconTrackView } from './components/silicon/SiliconTrackView';

// Interactive Components
import { MetricCard } from './components/common/MetricCard';
import { TerminalLog, LogEntry } from './components/common/TerminalLog';
import { ChallengeCard } from './components/common/ChallengeCard';
import { getSecurityMeta } from './data/securityChallenges';
import { SecurityWorkbench } from './components/security/SecurityWorkbench';

import { Sparkles, Key, ShieldAlert, Server, Lock, Github } from 'lucide-react';

interface SecurityTrackDef {
  id: SecurityTrackId;
  labelKey: 'trackAuth' | 'trackExploits' | 'trackArch' | 'trackCrypto';
  count: number;
  icon: typeof Key;
}

const SECURITY_TRACK_DEFINITIONS: readonly SecurityTrackDef[] = [
  { id: 'auth', labelKey: 'trackAuth', count: 5, icon: Key },
  { id: 'exploits', labelKey: 'trackExploits', count: 8, icon: ShieldAlert },
  { id: 'architecture', labelKey: 'trackArch', count: 6, icon: Server },
  { id: 'crypto', labelKey: 'trackCrypto', count: 4, icon: Lock },
] as const;

export function App() {
  // Navigation State
  const [currentSuiteTab, setCurrentSuiteTab] = useState<NavigationTab>('security');
  const [activeLessonId, setActiveLessonId] = useState<string>('oauth-pkce');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activeRouteModule, setActiveRouteModule] = useState<RouteModuleId>('url-lifecycle');
  const [activeQueryModule, setActiveQueryModule] = useState<QueryModuleId>('lsm-tree');
  const [activeActuateModule, setActiveActuateModule] =
    useState<ActuateModuleId>('pid-control-loop');
  const [activeSiliconModule, setActiveSiliconModule] =
    useState<SiliconModuleId>('uvm-verification');
  const [routeStep, setRouteStep] = useState<number>(0);
  const [actuateStep, setActuateStep] = useState<number>(0);

  // Systems Progress State
  const [progress, setProgress] = useState<UserProgress>(() => loadUserProgress());

  // Preferences & Modals
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [lang, setLang] = useState<Language>('en');
  const [isCurriculumOpen, setIsCurriculumOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const t = TRANSLATIONS[lang];
  const activeLesson = LESSONS.find((l) => l.id === activeLessonId) || LESSONS[0];
  const stepCount = activeLesson.steps.length;
  const activeStepData = activeLesson.steps[currentStep] || activeLesson.steps[0];
  const securityMeta = getSecurityMeta(activeLesson.id);

  // Parse incoming window.location.hash and update application navigation state
  const parseHash = useCallback((hashStr: string) => {
    const raw = hashStr.replace(/^#\/?/, '').trim();
    if (!raw) return;

    const parts = raw.split('/');
    const first = parts[0];
    const second = parts[1];

    if (first === 'route') {
      setCurrentSuiteTab('route');
      if (second) {
        setActiveRouteModule(second as RouteModuleId);
      }
      return;
    }

    if (first === 'query') {
      setCurrentSuiteTab('query');
      if (second) {
        setActiveQueryModule(second as QueryModuleId);
      }
      return;
    }

    if (first === 'actuate') {
      setCurrentSuiteTab('actuate');
      if (second) {
        setActiveActuateModule(second as ActuateModuleId);
      }
      if (parts[2]) {
        const stepNum = parseInt(parts[2], 10);
        if (!isNaN(stepNum) && stepNum >= 1) {
          setActuateStep(stepNum - 1);
        }
      }
      return;
    }

    if (first === 'silicon') {
      setCurrentSuiteTab('silicon');
      if (second) {
        setActiveSiliconModule(second as SiliconModuleId);
      }
      return;
    }

    // Direct module aliases like #/request-lifecycle/1, #/url-lifecycle/1, or #/napkin-math/1
    const routeModules: RouteModuleId[] = [
      'url-lifecycle',
      'tcp-congestion',
      'http-race',
      'napkin-math',
    ];
    if (
      first === 'request-lifecycle' ||
      routeModules.includes(first as RouteModuleId) ||
      first === 'load-balancing'
    ) {
      setCurrentSuiteTab('route');
      setActiveRouteModule(
        first === 'load-balancing' || first === 'request-lifecycle'
          ? 'url-lifecycle'
          : (first as RouteModuleId)
      );
      if (second) {
        const stepNum = parseInt(second, 10);
        if (!isNaN(stepNum) && stepNum >= 1) {
          setRouteStep(stepNum - 1);
        }
      }
      return;
    }

    const queryModules: QueryModuleId[] = ['lsm-tree', 'bplus-tree', 'acid-isolation'];
    if (queryModules.includes(first as QueryModuleId)) {
      setCurrentSuiteTab('query');
      setActiveQueryModule(first as QueryModuleId);
      return;
    }

    const actuateModules: (ActuateModuleId | 'actuator-structure')[] = [
      'pid-control-loop',
      'ros2-teleoperation',
      'inverse-kinematics',
      'foc-motor-control',
      'actuator-structure',
    ];
    if (actuateModules.includes(first as any) || first === 'redundancy') {
      setCurrentSuiteTab('actuate');
      const targetMod: ActuateModuleId =
        first === 'redundancy' ? 'pid-control-loop' : (first as ActuateModuleId);
      setActiveActuateModule(targetMod);
      if (second) {
        const stepNum = parseInt(second, 10);
        if (!isNaN(stepNum) && stepNum >= 1) {
          setActuateStep(stepNum - 1);
        }
      }
      return;
    }

    const siliconModules: SiliconModuleId[] = [
      'uvm-verification',
      'pre-silicon-emulation',
      'riscv-pipeline',
    ];
    if (siliconModules.includes(first as SiliconModuleId)) {
      setCurrentSuiteTab('silicon');
      setActiveSiliconModule(first as SiliconModuleId);
      return;
    }

    // Security lessons check (e.g. #/oauth-pkce/1 or #/jwt-tampering/2)
    const matchingLesson = LESSONS.find((l) => l.id === first);
    if (matchingLesson) {
      setCurrentSuiteTab('security');
      setActiveLessonId(matchingLesson.id);
      if (second) {
        const stepNum = parseInt(second, 10);
        if (!isNaN(stepNum) && stepNum >= 1) {
          setCurrentStep(Math.min(matchingLesson.steps.length - 1, stepNum - 1));
        }
      }
    }
  }, []);

  // Bidirectional Hash Synchronization (Sync application state -> window.location.hash)
  useEffect(() => {
    let targetHash = '';
    if (currentSuiteTab === 'security') {
      targetHash = `#/${activeLessonId}/${currentStep + 1}`;
    } else if (currentSuiteTab === 'route') {
      targetHash =
        activeRouteModule === 'url-lifecycle'
          ? `#/request-lifecycle/${routeStep + 1}`
          : `#/route/${activeRouteModule}`;
    } else if (currentSuiteTab === 'query') {
      targetHash = `#/query/${activeQueryModule}`;
    } else if (currentSuiteTab === 'actuate') {
      targetHash = `#/actuate/${activeActuateModule}/${actuateStep + 1}`;
    } else if (currentSuiteTab === 'silicon') {
      targetHash = `#/silicon/${activeSiliconModule}`;
    }

    if (targetHash && window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
  }, [
    currentSuiteTab,
    activeLessonId,
    currentStep,
    routeStep,
    actuateStep,
    activeRouteModule,
    activeQueryModule,
    activeActuateModule,
    activeSiliconModule,
  ]);

  // Initial Hash Parse on mount + listen for browser Back/Forward (hashchange)
  useEffect(() => {
    if (window.location.hash) {
      parseHash(window.location.hash);
    }

    const handleHashChange = () => {
      parseHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [parseHash]);

  // Security Live Telemetry Logs
  const [securityLogs, setSecurityLogs] = useState<LogEntry[]>([]);

  // Initialize or update security telemetry logs on lesson change
  useEffect(() => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const initialWithIds: LogEntry[] = securityMeta.initialLogs.map((l, idx) => ({
      ...l,
      id: `init-${activeLesson.id}-${idx}-${Date.now()}`,
      timestamp: timeStr,
    }));
    setSecurityLogs(initialWithIds);
  }, [activeLesson.id, securityMeta.initialLogs]);

  // Append audit event on step change
  useEffect(() => {
    if (!activeStepData) return;
    const timeStr = new Date().toTimeString().split(' ')[0];
    const stepLog: LogEntry = {
      id: `step-${activeLesson.id}-${currentStep}-${Date.now()}`,
      timestamp: timeStr,
      level:
        currentStep === stepCount - 1 ? 'success' : currentStep >= stepCount - 2 ? 'warn' : 'info',
      category: activeStepData.actionSummary ? 'PROTOCOL' : 'STEP',
      message: `[Step ${currentStep + 1}/${stepCount}] ${activeStepData.title}: ${activeStepData.actionSummary || activeStepData.description}`,
    };

    setSecurityLogs((prev) => [...prev.slice(-30), stepLog]);

    if (activeStepData.securityTakeaway) {
      const takeawayLog: LogEntry = {
        id: `takeaway-${activeLesson.id}-${currentStep}-${Date.now()}`,
        timestamp: timeStr,
        level: 'success',
        category: 'DEFENSE',
        message: activeStepData.securityTakeaway,
      };
      setSecurityLogs((prev) => [...prev.slice(-30), takeawayLog]);
    }
  }, [currentStep, activeLesson.id, activeStepData, stepCount]);

  // Handle emitting security logs from attack injection & defense consoles
  const handleEmitSecurityLog = (log: LogEntry) => {
    setSecurityLogs((prev) => [...prev.slice(-30), log]);
  };

  // Apply dark mode class to root html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle tab visibility change: stop CSS animations, pause SMIL SVG animations, and notify app when user moves out of browser tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.classList.add('tab-hidden');
        document.querySelectorAll('svg').forEach((svg) => {
          try {
            svg.pauseAnimations();
          } catch {
            // Ignore if unsupported
          }
        });
      } else {
        document.body.classList.remove('tab-hidden');
        document.querySelectorAll('svg').forEach((svg) => {
          try {
            svg.unpauseAnimations();
          } catch {
            // Ignore if unsupported
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Keyboard navigation for step scrubber & search modal
  const handleNext = useCallback(() => {
    setCurrentStep((prev) => (prev < stepCount - 1 ? prev + 1 : prev));
  }, [stepCount]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K / Ctrl+K opens global search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // Don't intercept arrow keys when user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (currentSuiteTab === 'security') {
        if (e.key === 'ArrowRight') {
          handleNext();
        } else if (e.key === 'ArrowLeft') {
          handlePrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, currentSuiteTab]);

  // Handle Security lesson change
  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Security track change from header
  const handleSelectTrack = (track: SecurityTrackId) => {
    const firstLessonInTrack = LESSONS.find((l) => l.track === track);
    if (firstLessonInTrack) {
      handleSelectLesson(firstLessonInTrack.id);
    }
  };

  // Handle Systems & Security Navigation
  const handleNavigate = (tab: NavigationTab, moduleId?: any) => {
    setCurrentSuiteTab(tab);
    if (tab === 'security' && moduleId) {
      handleSelectLesson(moduleId as string);
    } else if (moduleId) {
      if (tab === 'route') {
        setActiveRouteModule(moduleId as RouteModuleId);
      } else if (tab === 'query') {
        setActiveQueryModule(moduleId as QueryModuleId);
      } else if (tab === 'actuate') {
        setActiveActuateModule(moduleId as ActuateModuleId);
      } else if (tab === 'silicon') {
        setActiveSiliconModule(moduleId as SiliconModuleId);
      }
      const updated = markModuleVisited(moduleId);
      setProgress(updated);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Challenge completion with sound
  const handleChallengeComplete = (challengeId: string) => {
    const updated = markChallengeCompleted(challengeId);
    setProgress(updated);
    playSuccess();
  };

  // Render appropriate visualizer for each of the 23 security modules
  const renderVisualizer = () => {
    switch (activeLesson.id) {
      case 'oauth-pkce':
        return (
          <OAuthPkceVisualizer
            currentStep={currentStep}
            onSelectStep={(step) => setCurrentStep(step)}
          />
        );
      case 'jwt-tampering':
        return (
          <JwtVisualizer currentStep={currentStep} onSelectStep={(step) => setCurrentStep(step)} />
        );
      case 'webauthn-passkeys':
        return (
          <WebAuthnVisualizer
            currentStep={currentStep}
            onSelectStep={(step) => setCurrentStep(step)}
          />
        );
      case 'session-management':
        return (
          <SessionManagementVisualizer
            currentStep={currentStep}
            onSelectStep={(step) => setCurrentStep(step)}
          />
        );
      case 'csrf-defense':
        return (
          <CsrfVisualizer currentStep={currentStep} onSelectStep={(step) => setCurrentStep(step)} />
        );
      case 'xss-csp':
        return <XssCspVisualizer currentStep={currentStep} />;
      case 'sql-injection':
        return <SqlInjectionVisualizer currentStep={currentStep} />;
      case 'cors-preflight':
        return <CorsVisualizer currentStep={currentStep} />;
      case 'ssrf-cloud-metadata':
        return <SsrfVisualizer currentStep={currentStep} />;
      case 'clickjacking-defense':
        return <ClickjackingVisualizer currentStep={currentStep} />;
      case 'command-injection':
        return <CommandInjectionVisualizer currentStep={currentStep} />;
      case 'zero-trust':
        return (
          <ZeroTrustVisualizer
            currentStep={currentStep}
            onSelectStep={(step) => setCurrentStep(step)}
          />
        );
      case 'rate-limiting-ddos':
        return <RateLimitingVisualizer currentStep={currentStep} />;
      case 'idor-bola':
        return <IdorVisualizer currentStep={currentStep} />;
      case 'supply-chain-security':
        return <SupplyChainVisualizer currentStep={currentStep} />;
      case 'tls-handshake':
        return (
          <TlsHandshakeVisualizer
            currentStep={currentStep}
            onSelectStep={(step) => setCurrentStep(step)}
          />
        );
      case 'password-hashing':
        return <PasswordHashingVisualizer currentStep={currentStep} />;
      case 'e2ee-double-ratchet':
        return <E2eeVisualizer currentStep={currentStep} />;
      case 'mass-assignment':
        return <MassAssignmentVisualizer currentStep={currentStep} />;
      case 'container-escape':
        return <ContainerEscapeVisualizer currentStep={currentStep} />;
      case 'open-redirect':
        return <OpenRedirectVisualizer currentStep={currentStep} />;
      case 'replay-attacks':
        return <ReplayAttackVisualizer currentStep={currentStep} />;
      case 'prototype-pollution':
        return <PrototypePollutionVisualizer currentStep={currentStep} />;
      default:
        return <OAuthPkceVisualizer currentStep={currentStep} />;
    }
  };

  const securityTracks = useMemo(
    () =>
      SECURITY_TRACK_DEFINITIONS.map((def: (typeof SECURITY_TRACK_DEFINITIONS)[number]) => ({
        id: def.id,
        label: t[def.labelKey],
        count: def.count,
        icon: <def.icon className="w-3.5 h-3.5" />,
      })),
    [t]
  );

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-blue-500/20 selection:text-blue-900 dark:selection:text-blue-100">
      {/* Navigation Header */}
      <Header
        currentSuiteTab={currentSuiteTab}
        onSelectSuiteTab={(tab) => {
          setCurrentSuiteTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onToggleCurriculum={() => setIsCurriculumOpen((prev) => !prev)}
        isCurriculumOpen={isCurriculumOpen}
        onOpenSearch={() => setIsSearchOpen(true)}
        lang={lang}
        onSelectLang={(newLang) => setLang(newLang)}
        onResetHome={() => {
          setCurrentSuiteTab('security');
          handleSelectLesson(LESSONS[0].id);
        }}
      />

      {/* Security Curriculum Sidebar Drawer */}
      <LessonSidebar
        lessons={LESSONS}
        activeLessonId={activeLessonId}
        onSelectLesson={handleSelectLesson}
        isOpen={isCurriculumOpen}
        onClose={() => setIsCurriculumOpen(false)}
        lang={lang}
      />

      {/* Global Command Palette / Search Modal (Searches across all 29 modules) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        lessons={LESSONS}
        onSelectLesson={(lessonId) => {
          setCurrentSuiteTab('security');
          handleSelectLesson(lessonId);
        }}
        onSelectSystemsModule={(tab, mod) => {
          handleNavigate(tab, mod);
        }}
        lang={lang}
      />

      {/* MAIN VIEW: Security Course */}
      {currentSuiteTab === 'security' && (
        <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 animate-fade-in">
          {/* Security Tracks Segmented Navigation Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-parchment-200/50 dark:bg-parchment-900/50 border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono overflow-x-auto no-scrollbar touch-scroll shrink-0 max-w-full">
            {securityTracks.map((track) => {
              const isActive = activeLesson.track === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    handleSelectTrack(track.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap min-h-[36px] ${
                    isActive
                      ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-sm border border-parchment-300 dark:border-parchment-700'
                      : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
                  }`}
                >
                  <span
                    className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-ink-muted'}
                  >
                    {track.icon}
                  </span>
                  <span>{track.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                      isActive
                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold'
                        : 'bg-parchment-200 dark:bg-parchment-800 text-ink-muted'
                    }`}
                  >
                    {track.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lesson Breadcrumb & Title */}
          <section className="space-y-2.5 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {activeLesson.trackTitle}
              </span>
              <span>/</span>
              <span>
                {activeLesson.level === 'Beginner'
                  ? t.levelBeginner
                  : activeLesson.level === 'Intermediate'
                    ? t.levelIntermediate
                    : t.levelAdvanced}{' '}
                Level
              </span>
              <span>•</span>
              <span>Est. {activeLesson.duration}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight leading-tight">
              {activeLesson.title}
            </h1>

            <p className="text-base sm:text-lg font-serif italic text-ink-muted dark:text-ink-darkMuted leading-relaxed max-w-3xl">
              {activeLesson.subtitle}
            </p>

            <p className="text-sm font-sans text-ink-light dark:text-ink-dark leading-relaxed pt-0.5 sm:pt-1">
              {activeLesson.summary}
            </p>
          </section>

          {/* Real-time Security Metrics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <MetricCard
              label="CVSS Base Score"
              value={securityMeta.cvss}
              unit="/ 10"
              trend={securityMeta.cvssSeverity === 'CRITICAL' ? 'alert' : 'neutral'}
              variant={securityMeta.cvssSeverity === 'CRITICAL' ? 'amber' : 'purple'}
              description={`${securityMeta.cvssSeverity} Severity Threat`}
            />
            <MetricCard
              label="Attack Vector"
              value={securityMeta.attackVector}
              trend="neutral"
              variant="cyan"
              description="Target interface entrypoint"
            />
            <MetricCard
              label="Primary Mitigation"
              value={securityMeta.mitigationName}
              trend="up"
              variant="emerald"
              description="Standard production defense"
            />
            <MetricCard
              label="Exploit Feasibility"
              value={securityMeta.exploitFeasibility}
              trend="neutral"
              variant="zinc"
              description="Real-world attack probability"
            />
          </div>

          {/* The Live Interactive Visualizer */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider">
                  Interactive Packet & State Sandbox
                </span>
              </div>
              <span className="text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted hidden sm:inline">
                {t.keyboardHint}
              </span>
            </div>

            {/* Render the visualizer state machine */}
            <div className="relative">{renderVisualizer()}</div>

            {/* Step & Stage Narrative Explanation Card (Live with current step) */}
            <StepExplanationCard
              stepNumber={currentStep + 1}
              totalSteps={stepCount}
              stepData={activeStepData}
              accentColor="security"
            />

            {/* Keyboard-aware Step Controls Scrubber */}
            <StepControls
              currentStep={currentStep}
              totalSteps={stepCount}
              onNext={handleNext}
              onPrev={handlePrev}
              onReset={() => setCurrentStep(0)}
              onSelectStep={(step) => setCurrentStep(step)}
              lang={lang}
            />
          </section>

          {/* Interactive Security Engineering Workbench (Exploit Injector, CVSS Calculator, Headers Auditor, Entropy Benchmark, Certification Quiz) */}
          <SecurityWorkbench
            lessonId={activeLesson.id}
            lessonTitle={activeLesson.title}
            onEmitLog={handleEmitSecurityLog}
          />

          {/* Live Security Audit Log & Interactive Lesson Challenges */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TerminalLog
              logs={securityLogs}
              onClear={() => setSecurityLogs([])}
              title="SECURITY AUDIT & PACKET TELEMETRY LOG"
              maxHeight="max-h-56"
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-bold">
                  {t.challengesTitle}
                </h4>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {t.challengesSolved
                    .replace(
                      '{solved}',
                      String(
                        securityMeta.challenges.filter((c) => progress.completedChallenges[c.id])
                          .length
                      )
                    )
                    .replace('{total}', String(securityMeta.challenges.length))}
                </span>
              </div>

              {securityMeta.challenges.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  isCompleted={!!progress.completedChallenges[c.id]}
                  onComplete={handleChallengeComplete}
                  accentColor="security"
                  lang={lang}
                />
              ))}
            </div>
          </div>

          {/* Threat Model Card */}
          <ThreatModelCard threatModel={activeLesson.threatModel} lang={lang} />

          {/* Deep Dive Section: Step Details, CVE Case Study, Hardening & FAQs */}
          <DeepDiveSection
            lesson={activeLesson}
            activeStepData={activeStepData}
            currentStep={currentStep}
            lang={lang}
          />
        </main>
      )}

      {/* MAIN VIEW: Designed to Route (Networking Track) */}
      {currentSuiteTab === 'route' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in">
          <RouteTrackView
            initialModuleId={activeRouteModule}
            initialStep={routeStep}
            onStepChange={(s) => setRouteStep(s)}
            progress={progress}
            onChallengeComplete={handleChallengeComplete}
            onSelectModule={(id) => {
              setActiveRouteModule(id);
              const updated = markModuleVisited(id);
              setProgress(updated);
            }}
          />
        </main>
      )}

      {/* MAIN VIEW: Designed to Query (Database Track) */}
      {currentSuiteTab === 'query' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in">
          <QueryTrackView
            initialModuleId={activeQueryModule}
            progress={progress}
            onChallengeComplete={handleChallengeComplete}
            onSelectModule={(id) => {
              setActiveQueryModule(id);
              const updated = markModuleVisited(id);
              setProgress(updated);
            }}
          />
        </main>
      )}

      {/* MAIN VIEW: Designed to Actuate (Robotics & Physical AI Track) */}
      {currentSuiteTab === 'actuate' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in">
          <ActuateTrackView
            initialModuleId={activeActuateModule}
            initialStep={actuateStep}
            onStepChange={setActuateStep}
            progress={progress}
            onChallengeComplete={handleChallengeComplete}
            onSelectModule={(id) => {
              if (id !== 'actuator-structure') {
                setActiveActuateModule(id as ActuateModuleId);
                const updated = markModuleVisited(id as ModuleId);
                setProgress(updated);
              }
            }}
          />
        </main>
      )}

      {/* MAIN VIEW: Designed to Tapeout (VLSI & Pre-Silicon Emulation Track) */}
      {currentSuiteTab === 'silicon' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in">
          <SiliconTrackView
            initialModuleId={activeSiliconModule}
            progress={progress}
            onChallengeComplete={handleChallengeComplete}
            onSelectModule={(id) => {
              if (id !== 'silicon-structure') {
                setActiveSiliconModule(id as SiliconModuleId);
                const updated = markModuleVisited(id as ModuleId);
                setProgress(updated);
              }
            }}
          />
        </main>
      )}

      {/* Platform Footer */}
      <footer className="w-full border-t border-parchment-200 dark:border-parchment-800 bg-parchment-100/60 dark:bg-parchment-950/60 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-ink-muted dark:text-ink-darkMuted font-mono">
          <span className="font-serif font-bold text-sm text-ink-light dark:text-ink-dark">
            underthehood
          </span>
          <a
            href="https://github.com/mangekyoflow/underthehood"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
export default App;
