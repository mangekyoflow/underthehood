import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Code2, AlertTriangle } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const PrototypePollutionVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [mergeEngine, setMergeEngine] = useState<'vulnerable' | 'hardened'>('hardened');
  const [polluted, setPolluted] = useState<boolean>(true);

  // Normal vs polluted payload
  const payloadJson = polluted
    ? JSON.stringify(
        {
          name: 'Alice',
          __proto__: {
            isAdmin: true,
            role: 'superuser',
          },
        },
        null,
        2
      )
    : JSON.stringify(
        {
          name: 'Alice',
          preferences: {
            theme: 'dark',
          },
        },
        null,
        2
      );

  // Global prototype state simulation
  const isGlobalPrototypePolluted = polluted && mergeEngine === 'vulnerable';

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            JavaScript Prototype Chain & Runtime Memory Injection
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Prototype Pollution & Object.freeze Defenses
          </h3>
        </div>

        {/* Merge Engine Knob */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMergeEngine(mergeEngine === 'hardened' ? 'vulnerable' : 'hardened')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              mergeEngine === 'hardened'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            {mergeEngine === 'hardened' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Merge Engine:{' '}
            {mergeEngine === 'hardened'
              ? 'OBJECT.FREEZE & __PROTO__ GUARD [SECURE]'
              : 'RECURSIVE DEEP MERGE [VULNERABLE]'}
          </button>
        </div>
      </div>

      {/* Payload Selector Bar */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-center justify-between text-xs font-mono">
        <span className="font-bold text-ink-light dark:text-ink-dark">
          Inbound Untrusted JSON Input:
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPolluted(false)}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              !polluted
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-white dark:bg-parchment-900 border-parchment-300 text-ink-muted'
            }`}
          >
            Clean User Preferences
          </button>

          <button
            onClick={() => setPolluted(true)}
            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
              polluted
                ? 'bg-red-600 text-white font-bold'
                : 'bg-white dark:bg-parchment-900 border-parchment-300 text-ink-muted'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Malicious __proto__ Payload
          </button>
        </div>
      </div>

      {/* Side-by-Side: Input Payload vs Global Object.prototype State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs font-mono">
        {/* Box 1: Inbound JSON */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-blue-500" /> Inbound JSON Payload
              </span>
              <span className="text-[10px] text-ink-muted">req.body</span>
            </div>
            <pre className="p-3 bg-parchment-50 dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark overflow-x-auto">
              {payloadJson}
            </pre>
          </div>
          <span className="text-[10px] text-ink-muted mt-3">
            Recursive merge functions evaluate{' '}
            <code className="text-red-500 font-bold">__proto__</code> as an object reference.
          </span>
        </div>

        {/* Box 2: Object.prototype Global Memory */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
            isGlobalPrototypePolluted
              ? 'border-red-300 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'
              : 'border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                Global Object.prototype State
              </span>
              <span
                className={`text-[10px] font-bold ${isGlobalPrototypePolluted ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {isGlobalPrototypePolluted ? 'POLLUTED IN MEMORY' : 'PRISTINE / FROZEN'}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-parchment-950 rounded-lg border border-parchment-200 dark:border-parchment-800 space-y-2">
              <div className="text-[11px] font-bold">
                {isGlobalPrototypePolluted ? (
                  <span className="text-red-600 dark:text-red-400">
                    Object.prototype.isAdmin === true
                    <br />
                    Object.prototype.role === "superuser"
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Object.prototype has no custom properties (Frozen)
                  </span>
                )}
              </div>

              {/* Demonstration on a brand new empty object */}
              <div className="pt-2 border-t border-parchment-100 dark:border-parchment-800 text-[10px] text-ink-muted">
                <div>
                  Testing brand-new empty object: <code>const newGuest = &#123;&#125;;</code>
                </div>
                <div className="mt-1">
                  <code>newGuest.isAdmin: </code>
                  <strong
                    className={
                      isGlobalPrototypePolluted
                        ? 'text-red-600 text-xs'
                        : 'text-ink-light dark:text-ink-dark'
                    }
                  >
                    {isGlobalPrototypePolluted ? 'true (CRITICAL BUG!)' : 'undefined (Correct)'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-ink-muted mt-3">
            Every object in JavaScript inherits from Object.prototype by default.
          </span>
        </div>
      </div>

      {/* Outcome Banner */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 font-mono text-xs">
        {isGlobalPrototypePolluted ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                PROTOTYPE POLLUTION ACHIEVED: Entire Runtime Compromised!
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The recursive merge evaluated <code className="font-bold">__proto__</code>, writing
                properties onto <code className="font-bold">Object.prototype</code>. Now, every
                single object created in the application inherits{' '}
                <code className="font-bold">isAdmin: true</code>, allowing trivial administrative
                authentication bypasses!
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                PROTOTYPE POLLUTION MITIGATED: Safe Object Handling
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The merge utility stripped <code className="font-bold">__proto__</code>,{' '}
                <code className="font-bold">constructor</code>, and{' '}
                <code className="font-bold">prototype</code> keys before assigning, or called{' '}
                <code className="font-bold">Object.freeze(Object.prototype)</code>. Global memory
                remained untouched.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
