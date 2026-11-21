import React, { useState, useMemo } from 'react';
import { Shield, X, Clock, Layers, Search } from 'lucide-react';
import { Lesson, TrackId } from '../types';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface Props {
  lessons: Lesson[];
  activeLessonId: string;
  onSelectLesson: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

interface SidebarTrackConfig {
  id: TrackId;
  labelKey: 'trackAuth' | 'trackExploits' | 'trackArch' | 'trackCrypto';
}

const SIDEBAR_TRACK_CONFIG: readonly SidebarTrackConfig[] = [
  { id: 'auth', labelKey: 'trackAuth' },
  { id: 'exploits', labelKey: 'trackExploits' },
  { id: 'architecture', labelKey: 'trackArch' },
  { id: 'crypto', labelKey: 'trackCrypto' },
] as const;

export const LessonSidebar: React.FC<Props> = ({
  lessons,
  activeLessonId,
  onSelectLesson,
  isOpen,
  onClose,
  lang,
}) => {
  const [filterText, setFilterText] = useState('');
  const t = TRANSLATIONS[lang];

  const tracks = useMemo(
    () => SIDEBAR_TRACK_CONFIG.map((tDef) => ({ id: tDef.id, title: t[tDef.labelKey] })),
    [t]
  );

  const filteredLessons = useMemo(() => {
    if (!filterText.trim()) return lessons;
    return lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(filterText.toLowerCase()) ||
        l.subtitle.toLowerCase().includes(filterText.toLowerCase()) ||
        l.keyConcepts.some((c) => c.toLowerCase().includes(filterText.toLowerCase()))
    );
  }, [lessons, filterText]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for outside-click dismissal on mobile & desktop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 left-0 z-50 w-72 sm:w-88 max-w-[85vw] bg-parchment-100 dark:bg-parchment-950 border-r border-parchment-200 dark:border-parchment-800 shadow-2xl flex flex-col transition-transform duration-300 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-parchment-200 dark:border-parchment-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-serif font-bold text-base text-ink-light dark:text-ink-dark block leading-none">
                {t.courseIndex}
              </span>
              <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-0.5 block">
                {t.modulesCount}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-parchment-200 dark:hover:bg-parchment-800 text-ink-muted transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search Field */}
        <div className="p-3 border-b border-parchment-200 dark:border-parchment-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink-muted" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-base sm:text-xs font-mono rounded-lg bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Curriculum Grouped by Tracks */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {tracks.map((track) => {
            const trackLessons = filteredLessons.filter((l) => l.track === track.id);
            if (trackLessons.length === 0) return null;

            return (
              <div key={track.id} className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400 font-bold px-2 flex items-center justify-between">
                  <span>{track.title}</span>
                  <span className="text-[10px] opacity-70">({trackLessons.length})</span>
                </div>

                <div className="space-y-1">
                  {trackLessons.map((lesson) => {
                    const isActive = lesson.id === activeLessonId;
                    const levelText =
                      lesson.level === 'Beginner'
                        ? t.levelBeginner
                        : lesson.level === 'Intermediate'
                          ? t.levelIntermediate
                          : t.levelAdvanced;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          onSelectLesson(lesson.id);
                          onClose();
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 border cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-parchment-900 border-blue-500/40 shadow-xs'
                            : 'border-transparent hover:bg-parchment-200/50 dark:hover:bg-parchment-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-serif font-bold truncate ${
                              isActive
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-ink-light dark:text-ink-dark'
                            }`}
                          >
                            {lesson.title}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded flex-shrink-0 ${
                              lesson.level === 'Beginner'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : lesson.level === 'Intermediate'
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                  : 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                            }`}
                          >
                            {levelText}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {lesson.duration}
                          </span>
                          <span>•</span>
                          <span>{lesson.steps.length} steps</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-parchment-200 dark:border-parchment-800 text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" /> {lessons.length} {t.modulesCount}
          </span>
          <span>Free & Open Source</span>
        </div>
      </div>
    </>
  );
};
