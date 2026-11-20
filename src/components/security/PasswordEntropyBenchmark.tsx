import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Zap,
  RotateCcw,
  Sparkles,
  Check,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { playTick } from '../../lib/sound';
import clsx from 'clsx';

const PRESETS = [
  { name: 'Common Weak', value: 'password123', desc: 'Top 10 most common wordlist entry' },
  { name: 'Default Corporate', value: 'Winter2024!', desc: 'Meets basic 8-char symbol policy' },
  { name: 'Complex Short', value: 'K9#m$Q2!', desc: '8 characters with mixed pool' },
  {
    name: 'Diceware Passphrase',
    value: 'correct-horse-battery-staple',
    desc: '4 random words, 28 characters',
  },
  {
    name: 'Ultra High Entropy',
    value: '9xK!#mQ2$zL8&wP7@vY4',
    desc: '20 chars random high-entropy',
  },
];

export const PasswordEntropyBenchmark: React.FC = () => {
  const [password, setPassword] = useState<string>('correct-horse-battery-staple');

  // Calculate pool and entropy
  const calculateEntropy = (pwd: string) => {
    if (!pwd) return { poolSize: 0, length: 0, entropy: 0, pools: [] };

    let pool = 0;
    const pools: string[] = [];
    if (/[a-z]/.test(pwd)) {
      pool += 26;
      pools.push('a-z (26)');
    }
    if (/[A-Z]/.test(pwd)) {
      pool += 26;
      pools.push('A-Z (26)');
    }
    if (/[0-9]/.test(pwd)) {
      pool += 10;
      pools.push('0-9 (10)');
    }
    if (/[^a-zA-Z0-9\s]/.test(pwd)) {
      pool += 33;
      pools.push('Symbols (33)');
    }
    if (/\s/.test(pwd)) {
      pool += 1;
      pools.push('Spaces');
    }

    const length = pwd.length;
    const entropy = pool > 0 ? Number((length * Math.log2(pool)).toFixed(1)) : 0;

    return { poolSize: pool, length, entropy, pools };
  };

  const { poolSize, length, entropy, pools } = calculateEntropy(password);

  // Crack time formatting
  const formatTime = (seconds: number): string => {
    if (seconds <= 0.001) return 'Instant (< 1 ms)';
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
    if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} minutes`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
    if (seconds < 31536000) return `${(seconds / 86400).toFixed(1)} days`;
    if (seconds < 31536000000) return `${(seconds / 31536000).toFixed(1)} years`;
    if (seconds < 3.15e14) return `${(seconds / 3.15e10).toFixed(1)} thousand years`;
    if (seconds < 3.15e17) return `${(seconds / 3.15e13).toFixed(1)} million years`;
    return '> 100 Billion Years (Universe Age)';
  };

  // Combinations = pool ^ length = 2 ^ entropy
  const combinations = Math.pow(2, entropy);

  // Compute crack times across hash algorithms on an 8x RTX 4090 GPU Rig:
  // MD5: 200 GH/s = 2e11 H/s
  // SHA-256: 25 GH/s = 2.5e10 H/s
  // Bcrypt (cost 12): 25,000 H/s = 2.5e4 H/s
  // Argon2id (64MB memory-hard): 15 H/s
  const md5CrackSeconds = combinations / 2e11;
  const sha256CrackSeconds = combinations / 2.5e10;
  const bcryptCrackSeconds = combinations / 2.5e4;
  const argonCrackSeconds = combinations / 15;

  let strengthLabel = 'Very Weak';
  let strengthColor = 'text-red-500 bg-red-500/10 border-red-500/30';
  if (entropy >= 80) {
    strengthLabel = 'Cryptographically Unbreakable';
    strengthColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  } else if (entropy >= 60) {
    strengthLabel = 'Very Strong';
    strengthColor = 'text-emerald-600 bg-emerald-600/10 border-emerald-600/30';
  } else if (entropy >= 45) {
    strengthLabel = 'Moderate';
    strengthColor = 'text-cyan-600 bg-cyan-600/10 border-cyan-600/30';
  } else if (entropy >= 30) {
    strengthLabel = 'Weak';
    strengthColor = 'text-amber-600 bg-amber-600/10 border-amber-600/30';
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-xs space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-parchment-200 dark:border-parchment-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
              Password & Cryptographic Hash Entropy Benchmark
            </h3>
          </div>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted font-sans">
            Calculate Shannon entropy ($E = L \times \log_2 R$) and benchmark brute-force resistance
            against 8x RTX 4090 GPU clusters.
          </p>
        </div>

        <Badge variant={entropy >= 60 ? 'emerald' : entropy >= 45 ? 'cyan' : 'amber'}>
          {entropy} Bits Entropy
        </Badge>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
          Quick Test Presets:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                playTick();
                setPassword(p.value);
              }}
              className="p-2 rounded-xl text-left border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/70 hover:bg-parchment-100 dark:hover:bg-parchment-800 transition-all cursor-pointer"
            >
              <div className="text-xs font-bold text-ink-light dark:text-ink-dark truncate">
                {p.name}
              </div>
              <div className="text-[10px] text-ink-muted truncate font-mono">{p.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-ink-muted uppercase font-bold text-[10px]">
            Target Password / Passphrase Input:
          </span>
          <span className="text-[11px] text-ink-muted">
            {length} characters • Character pool size: {poolSize}
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-parchment-50 dark:bg-parchment-950 text-ink-light dark:text-ink-dark font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Type password to test entropy..."
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Shannon Entropy"
          value={entropy}
          unit="bits"
          trend={entropy >= 60 ? 'up' : 'alert'}
          variant={entropy >= 60 ? 'emerald' : 'amber'}
          description={strengthLabel}
        />
        <MetricCard
          label="Character Set (R)"
          value={poolSize}
          trend="neutral"
          variant="purple"
          description={pools.join(', ') || 'None'}
        />
        <MetricCard
          label="Length (L)"
          value={length}
          unit="chars"
          trend="neutral"
          variant="cyan"
          description="Total password length"
        />
        <MetricCard
          label="Search Space"
          value={`2^${Math.round(entropy)}`}
          trend="neutral"
          variant="zinc"
          description="Total permutations"
        />
      </div>

      {/* Hashcat GPU Crack Time Comparison Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted">
          <Cpu className="w-3.5 h-3.5 text-blue-500" />
          <span>Brute-Force Feasibility Matrix (8x NVIDIA RTX 4090 GPU Cluster)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* MD5 */}
          <div className="p-3.5 rounded-xl border border-red-500/40 bg-red-500/5 dark:bg-red-950/20 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                MD5 (Unsalted / Fast)
              </span>
              <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">200 GH/s</span>
            </div>
            <div className="text-base font-bold text-red-600 dark:text-red-400">
              {formatTime(md5CrackSeconds)}
            </div>
            <p className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted">
              Completely obsolete. Rainbow tables and GPU hashing crack MD5 instantly.
            </p>
          </div>

          {/* SHA-256 */}
          <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                SHA-256 (Fast Cryptographic)
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                25 GH/s
              </span>
            </div>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400">
              {formatTime(sha256CrackSeconds)}
            </div>
            <p className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted">
              Vulnerable for password storage because SHA-256 was engineered for maximum speed.
            </p>
          </div>

          {/* Bcrypt */}
          <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-500/5 dark:bg-cyan-950/20 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                Bcrypt (Cost 12 / Work-Hardened)
              </span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">
                25 kH/s
              </span>
            </div>
            <div className="text-base font-bold text-cyan-600 dark:text-cyan-400">
              {formatTime(bcryptCrackSeconds)}
            </div>
            <p className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted">
              Standard production hashing. 4,096 Blowfish rounds drastically throttle GPUs.
            </p>
          </div>

          {/* Argon2id */}
          <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                Argon2id (64MB RAM Hardened)
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                15 H/s
              </span>
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatTime(argonCrackSeconds)}
            </div>
            <p className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted">
              Current gold standard (PHC Winner). Memory-hardness neutralizes ASIC and GPU attacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
