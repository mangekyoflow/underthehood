import React, { useState, useEffect } from 'react';
import { ActuateModuleId, UserProgress } from '../../types';
import { PidControlVisualizer } from '../visualizers/PidControlVisualizer';
import { RosTeleopVisualizer } from '../visualizers/RosTeleopVisualizer';
import { InverseKinematicsVisualizer } from '../visualizers/InverseKinematicsVisualizer';
import { ActuatorStructureViewer } from './ActuatorStructureViewer';
import { Badge } from '../common/Badge';
import { playTick } from '../../lib/sound';
import { Cog, Sliders, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface ActuateTrackViewProps {
  initialModuleId?: ActuateModuleId | 'actuator-structure';
  progress: UserProgress;
  onChallengeComplete: (id: string) => void;
  onSelectModule?: (id: ActuateModuleId | 'actuator-structure') => void;
}

export const ActuateTrackView: React.FC<ActuateTrackViewProps> = ({
  initialModuleId = 'pid-control-loop',
  progress,
  onChallengeComplete,
  onSelectModule,
}) => {
  const [activeView, setActiveView] = useState<ActuateModuleId | 'actuator-structure'>(
    initialModuleId
  );

  useEffect(() => {
    if (initialModuleId && initialModuleId !== activeView) {
      setActiveView(initialModuleId);
    }
  }, [initialModuleId]);

  const modules = [
    {
      id: 'pid-control-loop' as ActuateModuleId,
      num: '07',
      title: 'Closed-Loop PID Control',
      desc: 'Feedback gains, step response & disturbance rejection',
    },
    {
      id: 'ros2-teleoperation' as ActuateModuleId,
      num: '08',
      title: 'ROS 2 & Zenoh Teleoperation',
      desc: 'Pub/sub determinism, QoS profiles & bufferbloat',
    },
    {
      id: 'inverse-kinematics' as ActuateModuleId,
      num: '09',
      title: 'Inverse Kinematics & Jacobians',
      desc: 'Manipulability ellipsoids, singularities & DLS',
    },
  ];

  const handleSelectModule = (id: ActuateModuleId) => {
    playTick();
    setActiveView(id);
    onSelectModule?.(id);
  };

  const handleSelectStructure = () => {
    playTick();
    setActiveView('actuator-structure');
    onSelectModule?.('actuator-structure');
  };

  return (
    <div className="space-y-6 py-2">
      {/* Track 03 Intro Banner */}
      <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="amber">TRACK 03 ACTUATE</Badge>
            <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-semibold tracking-wider uppercase">
              Robotics &amp; Physical AI
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight leading-tight">
            Designed to Actuate
          </h1>
          <p className="text-sm sm:text-base font-serif italic text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl leading-relaxed">
            Understand closed-loop dynamics, feedback gains, real-time actuator control, harmonic
            gearing anatomy, and distributed robotics pub/sub middleware under real-world wireless
            degradation.
          </p>
        </div>

        {/* Submodule Segmented Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-parchment-200/50 dark:bg-parchment-900/50 border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono overflow-x-auto no-scrollbar max-w-full shrink-0">
          {modules.map((m) => {
            const isActive = activeView === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectModule(m.id)}
                className={clsx(
                  'px-3 sm:px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-sm border border-parchment-300 dark:border-parchment-700'
                    : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
                )}
              >
                <span
                  className={
                    isActive ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-ink-muted'
                  }
                >
                  {m.num}
                </span>
                <span>
                  {m.title.split(' ')[0]} {m.title.split(' ')[1]}
                </span>
              </button>
            );
          })}

          {/* Actuator & Robot Anatomy Tab */}
          <button
            onClick={handleSelectStructure}
            className={clsx(
              'px-3 sm:px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
              activeView === 'actuator-structure'
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold shadow-sm border border-amber-500/40'
                : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
            )}
          >
            <Cog className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Actuator Anatomy &amp; Gearing</span>
          </button>
        </div>
      </div>

      {/* Active Module View */}
      {activeView === 'pid-control-loop' && (
        <PidControlVisualizer
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeView === 'ros2-teleoperation' && (
        <RosTeleopVisualizer
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeView === 'inverse-kinematics' && (
        <InverseKinematicsVisualizer
          onChallengeComplete={onChallengeComplete}
          completedChallenges={progress.completedChallenges}
        />
      )}
      {activeView === 'actuator-structure' && <ActuatorStructureViewer />}
    </div>
  );
};
