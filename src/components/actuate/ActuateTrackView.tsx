import React, { useState, useEffect } from 'react';
import { ActuateModuleId, UserProgress } from '../../types';
import { PidControlVisualizer } from '../visualizers/PidControlVisualizer';
import { RosTeleopVisualizer } from '../visualizers/RosTeleopVisualizer';
import { InverseKinematicsVisualizer } from '../visualizers/InverseKinematicsVisualizer';
import { FocMotorVisualizer } from '../visualizers/FocMotorVisualizer';
import { ActuatorStructureViewer } from './ActuatorStructureViewer';
import { RoboticsTutorialCard } from './RoboticsTutorialCard';
import { RoboticsMetricsHud } from './RoboticsMetricsHud';
import {
  ROBOTICS_TUTORIAL_DATA,
  MODULE_METRICS_CONFIG,
  RoboticsTutorialStep,
} from '../../data/roboticsTutorialData';
import { Badge } from '../common/Badge';
import { playTick } from '../../lib/sound';
import { Cog, GraduationCap, Wrench, BookOpen } from 'lucide-react';
import clsx from 'clsx';

interface ActuateTrackViewProps {
  initialModuleId?: ActuateModuleId | 'actuator-structure';
  initialStep?: number;
  onStepChange?: (step: number) => void;
  progress: UserProgress;
  onChallengeComplete: (id: string) => void;
  onSelectModule?: (id: ActuateModuleId | 'actuator-structure') => void;
  onToggleCurriculum?: () => void;
}

const ACTUATE_MODULES = [
  {
    id: 'pid-control-loop' as ActuateModuleId,
    num: '07',
    title: 'Closed-Loop PID Control',
    shortTitle: 'PID Control',
    desc: 'Feedback gains, step response & disturbance rejection',
  },
  {
    id: 'ros2-teleoperation' as ActuateModuleId,
    num: '08',
    title: 'ROS 2 & Zenoh Teleoperation',
    shortTitle: 'ROS 2 Teleop',
    desc: 'Pub/sub determinism, QoS profiles & bufferbloat',
  },
  {
    id: 'inverse-kinematics' as ActuateModuleId,
    num: '09',
    title: 'Inverse Kinematics & Jacobians',
    shortTitle: 'Inverse Kinematics',
    desc: 'Manipulability ellipsoids, singularities & DLS',
  },
  {
    id: 'foc-motor-control' as ActuateModuleId,
    num: '10',
    title: 'Field-Oriented Control (FOC)',
    shortTitle: 'FOC Motor Control',
    desc: 'Vector commutation, Clarke/Park transforms & SVPWM',
  },
] as const;

export const ActuateTrackView: React.FC<ActuateTrackViewProps> = ({
  initialModuleId = 'pid-control-loop',
  initialStep = 0,
  onStepChange,
  progress,
  onChallengeComplete,
  onSelectModule,
  onToggleCurriculum,
}) => {
  const [activeView, setActiveView] = useState<ActuateModuleId | 'actuator-structure'>(
    initialModuleId
  );
  const [viewMode, setViewMode] = useState<'tutorial' | 'sandbox'>('tutorial');
  const [stepIndices, setStepIndices] = useState<Record<string, number>>({
    'pid-control-loop': initialStep,
    'ros2-teleoperation': 0,
    'inverse-kinematics': 0,
    'foc-motor-control': 0,
    'actuator-structure': 0,
  });
  const [tutorialAction, setTutorialAction] = useState<{
    actionType: string;
    params: any;
    timestamp: number;
  } | null>(null);
  const [lastAppliedActionStep, setLastAppliedActionStep] = useState<number | null>(null);

  // Sync initialModuleId from parent (e.g. hash routing)
  useEffect(() => {
    if (initialModuleId && initialModuleId !== activeView) {
      setActiveView(initialModuleId);
    }
  }, [initialModuleId, activeView]);

  // Sync initialStep from parent (e.g. hash routing #/actuate/<module>/<step>)
  useEffect(() => {
    if (typeof initialStep === 'number' && initialStep >= 0) {
      setStepIndices((prev) => {
        if (prev[activeView] !== initialStep) {
          return { ...prev, [activeView]: initialStep };
        }
        return prev;
      });
    }
  }, [initialStep, activeView]);

  const currentTutorialSteps = ROBOTICS_TUTORIAL_DATA[activeView] || [];
  const currentStepIndex = stepIndices[activeView] || 0;
  const currentStep = currentTutorialSteps[currentStepIndex] || currentTutorialSteps[0];
  const currentMetricConfigs = MODULE_METRICS_CONFIG[activeView] || [];

  // Automatically configure the simulation canvas whenever step changes in tutorial mode
  useEffect(() => {
    if (viewMode === 'tutorial' && currentStep) {
      setTutorialAction({
        actionType: currentStep.interactiveAction.actionType,
        params: currentStep.interactiveAction.params,
        timestamp: Date.now(),
      });
      setLastAppliedActionStep(currentStepIndex);
    }
  }, [activeView, currentStepIndex, viewMode, currentStep]);

  const handleSelectStep = (idx: number) => {
    setStepIndices((prev) => ({ ...prev, [activeView]: idx }));
    onStepChange?.(idx);
    setLastAppliedActionStep(null);
  };

  const handleApplyTutorialAction = (step: RoboticsTutorialStep) => {
    setLastAppliedActionStep(step.step - 1);
    setTutorialAction({
      actionType: step.interactiveAction.actionType,
      params: step.interactiveAction.params,
      timestamp: Date.now(),
    });
  };

  const handleSelectModule = (id: ActuateModuleId) => {
    playTick();
    setActiveView(id);
    onSelectModule?.(id);
    const modStep = stepIndices[id] || 0;
    onStepChange?.(modStep);
    setLastAppliedActionStep(null);
  };

  const handleSelectStructure = () => {
    playTick();
    setActiveView('actuator-structure');
    onSelectModule?.('actuator-structure');
    const modStep = stepIndices['actuator-structure'] || 0;
    onStepChange?.(modStep);
    setLastAppliedActionStep(null);
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
            Designed to Actuate: Interactive Robotics Tutorial
          </h1>
          <p className="text-sm sm:text-base font-serif italic text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl leading-relaxed">
            Master real-time humanoid dynamics, closed-loop feedback gains, differential kinematics,
            SVPWM vector motor commutation, and loss-tolerant pub/sub teleoperation.
          </p>
        </div>

        {/* Right side controls: Course Index + View Mode Toggle */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          {onToggleCurriculum && (
            <button
              onClick={() => {
                playTick();
                onToggleCurriculum();
              }}
              className="px-3 sm:px-3.5 py-1.5 min-h-[38px] rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
              title="Open Course Index (All 39 Modules)"
              aria-label="Open Course Index"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Course Index</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono">
                39
              </span>
            </button>
          )}

          {/* View Mode Toggle (Tutorial vs Free Sandbox) */}
          <div className="flex items-center p-1 rounded-2xl bg-parchment-200/60 dark:bg-parchment-900/60 border border-parchment-300 dark:border-parchment-800 text-xs font-mono shrink-0">
            <button
              onClick={() => {
                playTick();
                setViewMode('tutorial');
              }}
              className={clsx(
                'px-3 sm:px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer',
                viewMode === 'tutorial'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Guided Tutorial</span>
            </button>
            <button
              onClick={() => {
                playTick();
                setViewMode('sandbox');
              }}
              className={clsx(
                'px-3 sm:px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer',
                viewMode === 'sandbox'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <Wrench className="w-4 h-4" />
              <span>Free Sandbox</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submodule Segmented Pills */}
      <div className="flex items-center overflow-x-auto touch-scroll no-scrollbar pb-1">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-parchment-200/50 dark:bg-parchment-900/50 border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono min-w-max shrink-0">
          {ACTUATE_MODULES.map((m) => {
            const isActive = activeView === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectModule(m.id)}
                className={clsx(
                  'px-3 sm:px-3.5 py-1.5 min-h-[38px] rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
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
                <span className="hidden md:inline">{m.title}</span>
                <span className="md:hidden">{m.shortTitle}</span>
              </button>
            );
          })}

          {/* Actuator & Robot Anatomy Tab */}
          <button
            onClick={handleSelectStructure}
            className={clsx(
              'px-3 sm:px-3.5 py-1.5 min-h-[38px] rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
              activeView === 'actuator-structure'
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold shadow-sm border border-amber-500/40'
                : 'text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200/60 dark:hover:bg-parchment-800/60'
            )}
          >
            <span
              className={
                activeView === 'actuator-structure'
                  ? 'text-amber-700 dark:text-amber-400 font-bold'
                  : 'text-ink-muted'
              }
            >
              10b
            </span>
            <Cog className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Actuator Anatomy &amp; Gearing</span>
            <span className="sm:hidden">Actuator Anatomy</span>
          </button>
        </div>
      </div>

      {/* 4 DYNAMIC METRICS HUD GAUGES (Displayed above the Canvas like Designed to Scale) */}
      {viewMode === 'tutorial' && currentStep && currentStep.metrics && (
        <RoboticsMetricsHud
          metrics={currentStep.metrics}
          metricConfigs={currentMetricConfigs}
          stepNumber={currentStep.step}
        />
      )}

      {/* Active Module Visualizer Canvas */}
      <div className="min-w-0">
        {activeView === 'pid-control-loop' && (
          <PidControlVisualizer
            onChallengeComplete={onChallengeComplete}
            completedChallenges={progress.completedChallenges}
            tutorialAction={tutorialAction}
          />
        )}
        {activeView === 'ros2-teleoperation' && (
          <RosTeleopVisualizer
            onChallengeComplete={onChallengeComplete}
            completedChallenges={progress.completedChallenges}
            tutorialAction={tutorialAction}
          />
        )}
        {activeView === 'inverse-kinematics' && (
          <InverseKinematicsVisualizer
            onChallengeComplete={onChallengeComplete}
            completedChallenges={progress.completedChallenges}
            tutorialAction={tutorialAction}
          />
        )}
        {activeView === 'foc-motor-control' && (
          <FocMotorVisualizer
            onChallengeComplete={onChallengeComplete}
            completedChallenges={progress.completedChallenges}
            tutorialAction={tutorialAction}
          />
        )}
        {activeView === 'actuator-structure' && (
          <ActuatorStructureViewer tutorialAction={tutorialAction} />
        )}
      </div>

      {/* Guided Robotics Tutorial Card (Step Scrubber + Narrative + Changes + Callout + Action) */}
      {viewMode === 'tutorial' && currentTutorialSteps.length > 0 && (
        <RoboticsTutorialCard
          steps={currentTutorialSteps}
          currentStepIndex={currentStepIndex}
          onSelectStep={handleSelectStep}
          onApplyAction={handleApplyTutorialAction}
          lastAppliedActionStep={lastAppliedActionStep}
        />
      )}
    </div>
  );
};
