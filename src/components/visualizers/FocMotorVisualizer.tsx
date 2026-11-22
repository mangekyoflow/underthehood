import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Zap, Activity, Sliders, Info, Compass, Gauge, Cpu } from 'lucide-react';
import { playTick, playSuccess } from '../../lib/sound';
import { ChallengeCard } from '../common/ChallengeCard';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { MODULES } from '../../data/modulesData';
import clsx from 'clsx';

interface FocMotorVisualizerProps {
  onChallengeComplete?: (id: string) => void;
  completedChallenges?: Record<string, boolean>;
  tutorialAction?: { actionType: string; params: any; timestamp: number } | null;
}

export const FocMotorVisualizer: React.FC<FocMotorVisualizerProps> = ({
  onChallengeComplete,
  completedChallenges = {},
  tutorialAction,
}) => {
  const moduleData = MODULES['foc-motor-control'];

  // Motor & Inverter Parameters
  const [focAngle, setFocAngle] = useState<number>(45); // Electrical angle in degrees: 0 to 360
  const [focIq, setFocIq] = useState<number>(16.0); // Quadrature current: -25 to +25 A
  const [focId, setFocId] = useState<number>(0.0); // Direct current: -15 to +5 A
  const [vBus, setVBus] = useState<number>(48); // Inverter DC bus: 24V, 48V, 72V
  const [pwmFrequencyKhz, setPwmFrequencyKhz] = useState<number>(25); // 10, 25, 50 kHz
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [targetRpm, setTargetRpm] = useState<number>(1200);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Motor Constants (Robotic quasi-direct drive PMSM)
  const polePairs = 7;
  const statorResistance = 0.18; // Ohms per phase
  const fluxLinkage = 0.015; // Wb (Webers)

  // Math Transformations (Clarke, Park, Inverse Park, SVPWM)
  const focRad = useMemo(() => (focAngle * Math.PI) / 180, [focAngle]);

  // Inverse Park Transform:
  // V_alpha = Vd * cos(theta) - Vq * sin(theta)
  // V_beta  = Vd * sin(theta) + Vq * cos(theta)
  // Let normalized voltage commands scale with requested currents and resistance/back-EMF:
  const vAlpha = useMemo(
    () => focId * Math.cos(focRad) - focIq * Math.sin(focRad),
    [focId, focIq, focRad]
  );
  const vBeta = useMemo(
    () => focId * Math.sin(focRad) + focIq * Math.cos(focRad),
    [focId, focIq, focRad]
  );
  const vMagnitude = useMemo(() => Math.sqrt(vAlpha * vAlpha + vBeta * vBeta), [vAlpha, vBeta]);

  let vAngleRad = Math.atan2(vBeta, vAlpha);
  if (vAngleRad < 0) vAngleRad += 2 * Math.PI;
  const vAngleDeg = (vAngleRad * 180) / Math.PI;

  // SVPWM Sector (1 to 6)
  const sector = Math.min(6, Math.max(1, Math.floor(vAngleDeg / 60) + 1));

  // Inverter PWM duty cycles for Phase A, B, C (centered at 50%)
  const dutyA = Math.max(5, Math.min(95, Math.round(50 + 42 * Math.sin(focRad))));
  const dutyB = Math.max(
    5,
    Math.min(95, Math.round(50 + 42 * Math.sin(focRad - (2 * Math.PI) / 3)))
  );
  const dutyC = Math.max(
    5,
    Math.min(95, Math.round(50 + 42 * Math.sin(focRad + (2 * Math.PI) / 3)))
  );

  // Balanced 3-Phase Stator Currents via Inverse Clarke:
  // Ia = Ialpha
  // Ib = -0.5 * Ialpha + (sqrt(3)/2) * Ibeta
  // Ic = -0.5 * Ialpha - (sqrt(3)/2) * Ibeta
  const iAlpha = focId * Math.cos(focRad) - focIq * Math.sin(focRad);
  const iBeta = focId * Math.sin(focRad) + focIq * Math.cos(focRad);
  const currentA = iAlpha;
  const currentB = -0.5 * iAlpha + (Math.sqrt(3) / 2) * iBeta;
  const currentC = -0.5 * iAlpha - (Math.sqrt(3) / 2) * iBeta;

  // Mechanical Metrics
  // Torque tau = 1.5 * p * lambda_m * Iq
  const torqueNm = 1.5 * polePairs * fluxLinkage * focIq;
  const isFieldWeakening = focId < -2.0;
  const effectiveRpm = isFieldWeakening
    ? Math.round(targetRpm * (1 + Math.abs(focId) / 5))
    : targetRpm;

  // Electrical losses & Efficiency
  const iMagnitudeRms = Math.sqrt((focId * focId + focIq * focIq) / 2);
  const copperLossW = 3 * iMagnitudeRms * iMagnitudeRms * statorResistance;
  const mechPowerW = Math.max(0, torqueNm * ((effectiveRpm * 2 * Math.PI) / 60));
  const totalPowerW = mechPowerW + copperLossW + 4.5; // inverter quiescent loss
  const efficiencyPct =
    totalPowerW > 5 ? Math.min(96, Math.max(10, Math.round((mechPowerW / totalPowerW) * 100))) : 0;

  // Check Challenge Criteria
  useEffect(() => {
    if (focIq >= 15.0 && Math.abs(focId) <= 1.0 && torqueNm >= 2.0) {
      if (!completedChallenges['challenge-foc-1']) {
        playSuccess();
        onChallengeComplete?.('challenge-foc-1');
      }
    }
    if (focId <= -3.0 && effectiveRpm >= 2500) {
      if (!completedChallenges['challenge-foc-2']) {
        playSuccess();
        onChallengeComplete?.('challenge-foc-2');
      }
    }
  }, [focIq, focId, torqueNm, effectiveRpm, completedChallenges, onChallengeComplete]);

  // Stop animation when user moves out of the browser tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsRotating(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Apply Tutorial Action from Robotics Tutorial Deck
  useEffect(() => {
    if (!tutorialAction || tutorialAction.actionType !== 'foc') return;
    const p = tutorialAction.params;
    if (p.angle !== undefined) setFocAngle(p.angle);
    if (p.iq !== undefined) setFocIq(p.iq);
    if (p.id !== undefined) setFocId(p.id);
    if (p.rpm !== undefined) setTargetRpm(p.rpm);
    if (p.rotating !== undefined) setIsRotating(p.rotating);
  }, [tutorialAction]);

  // Continuous Rotor Animation Loop - only runs when isRotating is true
  useEffect(() => {
    if (!isRotating) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const electricalHz = (effectiveRpm * polePairs) / 60;
      const deltaAngle = electricalHz * 360 * dt;
      setFocAngle((prev) => (prev + deltaAngle) % 360);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isRotating, effectiveRpm, polePairs]);

  // Space Vector Hexagon geometry (Center at [140, 140], radius = 95)
  const hexRadius = 95;
  const hexCenter = { x: 140, y: 140 };
  const hexVertices = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const ang = (i * 60 * Math.PI) / 180;
      return {
        x: hexCenter.x + hexRadius * Math.cos(ang),
        y: hexCenter.y - hexRadius * Math.sin(ang),
      };
    });
  }, [hexRadius, hexCenter.x, hexCenter.y]);

  const hexPointsString = hexVertices.map((p) => `${p.x},${p.y}`).join(' ');

  // Voltage vector tip in alpha-beta plane
  const arrowScale = Math.min(hexRadius * 0.95, (vMagnitude / 28) * hexRadius * 0.95);
  const arrowTipX = hexCenter.x + arrowScale * Math.cos(vAngleRad);
  const arrowTipY = hexCenter.y - arrowScale * Math.sin(vAngleRad);

  return (
    <div className="space-y-6">
      {/* Module Header Strip */}
      <div className="p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase">
              MODULE 10 • PHYSICAL AI &amp; ACTUATION
            </span>
            <span className="text-xs font-mono text-ink-muted">Vector Inverter Drive</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            Field-Oriented Control (FOC) &amp; Space Vector PWM
          </h2>
          <p className="text-xs sm:text-sm font-serif italic text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Decouple magnetic flux (Id) from motor torque (Iq) using real-time Park &amp; Clarke
            coordinate rotations.
          </p>
        </div>

        {/* Telemetry Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-xs">
          <div className="p-2 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-[10px] text-ink-muted block">Torque τ</span>
              <span className="font-bold text-ink-light dark:text-ink-dark">
                {torqueNm.toFixed(2)} Nm
              </span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            <div>
              <span className="text-[10px] text-ink-muted block">Speed</span>
              <span className="font-bold text-ink-light dark:text-ink-dark">
                {effectiveRpm} RPM
              </span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-[10px] text-ink-muted block">Efficiency</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {efficiencyPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Visualizer Canvas: SVPWM Hexagon & dq Transform */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SVPWM Space Vector Hexagon & Inverter Switching (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-parchment-200 dark:border-parchment-800 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-mono font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider">
                  SVPWM Hexagon &amp; Stator Voltage Vector (α-β Plane)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                  Sector {sector}
                </span>
                {isFieldWeakening && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                    Field Weakening
                  </span>
                )}
              </div>
            </div>

            {/* SVG Hexagon & Rotating Vector */}
            <div className="relative flex items-center justify-center p-3 rounded-2xl bg-parchment-950 text-white font-mono">
              <svg
                viewBox="0 0 280 280"
                className="w-full max-w-[340px] h-auto aspect-square overflow-visible"
              >
                <defs>
                  <linearGradient id="vectorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <marker
                    id="arrowTip"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                  </marker>
                  <marker
                    id="arrowTipDq"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                  </marker>
                </defs>

                {/* Coordinate Grid Axes: Alpha and Beta */}
                <line
                  x1="20"
                  y1={hexCenter.y}
                  x2="260"
                  y2={hexCenter.y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <line
                  x1={hexCenter.x}
                  y1="20"
                  x2={hexCenter.x}
                  y2="260"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text x="250" y="135" fill="#64748b" fontSize="10">
                  +α
                </text>
                <text x="145" y="32" fill="#64748b" fontSize="10">
                  +β
                </text>

                {/* Inscribed Maximum Linear Modulation Boundary Circle (Vbus / sqrt(3)) */}
                <circle
                  cx={hexCenter.x}
                  cy={hexCenter.y}
                  r={hexRadius * 0.866}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.4"
                />

                {/* Hexagon Outer Boundary representing inverter switching states V1 to V6 */}
                <polygon
                  points={hexPointsString}
                  fill="rgba(2, 132, 199, 0.05)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  opacity="0.8"
                />

                {/* Hexagon Vertices & Inverter States */}
                {hexVertices.map((pt, idx) => {
                  const stateLabels = ['100', '110', '010', '011', '001', '101'];
                  const vNum = idx + 1;
                  return (
                    <g key={idx}>
                      <line
                        x1={hexCenter.x}
                        y1={hexCenter.y}
                        x2={pt.x}
                        y2={pt.y}
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                      <circle cx={pt.x} cy={pt.y} r="4" fill="#38bdf8" />
                      <text
                        x={pt.x + (pt.x > hexCenter.x ? 6 : -18)}
                        y={pt.y + (pt.y > hexCenter.y ? 12 : -6)}
                        fill="#94a3b8"
                        fontSize="9"
                      >
                        V{vNum}({stateLabels[idx]})
                      </text>
                    </g>
                  );
                })}

                {/* Rotating Rotor d-axis (Magnetic Flux direction) */}
                <line
                  x1={hexCenter.x}
                  y1={hexCenter.y}
                  x2={hexCenter.x + 75 * Math.cos(focRad)}
                  y2={hexCenter.y - 75 * Math.sin(focRad)}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrowTipDq)"
                />
                <text
                  x={hexCenter.x + 85 * Math.cos(focRad)}
                  y={hexCenter.y - 85 * Math.sin(focRad)}
                  fill="#10b981"
                  fontSize="10"
                  fontWeight="bold"
                >
                  d-axis
                </text>

                {/* Rotating Rotor q-axis (Orthogonal Torque direction) */}
                <line
                  x1={hexCenter.x}
                  y1={hexCenter.y}
                  x2={hexCenter.x + 75 * Math.cos(focRad + Math.PI / 2)}
                  y2={hexCenter.y - 75 * Math.sin(focRad + Math.PI / 2)}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text
                  x={hexCenter.x + 85 * Math.cos(focRad + Math.PI / 2)}
                  y={hexCenter.y - 85 * Math.sin(focRad + Math.PI / 2)}
                  fill="#f59e0b"
                  fontSize="10"
                  fontWeight="bold"
                >
                  q-axis
                </text>

                {/* Synthesized Stator Voltage Vector Vs */}
                <line
                  x1={hexCenter.x}
                  y1={hexCenter.y}
                  x2={arrowTipX}
                  y2={arrowTipY}
                  stroke="url(#vectorGrad)"
                  strokeWidth="3.5"
                  markerEnd="url(#arrowTip)"
                />
                <circle cx={arrowTipX} cy={arrowTipY} r="3" fill="#60a5fa" />
                <circle cx={hexCenter.x} cy={hexCenter.y} r="3" fill="#ffffff" />
              </svg>

              {/* Floating Canvas Overlays */}
              <div className="absolute top-3 left-3 text-[10px] space-y-1 pointer-events-none bg-slate-950/70 p-1.5 rounded-lg border border-slate-800 backdrop-blur-xs">
                <div>
                  <span className="text-slate-400">Rotor θ_e: </span>
                  <span className="text-cyan-400 font-bold">{focAngle.toFixed(1)}°</span>
                </div>
                <div>
                  <span className="text-slate-400">|Vs| Vector: </span>
                  <span className="text-indigo-300 font-bold">{vMagnitude.toFixed(1)} V</span>
                </div>
              </div>

              <div className="absolute bottom-3 right-3 text-[10px] text-right space-y-1 pointer-events-none bg-slate-950/70 p-1.5 rounded-lg border border-slate-800 backdrop-blur-xs">
                <div>
                  <span className="text-slate-400">Direct Id (Flux): </span>
                  <span
                    className={clsx('font-bold', focId < 0 ? 'text-rose-400' : 'text-emerald-400')}
                  >
                    {focId.toFixed(1)} A
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Quad Iq (Torque): </span>
                  <span className="text-amber-400 font-bold">{focIq.toFixed(1)} A</span>
                </div>
              </div>
            </div>

            {/* Inverter 3-Phase Gate Driver State (High/Low GaN FET Switches) */}
            <div className="p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  3-Phase GaN Inverter Bridge PWM Modulation
                </span>
                <span className="text-[10px] text-ink-muted">
                  Carrier: {pwmFrequencyKhz} kHz • V_bus: {vBus}V DC
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {/* Phase U / A */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-red-600 dark:text-red-400">Phase U</span>
                    <span className="font-bold">{dutyA}%</span>
                  </div>
                  <div className="w-full bg-parchment-200 dark:bg-parchment-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500 h-full transition-all duration-75"
                      style={{ width: `${dutyA}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-muted">
                    <span>Q_H: {dutyA > 50 ? 'ON' : 'OFF'}</span>
                    <span>I: {currentA.toFixed(1)}A</span>
                  </div>
                </div>

                {/* Phase V / B */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Phase V
                    </span>
                    <span className="font-bold">{dutyB}%</span>
                  </div>
                  <div className="w-full bg-parchment-200 dark:bg-parchment-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-75"
                      style={{ width: `${dutyB}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-muted">
                    <span>Q_H: {dutyB > 50 ? 'ON' : 'OFF'}</span>
                    <span>I: {currentB.toFixed(1)}A</span>
                  </div>
                </div>

                {/* Phase W / C */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-blue-600 dark:text-blue-400">Phase W</span>
                    <span className="font-bold">{dutyC}%</span>
                  </div>
                  <div className="w-full bg-parchment-200 dark:bg-parchment-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-75"
                      style={{ width: `${dutyC}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-muted">
                    <span>Q_H: {dutyC > 50 ? 'ON' : 'OFF'}</span>
                    <span>I: {currentC.toFixed(1)}A</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive FOC Tuning & Current Vector Sliders (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-parchment-200 dark:border-parchment-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-mono font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider">
                  FOC Vector Controls
                </h3>
              </div>

              {/* Play / Pause Rotation */}
              <button
                onClick={() => {
                  playTick();
                  setIsRotating(!isRotating);
                }}
                className={clsx(
                  'px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all',
                  isRotating
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-parchment-200 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isRotating ? 'Spinning' : 'Static'}
              </button>
            </div>

            {/* Slider 1: Quadrature Current Iq (Torque Demand) */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <label className="text-ink-muted dark:text-ink-darkMuted font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Quadrature Current (Iq) • Torque
                </label>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {focIq.toFixed(1)} A
                </span>
              </div>
              <input
                type="range"
                min="-20.0"
                max="25.0"
                step="0.5"
                value={focIq}
                onChange={(e) => {
                  playTick();
                  setFocIq(Number(e.target.value));
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted block">
                Directly sets Lorentz electromagnetic torque (τ = 1.5 · p · λ_m · Iq)
              </span>
            </div>

            {/* Slider 2: Direct Current Id (Magnetic Flux & Field Weakening) */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <label className="text-ink-muted dark:text-ink-darkMuted font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Direct Current (Id) • Flux / Field-Weakening
                </label>
                <span
                  className={clsx(
                    'font-bold',
                    focId < -0.5
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {focId.toFixed(1)} A
                </span>
              </div>
              <input
                type="range"
                min="-12.0"
                max="4.0"
                step="0.5"
                value={focId}
                onChange={(e) => {
                  playTick();
                  setFocId(Number(e.target.value));
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted block">
                Id = 0 yields Maximum Torque Per Ampere (MTPA). Id &lt; 0 enables high-speed field
                weakening.
              </span>
            </div>

            {/* Slider 3: Motor Base RPM */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                  Motor Commutation Speed (RPM)
                </label>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">{targetRpm} RPM</span>
              </div>
              <input
                type="range"
                min="300"
                max="3600"
                step="100"
                value={targetRpm}
                onChange={(e) => {
                  playTick();
                  setTargetRpm(Number(e.target.value));
                }}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Bus Voltage & PWM Preset Pills */}
            <div className="pt-2 border-t border-parchment-200 dark:border-parchment-800 space-y-3 font-mono text-xs">
              <div>
                <span className="text-ink-muted text-[11px] block mb-1.5 font-semibold">
                  DC Bus Voltage (V_bus):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[24, 48, 72].map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        playTick();
                        setVBus(v);
                      }}
                      className={clsx(
                        'py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                        vBus === v
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 shadow-xs'
                          : 'border-parchment-300 dark:border-parchment-700 text-ink-muted hover:bg-parchment-100 dark:hover:bg-parchment-800'
                      )}
                    >
                      {v}V DC
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-ink-muted text-[11px] block mb-1.5 font-semibold">
                  GaN PWM Frequency:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 25, 50].map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        playTick();
                        setPwmFrequencyKhz(f);
                      }}
                      className={clsx(
                        'py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                        pwmFrequencyKhz === f
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-800 dark:text-cyan-300 shadow-xs'
                          : 'border-parchment-300 dark:border-parchment-700 text-ink-muted hover:bg-parchment-100 dark:hover:bg-parchment-800'
                      )}
                    >
                      {f} kHz
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Transformation Cards */}
          <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-3 font-mono text-xs">
            <h4 className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              Coordinate Transforms in Memory
            </h4>
            <div className="space-y-2 text-[11px] text-ink-muted dark:text-ink-darkMuted leading-relaxed">
              <div className="p-2 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
                <strong className="text-ink-light dark:text-ink-dark block">
                  Clarke Transform:
                </strong>
                <code>Iα = Ia • Iβ = (Ia + 2Ib) / √3</code>
              </div>
              <div className="p-2 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
                <strong className="text-ink-light dark:text-ink-dark block">Park Transform:</strong>
                <code>Id = Iα·cos(θ) + Iβ·sin(θ) • Iq = -Iα·sin(θ) + Iβ·cos(θ)</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Challenges Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-bold">
            Interactive FOC Actuator Challenges
          </h4>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            {moduleData.challenges.filter((c) => completedChallenges[c.id]).length} /{' '}
            {moduleData.challenges.length} Solved
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleData.challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              isCompleted={!!completedChallenges[c.id]}
              onComplete={(id) => onChallengeComplete?.(id)}
              accentColor="robotics"
            />
          ))}
        </div>
      </div>

      {/* Architecture Deep Dive Drawer */}
      <ExplanationDrawer module={moduleData} />
    </div>
  );
};
