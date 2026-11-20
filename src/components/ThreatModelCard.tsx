import React from 'react';
import { Skull, Target, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Lesson } from '../types';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface Props {
  threatModel: Lesson['threatModel'];
  lang?: Language;
}

export const ThreatModelCard: React.FC<Props> = ({ threatModel, lang = 'en' }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="w-full rounded-2xl bg-white/80 dark:bg-parchment-900/80 border border-parchment-200 dark:border-parchment-800 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-parchment-200 dark:border-parchment-800">
        <h4 className="text-sm font-mono uppercase tracking-wider font-bold text-ink-light dark:text-ink-dark flex items-center gap-2">
          <span>{t.threatModelTitle}</span>
        </h4>
        <span className="text-[10px] font-mono text-parchment-400">STRIDE Alignment</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        {/* Actor */}
        <div className="p-3 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
          <div className="text-amber-600 dark:text-amber-400 font-bold mb-1 flex items-center gap-1.5">
            <Skull className="w-3.5 h-3.5" /> {t.threatActor}
          </div>
          <p className="text-ink-muted dark:text-ink-darkMuted text-[11px] font-sans leading-relaxed">
            {threatModel.actor}
          </p>
        </div>

        {/* Goal */}
        <div className="p-3 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
          <div className="text-red-600 dark:text-red-400 font-bold mb-1 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> {t.threatGoal}
          </div>
          <p className="text-ink-muted dark:text-ink-darkMuted text-[11px] font-sans leading-relaxed">
            {threatModel.goal}
          </p>
        </div>

        {/* Vulnerability */}
        <div className="p-3 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
          <div className="text-purple-600 dark:text-purple-400 font-bold mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {t.threatVuln}
          </div>
          <p className="text-ink-muted dark:text-ink-darkMuted text-[11px] font-sans leading-relaxed">
            {threatModel.vulnerability}
          </p>
        </div>

        {/* Defense */}
        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
          <div className="text-emerald-700 dark:text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> {t.threatDefense}
          </div>
          <p className="text-emerald-800 dark:text-emerald-300 text-[11px] font-sans leading-relaxed">
            {threatModel.defense}
          </p>
        </div>
      </div>
    </div>
  );
};
