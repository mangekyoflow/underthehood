import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  Play,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Code2,
  AlertTriangle,
  ArrowRight,
  CornerDownRight,
  Cpu,
} from 'lucide-react';
import { AttackPreset, getLessonAttackData } from '../../data/attackPayloads';
import { LogEntry } from '../common/TerminalLog';
import { Badge } from '../common/Badge';
import { playAlert, playSuccess, playTick } from '../../lib/sound';
import clsx from 'clsx';

interface SecurityAttackConsoleProps {
  lessonId: string;
  lessonTitle: string;
  onEmitLog: (log: LogEntry) => void;
}

export const SecurityAttackConsole: React.FC<SecurityAttackConsoleProps> = ({
  lessonId,
  lessonTitle,
  onEmitLog,
}) => {
  const attackData = getLessonAttackData(lessonId);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    attackData.presets[0]?.id || 'custom'
  );
  const [customPayload, setCustomPayload] = useState<string>(
    attackData.presets[0]?.payload || attackData.defaultPayload
  );
  const [defenseMode, setDefenseMode] = useState<boolean>(false);
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [lastExecutionResult, setLastExecutionResult] = useState<{
    status: number;
    statusText: string;
    body: string;
    headers: Record<string, string>;
    detail: string;
    isVulnerable: boolean;
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // When lesson changes, reset preset and payload
  useEffect(() => {
    const data = getLessonAttackData(lessonId);
    if (data.presets.length > 0) {
      setSelectedPresetId(data.presets[0].id);
      setCustomPayload(data.presets[0].payload);
    } else {
      setCustomPayload(data.defaultPayload);
    }
    setLastExecutionResult(null);
  }, [lessonId]);

  const activePreset =
    attackData.presets.find((p) => p.id === selectedPresetId) || attackData.presets[0];

  const handleSelectPreset = (preset: AttackPreset) => {
    playTick();
    setSelectedPresetId(preset.id);
    setCustomPayload(preset.payload);
    setLastExecutionResult(null);
  };

  const handleToggleDefense = () => {
    playTick();
    setDefenseMode((prev) => !prev);
  };

  const handleFirePayload = () => {
    setIsFiring(true);
    const timeStr = new Date().toTimeString().split(' ')[0];

    // Determine result based on defenseMode
    const isArmored = defenseMode;
    const responseTemplate = isArmored
      ? activePreset?.armoredResponse || {
          status: 403,
          statusText: 'Forbidden (WAF Policy Match)',
          body: JSON.stringify({ error: 'blocked_by_security_policy' }, null, 2),
          headers: { 'Content-Type': 'application/json' },
          defenseRule: 'Security defense layer intercepted anomalous payload.',
        }
      : activePreset?.vulnerableResponse || {
          status: 200,
          statusText: 'OK (Payload Executed in Unchecked Scope)',
          body: JSON.stringify({ exploit: 'success', tampered: true }, null, 2),
          headers: { 'Content-Type': 'application/json' },
          exploitTrace: 'Payload reached backend logic without validation check.',
        };

    setTimeout(() => {
      setIsFiring(false);

      if (!isArmored) {
        // Vulnerable attack succeeded
        playAlert();
        setLastExecutionResult({
          status: responseTemplate.status,
          statusText: responseTemplate.statusText,
          body: responseTemplate.body,
          headers: responseTemplate.headers,
          detail:
            'exploitTrace' in responseTemplate
              ? responseTemplate.exploitTrace
              : 'Exploit penetrated perimeter.',
          isVulnerable: true,
        });

        onEmitLog({
          id: `attack-${Date.now()}`,
          timestamp: timeStr,
          level: 'error',
          category: 'EXPLOIT',
          message: `[ATTACK FIRED] ${activePreset?.name || 'Custom Payload'}: Payload executed against ${activePreset?.endpoint || '/target'} [HTTP ${responseTemplate.status}]`,
        });

        onEmitLog({
          id: `trace-${Date.now() + 1}`,
          timestamp: timeStr,
          level: 'warn',
          category: 'BREACH',
          message:
            'exploitTrace' in responseTemplate
              ? responseTemplate.exploitTrace
              : 'Exploit successful',
        });
      } else {
        // Armored defense blocked attack
        playSuccess();
        setLastExecutionResult({
          status: responseTemplate.status,
          statusText: responseTemplate.statusText,
          body: responseTemplate.body,
          headers: responseTemplate.headers,
          detail:
            'defenseRule' in responseTemplate
              ? responseTemplate.defenseRule
              : 'Blocked by armored defense.',
          isVulnerable: false,
        });

        onEmitLog({
          id: `attack-blocked-${Date.now()}`,
          timestamp: timeStr,
          level: 'info',
          category: 'WAF',
          message: `[DEFENSE BLOCKED] Payload intercepted: HTTP ${responseTemplate.status} ${responseTemplate.statusText}`,
        });

        onEmitLog({
          id: `rule-${Date.now() + 1}`,
          timestamp: timeStr,
          level: 'success',
          category: 'MITIGATION',
          message:
            'defenseRule' in responseTemplate ? responseTemplate.defenseRule : 'Mitigation active',
        });
      }
    }, 450);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(customPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-xs overflow-hidden transition-all font-mono">
      {/* Console Header Bar */}
      <div className="px-5 py-3.5 border-b border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm text-ink-light dark:text-ink-dark">
                Interactive Attack & Exploit Simulator
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-red-500/10 text-red-700 dark:text-red-300 font-bold">
                LIVE INJECTION
              </span>
            </div>
            <p className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted">
              Inject real-world exploit payloads into {lessonTitle} and observe defense behavior.
            </p>
          </div>
        </div>

        {/* Defense Mode Toggle */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-ink-muted dark:text-ink-darkMuted text-[11px]">WAF / DEFENSE:</span>
          <button
            onClick={handleToggleDefense}
            className={clsx(
              'px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs border shadow-xs',
              defenseMode
                ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-emerald-500/20'
                : 'bg-red-600/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 hover:bg-red-600/20'
            )}
          >
            {defenseMode ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>ACTIVE (ARMORED)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>OFF (VULNERABLE)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Payload Selectors */}
      <div className="p-4 sm:p-5 space-y-4">
        {attackData.presets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted dark:text-ink-darkMuted uppercase font-bold tracking-wider text-[10px]">
                Preset Attack Vectors ({attackData.presets.length})
              </span>
              <span className="text-[11px] text-ink-muted dark:text-ink-darkMuted">
                Click to load payload into testing sandbox
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attackData.presets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={clsx(
                      'p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5',
                      isSelected
                        ? 'border-red-500/80 bg-red-500/5 dark:bg-red-500/10 shadow-xs'
                        : 'border-parchment-200 dark:border-parchment-800 bg-parchment-50/50 dark:bg-parchment-950/50 hover:bg-parchment-100 dark:hover:bg-parchment-900'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-light dark:text-ink-dark">
                        <Code2 className="w-3.5 h-3.5 text-red-500" />
                        <span className="truncate">{preset.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-parchment-200 dark:bg-parchment-800 text-ink-muted font-mono shrink-0">
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted line-clamp-1">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Payload Editor & Endpoint Info */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-parchment-200 dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold text-[11px]">
                {activePreset?.method || 'POST'}
              </span>
              <span className="text-ink-muted dark:text-ink-darkMuted font-mono text-xs">
                {activePreset?.endpoint || `/api/v1/${lessonId}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPayload}
                className="text-ink-muted hover:text-ink-light dark:hover:text-ink-dark flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() => setCustomPayload(activePreset?.payload || attackData.defaultPayload)}
                className="text-ink-muted hover:text-ink-light dark:hover:text-ink-dark flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl font-mono text-xs border border-parchment-300 dark:border-parchment-700 bg-parchment-950 text-emerald-400 focus:outline-none focus:ring-1 focus:ring-red-500 selection:bg-red-500/30 selection:text-white"
              placeholder="Enter custom exploit payload..."
            />
          </div>
        </div>

        {/* Attack Fire Control Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Target sandbox initialized. Ready for HTTP injection dispatch.</span>
          </div>

          <button
            onClick={handleFirePayload}
            disabled={isFiring || !customPayload.trim()}
            className={clsx(
              'w-full sm:w-auto px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm',
              isFiring
                ? 'bg-parchment-300 text-ink-muted cursor-not-allowed'
                : defenseMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
            )}
          >
            <Play className={clsx('w-3.5 h-3.5 fill-current', isFiring && 'animate-spin')} />
            <span>{isFiring ? 'INJECTING PACKET...' : 'FIRE EXPLOIT PAYLOAD'}</span>
          </button>
        </div>

        {/* Attack Execution Result Inspector */}
        {lastExecutionResult && (
          <div
            className={clsx(
              'p-4 rounded-xl border text-xs font-mono space-y-3 animate-fade-in',
              lastExecutionResult.isVulnerable
                ? 'border-red-400/50 bg-red-500/5 dark:bg-red-950/20 dark:border-red-900/60'
                : 'border-emerald-400/50 bg-emerald-500/5 dark:bg-emerald-950/20 dark:border-emerald-900/60'
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-parchment-200/50 dark:border-parchment-800/50 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded font-bold text-xs',
                    lastExecutionResult.isVulnerable
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-600 text-white'
                  )}
                >
                  HTTP {lastExecutionResult.status}
                </span>
                <span className="font-bold text-ink-light dark:text-ink-dark">
                  {lastExecutionResult.statusText}
                </span>
              </div>

              <span
                className={clsx(
                  'text-[10px] font-bold px-2 py-0.5 rounded uppercase',
                  lastExecutionResult.isVulnerable
                    ? 'bg-red-500/20 text-red-700 dark:text-red-300'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                )}
              >
                {lastExecutionResult.isVulnerable
                  ? 'EXPLOIT SUCCESSFUL (BREACH)'
                  : 'INTERCEPTED & NEUTRALIZED'}
              </span>
            </div>

            {/* Explanation & Traceback */}
            <div className="text-[11px] font-sans leading-relaxed text-ink-light dark:text-ink-dark">
              <span className="font-bold font-mono text-[10px] uppercase text-ink-muted mr-1.5">
                {lastExecutionResult.isVulnerable
                  ? 'Vulnerability Impact:'
                  : 'Defense Enforcement:'}
              </span>
              {lastExecutionResult.detail}
            </div>

            {/* Response Body Inspector */}
            <div className="space-y-1">
              <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase font-bold">
                Response Payload Body:
              </div>
              <pre className="p-3 rounded-lg bg-parchment-950 text-parchment-100 text-[11px] overflow-x-auto max-h-36 selection:bg-blue-500/30">
                {lastExecutionResult.body}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
