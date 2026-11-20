import React, { useState, useMemo } from 'react';
import {
  Globe,
  Server,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface Props {
  currentStep: number;
}

export const CorsVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('PUT');
  const [contentType, setContentType] = useState<'application/json' | 'text/plain'>(
    'application/json'
  );
  const [hasAuthHeader, setHasAuthHeader] = useState<boolean>(true);
  const [withCredentials, setWithCredentials] = useState<boolean>(true);
  const [serverPolicy, setServerPolicy] = useState<'strict' | 'wildcard' | 'reflect' | 'none'>(
    'strict'
  );

  const clientOrigin = 'https://dashboard.financeapp.com';
  const apiOrigin = 'https://api.cloudledger.io';

  // Determine if a preflight OPTIONS request is triggered
  const requiresPreflight = useMemo(() => {
    if (method === 'PUT' || method === 'DELETE') return true;
    if (contentType === 'application/json') return true;
    if (hasAuthHeader) return true;
    return false;
  }, [method, contentType, hasAuthHeader]);

  // Server response headers based on selected policy
  const serverHeaders = useMemo(() => {
    switch (serverPolicy) {
      case 'strict':
        return {
          'Access-Control-Allow-Origin': clientOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        };
      case 'wildcard':
        return {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Credentials': 'false',
        };
      case 'reflect':
        return {
          'Access-Control-Allow-Origin': clientOrigin, // Insecure reflection
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        };
      case 'none':
      default:
        return {};
    }
  }, [serverPolicy, clientOrigin]);

  // Browser evaluation of CORS
  const corsResult = useMemo(() => {
    if (serverPolicy === 'none') {
      return {
        status: 'BLOCKED',
        reason: 'No "Access-Control-Allow-Origin" header present on the requested resource.',
        isCritical: true,
      };
    }
    if (withCredentials && serverPolicy === 'wildcard') {
      return {
        status: 'BLOCKED',
        reason:
          'The value of "Access-Control-Allow-Origin" cannot be wildcard "*" when request credentials mode is "include".',
        isCritical: true,
      };
    }
    if (
      requiresPreflight &&
      serverPolicy === 'wildcard' &&
      (method === 'PUT' || method === 'DELETE' || hasAuthHeader)
    ) {
      return {
        status: 'BLOCKED',
        reason: 'Preflight response does not allow method/headers under wildcard policy.',
        isCritical: true,
      };
    }
    if (serverPolicy === 'reflect') {
      return {
        status: 'VULNERABLE_SUCCESS',
        reason:
          'Insecure Origin Reflection: Server blindly echoes request origin with credentials enabled! Any malicious site can read private data.',
        isCritical: false,
      };
    }
    return {
      status: 'ALLOWED',
      reason:
        'CORS Preflight and Origin verified. Browser allows JavaScript to read response body.',
      isCritical: false,
    };
  }, [serverPolicy, withCredentials, requiresPreflight, method, hasAuthHeader]);

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Browser Origin Security Engine
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            CORS & Preflight (OPTIONS) Handshake Inspector
          </h3>
        </div>

        {/* Server Policy Knob */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const policies: Array<'strict' | 'wildcard' | 'reflect' | 'none'> = [
                'strict',
                'wildcard',
                'reflect',
                'none',
              ];
              const nextIdx = (policies.indexOf(serverPolicy) + 1) % policies.length;
              setServerPolicy(policies[nextIdx]);
            }}
            className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-950 text-ink-light dark:text-ink-dark flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            Server Policy:{' '}
            <span className="font-bold uppercase text-blue-600 dark:text-blue-400">
              {serverPolicy}
            </span>
          </button>

          <button
            onClick={() => setWithCredentials(!withCredentials)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all ${
              withCredentials
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400 font-bold'
                : 'bg-parchment-100 dark:bg-parchment-800 border-parchment-300 text-ink-muted'
            }`}
          >
            credentials: {withCredentials ? 'include (Cookies)' : 'omit'}
          </button>
        </div>
      </div>

      {/* Interactive Request Parameter Configuration Bar */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-ink-muted dark:text-ink-darkMuted block mb-1">HTTP Method:</label>
          <div className="flex items-center gap-1">
            {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  method === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 text-ink-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-ink-muted dark:text-ink-darkMuted block mb-1">Content-Type:</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setContentType('application/json')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                contentType === 'application/json'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 text-ink-muted'
              }`}
            >
              application/json
            </button>
            <button
              onClick={() => setContentType('text/plain')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                contentType === 'text/plain'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 text-ink-muted'
              }`}
            >
              text/plain
            </button>
          </div>
        </div>

        <div>
          <label className="text-ink-muted dark:text-ink-darkMuted block mb-1">
            Custom Header:
          </label>
          <button
            onClick={() => setHasAuthHeader(!hasAuthHeader)}
            className={`w-full py-1 px-2 rounded text-[11px] font-bold border transition-colors ${
              hasAuthHeader
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-parchment-900 border-parchment-200 dark:border-parchment-800 text-ink-muted'
            }`}
          >
            {hasAuthHeader ? 'Authorization: Bearer <token>' : 'No Custom Headers'}
          </button>
        </div>
      </div>

      {/* Origin Relationship Indicator */}
      <div className="p-3 mb-6 rounded-xl bg-white dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex flex-col md:flex-row items-start md:items-center justify-between text-xs font-mono gap-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-500" />
          <span className="text-ink-muted dark:text-ink-darkMuted">Client Origin:</span>
          <span className="font-bold text-ink-light dark:text-ink-dark">{clientOrigin}</span>
        </div>
        <ArrowRight className="hidden md:block w-4 h-4 text-parchment-400" />
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-purple-500" />
          <span className="text-ink-muted dark:text-ink-darkMuted">API Origin:</span>
          <span className="font-bold text-ink-light dark:text-ink-dark">{apiOrigin}</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
          CROSS-ORIGIN REQUEST
        </span>
      </div>

      {/* Packet Wireflow Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {/* Preflight Wirebox */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            requiresPreflight
              ? 'border-blue-300 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-parchment-200 dark:border-parchment-800 bg-white/50 dark:bg-parchment-950/40 opacity-70'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-200 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                Phase 1: Preflight Request (OPTIONS)
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  requiresPreflight
                    ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                    : 'bg-parchment-200 dark:bg-parchment-800 text-ink-muted'
                }`}
              >
                {requiresPreflight ? 'REQUIRED' : 'SKIPPED (SIMPLE REQUEST)'}
              </span>
            </div>

            {requiresPreflight ? (
              <pre className="text-[11px] font-mono bg-white dark:bg-parchment-950 p-3 rounded-lg border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark overflow-x-auto">
                {`OPTIONS /v1/records HTTP/1.1
Origin: ${clientOrigin}
Access-Control-Request-Method: ${method}
${hasAuthHeader ? 'Access-Control-Request-Headers: Authorization, Content-Type' : 'Access-Control-Request-Headers: Content-Type'}`}
              </pre>
            ) : (
              <p className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted p-3">
                Standard GET/POST with text/plain qualifies as a "Simple Request". The browser skips
                the preflight OPTIONS roundtrip.
              </p>
            )}
          </div>
          <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-2">
            Preflight inspects permissions before sensitive state is modified.
          </span>
        </div>

        {/* Server Response Headers Wirebox */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark">
                Phase 2: Server Response Headers
              </span>
              <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
                HTTP Response
              </span>
            </div>

            <pre className="text-[11px] font-mono bg-parchment-50 dark:bg-parchment-900 p-3 rounded-lg border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark overflow-x-auto min-h-24">
              {Object.keys(serverHeaders).length > 0 ? (
                Object.entries(serverHeaders).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">{k}:</span> {v}
                  </div>
                ))
              ) : (
                <div className="text-red-500 italic">
                  No Access-Control-* headers returned by server!
                </div>
              )}
            </pre>
          </div>
          <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-2">
            Browser checks these headers against request parameters.
          </span>
        </div>
      </div>

      {/* Browser Security Engine Decision Banner */}
      <div
        className={`p-4 rounded-xl border font-mono text-xs ${
          corsResult.status === 'ALLOWED'
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
            : corsResult.status === 'VULNERABLE_SUCCESS'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-300'
              : 'bg-red-500/10 border-red-500/40 text-red-800 dark:text-red-300'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {corsResult.status === 'ALLOWED' ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : corsResult.status === 'VULNERABLE_SUCCESS' ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <span className="font-bold text-sm">Browser Policy Decision: {corsResult.status}</span>
        </div>
        <p className="text-[11px] leading-relaxed opacity-95 pl-7">{corsResult.reason}</p>
      </div>
    </div>
  );
};
