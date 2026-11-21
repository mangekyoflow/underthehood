import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  User,
  RefreshCw,
  Lock,
  Terminal,
  ArrowRight,
  Database,
  Server,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Send,
  Key,
  Sparkles,
  Radio,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface Props {
  currentStep?: number;
  onSelectStep?: (step: number) => void;
}

export const SessionManagementVisualizer: React.FC<Props> = ({
  currentStep: externalStep,
  onSelectStep,
}) => {
  const [internalStep, setInternalStep] = useState<number>(0);
  const currentStep = externalStep !== undefined ? externalStep : internalStep;

  // Interactive Security Knobs
  const [fixationDefense, setFixationDefense] = useState<boolean>(true);
  const [sessionPhase, setSessionPhase] = useState<'pre_login' | 'logged_in' | 'attacker_tested'>(
    'pre_login'
  );
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const attackerFixedId = 'sess_attacker_trap_9901';
  const regeneratedId = 'sess_fresh_random_4481_xK8';

  const currentVictimSessionId =
    sessionPhase === 'pre_login'
      ? attackerFixedId
      : fixationDefense
        ? regeneratedId
        : attackerFixedId;

  const isAttackerSuccessful =
    (sessionPhase === 'attacker_tested' || currentStep === 4) && !fixationDefense;

  const stepsData = [
    {
      title: 'Step 1: Attacker Plants Trap Session ID',
      detail:
        'Attacker creates an anonymous session and tricks the victim into using it via phishing link or cookie injection (?PHPSESSID=sess_attacker_trap_9901).',
      source: 'Attacker Node',
      target: 'Victim Browser',
      payload: `Set-Cookie: PHPSESSID=${attackerFixedId}`,
      badge: 'Trap Cookie Planted',
    },
    {
      title: 'Step 2: Victim Navigates & Logs In',
      detail:
        'Victim visits the real application and enters credentials. The browser sends the existing ambient trap cookie along with login credentials.',
      source: 'Victim Browser',
      target: 'App Web Server',
      payload: `POST /login { user, pass } + Cookie: ${attackerFixedId}`,
      badge: 'Credentials Submitted',
    },
    {
      title: 'Step 3: Session ID Regeneration Boundary',
      detail: fixationDefense
        ? 'SECURE: session_regenerate_id(true) destroys the trap cookie and issues a fresh, cryptographically random ID!'
        : 'VULNERABLE: Server leaves the trap ID unchanged and simply flags it as authenticated in memory!',
      source: 'App Web Server',
      target: 'Session Manager',
      payload: fixationDefense ? `ROTATE -> ${regeneratedId}` : `RETAIN TRAP -> ${attackerFixedId}`,
      badge: fixationDefense ? 'Cookie Rotated ✓' : 'Trap Retained ⚠',
    },
    {
      title: 'Step 4: Session State Bound in Redis',
      detail:
        'The authenticated user identity (UID #8492) is saved to the persistent in-memory session database under the active session key.',
      source: 'App Web Server',
      target: 'Redis Session Store',
      payload: `SET session:${fixationDefense ? regeneratedId.substring(0, 14) : attackerFixedId.substring(0, 14)} { uid: 8492 }`,
      badge: 'Redis Store Bound',
    },
    {
      title: 'Step 5: Attacker Probes with Trap Cookie',
      detail: isAttackerSuccessful
        ? 'CRITICAL HIJACK: Attacker queries /account using the trap cookie. Server finds it authenticated! Attacker takes over account!'
        : 'HIJACK PREVENTED: Attacker queries with the old trap cookie, but it was destroyed during rotation! Server responds 401 Unauthorized.',
      source: 'Attacker Node',
      target: 'App Web Server',
      payload: isAttackerSuccessful
        ? 'GET /account + Cookie: trap -> 200 HIJACKED'
        : 'GET /account + Cookie: trap -> 401 REJECTED',
      badge: isAttackerSuccessful ? 'Session Hijacked' : 'Hijack Defeated',
    },
  ];

  const activeStep = stepsData[currentStep] || stepsData[0];

  // Stop autoPlay when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setAutoPlay(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (autoPlay) {
      timer = setInterval(() => {
        const next = (currentStep + 1) % stepsData.length;
        setInternalStep(next);
        onSelectStep?.(next);
        // Sync phase to step
        if (next === 0) setSessionPhase('pre_login');
        else if (next >= 1 && next <= 3) setSessionPhase('logged_in');
        else if (next === 4) setSessionPhase('attacker_tested');
      }, 3400);
    }
    return () => clearInterval(timer);
  }, [autoPlay, currentStep, onSelectStep, stepsData.length]);

  const handleStepSelect = (step: number) => {
    playTick();
    setInternalStep(step);
    onSelectStep?.(step);

    if (step === 0) setSessionPhase('pre_login');
    else if (step >= 1 && step <= 3) setSessionPhase('logged_in');
    else if (step === 4) {
      setSessionPhase('attacker_tested');
      if (!fixationDefense) playAlert();
      else playSuccess();
    }
  };

  const handleLogin = () => {
    playTick();
    setIsAnimating(true);
    handleStepSelect(1);
    setTimeout(() => {
      handleStepSelect(2);
      setTimeout(() => {
        handleStepSelect(3);
        setIsAnimating(false);
        playSuccess();
      }, 600);
    }, 600);
  };

  const handleAttackerProbe = () => {
    playTick();
    setIsAnimating(true);
    handleStepSelect(4);
    setTimeout(() => {
      setIsAnimating(false);
      if (!fixationDefense) playAlert();
      else playSuccess();
    }, 600);
  };

  const handleReset = () => {
    playTick();
    handleStepSelect(0);
    setSessionPhase('pre_login');
    setIsAnimating(false);
  };

  return (
    <div className="w-full bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 transition-colors">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Session Lifecycle &amp; State Simulator
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            Session Fixation vs. Cryptographic Rotation
          </h3>
          <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Test how attackers trap victims with pre-set session cookies, and watch how rotating the
            session identifier on login neutralizes the exploit.
          </p>
        </div>

        {/* Defense Toggle Knob */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (fixationDefense) playAlert();
              else playTick();
              const nextDef = !fixationDefense;
              setFixationDefense(nextDef);
              if (currentStep === 4) {
                if (!nextDef) playAlert();
                else playSuccess();
              }
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              fixationDefense
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse'
            )}
            title="Toggle session_regenerate_id(true) on login"
          >
            {fixationDefense ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>Rotation: {fixationDefense ? 'ENABLED (SECURE)' : 'DISABLED (VULNERABLE)'}</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setAutoPlay(!autoPlay);
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors',
              autoPlay
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark'
            )}
            title="Auto-play simulation steps"
          >
            {autoPlay ? (
              <Pause className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>{autoPlay ? 'Pause' : 'Auto-Play'}</span>
          </button>

          <button
            onClick={handleReset}
            className="btn-pop p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-muted hover:text-ink-light transition-all cursor-pointer shadow-xs"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step Scrubber Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
          <span className="font-bold uppercase tracking-wider text-ink-light dark:text-ink-dark flex items-center gap-2">
            <span>
              Protocol Step {currentStep + 1} of {stepsData.length}:
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              {activeStep.title.replace(/^Step \d+: /, '')}
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleStepSelect(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-2 py-0.5 rounded text-xs border border-parchment-300 dark:border-parchment-700 disabled:opacity-30 cursor-pointer"
            >
              Prev
            </button>
            <button
              onClick={() => handleStepSelect(Math.min(stepsData.length - 1, currentStep + 1))}
              disabled={currentStep === stepsData.length - 1}
              className="px-2 py-0.5 rounded text-xs border border-parchment-300 dark:border-parchment-700 disabled:opacity-30 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>

        {/* Tactile Step Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {stepsData.map((step, idx) => (
            <button
              key={idx}
              onClick={() => handleStepSelect(idx)}
              className={clsx(
                'px-2.5 py-2 rounded-xl text-left border transition-all cursor-pointer font-mono text-xs relative overflow-hidden',
                currentStep === idx
                  ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200 shadow-sm ring-1 ring-amber-500/50'
                  : 'bg-parchment-50 dark:bg-parchment-950/40 border-parchment-200 dark:border-parchment-800 text-ink-muted hover:border-parchment-400'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold opacity-75">#{idx + 1}</span>
                {currentStep === idx && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <div className="font-semibold text-[11px] truncate leading-tight">{step.badge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Session State KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Victim Browser Cookie"
          value={currentVictimSessionId.substring(0, 14) + '...'}
          variant={fixationDefense && currentStep >= 2 ? 'emerald' : 'amber'}
          trend="neutral"
          description={
            currentStep === 0
              ? 'Trap Cookie Planted'
              : fixationDefense
                ? 'Rotated Random Key'
                : 'Stale Trap Retained'
          }
        />
        <MetricCard
          label="Attacker Known Cookie"
          value={attackerFixedId.substring(0, 14) + '...'}
          variant="purple"
          trend="neutral"
          description="Cookie Seeded by Attacker"
        />
        <MetricCard
          label="Redis Session Store"
          value={currentStep <= 1 ? 'Anonymous' : 'Authenticated'}
          variant={currentStep <= 1 ? 'zinc' : 'emerald'}
          trend={currentStep <= 1 ? 'neutral' : 'up'}
          description={currentStep >= 2 ? 'Bound to User UID #8492' : 'Pre-Auth Anonymous State'}
        />
        <MetricCard
          label="Hijack Exploitation"
          value={
            isAttackerSuccessful
              ? 'SESSION HIJACKED'
              : currentStep === 4
                ? 'HIJACK PREVENTED'
                : 'Awaiting Step 5'
          }
          variant={isAttackerSuccessful ? 'amber' : currentStep === 4 ? 'emerald' : 'zinc'}
          trend={isAttackerSuccessful ? 'alert' : 'neutral'}
          description={
            isAttackerSuccessful
              ? 'Attacker Accesses Victim Account'
              : currentStep === 4
                ? 'Attacker Request Rejected 401'
                : 'Click "Attacker Probes" below'
          }
        />
      </div>

      {/* Main Interactive SVG System Architecture Canvas */}
      <div className="p-4 sm:p-6 rounded-2xl bg-parchment-50/80 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 relative overflow-hidden shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-ink-muted mb-3">
          <span className="font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            SESSION LIFECYCLE &amp; ROTATION TOPOLOGY
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogin}
              disabled={isAnimating}
              className="btn-pop px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Victim Logs In</span>
            </button>

            <button
              onClick={handleAttackerProbe}
              disabled={isAnimating}
              className="btn-pop px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>2. Attacker Probes Session</span>
            </button>
          </div>
        </div>

        {/* Live SVG Diagram Canvas with Continuous Animated Motion Streams */}
        <div className="w-full relative flex items-center justify-center py-2">
          <svg
            viewBox="0 0 760 310"
            className="w-full h-auto max-h-[380px] overflow-visible select-none"
          >
            <defs>
              {/* Paths for AnimateMotion */}
              {/* Path 1: Attacker -> Victim (Trap Cookie) */}
              <path id="pathAttackerToVictim" d="M 140 220 L 140 145" />

              {/* Path 2: Victim -> App Server (Login with credentials) */}
              <path id="pathVictimToServer" d="M 195 100 L 410 100" />

              {/* Path 3: App Server -> Redis Session Store */}
              <path id="pathServerToRedis" d="M 535 100 L 630 100" />
              <path id="pathRedisToServer" d="M 630 100 L 535 100" />

              {/* Path 4: Attacker -> App Server (Probe / Hijack Request) */}
              <path id="pathAttackerToServer" d="M 195 235 C 310 235, 370 180, 415 130" />
            </defs>

            {/* Wires */}
            {/* Attacker -> Victim Wire (Trap Link) */}
            <path
              d="M 140 220 L 140 145"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="5 5"
              className={clsx(
                'transition-opacity duration-300',
                currentStep === 0 ? 'animate-packet-flow opacity-90' : 'opacity-30'
              )}
            />

            {/* Victim -> Web Server Wire */}
            <path
              d="M 195 100 L 410 100"
              fill="none"
              stroke={currentStep >= 2 && fixationDefense ? '#10b981' : '#3b82f6'}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className="animate-packet-flow opacity-80"
            />

            {/* Attacker -> Web Server Wire (Hijack Attempt) */}
            <path
              d="M 195 235 C 310 235, 370 180, 415 130"
              fill="none"
              stroke={isAttackerSuccessful ? '#ef4444' : '#94a3b8'}
              strokeWidth="2.5"
              strokeDasharray="5 5"
              className={clsx(
                'transition-all duration-300',
                currentStep === 4 ? 'animate-packet-flow opacity-100' : 'opacity-30'
              )}
            />

            {/* Web Server -> Redis Session Store */}
            <path
              d="M 535 100 L 630 100"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="animate-packet-flow opacity-80"
            />

            {/* CONTINUOUS STREAMING ANIMATEMOTION PACKETS */}
            {/* 1. Attacker Plants Trap Cookie (Step 0) */}
            {currentStep === 0 && (
              <g>
                <g>
                  <animateMotion dur="1.8s" repeatCount="indefinite">
                    <mpath href="#pathAttackerToVictim" />
                  </animateMotion>
                  <rect
                    x="-45"
                    y="-12"
                    width="90"
                    height="24"
                    rx="12"
                    fill="#ef4444"
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Trap Cookie ⚠
                  </text>
                </g>
              </g>
            )}

            {/* 2. Victim Login Request (Step 1) */}
            {currentStep === 1 && (
              <g>
                <g>
                  <animateMotion dur="2.0s" repeatCount="indefinite">
                    <mpath href="#pathVictimToServer" />
                  </animateMotion>
                  <rect
                    x="-48"
                    y="-12"
                    width="96"
                    height="24"
                    rx="12"
                    fill="#2563eb"
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Login + Cookie
                  </text>
                </g>
              </g>
            )}

            {/* 3. Session Rotation / Regeneration Boundary (Step 2) */}
            {currentStep === 2 && (
              <g>
                <g>
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#pathVictimToServer" />
                  </animateMotion>
                  <rect
                    x="-50"
                    y="-13"
                    width="100"
                    height="26"
                    rx="13"
                    fill={fixationDefense ? '#10b981' : '#ef4444'}
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {fixationDefense ? 'Rotated ID ✓' : 'Stale Trap ID ⚠'}
                  </text>
                </g>
              </g>
            )}

            {/* 4. Redis Session Store Synchronization (Step 3) */}
            {currentStep === 3 && (
              <g>
                <g>
                  <animateMotion dur="1.6s" repeatCount="indefinite">
                    <mpath href="#pathServerToRedis" />
                  </animateMotion>
                  <rect
                    x="-45"
                    y="-11"
                    width="90"
                    height="22"
                    rx="11"
                    fill="#8b5cf6"
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Save UID 8492
                  </text>
                </g>
              </g>
            )}

            {/* 5. Attacker Probes with Trap ID (Step 4) */}
            {currentStep === 4 && (
              <g>
                <g>
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#pathAttackerToServer" />
                  </animateMotion>
                  <rect
                    x="-50"
                    y="-13"
                    width="100"
                    height="26"
                    rx="13"
                    fill={isAttackerSuccessful ? '#ef4444' : '#64748b'}
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isAttackerSuccessful ? 'Trap Exploit ⚠' : 'Trap Probe (401)'}
                  </text>
                </g>
              </g>
            )}

            {/* Outcome Bursts */}
            {isAttackerSuccessful && (
              <g transform="translate(425, 50)">
                <circle
                  cx="55"
                  cy="50"
                  r="65"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  className="animate-fx-burst opacity-80"
                />
              </g>
            )}

            {currentStep === 4 && !isAttackerSuccessful && (
              <g transform="translate(425, 50)">
                <circle
                  cx="55"
                  cy="50"
                  r="65"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  className="animate-fx-pop opacity-80"
                />
              </g>
            )}

            {/* NODE 1: ATTACKER NODE (x: 40, y: 195) */}
            <g transform="translate(40, 195)">
              <rect
                width="110"
                height="95"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-red-500 stroke-1.5 shadow-sm"
              />
              <circle cx="55" cy="28" r="16" fill="#fef2f2" className="dark:fill-red-950" />
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" x="45" y="18" />
              <text
                x="55"
                y="56"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Attacker Node
              </text>
              <text
                x="55"
                y="68"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-red-600 font-semibold"
              >
                Holds Trap Cookie
              </text>
              <rect
                x="6"
                y="74"
                width="98"
                height="14"
                rx="4"
                fill="#fef2f2"
                className="dark:fill-red-950/60"
              />
              <text
                x="55"
                y="84"
                textAnchor="middle"
                className="text-[6.5px] font-mono fill-red-700 font-bold"
              >
                sess_trap_9901
              </text>
            </g>

            {/* NODE 2: VICTIM BROWSER (x: 40, y: 50) */}
            <g transform="translate(40, 50)">
              <rect
                width="110"
                height="95"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-blue-500 stroke-1.5 shadow-sm"
              />
              <circle cx="55" cy="30" r="16" fill="#eff6ff" className="dark:fill-blue-950" />
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" x="45" y="20" />
              <text
                x="55"
                y="58"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Victim Browser
              </text>
              <text
                x="55"
                y="70"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-blue-600 font-semibold"
              >
                {currentStep <= 1 ? 'Pre-Auth Anonymous' : 'Logged-In Session'}
              </text>
              <rect
                x="6"
                y="76"
                width="98"
                height="14"
                rx="4"
                fill={fixationDefense && currentStep >= 2 ? '#f0fdf4' : '#fef2f2'}
                className="border"
                stroke="#cbd5e1"
                strokeWidth="0.5"
              />
              <text
                x="55"
                y="86"
                textAnchor="middle"
                className={`text-[6.5px] font-mono font-bold ${fixationDefense && currentStep >= 2 ? 'fill-emerald-700' : 'fill-red-700'}`}
              >
                {currentVictimSessionId.substring(0, 15)}..
              </text>
            </g>

            {/* NODE 3: APPLICATION SERVER (x: 410, y: 40) */}
            <g transform="translate(410, 40)">
              <rect
                width="125"
                height="115"
                rx="16"
                fill="currentColor"
                className={`text-white dark:text-parchment-950 shadow-sm ${
                  isAttackerSuccessful
                    ? 'stroke-red-500 stroke-2'
                    : currentStep === 4
                      ? 'stroke-emerald-500 stroke-2'
                      : 'stroke-purple-500 stroke-1.5'
                }`}
              />
              <circle cx="62" cy="34" r="18" fill="#faf5ff" className="dark:fill-purple-950" />
              <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" x="52" y="24" />
              <text
                x="62"
                y="66"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                App Web Server
              </text>
              <text
                x="62"
                y="78"
                textAnchor="middle"
                className="text-[8px] font-mono fill-purple-600 dark:fill-purple-400 font-semibold"
              >
                Session Manager
              </text>

              {/* Status Outcome Badge */}
              <rect
                x="8"
                y="88"
                width="109"
                height="20"
                rx="6"
                fill={isAttackerSuccessful ? '#fef2f2' : currentStep === 4 ? '#f0fdf4' : '#faf5ff'}
                className={
                  isAttackerSuccessful
                    ? 'dark:fill-red-950/40'
                    : currentStep === 4
                      ? 'dark:fill-emerald-950/40'
                      : 'dark:fill-purple-950/40'
                }
                stroke={
                  isAttackerSuccessful ? '#fca5a5' : currentStep === 4 ? '#86efac' : '#d8b4fe'
                }
                strokeWidth="0.5"
              />
              <text
                x="62"
                y="101"
                textAnchor="middle"
                className={`text-[7.5px] font-mono font-bold ${
                  isAttackerSuccessful
                    ? 'fill-red-600 dark:fill-red-400'
                    : currentStep === 4
                      ? 'fill-emerald-600 dark:fill-emerald-400'
                      : 'fill-purple-600 dark:fill-purple-400'
                }`}
              >
                {isAttackerSuccessful
                  ? '✕ SESSION HIJACKED'
                  : currentStep === 4
                    ? '✓ TRAP INVALIDATED'
                    : fixationDefense
                      ? 'Rotation Enabled'
                      : 'No Rotation'}
              </text>
            </g>

            {/* NODE 4: REDIS SESSION STORE (x: 630, y: 50) */}
            <g transform="translate(630, 50)">
              <rect
                width="110"
                height="95"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-emerald-500 stroke-1.5 shadow-sm"
              />
              <circle cx="55" cy="30" r="16" fill="#ecfdf5" className="dark:fill-emerald-950" />
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" x="45" y="20" />
              <text
                x="55"
                y="58"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Redis Session
              </text>
              <text
                x="55"
                y="70"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-emerald-600 font-semibold"
              >
                In-Memory Store
              </text>
              <rect
                x="6"
                y="76"
                width="98"
                height="14"
                rx="4"
                fill="#f0fdf4"
                className="dark:fill-emerald-950/60"
                stroke="#86efac"
                strokeWidth="0.5"
              />
              <text
                x="55"
                y="86"
                textAnchor="middle"
                className="text-[6.5px] font-mono fill-emerald-700 font-bold"
              >
                {currentStep <= 1
                  ? 'Key: anonymous'
                  : `Key: ${currentVictimSessionId.substring(0, 10)}..`}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Exploit & Defense Mechanics Card */}
      <div className="p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-500" />
            Session Fixation Attack vs Defense Sequence (Step {currentStep + 1})
          </span>
          <span
            className={clsx(
              'text-[10px] font-bold px-2 py-0.5 rounded w-fit',
              isAttackerSuccessful
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            )}
          >
            {isAttackerSuccessful ? 'Vulnerability Triggered' : 'Protected by ID Regeneration'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1">
            <span className="text-[10px] text-ink-muted uppercase font-bold block">
              1. The Attack Scenario (Fixation):
            </span>
            <p className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted leading-relaxed">
              Attacker sends victim a link with an explicit session identifier:{' '}
              <code className="text-rose-600 font-mono">?PHPSESSID=sess_attacker_trap_9901</code>.
              Victim visits and logs in. Without rotation, the server promotes that exact session ID
              to &quot;authenticated&quot;. The attacker uses{' '}
              <code className="text-rose-600 font-mono">sess_attacker_trap_9901</code> and accesses
              the account without ever knowing the password.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1">
            <span className="text-[10px] text-ink-muted uppercase font-bold block">
              2. The Architectural Defense (Rotation):
            </span>
            <p className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted leading-relaxed">
              Whenever user privilege elevates (login, role change), call{' '}
              <code className="text-emerald-600 font-mono">session_regenerate_id(true)</code>. The
              server destroys the old trap cookie and issues a fresh random cookie. The
              attacker&apos;s trap ID is completely severed from the authenticated account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
