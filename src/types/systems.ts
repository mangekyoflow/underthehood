export type SystemsTrackId = 'route' | 'query' | 'actuate' | 'silicon';

export type RouteModuleId = 'url-lifecycle' | 'tcp-congestion' | 'http-race' | 'napkin-math';
export type QueryModuleId = 'lsm-tree' | 'bplus-tree' | 'acid-isolation';
export type ActuateModuleId = 'pid-control-loop' | 'ros2-teleoperation' | 'inverse-kinematics';
export type SiliconModuleId = 'uvm-verification' | 'pre-silicon-emulation';

export type ModuleId = RouteModuleId | QueryModuleId | ActuateModuleId | SiliconModuleId;

export type NavigationTab = 'security' | 'home' | 'route' | 'query' | 'actuate' | 'silicon';

export interface Challenge {
  id: string;
  moduleId: ModuleId;
  title: string;
  description: string;
  hint: string;
  targetCriteria: string;
  completed: boolean;
}

export interface UserProgress {
  visitedModules: Record<ModuleId, boolean>;
  completedChallenges: Record<string, boolean>;
  completedExperiments: Record<string, boolean>;
  lastVisitedModule: ModuleId | null;
}
