import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Zap, RefreshCw, Activity, Layers, Flame } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const RateLimitingVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const maxCapacity = 8;
  const [tokens, setTokens] = useState<number>(5);
  const [requestsAllowed, setRequestsAllowed] = useState<number>(0);
  const [requestsBlocked, setRequestsBlocked] = useState<number>(0);
  const [lastStatus, setLastStatus] = useState<200 | 429 | null>(null);
  const [autoRefill, setAutoRefill] = useState<boolean>(true);

  // Auto-refill tokens every 2 seconds
  useEffect(() => {
    if (!autoRefill) return;
    const interval = setInterval(() => {
      setTokens((prev) => Math.min(prev + 1, maxCapacity));
    }, 2000);
    return () => clearInterval(interval);
  }, [autoRefill, maxCapacity]);

  const sendRequest = () => {
    if (tokens > 0) {
      setTokens((prev) => prev - 1);
      setRequestsAllowed((prev) => prev + 1);
      setLastStatus(200);
    } else {
      setRequestsBlocked((prev) => prev + 1);
      setLastStatus(429);
    }
  };

  const simulateBurst = (count: number) => {
    let currentTokens = tokens;
    let allowedCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < count; i++) {
      if (currentTokens > 0) {
        currentTokens -= 1;
        allowedCount += 1;
      } else {
        blockedCount += 1;
      }
    }

    setTokens(currentTokens);
    setRequestsAllowed((prev) => prev + allowedCount);
    setRequestsBlocked((prev) => prev + blockedCount);
    setLastStatus(blockedCount > 0 ? 429 : 200);
  };

  const resetStats = () => {
    setTokens(maxCapacity);
    setRequestsAllowed(0);
    setRequestsBlocked(0);
    setLastStatus(null);
  };

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Layer 7 Traffic Management & DoS Mitigation
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Token Bucket Rate Limiting Engine
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefill(!autoRefill)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              autoRefill
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-parchment-100 dark:bg-parchment-800 border-parchment-300 text-ink-muted'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Auto-Refill (+1 token / 2s): {autoRefill ? 'ACTIVE' : 'PAUSED'}
          </button>

          <button
            onClick={resetStats}
            className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-950 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Traffic Generation Bar */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink-light dark:text-ink-dark">
            Generate Inbound Client Traffic:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={sendRequest}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5" /> 1 Request
          </button>

          <button
            onClick={() => simulateBurst(4)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-xs flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" /> 4 Burst
          </button>

          <button
            onClick={() => simulateBurst(10)}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-xs flex items-center gap-1"
          >
            <Flame className="w-3.5 h-3.5" /> 10 DDoS Flood
          </button>
        </div>
      </div>

      {/* Visual Token Pool Reservoir */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Bucket Physical Representation */}
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-blue-200 dark:border-blue-900/40">
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                Token Bucket Reservoir
              </span>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {tokens} / {maxCapacity}
              </span>
            </div>

            {/* Token Slots Grid */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {Array.from({ length: maxCapacity }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-9 rounded-lg border flex items-center justify-center font-mono text-[10px] font-bold transition-all ${
                    idx < tokens
                      ? 'bg-blue-600 border-blue-700 text-white shadow-xs scale-100'
                      : 'bg-white/60 dark:bg-parchment-950/60 border-dashed border-parchment-300 dark:border-parchment-800 text-parchment-400 scale-95'
                  }`}
                >
                  {idx < tokens ? 'TOKEN' : 'EMPTY'}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted leading-relaxed">
            Capacity $B = {maxCapacity}$. Each incoming request must consume 1 token. When empty,
            requests are dropped.
          </div>
        </div>

        {/* Real-time Traffic Metrics */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark uppercase tracking-wide">
                Traffic Decision Counters
              </span>
              <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
                Live Stats
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> HTTP 200 OK (Allowed)
                </span>
                <span className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {requestsAllowed}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 flex items-center justify-between">
                <span className="text-xs font-mono text-red-800 dark:text-red-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" /> HTTP 429 Dropped (Throttled)
                </span>
                <span className="text-base font-mono font-bold text-red-600 dark:text-red-400">
                  {requestsBlocked}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            Protects downstream databases and microservices from cascading resource exhaustion.
          </div>
        </div>

        {/* HTTP Wire Headers Preview */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark uppercase tracking-wide">
                Wire HTTP Response Headers
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  lastStatus === 200
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : lastStatus === 429
                      ? 'bg-red-500/10 text-red-600'
                      : 'bg-parchment-100 text-ink-muted'
                }`}
              >
                {lastStatus ? `HTTP ${lastStatus}` : 'IDLE'}
              </span>
            </div>

            <pre className="text-[11px] font-mono bg-parchment-50 dark:bg-parchment-900 p-3 rounded-lg border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark overflow-x-auto">
              {lastStatus === 429
                ? `HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: ${maxCapacity}
X-RateLimit-Remaining: 0
Retry-After: 2
Content-Type: application/json

{"error": "Rate limit exceeded"}`
                : `HTTP/1.1 200 OK
X-RateLimit-Limit: ${maxCapacity}
X-RateLimit-Remaining: ${tokens}
X-RateLimit-Reset: 1735689620
Content-Type: application/json

{"status": "processed"}`}
            </pre>
          </div>

          <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            Standards compliance: clients use <code className="font-bold">Retry-After</code> for
            exponential backoff.
          </span>
        </div>
      </div>

      {/* Outcome Banner */}
      <div
        className={`p-4 rounded-xl border text-xs font-mono ${
          lastStatus === 429
            ? 'bg-red-500/10 border-red-500/40 text-red-800 dark:text-red-300'
            : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {lastStatus === 429 ? (
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          )}
          <span className="font-bold text-sm">
            {lastStatus === 429
              ? 'ABUSE MITIGATION TRIGGERED: HTTP 429 Too Many Requests'
              : 'TRAFFIC ACCEPTED: Within Allocated Rate Quota'}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed opacity-95 pl-7">
          {lastStatus === 429
            ? 'The token reservoir was empty. The rate limiter intervened at the API gateway layer (Envoy / Cloudflare / Redis), shedding load before any database queries were initiated.'
            : 'Tokens were available in the bucket. The request passed smoothly to the underlying application worker.'}
        </p>
      </div>
    </div>
  );
};
