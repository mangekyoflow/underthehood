import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Cookie,
  Send,
  ArrowRight,
  ExternalLink,
  Laptop,
  Server,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  Globe,
  Radio,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface Props {
  currentStep?: number;
  onSelectStep?: (step: number) => void;
}

export const CsrfVisualizer: React.FC<Props> = ({ currentStep: externalStep, onSelectStep }) => {
  const [internalStep, setInternalStep] = useState<number>(0);
  const currentStep = externalStep !== undefined ? externalStep : internalStep;

  // Interactive Security Knobs
  const [sameSiteMode, setSameSiteMode] = useState<'None' | 'Lax' | 'Strict'>('Lax');
  const [csrfTokenEnabled, setCsrfTokenEnabled] = useState<boolean>(false);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [attackTriggered, setAttackTriggered] = useState<boolean>(false);
  const [transferExecuted, setTransferExecuted] = useState<boolean>(false);

  // In modern browsers:
  // SameSite=None sends cookies cross-site (if Secure is set).
  // SameSite=Lax blocks cookies on cross-site POST/state-changing requests.
  // SameSite=Strict blocks cookies on ALL cross-site requests.
  // Anti-CSRF token validates presence of a hidden secret token that attacker couldn't read.
  const isAttackSuccessful =
    (currentStep === 2 || attackTriggered) && sameSiteMode === 'None' && !csrfTokenEnabled;
  const isBlockedBySameSite =
    (currentStep >= 3 || attackTriggered) && (sameSiteMode === 'Lax' || sameSiteMode === 'Strict');
  const isBlockedByToken =
    (currentStep === 4 || attackTriggered) && sameSiteMode === 'None' && csrfTokenEnabled;

  const stepsData = [
    {
      title: 'Step 1: The Victim Logs into Bank.com',
      detail:
        'The user logs into their online bank, receiving an authenticated session cookie (session_id=bank_99812). The browser stores it in the cookie jar.',
      source: 'User Browser (Tab 1)',
      target: 'Bank Server',
      payload: 'Set-Cookie: session_id=bank_99812; Secure; HttpOnly',
      badge: 'Legitimate Session Set',
    },
    {
      title: 'Step 2: The Victim Visits Evil-Attacker.com',
      detail:
        'In a separate tab, the victim visits an untrusted site containing a hidden form with script: <form action="https://mybank.com/transfer" method="POST">.',
      source: 'Evil Malicious Origin',
      target: 'User Browser (Tab 2)',
      payload: 'Hidden POST Form -> Auto-submit script triggered',
      badge: 'Hidden Form Injected',
    },
    {
      title: 'Step 3: Ambient Cookie Attachment (Vulnerability)',
      detail:
        'With SameSite=None, legacy browsers automatically attached the stored banking cookie to the cross-site POST. The bank executes the transfer!',
      source: 'User Browser (Tab 2)',
      target: 'Bank Server',
      payload: 'POST /transfer { amount: 5000, to: attacker } + Cookie: session_id',
      badge: 'Cross-Site POST Forged',
    },
    {
      title: 'Step 4: SameSite Cookie Defense (Lax/Strict)',
      detail:
        'With SameSite=Lax or Strict, the browser inspects the cross-site origin and completely strips the session cookie from the cross-origin POST!',
      source: 'Browser Engine Sandbox',
      target: 'Target Bank Server',
      payload: 'POST /transfer (Cookie stripped by Browser!) -> 401 Unauthorized',
      badge: 'SameSite Cookie Stripped',
    },
    {
      title: 'Step 5: Anti-CSRF Synchronizer Token Defense',
      detail:
        'Defense-in-depth: Even if cookies were attached, the bank requires a unique per-session secret token. The attacker cannot read this token under SOP.',
      source: 'Bank Origin (Tab 1 Form)',
      target: 'Bank Server',
      payload: 'request.csrf_token === session.csrf_token (Validated)',
      badge: 'CSRF Token Validated',
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
      }, 3400);
    }
    return () => clearInterval(timer);
  }, [autoPlay, currentStep, onSelectStep, stepsData.length]);

  const handleStepSelect = (step: number) => {
    playTick();
    setInternalStep(step);
    onSelectStep?.(step);
    if (step === 2 && sameSiteMode === 'None' && !csrfTokenEnabled) {
      playAlert();
    } else if (step >= 3) {
      playSuccess();
    }
  };

  const handleRunAttack = () => {
    playTick();
    setAttackTriggered(true);
    setTransferExecuted(false);
    handleStepSelect(2);

    setTimeout(() => {
      setTransferExecuted(true);
      if (sameSiteMode === 'None' && !csrfTokenEnabled) {
        playAlert();
      } else {
        playSuccess();
      }
    }, 1200);
  };

  const handleReset = () => {
    playTick();
    setAttackTriggered(false);
    setTransferExecuted(false);
    handleStepSelect(0);
  };

  return (
    <div className="w-full bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 transition-colors">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Cross-Origin Request Security
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            CSRF Exploitation vs. SameSite Cookie Armor
          </h3>
          <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Watch how browsers historically leaked ambient credentials across origins, and test how
            modern SameSite flags and synchronizer tokens neutralize the exploit.
          </p>
        </div>

        {/* Interactive Knobs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* SameSite Mode Picker */}
          <div className="flex items-center gap-1 bg-parchment-100 dark:bg-parchment-950 p-1 rounded-xl border border-parchment-300 dark:border-parchment-700 text-xs font-mono shadow-xs">
            <span className="text-ink-muted px-2 flex items-center gap-1 font-semibold">
              <Cookie className="w-3.5 h-3.5 text-amber-500" /> SameSite:
            </span>
            {(['None', 'Lax', 'Strict'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  playTick();
                  setSameSiteMode(mode);
                  setTransferExecuted(false);
                }}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  sameSiteMode === mode
                    ? mode === 'None'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Anti-CSRF Token Toggle */}
          <button
            onClick={() => {
              playTick();
              setCsrfTokenEnabled(!csrfTokenEnabled);
              setTransferExecuted(false);
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              csrfTokenEnabled
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                : 'bg-parchment-100 dark:bg-parchment-800 border-parchment-300 dark:border-parchment-700 text-ink-muted'
            )}
            title="Toggle Anti-CSRF Synchronizer Token"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CSRF Token: {csrfTokenEnabled ? 'ENABLED' : 'DISABLED'}</span>
          </button>

          {/* Auto-Play */}
          <button
            onClick={() => {
              playTick();
              setAutoPlay(!autoPlay);
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors',
              autoPlay
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark'
            )}
            title="Auto-play simulation steps"
          >
            {autoPlay ? (
              <Pause className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>{autoPlay ? 'Pause' : 'Auto-Play'}</span>
          </button>

          {/* Reset */}
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
            <span className="text-rose-600 dark:text-rose-400 font-bold">
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
                  ? 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-200 shadow-sm ring-1 ring-rose-500/50'
                  : 'bg-parchment-50 dark:bg-parchment-950/40 border-parchment-200 dark:border-parchment-800 text-ink-muted hover:border-parchment-400'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold opacity-75">#{idx + 1}</span>
                {currentStep === idx && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <div className="font-semibold text-[11px] truncate leading-tight">{step.badge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Real-time CSRF Telemetry KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Ambient Cookie Delivery"
          value={sameSiteMode === 'None' ? 'SENT CROSS-SITE' : 'QUARANTINED'}
          variant={sameSiteMode === 'None' ? 'amber' : 'emerald'}
          trend={sameSiteMode === 'None' ? 'alert' : 'up'}
          description={
            sameSiteMode === 'None'
              ? 'Attached to 3rd-party POST'
              : `Stripped by SameSite=${sameSiteMode}`
          }
        />
        <MetricCard
          label="Anti-CSRF Synchronizer"
          value={csrfTokenEnabled ? 'Present & Valid' : 'Disabled'}
          variant={csrfTokenEnabled ? 'emerald' : 'zinc'}
          trend={csrfTokenEnabled ? 'up' : 'neutral'}
          description="Secret token bound to session"
        />
        <MetricCard
          label="Sec-Fetch-Site Header"
          value="cross-site"
          variant="purple"
          trend="neutral"
          description="Initiated by evil-attacker"
        />
        <MetricCard
          label="Bank Transaction Status"
          value={
            isAttackSuccessful
              ? 'FORGERY EXECUTED'
              : isBlockedBySameSite || isBlockedByToken
                ? 'FORGERY BLOCKED'
                : currentStep === 0
                  ? 'Logged In (Safe)'
                  : 'Awaiting POST'
          }
          variant={
            isAttackSuccessful
              ? 'amber'
              : isBlockedBySameSite || isBlockedByToken
                ? 'emerald'
                : 'cyan'
          }
          trend={
            isAttackSuccessful
              ? 'alert'
              : isBlockedBySameSite || isBlockedByToken
                ? 'up'
                : 'neutral'
          }
          description={
            isAttackSuccessful
              ? 'Attacker stole $5,000.00!'
              : isBlockedBySameSite
                ? `Protected by SameSite=${sameSiteMode}`
                : isBlockedByToken
                  ? 'Protected by CSRF Token'
                  : 'Click "Simulate Cross-Site POST"'
          }
        />
      </div>

      {/* Main Interactive SVG System Architecture Canvas */}
      <div className="p-4 sm:p-6 rounded-2xl bg-parchment-50/80 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 relative overflow-hidden shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-ink-muted mb-3">
          <span className="font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            CROSS-ORIGIN FORGERY TOPOLOGY &amp; SAMESITE DEFENSE
          </span>
          <button
            onClick={handleRunAttack}
            className="btn-pop px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Simulate Evil Cross-Site POST</span>
          </button>
        </div>

        {/* Live SVG Diagram Canvas with Continuous Animated Motion Streams */}
        <div className="w-full relative flex items-center justify-center py-2">
          <svg
            viewBox="0 0 760 330"
            className="w-full h-auto max-h-[380px] overflow-visible select-none"
          >
            <defs>
              {/* Paths for AnimateMotion */}
              {/* Path 1: Victim Tab 1 -> Bank (Normal Auth & Session) */}
              <path id="pathVictimToBank" d="M 230 85 L 595 85" />
              <path id="pathBankToVictim" d="M 595 95 L 230 95" />

              {/* Path 2: Evil Origin -> Victim Tab 2 (Hidden form auto-submit) */}
              <path id="pathEvilToBrowser" d="M 400 230 C 310 230, 240 210, 175 190" />

              {/* Path 3: Victim Tab 2 -> Bank Server (Cross-Site POST) */}
              <path id="pathCrossSitePost" d="M 230 190 C 360 210, 480 180, 595 110" />
            </defs>

            {/* Wires */}
            {/* Wire 1: Tab 1 <-> Bank Server */}
            <path
              d="M 230 90 L 595 90"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={clsx(
                'transition-opacity duration-300',
                currentStep === 0 ? 'animate-packet-flow opacity-90' : 'opacity-40'
              )}
            />

            {/* Wire 2: Evil Origin -> Browser Tab 2 (Phishing / Injected Form) */}
            <path
              d="M 400 230 C 310 230, 240 210, 175 190"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="5 5"
              className={clsx(
                'transition-opacity duration-300',
                currentStep >= 1 ? 'animate-packet-flow opacity-90' : 'opacity-30'
              )}
            />

            {/* Wire 3: Browser Tab 2 -> Bank (Cross-Site Forged POST) */}
            <path
              d="M 230 190 C 360 210, 480 180, 595 110"
              fill="none"
              stroke={
                isAttackSuccessful ? '#ef4444' : sameSiteMode !== 'None' ? '#10b981' : '#8b5cf6'
              }
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={clsx(
                'transition-all duration-300',
                currentStep >= 2 || attackTriggered
                  ? 'animate-packet-flow opacity-100'
                  : 'opacity-25'
              )}
            />

            {/* CONTINUOUS STREAMING ANIMATEMOTION PACKETS */}
            {/* 1. Legitimate login / balance check (Step 0) */}
            {currentStep === 0 && (
              <g>
                <g>
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#pathVictimToBank" />
                  </animateMotion>
                  <rect
                    x="-48"
                    y="-12"
                    width="96"
                    height="24"
                    rx="12"
                    fill="#10b981"
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
                    GET /balance + Cookie
                  </text>
                </g>
              </g>
            )}

            {/* 2. Malicious site injects hidden form (Step 1) */}
            {currentStep === 1 && (
              <g>
                <g>
                  <animateMotion dur="1.8s" repeatCount="indefinite">
                    <mpath href="#pathEvilToBrowser" />
                  </animateMotion>
                  <rect
                    x="-48"
                    y="-12"
                    width="96"
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
                    Inject Hidden Form
                  </text>
                </g>
              </g>
            )}

            {/* 3. Cross-Site POST Traveling to Bank (Steps 2, 3, 4 or attackTriggered) */}
            {(currentStep >= 2 || attackTriggered) && (
              <g>
                <g>
                  <animateMotion dur="2.4s" repeatCount="indefinite">
                    <mpath href="#pathCrossSitePost" />
                  </animateMotion>
                  <rect
                    x="-55"
                    y="-13"
                    width="110"
                    height="26"
                    rx="13"
                    fill={
                      isAttackSuccessful
                        ? '#ef4444'
                        : sameSiteMode !== 'None'
                          ? '#059669'
                          : '#2563eb'
                    }
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
                    {isAttackSuccessful
                      ? 'POST + Cookie ⚠'
                      : sameSiteMode !== 'None'
                        ? 'POST (No Cookie) ✓'
                        : csrfTokenEnabled
                          ? 'POST + CSRF Token ✓'
                          : 'POST /transfer'}
                  </text>
                </g>
              </g>
            )}

            {/* Outcome Bursts */}
            {isAttackSuccessful && (
              <g transform="translate(600, 50)">
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

            {(isBlockedBySameSite || isBlockedByToken) && (
              <g transform="translate(600, 50)">
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

            {/* NODE 1: USER BROWSER WITH 2 TABS & COOKIE JAR (x: 40, y: 35) */}
            <g transform="translate(40, 35)">
              <rect
                width="190"
                height="255"
                rx="18"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-sky-500 stroke-1.5 shadow-md"
              />

              {/* Browser Header Bar */}
              <rect
                x="0"
                y="0"
                width="190"
                height="32"
                rx="18"
                fill="#f0f9ff"
                className="dark:fill-sky-950/70"
              />
              <circle cx="15" cy="16" r="4" fill="#ef4444" />
              <circle cx="27" cy="16" r="4" fill="#f59e0b" />
              <circle cx="39" cy="16" r="4" fill="#10b981" />
              <text
                x="100"
                y="20"
                textAnchor="middle"
                className="text-[9px] font-mono font-bold fill-current text-sky-800 dark:text-sky-200"
              >
                Victim Web Browser
              </text>

              {/* Sub-tab 1: Legitimate Bank.com */}
              <g transform="translate(10, 40)">
                <rect
                  width="170"
                  height="60"
                  rx="10"
                  fill="#f0fdf4"
                  className="dark:fill-emerald-950/40"
                  stroke="#86efac"
                  strokeWidth="1"
                />
                <circle cx="16" cy="16" r="6" fill="#10b981" />
                <text
                  x="28"
                  y="19"
                  className="text-[8.5px] font-mono font-bold fill-emerald-800 dark:fill-emerald-200"
                >
                  Tab 1: mybank.com
                </text>
                <text
                  x="12"
                  y="36"
                  className="text-[7.5px] font-mono fill-emerald-700 dark:fill-emerald-300"
                >
                  Logged in as Alice ($12,450.00)
                </text>
                <text x="12" y="48" className="text-[7px] font-mono fill-slate-500">
                  Legitimate Banking Session
                </text>
              </g>

              {/* Sub-tab 2: Evil Malicious Site */}
              <g transform="translate(10, 110)">
                <rect
                  width="170"
                  height="65"
                  rx="10"
                  fill="#fef2f2"
                  className="dark:fill-red-950/40"
                  stroke="#fca5a5"
                  strokeWidth="1"
                />
                <circle cx="16" cy="16" r="6" fill="#ef4444" />
                <text
                  x="28"
                  y="19"
                  className="text-[8px] font-mono font-bold fill-red-800 dark:fill-red-200"
                >
                  Tab 2: evil-crypto.com
                </text>
                <text
                  x="12"
                  y="35"
                  className="text-[7px] font-mono fill-red-700 dark:fill-red-300 font-bold"
                >
                  &lt;form action="mybank/transfer"&gt;
                </text>
                <text x="12" y="48" className="text-[7px] font-mono fill-red-600">
                  Cross-origin auto-submitting POST
                </text>
              </g>

              {/* Browser Cookie Storage Jar */}
              <g transform="translate(10, 185)">
                <rect
                  width="170"
                  height="58"
                  rx="10"
                  fill="#f8fafc"
                  className="dark:fill-parchment-900/60"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <div className="flex items-center gap-1">
                  <Cookie className="w-3.5 h-3.5 text-amber-500" x="12" y="12" />
                  <text
                    x="30"
                    y="22"
                    className="text-[8.5px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                  >
                    Browser Cookie Jar
                  </text>
                </div>
                <text x="12" y="38" className="text-[7px] font-mono fill-ink-muted">
                  session_id=bank_99812; SameSite={sameSiteMode}
                </text>
                <text
                  x="12"
                  y="49"
                  className={clsx(
                    'text-[7px] font-mono font-bold',
                    sameSiteMode === 'None' ? 'fill-red-600' : 'fill-emerald-600'
                  )}
                >
                  {sameSiteMode === 'None'
                    ? 'Cross-Site Allowed (Vulnerable)'
                    : 'Cross-Site Blocked (Protected)'}
                </text>
              </g>
            </g>

            {/* NODE 2: ATTACKER ORIGIN SERVER (x: 390, y: 195) */}
            <g transform="translate(390, 195)">
              <rect
                width="145"
                height="95"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-red-500 stroke-1.5 shadow-sm"
              />
              <circle cx="72" cy="28" r="16" fill="#fef2f2" className="dark:fill-red-950" />
              <ExternalLink className="w-5 h-5 text-red-600 dark:text-red-400" x="62" y="18" />
              <text
                x="72"
                y="56"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Attacker Origin
              </text>
              <text
                x="72"
                y="68"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-red-600 font-semibold truncate"
              >
                evil-crypto-giveaway.com
              </text>
              <rect
                x="6"
                y="74"
                width="133"
                height="14"
                rx="4"
                fill="#fef2f2"
                className="dark:fill-red-950/60"
              />
              <text
                x="72"
                y="84"
                textAnchor="middle"
                className="text-[6.5px] font-mono fill-red-700 font-bold"
              >
                Payload: Forged Funds Transfer
              </text>
            </g>

            {/* NODE 3: BANK WEB API SERVER (x: 595, y: 40) */}
            <g transform="translate(595, 40)">
              <rect
                width="135"
                height="125"
                rx="16"
                fill="currentColor"
                className={`text-white dark:text-parchment-950 shadow-sm ${
                  isAttackSuccessful
                    ? 'stroke-red-500 stroke-2'
                    : isBlockedBySameSite || isBlockedByToken
                      ? 'stroke-emerald-500 stroke-2'
                      : 'stroke-emerald-500 stroke-1.5'
                }`}
              />
              <circle cx="67" cy="34" r="18" fill="#ecfdf5" className="dark:fill-emerald-950" />
              <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" x="57" y="24" />
              <text
                x="67"
                y="66"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Bank Server
              </text>
              <text
                x="67"
                y="78"
                textAnchor="middle"
                className="text-[8px] font-mono fill-emerald-600 dark:fill-emerald-400 font-semibold"
              >
                POST /transfer Endpoint
              </text>

              {/* Status Outcome Badge */}
              <rect
                x="8"
                y="88"
                width="119"
                height="24"
                rx="6"
                fill={
                  isAttackSuccessful
                    ? '#fef2f2'
                    : isBlockedBySameSite || isBlockedByToken
                      ? '#f0fdf4'
                      : '#f0fdf4'
                }
                className={isAttackSuccessful ? 'dark:fill-red-950/40' : 'dark:fill-emerald-950/40'}
                stroke={isAttackSuccessful ? '#fca5a5' : '#86efac'}
                strokeWidth="0.5"
              />
              <text
                x="67"
                y="102"
                textAnchor="middle"
                className={`text-[7px] font-mono font-bold ${
                  isAttackSuccessful
                    ? 'fill-red-600 dark:fill-red-400'
                    : 'fill-emerald-600 dark:fill-emerald-400'
                }`}
              >
                {isAttackSuccessful
                  ? '✕ EXPLOITED: -$5,000'
                  : isBlockedBySameSite
                    ? `✓ BLOCKED: SameSite=${sameSiteMode}`
                    : isBlockedByToken
                      ? '✓ BLOCKED: Token Validated'
                      : '✓ 200 OK Authenticated'}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Live Wire Telemetry & Dissector Drawer */}
      <div className="p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            Live Wire Telemetry &amp; HTTP Request Headers (Step {currentStep + 1})
          </span>
          <span
            className={clsx(
              'text-[10px] font-bold px-2 py-0.5 rounded w-fit',
              isAttackSuccessful
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            )}
          >
            {isAttackSuccessful ? 'Ambient Cookie Leaked' : 'Protected by Modern Cookie Armor'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1.5">
            <span className="text-[10px] text-ink-muted uppercase font-bold block">
              1. Transmitted Request Headers:
            </span>
            <div className="text-[11px] leading-relaxed bg-parchment-50 dark:bg-parchment-950 p-2 rounded border border-parchment-200 dark:border-parchment-800">
              <code>POST /transfer HTTP/1.1</code>
              <br />
              <code>Host: mybank.com</code>
              <br />
              <code>Origin: https://evil-crypto-giveaway.com</code>
              <br />
              <code>Sec-Fetch-Site: cross-site</code>
              <br />
              <code
                className={
                  sameSiteMode === 'None' ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'
                }
              >
                {sameSiteMode === 'None'
                  ? 'Cookie: session_id=bank_99812'
                  : '# Cookie STRIPPED by Browser Sandbox'}
              </code>
              <br />
              {csrfTokenEnabled ? (
                <code className="text-blue-600 font-bold">
                  X-CSRF-Token: sec_token_99a81 (Verified)
                </code>
              ) : (
                <code className="text-ink-muted"># No X-CSRF-Token supplied in body</code>
              )}
            </div>
            <span className="text-[10px] text-ink-muted block">
              When SameSite=Lax/Strict is configured, modern browsers refuse to attach cookies on
              cross-origin POSTs.
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1.5">
            <span className="text-[10px] text-ink-muted uppercase font-bold block">
              2. Bank Server Defense Decision:
            </span>
            <div className="text-[11px] leading-relaxed bg-parchment-50 dark:bg-parchment-950 p-2 rounded border border-parchment-200 dark:border-parchment-800">
              <code>auth_cookie = request.cookies.get("session_id")</code>
              <br />
              <code>if (!auth_cookie): return 401 Unauthorized</code>
              <br />
              <code>if (!verify_csrf(request)): return 403 Forbidden</code>
              <br />
              <div
                className={clsx(
                  'mt-2 p-1.5 rounded font-bold text-center text-xs',
                  isAttackSuccessful
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                )}
              >
                {isAttackSuccessful
                  ? 'CRITICAL EXPLOIT: Funds transferred to attacker!'
                  : isBlockedBySameSite
                    ? 'PROTECTED: SameSite stripped cookie, request dropped!'
                    : 'PROTECTED: Anti-CSRF token verified, unauthorized POST denied!'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
