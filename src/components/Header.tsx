import React, { useState } from 'react';
import {
  ShieldCheck,
  Moon,
  Sun,
  BookOpen,
  X,
  Search,
  Globe,
  ChevronDown,
  Route,
  Database,
  Compass,
  CheckCircle2,
  Volume2,
  VolumeX,
  Bot,
  Microchip,
} from 'lucide-react';
import { NavigationTab } from '../types';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { toggleSound, isSoundEnabled, playTick } from '../lib/sound';

interface Props {
  currentSuiteTab: NavigationTab;
  onSelectSuiteTab: (tab: NavigationTab) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleCurriculum: () => void;
  isCurriculumOpen: boolean;
  onOpenSearch: () => void;
  lang: Language;
  onSelectLang: (lang: Language) => void;
  onResetHome?: () => void;
}

export const Header: React.FC<Props> = ({
  currentSuiteTab,
  onSelectSuiteTab,
  darkMode,
  onToggleDarkMode,
  onToggleCurriculum,
  isCurriculumOpen,
  onOpenSearch,
  lang,
  onSelectLang,
  onResetHome,
}) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const t = TRANSLATIONS[lang];

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) playTick();
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
  ];

  const suiteTabs: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'security',
      label: t.tabSecurity,
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      badge: '23',
    },
    { id: 'route', label: t.tabRoute, icon: <Route className="w-3.5 h-3.5" />, badge: '4' },
    { id: 'query', label: t.tabQuery, icon: <Database className="w-3.5 h-3.5" />, badge: '3' },
    { id: 'actuate', label: t.tabActuate, icon: <Bot className="w-3.5 h-3.5" />, badge: '3' },
    { id: 'silicon', label: t.tabSilicon, icon: <Microchip className="w-3.5 h-3.5" />, badge: '2' },
  ];

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-parchment-100/95 dark:bg-parchment-950/95 border-b border-parchment-200 dark:border-parchment-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <button
            onClick={() => {
              playTick();
              onResetHome?.();
            }}
            className="flex items-center gap-1.5 sm:gap-2.5 text-left group cursor-pointer focus:outline-none"
            title="underthehood"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm sm:text-base lg:text-lg tracking-tight text-ink-light dark:text-ink-dark group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                underthehood
              </span>
            </div>
          </button>

          <button
            onClick={onToggleCurriculum}
            className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border transition-all flex items-center gap-1 sm:gap-1.5 text-xs font-mono font-medium cursor-pointer ${
              isCurriculumOpen
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'border-parchment-300 dark:border-parchment-700 bg-white/70 dark:bg-parchment-900/70 hover:bg-parchment-200 dark:hover:bg-parchment-800 text-ink-light dark:text-ink-dark shadow-xs'
            }`}
            title="Course Index (35 modules)"
            aria-label="Toggle Course Index"
          >
            {isCurriculumOpen ? (
              <X className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden sm:inline">{isCurriculumOpen ? t.close : t.courseIndex}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-parchment-200 dark:bg-parchment-800 text-[10px] text-ink-muted dark:text-ink-darkMuted font-mono">
              35
            </span>
          </button>
        </div>

        <nav
          aria-label="Discipline Suites"
          className="hidden md:flex items-center gap-0.5 lg:gap-1 bg-parchment-200/50 dark:bg-parchment-900/50 p-1 rounded-xl border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono overflow-x-auto no-scrollbar shrink-0"
        >
          {suiteTabs.map((tab) => {
            const isActive = currentSuiteTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playTick();
                  onSelectSuiteTab(tab.id);
                }}
                className={`px-2 lg:px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 lg:gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300/80 dark:border-parchment-700'
                    : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
                }`}
              >
                <span
                  className={
                    isActive
                      ? tab.id === 'security'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : tab.id === 'route'
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : tab.id === 'query'
                            ? 'text-purple-600 dark:text-purple-400'
                            : tab.id === 'actuate'
                              ? 'text-amber-600 dark:text-amber-400'
                              : tab.id === 'silicon'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                      : 'text-ink-muted'
                  }
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`hidden xl:inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-mono leading-none ${
                      isActive
                        ? 'bg-parchment-200 dark:bg-parchment-700 font-bold'
                        : 'bg-parchment-200/70 dark:bg-parchment-800/70 text-ink-muted'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Sound, Search, Language, Theme */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Search Trigger Button */}
          <button
            onClick={() => {
              playTick();
              onOpenSearch();
            }}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white/70 dark:bg-parchment-900/70 hover:bg-white dark:hover:bg-parchment-900 text-xs font-mono text-ink-muted dark:text-ink-darkMuted transition-all shadow-xs hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer"
            title="Search curriculum (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="hidden sm:inline">{t.searchButton}</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-parchment-100 dark:bg-parchment-800 border border-parchment-300 dark:border-parchment-700 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
              ⌘K
            </kbd>
          </button>

          {/* Tactile Audio Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 sm:p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white/70 dark:bg-parchment-900/70 hover:bg-parchment-200 dark:hover:bg-parchment-800 transition-colors text-ink-muted dark:text-ink-darkMuted cursor-pointer shadow-xs"
            title={soundOn ? t.muteSound : t.enableSound}
            aria-label="Toggle Sound"
          >
            {soundOn ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-ink-muted" />
            )}
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative flex items-center">
            <Globe className="w-3.5 h-3.5 absolute left-2 sm:left-2.5 text-ink-muted pointer-events-none" />
            <select
              value={lang}
              onChange={(e) => onSelectLang(e.target.value as Language)}
              className="pl-6 sm:pl-7 pr-5 sm:pr-6 py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 hover:bg-parchment-50 dark:hover:bg-parchment-850 text-xs font-mono text-ink-light dark:text-ink-dark appearance-none cursor-pointer focus:outline-none focus:border-blue-500 transition-colors shadow-xs"
              title="Select Language / Idioma / 言語"
              aria-label="Select Language"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} <span className="hidden sm:inline">{l.code.toUpperCase()}</span>
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-1.5 sm:right-2 text-ink-muted pointer-events-none" />
          </div>

          {/* Theme Dark/Light Mode Toggle */}
          <button
            onClick={() => {
              playTick();
              onToggleDarkMode();
            }}
            className="p-1.5 sm:p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white/70 dark:bg-parchment-900/70 hover:bg-parchment-200 dark:hover:bg-parchment-800 transition-colors text-ink-muted dark:text-ink-darkMuted cursor-pointer shadow-xs"
            title={t.themeToggle}
            aria-label={t.themeToggle}
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-ink-muted" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Responsive Suite Horizontal Scroll Strip */}
      <div className="md:hidden border-t border-parchment-200 dark:border-parchment-800 bg-parchment-50/95 dark:bg-parchment-900/95 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {suiteTabs.map((tab) => {
          const isActive = currentSuiteTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playTick();
                onSelectSuiteTab(tab.id);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                  : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark bg-parchment-200/50 dark:bg-parchment-850/50'
              }`}
            >
              <span
                className={
                  isActive
                    ? tab.id === 'security'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : tab.id === 'route'
                        ? 'text-cyan-600 dark:text-cyan-400'
                        : tab.id === 'query'
                          ? 'text-purple-600 dark:text-purple-400'
                          : tab.id === 'actuate'
                            ? 'text-amber-600 dark:text-amber-400'
                            : tab.id === 'silicon'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                    : 'text-ink-muted'
                }
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[9px] px-1 py-0.2 rounded-full bg-parchment-200 dark:bg-parchment-700 font-semibold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
