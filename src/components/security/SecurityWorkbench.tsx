import React, { useState } from 'react';
import {
  Zap,
  Calculator,
  ShieldCheck,
  KeyRound,
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { SecurityAttackConsole } from './SecurityAttackConsole';
import { CvssCalculator } from './CvssCalculator';
import { SecurityHeadersAuditor } from './SecurityHeadersAuditor';
import { PasswordEntropyBenchmark } from './PasswordEntropyBenchmark';
import { SecurityCertificationQuiz } from './SecurityCertificationQuiz';
import { LogEntry } from '../common/TerminalLog';
import { playTick } from '../../lib/sound';
import clsx from 'clsx';

export type SecurityToolTab = 'attack' | 'cvss' | 'headers' | 'entropy' | 'quiz';

interface SecurityWorkbenchProps {
  lessonId: string;
  lessonTitle: string;
  onEmitLog: (log: LogEntry) => void;
  initialTab?: SecurityToolTab;
}

export const SecurityWorkbench: React.FC<SecurityWorkbenchProps> = ({
  lessonId,
  lessonTitle,
  onEmitLog,
  initialTab = 'attack',
}) => {
  const [activeTab, setActiveTab] = useState<SecurityToolTab>(initialTab);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const tabs: {
    id: SecurityToolTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: 'attack',
      label: 'Exploit Injector',
      icon: <Zap className="w-3.5 h-3.5" />,
      badge: 'Live Attack',
    },
    {
      id: 'cvss',
      label: 'CVSS 3.1 Calculator',
      icon: <Calculator className="w-3.5 h-3.5" />,
      badge: 'Threat Matrix',
    },
    {
      id: 'headers',
      label: 'HTTP Headers Auditor',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      badge: 'Hardening',
    },
    {
      id: 'entropy',
      label: 'Entropy & GPU Benchmark',
      icon: <KeyRound className="w-3.5 h-3.5" />,
      badge: 'Crypto Lab',
    },
    {
      id: 'quiz',
      label: 'Architecture Quiz',
      icon: <Award className="w-3.5 h-3.5" />,
      badge: '10 Scenarios',
    },
  ];

  const handleSelectTab = (tabId: SecurityToolTab) => {
    playTick();
    setActiveTab(tabId);
    if (isCollapsed) setIsCollapsed(false);
  };

  return (
    <div className="rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-100/50 dark:bg-parchment-950/50 shadow-xs overflow-hidden transition-all space-y-4 p-4 font-mono">
      {/* Workbench Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-serif font-bold text-sm text-ink-light dark:text-ink-dark">
            Interactive Security Engineering Workbench
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
            HANDS-ON SUITE
          </span>
        </div>

        <button
          onClick={() => {
            playTick();
            setIsCollapsed(!isCollapsed);
          }}
          className="text-xs text-ink-muted hover:text-ink-light dark:hover:text-ink-dark flex items-center gap-1 cursor-pointer"
        >
          <span>{isCollapsed ? 'Expand Tools' : 'Collapse Tools'}</span>
          {isCollapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-parchment-200/60 dark:bg-parchment-900/60 border border-parchment-300/60 dark:border-parchment-800 text-xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs',
                isActive
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark shadow-xs border border-parchment-300 dark:border-parchment-700'
                  : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-white/40 dark:hover:bg-parchment-800/40'
              )}
            >
              <span
                className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-muted'}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={clsx(
                    'px-1.5 py-0.2 rounded text-[9px] font-mono leading-tight',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-parchment-300/50 dark:bg-parchment-800 text-ink-muted'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {!isCollapsed && (
        <div className="animate-fade-in pt-1">
          {activeTab === 'attack' && (
            <SecurityAttackConsole
              lessonId={lessonId}
              lessonTitle={lessonTitle}
              onEmitLog={onEmitLog}
            />
          )}

          {activeTab === 'cvss' && <CvssCalculator />}

          {activeTab === 'headers' && <SecurityHeadersAuditor />}

          {activeTab === 'entropy' && <PasswordEntropyBenchmark />}

          {activeTab === 'quiz' && <SecurityCertificationQuiz />}
        </div>
      )}
    </div>
  );
};
