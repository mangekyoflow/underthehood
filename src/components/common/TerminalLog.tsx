import React, { useRef, useEffect } from 'react';
import { Terminal, Copy, Check, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  category: string;
  message: string;
}

const LOG_LEVEL_COLORS: Record<LogEntry['level'], string> = {
  info: 'text-ink-light dark:text-ink-dark',
  debug: 'text-ink-muted dark:text-ink-darkMuted',
  warn: 'text-amber-600 dark:text-amber-400',
  error: 'text-rose-600 dark:text-rose-400',
  success: 'text-emerald-600 dark:text-emerald-400',
};

interface TerminalLogProps {
  logs: LogEntry[];
  onClear?: () => void;
  title?: string;
  maxHeight?: string;
  className?: string;
}

export const TerminalLog: React.FC<TerminalLogProps> = ({
  logs,
  onClear,
  title = 'SYSTEM KERNEL & SOCKET TELEMETRY',
  maxHeight = 'max-h-48',
  className,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.category.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={clsx(
        'rounded-xl border border-parchment-300 dark:border-parchment-800 bg-parchment-100/70 dark:bg-parchment-950 overflow-hidden flex flex-col shadow-xs',
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-parchment-300 dark:border-parchment-800 bg-parchment-200/60 dark:bg-parchment-900/80 text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-ink-muted dark:text-ink-darkMuted" />
          <span className="font-semibold text-ink-light dark:text-ink-dark">{title}</span>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted">
            ({logs.length} events)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1 hover:text-ink-light dark:hover:text-ink-dark transition-colors cursor-pointer"
            title="Copy logs"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="p-1 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Clear logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className={clsx('p-3 overflow-y-auto font-mono text-[11px] space-y-1.5', maxHeight)}
      >
        {logs.length === 0 ? (
          <div className="text-ink-muted dark:text-ink-darkMuted py-4 text-center italic">
            Waiting for simulation events...
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-ink-muted dark:text-ink-darkMuted select-none shrink-0 font-mono">
                {log.timestamp}
              </span>
              <span className="px-1 py-0.2 rounded bg-parchment-200 dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-800 text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase shrink-0 font-semibold">
                {log.category}
              </span>
              <span className={clsx('break-all', LOG_LEVEL_COLORS[log.level])}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
