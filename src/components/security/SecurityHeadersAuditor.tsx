import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Check,
  Copy,
  RotateCcw,
  AlertTriangle,
  Terminal,
  Server,
  Globe,
  FileCode2,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { playTick, playSuccess } from '../../lib/sound';
import clsx from 'clsx';

interface SecurityHeaderConfig {
  id: string;
  header: string;
  name: string;
  recommendedValue: string;
  points: number;
  preventsAttack: string;
  active: boolean;
}

const INITIAL_HEADERS: SecurityHeaderConfig[] = [
  {
    id: 'csp',
    header: 'Content-Security-Policy',
    name: 'Content Security Policy (CSP Level 3)',
    recommendedValue:
      "default-src 'self'; script-src 'self' 'nonce-RANDOM'; object-src 'none'; frame-ancestors 'none'; base-uri 'self';",
    points: 25,
    preventsAttack: 'Cross-Site Scripting (XSS), Data Injection, Packet Exfiltration',
    active: true,
  },
  {
    id: 'hsts',
    header: 'Strict-Transport-Security',
    name: 'HTTP Strict Transport Security (HSTS)',
    recommendedValue: 'max-age=63072000; includeSubDomains; preload',
    points: 20,
    preventsAttack: 'SSL Stripping, Man-in-the-Middle (MITM), Downgrade Attacks',
    active: true,
  },
  {
    id: 'xfo',
    header: 'X-Frame-Options',
    name: 'Frame Embed Guard (X-Frame-Options)',
    recommendedValue: 'DENY',
    points: 15,
    preventsAttack: 'Clickjacking & UI Redressing Attacks',
    active: true,
  },
  {
    id: 'xcto',
    header: 'X-Content-Type-Options',
    name: 'MIME Type Sniffing Defense',
    recommendedValue: 'nosniff',
    points: 10,
    preventsAttack: 'MIME confusion and script execution from uploads',
    active: true,
  },
  {
    id: 'rp',
    header: 'Referrer-Policy',
    name: 'Referrer Information Leak Prevention',
    recommendedValue: 'strict-origin-when-cross-origin',
    points: 10,
    preventsAttack: 'Token and private URL query leaks to external origins',
    active: true,
  },
  {
    id: 'coop',
    header: 'Cross-Origin-Opener-Policy',
    name: 'Cross-Origin Opener Isolation (COOP)',
    recommendedValue: 'same-origin',
    points: 10,
    preventsAttack: 'Spectre side-channel attacks & cross-window browsing context leaks',
    active: false,
  },
  {
    id: 'pp',
    header: 'Permissions-Policy',
    name: 'Client Device Hardware Permissions Policy',
    recommendedValue: 'camera=(), microphone=(), geolocation=(), payment=()',
    points: 10,
    preventsAttack: 'Unauthorized hardware API execution by third-party scripts',
    active: false,
  },
];

export const SecurityHeadersAuditor: React.FC = () => {
  const [headers, setHeaders] = useState<SecurityHeaderConfig[]>(INITIAL_HEADERS);
  const [activeServerTab, setActiveServerTab] = useState<
    'nginx' | 'express' | 'caddy' | 'cloudflare'
  >('nginx');
  const [copied, setCopied] = useState<boolean>(false);

  const toggleHeader = (id: string) => {
    playTick();
    setHeaders((prev) => prev.map((h) => (h.id === id ? { ...h, active: !h.active } : h)));
  };

  const handleSelectAll = (activate: boolean) => {
    playTick();
    setHeaders((prev) => prev.map((h) => ({ ...h, active: activate })));
  };

  // Calculate score and grade
  const totalScore = headers.reduce((acc, h) => acc + (h.active ? h.points : 0), 0);
  let grade = 'F';
  let gradeColor = 'text-red-500 bg-red-500/10 border-red-500/30';
  if (totalScore >= 90) {
    grade = 'A+';
    gradeColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  } else if (totalScore >= 80) {
    grade = 'A';
    gradeColor = 'text-emerald-600 bg-emerald-600/10 border-emerald-600/30';
  } else if (totalScore >= 65) {
    grade = 'B';
    gradeColor = 'text-cyan-600 bg-cyan-600/10 border-cyan-600/30';
  } else if (totalScore >= 50) {
    grade = 'C';
    gradeColor = 'text-amber-600 bg-amber-600/10 border-amber-600/30';
  }

  // Generate web server snippet
  const activeHeadersList = headers.filter((h) => h.active);

  const generateSnippet = () => {
    if (activeServerTab === 'nginx') {
      return [
        '# NGINX Production Security Headers',
        'server {',
        ...activeHeadersList.map(
          (h) => `    add_header ${h.header} "${h.recommendedValue}" always;`
        ),
        '}',
      ].join('\n');
    } else if (activeServerTab === 'caddy') {
      return [
        '# Caddyfile Security Headers',
        'example.com {',
        '    header {',
        ...activeHeadersList.map((h) => `        ${h.header} "${h.recommendedValue}"`),
        '    }',
        '}',
      ].join('\n');
    } else if (activeServerTab === 'express') {
      return [
        '// Node.js Express with Helmet Middleware',
        "const express = require('express');",
        "const helmet = require('helmet');",
        'const app = express();',
        '',
        'app.use(helmet({',
        `  contentSecurityPolicy: ${headers.find((h) => h.id === 'csp')?.active ? 'true' : 'false'},`,
        `  crossOriginOpenerPolicy: ${headers.find((h) => h.id === 'coop')?.active ? '{ policy: "same-origin" }' : 'false'},`,
        `  xFrameOptions: ${headers.find((h) => h.id === 'xfo')?.active ? '{ action: "deny" }' : 'false'},`,
        `  referrerPolicy: ${headers.find((h) => h.id === 'rp')?.active ? '{ policy: "strict-origin-when-cross-origin" }' : 'false'}`,
        '}));',
      ].join('\n');
    } else {
      return [
        '// Cloudflare Workers / Pages Header Mutation',
        'export default {',
        '  async fetch(request, env) {',
        '    const response = await fetch(request);',
        '    const newHeaders = new Headers(response.headers);',
        ...activeHeadersList.map(
          (h) => `    newHeaders.set('${h.header}', '${h.recommendedValue}');`
        ),
        '    return new Response(response.body, { status: response.status, headers: newHeaders });',
        '  }',
        '};',
      ].join('\n');
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(generateSnippet());
    setCopied(true);
    playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-xs space-y-6 font-mono">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-parchment-200 dark:border-parchment-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
              HTTP Security Headers Analyzer & Config Generator
            </h3>
          </div>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted font-sans">
            Audit your defense-in-depth posture, prevent XSS and Clickjacking, and export hardened
            web server configs.
          </p>
        </div>

        {/* Score & Grade Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-ink-muted uppercase">Security Score</div>
            <div className="text-sm font-bold text-ink-light dark:text-ink-dark">
              {totalScore} / 100
            </div>
          </div>
          <div
            className={clsx(
              'w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-xl shadow-xs',
              gradeColor
            )}
          >
            {grade}
          </div>
        </div>
      </div>

      {/* Preset Action Buttons */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
          Configure Active Response Headers:
        </span>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            onClick={() => handleSelectAll(true)}
            className="hover:underline cursor-pointer text-emerald-600 dark:text-emerald-400 font-bold"
          >
            Enable All (A+)
          </button>
          <span>•</span>
          <button
            onClick={() => handleSelectAll(false)}
            className="hover:underline cursor-pointer text-ink-muted"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Headers Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {headers.map((h) => (
          <div
            key={h.id}
            onClick={() => toggleHeader(h.id)}
            className={clsx(
              'p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2',
              h.active
                ? 'border-emerald-500/70 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-xs'
                : 'border-parchment-200 dark:border-parchment-800 bg-parchment-50/50 dark:bg-parchment-950/50 opacity-70 hover:opacity-100'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={h.active}
                  onChange={() => {}} // handled by parent onClick
                  className="rounded accent-emerald-600 cursor-pointer"
                />
                <span className="font-bold text-ink-light dark:text-ink-dark">{h.header}</span>
              </div>
              <span
                className={clsx(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                  h.active
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-parchment-200 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                +{h.points} pts
              </span>
            </div>

            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted font-mono truncate">
              {h.recommendedValue}
            </div>

            <div className="text-[11px] font-sans text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" />
              <span>Mitigates: {h.preventsAttack}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Server Config Generator Drawer */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-parchment-200 dark:border-parchment-800 pb-2">
          <div className="flex items-center gap-2 text-xs">
            <FileCode2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="font-bold uppercase tracking-wider text-ink-light dark:text-ink-dark">
              Production Web Server Deployment Snippet
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            {(['nginx', 'caddy', 'express', 'cloudflare'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  playTick();
                  setActiveServerTab(tab);
                }}
                className={clsx(
                  'px-2.5 py-1 rounded-lg uppercase font-bold transition-all cursor-pointer',
                  activeServerTab === tab
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-100 dark:hover:bg-parchment-800'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <pre className="p-4 rounded-xl bg-parchment-950 text-emerald-400 text-xs font-mono overflow-x-auto max-h-52 selection:bg-purple-500/30">
            {generateSnippet()}
          </pre>

          <button
            onClick={handleCopySnippet}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-parchment-800 hover:bg-parchment-700 text-parchment-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
