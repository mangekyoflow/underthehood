import React, { useState, useMemo } from 'react';
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
  Volume2,
  VolumeX,
  Bot,
  Microchip,
  Download,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { NavigationTab } from '../types';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { toggleSound, isSoundEnabled, playTick } from '../lib/sound';
import { usePWA } from '../lib/pwa';

interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
}

const LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

interface SuiteTabConfig {
  id: NavigationTab;
  labelKey: 'tabSecurity' | 'tabRoute' | 'tabQuery' | 'tabActuate' | 'tabSilicon';
  icon: typeof ShieldCheck;
  badge?: string;
}

const SUITE_TABS_CONFIG: readonly SuiteTabConfig[] = [
  { id: 'security', labelKey: 'tabSecurity', icon: ShieldCheck, badge: '23' },
  { id: 'route', labelKey: 'tabRoute', icon: Route, badge: '4' },
  { id: 'query', labelKey: 'tabQuery', icon: Database, badge: '3' },
  { id: 'actuate', labelKey: 'tabActuate', icon: Bot, badge: '5' },
  { id: 'silicon', labelKey: 'tabSilicon', icon: Microchip, badge: '4' },
] as const;

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
  const { isInstallable, isInstalled, isOffline, hasUpdate, installApp, updateApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const t = TRANSLATIONS[lang];

  const handleInstallClick = async () => {
    if (isInstalling) return;
    setIsInstalling(true);
    playTick();
    try {
      await installApp();
    } finally {
      setIsInstalling(false);
    }
  };

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) playTick();
  };

  const suiteTabs = useMemo(
    () =>
      SUITE_TABS_CONFIG.map((tab) => ({
        id: tab.id,
        label: t[tab.labelKey],
        icon: <tab.icon className="w-3.5 h-3.5" />,
        badge: tab.badge,
      })),
    [t]
  );

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-parchment-100/95 dark:bg-parchment-950/95 border-b border-parchment-200 dark:border-parchment-800 transition-colors shadow-xs pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Brand & Curriculum Trigger */}
        <div className="flex items-center gap-1 sm:gap-2.5 flex-shrink-0">
          {/* Platform Brand */}
          <button
            onClick={() => {
              playTick();
              onResetHome?.();
            }}
            className="flex items-center gap-1 sm:gap-2.5 text-left group cursor-pointer focus:outline-none min-h-[38px]"
            title="underthehood — Interactive Systems & Security Engineering"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-serif font-bold text-sm sm:text-base lg:text-lg tracking-tight text-ink-light dark:text-ink-dark group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors whitespace-nowrap">
              underthehood
            </span>
          </button>

          {/* Course Index Drawer Toggle Button (Accessible across all tracks) */}
          <button
            onClick={onToggleCurriculum}
            className={`px-2 sm:px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1 sm:gap-1.5 text-xs font-mono font-medium cursor-pointer min-h-[36px] sm:min-h-[38px] ${
              isCurriculumOpen
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'border-parchment-300 dark:border-parchment-700 bg-white/70 dark:bg-parchment-900/70 hover:bg-parchment-200 dark:hover:bg-parchment-800 text-ink-light dark:text-ink-dark shadow-xs'
            }`}
            title="Toggle Course Index (All 39 Modules)"
            aria-label="Toggle Course Index"
          >
            {isCurriculumOpen ? (
              <X className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden sm:inline">{isCurriculumOpen ? t.close : t.courseIndex}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-parchment-200 dark:bg-parchment-800 text-[10px] text-ink-muted dark:text-ink-darkMuted font-mono">
              39
            </span>
          </button>
        </div>

        {/* Center: Sleek, Adaptive Suite Navigation Tabs (Desktop & Tablet) */}
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
                className={`px-2 lg:px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 lg:gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[34px] ${
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

        {/* Right: Sound, Search, Language, Theme, PWA */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Offline Status Badge */}
          {isOffline && (
            <div
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-mono min-h-[36px]"
              title="You are currently offline. Under The Hood works offline with cached content."
              role="status"
            >
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden xl:inline">{t.offlineMode}</span>
            </div>
          )}

          {/* Progressive Web App Install Button (Visible when installation is supported) */}
          {isInstallable && !isInstalled && (
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              aria-disabled={isInstalling}
              className="p-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer shadow-xs min-h-[36px] min-w-[36px] flex items-center justify-center"
              title={t.installApp}
              aria-label={t.installApp}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            </button>
          )}

          {/* Search Trigger Button */}
          <button
            onClick={() => {
              playTick();
              onOpenSearch();
            }}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white/70 dark:bg-parchment-900/70 hover:bg-white dark:hover:bg-parchment-900 text-xs font-mono text-ink-muted dark:text-ink-darkMuted transition-all shadow-xs hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer min-h-[36px] sm:min-h-[38px]"
            title="Search curriculum across Security, Route & Query (⌘K)"
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
            className="p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white/70 dark:bg-parchment-900/70 hover:bg-parchment-200 dark:hover:bg-parchment-800 transition-colors text-ink-muted dark:text-ink-darkMuted cursor-pointer shadow-xs min-h-[36px] min-w-[36px] flex items-center justify-center"
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
              className="pl-6 sm:pl-7 pr-5 sm:pr-6 py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 hover:bg-parchment-50 dark:hover:bg-parchment-800 text-xs font-mono text-ink-light dark:text-ink-dark appearance-none cursor-pointer focus:outline-none focus:border-blue-500 transition-colors shadow-xs min-h-[36px]"
              title="Select Language / Idioma / 言語"
              aria-label="Select Language"
            >
              {LANGUAGES.map((l) => (
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
            className="p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white/70 dark:bg-parchment-900/70 hover:bg-parchment-200 dark:hover:bg-parchment-800 transition-colors text-ink-muted dark:text-ink-darkMuted cursor-pointer shadow-xs min-h-[36px] min-w-[36px] flex items-center justify-center"
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

      {/* Service Worker Update Toast Notification */}
      {hasUpdate && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-parchment-900 border border-emerald-500/60 shadow-2xl animate-fade-in text-xs font-mono"
        >
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-ink-light dark:text-ink-dark font-medium">{t.updateAvailable}</span>
          <button
            onClick={() => {
              playTick();
              updateApp();
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-colors"
          >
            {t.reload}
          </button>
        </div>
      )}
    </header>
  );
};
