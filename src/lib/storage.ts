import { UserProgress, ModuleId } from '../types';

const STORAGE_KEY = 'designed_to_route_and_query_progress_v1';

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
    'uvm-verification': false,
    'pre-silicon-emulation': false,
  },
  completedChallenges: {},
  completedExperiments: {},
  lastVisitedModule: null,
};

export function loadUserProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;
    return { ...defaultProgress, ...JSON.parse(raw) };
  } catch (e) {
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
