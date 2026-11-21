import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Key,
  Globe,
  Database,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { playTick, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface Props {
  currentStep?: number;
  onSelectStep?: (step: number) => void;
}

function getStepDescriptions(
  challenge: string,
  attackerIntercepts: boolean,
  pkceEnabled: boolean,
  currentStep: number
) {
  return [
    {
      title: 'Step 1: In-Memory Secret & Hash Generation',
      detail:
        'Client generates high-entropy code_verifier in RAM and computes code_challenge = SHA256(verifier).',
      source: 'Client (Private RAM)',
      target: 'Client Local Memory',
      payload: `code_verifier [43 chars] -> SHA-256`,
    },
    {
      title: 'Step 2: Authorization Request via Browser Redirect',
      detail: 'Client redirects user to IdP /authorize with code_challenge and client_id.',
      source: 'Client',
      target: 'Auth Server (IdP)',
      payload: `GET /authorize?code_challenge=${challenge.substring(0, 16)}...`,
    },
    {
      title: 'Step 3: User Consent & Ephemeral Auth Code Issued',
      detail:
        'IdP records challenge, validates credentials, and redirects back to Client callback with Auth Code.',
      source: 'Auth Server (IdP)',
      target: 'Client Callback',
      payload: `HTTP 302 -> /callback?code=AUTH_CODE_771`,
    },
    {
      title: 'Step 4: Threat Simulation — Interception Window',
      detail: attackerIntercepts
        ? 'Rogue app / malicious URI listener sniffs code=AUTH_CODE_771 from browser redirect!'
        : 'Auth code arrives at client; attacker is passively monitoring redirect URI scheme.',
      source: 'OS Redirect URI Handler',
      target: attackerIntercepts ? 'Rogue Attacker App' : 'Legitimate Client',
      payload: `Sniffed: code=AUTH_CODE_771`,
    },
    {
      title: 'Step 5: Token Exchange with Verifier Proof',
      detail:
        'Client posts code PLUS raw unhashed code_verifier. IdP computes SHA256(verifier) === stored_challenge.',
      source: 'Client App',
      target: 'Auth Server (IdP)',
      payload: `POST /token { code, code_verifier }`,
    },
    {
      title: 'Step 6: Token Issued & Protected API Access',
      detail:
        pkceEnabled && (!attackerIntercepts || currentStep !== 4)
          ? 'Hash matched! Access token issued. Legitimate client queries Resource API.'
          : !pkceEnabled && attackerIntercepts
            ? 'CRITICAL EXPLOIT: Without PKCE, attacker exchanged stolen code for your access token!'
            : 'Access token issued to authenticated client.',
      source: 'Auth Server (IdP)',
      target: 'Resource API Server',
      payload: `Bearer eyJhbGciOi...`,
    },
  ];
}

export const OAuthPkceVisualizer: React.FC<Props> = ({
  currentStep: externalStep,
  onSelectStep,
}) => {
  const [internalStep, setInternalStep] = useState<number>(0);
  const currentStep = externalStep !== undefined ? externalStep : internalStep;

  // Interactive Security Knobs
  const [pkceEnabled, setPkceEnabled] = useState<boolean>(true);
  const [attackerIntercepts, setAttackerIntercepts] = useState<boolean>(false);
  const [verifier, setVerifier] = useState<string>('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
  const [challenge, setChallenge] = useState<string>('E9Melhoa2OwvFrGMTJguCH5GFW642_GWjQKqLgsDQKI');

  // Auto-play loop
  const [autoPlay, setAutoPlay] = useState<boolean>(false);

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
        const next = (currentStep + 1) % 6;
        setInternalStep(next);
        onSelectStep?.(next);
      }, 3200);
    }
    return () => clearInterval(timer);
  }, [autoPlay, currentStep, onSelectStep]);

  const regenerateSecrets = () => {
    playTick();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let newVerifier = '';
    for (let i = 0; i < 43; i++) {
      newVerifier += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVerifier(newVerifier);
    setChallenge('S256_' + newVerifier.substring(0, 14) + '...' + newVerifier.substring(32, 40));
  };

  const handleStepSelect = (step: number) => {
    playTick();
    setInternalStep(step);
    onSelectStep?.(step);
  };

  const stepDescriptions = getStepDescriptions(
    challenge,
    attackerIntercepts,
    pkceEnabled,
    currentStep
  );

  const activeDesc = stepDescriptions[currentStep] || stepDescriptions[0];

  return (
    <div className="w-full bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 transition-colors">
      {/* Visualizer Top Bar & Interactive Control Knobs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Interactive Protocol Simulation
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            OAuth 2.0 PKCE Interactive Wire Simulator
          </h3>
          <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Watch authorization codes and cryptographic verifiers physically traverse the wire.
            Toggle PKCE to see why public clients are vulnerable without it.
          </p>
        </div>

        {/* Tactile Control Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              playTick();
              setPkceEnabled(!pkceEnabled);
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              pkceEnabled
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse'
            )}
            title="Toggle RFC 7636 Proof Key for Code Exchange"
          >
            {pkceEnabled ? (
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>PKCE: {pkceEnabled ? 'ENABLED (RFC 7636)' : 'DISABLED (VULNERABLE)'}</span>
          </button>

          <button
            onClick={() => {
              if (!attackerIntercepts) playAlert();
              else playTick();
              setAttackerIntercepts(!attackerIntercepts);
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              attackerIntercepts
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300'
                : 'bg-parchment-100 dark:bg-parchment-800 border-parchment-300 dark:border-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
            )}
            title="Simulate malicious app listening to custom URI scheme"
          >
            <AlertTriangle
              className={clsx(
                'w-3.5 h-3.5',
                attackerIntercepts ? 'text-amber-600' : 'text-ink-muted'
              )}
            />
            <span>Attacker Sniffs Code: {attackerIntercepts ? 'ACTIVE' : 'INACTIVE'}</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setAutoPlay(!autoPlay);
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-xl border transition-all font-mono text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs',
              autoPlay
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300'
                : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-muted hover:text-ink-light'
            )}
            title={autoPlay ? 'Pause auto progression' : 'Auto play all steps'}
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoPlay ? 'Pause Loop' : 'Auto-Play Flow'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Protocol Telemetry KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="code_verifier (Client Memory)"
          value={verifier.substring(0, 10) + '...'}
          variant="emerald"
          trend="neutral"
          description="High-entropy private random secret"
        />
        <MetricCard
          label="code_challenge (On Wire)"
          value={pkceEnabled ? challenge.substring(0, 11) + '..' : 'null'}
          variant={pkceEnabled ? 'cyan' : 'amber'}
          trend="neutral"
          description="SHA-256 one-way cryptographic hash"
        />
        <MetricCard
          label="Auth Code Status"
          value={currentStep >= 2 ? 'AUTH_CODE_771' : 'Pending'}
          variant={attackerIntercepts && !pkceEnabled ? 'amber' : 'purple'}
          trend={attackerIntercepts && !pkceEnabled ? 'alert' : 'neutral'}
          description="Short-lived 60s redirect token"
        />
        <MetricCard
          label="Token Interception Risk"
          value={
            !pkceEnabled && attackerIntercepts
              ? '100% HIJACK'
              : pkceEnabled
                ? '0% IMMUNE'
                : '10% EXPOSED'
          }
          variant={!pkceEnabled && attackerIntercepts ? 'amber' : pkceEnabled ? 'emerald' : 'zinc'}
          trend={!pkceEnabled && attackerIntercepts ? 'alert' : 'up'}
          description={
            pkceEnabled ? 'Cryptographically Bound' : 'Static Public Client Vulnerability'
          }
        />
      </div>

      {/* Main Interactive SVG System Architecture Canvas */}
      <div className="p-4 sm:p-6 rounded-2xl bg-parchment-50/80 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 relative overflow-hidden shadow-inner">
        <div className="flex items-center justify-between text-xs font-mono text-ink-muted mb-2">
          <span>OAUTH 2.0 TOPOLOGY CANVAS &amp; CONTINUOUS PACKET FLOW</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            Step #{currentStep + 1} of 6
          </span>
        </div>

        {/* SVG Living Architecture Canvas with Continuous animateMotion */}
        <div className="w-full relative flex items-center justify-center py-4">
          <svg
            viewBox="0 0 760 330"
            className="w-full h-auto max-h-[380px] overflow-visible select-none"
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* WIRE 1: Client -> IdP Authorization Request Wire */}
            <path
              d="M 140 100 C 240 50, 360 50, 440 90"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={clsx(
                'transition-opacity duration-300',
                currentStep === 1 ? 'animate-packet-flow opacity-100' : 'opacity-40'
              )}
            />

            {/* WIRE 2: IdP -> Client Redirect Callback Wire */}
            <path
              d="M 440 120 C 350 170, 240 170, 140 130"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={clsx(
                'transition-opacity duration-300',
                currentStep === 2 ? 'animate-packet-flow opacity-100' : 'opacity-40'
              )}
            />

            {/* WIRE 3: Redirect Eavesdrop -> Attacker Rogue Node Wire */}
            <path
              d="M 290 150 L 290 220"
              fill="none"
              stroke={attackerIntercepts ? '#ef4444' : '#94a3b8'}
              strokeWidth={attackerIntercepts ? '3' : '1.5'}
              strokeDasharray="5 5"
              className={clsx(
                'transition-all duration-300',
                attackerIntercepts && (currentStep === 3 || currentStep === 4)
                  ? 'animate-packet-flow opacity-100'
                  : 'opacity-30'
              )}
            />

            {/* WIRE 4: Token Exchange Wire (Client -> IdP) */}
            <path
              d="M 140 115 L 440 105"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={clsx(
                'transition-opacity duration-300',
                currentStep === 4 ? 'animate-packet-flow opacity-100' : 'opacity-30'
              )}
            />

            {/* WIRE 5: IdP -> Resource API */}
            <path
              d="M 540 105 L 620 105"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="5 5"
              className={clsx(
                'transition-opacity duration-300',
                currentStep === 5 ? 'animate-packet-flow opacity-100' : 'opacity-40'
              )}
            />

            {/* =============================================================== */}
            {/* CONTINUOUS MOVING PACKETS ALONG PATHS (Pure SVG animateMotion)  */}
            {/* =============================================================== */}

            {/* Step 1 Packets: Client -> IdP (/authorize) */}
            {currentStep === 1 && (
              <>
                <g>
                  <circle r="6" fill="#38bdf8" filter="url(#glow)">
                    <animateMotion
                      path="M 140 100 C 240 50, 360 50, 440 90"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                <g>
                  <circle r="4.5" fill="#60a5fa" opacity="0.8">
                    <animateMotion
                      path="M 140 100 C 240 50, 360 50, 440 90"
                      dur="2s"
                      begin="0.7s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                <g>
                  <circle r="4" fill="#93c5fd" opacity="0.6">
                    <animateMotion
                      path="M 140 100 C 240 50, 360 50, 440 90"
                      dur="2s"
                      begin="1.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                <g>
                  <rect
                    x="-65"
                    y="-12"
                    width="130"
                    height="24"
                    rx="12"
                    fill="#2563eb"
                    className="shadow-lg"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    /authorize (challenge)
                  </text>
                  <animateMotion
                    path="M 140 100 C 240 50, 360 50, 440 90"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </g>
              </>
            )}

            {/* Step 2 Packets: IdP -> Client (HTTP 302 code) */}
            {currentStep === 2 && (
              <>
                <g>
                  <circle r="6" fill="#a855f7" filter="url(#glow)">
                    <animateMotion
                      path="M 440 120 C 350 170, 240 170, 140 130"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                <g>
                  <circle r="4.5" fill="#c084fc" opacity="0.8">
                    <animateMotion
                      path="M 440 120 C 350 170, 240 170, 140 130"
                      dur="2s"
                      begin="0.7s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                <g>
                  <rect
                    x="-65"
                    y="-12"
                    width="130"
                    height="24"
                    rx="12"
                    fill="#7c3aed"
                    className="shadow-lg"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    302 -&gt; code=AUTH_771
                  </text>
                  <animateMotion
                    path="M 440 120 C 350 170, 240 170, 140 130"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </g>
              </>
            )}

            {/* Step 3 or Attacker Sniffing Packets */}
            {(currentStep === 3 || attackerIntercepts) && (
              <>
                <g>
                  <circle r="6" fill="#ef4444" filter="url(#glow)">
                    <animateMotion path="M 290 150 L 290 220" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                </g>
                <g>
                  <rect
                    x="-65"
                    y="-12"
                    width="130"
                    height="24"
                    rx="12"
                    fill="#ef4444"
                    className="shadow-lg"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {attackerIntercepts ? '⚠ SNIFFED: code_771' : 'Intercept Window'}
                  </text>
                  <animateMotion path="M 290 150 L 290 220" dur="1.6s" repeatCount="indefinite" />
                </g>
              </>
            )}

            {/* Step 4 Packets: Client -> IdP Token Exchange (verifier proof) */}
            {currentStep === 4 && (
              <>
                <g>
                  <circle r="6" fill="#10b981" filter="url(#glow)">
                    <animateMotion path="M 140 115 L 440 105" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                </g>
                <g>
                  <circle r="4.5" fill="#34d399" opacity="0.8">
                    <animateMotion
                      path="M 140 115 L 440 105"
                      dur="1.8s"
                      begin="0.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                <g>
                  <rect
                    x="-70"
                    y="-12"
                    width="140"
                    height="24"
                    rx="12"
                    fill="#059669"
                    className="shadow-lg"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    POST /token (verifier)
                  </text>
                  <animateMotion path="M 140 115 L 440 105" dur="2.2s" repeatCount="indefinite" />
                </g>
              </>
            )}

            {/* Step 5 Packets: IdP -> Resource API (Access Token) */}
            {currentStep === 5 && (
              <>
                <g>
                  <circle r="6" fill="#10b981" filter="url(#glow)">
                    <animateMotion path="M 540 105 L 620 105" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                </g>
                <g>
                  <rect
                    x="-55"
                    y="-12"
                    width="110"
                    height="24"
                    rx="12"
                    fill="#059669"
                    className="shadow-lg"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Bearer Token ✓
                  </text>
                  <animateMotion path="M 540 105 L 620 105" dur="1.8s" repeatCount="indefinite" />
                </g>
              </>
            )}

            {/* NODE 1: USER BROWSER / SPA CLIENT (x: 40, y: 60) */}
            <g transform="translate(40, 60)">
              {currentStep === 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="62"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  className="animate-spot opacity-70"
                />
              )}
              <rect
                width="100"
                height="100"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-blue-500 stroke-1.5 shadow-sm"
              />
              <circle cx="50" cy="36" r="18" fill="#eff6ff" className="dark:fill-blue-950" />
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" x="40" y="26" />
              <text
                x="50"
                y="68"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                User Client
              </text>
              <text
                x="50"
                y="80"
                textAnchor="middle"
                className="text-[8px] font-mono fill-blue-600 dark:fill-blue-400 font-semibold"
              >
                SPA / Mobile App
              </text>

              {/* Private In-Memory Pill */}
              <rect
                x="5"
                y="90"
                width="90"
                height="18"
                rx="6"
                fill="#f0fdf4"
                className="dark:fill-emerald-950/60"
                stroke="#86efac"
                strokeWidth="0.5"
              />
              <text
                x="50"
                y="102"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-emerald-700 dark:fill-emerald-300 font-bold"
              >
                🔒 verifier in RAM
              </text>
            </g>

            {/* NODE 2: AUTHORIZATION SERVER (IdP) (x: 440, y: 50) */}
            <g transform="translate(440, 50)">
              {(currentStep === 1 || currentStep === 4 || currentStep === 5) && (
                <circle
                  cx="50"
                  cy="55"
                  r="66"
                  fill="none"
                  stroke={
                    currentStep === 4 && attackerIntercepts && !pkceEnabled ? '#ef4444' : '#8b5cf6'
                  }
                  strokeWidth="2"
                  className={
                    currentStep === 4 && attackerIntercepts && !pkceEnabled
                      ? 'animate-fx-burst'
                      : 'animate-spot opacity-70'
                  }
                />
              )}
              <rect
                width="100"
                height="110"
                rx="16"
                fill="currentColor"
                className={`text-white dark:text-parchment-950 shadow-sm ${
                  currentStep === 4 && attackerIntercepts && !pkceEnabled
                    ? 'stroke-red-500 stroke-2'
                    : 'stroke-purple-500 stroke-1.5'
                }`}
              />
              <circle cx="50" cy="36" r="18" fill="#f5f3ff" className="dark:fill-purple-950" />
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" x="40" y="26" />
              <text
                x="50"
                y="68"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Auth Server
              </text>
              <text
                x="50"
                y="80"
                textAnchor="middle"
                className="text-[8px] font-mono fill-purple-600 dark:fill-purple-400 font-semibold"
              >
                OAuth 2.0 / IdP
              </text>

              {/* IdP Hash Comparator Box */}
              <rect
                x="5"
                y="90"
                width="90"
                height="26"
                rx="6"
                fill="#faf5ff"
                className="dark:fill-purple-950/40"
                stroke="#d8b4fe"
                strokeWidth="0.5"
              />
              <text
                x="50"
                y="101"
                textAnchor="middle"
                className="text-[7px] font-mono fill-purple-700 dark:fill-purple-300 font-bold"
              >
                {currentStep >= 1 ? `Challenge Stored` : `IdP Idle`}
              </text>
              <text
                x="50"
                y="111"
                textAnchor="middle"
                className="text-[7px] font-mono fill-emerald-600 dark:fill-emerald-400 font-bold"
              >
                {currentStep >= 4
                  ? pkceEnabled
                    ? `✓ SHA256 Match`
                    : `✕ No PKCE Check`
                  : `Awaiting Token Req`}
              </text>
            </g>

            {/* NODE 3: ATTACKER / ROGUE INTERCEPTOR (x: 230, y: 220) */}
            <g transform="translate(230, 220)">
              {attackerIntercepts && (
                <circle
                  cx="60"
                  cy="45"
                  r="58"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  className="animate-fx-burst opacity-80"
                />
              )}
              <rect
                width="120"
                height="90"
                rx="16"
                fill="currentColor"
                className={`text-white dark:text-parchment-950 shadow-sm ${
                  attackerIntercepts
                    ? 'stroke-red-500 stroke-2'
                    : 'stroke-parchment-300 dark:stroke-parchment-700 stroke-1'
                }`}
              />
              <circle
                cx="60"
                cy="30"
                r="16"
                fill={attackerIntercepts ? '#fef2f2' : '#f8fafc'}
                className={attackerIntercepts ? 'dark:fill-red-950' : 'dark:fill-slate-900'}
              />
              <ShieldAlert
                className={`w-4 h-4 ${attackerIntercepts ? 'text-red-600' : 'text-slate-400'}`}
                x="52"
                y="22"
              />
              <text
                x="60"
                y="58"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Attacker Node
              </text>
              <text
                x="60"
                y="70"
                textAnchor="middle"
                className={`text-[8px] font-mono font-semibold ${attackerIntercepts ? 'fill-red-600 dark:fill-red-400' : 'fill-slate-400'}`}
              >
                {attackerIntercepts ? 'Rogue Custom URI Listener' : 'Passive Eavesdropper'}
              </text>
              <text
                x="60"
                y="81"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-slate-500"
              >
                {currentStep === 4 && attackerIntercepts && !pkceEnabled
                  ? '💥 EXCHANGED STOLEN TOKEN'
                  : attackerIntercepts
                    ? 'Has Code (No Verifier)'
                    : 'No Code Access'}
              </text>
            </g>

            {/* NODE 4: RESOURCE API SERVER (x: 620, y: 60) */}
            <g transform="translate(620, 60)">
              {currentStep === 5 && (
                <circle
                  cx="50"
                  cy="50"
                  r="62"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  className="animate-fx-pop opacity-80"
                />
              )}
              <rect
                width="100"
                height="100"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-emerald-500 stroke-1.5 shadow-sm"
              />
              <circle cx="50" cy="36" r="18" fill="#ecfdf5" className="dark:fill-emerald-950" />
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" x="40" y="26" />
              <text
                x="50"
                y="68"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Resource API
              </text>
              <text
                x="50"
                y="80"
                textAnchor="middle"
                className="text-[8px] font-mono fill-emerald-600 dark:fill-emerald-400 font-semibold"
              >
                Protected Backend
              </text>
              <rect
                x="5"
                y="90"
                width="90"
                height="18"
                rx="6"
                fill="#f0fdf4"
                className="dark:fill-emerald-950/60"
                stroke="#86efac"
                strokeWidth="0.5"
              />
              <text
                x="50"
                y="102"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-emerald-700 dark:fill-emerald-300 font-bold"
              >
                {currentStep === 5 ? '✓ 200 OK Response' : 'Protected by Token'}
              </text>
            </g>
          </svg>
        </div>

        {/* Step Scrubber Navigation Bar */}
        <div className="pt-3 border-t border-parchment-200 dark:border-parchment-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {stepDescriptions.map((st, sIdx) => (
              <button
                key={sIdx}
                onClick={() => handleStepSelect(sIdx)}
                className={clsx(
                  'btn-pop h-2.5 rounded-full transition-all duration-300 ease-out cursor-pointer',
                  sIdx === currentStep
                    ? 'w-7 bg-blue-600 dark:bg-blue-400 shadow-xs scale-105'
                    : sIdx < currentStep
                      ? 'w-2.5 bg-emerald-500/70 dark:bg-emerald-400/70 hover:scale-110'
                      : 'w-2.5 bg-parchment-300 dark:bg-parchment-700 hover:scale-110'
                )}
                title={st.title}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStepSelect(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="btn-pop px-3 py-1 rounded-lg border border-parchment-300 dark:border-parchment-700 text-xs font-mono disabled:opacity-40 disabled:pointer-events-none hover:bg-parchment-100 dark:hover:bg-parchment-800 transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() =>
                handleStepSelect(Math.min(stepDescriptions.length - 1, currentStep + 1))
              }
              disabled={currentStep === stepDescriptions.length - 1}
              className="btn-pop px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-semibold shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
            >
              Next Step
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Frame Inspection Card & Cryptographic Verifier Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Wire Packet Inspector (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="font-bold uppercase tracking-wider text-[11px] text-ink-light dark:text-ink-dark">
              Active Network Protocol Frame #{currentStep + 1}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
              {activeDesc.source} &rarr; {activeDesc.target}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-lg text-ink-light dark:text-ink-dark space-y-1">
            <div className="font-bold text-sm text-blue-700 dark:text-blue-400">
              {activeDesc.title}
            </div>
            <p className="font-sans text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed">
              {activeDesc.detail}
            </p>
            <div className="pt-2 border-t border-parchment-200 dark:border-parchment-800 flex items-center gap-2">
              <span className="text-ink-muted text-[11px]">Wire Data:</span>
              <code className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {activeDesc.payload}
              </code>
            </div>
          </div>
        </div>

        {/* Right: Cryptographic Key Secrets Box (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-white dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 font-mono text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              Cryptographic Secrets
            </span>
            <button
              onClick={regenerateSecrets}
              className="btn-pop hover:text-amber-600 flex items-center gap-1 text-[10px] text-ink-muted cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Re-roll
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] text-ink-muted flex justify-between">
              <span>code_verifier (Client Memory)</span>
              <span className="text-emerald-600 font-semibold">NEVER SENT IN STEP 1</span>
            </div>
            <div className="p-2 bg-parchment-100 dark:bg-parchment-900 rounded border border-parchment-200 dark:border-parchment-800 text-[10.5px] text-emerald-600 dark:text-emerald-400 truncate font-bold">
              {verifier}
            </div>

            <div className="text-[10px] text-ink-muted flex justify-between pt-1">
              <span>code_challenge = SHA256(verifier)</span>
              <span className="text-blue-600 font-semibold">PUBLIC NETWORK</span>
            </div>
            <div className="p-2 bg-parchment-100 dark:bg-parchment-900 rounded border border-parchment-200 dark:border-parchment-800 text-[10.5px] text-blue-600 dark:text-blue-400 truncate font-bold">
              {pkceEnabled ? challenge : 'null (PKCE turned off)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
