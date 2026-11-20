import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Server,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Send,
  Sparkles,
  Key,
  Radio,
  Database,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface Props {
  currentStep?: number;
  onSelectStep?: (step: number) => void;
}

export const ZeroTrustVisualizer: React.FC<Props> = ({
  currentStep: externalStep,
  onSelectStep,
}) => {
  const [internalStep, setInternalStep] = useState<number>(0);
  const currentStep = externalStep !== undefined ? externalStep : internalStep;

  // Interactive Security Knobs
  const [architecture, setArchitecture] = useState<'perimeter' | 'zerotrust'>('zerotrust');
  const [analyticsCompromised, setAnalyticsCompromised] = useState<boolean>(true);
  const [activeTrafficSource, setActiveTrafficSource] = useState<'orders' | 'analytics'>(
    'analytics'
  );
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  const isBreached =
    architecture === 'perimeter' &&
    analyticsCompromised &&
    (activeTrafficSource === 'analytics' || currentStep === 0);
  const isZeroTrustProtected =
    architecture === 'zerotrust' && (activeTrafficSource === 'analytics' || currentStep >= 2);

  const stepsData = [
    {
      title: 'Step 1: The Flaw of Castle-and-Moat Security',
      detail:
        'Traditional networks trust all internal traffic behind the perimeter firewall. If a worker is compromised, an attacker moves laterally unimpeded over plain HTTP.',
      source: 'Ingress Firewall',
      target: 'Internal Subnet',
      payload: 'Perimeter Boundary: External filtered, Internal unrestricted',
      badge: 'Castle & Moat Flaw',
    },
    {
      title: 'Step 2: Explicit Verification & SPIFFE Cryptographic Identity',
      detail:
        'Zero Trust eliminates IP-based trust. Every service receives a short-lived X.509 certificate with a cryptographic SPIFFE ID (e.g. spiffe://cluster/sa/orders).',
      source: 'SPIRE Authority',
      target: 'Service Pod Sidecars',
      payload: 'X.509 SVID Issued: spiffe://cluster.local/ns/prod/sa/orders',
      badge: 'SPIFFE Identity Issued',
    },
    {
      title: 'Step 3: Mutual TLS (mTLS) Handshake Between Services',
      detail:
        'Both services authenticate each other. The client verifies the server’s identity, and the server verifies the client’s identity. Traffic is encrypted in transit.',
      source: 'Orders Envoy Sidecar',
      target: 'Payments Envoy Sidecar',
      payload: 'Two-Way TLS Handshake: Mutual SAN Certs Exchanged + Encrypted',
      badge: 'mTLS Handshake Verified',
    },
    {
      title: 'Step 4: Fine-Grained Layer 7 Authorization Policy',
      detail:
        'The Payments Envoy proxy checks its AuthorizationPolicy: ALLOW IF Caller == spiffe://.../orders. The compromised analytics worker is denied with 403 Forbidden!',
      source: 'Envoy Policy Engine',
      target: 'Payments API Port',
      payload: 'ALLOW orders -> /charges | DENY analytics -> 403 FORBIDDEN',
      badge: 'Microsegmentation Enforced',
    },
  ];

  const activeStep = stepsData[currentStep] || stepsData[0];

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
    if (step === 0 && architecture === 'perimeter') {
      playAlert();
    } else if (step >= 2) {
      playSuccess();
    }
  };

  const handleTriggerProbe = () => {
    playTick();
    setIsProbing(true);
    setActiveTrafficSource('analytics');
    handleStepSelect(3);

    setTimeout(() => {
      setIsProbing(false);
      if (architecture === 'perimeter' && analyticsCompromised) {
        playAlert();
      } else {
        playSuccess();
      }
    }, 1200);
  };

  const handleReset = () => {
    playTick();
    handleStepSelect(0);
    setActiveTrafficSource('orders');
    setIsProbing(false);
  };

  return (
    <div className="w-full bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 transition-colors">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Cloud &amp; Microservices Security Architecture
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            Perimeter Security vs. Zero Trust (mTLS &amp; SPIFFE)
          </h3>
          <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Never trust, always verify: moving from vulnerable castle-and-moat perimeter models to
            continuous cryptographic microsegmentation.
          </p>
        </div>

        {/* Interactive Knobs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Architecture Toggle */}
          <button
            onClick={() => {
              if (architecture === 'zerotrust') playAlert();
              else playSuccess();
              setArchitecture(architecture === 'perimeter' ? 'zerotrust' : 'perimeter');
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              architecture === 'zerotrust'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse'
            )}
            title="Toggle between Castle & Moat vs Zero Trust"
          >
            {architecture === 'zerotrust' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>
              Model:{' '}
              {architecture === 'zerotrust'
                ? 'ZERO TRUST (mTLS + SPIFFE)'
                : 'PERIMETER (CASTLE & MOAT)'}
            </span>
          </button>

          {/* Breached Worker Toggle */}
          <button
            onClick={() => {
              playTick();
              setAnalyticsCompromised(!analyticsCompromised);
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              analyticsCompromised
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                : 'bg-parchment-100 dark:bg-parchment-800 border-parchment-300 dark:border-parchment-700 text-ink-muted'
            )}
            title="Simulate compromised internal worker node"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>
              Node Breached: {analyticsCompromised ? 'YES (Simulated RCE)' : 'NO (Clean)'}
            </span>
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
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark'
            )}
            title="Auto-play simulation steps"
          >
            {autoPlay ? (
              <Pause className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-600" />
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
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stepsData.map((step, idx) => (
            <button
              key={idx}
              onClick={() => handleStepSelect(idx)}
              className={clsx(
                'px-2.5 py-2 rounded-xl text-left border transition-all cursor-pointer font-mono text-xs relative overflow-hidden',
                currentStep === idx
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/50'
                  : 'bg-parchment-50 dark:bg-parchment-950/40 border-parchment-200 dark:border-parchment-800 text-ink-muted hover:border-parchment-400'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold opacity-75">#{idx + 1}</span>
                {currentStep === idx && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <div className="font-semibold text-[11px] truncate leading-tight">{step.badge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Zero Trust Telemetry KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Peer Workload Identity"
          value={architecture === 'zerotrust' ? 'spiffe://.../orders' : '10.0.1.4 (Insecure IP)'}
          variant={architecture === 'zerotrust' ? 'emerald' : 'amber'}
          trend={architecture === 'zerotrust' ? 'up' : 'alert'}
          description={
            architecture === 'zerotrust' ? 'Cryptographic X.509 SVID' : 'Easily Spoofed Subnet IP'
          }
        />
        <MetricCard
          label="Inter-Service Wire Security"
          value={architecture === 'zerotrust' ? 'mTLS Encrypted' : 'Plaintext HTTP'}
          variant={architecture === 'zerotrust' ? 'purple' : 'amber'}
          trend={architecture === 'zerotrust' ? 'up' : 'alert'}
          description={
            architecture === 'zerotrust' ? 'TLS_AES_256_GCM' : 'Cleartext Sniffable on VPC'
          }
        />
        <MetricCard
          label="Segmentation Model"
          value={architecture === 'zerotrust' ? 'Microsegmentation' : 'Castle & Moat'}
          variant={architecture === 'zerotrust' ? 'cyan' : 'zinc'}
          trend="neutral"
          description={
            architecture === 'zerotrust'
              ? 'Per-Pod Envoy Sidecar Policy'
              : 'Perimeter Only (Trusts VPC)'
          }
        />
        <MetricCard
          label="Lateral Movement Threat"
          value={
            isBreached
              ? 'LATERAL BREACH'
              : architecture === 'zerotrust'
                ? 'BLOCKED (403)'
                : 'Isolated'
          }
          variant={isBreached ? 'amber' : architecture === 'zerotrust' ? 'emerald' : 'zinc'}
          trend={isBreached ? 'alert' : architecture === 'zerotrust' ? 'up' : 'neutral'}
          description={
            isBreached
              ? 'Attacker accessed Payments DB!'
              : architecture === 'zerotrust'
                ? 'Sidecar Denied Unauthorized Caller'
                : 'Click "Simulate Lateral Probe"'
          }
        />
      </div>

      {/* Main Interactive SVG System Architecture Canvas */}
      <div className="p-4 sm:p-6 rounded-2xl bg-parchment-50/80 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 relative overflow-hidden shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-ink-muted mb-3">
          <span className="font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            SERVICE MESH TOPOLOGY &amp; mTLS CRYPTOGRAPHIC BOUNDARY
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playTick();
                setActiveTrafficSource('orders');
                handleStepSelect(2);
              }}
              className={clsx(
                'btn-pop px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer',
                activeTrafficSource === 'orders'
                  ? 'bg-blue-600 text-white'
                  : 'bg-parchment-200 dark:bg-parchment-800 text-ink-muted'
              )}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Orders -&gt; Payments (Legit)</span>
            </button>

            <button
              onClick={handleTriggerProbe}
              className={clsx(
                'btn-pop px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer',
                activeTrafficSource === 'analytics'
                  ? 'bg-rose-600 text-white'
                  : 'bg-parchment-200 dark:bg-parchment-800 text-ink-muted'
              )}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simulate Lateral Probe (Attacker)</span>
            </button>
          </div>
        </div>

        {/* Live SVG Diagram Canvas with Continuous Animated Motion Streams */}
        <div className="w-full relative flex items-center justify-center py-2">
          <svg
            viewBox="0 0 760 330"
            className="w-full h-auto max-h-[380px] overflow-visible select-none"
          >
            <defs>
              {/* Paths for AnimateMotion */}
              {/* Path 1: Ingress Gateway -> Orders Service */}
              <path id="pathIngressToOrders" d="M 140 85 L 260 85" />

              {/* Path 2: Orders Service -> Payments API (Legitimate Traffic) */}
              <path id="pathOrdersToPayments" d="M 380 85 C 470 85, 500 110, 580 120" />

              {/* Path 3: Compromised Worker -> Payments API (Lateral Movement) */}
              <path id="pathCompromisedToPayments" d="M 380 230 C 470 230, 500 160, 580 140" />
            </defs>

            {/* Perimeter Fence Box (Visualizes Castle & Moat vs Zero Trust) */}
            <rect
              x="200"
              y="20"
              width="540"
              height="285"
              rx="20"
              fill="none"
              stroke={architecture === 'perimeter' ? '#38bdf8' : '#10b981'}
              strokeWidth="1.5"
              strokeDasharray={architecture === 'perimeter' ? '6 6' : '3 3'}
              className="opacity-40"
            />
            <text
              x="215"
              y="40"
              className={clsx(
                'text-[9px] font-mono font-bold uppercase tracking-wider',
                architecture === 'perimeter'
                  ? 'fill-sky-600 dark:fill-sky-400'
                  : 'fill-emerald-600 dark:fill-emerald-400'
              )}
            >
              {architecture === 'perimeter'
                ? 'VPC Internal Subnet (Implicit Trust)'
                : 'Zero Trust Service Mesh (No Implicit Trust)'}
            </text>

            {/* Wires */}
            {/* Wire 1: Ingress -> Orders */}
            <path
              d="M 140 85 L 260 85"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="5 5"
              className="animate-packet-flow opacity-80"
            />

            {/* Wire 2: Orders -> Payments API (Legitimate Wire) */}
            <path
              d="M 380 85 C 470 85, 500 110, 580 120"
              fill="none"
              stroke={architecture === 'zerotrust' ? '#10b981' : '#3b82f6'}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={clsx(
                'transition-opacity duration-300',
                activeTrafficSource === 'orders' ? 'animate-packet-flow opacity-90' : 'opacity-40'
              )}
            />

            {/* Wire 3: Compromised Worker -> Payments API (Lateral Movement Wire) */}
            <path
              d="M 380 230 C 470 230, 500 160, 580 140"
              fill="none"
              stroke={isBreached ? '#ef4444' : '#94a3b8'}
              strokeWidth="2.5"
              strokeDasharray="5 5"
              className={clsx(
                'transition-all duration-300',
                activeTrafficSource === 'analytics' || isProbing
                  ? 'animate-packet-flow opacity-100'
                  : 'opacity-30'
              )}
            />

            {/* CONTINUOUS STREAMING ANIMATEMOTION PACKETS */}
            {/* 1. Ingress traffic stream */}
            <g>
              <g>
                <animateMotion dur="2.4s" repeatCount="indefinite">
                  <mpath href="#pathIngressToOrders" />
                </animateMotion>
                <circle r="5" fill="#38bdf8" className="shadow-sm animate-pulse" />
              </g>
            </g>

            {/* 2. Legitimate Orders -> Payments mTLS stream */}
            {activeTrafficSource === 'orders' && (
              <g>
                <g>
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#pathOrdersToPayments" />
                  </animateMotion>
                  <rect
                    x="-55"
                    y="-13"
                    width="110"
                    height="26"
                    rx="13"
                    fill={architecture === 'zerotrust' ? '#059669' : '#2563eb'}
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
                    {architecture === 'zerotrust' ? 'mTLS [orders] ✓' : 'HTTP: orders'}
                  </text>
                </g>
              </g>
            )}

            {/* 3. Lateral movement probe stream from Compromised Worker */}
            {(activeTrafficSource === 'analytics' || isProbing) && (
              <g>
                <g>
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#pathCompromisedToPayments" />
                  </animateMotion>
                  <rect
                    x="-55"
                    y="-13"
                    width="110"
                    height="26"
                    rx="13"
                    fill={isBreached ? '#ef4444' : '#64748b'}
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
                    {isBreached ? 'Lateral Probe ⚠' : 'Probe [analytics]'}
                  </text>
                </g>
              </g>
            )}

            {/* Outcome Bursts */}
            {isBreached && (
              <g transform="translate(580, 75)">
                <circle
                  cx="65"
                  cy="50"
                  r="65"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  className="animate-fx-burst opacity-80"
                />
              </g>
            )}

            {!isBreached && (activeTrafficSource === 'orders' || architecture === 'zerotrust') && (
              <g transform="translate(580, 75)">
                <circle
                  cx="65"
                  cy="50"
                  r="65"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  className="animate-fx-pop opacity-80"
                />
              </g>
            )}

            {/* NODE 1: INGRESS GATEWAY (x: 35, y: 40) */}
            <g transform="translate(35, 40)">
              <rect
                width="105"
                height="95"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-sky-500 stroke-1.5 shadow-sm"
              />
              <circle cx="52" cy="28" r="16" fill="#f0f9ff" className="dark:fill-sky-950" />
              <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400" x="42" y="18" />
              <text
                x="52"
                y="56"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Ingress Edge
              </text>
              <text
                x="52"
                y="68"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-sky-600 font-semibold"
              >
                Perimeter Gateway
              </text>
              <rect
                x="6"
                y="74"
                width="93"
                height="14"
                rx="4"
                fill="#f0f9ff"
                className="dark:fill-sky-950/60"
              />
              <text
                x="52"
                y="84"
                textAnchor="middle"
                className="text-[6.5px] font-mono fill-sky-800 dark:fill-sky-200 font-bold"
              >
                External TLS Proxy
              </text>
            </g>

            {/* NODE 2: ORDERS SERVICE (LEGITIMATE WORKLOAD) (x: 260, y: 40) */}
            <g transform="translate(260, 40)">
              <rect
                width="120"
                height="100"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-blue-500 stroke-1.5 shadow-sm"
              />
              <circle cx="60" cy="30" r="16" fill="#eff6ff" className="dark:fill-blue-950" />
              <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" x="50" y="20" />
              <text
                x="60"
                y="58"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Orders Service
              </text>
              <text
                x="60"
                y="70"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-blue-600 font-semibold"
              >
                {architecture === 'zerotrust' ? 'Envoy Sidecar Active' : 'Unauthenticated Pod'}
              </text>
              <rect
                x="6"
                y="76"
                width="108"
                height="16"
                rx="4"
                fill="#eff6ff"
                className="dark:fill-blue-950/60"
                stroke="#93c5fd"
                strokeWidth="0.5"
              />
              <text
                x="60"
                y="87"
                textAnchor="middle"
                className="text-[6.5px] font-mono fill-blue-800 dark:fill-blue-200 font-bold truncate"
              >
                {architecture === 'zerotrust' ? 'spiffe://.../orders' : 'IP: 10.0.1.4'}
              </text>
            </g>

            {/* NODE 3: ANALYTICS WORKER (COMPROMISED NODE) (x: 260, y: 185) */}
            <g transform="translate(260, 185)">
              <rect
                width="120"
                height="105"
                rx="16"
                fill="currentColor"
                className={clsx(
                  'text-white dark:text-parchment-950 shadow-sm',
                  analyticsCompromised
                    ? 'stroke-red-500 stroke-2'
                    : 'stroke-parchment-300 dark:stroke-parchment-700 stroke-1'
                )}
              />
              <circle cx="60" cy="30" r="16" fill="#fef2f2" className="dark:fill-red-950" />
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" x="50" y="20" />
              <text
                x="60"
                y="58"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Analytics Worker
              </text>
              <text
                x="60"
                y="70"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-red-600 font-semibold"
              >
                {analyticsCompromised ? 'BREACHED (Remote Exploit)' : 'Clean Worker'}
              </text>
              <rect
                x="6"
                y="76"
                width="108"
                height="20"
                rx="4"
                fill="#fef2f2"
                className="dark:fill-red-950/60"
                stroke="#fca5a5"
                strokeWidth="0.5"
              />
              <text
                x="60"
                y="86"
                textAnchor="middle"
                className="text-[6.5px] font-mono fill-red-700 font-bold"
              >
                {architecture === 'zerotrust'
                  ? 'spiffe://.../analytics'
                  : 'Pivots across internal port'}
              </text>
              <text
                x="60"
                y="93"
                textAnchor="middle"
                className="text-[6px] font-mono fill-red-600 font-semibold"
              >
                {architecture === 'zerotrust'
                  ? '(Unauthorized for Payments)'
                  : 'No identity required'}
              </text>
            </g>

            {/* NODE 4: PAYMENTS API & VAULT (CORE ASSET) (x: 580, y: 65) */}
            <g transform="translate(580, 65)">
              <rect
                width="140"
                height="130"
                rx="18"
                fill="currentColor"
                className={`text-white dark:text-parchment-950 shadow-md ${
                  isBreached ? 'stroke-red-500 stroke-2' : 'stroke-emerald-500 stroke-2'
                }`}
              />
              <circle cx="70" cy="34" r="18" fill="#faf5ff" className="dark:fill-purple-950" />
              <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" x="60" y="24" />
              <text
                x="70"
                y="66"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Payments API &amp; Vault
              </text>
              <text
                x="70"
                y="78"
                textAnchor="middle"
                className="text-[8px] font-mono fill-purple-600 dark:fill-purple-400 font-semibold"
              >
                POST /charges Endpoint
              </text>

              {/* Status Outcome Badge */}
              <rect
                x="8"
                y="88"
                width="124"
                height="32"
                rx="6"
                fill={isBreached ? '#fef2f2' : '#f0fdf4'}
                className={isBreached ? 'dark:fill-red-950/40' : 'dark:fill-emerald-950/40'}
                stroke={isBreached ? '#fca5a5' : '#86efac'}
                strokeWidth="0.5"
              />
              <text
                x="70"
                y="102"
                textAnchor="middle"
                className={`text-[7.5px] font-mono font-bold ${
                  isBreached
                    ? 'fill-red-600 dark:fill-red-400'
                    : 'fill-emerald-600 dark:fill-emerald-400'
                }`}
              >
                {isBreached ? '✕ LATERAL EXPLOIT!' : '✓ POLICY ENFORCED'}
              </text>
              <text
                x="70"
                y="113"
                textAnchor="middle"
                className={`text-[6.5px] font-mono font-bold ${
                  isBreached
                    ? 'fill-red-600 dark:fill-red-400'
                    : 'fill-emerald-600 dark:fill-emerald-400'
                }`}
              >
                {isBreached
                  ? 'Attacker Accessed Vault'
                  : architecture === 'zerotrust'
                    ? 'mTLS: Valid Caller Only'
                    : '200 OK'}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Live Wire Telemetry & Dissector Drawer */}
      <div className="p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Zero Trust Service-to-Service Authorization Telemetry (Step {currentStep + 1})
          </span>
          <span
            className={clsx(
              'text-[10px] font-bold px-2 py-0.5 rounded w-fit',
              isBreached
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            )}
          >
            {isBreached
              ? 'Perimeter Breached: Lateral Movement'
              : 'Zero Trust Enforced: Least Privilege Validated'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1.5">
            <span className="text-[10px] text-ink-muted uppercase font-bold block">
              1. Cryptographic Workload SVID:
            </span>
            <div className="text-[11px] leading-relaxed bg-parchment-50 dark:bg-parchment-950 p-2 rounded border border-parchment-200 dark:border-parchment-800">
              <code>Client IP: 10.0.1.4</code>
              <br />
              <code
                className={
                  architecture === 'zerotrust'
                    ? 'text-emerald-600 font-bold'
                    : 'text-rose-600 font-bold'
                }
              >
                {architecture === 'zerotrust'
                  ? activeTrafficSource === 'orders'
                    ? 'SAN URI: spiffe://cluster.local/ns/prod/sa/orders'
                    : 'SAN URI: spiffe://cluster.local/ns/prod/sa/analytics'
                  : 'X.509 SVID: NONE (Unauthenticated Plaintext HTTP)'}
              </code>
              <br />
              <code>
                TLS Cipher:{' '}
                {architecture === 'zerotrust' ? 'TLS_AES_256_GCM_SHA384' : 'CLEAR_PLAINTEXT'}
              </code>
            </div>
            <span className="text-[10px] text-ink-muted block">
              In Zero Trust, identity is rooted in asymmetric keys, never ephemeral network IPs.
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1.5">
            <span className="text-[10px] text-ink-muted uppercase font-bold block">
              2. Payments Envoy Policy Decision:
            </span>
            <div className="text-[11px] leading-relaxed bg-parchment-50 dark:bg-parchment-950 p-2 rounded border border-parchment-200 dark:border-parchment-800">
              <code>rule: ALLOW IF principal == "spiffe://.../sa/orders"</code>
              <br />
              <code>
                caller:{' '}
                {architecture === 'zerotrust'
                  ? activeTrafficSource === 'orders'
                    ? 'spiffe://.../sa/orders'
                    : 'spiffe://.../sa/analytics'
                  : 'ANY (Subnet IP 10.0.1.4)'}
              </code>
              <br />
              <div
                className={clsx(
                  'mt-2 p-1.5 rounded font-bold text-center text-xs',
                  isBreached
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                )}
              >
                {isBreached
                  ? 'CRITICAL EXPLOIT: Attacker queries /charges without credentials!'
                  : architecture === 'zerotrust' && activeTrafficSource === 'analytics'
                    ? '403 FORBIDDEN: Analytics worker denied access to Payments!'
                    : '200 OK: Orders service authorized via mTLS!'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
