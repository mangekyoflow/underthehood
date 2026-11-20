import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Key, Clock, Database, RefreshCw, Send, Zap } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const ReplayAttackVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [defenseEnabled, setDefenseEnabled] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(1000);
  const [seenNonces, setSeenNonces] = useState<string[]>([]);
  const [lastEvent, setLastEvent] = useState<{
    status: 'allowed' | 'replayed_blocked' | 'replayed_exploited';
    nonce: string;
    timestamp: number;
  } | null>(null);

  const capturedPacket = {
    method: 'POST',
    path: '/api/v1/payments/transfer',
    body: JSON.stringify({ to: 'Merchant_XYZ', amount: 100 }),
    signature: 'hmac_sha256_3f9a1b02c84e...',
    nonce: 'nonce_9a8f2c1b',
    timestamp: 1735689600,
  };

  const sendLegitimatePayment = () => {
    const freshNonce = 'nonce_' + Math.random().toString(16).substring(2, 10);
    const now = Math.floor(Date.now() / 1000);

    setBalance((prev) => prev - 100);
    setSeenNonces((prev) => [...prev, freshNonce]);
    setLastEvent({
      status: 'allowed',
      nonce: freshNonce,
      timestamp: now,
    });
  };

  const replayCapturedPacket = () => {
    const isDuplicate = seenNonces.includes(capturedPacket.nonce);

    if (defenseEnabled && isDuplicate) {
      setLastEvent({
        status: 'replayed_blocked',
        nonce: capturedPacket.nonce,
        timestamp: capturedPacket.timestamp,
      });
    } else {
      // Replay executed!
      setBalance((prev) => prev - 100);
      setSeenNonces((prev) => [...prev, capturedPacket.nonce]);
      setLastEvent({
        status: defenseEnabled ? 'allowed' : 'replayed_exploited',
        nonce: capturedPacket.nonce,
        timestamp: capturedPacket.timestamp,
      });
    }
  };

  const resetAll = () => {
    setBalance(1000);
    setSeenNonces([capturedPacket.nonce]); // Assume packet was already sent once
    setLastEvent(null);
  };

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Cryptographic Idempotency & Message Authentication
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Replay Attacks & Nonce/Timestamp Validation (AWS SigV4)
          </h3>
        </div>

        {/* Defense Knob */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setDefenseEnabled(!defenseEnabled);
              resetAll();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              defenseEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            {defenseEnabled ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Nonce & Timestamp Check:{' '}
            {defenseEnabled ? 'ACTIVE (AWS SIGV4 / STRIPE MODEL)' : 'DISABLED (SIGNATURE ONLY)'}
          </button>

          <button
            onClick={resetAll}
            className="p-1.5 rounded-lg border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-950 text-ink-muted hover:text-ink-light transition-colors cursor-pointer"
            title="Reset simulation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Account Balance & Action Trigger Bar */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        <div>
          <span className="text-ink-muted">Victim Bank Balance:</span>
          <span className="ml-2 text-base font-bold text-ink-light dark:text-ink-dark">
            ${balance}.00 USD
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={sendLegitimatePayment}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Send New Payment ($100)
          </button>

          <button
            onClick={replayCapturedPacket}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" /> Eavesdropper Replays Packet
          </button>
        </div>
      </div>

      {/* Two Wire Boxes: Captured Packet vs Server Nonce Cache */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs font-mono">
        {/* Box 1: Eavesdropped Wire Packet */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Key className="w-4 h-4 text-purple-500" /> Captured Wire Packet
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                HMAC Verified
              </span>
            </div>
            <pre className="p-3 bg-parchment-50 dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 text-[10px] overflow-x-auto text-ink-light dark:text-ink-dark leading-relaxed">
              {`POST /api/v1/payments/transfer HTTP/1.1
X-Signature: ${capturedPacket.signature}
X-Nonce: ${capturedPacket.nonce}
X-Timestamp: ${capturedPacket.timestamp}

{"to": "Merchant_XYZ", "amount": 100}`}
            </pre>
          </div>
          <span className="text-[10px] text-ink-muted mt-3">
            The cryptographic signature is mathematically valid, but the packet is being replayed!
          </span>
        </div>

        {/* Box 2: Server Ephemeral Redis Nonce Cache */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-500" /> Server Redis Nonce Cache
              </span>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" /> 5-Min TTL Window
              </span>
            </div>
            <div className="p-3 bg-parchment-50 dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 max-h-32 overflow-y-auto space-y-1">
              <span className="text-[10px] text-ink-muted uppercase font-bold block mb-1">
                Seen Nonces (Redis SET):
              </span>
              {seenNonces.map((n, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px]">
                  <code className="text-emerald-700 dark:text-emerald-300 font-bold">{n}</code>
                  <span className="text-parchment-400">TTL: 284s</span>
                </div>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-ink-muted mt-3">
            {defenseEnabled
              ? 'Duplicate nonces within the timestamp window are rejected immediately.'
              : 'Without nonce tracking, server blindly processes repeated signed requests.'}
          </span>
        </div>
      </div>

      {/* Outcome Banner */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 font-mono text-xs">
        {lastEvent?.status === 'replayed_exploited' ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">REPLAY ATTACK EXPLOITED: Funds Stolen!</div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The eavesdropper replayed the exact same signed packet. Because the backend only
                verified the signature without tracking nonces or timestamps, the bank executed a
                second $100 transfer!
              </div>
            </div>
          </div>
        ) : lastEvent?.status === 'replayed_blocked' ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                REPLAY DEFENSE ACTIVE: HTTP 409 Conflict (Duplicate Nonce)
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The server inspected <code className="font-bold">{lastEvent.nonce}</code> in Redis.
                Because this nonce was already consumed within the active 5-minute window, the
                replayed transaction was halted before any funds moved.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-parchment-100 dark:bg-parchment-900 text-ink-muted">
            Click <strong>"Eavesdropper Replays Packet"</strong> to test whether replaying a valid
            signed HTTP payload succeeds or is intercepted by the nonce validation engine.
          </div>
        )}
      </div>
    </div>
  );
};
