import React, { useState, useMemo } from 'react';
import { ShieldAlert, ShieldCheck, HardDrive, Clock, Zap } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const PasswordHashingVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [password, setPassword] = useState<string>('P@ssw0rd!2026');
  const [algorithm, setAlgorithm] = useState<'md5' | 'sha256' | 'bcrypt' | 'argon2id'>('argon2id');
  const [saltEnabled, setSaltEnabled] = useState<boolean>(true);
  const [attackerRig, setAttackerRig] = useState<'single_gpu' | 'gpu_farm' | 'nation_state'>(
    'gpu_farm'
  );

  // Interactive metrics calculation
  const crackMetrics = useMemo(() => {
    switch (algorithm) {
      case 'md5':
        return {
          rate: '150 Billion hashes/sec',
          crackTime: saltEnabled ? '1.4 seconds' : '< 1 millisecond (Precomputed Rainbow Table)',
          memoryRequired: '0 KB',
          isSecure: false,
          summary: 'Completely obsolete. Fast hashing allows trivial GPU brute-forcing.',
        };
      case 'sha256':
        return {
          rate: '12 Billion hashes/sec',
          crackTime: saltEnabled ? '4.8 minutes' : '< 1 millisecond (Rainbow Table Match)',
          memoryRequired: '0 KB',
          isSecure: false,
          summary: 'SHA-256 is designed for speed (gigabytes/sec). Catastrophic for passwords!',
        };
      case 'bcrypt':
        return {
          rate: '18,000 hashes/sec',
          crackTime:
            attackerRig === 'single_gpu'
              ? '2.8 years'
              : attackerRig === 'gpu_farm'
                ? '4.2 months'
                : '1.8 weeks',
          memoryRequired: '4 KB (CPU Cache bound)',
          isSecure: true,
          summary: 'Adaptive work-factor ($2^{12}$ iterations) slows down brute-forcing.',
        };
      case 'argon2id':
      default:
        return {
          rate: '120 hashes/sec',
          crackTime: attackerRig === 'nation_state' ? '12,400 years' : '3.8 Million years',
          memoryRequired: '64 MB per hash operation',
          isSecure: true,
          summary: 'Winner of Password Hashing Competition. Memory hardness saturates GPU RAM bus.',
        };
    }
  }, [algorithm, saltEnabled, attackerRig]);

  // Deterministic mock hash string
  const generatedHash = useMemo(() => {
    const saltStr = saltEnabled ? '$s0$e0801$a7f1...' : '';
    switch (algorithm) {
      case 'md5':
        return '5d41402abc4b2a76b9719d911017c592';
      case 'sha256':
        return 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';
      case 'bcrypt':
        return '$2b$12$e8YvX9a1JpL3.0qKmR8T2uW9vK2LmOpQ4rStUvWxYz01234567890';
      case 'argon2id':
      default:
        return '$argon2id$v=19$m=65536,t=3,p=4' + saltStr + '...7f892a01d';
    }
  }, [algorithm, saltEnabled]);

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Cryptographic Key Derivation & Credential Storage
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Password Hashing: Fast Hashes vs. Memory-Hard Argon2
          </h3>
        </div>

        {/* Algorithm Knob */}
        <div className="flex flex-wrap items-center gap-2">
          {(['md5', 'sha256', 'bcrypt', 'argon2id'] as const).map((alg) => (
            <button
              key={alg}
              onClick={() => setAlgorithm(alg)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all ${
                algorithm === alg
                  ? alg === 'argon2id' || alg === 'bcrypt'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
                  : 'bg-white dark:bg-parchment-950 border-parchment-200 dark:border-parchment-800 text-ink-muted'
              }`}
            >
              {alg.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Controls Row */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div>
          <label className="text-ink-muted dark:text-ink-darkMuted block mb-1">
            Test Password:
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-2.5 py-1 text-xs font-mono rounded bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark"
          />
        </div>

        <div>
          <label className="text-ink-muted dark:text-ink-darkMuted block mb-1">
            Cryptographic Salt:
          </label>
          <button
            onClick={() => setSaltEnabled(!saltEnabled)}
            className={`w-full py-1 px-2.5 rounded text-xs font-bold border transition-colors flex items-center justify-between ${
              saltEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
            }`}
          >
            <span>{saltEnabled ? 'SALTED (16 bytes random)' : 'UNSALTED (VULNERABLE)'}</span>
            <span>{saltEnabled ? 'Protected' : 'Rainbow Hit'}</span>
          </button>
        </div>

        <div>
          <label className="text-ink-muted dark:text-ink-darkMuted block mb-1">
            Attacker Hardware Cluster:
          </label>
          <select
            value={attackerRig}
            onChange={(e) => setAttackerRig(e.target.value as any)}
            className="w-full px-2 py-1 text-xs font-mono rounded bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark"
          >
            <option value="single_gpu">1x NVIDIA RTX 4090</option>
            <option value="gpu_farm">8x RTX 4090 Dedicated Rig</option>
            <option value="nation_state">10,000 GPU Farm ($10M ASIC Cluster)</option>
          </select>
        </div>
      </div>

      {/* Generated Stored Hash Box */}
      <div className="mb-6 p-4 rounded-xl bg-white dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted">
          <span className="text-[11px] uppercase font-bold">Stored Database Record</span>
          <span className="text-[10px] text-parchment-400">{algorithm.toUpperCase()} Output</span>
        </div>
        <div className="p-2.5 bg-parchment-50 dark:bg-parchment-900 rounded border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark break-all">
          {generatedHash}
        </div>
      </div>

      {/* 3 Metric Cards: GPU Crack Speed, Time to Crack, Memory Hardness */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Metric 1: Throughput */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Attacker Hashrate
            </div>
            <div className="text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
              {crackMetrics.rate}
            </div>
          </div>
          <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            GPUs execute simple mathematical instructions in parallel at extreme velocity.
          </div>
        </div>

        {/* Metric 2: Estimated Crack Time */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            crackMetrics.isSecure
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time to Recover Password
            </div>
            <div className="text-xl font-mono font-bold">{crackMetrics.crackTime}</div>
          </div>
          <div className="text-[10px] font-mono mt-3 opacity-90">
            {crackMetrics.isSecure
              ? 'Computationally infeasible to reverse.'
              : 'VULNERABLE: Cracked in minutes!'}
          </div>
        </div>

        {/* Metric 3: Memory Hardness */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" /> RAM Required Per Thread
            </div>
            <div className="text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
              {crackMetrics.memoryRequired}
            </div>
          </div>
          <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            Argon2id forces memory lookups, crippling GPU parallel execution cores.
          </div>
        </div>
      </div>

      {/* Outcome Banner */}
      <div
        className={`p-4 rounded-xl border text-xs font-mono ${
          crackMetrics.isSecure
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-500/10 border-red-500/40 text-red-800 dark:text-red-300'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {crackMetrics.isSecure ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <span className="font-bold text-sm">
            {crackMetrics.isSecure
              ? `RECOMMENDED SECURITY: ${algorithm.toUpperCase()} provides defense against GPU clusters`
              : `UNSAFE PASSWORD STORAGE: ${algorithm.toUpperCase()} fails password security standards`}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed opacity-95 pl-7">{crackMetrics.summary}</p>
      </div>
    </div>
  );
};
