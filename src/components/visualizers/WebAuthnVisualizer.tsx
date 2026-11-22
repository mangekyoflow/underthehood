import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Laptop,
  Server,
  Lock,
  Smartphone,
  Play,
  Pause,
  Radio,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface Props {
  currentStep?: number;
  onSelectStep?: (step: number) => void;
}

function getWebAuthnStepsData(currentOrigin: string, challenge: string, isPhishingSite: boolean) {
  return [
    {
      title: 'Step 1: Registration — Enclave Keypair Generation',
      detail:
        'Client browser invokes navigator.credentials.create(). Hardware Secure Enclave creates an asymmetric ECDSA P-256 keypair sealed inside silicon.',
      source: 'Secure Hardware Chip',
      target: 'Client Browser',
      payload: 'K_priv (Sealed in Enclave) + K_pub (Extracted)',
      badge: 'Hardware Key Gen',
    },
    {
      title: 'Step 2: Public Key Registration on Server',
      detail:
        'Client registers only K_pub with the server database. The server stores NO passwords, hashes, or crackable secrets!',
      source: 'Client Browser',
      target: 'Bank Server (RP)',
      payload: 'POST /api/register { credentialId, publicKey: K_pub }',
      badge: 'Zero Password Storage',
    },
    {
      title: 'Step 3: Server Challenge Issued',
      detail:
        'When authenticating, bank server responds with a 32-byte cryptographic nonce challenge to defeat replay attacks.',
      source: 'Bank Server (RP)',
      target: 'Client Browser',
      payload: `challenge: "${challenge}", rpId: "mybank.com"`,
      badge: 'Replay Nonce',
    },
    {
      title: 'Step 4: Browser Constructs clientDataJSON',
      detail:
        'Browser sandbox automatically injects the active URL bar domain into clientDataJSON. JavaScript cannot forge this origin!',
      source: 'Browser Engine Sandbox',
      target: 'Hardware Authenticator',
      payload: `clientDataJSON = { type: "webauthn.get", origin: "${currentOrigin}" }`,
      badge: 'Origin Sealed by Sandbox',
    },
    {
      title: 'Step 5: Biometric Verification & Enclave Sign',
      detail:
        'User touches sensor. Enclave verifies biometric presence, then signs SHA256(clientDataJSON) using the sealed private key.',
      source: 'User Biometrics',
      target: 'Secure Enclave',
      payload: `authenticatorData + ECDSA_Sign(K_priv, SHA256(clientDataJSON))`,
      badge: 'Biometric Assertion',
    },
    {
      title: 'Step 6: Server Verification & Phishing Block',
      detail: isPhishingSite
        ? 'PHISHING DETECTED! ClientDataJSON origin (evil-phish-bank.com) does NOT match expected RP origin (mybank.com). Assertion rejected!'
        : 'AUTHENTICATED! Signature valid and origin strictly matches mybank.com. Zero-trust session granted!',
      source: isPhishingSite ? 'Phishing Proxy Relay' : 'Client Browser',
      target: 'Bank Server (RP)',
      payload: isPhishingSite
        ? 'INVALID ORIGIN MISMATCH -> 403 REJECT'
        : 'ORIGIN VERIFIED -> 200 OK SESSION',
      badge: isPhishingSite ? 'Phish Defeated' : 'Verified Assertion',
    },
  ];
}

export const WebAuthnVisualizer: React.FC<Props> = ({
  currentStep: externalStep,
  onSelectStep,
}) => {
  const [internalStep, setInternalStep] = useState<number>(0);
  const currentStep = externalStep !== undefined ? externalStep : internalStep;

  // Interactive Security Knobs
  const [deviceType, setDeviceType] = useState<'touchid' | 'yubikey'>('touchid');
  const [isPhishingSite, setIsPhishingSite] = useState<boolean>(false);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authOutcome, setAuthOutcome] = useState<'IDLE' | 'SUCCESS' | 'PHISHING_BLOCKED'>('IDLE');

  const realOrigin = 'https://mybank.com';
  const currentOrigin = isPhishingSite ? 'https://evil-phish-bank.com' : realOrigin;
  const challenge = '0x8f4c2b9a1e3d77c2';

  const stepsData = getWebAuthnStepsData(currentOrigin, challenge, isPhishingSite);

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
    if (step === 5) {
      if (isPhishingSite) {
        setAuthOutcome('PHISHING_BLOCKED');
        playAlert();
      } else {
        setAuthOutcome('SUCCESS');
        playSuccess();
      }
    } else {
      setAuthOutcome('IDLE');
    }
  };

  const handleTestAuth = () => {
    playTick();
    setIsAuthenticating(true);
    setAuthOutcome('IDLE');
    handleStepSelect(4);

    setTimeout(() => {
      handleStepSelect(5);
      setIsAuthenticating(false);
      if (isPhishingSite) {
        playAlert();
        setAuthOutcome('PHISHING_BLOCKED');
      } else {
        playSuccess();
        setAuthOutcome('SUCCESS');
      }
    }, 1200);
  };

  return (
    <div className="w-full bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 transition-colors">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
              FIDO2 / Hardware Cryptography
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            Passkeys &amp; Phishing-Resistant Origin Binding
          </h3>
          <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Experience why WebAuthn is mathematically immune to credential harvesting and
            adversary-in-the-middle phishing attacks.
          </p>
        </div>

        {/* Interactive Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (!isPhishingSite) playAlert();
              else playTick();
              const nextState = !isPhishingSite;
              setIsPhishingSite(nextState);
              if (currentStep === 5) {
                setAuthOutcome(nextState ? 'PHISHING_BLOCKED' : 'SUCCESS');
              } else {
                setAuthOutcome('IDLE');
              }
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              isPhishingSite
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
            )}
            title="Toggle between real banking domain and adversary phishing clone"
          >
            {isPhishingSite ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>
              Origin: {isPhishingSite ? 'evil-phish-bank.com (PHISH)' : 'mybank.com (LEGITIMATE)'}
            </span>
          </button>

          <button
            onClick={() => {
              playTick();
              setDeviceType(deviceType === 'touchid' ? 'yubikey' : 'touchid');
            }}
            className="btn-pop px-3 py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-xs font-mono text-ink-light dark:text-ink-dark flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Select Authenticator Hardware Form Factor"
          >
            {deviceType === 'touchid' ? (
              <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>
              Hardware: {deviceType === 'touchid' ? 'Apple TouchID / Enclave' : 'YubiKey 5C NFC'}
            </span>
          </button>

          <button
            onClick={() => {
              playTick();
              setAutoPlay(!autoPlay);
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors',
              autoPlay
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark'
            )}
            title="Auto-play simulation steps"
          >
            {autoPlay ? (
              <Pause className="w-3.5 h-3.5 text-cyan-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-cyan-600" />
            )}
            <span>{autoPlay ? 'Pause' : 'Auto-Play'}</span>
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
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {stepsData.map((step, idx) => (
            <button
              key={idx}
              onClick={() => handleStepSelect(idx)}
              className={clsx(
                'px-2.5 py-2 rounded-xl text-left border transition-all cursor-pointer font-mono text-xs relative overflow-hidden',
                currentStep === idx
                  ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-sm ring-1 ring-cyan-500/50'
                  : 'bg-parchment-50 dark:bg-parchment-950/40 border-parchment-200 dark:border-parchment-800 text-ink-muted hover:border-parchment-400'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold opacity-75">#{idx + 1}</span>
                {currentStep === idx && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                )}
              </div>
              <div className="font-semibold text-[11px] truncate leading-tight">{step.badge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Real-time WebAuthn Telemetry KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Browser Origin Context"
          value={isPhishingSite ? 'evil-phish-bank.com' : 'mybank.com'}
          variant={isPhishingSite ? 'amber' : 'cyan'}
          trend={isPhishingSite ? 'alert' : 'neutral'}
          description="Enforced by Browser Sandbox"
        />
        <MetricCard
          label="clientDataJSON Origin"
          value={isPhishingSite ? 'evil-phish-bank' : 'mybank.com'}
          variant={isPhishingSite ? 'amber' : 'purple'}
          trend={isPhishingSite ? 'alert' : 'neutral'}
          description="Signed by Hardware Private Key"
        />
        <MetricCard
          label="Hardware Key Storage"
          value={deviceType === 'touchid' ? 'Secure Enclave' : 'YubiKey Element'}
          variant="emerald"
          trend="up"
          description="Private Key Never Leaves Chip"
        />
        <MetricCard
          label="Relying Party Check"
          value={
            authOutcome === 'SUCCESS'
              ? 'AUTH VERIFIED'
              : authOutcome === 'PHISHING_BLOCKED'
                ? 'PHISHING BLOCKED'
                : currentStep === 5 && isPhishingSite
                  ? 'PHISHING BLOCKED'
                  : currentStep === 5
                    ? 'AUTH VERIFIED'
                    : 'Awaiting Verification'
          }
          variant={
            authOutcome === 'SUCCESS' || (currentStep === 5 && !isPhishingSite)
              ? 'emerald'
              : authOutcome === 'PHISHING_BLOCKED' || (currentStep === 5 && isPhishingSite)
                ? 'amber'
                : 'zinc'
          }
          trend={
            authOutcome === 'SUCCESS' || (currentStep === 5 && !isPhishingSite)
              ? 'up'
              : authOutcome === 'PHISHING_BLOCKED' || (currentStep === 5 && isPhishingSite)
                ? 'alert'
                : 'neutral'
          }
          description={
            isPhishingSite ? 'rpId mismatch (evil != mybank)' : 'Cryptographic Signature Validated'
          }
        />
      </div>

      {/* Main Interactive SVG System Architecture Canvas */}
      <div className="p-4 sm:p-6 rounded-2xl bg-parchment-50/80 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 relative overflow-hidden shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-ink-muted mb-3">
          <span className="font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
            WEBAUTHN HARDWARE ORIGIN-BINDING TOPOLOGY
          </span>
          <button
            onClick={handleTestAuth}
            disabled={isAuthenticating}
            className="btn-pop px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>{isAuthenticating ? 'Signing Assertion...' : 'Simulate Passkey Touch'}</span>
          </button>
        </div>

        {/* Live SVG Diagram Canvas with Continuous Animated Motion Streams */}
        <div className="w-full relative flex items-center justify-center py-2 diagram-canvas-scroll">
          <svg
            viewBox="0 0 760 330"
            className="w-full h-auto max-h-[380px] overflow-visible select-none"
          >
            <defs>
              <linearGradient id="webauthnCyanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="webauthnRedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <linearGradient id="webauthnEmeraldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              {/* Explicit Geometric Paths for Continuous Motion */}
              {/* Path 1: Browser <-> Authenticator vertical bus */}
              <path id="pathEnclaveBus" d="M 90 145 L 90 220" />
              <path id="pathEnclaveBusRev" d="M 90 220 L 90 145" />

              {/* Path 2: Browser -> Bank (Direct registration or assertion) */}
              <path id="pathBrowserToBank" d="M 145 95 C 280 40, 470 40, 605 95" />

              {/* Path 3: Bank -> Browser (Challenge issuance) */}
              <path id="pathBankToBrowser" d="M 605 85 C 470 30, 280 30, 145 85" />

              {/* Path 4: Browser -> Phishing Proxy */}
              <path id="pathBrowserToPhish" d="M 145 110 C 230 160, 310 180, 360 205" />

              {/* Path 5: Phishing Proxy -> Bank */}
              <path id="pathPhishToBank" d="M 465 210 C 520 210, 570 170, 605 125" />
            </defs>

            {/* Wires */}
            {/* Wire 1: Browser <-> Hardware Authenticator */}
            <path
              d="M 90 145 L 90 220"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="animate-packet-flow opacity-80"
            />

            {/* Wire 2: Browser -> Bank Direct Wire */}
            <path
              d="M 145 95 C 280 40, 470 40, 605 95"
              fill="none"
              stroke={isPhishingSite ? '#94a3b8' : '#10b981'}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={clsx(
                'transition-opacity duration-300',
                isPhishingSite ? 'opacity-40' : 'animate-packet-flow opacity-90'
              )}
            />

            {/* Wire 3: Bank -> Browser Challenge Wire (when step is challenge issuance) */}
            <path
              d="M 605 85 C 470 30, 280 30, 145 85"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeDasharray="4 4"
              className="animate-packet-flow opacity-60"
            />

            {/* Wire 4: Browser -> Phishing Proxy Wire (if phishing active) */}
            {isPhishingSite && (
              <path
                d="M 145 110 C 230 160, 310 180, 360 205"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                className="animate-packet-flow opacity-90"
              />
            )}

            {/* Wire 5: Phishing Proxy -> Bank Wire (relay attempt) */}
            {isPhishingSite && (
              <path
                d="M 465 210 C 520 210, 570 170, 605 125"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-packet-flow opacity-80"
              />
            )}

            {/* CONTINUOUS STREAMING ANIMATEMOTION PACKETS */}
            {/* 1. Key generation or touch in Enclave (Steps 0, 4) */}
            {(currentStep === 0 || currentStep === 4) && (
              <g>
                <circle r="7" fill="#0284c7" className="animate-pulse shadow-sm">
                  <animateMotion dur="1.8s" repeatCount="indefinite">
                    <mpath href={currentStep === 0 ? '#pathEnclaveBus' : '#pathEnclaveBusRev'} />
                  </animateMotion>
                </circle>
              </g>
            )}

            {/* 2. Public key registration to server (Step 1) */}
            {currentStep === 1 && (
              <g>
                <g>
                  <animateMotion dur="2.4s" repeatCount="indefinite">
                    <mpath href="#pathBrowserToBank" />
                  </animateMotion>
                  <rect
                    x="-45"
                    y="-12"
                    width="90"
                    height="24"
                    rx="12"
                    fill="#0284c7"
                    className="shadow-md"
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
                    K_pub Register
                  </text>
                </g>
              </g>
            )}

            {/* 3. Challenge from Bank to Browser (Step 2) */}
            {currentStep === 2 && (
              <g>
                <g>
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#pathBankToBrowser" />
                  </animateMotion>
                  <rect
                    x="-45"
                    y="-12"
                    width="90"
                    height="24"
                    rx="12"
                    fill="#8b5cf6"
                    className="shadow-md"
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
                    Challenge Nonce
                  </text>
                </g>
              </g>
            )}

            {/* 4. Client Data Origin Construction (Step 3) */}
            {currentStep === 3 && (
              <g>
                <g>
                  <animateMotion dur="1.8s" repeatCount="indefinite">
                    <mpath href="#pathEnclaveBus" />
                  </animateMotion>
                  <rect
                    x="-42"
                    y="-11"
                    width="84"
                    height="22"
                    rx="11"
                    fill={isPhishingSite ? '#f43f5e' : '#06b6d4'}
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
                    Origin Injected
                  </text>
                </g>
              </g>
            )}

            {/* 5. Biometric touch assertion (Step 4) */}
            {currentStep === 4 && (
              <g>
                <g>
                  <animateMotion dur="1.9s" repeatCount="indefinite">
                    <mpath href="#pathEnclaveBusRev" />
                  </animateMotion>
                  <rect
                    x="-44"
                    y="-12"
                    width="88"
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
                    Signed Assertion
                  </text>
                </g>
              </g>
            )}

            {/* 6. Assertion verification / Phishing test (Step 5 or when authenticating) */}
            {(currentStep === 5 || isAuthenticating) && !isPhishingSite && (
              <g>
                <g>
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#pathBrowserToBank" />
                  </animateMotion>
                  <rect
                    x="-50"
                    y="-13"
                    width="100"
                    height="26"
                    rx="13"
                    fill="#10b981"
                    className="shadow-md"
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
                    Assertion Valid ✓
                  </text>
                </g>
              </g>
            )}

            {/* Phishing detour packets */}
            {(currentStep === 5 || isAuthenticating) && isPhishingSite && (
              <g>
                <g>
                  <animateMotion dur="2.0s" repeatCount="indefinite">
                    <mpath href="#pathBrowserToPhish" />
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
                    Phish Detour ⚠
                  </text>
                </g>
                <g>
                  <animateMotion dur="2.0s" begin="1.0s" repeatCount="indefinite">
                    <mpath href="#pathPhishToBank" />
                  </animateMotion>
                  <rect
                    x="-45"
                    y="-12"
                    width="90"
                    height="24"
                    rx="12"
                    fill="#f43f5e"
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
                    Relay Attempt
                  </text>
                </g>
              </g>
            )}

            {/* Outcome Bursts */}
            {(authOutcome === 'PHISHING_BLOCKED' || (currentStep === 5 && isPhishingSite)) && (
              <g transform="translate(605, 60)">
                <circle
                  cx="50"
                  cy="50"
                  r="65"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  className="animate-fx-burst opacity-80"
                />
              </g>
            )}

            {(authOutcome === 'SUCCESS' || (currentStep === 5 && !isPhishingSite)) && (
              <g transform="translate(605, 60)">
                <circle
                  cx="50"
                  cy="50"
                  r="65"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  className="animate-fx-pop opacity-80"
                />
              </g>
            )}

            {/* NODE 1: USER BROWSER CLIENT (x: 40, y: 50) */}
            <g transform="translate(40, 50)">
              <rect
                width="105"
                height="92"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-sky-500 stroke-1.5 shadow-sm"
              />
              <circle cx="52" cy="30" r="16" fill="#f0f9ff" className="dark:fill-sky-950" />
              <Laptop className="w-5 h-5 text-sky-600 dark:text-sky-400" x="42" y="20" />
              <text
                x="52"
                y="60"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                User Browser
              </text>
              <text
                x="52"
                y="73"
                textAnchor="middle"
                className={clsx(
                  'text-[7.5px] font-mono font-bold',
                  isPhishingSite ? 'fill-rose-600' : 'fill-sky-600'
                )}
              >
                {isPhishingSite ? 'evil-phish-bank.com' : 'mybank.com'}
              </text>
              <rect
                x="6"
                y="80"
                width="93"
                height="10"
                rx="3"
                fill="#e0f2fe"
                className="dark:fill-sky-950/70"
              />
              <text
                x="52"
                y="88"
                textAnchor="middle"
                className="text-[6.5px] font-mono fill-sky-800 dark:fill-sky-200 font-semibold"
              >
                Origin Sandbox Locked
              </text>
            </g>

            {/* NODE 2: HARDWARE AUTHENTICATOR / ENCLAVE (x: 40, y: 195) */}
            <g transform="translate(40, 195)">
              <rect
                width="105"
                height="105"
                rx="16"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-emerald-500 stroke-1.5 shadow-sm"
              />
              <circle cx="52" cy="34" r="18" fill="#ecfdf5" className="dark:fill-emerald-950" />
              <Fingerprint
                className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-pulse"
                x="40"
                y="22"
              />
              <text
                x="52"
                y="66"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Secure Enclave
              </text>
              <text
                x="52"
                y="78"
                textAnchor="middle"
                className="text-[8px] font-mono fill-emerald-600 dark:fill-emerald-400 font-semibold"
              >
                {deviceType === 'touchid' ? 'Apple TouchID' : 'YubiKey 5C NFC'}
              </text>
              <rect
                x="6"
                y="86"
                width="93"
                height="14"
                rx="4"
                fill="#f0fdf4"
                className="dark:fill-emerald-950/60"
                stroke="#86efac"
                strokeWidth="0.5"
              />
              <text
                x="52"
                y="96"
                textAnchor="middle"
                className="text-[7px] font-mono fill-emerald-700 dark:fill-emerald-300 font-bold"
              >
                K_priv Sealed in Silicon
              </text>
            </g>

            {/* NODE 3: PHISHING PROXY (MIDDLEWARE ATTACKER) (x: 340, y: 180) */}
            {isPhishingSite && (
              <g transform="translate(340, 180)">
                <circle
                  cx="60"
                  cy="45"
                  r="58"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  className="animate-fx-burst opacity-80"
                />
                <rect
                  width="125"
                  height="92"
                  rx="16"
                  fill="currentColor"
                  className="text-white dark:text-parchment-950 stroke-red-500 stroke-2 shadow-sm"
                />
                <circle cx="62" cy="28" r="16" fill="#fef2f2" className="dark:fill-red-950" />
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" x="52" y="18" />
                <text
                  x="62"
                  y="56"
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                >
                  Phishing Proxy
                </text>
                <text
                  x="62"
                  y="68"
                  textAnchor="middle"
                  className="text-[8px] font-mono fill-red-600 dark:fill-red-400 font-bold"
                >
                  evil-phish-bank.com
                </text>
                <text
                  x="62"
                  y="80"
                  textAnchor="middle"
                  className="text-[7px] font-mono fill-slate-500"
                >
                  Relays passkey to real bank
                </text>
              </g>
            )}

            {/* NODE 4: RELYING PARTY BANK SERVER (x: 605, y: 50) */}
            <g transform="translate(605, 50)">
              <rect
                width="115"
                height="115"
                rx="16"
                fill="currentColor"
                className={`text-white dark:text-parchment-950 shadow-sm ${
                  authOutcome === 'PHISHING_BLOCKED' || (currentStep === 5 && isPhishingSite)
                    ? 'stroke-red-500 stroke-2'
                    : authOutcome === 'SUCCESS' || (currentStep === 5 && !isPhishingSite)
                      ? 'stroke-emerald-500 stroke-2'
                      : 'stroke-purple-500 stroke-1.5'
                }`}
              />
              <circle cx="57" cy="36" r="18" fill="#faf5ff" className="dark:fill-purple-950" />
              <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" x="47" y="26" />
              <text
                x="57"
                y="68"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Bank Server
              </text>
              <text
                x="57"
                y="80"
                textAnchor="middle"
                className="text-[8px] font-mono fill-purple-600 dark:fill-purple-400 font-semibold"
              >
                Relying Party (RP)
              </text>

              {/* Status Outcome Badge */}
              <rect
                x="8"
                y="88"
                width="99"
                height="20"
                rx="6"
                fill={
                  authOutcome === 'PHISHING_BLOCKED' || (currentStep === 5 && isPhishingSite)
                    ? '#fef2f2'
                    : authOutcome === 'SUCCESS' || (currentStep === 5 && !isPhishingSite)
                      ? '#f0fdf4'
                      : '#faf5ff'
                }
                className={
                  authOutcome === 'PHISHING_BLOCKED' || (currentStep === 5 && isPhishingSite)
                    ? 'dark:fill-red-950/40'
                    : authOutcome === 'SUCCESS' || (currentStep === 5 && !isPhishingSite)
                      ? 'dark:fill-emerald-950/40'
                      : 'dark:fill-purple-950/40'
                }
                stroke={
                  authOutcome === 'PHISHING_BLOCKED' || (currentStep === 5 && isPhishingSite)
                    ? '#fca5a5'
                    : authOutcome === 'SUCCESS' || (currentStep === 5 && !isPhishingSite)
                      ? '#86efac'
                      : '#d8b4fe'
                }
                strokeWidth="0.5"
              />
              <text
                x="57"
                y="101"
                textAnchor="middle"
                className={`text-[7.5px] font-mono font-bold ${
                  authOutcome === 'PHISHING_BLOCKED' || (currentStep === 5 && isPhishingSite)
                    ? 'fill-red-600 dark:fill-red-400'
                    : authOutcome === 'SUCCESS' || (currentStep === 5 && !isPhishingSite)
                      ? 'fill-emerald-600 dark:fill-emerald-400'
                      : 'fill-purple-600 dark:fill-purple-400'
                }`}
              >
                {authOutcome === 'PHISHING_BLOCKED' || (currentStep === 5 && isPhishingSite)
                  ? '✕ PHISH DETECTED'
                  : authOutcome === 'SUCCESS' || (currentStep === 5 && !isPhishingSite)
                    ? '✓ LOGIN APPROVED'
                    : 'Expected: mybank.com'}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Step Payload & Cryptographic Dissector Drawer */}
      <div className="p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-600" />
            Live Wire Telemetry &amp; Cryptographic Proof (Step {currentStep + 1})
          </span>
          <span
            className={clsx(
              'text-[10px] font-bold px-2 py-0.5 rounded w-fit',
              isPhishingSite
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            )}
          >
            {isPhishingSite ? 'Origin Mismatch Discovered' : 'Origin Match Guaranteed'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink-muted uppercase font-bold">
                1. Authenticator Hardware Signed:
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold">
                clientDataJSON
              </span>
            </div>
            <div className="text-[11px] leading-relaxed bg-parchment-50 dark:bg-parchment-950 p-2 rounded border border-parchment-200 dark:border-parchment-800">
              <code>&#123;</code>
              <br />
              &nbsp;&nbsp;<code>"type": "webauthn.get",</code>
              <br />
              &nbsp;&nbsp;<code>"challenge": "{challenge}",</code>
              <br />
              &nbsp;&nbsp;
              <code
                className={
                  isPhishingSite
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-emerald-600 font-bold'
                }
              >
                "origin": "{currentOrigin}"
              </code>
              <br />
              <code>&#125;</code>
            </div>
            <span className="text-[10px] text-ink-muted block">
              Browser engine automatically feeds the actual address bar domain into the hardware
              enclave.
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink-muted uppercase font-bold">
                2. Relying Party Server Validates:
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                Strict Origin Match
              </span>
            </div>
            <div className="text-[11px] leading-relaxed bg-parchment-50 dark:bg-parchment-950 p-2 rounded border border-parchment-200 dark:border-parchment-800">
              <code>expected_origin = "https://mybank.com"</code>
              <br />
              <code>received_origin = "{currentOrigin}"</code>
              <br />
              <div
                className={clsx(
                  'mt-2 p-1.5 rounded font-bold text-center text-xs',
                  isPhishingSite
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                )}
              >
                {isPhishingSite
                  ? 'MISMATCH! Assertion rejected. Attacker gets nothing!'
                  : 'MATCH! Origin valid. Session authorized.'}
              </div>
            </div>
            <span className="text-[10px] text-ink-muted block">
              The attacker cannot alter the signed origin without breaking the hardware ECDSA
              signature.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
