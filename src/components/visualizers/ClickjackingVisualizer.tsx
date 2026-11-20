import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Eye, EyeOff, MousePointer, Lock, Layers } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const ClickjackingVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [iframeOpacity, setIframeOpacity] = useState<number>(10); // 10% invisible overlay by default
  const [defenseHeader, setDefenseHeader] = useState<'none' | 'xfo' | 'csp'>('none');
  const [clickCount, setClickCount] = useState<number>(0);
  const [lastActionTriggered, setLastActionTriggered] = useState<string | null>(null);

  const isFramingBlocked = defenseHeader === 'xfo' || defenseHeader === 'csp';

  const handleVictimClick = () => {
    setClickCount((prev) => prev + 1);
    if (isFramingBlocked) {
      setLastActionTriggered('BLOCKED_BY_BROWSER');
    } else {
      setLastActionTriggered('EXPLOITED_DELETE_ACCOUNT');
    }
  };

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Client-Side UI Redressing & Frame Sandboxing
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Clickjacking & CSP frame-ancestors Armor
          </h3>
        </div>

        {/* Defense Header Knob */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const headers: Array<'none' | 'xfo' | 'csp'> = ['none', 'xfo', 'csp'];
              const nextIdx = (headers.indexOf(defenseHeader) + 1) % headers.length;
              setDefenseHeader(headers[nextIdx]);
              setLastActionTriggered(null);
            }}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              isFramingBlocked
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            {isFramingBlocked ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Frame Policy:{' '}
            {defenseHeader === 'none'
              ? 'NONE (VULNERABLE)'
              : defenseHeader === 'xfo'
                ? 'X-Frame-Options: DENY'
                : "CSP: frame-ancestors 'none'"}
          </button>
        </div>
      </div>

      {/* Attacker Opacity Control Bar */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          {iframeOpacity === 0 ? (
            <EyeOff className="w-4 h-4 text-red-500" />
          ) : (
            <Eye className="w-4 h-4 text-blue-500" />
          )}
          <span className="font-bold text-ink-light dark:text-ink-dark">
            Attacker Transparent Overlay Opacity:{' '}
            <span className="text-blue-600 dark:text-blue-400 font-bold">{iframeOpacity}%</span>
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-64">
          <span className="text-[10px] text-ink-muted">0% (Invisible)</span>
          <input
            type="range"
            min="0"
            max="100"
            value={iframeOpacity}
            onChange={(e) => setIframeOpacity(Number(e.target.value))}
            className="flex-1 accent-blue-600 cursor-pointer"
          />
          <span className="text-[10px] text-ink-muted">100% (Visible)</span>
        </div>
      </div>

      {/* UI Redressing Playground (Attacker Web Page Overlaying Bank Page) */}
      <div className="my-6 border border-parchment-300 dark:border-parchment-700 rounded-xl overflow-hidden shadow-md">
        {/* Browser Fake Chrome Bar */}
        <div className="px-4 py-2 bg-parchment-200 dark:bg-parchment-800 border-b border-parchment-300 dark:border-parchment-700 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
            <span className="ml-2 text-ink-light dark:text-ink-dark font-semibold">
              https://evil-free-giveaway-prize.com
            </span>
          </div>
          <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">
            ATTACKER HOST
          </span>
        </div>

        {/* The Visual Sandboxed Canvas */}
        <div className="relative h-64 bg-amber-50/80 dark:bg-parchment-950 p-6 flex flex-col items-center justify-center text-center overflow-hidden">
          {/* Layer 1: Decoy Page (What the User Thinks They See) */}
          <div className="space-y-3 z-0">
            <h4 className="text-xl font-serif font-bold text-amber-900 dark:text-amber-200">
              🎉 Congratulations! You Won an iPhone 16 Pro!
            </h4>
            <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted max-w-md">
              Click the big button below immediately to claim your package before the timer expires!
            </p>
            <div className="pt-2">
              <button className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-mono font-bold text-sm shadow-md pointer-events-none">
                CLAIM FREE PRIZE NOW
              </button>
            </div>
          </div>

          {/* Layer 2: Embedded Target Page (The Hidden Iframe) */}
          <div
            style={{ opacity: iframeOpacity / 100 }}
            className={`absolute inset-0 flex items-center justify-center transition-opacity pointer-events-auto z-10 ${
              isFramingBlocked ? 'bg-parchment-900/90' : 'bg-blue-50/90 dark:bg-blue-950/90'
            }`}
          >
            {isFramingBlocked ? (
              <div className="p-4 rounded-xl bg-parchment-950 border border-red-500/40 text-red-400 font-mono text-xs text-center space-y-1">
                <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto" />
                <div className="font-bold">FRAME EMBEDDING REFUSED BY BROWSER</div>
                <div className="text-[10px] text-parchment-400">
                  {defenseHeader === 'xfo'
                    ? "mybank.com replied with 'X-Frame-Options: DENY'."
                    : 'mybank.com replied with "Content-Security-Policy: frame-ancestors \'none\'";.'}
                </div>
              </div>
            ) : (
              <div className="w-80 p-4 rounded-xl border border-blue-400 bg-white dark:bg-parchment-900 shadow-xl text-center space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-parchment-200 dark:border-parchment-800 text-[10px] font-mono text-blue-600 dark:text-blue-400">
                  <span className="flex items-center gap-1 font-bold">
                    <Lock className="w-3 h-3" /> https://mybank.com/settings
                  </span>
                  <span>Target Victim App</span>
                </div>
                <div className="text-xs font-serif font-bold text-red-600 dark:text-red-400">
                  DANGER ZONE: DELETE ACCOUNT & TRANSFER ASSETS
                </div>
                <button
                  onClick={handleVictimClick}
                  className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Confirm Delete Account (Irreversible)
                </button>
              </div>
            )}
          </div>

          {/* Transparent Click Interceptor on top when framing allowed */}
          {!isFramingBlocked && (
            <div
              onClick={handleVictimClick}
              className="absolute inset-0 cursor-pointer z-20 flex items-center justify-center"
              title="Click anywhere to simulate victim clicking the decoy button"
            >
              <div className="opacity-0 hover:opacity-100 transition-opacity bg-black/40 text-white text-[10px] font-mono px-2 py-1 rounded">
                Click coordinates aligned over target iframe
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Outcome Banner */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800 text-ink-muted">
          <span className="uppercase font-bold text-[11px] flex items-center gap-1.5">
            <MousePointer className="w-3.5 h-3.5 text-blue-500" /> Click Event Dispatch Analysis
          </span>
          <span>Clicks Received: {clickCount}</span>
        </div>

        {lastActionTriggered === 'EXPLOITED_DELETE_ACCOUNT' ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                CLICKJACKING EXPLOIT SUCCEEDED: Victim Account Deleted!
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The victim thought they clicked "Claim Free Prize", but their click was secretly
                absorbed by the transparent iframe pointing to{' '}
                <code className="font-bold">mybank.com/settings</code> with authenticated session
                cookies attached!
              </div>
            </div>
          </div>
        ) : lastActionTriggered === 'BLOCKED_BY_BROWSER' || isFramingBlocked ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                CLICKJACKING DEFENSE ENFORCED: Frame-Busting Active
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {defenseHeader === 'csp'
                  ? "Content-Security-Policy: frame-ancestors 'none' instructed the browser engine to refuse rendering in any frame or iframe. The attack is mathematically defused."
                  : 'X-Frame-Options: DENY prevented the browser from rendering the target page inside a foreign iframe.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-parchment-100 dark:bg-parchment-900 text-ink-muted dark:text-ink-darkMuted flex items-center gap-2">
            <Layers className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <div className="text-[11px]">
              Move the opacity slider to reveal the hidden high-privilege button beneath the decoy.
              Click the button to test whether the browser intercepts or blocks the action.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
