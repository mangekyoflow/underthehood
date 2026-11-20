export interface PidGains {
  kp: number;
  ki: number;
  kd: number;
}

export interface PidSample {
  time: number;
  setpoint: number;
  pv: number;
  error: number;
  pTerm: number;
  iTerm: number;
  dTerm: number;
  output: number;
}

export interface PidTelemetry {
  currentError: number;
  peakOvershootPct: number;
  steadyStateError: number;
  riseTimeMs: number;
  settlingTimeMs: number;
  isOscillating: boolean;
}

export type RosQosReliability = 'reliable' | 'best-effort' | 'zenoh';

export interface TeleopTelemetry {
  latencyMs: number;
  jitterMs: number;
  packetDropRate: number;
  queueDepth: number;
  bufferbloatMs: number;
  packetsSent: number;
  packetsLost: number;
  effectiveHz: number;
  armAngle: number;
  targetAngle: number;
}

export interface RosPacket {
  id: number;
  seq: number;
  type: 'cmd_vel' | 'odom' | 'video';
  timestamp: number;
  status: 'sent' | 'in-flight' | 'delivered' | 'dropped';
  payload: string;
}
