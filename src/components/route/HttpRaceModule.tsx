import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  Smartphone,
} from 'lucide-react';
import { MODULES } from '../../data/modulesData';
import { HttpResource, HttpLaneState } from '../../types/route';
import { Badge } from '../common/Badge';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { ChallengeCard } from '../common/ChallengeCard';
import { TerminalLog, LogEntry } from '../common/TerminalLog';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import clsx from 'clsx';

const SAMPLE_RESOURCES: HttpResource[] = [
  { id: 'res-html', name: 'index.html', type: 'html', sizeKb: 40, priority: 'highest' },
  { id: 'res-css1', name: 'design-system.css', type: 'css', sizeKb: 80, priority: 'high' },
  { id: 'res-css2', name: 'components.css', type: 'css', sizeKb: 60, priority: 'high' },
  { id: 'res-js1', name: 'react-core.js', type: 'js', sizeKb: 140, priority: 'highest' },
  {
    id: 'res-js2',
    name: 'app-engine.js',
    type: 'js',
    typeStr: 'js',
    sizeKb: 120,
    priority: 'high',
  } as unknown as HttpResource,
  { id: 'res-img1', name: 'hero-banner.webp', type: 'image', sizeKb: 250, priority: 'medium' },
  { id: 'res-img2', name: 'diagram-route.svg', type: 'image', sizeKb: 110, priority: 'low' },
  { id: 'res-img3', name: 'diagram-query.svg', type: 'image', sizeKb: 110, priority: 'low' },
  { id: 'res-api', name: 'telemetry-stream.json', type: 'api', sizeKb: 50, priority: 'high' },
];

interface HttpRaceModuleProps {
  onChallengeComplete: (id: string) => void;
  completedChallenges: Record<string, boolean>;
}

export const HttpRaceModule: React.FC<HttpRaceModuleProps> = ({
  onChallengeComplete,
  completedChallenges,
}) => {
  const moduleData = MODULES['http-race'];

  // Simulation Controls
  const [latencyMs, setLatencyMs] = useState(50); // RTT
  const [packetLossTarget, setPacketLossTarget] = useState<string | null>(null);
  const [isMigratingNetwork, setIsMigratingNetwork] = useState(false);
  const [currentNetworkType, setCurrentNetworkType] = useState<'WIFI' | 'CELLULAR_5G'>('WIFI');
  const [clientIp, setClientIp] = useState('192.168.1.105');
  const [showFrameInspector, setShowFrameInspector] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Initial Lane Builder
  const createInitialLane = (protocol: 'HTTP/1.1' | 'HTTP/2' | 'HTTP/3'): HttpLaneState => ({
    protocol,
    activeConnections: protocol === 'HTTP/1.1' ? 6 : 1,
    maxConcurrentStreams: protocol === 'HTTP/1.1' ? 6 : 100,
    streams: Object.fromEntries(
      SAMPLE_RESOURCES.map((r) => [
        r.id,
        {
          resourceId: r.id,
          bytesTotal: r.sizeKb * 1024,
          bytesReceived: 0,
          state: 'waiting',
          packetDrops: 0,
        },
      ])
    ),
    elapsedMs: 0,
    totalTransferredBytes: 0,
    roundTrips: 0,
    isFinished: false,
    holBlockingTimeMs: 0,
    isStalled: false,
  });

  const [h1State, setH1State] = useState<HttpLaneState>(() => createInitialLane('HTTP/1.1'));
  const [h2State, setH2State] = useState<HttpLaneState>(() => createInitialLane('HTTP/2'));
  const [h3State, setH3State] = useState<HttpLaneState>(() => createInitialLane('HTTP/3'));

  const handleReset = () => {
    setIsPlaying(false);
    setRaceFinished(false);
    setPacketLossTarget(null);
    setIsMigratingNetwork(false);
    setCurrentNetworkType('WIFI');
    setClientIp('192.168.1.105');
    setH1State(createInitialLane('HTTP/1.1'));
    setH2State(createInitialLane('HTTP/2'));
    setH3State(createInitialLane('HTTP/3'));
    setLogs([]);
  };

  // Inject Packet Loss Event
  const handleDropPacket = (targetId: string = 'res-css1') => {
    playAlert();
    setPacketLossTarget(targetId);

    setLogs((prev) => [
      ...prev,
      {
        id: `loss-${Date.now()}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        level: 'error',
        category: 'PACKET-DROP',
        message: `PACKET DROP on stream "${targetId}". HTTP/2 TCP pipeline halts! QUIC HTTP/3 isolates loss to that single stream.`,
      },
    ]);

    onChallengeComplete('challenge-http-1');
  };

  // Mobile Roaming (Wi-Fi to 5G IP change)
  const handleMigrateNetwork = () => {
    playAlert();
    setIsMigratingNetwork(true);
    const newIp = currentNetworkType === 'WIFI' ? '172.56.21.84' : '192.168.1.105';
    const nextType = currentNetworkType === 'WIFI' ? 'CELLULAR_5G' : 'WIFI';
    setClientIp(newIp);
    setCurrentNetworkType(nextType);

    setLogs((prev) => [
      ...prev,
      {
        id: `mig-${Date.now()}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        level: 'warn',
        category: 'ROAMING',
        message: `Client IP changed to ${newIp} (${nextType}). HTTP/1.1 & HTTP/2 TCP sockets RST & broken! HTTP/3 migrates via 64-bit Connection ID seamlessly.`,
      },
    ]);

    onChallengeComplete('challenge-http-2');
  };

  // Stop race when moving out of the browser tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Simulation tick loop
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    if (isPlaying && !raceFinished) {
      timer = setInterval(() => {
        const stepLane = (lane: HttpLaneState): HttpLaneState => {
          if (lane.isFinished) return lane;

          const updatedStreams = { ...lane.streams };
          let totalBytes = 0;
          let allDone = true;
          let holStall = lane.holBlockingTimeMs;
          let isStalled = false;
          const elapsed = lane.elapsedMs + 25;

          const activeKeys = Object.keys(updatedStreams);

          if (isMigratingNetwork && (lane.protocol === 'HTTP/1.1' || lane.protocol === 'HTTP/2')) {
            isStalled = true;
            holStall += 25;
          }

          if (packetLossTarget && lane.protocol === 'HTTP/2') {
            const targetStream = updatedStreams[packetLossTarget];
            if (
              targetStream &&
              targetStream.bytesReceived < targetStream.bytesTotal &&
              targetStream.packetDrops < 2
            ) {
              isStalled = true;
              holStall += 25;
              targetStream.state = 'blocked';
              targetStream.blockedReason = 'TCP byte-stream hole: retransmitting segment';
              targetStream.packetDrops += 0.15;
            }
          }

          activeKeys.forEach((key, idx) => {
            const stream = updatedStreams[key];
            if (stream.bytesReceived >= stream.bytesTotal) {
              stream.state = 'completed';
              totalBytes += stream.bytesTotal;
              return;
            }

            allDone = false;

            if (
              lane.protocol === 'HTTP/1.1' &&
              idx >= 6 &&
              updatedStreams[activeKeys[0]].state !== 'completed'
            ) {
              stream.state = 'waiting';
              stream.blockedReason = 'Waiting for 1 of 6 TCP sockets to free up';
              return;
            }

            if (lane.protocol === 'HTTP/2' && isStalled) {
              stream.state = 'blocked';
              stream.blockedReason = 'Blocked by TCP in-order buffer delay on stream 2';
              return;
            }

            if (lane.protocol === 'HTTP/3' && packetLossTarget === key && stream.packetDrops < 2) {
              stream.state = 'blocked';
              stream.blockedReason = 'QUIC recovering lost stream packet independently';
              stream.packetDrops += 0.25;
              return;
            }

            const speedChunk =
              1024 * (lane.protocol === 'HTTP/3' ? 18 : lane.protocol === 'HTTP/2' ? 14 : 12);
            stream.state = 'transferring';
            stream.bytesReceived = Math.min(stream.bytesTotal, stream.bytesReceived + speedChunk);
            totalBytes += stream.bytesReceived;
          });

          return {
            ...lane,
            elapsedMs: elapsed,
            streams: updatedStreams,
            totalTransferredBytes: totalBytes,
            roundTrips: Math.floor(elapsed / latencyMs),
            isFinished: allDone,
            holBlockingTimeMs: holStall,
            isStalled,
          };
        };

        setH1State((prev) => stepLane(prev));
        setH2State((prev) => stepLane(prev));
        setH3State((prev) => stepLane(prev));
      }, 50);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, raceFinished, latencyMs, packetLossTarget, isMigratingNetwork]);

  // Check race finish
  useEffect(() => {
    if (h1State.isFinished && h2State.isFinished && h3State.isFinished && !raceFinished) {
      setRaceFinished(true);
      setIsPlaying(false);
      playSuccess();
      onChallengeComplete('challenge-http-2');
    }
  }, [
    h1State.isFinished,
    h2State.isFinished,
    h3State.isFinished,
    raceFinished,
    onChallengeComplete,
  ]);

  // Render Protocol Lane Component
  const renderLane = (lane: HttpLaneState, accent: 'cyan' | 'purple' | 'amber') => {
    const totalResourceBytes = SAMPLE_RESOURCES.reduce((acc, r) => acc + r.sizeKb * 1024, 0);
    const overallProgress = Math.min(
      100,
      Math.round((lane.totalTransferredBytes / totalResourceBytes) * 100)
    );

    return (
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 space-y-3 shadow-xs">
        {/* Lane Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={accent === 'cyan' ? 'cyan' : accent === 'purple' ? 'purple' : 'amber'}>
              {lane.protocol}
            </Badge>
            <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
              {lane.protocol === 'HTTP/1.1'
                ? '6 Parallel TCP Sockets'
                : lane.protocol === 'HTTP/2'
                  ? '1 TCP Stream Multiplexed'
                  : 'QUIC over UDP (Independent Streams)'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            {lane.isStalled && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isMigratingNetwork ? 'SOCKET RESET (IP CHANGE)!' : 'TCP HoL BLOCKED!'}</span>
              </span>
            )}
            <span className="text-ink-light dark:text-ink-dark font-bold">{lane.elapsedMs} ms</span>
            {lane.isFinished && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>FINISHED</span>
              </span>
            )}
          </div>
        </div>

        {/* Overall Race Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted">
            <span>
              Overall Transferred: {(lane.totalTransferredBytes / 1024).toFixed(0)} KB /{' '}
              {(totalResourceBytes / 1024).toFixed(0)} KB
            </span>
            <span className="font-bold text-ink-light dark:text-ink-dark">{overallProgress}%</span>
          </div>
          <div className="h-2 w-full bg-parchment-200 dark:bg-parchment-800 rounded-full border border-parchment-300/70 dark:border-parchment-700 overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all duration-150 rounded-full',
                accent === 'cyan'
                  ? 'bg-cyan-500'
                  : accent === 'purple'
                    ? 'bg-purple-500'
                    : 'bg-amber-500',
                lane.isStalled && 'bg-rose-500 animate-pulse'
              )}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Individual Multiplexed Stream Slots */}
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 pt-1">
          {SAMPLE_RESOURCES.map((res) => {
            const stream = lane.streams[res.id];
            const pct = stream ? Math.round((stream.bytesReceived / stream.bytesTotal) * 100) : 0;
            const isBlocked = stream?.state === 'blocked';
            const isCompleted = stream?.state === 'completed';

            return (
              <div
                key={res.id}
                className={clsx(
                  'p-1.5 rounded-lg border text-[10px] font-mono flex flex-col justify-between transition-colors shadow-2xs',
                  isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : isBlocked
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 animate-pulse font-bold'
                      : stream?.state === 'transferring'
                        ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 font-semibold'
                        : 'border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 text-ink-muted dark:text-ink-darkMuted'
                )}
                title={stream?.blockedReason || `${res.name} (${pct}%)`}
              >
                <div className="truncate font-semibold">{res.name}</div>
                <div className="mt-1 flex items-center justify-between text-[9px]">
                  <span>{pct}%</span>
                  <span>{res.sizeKb}K</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title & Interactive Race Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="cyan">MODULE 03</Badge>
            <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted font-semibold">
              APPLICATION & TRANSPORT ARCHITECTURE
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight">
            HTTP/1.1 vs HTTP/2 vs HTTP/3
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl font-sans">
            {moduleData.tagline}
          </p>
        </div>

        {/* Interactive Action Deck */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              playTick();
              setIsPlaying(!isPlaying);
            }}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all shadow-xs cursor-pointer',
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            )}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isPlaying ? 'Pause Race' : raceFinished ? 'Restart Race' : 'Start Race'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors cursor-pointer"
            title="Reset Race"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Packet Loss Injection Button */}
          <button
            onClick={() => handleDropPacket('res-css1')}
            disabled={!isPlaying && !raceFinished}
            className="px-3 py-2 rounded-xl text-xs font-mono bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer font-semibold disabled:opacity-40"
            title="Simulate losing a TCP packet on Stream #2 to expose Head-of-Line blocking"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Drop Packet (Stream 2)</span>
          </button>

          {/* Wi-Fi to 5G Connection Migration Button */}
          <button
            onClick={handleMigrateNetwork}
            className="px-3 py-2 rounded-xl text-xs font-mono bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer font-semibold"
            title="Simulate mobile client switching IP address from Wi-Fi to 5G Cellular"
          >
            {currentNetworkType === 'WIFI' ? (
              <Wifi className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            )}
            <span>Roam to {currentNetworkType === 'WIFI' ? '5G Cellular' : 'Wi-Fi'}</span>
          </button>

          <button
            onClick={() => setShowFrameInspector(!showFrameInspector)}
            className="px-3 py-2 rounded-xl border border-parchment-300 dark:border-parchment-700 bg-parchment-100 dark:bg-parchment-800 hover:bg-parchment-200 dark:hover:bg-parchment-700 text-xs font-mono text-ink-light dark:text-ink-dark transition-colors cursor-pointer font-semibold"
          >
            {showFrameInspector ? 'Hide Frames' : 'Binary Frames'}
          </button>
        </div>
      </div>

      {/* Roaming & Latency Control Bar */}
      <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-ink-muted dark:text-ink-darkMuted">Network Latency (RTT):</span>
          <span className="text-cyan-700 dark:text-cyan-300 font-bold">{latencyMs} ms</span>
          <input
            type="range"
            min="20"
            max="150"
            step="10"
            value={latencyMs}
            onChange={(e) => setLatencyMs(Number(e.target.value))}
            className="w-32 accent-cyan-600 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-ink-muted dark:text-ink-darkMuted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Active Client:{' '}
              <strong className="text-ink-light dark:text-ink-dark">{clientIp}</strong> (
              {currentNetworkType})
            </span>
          </span>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted hidden sm:inline">
            QUIC CID: 0x8a92f03b
          </span>
        </div>
      </div>

      {/* Binary Frame Wire Format Inspector (Collapsible) */}
      {showFrameInspector && (
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center justify-between text-ink-muted dark:text-ink-darkMuted border-b border-parchment-200 dark:border-parchment-800 pb-2">
            <span className="font-bold text-ink-light dark:text-ink-dark">
              BINARY FRAME WIRE FORMAT INSPECTOR
            </span>
            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-semibold">
              RFC 9113 (HTTP/2) & RFC 9114 (HTTP/3)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HTTP/2 Frame Structure */}
            <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 space-y-2">
              <span className="text-cyan-700 dark:text-cyan-300 font-semibold block">
                HTTP/2 Fixed Frame Header (9 Bytes)
              </span>
              <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
                <div className="p-1.5 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 col-span-2">
                  <span className="text-ink-muted dark:text-ink-darkMuted block">Length</span>
                  <span className="text-ink-light dark:text-ink-dark font-bold">24 bits</span>
                </div>
                <div className="p-1.5 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
                  <span className="text-ink-muted dark:text-ink-darkMuted block">Type</span>
                  <span className="text-cyan-700 dark:text-cyan-400 font-bold">8 bits</span>
                </div>
                <div className="p-1.5 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
                  <span className="text-ink-muted dark:text-ink-darkMuted block">Flags</span>
                  <span className="text-ink-light dark:text-ink-dark font-bold">8 bits</span>
                </div>
                <div className="p-1.5 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 col-span-4">
                  <span className="text-ink-muted dark:text-ink-darkMuted block">
                    R + Stream Identifier
                  </span>
                  <span className="text-purple-700 dark:text-purple-300 font-bold">
                    1 + 31 bits
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-ink-muted dark:text-ink-darkMuted font-sans">
                Stream ID routes frame payload into application state inside a single TCP byte
                stream.
              </p>
            </div>

            {/* HTTP/3 Frame Structure */}
            <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 space-y-2">
              <span className="text-purple-700 dark:text-purple-300 font-semibold block">
                HTTP/3 Variable-Length Frame Header
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-center">
                <div className="p-1.5 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
                  <span className="text-ink-muted dark:text-ink-darkMuted block">Type</span>
                  <span className="text-purple-700 dark:text-purple-300 font-bold">
                    VarInt (1-8 B)
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
                  <span className="text-ink-muted dark:text-ink-darkMuted block">Length</span>
                  <span className="text-purple-700 dark:text-purple-300 font-bold">
                    VarInt (1-8 B)
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 col-span-2">
                  <span className="text-ink-muted dark:text-ink-darkMuted block">Payload Data</span>
                  <span className="text-ink-light dark:text-ink-dark font-bold">
                    Directly inside independent QUIC stream
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-ink-muted dark:text-ink-darkMuted font-sans">
                Carried by QUIC transport packets. Packet loss on Stream A never halts Stream B
                parsing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Three Protocol Lanes */}
      <div className="space-y-4">
        {renderLane(h1State, 'amber')}
        {renderLane(h2State, 'cyan')}
        {renderLane(h3State, 'purple')}
      </div>

      {/* Side-by-Side Architectural Comparison Table */}
      <div className="rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 p-5 overflow-x-auto shadow-xs">
        <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted mb-3 font-semibold">
          Protocol Architectural Comparison & Trade-Offs
        </h4>
        <table className="w-full text-xs font-mono text-left">
          <thead>
            <tr className="border-b border-parchment-200 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted">
              <th className="pb-2">Architectural Dimension</th>
              <th className="pb-2 text-amber-700 dark:text-amber-400">HTTP/1.1</th>
              <th className="pb-2 text-cyan-700 dark:text-cyan-400">HTTP/2 (over TCP)</th>
              <th className="pb-2 text-purple-700 dark:text-purple-400">HTTP/3 (over QUIC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-parchment-200 dark:divide-parchment-800 text-ink-light dark:text-ink-dark">
            <tr>
              <td className="py-2.5 text-ink-muted dark:text-ink-darkMuted">Transport Layer</td>
              <td>TCP (Multiple Sockets)</td>
              <td>TCP (Single Socket)</td>
              <td className="text-purple-700 dark:text-purple-300 font-semibold">
                QUIC (UDP Datagrams)
              </td>
            </tr>
            <tr>
              <td className="py-2.5 text-ink-muted dark:text-ink-darkMuted">Multiplexing</td>
              <td>None (Sequential per socket)</td>
              <td>Binary Frames & Streams</td>
              <td>Independent QUIC Streams</td>
            </tr>
            <tr>
              <td className="py-2.5 text-ink-muted dark:text-ink-darkMuted">
                Head-of-Line Blocking
              </td>
              <td className="text-rose-600 dark:text-rose-400">Application HoL (FIFO)</td>
              <td className="text-rose-600 dark:text-rose-400">TCP Byte-Stream HoL</td>
              <td className="text-emerald-700 dark:text-emerald-400 font-semibold">
                ELIMINATED at Transport
              </td>
            </tr>
            <tr>
              <td className="py-2.5 text-ink-muted dark:text-ink-darkMuted">Handshake Latency</td>
              <td>2 RTT (TCP + TLS 1.2)</td>
              <td>2 RTT (TCP + TLS 1.2/1.3)</td>
              <td className="text-emerald-700 dark:text-emerald-400 font-semibold">
                1 RTT (or 0-RTT Reconnect)
              </td>
            </tr>
            <tr>
              <td className="py-2.5 text-ink-muted dark:text-ink-darkMuted">
                Connection Migration
              </td>
              <td className="text-rose-600 dark:text-rose-400">Socket reset on IP change</td>
              <td className="text-rose-600 dark:text-rose-400">Socket reset on IP change</td>
              <td className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Seamless via Connection ID
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Telemetry Log & Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalLog
          logs={logs}
          onClear={() => setLogs([])}
          title="PROTOCOL PACKET RACE LOG"
          maxHeight="max-h-56"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-semibold">
              Module Challenges
            </h4>
            <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold">
              Solve by racing & dropping packets
            </span>
          </div>

          {moduleData.challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              isCompleted={!!completedChallenges[c.id]}
              onComplete={onChallengeComplete}
              accentColor="network"
            />
          ))}
        </div>
      </div>

      {/* Explanation Drawer */}
      <ExplanationDrawer module={moduleData} />
    </div>
  );
};
