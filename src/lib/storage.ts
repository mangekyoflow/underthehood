import { UserProgress, ModuleId } from '../types';

const STORAGE_KEY = 'designed_to_route_and_query_progress_v1';

const VALID_MODULE_IDS: readonly ModuleId[] = [
  'url-lifecycle',
  'tcp-congestion',
  'http-race',
  'napkin-math',
  'lsm-tree',
  'bplus-tree',
  'acid-isolation',
  'pid-control-loop',
  'ros2-teleoperation',
  'inverse-kinematics',
  'foc-motor-control',
  'uvm-verification',
  'pre-silicon-emulation',
  'riscv-pipeline',
] as const;

function isModuleId(id: unknown): id is ModuleId {
  return typeof id === 'string' && (VALID_MODULE_IDS as readonly string[]).includes(id);
}

const defaultProgress: UserProgress = {
  visitedModules: {
    'url-lifecycle': false,
    'tcp-congestion': false,
    'http-race': false,
    'napkin-math': false,
    'lsm-tree': false,
    'bplus-tree': false,
    'acid-isolation': false,
    'pid-control-loop': false,
    'ros2-teleoperation': false,
    'inverse-kinematics': false,
    'foc-motor-control': false,
    'uvm-verification': false,
    'pre-silicon-emulation': false,
    'riscv-pipeline': false,
  },
  completedChallenges: {},
  completedExperiments: {},
  lastVisitedModule: null,
};

export function loadUserProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return defaultProgress;
    }

    // Safely reconstruct visitedModules preventing prototype tampering
    const visitedModules: Record<ModuleId, boolean> = { ...defaultProgress.visitedModules };
    if (
      parsed.visitedModules &&
      typeof parsed.visitedModules === 'object' &&
      !Array.isArray(parsed.visitedModules)
    ) {
      for (const id of VALID_MODULE_IDS) {
        if (typeof parsed.visitedModules[id] === 'boolean') {
          visitedModules[id] = parsed.visitedModules[id];
        }
      }
    }

    // Safely reconstruct completedChallenges preventing prototype tampering
    const completedChallenges: Record<string, boolean> = {};
    if (
      parsed.completedChallenges &&
      typeof parsed.completedChallenges === 'object' &&
      !Array.isArray(parsed.completedChallenges)
    ) {
      for (const [key, val] of Object.entries(parsed.completedChallenges)) {
        if (
          key !== '__proto__' &&
          key !== 'constructor' &&
          key !== 'prototype' &&
          typeof val === 'boolean'
        ) {
          completedChallenges[key] = val;
        }
      }
    }

    // Safely reconstruct completedExperiments preventing prototype tampering
    const completedExperiments: Record<string, boolean> = {};
    if (
      parsed.completedExperiments &&
      typeof parsed.completedExperiments === 'object' &&
      !Array.isArray(parsed.completedExperiments)
    ) {
      for (const [key, val] of Object.entries(parsed.completedExperiments)) {
        if (
          key !== '__proto__' &&
          key !== 'constructor' &&
          key !== 'prototype' &&
          typeof val === 'boolean'
        ) {
          completedExperiments[key] = val;
        }
      }
    }

    // Validate lastVisitedModule
    const lastVisitedModule = isModuleId(parsed.lastVisitedModule)
      ? parsed.lastVisitedModule
      : null;

    return {
      visitedModules,
      completedChallenges,
      completedExperiments,
      lastVisitedModule,
    };
  } catch {
    return defaultProgress;
  }
}

export function saveUserProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress to localStorage', e);
  }
}

export function markModuleVisited(moduleId: ModuleId): UserProgress {
  const current = loadUserProgress();
  const updated: UserProgress = {
    ...current,
    visitedModules: {
      ...current.visitedModules,
      [moduleId]: true,
    },
    lastVisitedModule: moduleId,
  };
  saveUserProgress(updated);
  return updated;
}

export function markChallengeCompleted(challengeId: string): UserProgress {
  const current = loadUserProgress();
  const updated: UserProgress = {
    ...current,
    completedChallenges: {
      ...current.completedChallenges,
      [challengeId]: true,
    },
  };
  saveUserProgress(updated);
  return updated;
}
