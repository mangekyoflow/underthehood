import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Compass, Sliders, AlertTriangle, ShieldCheck, Activity, Target, Info } from 'lucide-react';
import { playTick, playSuccess } from '../../lib/sound';
import { ChallengeCard } from '../common/ChallengeCard';
import { MODULES } from '../../data/modulesData';
import clsx from 'clsx';

interface InverseKinematicsVisualizerProps {
  onChallengeComplete?: (id: string) => void;
  completedChallenges?: Record<string, boolean>;
  tutorialAction?: { actionType: string; params: any; timestamp: number } | null;
}

export const InverseKinematicsVisualizer: React.FC<InverseKinematicsVisualizerProps> = ({
  onChallengeComplete,
  completedChallenges = {},
  tutorialAction,
}) => {
  // Kinematic parameters (link lengths in mm)
  const [L1] = useState<number>(120);
  const [L2] = useState<number>(100);
  const [L3] = useState<number>(60);
  const maxReach = L1 + L2 + L3; // 280 mm

  // End-Effector Target Coordinate (in canvas coordinates centered at base [0, 0])
  const [targetX, setTargetX] = useState<number>(180);
  const [targetY, setTargetY] = useState<number>(110);
  const targetAngleDeg = 15; // End-effector orientation

  // Joint Angles (in degrees)
  const [theta1, setTheta1] = useState<number>(35);
  const [theta2, setTheta2] = useState<number>(45);
  const [theta3, setTheta3] = useState<number>(-20);

  // Solver mode: 'dls' (Damped Least Squares) | 'pseudoinverse' | 'analytical'
  const [solverMode, setSolverMode] = useState<'dls' | 'pseudoinverse' | 'analytical'>('dls');
  const [dampingLambda, setDampingLambda] = useState<number>(0.2); // Levenberg-Marquardt damping factor
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [autoTracking, setAutoTracking] = useState<boolean>(false);

  // SVG Canvas Dimension & Center
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasWidth = 720;
  const canvasHeight = 440;
  const originX = 360;
  const originY = 320;

  // Convert angles to radians
  const r1 = (theta1 * Math.PI) / 180;
  const r2 = (theta2 * Math.PI) / 180;
  const r3 = (theta3 * Math.PI) / 180;

  // Forward Kinematics (FK) to compute Joint positions:
  // J0: Base (0, 0)
  // J1: (L1*cos(r1), L1*sin(r1))
  // J2: J1 + (L2*cos(r1+r2), L2*sin(r1+r2))
  // EE: J2 + (L3*cos(r1+r2+r3), L3*sin(r1+r2+r3))
  const j1X = L1 * Math.cos(r1);
  const j1Y = L1 * Math.sin(r1);

  const j2X = j1X + L2 * Math.cos(r1 + r2);
  const j2Y = j1Y + L2 * Math.sin(r1 + r2);

  const eeX = j2X + L3 * Math.cos(r1 + r2 + r3);
  const eeY = j2Y + L3 * Math.sin(r1 + r2 + r3);
  const eeAngleDeg = theta1 + theta2 + theta3;

  // Error vector
  const errorX = targetX - eeX;
  const errorY = targetY - eeY;
  const errorDist = Math.sqrt(errorX * errorX + errorY * errorY);

  // 2D Geometric Jacobian J (2x3) relating joint angular velocities to end-effector [vx, vy]:
  // dx/dt = J * dtheta/dt
  const s1 = Math.sin(r1);
  const c1 = Math.cos(r1);
  const s12 = Math.sin(r1 + r2);
  const c12 = Math.cos(r1 + r2);
  const s123 = Math.sin(r1 + r2 + r3);
  const c123 = Math.cos(r1 + r2 + r3);

  const J11 = -L1 * s1 - L2 * s12 - L3 * s123;
  const J12 = -L2 * s12 - L3 * s123;
  const J13 = -L3 * s123;

  const J21 = L1 * c1 + L2 * c12 + L3 * c123;
  const J22 = L2 * c12 + L3 * c123;
  const J23 = L3 * c123;

  // Compute JJ^T (2x2 matrix)
  const JJT_00 = J11 * J11 + J12 * J12 + J13 * J13;
  const JJT_01 = J11 * J21 + J12 * J22 + J13 * J23;
  const JJT_10 = JJT_01;
  const JJT_11 = J21 * J21 + J22 * J22 + J23 * J23;

  // Determinant of JJ^T: Yoshikawa Manipulability Measure w = sqrt(det(JJ^T))
  const detJJT = JJT_00 * JJT_11 - JJT_01 * JJT_10;
  const manipulability = Math.sqrt(Math.max(0, detJJT));

  // Condition number proxy & Singularity threshold
  const trace = JJT_00 + JJT_11;
  const lambda1 = (trace + Math.sqrt(Math.max(0, trace * trace - 4 * detJJT))) / 2;
  const lambda2 = (trace - Math.sqrt(Math.max(0, trace * trace - 4 * detJJT))) / 2;
  const conditionNumber = lambda2 > 1e-4 ? Math.sqrt(lambda1 / lambda2) : 999.9;
  const isSingular = manipulability < 450 || conditionNumber > 35;

  // Step IK Solver towards target coordinate
  const stepIk = useCallback(() => {
    if (errorDist < 0.5) return;

    if (solverMode === 'analytical') {
      // 2-Link Analytical Solver on (targetX - L3*cos, targetY - L3*sin)
      const wristX = targetX - L3 * Math.cos((targetAngleDeg * Math.PI) / 180);
      const wristY = targetY - L3 * Math.sin((targetAngleDeg * Math.PI) / 180);
      const rSq = wristX * wristX + wristY * wristY;
      const cosTheta2 = (rSq - L1 * L1 - L2 * L2) / (2 * L1 * L2);

      if (Math.abs(cosTheta2) <= 1.0) {
        const t2Rad = Math.acos(cosTheta2);
        const t1Rad =
          Math.atan2(wristY, wristX) - Math.atan2(L2 * Math.sin(t2Rad), L1 + L2 * Math.cos(t2Rad));
        const newT1 = (t1Rad * 180) / Math.PI;
        const newT2 = (t2Rad * 180) / Math.PI;
        const newT3 = targetAngleDeg - (newT1 + newT2);
        setTheta1(newT1);
        setTheta2(newT2);
        setTheta3(newT3);
      }
      return;
    }

    // Numerical Solvers: DLS vs Pseudoinverse
    // [JJ^T + lambda^2 * I]^-1 * e
    const lambdaSq = solverMode === 'dls' ? dampingLambda * dampingLambda * 2500 : 0.01;
    const a = JJT_00 + lambdaSq;
    const b = JJT_01;
    const c = JJT_10;
    const d = JJT_11 + lambdaSq;
    const detDamped = a * d - b * c;

    if (detDamped < 1e-6) return;

    // Inverse of 2x2
    const inv00 = d / detDamped;
    const inv01 = -b / detDamped;
    const inv10 = -c / detDamped;
    const inv11 = a / detDamped;

    // temp = inv * [errorX, errorY]
    const stepGain = 0.35;
    const ex = errorX * stepGain;
    const ey = errorY * stepGain;

    const tempX = inv00 * ex + inv01 * ey;
    const tempY = inv10 * ex + inv11 * ey;

    // deltaTheta = J^T * temp
    const dTheta1Rad = J11 * tempX + J21 * tempY;
    const dTheta2Rad = J12 * tempX + J22 * tempY;
    const dTheta3Rad = J13 * tempX + J23 * tempY;

    // Limit maximum step per tick (degrees)
    const maxDelta = 4.0;
    const d1Deg = Math.max(-maxDelta, Math.min(maxDelta, (dTheta1Rad * 180) / Math.PI));
    const d2Deg = Math.max(-maxDelta, Math.min(maxDelta, (dTheta2Rad * 180) / Math.PI));
    const d3Deg = Math.max(-maxDelta, Math.min(maxDelta, (dTheta3Rad * 180) / Math.PI));

    setTheta1((prev) => prev + d1Deg);
    setTheta2((prev) => prev + d2Deg);
    setTheta3((prev) => prev + d3Deg);
  }, [
    errorDist,
    solverMode,
    targetX,
    targetY,
    targetAngleDeg,
    L1,
    L2,
    L3,
    dampingLambda,
    JJT_00,
    JJT_01,
    JJT_10,
    JJT_11,
    errorX,
    errorY,
    J11,
    J12,
    J13,
    J21,
    J22,
    J23,
  ]);

  // Pause auto-tracking when user moves out of the browser tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setAutoTracking(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Apply Tutorial Action from Robotics Tutorial Deck
  useEffect(() => {
    if (!tutorialAction || tutorialAction.actionType !== 'ik') return;
    const p = tutorialAction.params;
    if (p.targetX !== undefined) setTargetX(p.targetX);
    if (p.targetY !== undefined) setTargetY(p.targetY);
    if (p.solver !== undefined) setSolverMode(p.solver);
    if (p.lambda !== undefined) setDampingLambda(p.lambda);
  }, [tutorialAction]);

  // Animation Loop for Auto Tracking or IK convergence - pauses when tab is hidden
  useEffect(() => {
    let animId: number;
    if (
      (errorDist > 0.8 || autoTracking) &&
      (typeof document === 'undefined' || !document.hidden)
    ) {
      animId = requestAnimationFrame(() => {
        stepIk();
      });
    }
    return () => cancelAnimationFrame(animId);
  }, [errorDist, autoTracking, stepIk]);

  // Challenge Checks
  useEffect(() => {
    if (errorDist < 2.0 && targetX >= 170 && targetY >= 100) {
      onChallengeComplete?.('challenge-ik-1');
    }
    if (solverMode === 'dls' && dampingLambda >= 0.15 && isSingular) {
      onChallengeComplete?.('challenge-ik-2');
    }
  }, [errorDist, targetX, targetY, solverMode, dampingLambda, isSingular, onChallengeComplete]);

  // Mouse Interaction on SVG Canvas to drag the End-Effector Target
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging && e.type !== 'pointerdown') return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert from SVG viewport pixels to arm coordinates centered at (originX, originY) with Y up
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;

    const armX = clientX * scaleX - originX;
    const armY = originY - clientY * scaleY;

    // Limit target within maximum physical reach
    const radius = Math.sqrt(armX * armX + armY * armY);
    const clampedRadius = Math.min(maxReach - 2, Math.max(30, radius));
    const factor = clampedRadius / (radius || 1);

    playTick();
    setTargetX(Math.round(armX * factor));
    setTargetY(Math.round(armY * factor));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Preset Configurations
  const applyPreset = (preset: 'tabletop' | 'boundary' | 'folded' | 'singularity') => {
    playTick();
    switch (preset) {
      case 'tabletop':
        setTargetX(180);
        setTargetY(110);
        setSolverMode('dls');
        setDampingLambda(0.2);
        break;
      case 'boundary':
        setTargetX(265);
        setTargetY(75);
        setSolverMode('pseudoinverse');
        break;
      case 'singularity':
        setTargetX(275);
        setTargetY(15);
        setSolverMode('dls');
        setDampingLambda(0.35);
        break;
      case 'folded':
        setTargetX(70);
        setTargetY(160);
        setSolverMode('dls');
        setDampingLambda(0.25);
        break;
    }
  };

  const moduleData = MODULES['inverse-kinematics'] || {
    challenges: [
      {
        id: 'challenge-ik-1',
        title: 'Precision End-Effector Positioning',
        description:
          'Drag or position the target coordinate to (X ≥ 170, Y ≥ 100) and converge with an end-effector error < 2.0 mm.',
        hint: 'Use Damped Least Squares (DLS) and click the Tabletop preset to reach the target accurately.',
      },
      {
        id: 'challenge-ik-2',
        title: 'Singularity Recovery via DLS Damping',
        description:
          'Enter a near-boundary kinematic singularity (Manipulability < 450) and engage Damped Least Squares with λ ≥ 0.15 to prevent joint velocity blowup.',
        hint: 'Click "Boundary Singularity" and increase the damping slider λ above 0.15.',
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Topology Canvas & Interactive Arm Visualizer */}
      <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-xs space-y-4">
        {/* Header Title & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-parchment-200 dark:border-parchment-800 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                  3-DOF PLANAR MANIPULATOR
                </span>
                <span className="text-xs font-mono text-ink-muted">
                  Jacobian Inverse Kinematics
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
                Kinematics &amp; Manipulability Ellipsoid Explorer
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSingular ? (
              <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-400 flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                SINGULARITY: det(J) → 0
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                DEXTEROUS WORKSPACE
              </span>
            )}
          </div>
        </div>

        {/* Interactive Presets Bar */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-ink-muted text-[11px] font-semibold">Workspace Scenarios:</span>
          <button
            onClick={() => applyPreset('tabletop')}
            className="px-2.5 py-1 rounded-lg border border-parchment-300 dark:border-parchment-700 hover:bg-parchment-100 dark:hover:bg-parchment-800 transition-colors cursor-pointer text-ink-light dark:text-ink-dark"
          >
            Tabletop Target
          </button>
          <button
            onClick={() => applyPreset('boundary')}
            className="px-2.5 py-1 rounded-lg border border-parchment-300 dark:border-parchment-700 hover:bg-parchment-100 dark:hover:bg-parchment-800 transition-colors cursor-pointer text-amber-700 dark:text-amber-400"
          >
            Boundary Singularity (Reach)
          </button>
          <button
            onClick={() => applyPreset('singularity')}
            className="px-2.5 py-1 rounded-lg border border-parchment-300 dark:border-parchment-700 hover:bg-parchment-100 dark:hover:bg-parchment-800 transition-colors cursor-pointer text-red-600 dark:text-red-400"
          >
            Fully Outstretched (Det=0)
          </button>
          <button
            onClick={() => applyPreset('folded')}
            className="px-2.5 py-1 rounded-lg border border-parchment-300 dark:border-parchment-700 hover:bg-parchment-100 dark:hover:bg-parchment-800 transition-colors cursor-pointer text-purple-600 dark:text-purple-400"
          >
            Folded Inward
          </button>
        </div>

        {/* SVG Interactive Canvas */}
        <div className="relative rounded-2xl border border-parchment-300 dark:border-parchment-800 bg-parchment-950 overflow-hidden shadow-inner select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="w-full h-auto aspect-[720/440] max-h-[440px] cursor-crosshair touch-none"
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Grid & Axes Background */}
            <defs>
              <pattern id="ik-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </pattern>
              <radialGradient id="reach-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.04" />
                <stop offset="90%" stopColor="#0284c7" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.25" />
              </radialGradient>
            </defs>
            <rect width={canvasWidth} height={canvasHeight} fill="url(#ik-grid)" />

            {/* Reachable Workspace Envelope Circle */}
            <circle
              cx={originX}
              cy={originY}
              r={maxReach}
              fill="url(#reach-grad)"
              stroke="#0284c7"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.6"
            />
            {/* Ground / Table Surface */}
            <line
              x1="40"
              y1={originY + 16}
              x2={canvasWidth - 40}
              y2={originY + 16}
              stroke="#475569"
              strokeWidth="3"
            />
            <rect
              x="40"
              y={originY + 16}
              width={canvasWidth - 80}
              height="20"
              fill="#1e293b"
              opacity="0.4"
            />

            {/* Base Pedestal (J0) */}
            <rect
              x={originX - 25}
              y={originY}
              width="50"
              height="16"
              rx="4"
              fill="#64748b"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            <circle
              cx={originX}
              cy={originY}
              r="8"
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Link 1 (Base to Joint 1) */}
            <line
              x1={originX}
              y1={originY}
              x2={originX + j1X}
              y2={originY - j1Y}
              stroke="#f59e0b"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* Joint 1 Pivot */}
            <circle
              cx={originX + j1X}
              cy={originY - j1Y}
              r="7"
              fill="#fbbf24"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Link 2 (Joint 1 to Joint 2) */}
            <line
              x1={originX + j1X}
              y1={originY - j1Y}
              x2={originX + j2X}
              y2={originY - j2Y}
              stroke="#10b981"
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* Joint 2 Pivot */}
            <circle
              cx={originX + j2X}
              cy={originY - j2Y}
              r="6"
              fill="#34d399"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Link 3 (Joint 2 to End-Effector) */}
            <line
              x1={originX + j2X}
              y1={originY - j2Y}
              x2={originX + eeX}
              y2={originY - eeY}
              stroke="#06b6d4"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Manipulability Ellipsoid at End-Effector */}
            <g transform={`translate(${originX + eeX}, ${originY - eeY})`}>
              <ellipse
                rx={Math.max(4, Math.sqrt(lambda1) * 0.12)}
                ry={Math.max(2, Math.sqrt(lambda2) * 0.12)}
                transform={`rotate(${-eeAngleDeg})`}
                fill={isSingular ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.2)'}
                stroke={isSingular ? '#ef4444' : '#10b981'}
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            </g>

            {/* End-Effector Gripper Body */}
            <circle
              cx={originX + eeX}
              cy={originY - eeY}
              r="5"
              fill="#38bdf8"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Target Coordinate Crosshair (User Draggable) */}
            <g transform={`translate(${originX + targetX}, ${originY - targetY})`}>
              <circle
                r="16"
                fill="rgba(239, 68, 68, 0.15)"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#ef4444" strokeWidth="2" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#ef4444" strokeWidth="2" />
              <circle r="3" fill="#ef4444" />
              <text
                x="14"
                y="4"
                fill="#f87171"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Target ({targetX}, {targetY})
              </text>
            </g>

            {/* Canvas Labels */}
            <text x="15" y="25" fill="#94a3b8" fontSize="11" fontFamily="monospace">
              DRAG TARGET OR USE SLIDERS TO TRIGGER JACOBIAN INVERSE KINEMATICS
            </text>
            <text x="15" y={canvasHeight - 15} fill="#64748b" fontSize="10" fontFamily="monospace">
              Max Reach: {maxReach} mm | L1={L1}mm, L2={L2}mm, L3={L3}mm
            </text>
          </svg>

          {/* Floating On-Canvas Readout Badge */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/80 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-slate-800 text-[10px] sm:text-[11px] font-mono space-y-0.5 sm:space-y-1 text-white shadow-md pointer-events-none">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <span className="text-slate-400">Position Error:</span>
              <span
                className={clsx('font-bold', errorDist < 2 ? 'text-emerald-400' : 'text-amber-400')}
              >
                {errorDist.toFixed(1)} mm
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <span className="text-slate-400">Manipulability:</span>
              <span className={clsx('font-bold', isSingular ? 'text-red-400' : 'text-emerald-400')}>
                {manipulability.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:gap-4 hidden sm:flex">
              <span className="text-slate-400">Condition κ(J):</span>
              <span
                className={clsx(
                  'font-bold',
                  conditionNumber > 30 ? 'text-red-400' : 'text-blue-400'
                )}
              >
                {conditionNumber.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Controls & Solver Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Column 1: Target Position Sliders */}
          <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 space-y-3">
            <h4 className="text-xs font-mono uppercase font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-red-500" /> Target Coordinates (mm)
            </h4>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-ink-muted">Target X:</span>
                <span className="font-bold text-ink-light dark:text-ink-dark">{targetX} mm</span>
              </div>
              <input
                type="range"
                min={-240}
                max={270}
                value={targetX}
                onChange={(e) => {
                  playTick();
                  setTargetX(Number(e.target.value));
                }}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-ink-muted">Target Y:</span>
                <span className="font-bold text-ink-light dark:text-ink-dark">{targetY} mm</span>
              </div>
              <input
                type="range"
                min={0}
                max={260}
                value={targetY}
                onChange={(e) => {
                  playTick();
                  setTargetY(Number(e.target.value));
                }}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Column 2: Solver Mode & Damping Factor */}
          <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 space-y-3">
            <h4 className="text-xs font-mono uppercase font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-500" /> IK Solver Algorithm
            </h4>

            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
              <button
                onClick={() => {
                  playTick();
                  setSolverMode('dls');
                }}
                className={clsx(
                  'p-2 rounded-lg border text-center transition-colors cursor-pointer',
                  solverMode === 'dls'
                    ? 'bg-blue-600 text-white font-bold border-blue-600'
                    : 'border-parchment-300 dark:border-parchment-700 text-ink-muted hover:text-ink-light'
                )}
              >
                DLS (λ)
              </button>
              <button
                onClick={() => {
                  playTick();
                  setSolverMode('pseudoinverse');
                }}
                className={clsx(
                  'p-2 rounded-lg border text-center transition-colors cursor-pointer',
                  solverMode === 'pseudoinverse'
                    ? 'bg-blue-600 text-white font-bold border-blue-600'
                    : 'border-parchment-300 dark:border-parchment-700 text-ink-muted hover:text-ink-light'
                )}
              >
                J† (Pseudo)
              </button>
              <button
                onClick={() => {
                  playTick();
                  setSolverMode('analytical');
                }}
                className={clsx(
                  'p-2 rounded-lg border text-center transition-colors cursor-pointer',
                  solverMode === 'analytical'
                    ? 'bg-blue-600 text-white font-bold border-blue-600'
                    : 'border-parchment-300 dark:border-parchment-700 text-ink-muted hover:text-ink-light'
                )}
              >
                Analytical
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-ink-muted">Damping Factor λ:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {dampingLambda.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.8}
                step={0.01}
                value={dampingLambda}
                disabled={solverMode !== 'dls'}
                onChange={(e) => {
                  playTick();
                  setDampingLambda(Number(e.target.value));
                }}
                className="w-full accent-blue-600 cursor-pointer disabled:opacity-40"
              />
              <span className="text-[10px] text-ink-muted block mt-1">
                λ suppresses explosive joint acceleration near singularities.
              </span>
            </div>
          </div>

          {/* Column 3: Joint Angle State */}
          <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 space-y-2 text-xs font-mono">
            <h4 className="text-xs uppercase font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-500" /> Solved Joint Rotations
            </h4>

            <div className="p-2 rounded-lg bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 flex justify-between items-center">
              <span className="text-amber-600 dark:text-amber-400 font-bold">θ1 (Base):</span>
              <span className="font-mono font-bold text-ink-light dark:text-ink-dark">
                {theta1.toFixed(1)}°
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 flex justify-between items-center">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">θ2 (Elbow):</span>
              <span className="font-mono font-bold text-ink-light dark:text-ink-dark">
                {theta2.toFixed(1)}°
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 flex justify-between items-center">
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">θ3 (Wrist):</span>
              <span className="font-mono font-bold text-ink-light dark:text-ink-dark">
                {theta3.toFixed(1)}°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deep Dive Cards & Interactive Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Guided Challenges */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-bold">
              Inverse Kinematics Challenges
            </h4>
            <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">
              {moduleData.challenges.filter((c) => completedChallenges[c.id]).length} /{' '}
              {moduleData.challenges.length} Solved
            </span>
          </div>

          {moduleData.challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              isCompleted={!!completedChallenges[c.id]}
              onComplete={(id) => {
                playSuccess();
                onChallengeComplete?.(id);
              }}
              accentColor="robotics"
            />
          ))}
        </div>

        {/* Right: Architectural & Mathematical Breakdown */}
        <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-4 text-xs font-mono">
          <h4 className="text-sm font-serif font-bold text-ink-light dark:text-ink-dark flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            Core Mathematical Invariants &amp; DLS
          </h4>

          <div className="space-y-3 leading-relaxed text-ink-muted dark:text-ink-darkMuted">
            <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 space-y-1">
              <strong className="text-ink-light dark:text-ink-dark block font-bold">
                1. Forward Kinematics (FK):
              </strong>
              <code className="text-amber-600 dark:text-amber-400 block text-[11px]">
                X = L1·cos(θ1) + L2·cos(θ1+θ2) + L3·cos(θ1+θ2+θ3)
              </code>
              <code className="text-amber-600 dark:text-amber-400 block text-[11px]">
                Y = L1·sin(θ1) + L2·sin(θ1+θ2) + L3·sin(θ1+θ2+θ3)
              </code>
            </div>

            <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 space-y-1">
              <strong className="text-ink-light dark:text-ink-dark block font-bold">
                2. Damped Least Squares (Levenberg-Marquardt):
              </strong>
              <code className="text-blue-600 dark:text-blue-400 block text-[11px]">
                Δθ = J^T · (J·J^T + λ²·I)⁻¹ · Δx
              </code>
              <p className="text-[11px] font-sans">
                Near kinematic singularities where det(J) → 0, raw pseudoinverse J† causes infinite
                joint velocities. DLS adds a damping penalty λ²·I that sacrifices exact position
                tracking momentarily to keep joint speeds physically bounded.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300">
              <strong className="block font-bold text-[11px]">Physical AI Takeaway:</strong>
              <span className="font-sans text-[11px]">
                Manipulability ellipsoids reveal the robot's directional velocity headroom. Physical
                AI foundation models must anticipate kinematic boundaries to avoid actuator stall or
                motor torque saturation during high-speed manipulation.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
