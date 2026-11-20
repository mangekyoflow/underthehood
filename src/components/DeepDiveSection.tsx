import React, { useState, useRef, useEffect } from 'react';
import { Lesson, LessonStep } from '../types';
import {
  Shield,
  Terminal,
  AlertOctagon,
  CheckSquare,
  HelpCircle,
  Copy,
  Check,
  BookOpen,
  Layers,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface Props {
  lesson: Lesson;
  activeStepData: LessonStep;
  currentStep: number;
  lang: Language;
}

export const DeepDiveSection: React.FC<Props> = ({ lesson, activeStepData, currentStep, lang }) => {
  const [activeTab, setActiveTab] = useState<'step' | 'cve' | 'hardening' | 'faqs'>('step');
  const [copied, setCopied] = useState(false);
  const prevStepRef = useRef(currentStep);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (currentStep !== prevStepRef.current) {
      setSlideDirection(currentStep > prevStepRef.current ? 'next' : 'prev');
      prevStepRef.current = currentStep;
    }
  }, [currentStep]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 rounded-2xl bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 space-y-6 shadow-xs transition-colors">
      {/* Editorial Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-parchment-200 dark:border-parchment-800 gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-parchment-100 dark:bg-parchment-950 rounded-xl border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('step')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'step'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark shadow-xs font-bold'
                : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            {t.tabStep} ({currentStep + 1})
          </button>

          {lesson.cveCaseStudy && (
            <button
              onClick={() => setActiveTab('cve')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cve'
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
              {t.tabCve}
            </button>
          )}

          {lesson.hardeningGuide && (
            <button
              onClick={() => setActiveTab('hardening')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'hardening'
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              {t.tabHardening}
            </button>
          )}

          {lesson.faqs && lesson.faqs.length > 0 && (
            <button
              onClick={() => setActiveTab('faqs')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'faqs'
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
              {t.tabFaqs} ({lesson.faqs.length})
            </button>
          )}
        </div>

        <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted hidden sm:inline">
          Interactive Curriculum Explainer
        </span>
      </div>

      {/* TAB 1: Step Deep Dive */}
      {activeTab === 'step' && (
        <div
          key={currentStep}
          className="guide__content is-in space-y-5"
          style={{ '--slide': `${slideDirection === 'prev' ? -18 : 18}px` } as React.CSSProperties}
        >
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center">
              {currentStep + 1}
            </span>
            <h3 className="text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
              {activeStepData.title}
            </h3>
          </div>

          <p className="text-sm font-sans text-ink-light dark:text-ink-dark leading-relaxed">
            {activeStepData.detail}
          </p>

          {/* Action Summary Pill */}
          {activeStepData.actionSummary && (
            <div className="p-2.5 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono text-ink-light dark:text-ink-dark flex items-center justify-between">
              <span className="text-ink-muted dark:text-ink-darkMuted font-semibold">
                {t.wireProtocolAction}:
              </span>
              <code className="text-blue-600 dark:text-blue-400 font-bold">
                {activeStepData.actionSummary}
              </code>
            </div>
          )}

          {/* Architectural Security Takeaway Rule */}
          {activeStepData.securityTakeaway && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-sans text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-mono uppercase font-bold tracking-wider block mb-0.5 text-emerald-800 dark:text-emerald-300 text-[10px]">
                  {t.coreArchitecturalRule}
                </strong>
                {activeStepData.securityTakeaway}
              </div>
            </div>
          )}

          {/* Code Snippet Box */}
          {activeStepData.codeSnippet && (
            <div className="rounded-xl overflow-hidden border border-parchment-300 dark:border-parchment-800 bg-parchment-950 text-white font-mono text-xs">
              <div className="px-4 py-2 bg-parchment-900 border-b border-parchment-800 flex items-center justify-between text-[11px] text-parchment-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  {activeStepData.codeSnippet.label || t.codeImplementation}
                </span>
                <span className="uppercase text-[10px]">{activeStepData.codeSnippet.language}</span>
              </div>
              <pre className="p-4 overflow-x-auto text-emerald-400 leading-relaxed">
                <code>{activeStepData.codeSnippet.code}</code>
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Real-World CVE Case Study */}
      {activeTab === 'cve' && lesson.cveCaseStudy && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-parchment-200 dark:border-parchment-800">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400 font-bold">
                Real-World Security Incident Analysis
              </span>
              <h3 className="text-lg font-serif font-bold text-ink-light dark:text-ink-dark flex items-center gap-2">
                {lesson.cveCaseStudy.title}
              </h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 font-bold">
              {lesson.cveCaseStudy.cveId || lesson.cveCaseStudy.year}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
              <span className="text-ink-muted dark:text-ink-darkMuted uppercase text-[10px] block mb-1">
                {t.targetOrganization}:
              </span>
              <span className="font-bold text-ink-light dark:text-ink-dark">
                {lesson.cveCaseStudy.organization} ({lesson.cveCaseStudy.year})
              </span>
            </div>
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30">
              <span className="text-red-600 dark:text-red-400 uppercase text-[10px] block mb-1">
                {t.blastRadius}:
              </span>
              <span className="font-bold text-red-700 dark:text-red-300">
                {lesson.cveCaseStudy.damage}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase font-bold text-ink-light dark:text-ink-dark">
              {t.incidentBreakdown}:
            </h4>
            <p className="text-sm font-sans text-ink-light dark:text-ink-dark leading-relaxed p-4 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
              {lesson.cveCaseStudy.breakdown}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-sans text-amber-900 dark:text-amber-200 space-y-1">
            <strong className="font-mono uppercase font-bold text-amber-800 dark:text-amber-300 text-[10px] block">
              {t.rootCauseTakeaway}:
            </strong>
            <p className="leading-relaxed">
              <strong>Root Cause:</strong> {lesson.cveCaseStudy.rootCause}
              <br />
              <strong>Architectural Takeaway:</strong> {lesson.cveCaseStudy.takeaway}
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: Production Hardening Guide */}
      {activeTab === 'hardening' && lesson.hardeningGuide && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
              Engineering Blueprint & Checklist
            </span>
            <h3 className="text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
              {lesson.hardeningGuide.title}
            </h3>
          </div>

          {/* Hardening Checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> {t.mandatoryControls}
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs font-mono">
              {lesson.hardeningGuide.checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-start gap-2.5 text-ink-light dark:text-ink-dark"
                >
                  <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Production Code Snippet */}
          <div className="rounded-xl overflow-hidden border border-parchment-300 dark:border-parchment-800 bg-parchment-950 text-white font-mono text-xs">
            <div className="px-4 py-2.5 bg-parchment-900 border-b border-parchment-800 flex items-center justify-between text-[11px] text-parchment-400">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                {lesson.hardeningGuide.codeSample.filename}
              </span>
              <button
                onClick={() => copyCode(lesson.hardeningGuide!.codeSample.code)}
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? t.copied : t.copyCode}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-blue-300 leading-relaxed">
              <code>{lesson.hardeningGuide.codeSample.code}</code>
            </pre>
            <div className="px-4 py-2 bg-parchment-900/60 border-t border-parchment-800 text-[11px] text-parchment-400">
              ℹ️ {lesson.hardeningGuide.codeSample.note}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Security FAQs */}
      {activeTab === 'faqs' && lesson.faqs && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold">
              Engineering Inquiries & Common Pitfalls
            </span>
            <h3 className="text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
              {t.engineeringInquiries}
            </h3>
          </div>

          <div className="space-y-3">
            {lesson.faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/60 dark:bg-parchment-950/60 space-y-2"
              >
                <h4 className="text-xs font-serif font-bold text-ink-light dark:text-ink-dark flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0">
                    Q
                  </span>
                  {faq.question}
                </h4>
                <p className="text-xs font-sans text-ink-light dark:text-ink-dark leading-relaxed pl-7">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
