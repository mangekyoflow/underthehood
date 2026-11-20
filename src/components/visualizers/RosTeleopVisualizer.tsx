import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Gamepad2,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Radio,
  Gauge,
  Terminal,
  Video,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import { ChallengeCard } from '../common/ChallengeCard';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { MODULES } from '../../data/modulesData';
import { RosQosReliability } from '../../types/actuate';
import clsx from 'clsx';

interface RosTeleopVisualizerProps {
  onChallengeComplete?: (id: string) => void;
  completedChallenges?: Record<string, boolean>;
}

interface SimulatedRosMessage {
  id: number;
  seq: number;
  topic: '/cmd_vel' | '/odom' | '/camera/compressed';
  source: 'teleop' | 'robot';
  timestamp: number;
  linearX: number;
  angularZ: number;
  status: 'in-flight' | 'delivered' | 'dropped' | 'queued';
  latencyMs: number;
}

export const RosTeleopVisualizer: React.FC<RosTeleopVisualizerProps> = ({
  onChallengeComplete,
  completedChallenges = {},
}) => {
  const moduleData = MODULES['ros2-teleoperation'];

  // Network & QoS Controls
  const [qosMode, setQosMode] = useState<RosQosReliability>('reliable');
  const [packetLossRate, setPacketLossRate] = useState<number>(18); // 0 to 25%
  const [networkLatency, setNetworkLatency] = useState<number>(45); // ms
  const [jitter, setJitter] = useState<number>(15); // ms
  const [historyDepth, setHistoryDepth] = useState<'KEEP_LAST_1' | 'KEEP_ALL'>('KEEP_ALL');

  // Teleop Joystick / Control Inputs
  const [linearVel, setLinearVel] = useState<number>(0);
  const [angularVel, setAngularVel] = useState<number>(0);

  // Robot Physical Simulation in 2D Arena
  const [robotPos, setRobotPos] = useState<{ x: number; y: number; theta: number }>({
    x: 150,
    y: 150,
    theta: 0,
  });
  const [targetGoal, setTargetGoal] = useState<{ x: number; y: number }>({ x: 280, y: 100 });

  // Telemetry Metrics
  const [packetsSent, setPacketsSent] = useState<number>(0);
  const [packetsDelivered, setPacketsDelivered] = useState<number>(0);
  const [packetsDropped, setPacketsDropped] = useState<number>(0);
  const [bufferbloatMs, setBufferbloatMs] = useState<number>(0);
  const [queueLength, setQueueLength] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Simulation Refs
  const simState = useRef({
    linearVel: 0,
    angularVel: 0,
    robotPos: { x: 150, y: 150, theta: 0 },
    commandQueue: [] as { linearX: number; angularZ: number; sendTime: number }[],
    seq: 0,
    lastTick: performance.now(),
    qos: 'reliable' as RosQosReliability,
    loss: 18,
    latency: 45,
    jitter: 15,
    history: 'KEEP_ALL' as 'KEEP_LAST_1' | 'KEEP_ALL',
    bufferbloat: 0,
    stableDriveDuration: 0,
  });

  // Sync ref
  useEffect(() => {
    simState.current.linearVel = linearVel;
    simState.current.angularVel = angularVel;
    simState.current.qos = qosMode;
    simState.current.loss = packetLossRate;
    simState.current.latency = networkLatency;
    simState.current.jitter = jitter;
    simState.current.history = historyDepth;
  }, [linearVel, angularVel, qosMode, packetLossRate, networkLatency, jitter, historyDepth]);

  // Command sender loop
  useEffect(() => {
    const timer = setInterval(() => {
      const s = simState.current;
      s.seq += 1;
      const currentSeq = s.seq;
      setPacketsSent((p) => p + 1);

      // Roll for packet drop
      const isDropped = Math.random() * 100 < s.loss;
      const actualLatency = Math.max(5, s.latency + (Math.random() - 0.5) * s.jitter * 2);

      if (isDropped) {
        setPacketsDropped((p) => p + 1);

        if (s.qos === 'reliable') {
          // Reliable QoS: Packet drop causes retransmission delay & queue buildup!
          const retransmitDelay = actualLatency * 2.5;
          s.bufferbloat += retransmitDelay * 0.4;
          if (s.bufferbloat > 400) s.bufferbloat = 400; // clamp bufferbloat

          setTimeout(() => {
            s.commandQueue.push({
              linearX: s.linearVel,
              angularZ: s.angularVel,
              sendTime: performance.now(),
            });
            setPacketsDelivered((p) => p + 1);
            setLogs((prev) => [
              `[WARN] cmd_vel #seq=${currentSeq} DROPPED on WiFi. Retransmitting via Reliable QoS (+${retransmitDelay.toFixed(0)}ms queue delay)...`,
              ...prev.slice(0, 15),
            ]);
          }, actualLatency + retransmitDelay);
        } else {
          // Best Effort / Zenoh: Drop silently, zero bufferbloat
          s.bufferbloat = Math.max(0, s.bufferbloat - 10);
          setLogs((prev) => [
            `[DROP] cmd_vel #seq=${currentSeq} discarded. Best-effort QoS: immediate unblock, zero bufferbloat.`,
            ...prev.slice(0, 15),
          ]);
        }
      } else {
        // Successful transmission
        setTimeout(() => {
          if (s.qos === 'best-effort' || s.qos === 'zenoh') {
            // Keep last 1 only
            s.commandQueue = [
              {
                linearX: s.linearVel,
                angularZ: s.angularVel,
                sendTime: performance.now(),
              },
            ];
            s.bufferbloat = 0;
          } else {
            // Reliable queues up
            s.commandQueue.push({
              linearX: s.linearVel,
              angularZ: s.angularVel,
              sendTime: performance.now(),
            });
            s.bufferbloat = Math.max(0, s.bufferbloat - 5);
          }
          setPacketsDelivered((p) => p + 1);
        }, actualLatency);
      }

      setBufferbloatMs(Math.round(s.bufferbloat));
      setQueueLength(s.commandQueue.length);
    }, 100); // 10 Hz control loop

    return () => clearInterval(timer);
  }, []);

  // Robot kinematic physics loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const s = simState.current;
      const cmd = s.commandQueue.shift();

      if (cmd) {
        // Execute command
        const dt = 0.05;
        const v = cmd.linearX * 35; // px/sec
        const w = cmd.angularZ * 2.2; // rad/sec

        s.robotPos.theta += w * dt;
        s.robotPos.x += v * Math.cos(s.robotPos.theta) * dt;
        s.robotPos.y += v * Math.sin(s.robotPos.theta) * dt;

        // Boundaries [20, 280]
        s.robotPos.x = Math.max(20, Math.min(280, s.robotPos.x));
        s.robotPos.y = Math.max(20, Math.min(280, s.robotPos.y));

        setRobotPos({ ...s.robotPos });

        // Challenge Evaluation:
        // Challenge 1: Packet drop > 15% with QoS set to Best Effort or Zenoh, maintain stable control without bufferbloat (>2.5s)
        if (s.loss >= 15 && (s.qos === 'best-effort' || s.qos === 'zenoh') && s.bufferbloat < 20) {
          s.stableDriveDuration += dt;
          if (
            s.stableDriveDuration > 2.0 &&
            onChallengeComplete &&
            !completedChallenges['challenge-ros2-1']
          ) {
            playSuccess();
            onChallengeComplete('challenge-ros2-1');
          }
        } else {
          s.stableDriveDuration = 0;
        }

        // Challenge 2: Eliminate bufferbloat under 30ms during high network jitter
        if (
          s.bufferbloat < 30 &&
          s.jitter >= 15 &&
          (s.qos === 'best-effort' || s.qos === 'zenoh') &&
          onChallengeComplete &&
          !completedChallenges['challenge-ros2-2']
        ) {
          onChallengeComplete('challenge-ros2-2');
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onChallengeComplete, completedChallenges]);

  // Directional buttons
  const setDirection = (lin: number, ang: number) => {
    playTick();
    setLinearVel(lin);
    setAngularVel(ang);
  };

  const handleResetRobot = () => {
    playTick();
    simState.current.robotPos = { x: 150, y: 150, theta: 0 };
    simState.current.commandQueue = [];
    simState.current.bufferbloat = 0;
    setRobotPos({ x: 150, y: 150, theta: 0 });
    setBufferbloatMs(0);
    setQueueLength(0);
    setLinearVel(0);
    setAngularVel(0);
  };

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                DISTRIBUTED ROBOTICS
              </span>
              <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
                ROS 2 DDS &amp; ZENOH MIDDLEWARE
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
              ROS 2 &amp; Zenoh Pub/Sub Teleoperation
            </h3>
            <p className="text-xs font-sans text-ink-muted dark:text-ink-darkMuted mt-1">
              Experience why Reliable TCP-style streams cause disastrous teleoperation lag over
              wireless networks, and how loss-tolerant Best-Effort QoS saves robotic control.
            </p>
          </div>

          <button
            onClick={handleResetRobot}
            className="btn-pop px-3 py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-800 hover:bg-parchment-100 dark:hover:bg-parchment-700 text-ink-light dark:text-ink-dark font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-xs self-start md:self-auto transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Pose</span>
          </button>
        </div>

        {/* Telemetry KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-6">
          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Active QoS Policy
            </div>
            <div className="text-base font-bold text-ink-light dark:text-ink-dark uppercase mt-0.5">
              {qosMode}
            </div>
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted mt-0.5">
              {qosMode === 'reliable'
                ? 'RELIABLE (TCP-like)'
                : qosMode === 'best-effort'
                  ? 'BEST_EFFORT (UDP)'
                  : 'ZENOH Peer-to-Peer'}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Bufferbloat Latency
            </div>
            <div
              className={clsx(
                'text-lg font-bold flex items-baseline gap-1 mt-0.5',
                bufferbloatMs > 60
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              <span>+{bufferbloatMs}</span>
              <span className="text-xs text-ink-muted">ms</span>
            </div>
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted mt-0.5">
              Queue depth: {queueLength} pkts
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Packet Drop Ratio
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-baseline gap-1 mt-0.5">
              <span>{packetLossRate}%</span>
            </div>
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted mt-0.5">
              Dropped: {packetsDropped} / {packetsSent}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/70 dark:bg-parchment-950/60 font-mono">
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
              Teleop Latency (RTT)
            </div>
            <div className="text-lg font-bold text-sky-600 dark:text-sky-400 flex items-baseline gap-1 mt-0.5">
              <span>{networkLatency + bufferbloatMs}</span>
              <span className="text-xs text-ink-muted">ms</span>
            </div>
            <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted mt-0.5">
              Base: {networkLatency}ms ± {jitter}ms
            </div>
          </div>
        </div>

        {/* Interactive Distributed Node Graph Architecture Canvas */}
        <div className="p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950/60 shadow-xs mb-6 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                ROS 2 &amp; ZENOH PUB/SUB TOPOLOGY &amp; WIRELESS PACKET FLOW
              </span>
            </div>
            {/* Quick Interactive Scenario Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-ink-muted">QoS Mode:</span>
              <button
                onClick={() => {
                  playTick();
                  setQosMode('reliable');
                  setHistoryDepth('KEEP_ALL');
                }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                  qosMode === 'reliable'
                    ? 'border-rose-400 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                Reliable (Bufferbloat)
              </button>
              <button
                onClick={() => {
                  playTick();
                  setQosMode('best-effort');
                  setHistoryDepth('KEEP_LAST_1');
                }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                  qosMode === 'best-effort'
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                Best Effort (Realtime)
              </button>
              <button
                onClick={() => {
                  playTick();
                  setQosMode('zenoh');
                  setHistoryDepth('KEEP_LAST_1');
                }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                  qosMode === 'zenoh'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 text-ink-muted'
                )}
              >
                Zenoh Zero-Copy
              </button>
            </div>
          </div>

          {/* SVG Living Topology Diagram */}
          <div className="w-full bg-slate-900/90 rounded-xl p-3 border border-slate-800 relative overflow-hidden select-none">
            <svg viewBox="0 0 760 190" className="w-full h-auto drop-shadow-sm">
              <defs>
                <marker
                  id="ros-arrow-blue"
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
                  id="ros-arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
                </marker>
                <marker
                  id="ros-arrow-purple"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#a855f7" />
                </marker>
                {/* Dynamic path lines for animateMotion */}
                <path id="path-cmd-forward" d="M 180 55 L 245 55 L 485 55 L 550 55" />
                <path id="path-odom-return" d="M 550 100 L 485 100 L 245 100 L 180 100" />
                <path id="path-video-return" d="M 550 145 L 485 145 L 245 145 L 180 145" />
              </defs>

              {/* Connecting Stream Lines */}
              {/* Forward: /cmd_vel */}
              <line
                x1="180"
                y1="55"
                x2="245"
                y2="55"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <line
                x1="485"
                y1="55"
                x2="545"
                y2="55"
                stroke="#38bdf8"
                strokeWidth="2"
                markerEnd="url(#ros-arrow-blue)"
              />
              {/* Return: /odom */}
              <line
                x1="550"
                y1="100"
                x2="485"
                y2="100"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <line
                x1="245"
                y1="100"
                x2="185"
                y2="100"
                stroke="#10b981"
                strokeWidth="2"
                markerEnd="url(#ros-arrow-emerald)"
              />
              {/* Return: /camera/compressed */}
              <line
                x1="550"
                y1="145"
                x2="485"
                y2="145"
                stroke="#a855f7"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <line
                x1="245"
                y1="145"
                x2="185"
                y2="145"
                stroke="#a855f7"
                strokeWidth="2"
                markerEnd="url(#ros-arrow-purple)"
              />

              {/* Moving Packets via animateMotion */}
              <circle r="3.5" fill="#38bdf8">
                <animateMotion
                  dur={qosMode === 'reliable' ? '2.4s' : '1.2s'}
                  repeatCount="indefinite"
                >
                  <mpath href="#path-cmd-forward" />
                </animateMotion>
              </circle>
              <circle r="3" fill="#10b981">
                <animateMotion dur="1.5s" repeatCount="indefinite">
                  <mpath href="#path-odom-return" />
                </animateMotion>
              </circle>
              <circle r="3" fill="#a855f7">
                <animateMotion dur="1.8s" repeatCount="indefinite">
                  <mpath href="#path-video-return" />
                </animateMotion>
              </circle>

              {/* NODE 1: Operator Station */}
              <g transform="translate(15, 20)">
                <rect
                  width="170"
                  height="150"
                  rx="8"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <rect width="170" height="26" rx="8" fill="#1e293b" />
                <text x="10" y="17" fontSize="10" fontWeight="bold" fill="#38bdf8">
                  OPERATOR STATION
                </text>
                <text x="10" y="42" fontSize="9" fontWeight="bold" fill="#ffffff">
                  /teleop_joy_node
                </text>
                <text x="10" y="56" fontSize="8" fill="#94a3b8">
                  Pub: /cmd_vel (10Hz)
                </text>

                {/* Subscribed feeds info */}
                <line x1="10" y1="68" x2="160" y2="68" stroke="#334155" strokeWidth="1" />
                <text x="10" y="85" fontSize="8" fill="#10b981">
                  Sub: /odom [x,y,θ]
                </text>
                <text x="10" y="98" fontSize="8" fill="#a855f7">
                  Sub: /camera/compressed
                </text>

                {/* Joystick command snapshot badge */}
                <g transform="translate(10, 110)">
                  <rect
                    width="150"
                    height="28"
                    rx="4"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text x="8" y="13" fontSize="8" fill="#94a3b8">
                    Cmd: lin_x={linearVel.toFixed(1)} ang_z={angularVel.toFixed(1)}
                  </text>
                  <text
                    x="8"
                    y="23"
                    fontSize="7"
                    fill={linearVel !== 0 || angularVel !== 0 ? '#38bdf8' : '#64748b'}
                  >
                    {linearVel !== 0 || angularVel !== 0
                      ? '● Active Motor Drive'
                      : '○ Standby Idle'}
                  </text>
                </g>
              </g>

              {/* NODE 2: Wireless Broker & DDS / Zenoh Middleware */}
              <g transform="translate(245, 20)">
                <rect
                  width="240"
                  height="150"
                  rx="8"
                  fill="#0f172a"
                  stroke={bufferbloatMs > 50 ? '#ef4444' : '#f59e0b'}
                  strokeWidth={bufferbloatMs > 50 ? '2' : '1.5'}
                />
                <rect width="240" height="26" rx="8" fill="#1e293b" />
                <text x="10" y="17" fontSize="10" fontWeight="bold" fill="#f59e0b">
                  {qosMode === 'zenoh' ? 'ZENOH PEER ROUTER' : 'ROS 2 DDS MIDDLEWARE'}
                </text>

                <text x="10" y="44" fontSize="9" fill="#ffffff" fontWeight="bold">
                  QoS:{' '}
                  {qosMode === 'reliable'
                    ? 'RELIABLE (TCP-like)'
                    : qosMode === 'best-effort'
                      ? 'BEST_EFFORT (UDP)'
                      : 'ZENOH PEER-TO-PEER'}
                </text>
                <text x="10" y="58" fontSize="8" fill="#94a3b8">
                  Loss: {packetLossRate}% | Latency: {networkLatency}ms ± {jitter}ms
                </text>

                {/* In-Flight Packet Queue Inspector */}
                <g transform="translate(10, 72)">
                  <rect
                    width="220"
                    height="66"
                    rx="6"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text x="8" y="15" fontSize="8" fontWeight="bold" fill="#94a3b8">
                    COMMAND QUEUE BUFFER
                  </text>
                  <text
                    x="160"
                    y="15"
                    fontSize="8"
                    fontWeight="bold"
                    fill={bufferbloatMs > 50 ? '#ef4444' : '#10b981'}
                  >
                    Depth: {queueLength}
                  </text>

                  {/* Visual packet blocks */}
                  <g transform="translate(8, 24)">
                    {Array.from({ length: 8 }).map((_, idx) => {
                      const isOccupied = idx < queueLength;
                      return (
                        <rect
                          key={idx}
                          x={idx * 25}
                          y="0"
                          width="21"
                          height="18"
                          rx="3"
                          fill={
                            isOccupied ? (bufferbloatMs > 50 ? '#ef4444' : '#38bdf8') : '#0f172a'
                          }
                          stroke="#475569"
                          strokeWidth="0.8"
                        />
                      );
                    })}
                  </g>

                  <text x="8" y="55" fontSize="8" fill={bufferbloatMs > 50 ? '#f87171' : '#94a3b8'}>
                    {bufferbloatMs > 50
                      ? `⚠ Bufferbloat: +${bufferbloatMs}ms retransmission lag!`
                      : '✓ Zero head-of-line blocking (Realtime)'}
                  </text>
                </g>
              </g>

              {/* NODE 3: Robot Embedded Controller */}
              <g transform="translate(545, 20)">
                <rect
                  width="200"
                  height="150"
                  rx="8"
                  fill="#0f172a"
                  stroke="#10b981"
                  strokeWidth="1.5"
                />
                <rect width="200" height="26" rx="8" fill="#1e293b" />
                <text x="10" y="17" fontSize="10" fontWeight="bold" fill="#10b981">
                  ROBOT ONBOARD SYSTEM
                </text>
                <text x="10" y="42" fontSize="9" fontWeight="bold" fill="#ffffff">
                  /diff_drive_controller
                </text>
                <text x="10" y="56" fontSize="8" fill="#94a3b8">
                  Sub: /cmd_vel → Motor PWM
                </text>

                <line x1="10" y1="68" x2="190" y2="68" stroke="#334155" strokeWidth="1" />
                <text x="10" y="85" fontSize="8" fill="#10b981">
                  Pub: /odom [20 Hz Wheel Ticks]
                </text>
                <text x="10" y="98" fontSize="8" fill="#a855f7">
                  Pub: /camera/compressed [30fps]
                </text>

                {/* Robot Pose Readout */}
                <g transform="translate(10, 110)">
                  <rect
                    width="180"
                    height="28"
                    rx="4"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text x="8" y="13" fontSize="8" fill="#94a3b8">
                    Pose: x={robotPos.x.toFixed(0)}, y={robotPos.y.toFixed(0)}
                  </text>
                  <text x="8" y="23" fontSize="7" fill="#10b981">
                    Heading: {((robotPos.theta * 180) / Math.PI).toFixed(0)}° (Ackermann/Diff)
                  </text>
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Interactive Teleop Arena & Joystick Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 2D Simulation Arena (7 cols) */}
          <div className="lg:col-span-7 p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 flex flex-col items-center justify-center relative">
            <div className="w-full flex items-center justify-between text-xs font-mono mb-2 text-ink-muted">
              <span>ROBOT TELEOPERATION ARENA (2D POSE)</span>
              <span>θ = {((robotPos.theta * 180) / Math.PI).toFixed(0)}°</span>
            </div>

            {/* Arena SVG Canvas */}
            <div className="w-full h-56 sm:h-64 bg-white dark:bg-parchment-900 rounded-xl border border-parchment-200 dark:border-parchment-800 relative overflow-hidden">
              <svg viewBox="0 0 300 300" className="w-full h-full">
                {/* Arena Grid */}
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path
                      d="M 30 0 L 0 0 0 30"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-parchment-200 dark:text-parchment-800"
                    />
                  </pattern>
                </defs>
                <rect width="300" height="300" fill="url(#grid)" />

                {/* Target waypoint marker */}
                <circle
                  cx={targetGoal.x}
                  cy={targetGoal.y}
                  r="14"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
                <circle cx={targetGoal.x} cy={targetGoal.y} r="4" fill="#10b981" />
                <text
                  x={targetGoal.x - 18}
                  y={targetGoal.y - 18}
                  fontSize="9"
                  fill="#10b981"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  TARGET GOAL
                </text>

                {/* Robot Mobile Base */}
                <g
                  transform={`translate(${robotPos.x}, ${robotPos.y}) rotate(${(robotPos.theta * 180) / Math.PI})`}
                >
                  {/* Robot Body */}
                  <rect
                    x="-16"
                    y="-12"
                    width="32"
                    height="24"
                    rx="4"
                    fill="#3b82f6"
                    stroke="#1d4ed8"
                    strokeWidth="2"
                  />
                  {/* Left & Right Treads/Wheels */}
                  <rect x="-14" y="-16" width="28" height="5" rx="1.5" fill="#1e293b" />
                  <rect x="-14" y="11" width="28" height="5" rx="1.5" fill="#1e293b" />
                  {/* Heading Arrow Pointer */}
                  <polygon points="12,0 4,-5 4,5" fill="#ffffff" />
                  {/* LiDAR sensor hub */}
                  <circle cx="0" cy="0" r="5" fill="#0f172a" />
                  <circle cx="0" cy="0" r="2" fill="#ef4444" className="animate-ping" />
                </g>
              </svg>

              {/* Bufferbloat overlay banner when lag is severe */}
              {bufferbloatMs > 60 && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-rose-500/90 text-white font-mono text-[10px] font-bold flex items-center gap-1 shadow-sm">
                  <AlertTriangle className="w-3 h-3" />
                  <span>BUFFERBLOAT LAG (+{bufferbloatMs}ms DELAYED EXECUTION)</span>
                </div>
              )}
            </div>

            <div className="w-full flex items-center justify-between text-[11px] font-mono text-ink-muted mt-2">
              <span>
                Pos: [{robotPos.x.toFixed(0)}, {robotPos.y.toFixed(0)}]
              </span>
              <span
                className={clsx(
                  'font-bold',
                  bufferbloatMs < 30 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {bufferbloatMs < 30 ? '● Real-Time Responsiveness' : '⚠ Delayed Runaway Risk'}
              </span>
            </div>
          </div>

          {/* Right: Tactile D-Pad & QoS Tuning (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 space-y-4">
            <div>
              <span className="text-xs font-mono font-bold text-ink-muted uppercase block mb-3">
                Tactile Teleop Controls
              </span>

              {/* D-Pad Buttons */}
              <div className="flex flex-col items-center gap-2 select-none touch-manipulation">
                <button
                  onMouseDown={() => setDirection(1.2, 0)}
                  onMouseUp={() => setDirection(0, 0)}
                  onTouchStart={() => setDirection(1.2, 0)}
                  onTouchEnd={() => setDirection(0, 0)}
                  className="w-14 h-12 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-850 hover:bg-parchment-100 dark:hover:bg-parchment-700 text-ink-light dark:text-ink-dark flex items-center justify-center font-mono font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all touch-manipulation"
                  title="Forward"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onMouseDown={() => setDirection(0.4, -1.8)}
                    onMouseUp={() => setDirection(0, 0)}
                    onTouchStart={() => setDirection(0.4, -1.8)}
                    onTouchEnd={() => setDirection(0, 0)}
                    className="w-14 h-12 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-850 hover:bg-parchment-100 dark:hover:bg-parchment-700 text-ink-light dark:text-ink-dark flex items-center justify-center font-mono font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all touch-manipulation"
                    title="Turn Left"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDirection(0, 0)}
                    className="w-14 h-12 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-mono font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all touch-manipulation"
                    title="Emergency Stop"
                  >
                    STOP
                  </button>

                  <button
                    onMouseDown={() => setDirection(0.4, 1.8)}
                    onMouseUp={() => setDirection(0, 0)}
                    onTouchStart={() => setDirection(0.4, 1.8)}
                    onTouchEnd={() => setDirection(0, 0)}
                    className="w-14 h-12 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-850 hover:bg-parchment-100 dark:hover:bg-parchment-700 text-ink-light dark:text-ink-dark flex items-center justify-center font-mono font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all touch-manipulation"
                    title="Turn Right"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onMouseDown={() => setDirection(-1.0, 0)}
                  onMouseUp={() => setDirection(0, 0)}
                  onTouchStart={() => setDirection(-1.0, 0)}
                  onTouchEnd={() => setDirection(0, 0)}
                  className="w-14 h-12 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-850 hover:bg-parchment-100 dark:hover:bg-parchment-700 text-ink-light dark:text-ink-dark flex items-center justify-center font-mono font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all touch-manipulation"
                  title="Reverse"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* QoS Mode Selector */}
            <div className="pt-3 border-t border-parchment-200 dark:border-parchment-800 font-mono text-xs">
              <label className="text-ink-muted dark:text-ink-darkMuted font-bold block mb-1.5">
                QoS Profile Selection
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    playTick();
                    setQosMode('reliable');
                  }}
                  className={clsx(
                    'px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer text-[11px] font-semibold',
                    qosMode === 'reliable'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-300 shadow-xs'
                      : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  Reliable
                </button>

                <button
                  onClick={() => {
                    playTick();
                    setQosMode('best-effort');
                  }}
                  className={clsx(
                    'px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer text-[11px] font-semibold',
                    qosMode === 'best-effort'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shadow-xs'
                      : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  Best Effort
                </button>

                <button
                  onClick={() => {
                    playTick();
                    setQosMode('zenoh');
                  }}
                  className={clsx(
                    'px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer text-[11px] font-semibold',
                    qosMode === 'zenoh'
                      ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-xs'
                      : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted'
                  )}
                >
                  Zenoh Stream
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sliders: Packet Loss & Jitter */}
        <div className="mt-6 pt-6 border-t border-parchment-200 dark:border-parchment-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 font-mono text-xs">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                Network Packet Drop
              </label>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {packetLossRate}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={packetLossRate}
              onChange={(e) => {
                playTick();
                setPacketLossRate(Number(e.target.value));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-ink-muted block">
              Simulates wireless Wi-Fi / cellular drop
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                Link Latency
              </label>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {networkLatency} ms
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={networkLatency}
              onChange={(e) => {
                playTick();
                setNetworkLatency(Number(e.target.value));
              }}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <span className="text-[10px] text-ink-muted block">Propagation round-trip delay</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-ink-muted dark:text-ink-darkMuted font-bold">
                Jitter Variance
              </label>
              <span className="font-bold text-purple-600 dark:text-purple-400">±{jitter} ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="2"
              value={jitter}
              onChange={(e) => {
                playTick();
                setJitter(Number(e.target.value));
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <span className="text-[10px] text-ink-muted block">
              Packet arrival timing inconsistency
            </span>
          </div>
        </div>

        {/* Live Packet Log Console */}
        <div className="mt-5 p-3 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 font-mono text-[11px] text-ink-muted">
          <div className="flex items-center justify-between mb-1 text-[10px] font-bold uppercase text-ink-light dark:text-ink-dark">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-500" />
              ROS 2 Teleop Message Telemetry Log
            </span>
            <span className="text-ink-muted">{logs.length} events</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {logs.length === 0 ? (
              <span className="text-ink-muted italic">
                Press D-pad buttons to transmit velocity commands across the network...
              </span>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="truncate">
                  {l}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Interactive Challenges Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-bold">
            Interactive Teleoperation Challenges
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
