import React, { useState } from 'react';
import { ShieldCheck, Terminal, Copy, Check, Code2, Layers } from 'lucide-react';
import { LessonStep } from '../../types';
import { Badge } from './Badge';
import clsx from 'clsx';

interface StepExplanationCardProps {
  stepNumber: number;
  totalSteps: number;
  stepData?: LessonStep;
  accentColor?: 'security' | 'network' | 'query' | 'actuate' | 'silicon';
  className?: string;
}

export const StepExplanationCard: React.FC<StepExplanationCardProps> = ({
  stepNumber,
  totalSteps,
  stepData,
  accentColor = 'security',
  className,
}) => {
  const [copied, setCopied] = useState(false);

  if (!stepData) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={clsx(
        'p-5 sm:p-6 rounded-2xl border transition-all duration-300 shadow-sm',
        'bg-white/95 dark:bg-parchment-900/95 border-parchment-200 dark:border-parchment-800',
        className
      )}
    >
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-parchment-200/80 dark:border-parchment-800/80">
        <div className="flex items-center gap-2">
          <Badge variant={accentColor === 'security' ? 'cyan' : 'emerald'}>
            STAGE // STEP {stepNumber} OF {totalSteps}
          </Badge>
          {stepData.actionSummary && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-parchment-100 dark:bg-parchment-800 text-ink-muted dark:text-ink-darkMuted border border-parchment-200 dark:border-parchment-700">
              <Terminal className="w-3 h-3 text-blue-500" />
              <span className="truncate max-w-xs">{stepData.actionSummary}</span>
            </span>
          )}
        </div>

        <div className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5 font-semibold">
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span>Interactive State Machine</span>
        </div>
      </div>

      {/* Main Step Headline & Narrative */}
      <div className="mt-3.5 space-y-2.5">
        <h3 className="text-lg sm:text-xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight leading-snug">
          {stepData.title}
        </h3>

        <p className="text-sm sm:text-base text-ink-light dark:text-ink-dark leading-relaxed font-sans font-medium">
          {stepData.description}
        </p>

        {stepData.detail && (
          <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
            {stepData.detail}
          </p>
        )}
      </div>

      {/* Security Defense Insight Callout Box (designed-to-scale style) */}
      {stepData.securityTakeaway && (
        <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-blue-700 dark:text-blue-300 block">
              Core Security Rule &amp; Defense Principle
            </span>
            <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed font-sans">
              {stepData.securityTakeaway}
            </p>
          </div>
        </div>
      )}

      {/* Code Snippet / Wire Packet Payload if present */}
      {stepData.codeSnippet && (
        <div className="mt-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-950 text-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 bg-parchment-900/90 border-b border-parchment-800 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {stepData.codeSnippet.label || `${stepData.codeSnippet.language} implementation`}
              </span>
            </div>
            <button
              onClick={() => handleCopy(stepData.codeSnippet!.code)}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 text-xs font-mono overflow-x-auto text-cyan-300 leading-relaxed">
            <code>{stepData.codeSnippet.code}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
