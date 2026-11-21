import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  Radio,
  Server,
  Laptop,
  RefreshCw,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface Props {
  currentStep?: number;
  onSelectStep?: (step: number) => void;
}

// Pure DH modular exponentiation
function modPow(base: number, exp: number, mod: number): number {
  let res = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) res = (res * base) % mod;
    base = (base * base) % mod;
    exp = Math.floor(exp / 2);
  }
  return res;
}

function getTlsStepsData(
  clientPublic: number,
  serverPublic: number,
  clientDerivedSecret: number,
  serverDerivedSecret: number
) {
  return [
    {
      title: 'Step 1: ClientHello & Ephemeral Key Share',
      detail:
        'TLS 1.3 eliminates round-trips! Client generates ephemeral secret a=6 and immediately sends ClientHello with KeyShare A=g^a mod p.',
      source: 'Client Browser',
      target: 'TLS Web Server',
      payload: `ClientHello { cipher: TLS_AES_256_GCM, KeyShare A: ${clientPublic} }`,
      badge: '0-RTT Speculative Key Share',
    },
    {
      title: 'Step 2: ServerHello & Encrypted Certificate',
      detail:
        'Server generates ephemeral secret b=15, computes public B=g^b mod p, and immediately derives shared secret S! Server certificate is encrypted in TLS 1.3.',
      source: 'TLS Web Server',
      target: 'Client Browser',
      payload: `ServerHello { KeyShare B: ${serverPublic}, EncryptedExtensions, EncryptedCert }`,
      badge: 'Server Key Share & Encrypted Cert',
    },
    {
      title: 'Step 3: Shared Secret & HKDF Key Derivation',
      detail:
        'Both sides calculate identical shared secret S = g^(ab) mod p without S ever traversing the wire! HKDF derives AES-256-GCM symmetric session keys.',
      source: 'Independent Math (Both Nodes)',
      target: 'Local Crypto Engines',
      payload: `Shared Secret S: ${clientDerivedSecret} === ${serverDerivedSecret} -> HKDF -> Traffic Keys`,
      badge: 'Symmetric Keys Derived',
    },
    {
      title: 'Step 4: 1-RTT Handshake Complete — Encrypted Application Data',
      detail:
        'Handshake complete in just 1-RTT! All subsequent HTTP requests and responses travel as AEAD authenticated ciphertext blocks.',
      source: 'Client Browser <-> Web Server',
      target: 'Secure Symmetric Tunnel',
      payload: 'Encrypted Application Traffic (AES-256-GCM AEAD)',
      badge: '1-RTT Encrypted Channel',
    },
  ];
}

export const TlsHandshakeVisualizer: React.FC<Props> = ({
  currentStep: externalStep,
  onSelectStep,
}) => {
  const [internalStep, setInternalStep] = useState<number>(0);
  const currentStep = externalStep !== undefined ? externalStep : internalStep;

  // Interactive Security Knobs
  const [eavesdropperActive, setEavesdropperActive] = useState<boolean>(true);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [prime] = useState(23); // illustrative DH prime
  const [gen] = useState(5); // generator
  const [clientPrivate, setClientPrivate] = useState<number>(6);
  const [serverPrivate, setServerPrivate] = useState<number>(15);

  const clientPublic = modPow(gen, clientPrivate, prime); // g^a mod p
  const serverPublic = modPow(gen, serverPrivate, prime); // g^b mod p

  // Derived Shared Secret
  const clientDerivedSecret = modPow(serverPublic, clientPrivate, prime); // B^a mod p
  const serverDerivedSecret = modPow(clientPublic, serverPrivate, prime); // A^b mod p

  const isEncrypted = currentStep >= 3;

  const stepsData = getTlsStepsData(
    clientPublic,
    serverPublic,
    clientDerivedSecret,
    serverDerivedSecret
  );

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
    if (step >= 2) {
      playSuccess();
    }
  };

  const regenerateSecrets = () => {
    playTick();
    const newA = Math.floor(Math.random() * 12) + 3;
    const newB = Math.floor(Math.random() * 12) + 3;
    setClientPrivate(newA);
    setServerPrivate(newB);
  };

  const handleReset = () => {
    playTick();
    handleStepSelect(0);
  };

  return (
    <div className="w-full bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 transition-colors">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Transport Layer Security
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            TLS 1.3 Handshake &amp; Diffie-Hellman Key Exchange
          </h3>
          <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Zero-round-trip cryptographic negotiation: how Ephemeral Elliptic-Curve Diffie-Hellman
            establishes perfect forward secrecy over an insecure network.
          </p>
        </div>

        {/* Interactive Knobs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Eavesdropper Wire Tap Toggle */}
          <button
            onClick={() => {
              if (!eavesdropperActive) playAlert();
              else playTick();
              setEavesdropperActive(!eavesdropperActive);
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              eavesdropperActive
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                : 'bg-parchment-100 dark:bg-parchment-800 border-parchment-300 dark:border-parchment-700 text-ink-muted'
            )}
            title="Toggle passive wire eavesdropper"
          >
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>Wire Eavesdropper: {eavesdropperActive ? 'SNIFFING WIRE' : 'OFFLINE'}</span>
          </button>

          {/* Regenerate Ephemeral Keys */}
          <button
            onClick={regenerateSecrets}
            className="btn-pop px-3 py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-xs font-mono text-ink-light dark:text-ink-dark flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Regenerate client and server ephemeral private exponents"
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
            <span>New DH Keys</span>
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
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300'
                : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark'
            )}
            title="Auto-play simulation steps"
          >
            {autoPlay ? (
              <Pause className="w-3.5 h-3.5 text-purple-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-purple-600" />
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
            <span className="text-purple-600 dark:text-purple-400 font-bold">
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
                  ? 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500 text-purple-900 dark:text-purple-200 shadow-sm ring-1 ring-purple-500/50'
                  : 'bg-parchment-50 dark:bg-parchment-950/40 border-parchment-200 dark:border-parchment-800 text-ink-muted hover:border-parchment-400'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold opacity-75">#{idx + 1}</span>
                {currentStep === idx && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                )}
              </div>
              <div className="font-semibold text-[11px] truncate leading-tight">{step.badge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Real-time TLS 1.3 Telemetry KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Handshake Latency"
          value={currentStep >= 3 ? '1-RTT Complete' : 'Negotiating'}
          variant="cyan"
          trend="up"
          description="Half the round-trips of TLS 1.2"
        />
        <MetricCard
          label="Forward Secrecy (PFS)"
          value="ECDHE Active"
          variant="emerald"
          trend="up"
          description="Ephemeral keys discarded after session"
        />
        <MetricCard
          label="Wire Transmission State"
          value={isEncrypted ? 'AES-256-GCM AEAD' : 'Handshake Negotiation'}
          variant={isEncrypted ? 'emerald' : 'purple'}
          trend={isEncrypted ? 'up' : 'neutral'}
          description={isEncrypted ? 'Authenticated Ciphertext' : 'Public Key Shares Transmitted'}
        />
        <MetricCard
          label="Eavesdropper Interception"
          value="DECRYPTION IMPOSSIBLE"
          variant="emerald"
          trend="neutral"
          description="Discrete Log problem shields secrets"
        />
      </div>

      {/* Main Interactive SVG System Architecture Canvas */}
      <div className="p-4 sm:p-6 rounded-2xl bg-parchment-50/80 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 relative overflow-hidden shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-ink-muted mb-3">
          <span className="font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            TLS 1.3 WIRE TOPOLOGY &amp; CONTINUOUS CRYPTOGRAPHIC STREAM
          </span>
          <span className="text-xs font-mono text-purple-700 dark:text-purple-300 font-semibold">
            Cipher: TLS_AES_256_GCM_SHA384
          </span>
        </div>

        {/* Live SVG Diagram Canvas with Continuous Animated Motion Streams */}
        <div className="w-full relative flex items-center justify-center py-2">
          <svg
            viewBox="0 0 760 330"
            className="w-full h-auto max-h-[380px] overflow-visible select-none"
          >
            <defs>
              {/* Paths for AnimateMotion */}
              {/* Path 1: Client -> Server (ClientHello) */}
              <path id="pathClientToServerUpper" d="M 150 90 L 600 90" />

              {/* Path 2: Server -> Client (ServerHello) */}
              <path id="pathServerToClientUpper" d="M 600 110 L 150 110" />

              {/* Path 3: Encrypted Client -> Server App Data */}
              <path id="pathEncryptedClientToServer" d="M 150 95 L 600 95" />

              {/* Path 4: Encrypted Server -> Client App Data */}
              <path id="pathEncryptedServerToClient" d="M 600 105 L 150 105" />

              {/* Path 5: Wire Tap to Eavesdropper Eve */}
              <path id="pathWireTap" d="M 375 100 L 375 200" />
            </defs>

            {/* Wires */}
            {/* Wire 1: Client <-> Server Main Communication Bus */}
            <path
              d="M 150 100 L 600 100"
              fill="none"
              stroke={isEncrypted ? '#10b981' : '#8b5cf6'}
              strokeWidth="3"
              strokeDasharray={isEncrypted ? '8 8' : '5 5'}
              className="animate-packet-flow opacity-90"
            />

            {/* Wire 2: Passive Wire Tap to Eavesdropper */}
            {eavesdropperActive && (
              <path
                d="M 375 100 L 375 200"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-packet-flow opacity-70"
              />
            )}

            {/* CONTINUOUS STREAMING ANIMATEMOTION PACKETS */}
            {/* 1. ClientHello + Key Share A (Step 0) */}
            {currentStep === 0 && (
              <g>
                <g>
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#pathClientToServerUpper" />
                  </animateMotion>
                  <rect
                    x="-55"
                    y="-13"
                    width="110"
                    height="26"
                    rx="13"
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
                    ClientHello (A={clientPublic})
                  </text>
                </g>
              </g>
            )}

            {/* 2. ServerHello + Key Share B + EncryptedCert (Step 1) */}
            {currentStep === 1 && (
              <g>
                <g>
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#pathServerToClientUpper" />
                  </animateMotion>
                  <rect
                    x="-60"
                    y="-13"
                    width="120"
                    height="26"
                    rx="13"
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
                    ServerHello (B={serverPublic})
                  </text>
                </g>
              </g>
            )}

            {/* 3. Key Derivation Boundary (Step 2) */}
            {currentStep === 2 && (
              <g>
                <g>
                  <animateMotion dur="2.4s" repeatCount="indefinite">
                    <mpath href="#pathClientToServerUpper" />
                  </animateMotion>
                  <rect
                    x="-55"
                    y="-13"
                    width="110"
                    height="26"
                    rx="13"
                    fill="#059669"
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
                    Finished [S={clientDerivedSecret}] ✓
                  </text>
                </g>
              </g>
            )}

            {/* 4. Full Encrypted 1-RTT Application Streams (Step 3) */}
            {currentStep === 3 && (
              <g>
                {/* Client -> Server Encrypted HTTP Frame */}
                <g>
                  <animateMotion dur="2.0s" repeatCount="indefinite">
                    <mpath href="#pathEncryptedClientToServer" />
                  </animateMotion>
                  <rect
                    x="-55"
                    y="-13"
                    width="110"
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
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    🔒 GET /account (AES)
                  </text>
                </g>

                {/* Server -> Client Encrypted HTTP Response */}
                <g>
                  <animateMotion dur="2.0s" begin="1.0s" repeatCount="indefinite">
                    <mpath href="#pathEncryptedServerToClient" />
                  </animateMotion>
                  <rect
                    x="-55"
                    y="-13"
                    width="110"
                    height="26"
                    rx="13"
                    fill="#059669"
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
                    🔒 200 OK (AES)
                  </text>
                </g>
              </g>
            )}

            {/* Wire Tap Stream into Eve */}
            {eavesdropperActive && (
              <g>
                <g>
                  <animateMotion dur="1.8s" repeatCount="indefinite">
                    <mpath href="#pathWireTap" />
                  </animateMotion>
                  <circle r="4" fill="#f59e0b" className="shadow-xs animate-pulse" />
                </g>
              </g>
            )}

            {/* Outcome Bursts on Crypto Tunnel Established */}
            {currentStep >= 2 && (
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

            {/* NODE 1: CLIENT BROWSER (x: 35, y: 45) */}
            <g transform="translate(35, 45)">
              <rect
                width="115"
                height="110"
                rx="18"
                fill="currentColor"
                className="text-white dark:text-parchment-950 stroke-sky-500 stroke-1.5 shadow-sm"
              />
              <circle cx="57" cy="30" r="16" fill="#f0f9ff" className="dark:fill-sky-950" />
              <Laptop className="w-5 h-5 text-sky-600 dark:text-sky-400" x="47" y="20" />
              <text
                x="57"
                y="60"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                Client Browser
              </text>
              <text
                x="57"
                y="72"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-sky-600 font-semibold"
              >
                Secret a = {clientPrivate}
              </text>
              <rect
                x="6"
                y="78"
                width="103"
                height="24"
                rx="4"
                fill="#f0f9ff"
                className="dark:fill-sky-950/60"
                stroke="#bae6fd"
                strokeWidth="0.5"
              />
              <text
                x="57"
                y="89"
                textAnchor="middle"
                className="text-[7px] font-mono fill-sky-800 dark:fill-sky-200 font-bold"
              >
                Public Share A: {clientPublic}
              </text>
              <text
                x="57"
                y="98"
                textAnchor="middle"
                className="text-[6.5px] font-mono fill-emerald-600 font-bold"
              >
                {currentStep >= 2 ? `Derived S: ${clientDerivedSecret}` : 'Deriving Secret...'}
              </text>
            </g>

            {/* NODE 2: WIRE EAVESDROPPER EVE (x: 300, y: 195) */}
            {eavesdropperActive && (
              <g transform="translate(300, 195)">
                <rect
                  width="150"
                  height="100"
                  rx="16"
                  fill="currentColor"
                  className="text-white dark:text-parchment-950 stroke-amber-500 stroke-1.5 shadow-sm"
                />
                <circle cx="75" cy="26" r="14" fill="#fffbeb" className="dark:fill-amber-950" />
                <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" x="67" y="18" />
                <text
                  x="75"
                  y="52"
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                >
                  Passive Wire Tap (Eve)
                </text>
                <text
                  x="75"
                  y="64"
                  textAnchor="middle"
                  className="text-[7.5px] font-mono fill-amber-600 font-bold"
                >
                  Intercepts: A={clientPublic}, B={serverPublic}
                </text>
                <rect
                  x="6"
                  y="70"
                  width="138"
                  height="22"
                  rx="4"
                  fill="#fffbeb"
                  className="dark:fill-amber-950/60"
                  stroke="#fde68a"
                  strokeWidth="0.5"
                />
                <text
                  x="75"
                  y="81"
                  textAnchor="middle"
                  className="text-[6.5px] font-mono fill-amber-800 dark:fill-amber-200 font-bold"
                >
                  Cannot Solve Discrete Log!
                </text>
                <text
                  x="75"
                  y="89"
                  textAnchor="middle"
                  className="text-[6px] font-mono fill-emerald-700 dark:fill-emerald-300 font-bold"
                >
                  Ciphertext Unreadable
                </text>
              </g>
            )}

            {/* NODE 3: TLS 1.3 WEB SERVER (x: 600, y: 45) */}
            <g transform="translate(600, 45)">
              <rect
                width="115"
                height="110"
                rx="18"
                fill="currentColor"
                className={`text-white dark:text-parchment-950 shadow-sm ${
                  isEncrypted ? 'stroke-emerald-500 stroke-2' : 'stroke-purple-500 stroke-1.5'
                }`}
              />
              <circle cx="57" cy="30" r="16" fill="#faf5ff" className="dark:fill-purple-950" />
              <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" x="47" y="20" />
              <text
                x="57"
                y="60"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                TLS 1.3 Server
              </text>
              <text
                x="57"
                y="72"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-purple-600 font-semibold"
              >
                Secret b = {serverPrivate}
              </text>
              <rect
                x="6"
                y="78"
                width="103"
                height="24"
                rx="4"
                fill="#faf5ff"
                className="dark:fill-purple-950/60"
                stroke="#e9d5ff"
                strokeWidth="0.5"
              />
              <text
                x="57"
                y="89"
                textAnchor="middle"
                className="text-[7px] font-mono fill-purple-800 dark:fill-purple-200 font-bold"
              >
                Public Share B: {serverPublic}
              </text>
              <text
                x="57"
                y="98"
                textAnchor="middle"
                className="text-[6.5px] font-mono fill-emerald-600 font-bold"
              >
                {currentStep >= 2 ? `Derived S: ${serverDerivedSecret}` : 'Deriving Secret...'}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Ephemeral Diffie-Hellman Math Matrix */}
      <div className="p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-purple-600" />
            Elliptic-Curve Diffie-Hellman (ECDHE) Live Math Engine (Step {currentStep + 1})
          </span>
          <span className="text-[10px] text-ink-muted">
            Generator g = {gen}, Prime modulus p = {prime}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Client Secret Input */}
          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1">
            <div className="text-blue-600 dark:text-blue-400 font-bold mb-1">
              1. Client Secret Exponent:
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span>Private key `a`:</span>
              <input
                type="number"
                min="2"
                max="20"
                value={clientPrivate}
                onChange={(e) => setClientPrivate(Number(e.target.value) || 2)}
                className="w-12 px-1 text-center rounded border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-950 font-bold"
              />
            </div>
            <div className="text-[10px] text-ink-muted mt-1">
              Public Key Share{' '}
              <code className="text-blue-600 font-bold">
                A = {gen}^{clientPrivate} mod {prime} = {clientPublic}
              </code>
            </div>
          </div>

          {/* What Eve Sees */}
          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/40 space-y-1">
            <div className="text-amber-600 dark:text-amber-400 font-bold mb-1 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> 2. What Eve Sniffs on Wire:
            </div>
            <div className="text-[11px] space-y-0.5">
              <div>
                Transmitted A:{' '}
                <span className="font-bold text-ink-light dark:text-ink-dark">{clientPublic}</span>
              </div>
              <div>
                Transmitted B:{' '}
                <span className="font-bold text-ink-light dark:text-ink-dark">{serverPublic}</span>
              </div>
            </div>
            <div className="text-[9.5px] text-amber-700 dark:text-amber-300 font-semibold mt-1">
              Discrete Logarithm Problem prevents solving for `a` or `b`!
            </div>
          </div>

          {/* Server Secret Input */}
          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-1">
            <div className="text-purple-600 dark:text-purple-400 font-bold mb-1">
              3. Server Secret Exponent:
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span>Private key `b`:</span>
              <input
                type="number"
                min="2"
                max="20"
                value={serverPrivate}
                onChange={(e) => setServerPrivate(Number(e.target.value) || 2)}
                className="w-12 px-1 text-center rounded border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-950 font-bold"
              />
            </div>
            <div className="text-[10px] text-ink-muted mt-1">
              Public Key Share{' '}
              <code className="text-purple-600 font-bold">
                B = {gen}^{serverPrivate} mod {prime} = {serverPublic}
              </code>
            </div>
          </div>
        </div>

        {/* Derived Shared Secret Banner */}
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Derived Shared Secret S:
          </span>
          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
            Client B^a mod p = {clientDerivedSecret} === Server A^b mod p = {serverDerivedSecret}
          </span>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-white dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300">
            HKDF(S) -&gt; Symmetric AES-256 Keys!
          </span>
        </div>
      </div>
    </div>
  );
};
