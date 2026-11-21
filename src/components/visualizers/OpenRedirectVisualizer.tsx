import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Globe, ArrowRight, Lock, ExternalLink } from 'lucide-react';

interface Props {
  currentStep: number;
}

const REDIRECT_PRESETS: Record<string, { label: string; url: string; description: string }> = {
  legit: {
    label: 'Legitimate Relative Path (/dashboard)',
    url: '/dashboard',
    description: 'Internal authenticated user dashboard',
  },
  external: {
    label: 'Direct External Domain (https://evil-phish.com)',
    url: 'https://evil-phish.com/harvest',
    description: 'Phishing website disguised as trusted login redirect',
  },
  protocol_relative: {
    label: 'Protocol-Relative Bypass (//evil-phish.com)',
    url: '//evil-phish.com/callback',
    description: 'Browser inherits scheme and navigates to external origin',
  },
  backslash: {
    label: 'Backslash Bypass (/\\evil-phish.com)',
    url: '/\\evil-phish.com',
    description: 'Legacy browsers treat backslash as domain separator',
  },
};

export const OpenRedirectVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('external');
  const [validationMode, setValidationMode] = useState<'vulnerable' | 'hardened'>('hardened');

  const currentPayload = REDIRECT_PRESETS[selectedPreset];
  const isMalicious = selectedPreset !== 'legit';

  // Evaluate redirection destination
  let finalDestinationUrl: string;
  const isPhished = validationMode === 'vulnerable' ? isMalicious : false;

  if (validationMode === 'vulnerable') {
    finalDestinationUrl = currentPayload.url;
  } else {
    // Hardened check: must start with / and not // or /\
    const isSafeRelative =
      currentPayload.url.startsWith('/') &&
      !currentPayload.url.startsWith('//') &&
      !currentPayload.url.includes('\\');

    if (isSafeRelative) {
      finalDestinationUrl = currentPayload.url;
    } else {
      finalDestinationUrl = '/dashboard (Fallback Safe)';
    }
  }

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            HTTP Redirection & Navigation Security
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Open Redirects & OAuth Token Hijacking
          </h3>
        </div>

        {/* Validation Mode Knob */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              setValidationMode(validationMode === 'hardened' ? 'vulnerable' : 'hardened')
            }
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              validationMode === 'hardened'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            {validationMode === 'hardened' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Redirect Validator:{' '}
            {validationMode === 'hardened'
              ? 'STRICT RELATIVE WHITELIST [SECURE]'
              : 'NAIVE RES.REDIRECT(URL) [VULNERABLE]'}
          </button>
        </div>
      </div>

      {/* Preset Payload Selector */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
        <label className="text-ink-muted dark:text-ink-darkMuted block mb-2 font-bold uppercase text-[11px]">
          Select Inbound Return URL Query Parameter (?returnUrl=...):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(REDIRECT_PRESETS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setSelectedPreset(key)}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedPreset === key
                  ? 'bg-white dark:bg-parchment-900 border-blue-500/60 shadow-xs text-blue-600 dark:text-blue-400 font-bold'
                  : 'bg-white/60 dark:bg-parchment-950/60 border-parchment-200 dark:border-parchment-800 text-ink-muted'
              }`}
            >
              <div className="text-[11px] truncate">{item.label}</div>
              <div className="text-[9px] text-parchment-400 truncate mt-0.5">{item.url}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Simulated Address Bar Flow */}
      <div className="my-6 p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 text-xs font-mono space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-parchment-100 dark:border-parchment-800 text-ink-muted">
          <span className="uppercase font-bold text-[11px]">
            Browser Address Bar & HTTP 302 Trace:
          </span>
          <span>Initiating Host: https://mybank.com</span>
        </div>

        {/* Step 1 URL */}
        <div className="p-2.5 rounded-lg bg-parchment-50 dark:bg-parchment-900 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="text-ink-muted">Initial Login URL:</span>
            <span className="font-bold text-ink-light dark:text-ink-dark">
              https://mybank.com/login?returnUrl=
              <span className="text-red-500">{encodeURIComponent(currentPayload.url)}</span>
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold whitespace-nowrap">
            Trusted Origin in Address Bar
          </span>
        </div>

        {/* Arrow Transition */}
        <div className="flex items-center justify-center gap-2 text-ink-muted">
          <ArrowRight className="w-4 h-4 text-blue-500" />
          <span className="text-[10px]">
            User submits credentials $\rightarrow$ Server responds HTTP 302 Found
          </span>
        </div>

        {/* Final Destination */}
        <div
          className={`p-2.5 rounded-lg flex items-center justify-between gap-2 overflow-x-auto ${
            isPhished
              ? 'bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-300'
              : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-semibold">Final Redirected Destination:</span>
            <span className="font-bold">{finalDestinationUrl}</span>
          </div>
          <span className="text-[10px] font-bold flex items-center gap-1">
            {isPhished ? (
              <ExternalLink className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            {isPhished ? 'UNTRUSTED PHISHING ORIGIN' : 'SAFE INTERNAL ROUTE'}
          </span>
        </div>
      </div>

      {/* Outcome Banner */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 font-mono text-xs">
        {isPhished ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                OPEN REDIRECT EXPLOITED: Phishing & Credential Interception!
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The victim clicked a genuine link starting with{' '}
                <code className="font-bold">https://mybank.com</code>. After login, the browser
                redirected them to <code className="font-bold">{currentPayload.url}</code>. In OAuth
                flows, this attack leaks authorization codes and access tokens via the HTTP Referer
                header!
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                REDIRECT VALIDATED: Navigation Kept on Same Origin
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The validator detected non-relative characters or foreign domain markers. The server
                rejected the external URL and defaulted navigation safely to{' '}
                <code className="font-bold">/dashboard</code>.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
