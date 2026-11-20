import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Check,
  Copy,
  AlertOctagon,
  RefreshCw,
  Send,
  ArrowRight,
  Database,
  Server,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

interface Props {
  currentStep?: number;
  onSelectStep?: (step: number) => void;
}

export const JwtVisualizer: React.FC<Props> = ({ currentStep: externalStep, onSelectStep }) => {
  const [internalStep, setInternalStep] = useState<number>(0);
  const currentStep = externalStep !== undefined ? externalStep : internalStep;

  // Interactive Security Knobs
  const [alg, setAlg] = useState<'HS256' | 'none'>('HS256');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [userName, setUserName] = useState('Alice Walker');
  const [serverSecret, setServerSecret] = useState('super-secret-key-32-chars-long!');
  const [tamperedPayload, setTamperedPayload] = useState<boolean>(false);
  const [enforceAlgWhitelist, setEnforceAlgWhitelist] = useState<boolean>(true);
  const [isSendingRequest, setIsSendingRequest] = useState<boolean>(false);
  const [authVerdict, setAuthVerdict] = useState<'IDLE' | 'ALLOWED' | 'REJECTED'>('IDLE');
  const [copied, setCopied] = useState<boolean>(false);

  // Deterministic base64 encoder for illustration
  const toBase64Url = (str: string) => {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerObj = useMemo(
    () => ({
      alg,
      typ: 'JWT',
    }),
    [alg]
  );

  const payloadObj = useMemo(
    () => ({
      sub: 'usr_84920412',
      name: userName,
      role: tamperedPayload ? 'admin' : role,
      iat: 1735689600,
      exp: 1735693200,
    }),
    [userName, role, tamperedPayload]
  );

  const encodedHeader = useMemo(() => toBase64Url(JSON.stringify(headerObj)), [headerObj]);
  const encodedPayload = useMemo(() => toBase64Url(JSON.stringify(payloadObj)), [payloadObj]);

  // Pseudo-HMAC signature generation
  const validSignature = useMemo(() => {
    if (alg === 'none') return '';
    const content = encodedHeader + '.' + encodedPayload + ':' + serverSecret;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36) + 'Wk7G2j9qLmOpR4vX';
  }, [alg, encodedHeader, encodedPayload, serverSecret]);

  // Evaluated signature validity at the gateway
  const isSignatureValid = useMemo(() => {
    if (alg === 'none') {
      return !enforceAlgWhitelist; // If whitelist enforced, alg: none is rejected!
    }
    return !tamperedPayload;
  }, [alg, tamperedPayload, enforceAlgWhitelist]);

  const fullJwtToken =
    alg === 'none'
      ? `${encodedHeader}.${encodedPayload}.`
      : `${encodedHeader}.${encodedPayload}.${validSignature}`;

  // Launch animated request packet across the wire
  const handleSendRequest = () => {
    playTick();
    setIsSendingRequest(true);
    setAuthVerdict('IDLE');

    setTimeout(() => {
      setIsSendingRequest(false);
      if (isSignatureValid) {
        playSuccess();
        setAuthVerdict('ALLOWED');
      } else {
        playAlert();
        setAuthVerdict('REJECTED');
      }
    }, 800);
  };

  const regenerateSecret = () => {
    playTick();
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let s = '';
    for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    setServerSecret(s);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(fullJwtToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 transition-colors">
      {/* Visualizer Top Bar & Interactive Control Knobs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Cryptographic Token Engine
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            JWT Signature Verification &amp; Tamper Simulator
          </h3>
          <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Watch signed tokens continuously stream to the API Gateway. Test what happens when an
            attacker tampers with claims or strips the algorithm to{' '}
            <code className="text-rose-600 font-mono">none</code>.
          </p>
        </div>

        {/* Tactile Control Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              playTick();
              setAlg(alg === 'HS256' ? 'none' : 'HS256');
              setAuthVerdict('IDLE');
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              alg === 'HS256'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse'
            )}
            title="Toggle algorithm header between HMAC-SHA256 and none exploit"
          >
            <Key className="w-3.5 h-3.5" />
            <span>
              Algorithm: {alg} {alg === 'none' ? '(EXPLOIT)' : ''}
            </span>
          </button>

          <button
            onClick={() => {
              if (!tamperedPayload) playAlert();
              else playTick();
              setTamperedPayload(!tamperedPayload);
              setAuthVerdict('IDLE');
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              tamperedPayload
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                : 'bg-parchment-100 dark:bg-parchment-800 border-parchment-300 dark:border-parchment-700 text-ink-muted hover:text-ink-light'
            )}
            title="Simulate attacker modifying role claim in transit"
          >
            <AlertTriangle
              className={clsx('w-3.5 h-3.5', tamperedPayload ? 'text-rose-600' : 'text-ink-muted')}
            />
            <span>Tamper Claims: {tamperedPayload ? 'MODIFIED (role=admin)' : 'ORIGINAL'}</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setEnforceAlgWhitelist(!enforceAlgWhitelist);
              setAuthVerdict('IDLE');
            }}
            className={clsx(
              'btn-pop px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
              enforceAlgWhitelist
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
            )}
            title="Defense: Reject tokens with alg=none"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Alg Whitelist: {enforceAlgWhitelist ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Token Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Header Algorithm"
          value={alg}
          variant={alg === 'none' ? 'amber' : 'emerald'}
          trend={alg === 'none' ? 'alert' : 'neutral'}
          description={alg === 'none' ? 'CVE-2015-9235 Vulnerability' : 'HMAC-SHA256 Signature'}
        />
        <MetricCard
          label="Payload Role Claim"
          value={payloadObj.role.toUpperCase()}
          variant={payloadObj.role === 'admin' ? 'purple' : 'zinc'}
          trend="neutral"
          description={tamperedPayload ? 'Privilege Escalation Attempt' : 'Legitimate User Context'}
        />
        <MetricCard
          label="Signature Integrity"
          value={isSignatureValid ? 'VALID' : 'INVALID'}
          variant={isSignatureValid ? 'emerald' : 'amber'}
          trend={isSignatureValid ? 'up' : 'alert'}
          description={
            isSignatureValid ? 'Cryptographic Hash Matched' : 'Signature Mismatch Detected'
          }
        />
        <MetricCard
          label="Gateway Decision"
          value={
            authVerdict === 'IDLE'
              ? isSignatureValid
                ? '200 ALLOWED'
                : '401 REJECTED'
              : authVerdict === 'ALLOWED'
                ? '200 OK'
                : '401 REJECTED'
          }
          variant={isSignatureValid ? 'emerald' : 'amber'}
          trend={isSignatureValid ? 'up' : 'alert'}
          description={
            isSignatureValid ? 'Access Granted to Microservices' : 'Request Dropped at Perimeter'
          }
        />
      </div>

      {/* Main Interactive SVG System Architecture Canvas */}
      <div className="p-4 sm:p-6 rounded-2xl bg-parchment-50/80 dark:bg-parchment-950/60 border border-parchment-200 dark:border-parchment-800 relative overflow-hidden shadow-inner">
        <div className="flex items-center justify-between text-xs font-mono text-ink-muted mb-2">
          <span>JWT PERIMETER VERIFICATION TOPOLOGY &amp; STREAMING TRAFFIC</span>
          <button
            onClick={handleSendRequest}
            disabled={isSendingRequest}
            className="btn-pop px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Request with JWT</span>
          </button>
        </div>

        {/* Live SVG Diagram Canvas with Continuous Flow Packets */}
        <div className="w-full relative flex items-center justify-center py-4">
          <svg
            viewBox="0 0 760 300"
            className="w-full h-auto max-h-[360px] overflow-visible select-none"
          >
            <defs>
              <filter id="jwtGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Client -> Gateway Wire */}
            <path
              d="M 140 130 L 370 130"
              fill="none"
              stroke={tamperedPayload ? '#ef4444' : '#3b82f6'}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className="animate-packet-flow opacity-80"
            />

            {/* Gateway -> Backend Protected Wire */}
            <path
              d="M 490 130 L 620 130"
              fill="none"
              stroke={isSignatureValid ? '#10b981' : '#ef4444'}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className={clsx(
                'transition-all duration-300',
                isSignatureValid ? 'animate-packet-flow opacity-90' : 'opacity-30 stroke-dashed'
              )}
            />

            {/* Rejection / Block Wire if Invalid */}
            {!isSignatureValid && (
              <path
                d="M 370 150 L 140 150"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-packet-flow opacity-70"
              />
            )}

            {/* =============================================================== */}
            {/* CONTINUOUS MOVING PACKETS (Pure SVG animateMotion)              */}
            {/* =============================================================== */}

            {/* Client -> Gateway stream */}
            <g>
              <circle r="6" fill={tamperedPayload ? '#ef4444' : '#38bdf8'} filter="url(#jwtGlow)">
                <animateMotion path="M 140 130 L 370 130" dur="1.8s" repeatCount="indefinite" />
              </circle>
            </g>
            <g>
              <circle r="4.5" fill={tamperedPayload ? '#f87171' : '#60a5fa'} opacity="0.8">
                <animateMotion
                  path="M 140 130 L 370 130"
                  dur="1.8s"
                  begin="0.6s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <g>
              <rect
                x="-45"
                y="-12"
                width="90"
                height="24"
                rx="12"
                fill={tamperedPayload ? '#ef4444' : '#2563eb'}
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
                Bearer JWT
              </text>
              <animateMotion path="M 140 130 L 370 130" dur="2.4s" repeatCount="indefinite" />
            </g>

            {/* Gateway -> User Service Stream (Only if valid) */}
            {isSignatureValid && (
              <>
                <g>
                  <circle r="6" fill="#10b981" filter="url(#jwtGlow)">
                    <animateMotion path="M 490 130 L 620 130" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                </g>
                <g>
                  <circle r="4.5" fill="#34d399" opacity="0.8">
                    <animateMotion
                      path="M 490 130 L 620 130"
                      dur="1.4s"
                      begin="0.7s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                <g>
                  <rect
                    x="-45"
                    y="-12"
                    width="90"
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
                    ✓ Verified
                  </text>
                  <animateMotion path="M 490 130 L 620 130" dur="1.8s" repeatCount="indefinite" />
                </g>
              </>
            )}

            {/* Rejection Stream (If Invalid) */}
            {!isSignatureValid && (
              <>
                <g transform="translate(370, 80)">
                  <circle
                    cx="60"
                    cy="50"
                    r="65"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    className="animate-fx-burst opacity-80"
                  />
                </g>
                <g>
                  <circle r="5" fill="#ef4444" filter="url(#jwtGlow)">
                    <animateMotion path="M 370 150 L 140 150" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                </g>
                <g>
                  <rect
                    x="-45"
                    y="-12"
                    width="90"
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
                    401 Rejected
                  </text>
                  <animateMotion path="M 370 150 L 140 150" dur="1.8s" repeatCount="indefinite" />
                </g>
              </>
            )}

            {/* NODE 1: CLIENT APPLICATION (x: 40, y: 80) */}
            <g transform="translate(40, 80)">
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
                Client App
              </text>
              <text
                x="50"
                y="80"
                textAnchor="middle"
                className="text-[8px] font-mono fill-blue-600 dark:fill-blue-400 font-semibold"
              >
                Holds Bearer Token
              </text>
              <rect
                x="5"
                y="90"
                width="90"
                height="18"
                rx="6"
                fill="#eff6ff"
                className="dark:fill-blue-950/60"
                stroke="#bfdbfe"
                strokeWidth="0.5"
              />
              <text
                x="50"
                y="102"
                textAnchor="middle"
                className="text-[7.5px] font-mono fill-blue-700 dark:fill-blue-300 font-bold"
              >
                role: {payloadObj.role}
              </text>
            </g>

            {/* NODE 2: API GATEWAY & AUTH GUARD (x: 370, y: 70) */}
            <g transform="translate(370, 70)">
              <rect
                width="120"
                height="120"
                rx="16"
                fill="currentColor"
                className={`text-white dark:text-parchment-950 shadow-sm ${
                  !isSignatureValid ? 'stroke-red-500 stroke-2' : 'stroke-purple-500 stroke-1.5'
                }`}
              />
              <circle cx="60" cy="38" r="18" fill="#faf5ff" className="dark:fill-purple-950" />
              <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" x="50" y="28" />
              <text
                x="60"
                y="70"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
              >
                API Gateway
              </text>
              <text
                x="60"
                y="82"
                textAnchor="middle"
                className="text-[8px] font-mono fill-purple-600 dark:fill-purple-400 font-semibold"
              >
                Signature Validator
              </text>

              {/* Gateway Status Badge */}
              <rect
                x="8"
                y="92"
                width="104"
                height="20"
                rx="6"
                fill={!isSignatureValid ? '#fef2f2' : '#f0fdf4'}
                className={!isSignatureValid ? 'dark:fill-red-950/40' : 'dark:fill-emerald-950/40'}
                stroke={!isSignatureValid ? '#fca5a5' : '#86efac'}
                strokeWidth="0.5"
              />
              <text
                x="60"
                y="105"
                textAnchor="middle"
                className={`text-[7.5px] font-mono font-bold ${
                  !isSignatureValid
                    ? 'fill-red-600 dark:fill-red-400'
                    : 'fill-emerald-600 dark:fill-emerald-400'
                }`}
              >
                {!isSignatureValid ? '✕ SIGNATURE INVALID' : '✓ SIGNATURE VERIFIED'}
              </text>
            </g>

            {/* NODE 3: PROTECTED BACKEND SERVICE (x: 620, y: 80) */}
            <g transform="translate(620, 80)">
              {isSignatureValid && (
                <circle
                  cx="50"
                  cy="50"
                  r="62"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  className="animate-fx-pop opacity-70"
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
                User Service
              </text>
              <text
                x="50"
                y="80"
                textAnchor="middle"
                className="text-[8px] font-mono fill-emerald-600 dark:fill-emerald-400 font-semibold"
              >
                Protected API
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
                {isSignatureValid ? '200 OK Returned' : 'Requires Auth'}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Color-Coded JWT Anatomical Dissector */}
      <div className="p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-blue-500" />
            Serialized JWT Token Structure (Base64URL)
          </span>
          <button
            onClick={copyToken}
            className="btn-pop px-2.5 py-1 rounded bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 hover:text-blue-600 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy Token'}</span>
          </button>
        </div>

        {/* Triple Color Encoded String */}
        <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 break-all leading-relaxed text-xs">
          <span className="text-rose-600 dark:text-rose-400 font-bold">{encodedHeader}</span>
          <span className="text-ink-muted">.</span>
          <span className="text-purple-600 dark:text-purple-400 font-bold">{encodedPayload}</span>
          <span className="text-ink-muted">.</span>
          <span
            className={clsx(
              'font-bold',
              alg === 'none' ? 'text-amber-500 italic' : 'text-cyan-600 dark:text-cyan-400'
            )}
          >
            {alg === 'none' ? '(empty)' : validSignature}
          </span>
        </div>

        {/* Three Dissected JSON Segments */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* 1. Header */}
          <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">
              1. Header (JOSE)
            </span>
            <pre className="text-[11px] text-ink-light dark:text-ink-dark leading-tight overflow-x-auto">
              {JSON.stringify(headerObj, null, 2)}
            </pre>
          </div>

          {/* 2. Payload */}
          <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400">
              2. Payload (Claims)
            </span>
            <pre className="text-[11px] text-ink-light dark:text-ink-dark leading-tight overflow-x-auto">
              {JSON.stringify(payloadObj, null, 2)}
            </pre>
          </div>

          {/* 3. Signature Equation */}
          <div className="p-3 rounded-lg bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-cyan-700 dark:text-cyan-400">
                3. HMAC Signature
              </span>
              <button
                onClick={regenerateSecret}
                className="text-[10px] text-ink-muted hover:text-cyan-600 cursor-pointer"
              >
                Re-roll Secret
              </button>
            </div>
            <div className="text-[10px] text-ink-muted">HMAC-SHA256(</div>
            <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate">
              base64(header) + "." +
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 truncate">
              base64(payload),
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">
              secret = "{serverSecret.substring(0, 12)}..."
            </div>
            <div className="text-[10px] text-ink-muted">)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
