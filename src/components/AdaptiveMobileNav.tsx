import React from 'react';
import { ShieldCheck, Route, Database, Bot, Microchip, Search, BookOpen } from 'lucide-react';
import { NavigationTab } from '../types';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { playTick } from '../lib/sound';
import clsx from 'clsx';

interface Props {
  currentSuiteTab: NavigationTab;
  onSelectSuiteTab: (tab: NavigationTab) => void;
  onOpenSearch: () => void;
  onToggleCurriculum?: () => void;
  isCurriculumOpen?: boolean;
  lang: Language;
}

interface NavItemConfig {
  id: NavigationTab;
  labelKey: 'tabSecurity' | 'tabRoute' | 'tabQuery' | 'tabActuate' | 'tabSilicon';
  shortLabel: string;
  icon: typeof ShieldCheck;
  count: string;
  activeColor: string;
  badgeBg: string;
}

const NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: 'security',
    labelKey: 'tabSecurity',
    shortLabel: 'Security',
    icon: ShieldCheck,
    count: '23',
    activeColor: 'text-emerald-700 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'route',
    labelKey: 'tabRoute',
    shortLabel: 'Route',
    icon: Route,
    count: '4',
    activeColor: 'text-cyan-700 dark:text-cyan-400',
    badgeBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  },
  {
    id: 'query',
    labelKey: 'tabQuery',
    shortLabel: 'Query',
    icon: Database,
    count: '3',
    activeColor: 'text-purple-700 dark:text-purple-400',
    badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  },
  {
    id: 'actuate',
    labelKey: 'tabActuate',
    shortLabel: 'Actuate',
    icon: Bot,
    count: '5',
    activeColor: 'text-amber-700 dark:text-amber-400',
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  {
    id: 'silicon',
    labelKey: 'tabSilicon',
    shortLabel: 'Silicon',
    icon: Microchip,
    count: '4',
    activeColor: 'text-emerald-700 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
] as const;

export const AdaptiveMobileNav: React.FC<Props> = ({
  currentSuiteTab,
  onSelectSuiteTab,
  onOpenSearch,
  onToggleCurriculum,
  isCurriculumOpen,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <nav
      aria-label="Mobile Navigation"
      role="navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg bg-white/95 dark:bg-parchment-950/95 border-t border-parchment-200/90 dark:border-parchment-800/90 shadow-lg pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] transition-colors"
    >
      {/* Quick Utility Strip when in Security mode or on demand */}
      <div className="flex items-center justify-around px-1 pt-1.5 pb-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = currentSuiteTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                playTick();
                onSelectSuiteTab(item.id);
              }}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative cursor-pointer min-h-[46px] select-none',
                isActive
                  ? 'bg-parchment-200/50 dark:bg-parchment-900/70 font-semibold'
                  : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
              )}
              aria-current={isActive ? 'page' : undefined}
              title={`${t[item.labelKey]} (${item.count} modules)`}
            >
              {/* Icon with Counter Badge */}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={clsx(
                    'w-4 h-4 transition-transform',
                    isActive ? `${item.activeColor} scale-110` : 'text-ink-muted'
                  )}
                />
                <span
                  className={clsx(
                    'absolute -top-1.5 -right-3 text-[9px] font-mono px-1 rounded-full leading-none font-bold',
                    isActive
                      ? item.badgeBg
                      : 'bg-parchment-200 dark:bg-parchment-800 text-ink-muted'
                  )}
                >
                  {item.count}
                </span>
              </div>

              {/* Label */}
              <span
                className={clsx(
                  'text-[10px] font-mono tracking-tight mt-1 leading-none',
                  isActive
                    ? `${item.activeColor} font-bold`
                    : 'text-ink-muted dark:text-ink-darkMuted'
                )}
              >
                {item.shortLabel}
              </span>

              {/* Active Indicator Underline */}
              {isActive && <span className="w-4 h-0.5 rounded-full bg-current mt-0.5 opacity-80" />}
            </button>
          );
        })}

        {/* Quick Search Trigger */}
        <button
          onClick={() => {
            playTick();
            onOpenSearch();
          }}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-ink-muted hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer min-h-[46px] select-none"
          title={t.searchButton}
          aria-label={t.searchButton}
        >
          <div className="relative flex items-center justify-center">
            <Search className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono tracking-tight mt-1 leading-none">
            {t.searchButton}
          </span>
        </button>

        {/* Course Index Trigger (Accessible across all suites) */}
        {onToggleCurriculum && (
          <button
            onClick={() => {
              playTick();
              onToggleCurriculum();
            }}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] select-none',
              isCurriculumOpen
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10'
                : 'text-ink-muted hover:text-emerald-600 dark:hover:text-emerald-400'
            )}
            title={t.courseIndex}
            aria-label={t.courseIndex}
          >
            <div className="relative flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono tracking-tight mt-1 leading-none">
              {t.courseIndex}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
