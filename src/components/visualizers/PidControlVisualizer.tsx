import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Wind,
  ShieldAlert,
  Zap,
  Activity,
  CheckCircle2,
  Sliders,
  Info,
  HelpCircle,
  AlertTriangle,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import { ChallengeCard } from '../common/ChallengeCard';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { MODULES } from '../../data/modulesData';
import clsx from 'clsx';

interface PidControlVisualizerProps {
  onChallengeComplete?: (id: string) => void;
  completedChallenges?: Record<string, boolean>;
}

interface HistoryPoint {
  t: number;
  sp: number;
  pv: number;
  error: number;
  output: number;
  pTerm: number;
  iTerm: number;
  dTerm: number;
}

export const PidControlVisualizer: React.FC<PidControlVisualizerProps> = ({
  onChallengeComplete,
  completedChallenges = {},
}) => {
  const moduleData = MODULES['pid-control-loop'];

  // PID Parameters
  const [kp, setKp] = useState<number>(3.8);
  const [ki, setKi] = useState<number>(0.8);
  const [kd, setKd] = useState<number>(1.6);
  const [setpoint, setSetpoint] = useState<number>(90); // degrees: 0 to 180

  // Environment & Disturbances
  const [disturbanceForce, setDisturbanceForce] = useState<number>(0);
  const [noiseEnabled, setNoiseEnabled] = useState<boolean>(false);
  const [gravityBias, setGravityBias] = useState<number>(15); // gravity load droop

  // Simulation State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [pv, setPv] = useState<number>(0); // Process variable (current angle in deg)
  const [velocity, setVelocity] = useState<number>(0);
  const [integral, setIntegral] = useState<number>(0);
  const [prevError, setPrevError] = useState<number>(90);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  // Telemetry metrics
  const [maxPv, setMaxPv] = useState<number>(0);
  const [settledTime, setSettledTime] = useState<number | null>(null);
  const [disturbanceInjectedTime, setDisturbanceInjectedTime] = useState<number | null>(null);

  // References for animation loop
  const stateRef = useRef({
    pv: 0,
    velocity: 0,
    integral: 0,
    prevError: 90,
    time: 0,
    maxPv: 0,
    kp: 3.8,
    ki: 0.8,
    kd: 1.6,
    setpoint: 90,
    disturbance: 0,
    noise: false,
    gravity: 15,
    isRunning: true,
  });

  // Keep stateRef in sync with React state
  useEffect(() => {
    stateRef.current.kp = kp;
    stateRef.current.ki = ki;
    stateRef.current.kd = kd;
    stateRef.current.setpoint = setpoint;
    stateRef.current.disturbance = disturbanceForce;
    stateRef.current.noise = noiseEnabled;
    stateRef.current.gravity = gravityBias;
    stateRef.current.isRunning = isRunning;
  }, [kp, ki, kd, setpoint, disturbanceForce, noiseEnabled, gravityBias, isRunning]);

  // Reset simulation
  const handleReset = useCallback(() => {
    playTick();
    stateRef.current.pv = 0;
    stateRef.current.velocity = 0;
    stateRef.current.integral = 0;
    stateRef.current.prevError = setpoint;
    stateRef.current.time = 0;
    stateRef.current.maxPv = 0;
    setPv(0);
    setVelocity(0);
    setIntegral(0);
    setPrevError(setpoint);
    setSimTime(0);
    setMaxPv(0);
    setSettledTime(null);
    setDisturbanceInjectedTime(null);
    setHistory([]);
  }, [setpoint]);

  // Presets
  const applyPreset = (presetKp: number, presetKi: number, presetKd: number, name: string) => {
    playTick();
    setKp(presetKp);
    setKi(presetKi);
    setKd(presetKd);
    handleReset();
  };

  // Trigger External Load Impulse (Disturbance)
  const triggerDisturbanceImpulse = () => {
    playAlert();
    setDisturbanceForce(45);
    setDisturbanceInjectedTime(stateRef.current.time);
    setTimeout(() => {
      setDisturbanceForce(0);
    }, 400);
  };

  // Physics Simulation Step
  const stepSimulation = useCallback(
    (dt: number) => {
      const s = stateRef.current;
      s.time += dt;

      // Measurement with optional sensor noise
      const noiseVal = s.noise ? (Math.random() - 0.5) * 1.8 : 0;
      const measuredPv = s.pv + noiseVal;
      const error = s.setpoint - measuredPv;

      // Integral with anti-windup clamping (-100 to 100)
      let newIntegral = s.integral + error * dt;
      if (newIntegral > 100) newIntegral = 100;
      if (newIntegral < -100) newIntegral = -100;
      s.integral = newIntegral;

      // Derivative on error (with low-pass smoothing)
      const derivative = (error - s.prevError) / dt;
      s.prevError = error;

      // PID Control Output
      const pTerm = s.kp * error;
      const iTerm = s.ki * s.integral;
      const dTerm = s.kd * derivative;
      let controlOutput = pTerm + iTerm + dTerm;

      // Motor torque saturation limit: [-150, 150]
      if (controlOutput > 150) controlOutput = 150;
      if (controlOutput < -150) controlOutput = -150;

      // Second-order mechanical plant:
      // Torque = I * alpha + b * omega + tau_gravity + tau_disturbance
      const J = 1.2; // Inertia
      const b = 0.8; // Viscous damping
      // Gravity droop depends on angle (max at horizontal 90 deg)
      const rad = (s.pv * Math.PI) / 180;
      const gravityTorque = s.gravity * Math.sin(rad);
      const totalTorque = controlOutput - gravityTorque - s.disturbance - b * s.velocity;
      const acceleration = totalTorque / J;

      s.velocity += acceleration * dt;
      s.pv += s.velocity * dt;

      // Physical hard stops: [-10, 200] degrees
      if (s.pv < -10) {
        s.pv = -10;
        s.velocity = 0;
      } else if (s.pv > 200) {
        s.pv = 200;
        s.velocity = 0;
      }

      if (s.pv > s.maxPv) {
        s.maxPv = s.pv;
      }

      // Record history
      const point: HistoryPoint = {
        t: Number(s.time.toFixed(2)),
        sp: s.setpoint,
        pv: Number(s.pv.toFixed(1)),
        error: Number(error.toFixed(1)),
        output: Number(controlOutput.toFixed(1)),
        pTerm: Number(pTerm.toFixed(1)),
        iTerm: Number(iTerm.toFixed(1)),
        dTerm: Number(dTerm.toFixed(1)),
      };

      setHistory((prev) => {
        const updated = [...prev, point];
        return updated.length > 120 ? updated.slice(updated.length - 120) : updated;
      });

      setPv(s.pv);
      setVelocity(s.velocity);
      setSimTime(s.time);
      setMaxPv(s.maxPv);

      // Check challenge criteria
      const steadyStateError = Math.abs(s.setpoint - s.pv);
      const overshootPct =
        s.setpoint > 0 ? Math.max(0, ((s.maxPv - s.setpoint) / s.setpoint) * 100) : 0;

      // Challenge 1: Sub-15% overshoot and steady-state error < 1% after settling at least 2.5s
      if (
        s.time > 2.5 &&
        steadyStateError < 1.0 &&
        overshootPct <= 15.0 &&
        overshootPct >= 0 &&
        onChallengeComplete &&
        !completedChallenges['challenge-pid-1']
      ) {
        playSuccess();
        onChallengeComplete('challenge-pid-1');
      }

      // Challenge 2: Disturbance recovery within 1.8 seconds after disturbance injection
      if (
        disturbanceInjectedTime !== null &&
        s.time - disturbanceInjectedTime > 1.2 &&
        s.time - disturbanceInjectedTime < 3.5 &&
        steadyStateError < 1.5 &&
        onChallengeComplete &&
        !completedChallenges['challenge-pid-2']
      ) {
        playSuccess();
        onChallengeComplete('challenge-pid-2');
      }
    },
    [disturbanceInjectedTime, onChallengeComplete, completedChallenges]
  );

  // Animation frame loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const dtSec = Math.min((now - lastTimestamp) / 1000, 0.05);
      lastTimestamp = now;

      if (stateRef.current.isRunning) {
        stepSimulation(dtSec);
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [stepSimulation]);

  // Derived telemetry
  const currentError = setpoint - pv;
  const overshootPct = setpoint > 0 ? Math.max(0, ((maxPv - setpoint) / setpoint) * 100) : 0;
  const steadyStateError = Math.abs(currentError);
  const pTerm = kp * currentError;
  const iTerm = ki * integral;
  const dTerm = kd * (prevError !== 0 ? (currentError - prevError) / 0.03 : 0);
  const totalTorque = Math.max(-150, Math.min(150, pTerm + iTerm + dTerm));

  return (
    <div className="space-y-6">
      {/* Interactive Controls & Telemetry Overview Card */}
      <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                REAL-TIME ACTUATOR
              </span>
              <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
                CLOSED-LOOP DYNAMICS
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
              Closed-Loop PID Control &amp; Step Response
            </h3>
            <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-1">
              Adjust gains in real-time and observe the physical robot arm counteract inertia,
              gravity droop, and external load disturbances.
            </p>
          </div>

          {/* Simulation Playback Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playTick();
                setIsRunning(!isRunning);
              }}
              className={clsx(
                'btn-pop px-3.5 py-1.5 rounded-xl border font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs',
                isRunning
                  ? 'border-amber-400 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                  : 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              )}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause Loop' : 'Resume Loop'}</span>
            </button>

            <button
              onClick={() => {
                playTick();
                stepSimulation(0.04);
              }}
              className="btn-pop p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 hover:bg-parchment-100 dark:hover:bg-parchment-700 text-ink-light dark:text-ink-dark transition-all cursor-pointer"
              title="Step +40ms"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleReset}
              className="btn-pop p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 hover:bg-parchment-100 dark:hover:bg-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all cursor-pointer"
              title="Reset Simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real-Time Telemetry HUD Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-6">
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Process Variable (PV)
            </div>
            <div className="text-base sm:text-lg font-bold text-ink-light dark:text-ink-dark flex items-baseline gap-1 mt-0.5">
              <span>{pv.toFixed(1)}°</span>
              <span className="text-xs text-ink-muted">/ {setpoint}°</span>
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
              Error Δ: {currentError.toFixed(1)}°
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Peak Overshoot (Mp)
            </div>
            <div
              className={clsx(
                'text-base sm:text-lg font-bold flex items-baseline gap-1 mt-0.5',
                overshootPct <= 15
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              <span>{overshootPct.toFixed(1)}%</span>
            </div>
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted mt-1">
              Target: ≤ 15.0%
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Steady-State Error
            </div>
            <div
              className={clsx(
                'text-base sm:text-lg font-bold flex items-baseline gap-1 mt-0.5',
                steadyStateError < 1.0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            >
              <span>{steadyStateError.toFixed(2)}°</span>
            </div>
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted mt-1">
              Target: &lt; 1.00°
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Control Effort (u)
            </div>
            <div className="text-base sm:text-lg font-bold text-sky-600 dark:text-sky-400 flex items-baseline gap-1 mt-0.5">
              <span>{totalTorque.toFixed(1)}</span>
              <span className="text-[10px] text-ink-muted">Nm</span>
            </div>
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted mt-1">
              P:{pTerm.toFixed(0)} | I:{iTerm.toFixed(0)} | D:{dTerm.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Closed-Loop Control System Topology Canvas */}
        <div className="p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950/60 shadow-xs mb-6 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                CLOSED-LOOP CONTROL TOPOLOGY &amp; SIGNAL FLOW
              </span>
            </div>
            {/* Quick Interactive Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-ink-muted">Tuning Presets:</span>
              <button
                onClick={() => applyPreset(3.8, 0.8, 1.6, 'Critically Damped')}
                className="px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                Critically Damped
              </button>
              <button
                onClick={() => applyPreset(7.5, 1.5, 0.5, 'Aggressive')}
                className="px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                High Overshoot
              </button>
              <button
                onClick={() => applyPreset(2.5, 0.0, 0.0, 'P-Only')}
                className="px-2 py-0.5 rounded text-[10px] font-semibold border border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted hover:text-ink-light transition-all cursor-pointer"
              >
                P-Only (Droop)
              </button>
              <button
                onClick={() => applyPreset(8.0, 0.0, 0.2, 'Underdamped')}
                className="px-2 py-0.5 rounded text-[10px] font-semibold border border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                Underdamped
              </button>
            </div>
          </div>

          {/* Continuous SVG Signal Flow Diagram */}
          <div className="w-full bg-slate-900/90 rounded-xl p-3 border border-slate-800 relative overflow-hidden select-none">
            <svg viewBox="0 0 760 175" className="w-full h-auto drop-shadow-sm">
              <defs>
                <marker
                  id="pid-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker
                  id="pid-arrow-blue"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <marker
                  id="pid-arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
                </marker>
                {/* Flow paths for animateMotion */}
                <path id="path-sp-sum" d="M 75 75 L 115 75" />
                <path id="path-err-p" d="M 135 75 L 175 75 L 175 35 L 210 35" />
                <path id="path-err-i" d="M 135 75 L 210 75" />
                <path id="path-err-d" d="M 135 75 L 175 75 L 175 115 L 210 115" />
                <path id="path-p-summer" d="M 330 35 L 365 35 L 365 75 L 385 75" />
                <path id="path-i-summer" d="M 330 75 L 385 75" />
                <path id="path-d-summer" d="M 330 115 L 365 115 L 365 75 L 385 75" />
                <path id="path-summer-plant" d="M 405 75 L 430 75 L 505 75 L 530 75" />
                <path id="path-plant-out" d="M 640 75 L 730 75" />
                <path id="path-feedback-loop" d="M 670 75 L 670 152 L 125 152 L 125 88" />
              </defs>

              {/* Static Wires & Busses */}
              {/* SP to Summing Junction */}
              <line
                x1="75"
                y1="75"
                x2="115"
                y2="75"
                stroke="#64748b"
                strokeWidth="2"
                markerEnd="url(#pid-arrow)"
              />
              {/* Error split to P, I, D */}
              <path
                d="M 135 75 L 175 75 L 175 35 L 210 35"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.8"
                markerEnd="url(#pid-arrow)"
              />
              <path
                d="M 135 75 L 210 75"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.8"
                markerEnd="url(#pid-arrow)"
              />
              <path
                d="M 135 75 L 175 75 L 175 115 L 210 115"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.8"
                markerEnd="url(#pid-arrow)"
              />
              {/* P, I, D outputs merging to Summer */}
              <path
                d="M 330 35 L 365 35 L 365 75 L 385 75"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.8"
                markerEnd="url(#pid-arrow)"
              />
              <path
                d="M 330 75 L 385 75"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.8"
                markerEnd="url(#pid-arrow)"
              />
              <path
                d="M 330 115 L 365 115 L 365 75 L 385 75"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.8"
                markerEnd="url(#pid-arrow)"
              />
              {/* Summer to Plant */}
              <line
                x1="405"
                y1="75"
                x2="430"
                y2="75"
                stroke="#64748b"
                strokeWidth="2"
                markerEnd="url(#pid-arrow)"
              />
              <line
                x1="505"
                y1="75"
                x2="530"
                y2="75"
                stroke="#64748b"
                strokeWidth="2"
                markerEnd="url(#pid-arrow)"
              />
              {/* Plant to Output */}
              <line
                x1="640"
                y1="75"
                x2="745"
                y2="75"
                stroke="#38bdf8"
                strokeWidth="2"
                markerEnd="url(#pid-arrow-blue)"
              />
              {/* Feedback wire */}
              <path
                d="M 670 75 L 670 152 L 125 152 L 125 88"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.8"
                strokeDasharray="3 3"
                markerEnd="url(#pid-arrow-emerald)"
              />

              {/* Living Continuous Moving Signal Packets */}
              {isRunning && (
                <>
                  <circle r="3" fill="#f59e0b">
                    <animateMotion dur="1.2s" repeatCount="indefinite">
                      <mpath href="#path-sp-sum" />
                    </animateMotion>
                  </circle>
                  <circle r="2.5" fill="#38bdf8">
                    <animateMotion dur="1.4s" repeatCount="indefinite">
                      <mpath href="#path-err-p" />
                    </animateMotion>
                  </circle>
                  <circle r="2.5" fill="#a855f7">
                    <animateMotion dur="1.4s" repeatCount="indefinite">
                      <mpath href="#path-err-i" />
                    </animateMotion>
                  </circle>
                  <circle r="2.5" fill="#ec4899">
                    <animateMotion dur="1.4s" repeatCount="indefinite">
                      <mpath href="#path-err-d" />
                    </animateMotion>
                  </circle>
                  <circle r="2.5" fill="#38bdf8">
                    <animateMotion dur="1.4s" repeatCount="indefinite">
                      <mpath href="#path-p-summer" />
                    </animateMotion>
                  </circle>
                  <circle r="2.5" fill="#a855f7">
                    <animateMotion dur="1.4s" repeatCount="indefinite">
                      <mpath href="#path-i-summer" />
                    </animateMotion>
                  </circle>
                  <circle r="2.5" fill="#ec4899">
                    <animateMotion dur="1.4s" repeatCount="indefinite">
                      <mpath href="#path-d-summer" />
                    </animateMotion>
                  </circle>
                  <circle r="3" fill="#38bdf8">
                    <animateMotion dur="1.2s" repeatCount="indefinite">
                      <mpath href="#path-summer-plant" />
                    </animateMotion>
                  </circle>
                  <circle r="3" fill="#10b981">
                    <animateMotion dur="2.4s" repeatCount="indefinite">
                      <mpath href="#path-feedback-loop" />
                    </animateMotion>
                  </circle>
                </>
              )}

              {/* 1. Setpoint Input Box */}
              <g transform="translate(15, 55)">
                <rect
                  width="60"
                  height="40"
                  rx="6"
                  fill="#1e293b"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <text
                  x="30"
                  y="16"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#f59e0b"
                >
                  r(t) SP
                </text>
                <text
                  x="30"
                  y="30"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#ffffff"
                >
                  {setpoint}°
                </text>
              </g>

              {/* 2. Summing Junction Circle */}
              <g transform="translate(125, 75)">
                <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.8" />
                <line x1="-7" y1="0" x2="7" y2="0" stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1="0" y1="-7" x2="0" y2="7" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="-12" y="-4" fontSize="8" fontWeight="bold" fill="#f59e0b">
                  +
                </text>
                <text x="-4" y="16" fontSize="9" fontWeight="bold" fill="#10b981">
                  −
                </text>
                <text x="0" y="-14" textAnchor="middle" fontSize="8" fill="#94a3b8">
                  e = {currentError.toFixed(1)}°
                </text>
              </g>

              {/* 3. Proportional Block (Kp) */}
              <g transform="translate(210, 18)">
                <rect
                  width="120"
                  height="34"
                  rx="6"
                  fill="#1e293b"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <text x="8" y="14" fontSize="9" fontWeight="bold" fill="#38bdf8">
                  P: Kp · e(t)
                </text>
                <text x="8" y="26" fontSize="8" fill="#94a3b8">
                  Kp={kp.toFixed(1)} → {pTerm.toFixed(1)} Nm
                </text>
              </g>

              {/* 4. Integral Block (Ki) */}
              <g transform="translate(210, 58)">
                <rect
                  width="120"
                  height="34"
                  rx="6"
                  fill="#1e293b"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                />
                <text x="8" y="14" fontSize="9" fontWeight="bold" fill="#a855f7">
                  I: Ki · ∫ e dt
                </text>
                <text x="8" y="26" fontSize="8" fill="#94a3b8">
                  Ki={ki.toFixed(1)} → {iTerm.toFixed(1)} Nm
                </text>
              </g>

              {/* 5. Derivative Block (Kd) */}
              <g transform="translate(210, 98)">
                <rect
                  width="120"
                  height="34"
                  rx="6"
                  fill="#1e293b"
                  stroke="#ec4899"
                  strokeWidth="1.5"
                />
                <text x="8" y="14" fontSize="9" fontWeight="bold" fill="#ec4899">
                  D: Kd · de/dt
                </text>
                <text x="8" y="26" fontSize="8" fill="#94a3b8">
                  Kd={kd.toFixed(1)} → {dTerm.toFixed(1)} Nm
                </text>
              </g>

              {/* 6. Effort Summer Junction */}
              <g transform="translate(395, 75)">
                <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#cbd5e1"
                >
                  Σ
                </text>
                <text x="0" y="-13" textAnchor="middle" fontSize="8" fill="#94a3b8">
                  u(t)
                </text>
              </g>

              {/* 7. Saturation Limiter */}
              <g transform="translate(430, 55)">
                <rect
                  width="75"
                  height="40"
                  rx="6"
                  fill="#1e293b"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text x="37" y="15" textAnchor="middle" fontSize="8" fill="#94a3b8">
                  SATURATION
                </text>
                <text
                  x="37"
                  y="28"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#f8fafc"
                >
                  ±150 Nm
                </text>
              </g>

              {/* 8. Plant / Robot Actuator */}
              <g transform="translate(530, 50)">
                <rect
                  width="110"
                  height="50"
                  rx="6"
                  fill="#1e293b"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text
                  x="55"
                  y="16"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#38bdf8"
                >
                  ACTUATOR PLANT
                </text>
                <text x="55" y="29" textAnchor="middle" fontSize="8" fill="#cbd5e1">
                  Motor + Arm Load
                </text>
                <text x="55" y="42" textAnchor="middle" fontSize="8" fill="#94a3b8">
                  J={1.2} | b={0.8}
                </text>
              </g>

              {/* 9. Output Node */}
              <g transform="translate(680, 55)">
                <rect
                  width="65"
                  height="40"
                  rx="6"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <text
                  x="32"
                  y="16"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#38bdf8"
                >
                  y(t) PV
                </text>
                <text
                  x="32"
                  y="30"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#ffffff"
                >
                  {pv.toFixed(1)}°
                </text>
              </g>

              {/* 10. Feedback Sensor / Encoder */}
              <g transform="translate(350, 137)">
                <rect
                  width="140"
                  height="26"
                  rx="5"
                  fill="#1e293b"
                  stroke="#10b981"
                  strokeWidth="1.2"
                />
                <text
                  x="70"
                  y="17"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#10b981"
                >
                  19-BIT OPTICAL ENCODER
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Main Physical Visualizer + Step Response Oscilloscope Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Tactile 2D Physical Actuator View (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 relative overflow-hidden">
            <div className="absolute top-3 left-3 text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>ROBOTIC JOINT ACTUATOR</span>
            </div>

            {/* SVG Arm */}
            <svg
              viewBox="-120 -120 240 240"
              className="w-44 h-44 sm:w-56 sm:h-56 max-w-full drop-shadow-sm my-3 sm:my-4"
            >
              {/* Dial markings */}
              <circle
                cx="0"
                cy="0"
                r="90"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-parchment-300 dark:text-parchment-800"
                strokeDasharray="3 3"
              />
              <line
                x1="-95"
                y1="0"
                x2="95"
                y2="0"
                stroke="currentColor"
                strokeWidth="1"
                className="text-parchment-300 dark:text-parchment-800"
              />
              <line
                x1="0"
                y1="-95"
                x2="0"
                y2="95"
                stroke="currentColor"
                strokeWidth="1"
                className="text-parchment-300 dark:text-parchment-800"
              />

              {/* Setpoint Ghost Target Indicator */}
              {(() => {
                const targetRad = (setpoint * Math.PI) / 180;
                const tx = 88 * Math.cos(targetRad);
                const ty = -88 * Math.sin(targetRad);
                return (
                  <g>
                    <line
                      x1="0"
                      y1="0"
                      x2={tx}
                      y2={ty}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      opacity="0.6"
                    />
                    <circle cx={tx} cy={ty} r="6" fill="#f59e0b" opacity="0.8" />
                    <text
                      x={tx + (tx > 0 ? 8 : -24)}
                      y={ty + (ty > 0 ? 12 : -8)}
                      fontSize="9"
                      fill="#f59e0b"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      SP:{setpoint}°
                    </text>
                  </g>
                );
              })()}

              {/* Actual Robot Arm Link */}
              {(() => {
                const actualRad = (pv * Math.PI) / 180;
                const ax = 85 * Math.cos(actualRad);
                const ay = -85 * Math.sin(actualRad);
                return (
                  <g>
                    {/* Arm linkage body */}
                    <line
                      x1="0"
                      y1="0"
                      x2={ax}
                      y2={ay}
                      stroke="#3b82f6"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    {/* End effector / Payload mass */}
                    <circle cx={ax} cy={ay} r="10" fill="#2563eb" className="animate-pulse" />
                    {/* Disturbance force vector if active */}
                    {disturbanceForce > 0 && (
                      <g>
                        <circle
                          cx={ax}
                          cy={ay}
                          r="22"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2"
                          className="animate-fx-burst opacity-80"
                        />
                        <line
                          x1={ax}
                          y1={ay}
                          x2={ax}
                          y2={ay + 30}
                          stroke="#ef4444"
                          strokeWidth="3"
                          markerEnd="url(#arrow)"
                        />
                        <text
                          x={ax + 6}
                          y={ay + 25}
                          fontSize="9"
                          fill="#ef4444"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          +40N GUST
                        </text>
                      </g>
                    )}
                  </g>
                );
              })()}

              {/* Motor Center Hub */}
              <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
              <circle cx="0" cy="0" r="4" fill="#ffffff" />
            </svg>

            {/* Disturbance button */}
            <div className="w-full flex items-center justify-between gap-2 mt-2 pt-3 border-t border-parchment-200 dark:border-parchment-800 text-xs font-mono">
              <button
                onClick={triggerDisturbanceImpulse}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
              >
                <Wind className="w-3.5 h-3.5" />
                <span>+40N Gust</span>
              </button>

              <label className="flex items-center gap-1.5 text-ink-muted dark:text-ink-darkMuted cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={noiseEnabled}
                  onChange={(e) => {
                    playTick();
                    setNoiseEnabled(e.target.checked);
                  }}
                  className="rounded border-parchment-300 dark:border-parchment-700 text-amber-500"
                />
                <span>Encoder Noise</span>
              </label>
            </div>
          </div>

          {/* Right: Step Response Oscilloscope (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 relative">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                  <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> Setpoint (SP)
                </span>
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                  <span className="w-2.5 h-0.5 bg-blue-500 inline-block" /> Process Variable (PV)
                </span>
              </div>
              <span className="text-[10px] text-ink-muted">t = {simTime.toFixed(1)}s</span>
            </div>

            {/* Oscilloscope SVG Waveform */}
            <div className="h-40 sm:h-48 w-full bg-white dark:bg-parchment-900 rounded-xl border border-parchment-200 dark:border-parchment-800 p-2 relative overflow-hidden flex items-end">
              <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="w-full h-full">
                {/* Horizontal grid lines */}
                <line
                  x1="0"
                  y1="40"
                  x2="400"
                  y2="40"
                  stroke="#94a3b8"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                  opacity="0.3"
                />
                <line
                  x1="0"
                  y1="80"
                  x2="400"
                  y2="80"
                  stroke="#94a3b8"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                  opacity="0.3"
                />
                <line
                  x1="0"
                  y1="120"
                  x2="400"
                  y2="120"
                  stroke="#94a3b8"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                  opacity="0.3"
                />

                {/* 15% Overshoot Threshold Line */}
                {(() => {
                  const limitY = 160 - ((setpoint * 1.15) / 180) * 150;
                  return (
                    <line
                      x1="0"
                      y1={limitY}
                      x2="400"
                      y2={limitY}
                      stroke="#ef4444"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                      opacity="0.5"
                    />
                  );
                })()}

                {/* Setpoint Line */}
                {(() => {
                  const spY = 160 - (setpoint / 180) * 150;
                  return (
                    <line
                      x1="0"
                      y1={spY}
                      x2="400"
                      y2={spY}
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="5 3"
                    />
                  );
                })()}

                {/* PV Waveform Path */}
                {history.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={history
                      .map((pt, i) => {
                        const x = (i / Math.max(1, history.length - 1)) * 400;
                        const y = 160 - (Math.max(0, Math.min(180, pt.pv)) / 180) * 150;
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                      })
                      .join(' ')}
                  />
                )}
              </svg>
            </div>

            {/* Error & Control Terms Breakdown Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-parchment-200 dark:border-parchment-800 text-[10px] sm:text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-white/70 dark:bg-parchment-900/70 border border-parchment-200 dark:border-parchment-800">
                <span className="text-ink-muted">P-Term (Kp·e):</span>
                <span className="font-bold text-ink-light dark:text-ink-dark ml-1.5">
                  {pTerm.toFixed(1)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-parchment-900/70 border border-parchment-200 dark:border-parchment-800">
                <span className="text-ink-muted">I-Term (Ki·∫e):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1.5">
                  {iTerm.toFixed(1)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-parchment-900/70 border border-parchment-200 dark:border-parchment-800">
                <span className="text-ink-muted">D-Term (Kd·de):</span>
                <span className="font-bold text-purple-600 dark:text-purple-400 ml-1.5">
                  {dTerm.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactile Tuning Sliders & Presets Section */}
        <div className="mt-6 pt-6 border-t border-parchment-200 dark:border-parchment-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-bold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              <span>PID Feedback Gain Sliders</span>
            </h4>

            {/* Quick Tuning Presets */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span className="text-ink-muted text-[10px] mr-1">PRESETS:</span>
              <button
                onClick={() => applyPreset(7.5, 0.0, 0.2, 'Underdamped')}
                className="px-2 py-1 rounded-md bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors cursor-pointer"
              >
                High Ringing
              </button>
              <button
                onClick={() => applyPreset(1.5, 0.2, 3.2, 'Overdamped')}
                className="px-2 py-1 rounded-md bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors cursor-pointer"
              >
                Sluggish
              </button>
              <button
                onClick={() => applyPreset(4.0, 0.0, 1.5, 'No Ki')}
                className="px-2 py-1 rounded-md bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors cursor-pointer"
              >
                Gravity Droop (Ki=0)
              </button>
              <button
                onClick={() => applyPreset(4.2, 1.2, 1.8, 'Optimal')}
                className="px-2 py-1 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
              >
                Target Tuned
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 font-mono text-xs">
            {/* Setpoint (SP) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                  Target Setpoint (SP)
                </label>
                <span className="font-bold text-amber-600 dark:text-amber-400">{setpoint}°</span>
              </div>
              <input
                type="range"
                min="10"
                max="170"
                step="5"
                value={setpoint}
                onChange={(e) => {
                  playTick();
                  setSetpoint(Number(e.target.value));
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted block">Command angle in degrees</span>
            </div>

            {/* Proportional Gain (Kp) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                  Proportional Gain (Kp)
                </label>
                <span className="font-bold text-blue-600 dark:text-blue-400">{kp.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="10.0"
                step="0.1"
                value={kp}
                onChange={(e) => {
                  playTick();
                  setKp(Number(e.target.value));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted block">
                Immediate stiffness & response
              </span>
            </div>

            {/* Integral Gain (Ki) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                  Integral Gain (Ki)
                </label>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {ki.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="4.0"
                step="0.05"
                value={ki}
                onChange={(e) => {
                  playTick();
                  setKi(Number(e.target.value));
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted block">
                Eliminates gravity/friction droop
              </span>
            </div>

            {/* Derivative Gain (Kd) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                  Derivative Gain (Kd)
                </label>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {kd.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="4.0"
                step="0.05"
                value={kd}
                onChange={(e) => {
                  playTick();
                  setKd(Number(e.target.value));
                }}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted block">
                Dampens oscillations & braking
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Challenges Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-bold">
            Interactive Actuator Challenges
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

      {/* Architecture Deep Dive & Engineering Principle Drawer */}
      <ExplanationDrawer module={moduleData} />
    </div>
  );
};
