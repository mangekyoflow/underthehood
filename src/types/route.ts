export type DnsCacheStatus = 'none' | 'browser-hit' | 'os-hit' | 'full-miss';

export interface UrlLifecycleStep {
  id: number;
  phase: 'DNS' | 'TCP' | 'TLS' | 'HTTP' | 'RENDER';
  title: string;
  shortLabel: string;
  sourceNode: string;
  targetNode: string;
  protocol: 'UDP' | 'TCP' | 'TLS 1.3' | 'HTTP/1.1' | 'HTTP/2' | 'DOM/Engine';
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  packetSummary: string;
  packetHeaders: Record<string, string>;
  packetPayload?: string;
  explanation: string;
  latencyMs: number;
  isReturnTrip?: boolean;
}

export type TcpAlgorithm = 'reno' | 'cubic' | 'bbr';

export type RenoState = 'SLOW_START' | 'CONGESTION_AVOIDANCE' | 'FAST_RECOVERY' | 'TIMEOUT';
export type CubicState = 'SLOW_START' | 'STEADY_CONCAVE' | 'PROBING_CONVEX' | 'FAST_RECOVERY';
export type BbrState = 'STARTUP' | 'DRAIN' | 'PROBE_BW' | 'PROBE_RTT';

export interface TcpPacket {
  id: number;
  seq: number;
  status: 'in-flight' | 'queued' | 'delivered' | 'dropped';
  position: number; // 0 to 100%
  timestamp: number;
}

export interface TcpSimPoint {
  time: number; // RTT ticks
  renoCwnd: number;
  renoSsthresh: number;
  renoThroughput: number;
  renoQueue: number;
  cubicCwnd: number;
  cubicThroughput: number;
  cubicQueue: number;
  bbrCwnd: number;
  bbrPacingRate: number;
  bbrThroughput: number;
  bbrQueue: number;
  bbrBtlBw: number;
  bbrMinRtt: number;
  eventDescription?: string;
}

export interface HttpResource {
  id: string;
  name: string;
  type: 'html' | 'css' | 'js' | 'image' | 'api';
  sizeKb: number;
  priority: 'highest' | 'high' | 'medium' | 'low';
}

export interface HttpProtocolStream {
  resourceId: string;
  bytesTotal: number;
  bytesReceived: number;
  state: 'waiting' | 'connecting' | 'transferring' | 'blocked' | 'completed' | 'failed';
  blockedReason?: string;
  packetDrops: number;
}

export interface HttpLaneState {
  protocol: 'HTTP/1.1' | 'HTTP/2' | 'HTTP/3';
  activeConnections: number;
  maxConcurrentStreams: number;
  streams: Record<string, HttpProtocolStream>;
  elapsedMs: number;
  totalTransferredBytes: number;
  roundTrips: number;
  isFinished: boolean;
  holBlockingTimeMs: number;
  isStalled: boolean;
}
