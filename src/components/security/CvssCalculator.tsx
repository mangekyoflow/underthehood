import React, { useState } from 'react';
import {
  Calculator,
  ShieldAlert,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { playTick, playSuccess } from '../../lib/sound';
import clsx from 'clsx';

export type AttackVector = 'N' | 'A' | 'L' | 'P';
export type AttackComplexity = 'L' | 'H';
export type PrivilegesRequired = 'N' | 'L' | 'H';
export type UserInteraction = 'N' | 'R';
export type Scope = 'U' | 'C';
export type ImpactMetric = 'N' | 'L' | 'H';

interface CvssState {
  av: AttackVector;
  ac: AttackComplexity;
  pr: PrivilegesRequired;
  ui: UserInteraction;
  scope: Scope;
  c: ImpactMetric;
  i: ImpactMetric;
  a: ImpactMetric;
}

const PRESETS: {
  id: string;
  name: string;
  cve: string;
  desc: string;
  state: CvssState;
}[] = [
  {
    id: 'log4shell',
    name: 'Log4Shell RCE',
    cve: 'CVE-2021-44228',
    desc: 'JNDI injection in Log4j 2 allowing full unauthenticated remote code execution.',
    state: { av: 'N', ac: 'L', pr: 'N', ui: 'N', scope: 'C', c: 'H', i: 'H', a: 'H' },
  },
  {
    id: 'struts',
    name: 'Equifax Apache Struts',
    cve: 'CVE-2017-5638',
    desc: 'OGNL injection through Content-Type header leading to massive data breach.',
    state: { av: 'N', ac: 'L', pr: 'N', ui: 'N', scope: 'U', c: 'H', i: 'H', a: 'H' },
  },
  {
    id: 'heartbleed',
    name: 'OpenSSL Heartbleed',
    cve: 'CVE-2014-0160',
    desc: 'TLS heartbeat buffer over-read dumping server memory containing private keys.',
    state: { av: 'N', ac: 'L', pr: 'N', ui: 'N', scope: 'U', c: 'H', i: 'N', a: 'N' },
  },
  {
    id: 'dirty-cow',
    name: 'Linux Dirty COW',
    cve: 'CVE-2016-5195',
    desc: 'Race condition in mm/gup.c yielding local privilege escalation to root.',
    state: { av: 'L', ac: 'L', pr: 'L', ui: 'N', scope: 'U', c: 'H', i: 'H', a: 'H' },
  },
];

export const CvssCalculator: React.FC = () => {
  const [cvss, setCvss] = useState<CvssState>({
    av: 'N',
    ac: 'L',
    pr: 'N',
    ui: 'N',
    scope: 'U',
    c: 'H',
    i: 'H',
    a: 'H',
  });
  const [copied, setCopied] = useState<boolean>(false);

  // Compute exact CVSS v3.1 Base Score
  const calculateScore = (
    state: CvssState
  ): { score: number; severity: string; vector: string } => {
    // Metric weights
    const avWeights: Record<AttackVector, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
    const acWeights: Record<AttackComplexity, number> = { L: 0.77, H: 0.44 };
    const prWeightsUnchanged: Record<PrivilegesRequired, number> = { N: 0.85, L: 0.62, H: 0.27 };
    const prWeightsChanged: Record<PrivilegesRequired, number> = { N: 0.85, L: 0.68, H: 0.5 };
    const uiWeights: Record<UserInteraction, number> = { N: 0.85, R: 0.62 };
    const impactWeights: Record<ImpactMetric, number> = { N: 0.0, L: 0.22, H: 0.56 };

    const av = avWeights[state.av];
    const ac = acWeights[state.ac];
    const pr = state.scope === 'U' ? prWeightsUnchanged[state.pr] : prWeightsChanged[state.pr];
    const ui = uiWeights[state.ui];

    const cVal = impactWeights[state.c];
    const iVal = impactWeights[state.i];
    const aVal = impactWeights[state.a];

    const iss = 1 - (1 - cVal) * (1 - iVal) * (1 - aVal);

    let impact = 0;
    if (state.scope === 'U') {
      impact = 6.42 * iss;
    } else {
      impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
    }

    const exploitability = 8.22 * av * ac * pr * ui;

    let baseScore = 0;
    if (impact > 0) {
      if (state.scope === 'U') {
        baseScore = Math.min(impact + exploitability, 10);
      } else {
        baseScore = Math.min(1.08 * (impact + exploitability), 10);
      }
      // Round to 1 decimal place with CVSS ceiling standard
      baseScore = Math.ceil(baseScore * 10) / 10;
    }

    let severity = 'NONE';
    if (baseScore >= 9.0) severity = 'CRITICAL';
    else if (baseScore >= 7.0) severity = 'HIGH';
    else if (baseScore >= 4.0) severity = 'MEDIUM';
    else if (baseScore >= 0.1) severity = 'LOW';

    const vector = `CVSS:3.1/AV:${state.av}/AC:${state.ac}/PR:${state.pr}/UI:${state.ui}/S:${state.scope}/C:${state.c}/I:${state.i}/A:${state.a}`;

    return { score: baseScore, severity, vector };
  };

  const { score, severity, vector } = calculateScore(cvss);

  const handleCopyVector = () => {
    navigator.clipboard.writeText(vector);
    setCopied(true);
    playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    playTick();
    setCvss(preset.state);
  };

  const handleReset = () => {
    playTick();
    setCvss({
      av: 'N',
      ac: 'L',
      pr: 'N',
      ui: 'N',
      scope: 'U',
      c: 'H',
      i: 'H',
      a: 'H',
    });
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-xs space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-parchment-200 dark:border-parchment-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
              Interactive CVSS v3.1 Vulnerability Severity Calculator
            </h3>
          </div>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted font-sans">
            Score real-world threat vectors, quantify attack feasibility, and compute official CVSS
            v3.1 metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              severity === 'CRITICAL'
                ? 'amber'
                : severity === 'HIGH'
                  ? 'purple'
                  : severity === 'MEDIUM'
                    ? 'cyan'
                    : 'zinc'
            }
          >
            {severity} ({score.toFixed(1)})
          </Badge>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-parchment-300 dark:border-parchment-700 hover:bg-parchment-100 dark:hover:bg-parchment-800 text-ink-muted cursor-pointer transition-colors"
            title="Reset to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preset CVE Benchmarks */}
      <div className="space-y-2">
        <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
          Load Historic CVE Benchmarks:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleApplyPreset(p)}
              className="p-2.5 rounded-xl text-left border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/70 hover:border-purple-400/80 hover:bg-parchment-100 dark:hover:bg-parchment-800 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs font-bold text-ink-light dark:text-ink-dark">
                <span>{p.name}</span>
              </div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                {p.cve}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Exploitability Metrics Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
          <span>1. Exploitability Metrics (Attack Surface)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Attack Vector */}
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950/60 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                Attack Vector (AV)
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{cvss.av}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {(['N', 'A', 'L', 'P'] as AttackVector[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    playTick();
                    setCvss({ ...cvss, av: v });
                  }}
                  className={clsx(
                    'py-1.5 px-2 rounded-lg text-center cursor-pointer font-bold border transition-all',
                    cvss.av === v
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  {v === 'N'
                    ? 'Network'
                    : v === 'A'
                      ? 'Adjacent'
                      : v === 'L'
                        ? 'Local'
                        : 'Physical'}
                </button>
              ))}
            </div>
          </div>

          {/* Attack Complexity */}
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950/60 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                Attack Complexity (AC)
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{cvss.ac}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {(['L', 'H'] as AttackComplexity[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    playTick();
                    setCvss({ ...cvss, ac: v });
                  }}
                  className={clsx(
                    'py-1.5 px-2 rounded-lg text-center cursor-pointer font-bold border transition-all',
                    cvss.ac === v
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  {v === 'L' ? 'Low' : 'High'}
                </button>
              ))}
            </div>
          </div>

          {/* Privileges Required */}
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950/60 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                Privileges Req (PR)
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{cvss.pr}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {(['N', 'L', 'H'] as PrivilegesRequired[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    playTick();
                    setCvss({ ...cvss, pr: v });
                  }}
                  className={clsx(
                    'py-1.5 px-1 rounded-lg text-center cursor-pointer font-bold border transition-all',
                    cvss.pr === v
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  {v === 'N' ? 'None' : v === 'L' ? 'Low' : 'High'}
                </button>
              ))}
            </div>
          </div>

          {/* User Interaction */}
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950/60 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                User Interaction (UI)
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{cvss.ui}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {(['N', 'R'] as UserInteraction[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    playTick();
                    setCvss({ ...cvss, ui: v });
                  }}
                  className={clsx(
                    'py-1.5 px-2 rounded-lg text-center cursor-pointer font-bold border transition-all',
                    cvss.ui === v
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  {v === 'N' ? 'None' : 'Required'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scope & Impact Metrics Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>2. Scope & CIA Impact Subscore</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Scope */}
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950/60 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-ink-light dark:text-ink-dark">Scope (S)</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{cvss.scope}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {(['U', 'C'] as Scope[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    playTick();
                    setCvss({ ...cvss, scope: v });
                  }}
                  className={clsx(
                    'py-1.5 px-2 rounded-lg text-center cursor-pointer font-bold border transition-all',
                    cvss.scope === v
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  {v === 'U' ? 'Unchanged' : 'Changed'}
                </button>
              ))}
            </div>
          </div>

          {/* Confidentiality */}
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950/60 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                Confidentiality (C)
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{cvss.c}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {(['N', 'L', 'H'] as ImpactMetric[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    playTick();
                    setCvss({ ...cvss, c: v });
                  }}
                  className={clsx(
                    'py-1.5 px-1 rounded-lg text-center cursor-pointer font-bold border transition-all',
                    cvss.c === v
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  {v === 'N' ? 'None' : v === 'L' ? 'Low' : 'High'}
                </button>
              ))}
            </div>
          </div>

          {/* Integrity */}
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950/60 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-ink-light dark:text-ink-dark">Integrity (I)</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{cvss.i}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {(['N', 'L', 'H'] as ImpactMetric[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    playTick();
                    setCvss({ ...cvss, i: v });
                  }}
                  className={clsx(
                    'py-1.5 px-1 rounded-lg text-center cursor-pointer font-bold border transition-all',
                    cvss.i === v
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  {v === 'N' ? 'None' : v === 'L' ? 'Low' : 'High'}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950/60 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-ink-light dark:text-ink-dark">Availability (A)</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{cvss.a}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {(['N', 'L', 'H'] as ImpactMetric[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    playTick();
                    setCvss({ ...cvss, a: v });
                  }}
                  className={clsx(
                    'py-1.5 px-1 rounded-lg text-center cursor-pointer font-bold border transition-all',
                    cvss.a === v
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  {v === 'N' ? 'None' : v === 'L' ? 'Low' : 'High'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Output Vector Banner */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="space-y-0.5 text-xs text-center sm:text-left">
          <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
            CVSS v3.1 Official Vector String:
          </span>
          <div className="font-bold text-sm text-ink-light dark:text-ink-dark select-all">
            {vector}
          </div>
        </div>

        <button
          onClick={handleCopyVector}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY VECTOR STRING'}</span>
        </button>
      </div>
    </div>
  );
};
