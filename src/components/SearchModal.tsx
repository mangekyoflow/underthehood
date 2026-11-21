import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  X,
  BookOpen,
  AlertOctagon,
  CheckSquare,
  ArrowRight,
  ShieldCheck,
  Route,
  Database,
  Bot,
  Microchip,
} from 'lucide-react';
import { Lesson, ModuleId, NavigationTab } from '../types';
import { MODULES } from '../data/modulesData';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lessons: Lesson[];
  onSelectLesson: (lessonId: string) => void;
  onSelectSystemsModule?: (tab: NavigationTab, moduleId?: ModuleId) => void;
  lang: Language;
}

type SearchResultItem =
  | {
      type: 'security_lesson';
      lesson: Lesson;
      matchTitle: string;
      matchSubtitle: string;
      badge: string;
    }
  | {
      type: 'security_cve';
      lesson: Lesson;
      matchTitle: string;
      matchSubtitle: string;
      badge: string;
    }
  | {
      type: 'security_hardening';
      lesson: Lesson;
      matchTitle: string;
      matchSubtitle: string;
      badge: string;
    }
  | {
      type: 'systems_module';
      tab: 'route' | 'query' | 'actuate' | 'silicon';
      moduleId: ModuleId;
      matchTitle: string;
      matchSubtitle: string;
      badge: string;
    };

export const SearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lessons,
  onSelectLesson,
  onSelectSystemsModule,
  lang,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Compute search results across security lessons, CVEs, hardening guides, and systems engineering modules
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // Default: Return mix of security lessons and systems modules
      const defaults: SearchResultItem[] = [];

      // Add top systems modules
      Object.values(MODULES).forEach((m) => {
        defaults.push({
          type: 'systems_module',
          tab: m.trackId,
          moduleId: m.id,
          matchTitle: `${m.number}. ${m.title}`,
          matchSubtitle: m.subtitle,
          badge:
            m.trackId === 'route'
              ? t.trackRouteTitle
              : m.trackId === 'query'
                ? t.trackQueryTitle
                : m.trackId === 'actuate'
                  ? t.trackActuateTitle
                  : t.trackTapeoutTitle,
        });
      });

      // Add top security lessons
      lessons.slice(0, 10).forEach((l) => {
        defaults.push({
          type: 'security_lesson',
          lesson: l,
          matchTitle: l.title,
          matchSubtitle: l.subtitle,
          badge: l.trackTitle,
        });
      });

      return defaults;
    }

    const results: SearchResultItem[] = [];

    // 1. Search Systems Engineering Modules (Route & Query)
    Object.values(MODULES).forEach((m) => {
      if (
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q) ||
        m.overview.toLowerCase().includes(q) ||
        m.concept.toLowerCase().includes(q) ||
        m.keyTakeaway.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'systems_module',
          tab: m.trackId,
          moduleId: m.id,
          matchTitle: `${m.number}. ${m.title}`,
          matchSubtitle: m.subtitle,
          badge:
            m.trackId === 'route'
              ? t.trackRouteTitle
              : m.trackId === 'query'
                ? t.trackQueryTitle
                : m.trackId === 'actuate'
                  ? t.trackActuateTitle
                  : t.trackTapeoutTitle,
        });
      }
    });

    // 2. Search Security Lessons
    for (const l of lessons) {
      if (
        l.title.toLowerCase().includes(q) ||
        l.subtitle.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        l.keyConcepts.some((c) => c.toLowerCase().includes(q))
      ) {
        results.push({
          type: 'security_lesson',
          lesson: l,
          matchTitle: l.title,
          matchSubtitle: l.subtitle,
          badge: l.trackTitle,
        });
      }

      // Check CVE Case Studies
      if (
        l.cveCaseStudy &&
        (l.cveCaseStudy.title.toLowerCase().includes(q) ||
          l.cveCaseStudy.organization.toLowerCase().includes(q) ||
          l.cveCaseStudy.breakdown.toLowerCase().includes(q) ||
          l.cveCaseStudy.damage.toLowerCase().includes(q))
      ) {
        results.push({
          type: 'security_cve',
          lesson: l,
          matchTitle: `CVE: ${l.cveCaseStudy.title}`,
          matchSubtitle: `${l.cveCaseStudy.organization} (${l.cveCaseStudy.year}) • ${l.cveCaseStudy.damage}`,
          badge: 'Security Incident',
        });
      }

      // Check Hardening Guides
      if (
        l.hardeningGuide &&
        (l.hardeningGuide.title.toLowerCase().includes(q) ||
          l.hardeningGuide.checklist.some((c) => c.toLowerCase().includes(q)) ||
          l.hardeningGuide.codeSample.filename.toLowerCase().includes(q))
      ) {
        results.push({
          type: 'security_hardening',
          lesson: l,
          matchTitle: `Hardening: ${l.hardeningGuide.title}`,
          matchSubtitle: `Config: ${l.hardeningGuide.codeSample.filename}`,
          badge: 'Defense Blueprint',
        });
      }
    }

    return results;
  }, [lessons, query, t]);

  const handleSelectItem = useCallback(
    (item: SearchResultItem) => {
      if (item.type === 'systems_module') {
        if (onSelectSystemsModule) {
          onSelectSystemsModule(item.tab, item.moduleId);
        }
      } else {
        onSelectLesson(item.lesson.id);
      }
      onClose();
    },
    [onClose, onSelectLesson, onSelectSystemsModule]
  );

  // Handle keyboard navigation inside search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, searchResults.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length)
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelectItem(searchResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose, handleSelectItem]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-24 p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
      <div className="relative w-full max-w-2xl rounded-2xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-3 sm:p-4 border-b border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 flex items-center gap-2.5 sm:gap-3">
          <Search className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent text-base sm:text-sm font-sans text-ink-light dark:text-ink-dark placeholder:text-ink-muted dark:placeholder:text-ink-darkMuted focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-ink-muted hover:text-ink-light"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded bg-parchment-100 dark:bg-parchment-800 border border-parchment-300 dark:border-parchment-700 font-mono text-[10px] text-ink-muted">
            ESC
          </kbd>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-ink-muted">{t.noResults}</div>
          ) : (
            searchResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={`${item.type}-${index}`}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 border ${
                    isSelected
                      ? 'bg-white dark:bg-parchment-900 border-blue-500/50 shadow-xs'
                      : 'border-transparent hover:bg-parchment-100/60 dark:hover:bg-parchment-900/40'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">
                      {item.type === 'systems_module' ? (
                        item.tab === 'route' ? (
                          <Route className="w-4 h-4 text-cyan-500" />
                        ) : item.tab === 'query' ? (
                          <Database className="w-4 h-4 text-purple-500" />
                        ) : item.tab === 'actuate' ? (
                          <Bot className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Microchip className="w-4 h-4 text-emerald-500" />
                        )
                      ) : item.type === 'security_lesson' ? (
                        <BookOpen className="w-4 h-4 text-blue-500" />
                      ) : item.type === 'security_cve' ? (
                        <AlertOctagon className="w-4 h-4 text-red-500" />
                      ) : (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-serif font-bold text-ink-light dark:text-ink-dark truncate">
                          {item.matchTitle}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                            item.type === 'systems_module'
                              ? item.tab === 'route'
                                ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20'
                                : item.tab === 'query'
                                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                                  : item.tab === 'actuate'
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              : item.type === 'security_lesson'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                : item.type === 'security_cve'
                                  ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-ink-muted dark:text-ink-darkMuted truncate mt-0.5">
                        {item.matchSubtitle}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                      isSelected ? 'text-blue-500 translate-x-1' : 'text-transparent'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer Controls Helper */}
        <div className="p-3 border-t border-parchment-200 dark:border-parchment-800 bg-parchment-100 dark:bg-parchment-950 flex items-center justify-between text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 mr-1 text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 mr-1 text-[10px]">
                ↓
              </kbd>
              {t.navigateKey}
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 mr-1 text-[10px]">
                ↵
              </kbd>
              {t.selectKey}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> {t.modulesIndexed}
          </span>
        </div>
      </div>
    </div>
  );
};
