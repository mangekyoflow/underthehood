import { RenoState, CubicState, BbrState, TcpSimPoint } from '../../types/route';

export interface TcpConfig {
  bandwidthMbps: number; // 10 - 100 Mbps
  baselineRttMs: number; // 10 - 200 ms
  lossRatePct: number; // 0 - 15 %
  bufferCapacity: number; // 10 - 80 packets (MSS = 1500 bytes)
  crossTraffic: boolean; // Add intermittent external bursts
}

export interface TcpEngineState {
  timeTick: number; // Each tick = 1 RTT interval

  // TCP Reno state
  renoState: RenoState;
  renoCwnd: number; // In packets (MSS)
  renoSsthresh: number; // Slow start threshold
  renoQueue: number; // Current router buffer occupancy
  renoThroughput: number; // Mbps
  renoLostPackets: number;
  renoRetransmissions: number;

  // TCP Cubic state (Linux default)
  cubicState: CubicState;
  cubicCwnd: number;
  cubicWmax: number;
  cubicEpochTime: number; // elapsed RTTs since last loss
  cubicK: number; // time period required to reach Wmax
  cubicQueue: number;
  cubicThroughput: number;
  cubicLostPackets: number;

  // TCP BBR state (Google model-based)
  bbrState: BbrState;
  bbrCwnd: number; // In packets
  bbrBtlBw: number; // Estimated bottleneck bandwidth (Mbps)
  bbrMinRtt: number; // Estimated propagation delay (ms)
  bbrPacingRate: number; // Pacing rate (Mbps)
  bbrQueue: number; // Router buffer occupancy
  bbrThroughput: number; // Mbps
  bbrLostPackets: number;
  bbrCycleIndex: number; // 8-phase ProbeBW cycle

  history: TcpSimPoint[];
}

export function createInitialTcpState(config: TcpConfig): TcpEngineState {
  const initialPoint: TcpSimPoint = {
    time: 0,
    renoCwnd: 2,
    renoSsthresh: 32,
    renoThroughput: 5,
    renoQueue: 0,
    cubicCwnd: 2,
    cubicThroughput: 5,
    cubicQueue: 0,
    bbrCwnd: 4,
    bbrPacingRate: config.bandwidthMbps * 0.8,
    bbrThroughput: config.bandwidthMbps * 0.8,
    bbrQueue: 0,
    bbrBtlBw: config.bandwidthMbps,
    bbrMinRtt: config.baselineRttMs,
    eventDescription:
      'Initial socket connection established. Slow start initiated across algorithms.',
  };

  return {
    timeTick: 0,
    renoState: 'SLOW_START',
    renoCwnd: 2,
    renoSsthresh: 32,
    renoQueue: 0,
    renoThroughput: 5,
    renoLostPackets: 0,
    renoRetransmissions: 0,

    cubicState: 'SLOW_START',
    cubicCwnd: 2,
    cubicWmax: 30,
    cubicEpochTime: 0,
    cubicK: 2.5,
    cubicQueue: 0,
    cubicThroughput: 5,
    cubicLostPackets: 0,

    bbrState: 'STARTUP',
    bbrCwnd: 4,
    bbrBtlBw: config.bandwidthMbps,
    bbrMinRtt: config.baselineRttMs,
    bbrPacingRate: config.bandwidthMbps * 0.5,
    bbrQueue: 0,
    bbrThroughput: config.bandwidthMbps * 0.5,
    bbrLostPackets: 0,
    bbrCycleIndex: 0,

    history: [initialPoint],
  };
}

// ProbeBW pacing gain cycle for BBR v1
const BBR_PACING_GAINS = [1.25, 0.75, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

export function stepTcpSimulation(state: TcpEngineState, config: TcpConfig): TcpEngineState {
  const tick = state.timeTick + 1;
  const bdp = Math.max(
    4,
    Math.round((config.bandwidthMbps * 1e6 * (config.baselineRttMs / 1000)) / (1500 * 8))
  );

  const crossNoise = config.crossTraffic && tick % 5 === 0 ? 8 : 0;
  const randomLossRoll = Math.random() * 100;
  const randomDropped = config.lossRatePct > 0 && randomLossRoll < config.lossRatePct;

  // -------------------------------------------------------------
  // 1. TCP RENO ENGINE (Loss-Based AIMD)
  // -------------------------------------------------------------
  let renoCwnd = state.renoCwnd;
  let renoSsthresh = state.renoSsthresh;
  let renoState: RenoState;
  let renoLost = state.renoLostPackets;
  let renoRetrans = state.renoRetransmissions;
  let renoEvent: string;

  const renoExcess = Math.max(0, renoCwnd - bdp);
  const rawRenoQueue = Math.min(config.bufferCapacity + 10, renoExcess + crossNoise);
  const renoBufferDropped = rawRenoQueue > config.bufferCapacity;

  if (renoBufferDropped || randomDropped) {
    renoLost += renoBufferDropped ? Math.max(1, rawRenoQueue - config.bufferCapacity) : 1;
    renoRetrans += 1;
    renoState = 'FAST_RECOVERY';
    renoSsthresh = Math.max(2, Math.floor(renoCwnd / 2));
    renoCwnd = renoSsthresh;
    renoEvent = renoBufferDropped
      ? `Reno Buffer Overflow! Halved cwnd to ${renoCwnd}.`
      : `Reno Packet Loss (${config.lossRatePct}%)! Halved cwnd to ${renoCwnd}.`;
  } else {
    if (renoCwnd < renoSsthresh) {
      renoState = 'SLOW_START';
      renoCwnd = Math.min(100, renoCwnd * 2);
      renoEvent = `Reno Slow Start -> ${renoCwnd}`;
    } else {
      renoState = 'CONGESTION_AVOIDANCE';
      renoCwnd = Math.min(100, renoCwnd + 1);
      renoEvent = `Reno Linear AIMD -> ${renoCwnd}`;
    }
  }

  const renoQueue = Math.min(config.bufferCapacity, Math.max(0, renoCwnd - bdp));
  const renoThroughput = Math.min(
    config.bandwidthMbps,
    Number(((renoCwnd / Math.max(bdp, 1)) * config.bandwidthMbps).toFixed(1))
  );

  // -------------------------------------------------------------
  // 2. TCP CUBIC ENGINE (Default Linux / macOS Algorithm)
  // -------------------------------------------------------------
  let cubicCwnd = state.cubicCwnd;
  let cubicWmax = state.cubicWmax;
  let cubicEpoch = state.cubicEpochTime + 1;
  let cubicK = state.cubicK;
  let cubicState: CubicState;
  let cubicLost = state.cubicLostPackets;

  const cubicExcess = Math.max(0, cubicCwnd - bdp);
  const rawCubicQueue = Math.min(config.bufferCapacity + 10, cubicExcess + crossNoise);
  const cubicBufferDropped = rawCubicQueue > config.bufferCapacity;

  if (cubicBufferDropped || randomDropped) {
    cubicLost += cubicBufferDropped ? Math.max(1, rawCubicQueue - config.bufferCapacity) : 1;
    cubicState = 'FAST_RECOVERY';
    cubicWmax = cubicCwnd;
    // Multiplicative decrease factor beta = 0.7 (drop 30% instead of 50%)
    cubicCwnd = Math.max(3, Math.round(cubicWmax * 0.7));
    // Calculate K = (Wmax * beta / C)^(1/3) where C = 0.4, beta = 0.3
    cubicK = Math.cbrt((cubicWmax * 0.3) / 0.4);
    cubicEpoch = 0;
  } else {
    if (cubicCwnd < bdp * 0.8 && cubicEpoch === 0) {
      cubicState = 'SLOW_START';
      cubicCwnd = Math.min(100, cubicCwnd * 2);
    } else {
      // Cubic polynomial growth: W_cubic(t) = C*(t - K)^3 + Wmax
      const C = 0.4;
      const tMinusK = cubicEpoch - cubicK;
      const delta = C * Math.pow(tMinusK, 3);
      const targetCwnd = Math.round(cubicWmax + delta);
      cubicCwnd = Math.max(cubicCwnd + 1, Math.min(100, targetCwnd));

      if (cubicEpoch < cubicK) {
        cubicState = 'STEADY_CONCAVE';
      } else {
        cubicState = 'PROBING_CONVEX';
      }
    }
  }

  const cubicQueue = Math.min(config.bufferCapacity, Math.max(0, cubicCwnd - bdp));
  const cubicThroughput = Math.min(
    config.bandwidthMbps,
    Number(((cubicCwnd / Math.max(bdp, 1)) * config.bandwidthMbps).toFixed(1))
  );

  // -------------------------------------------------------------
  // 3. TCP BBR ENGINE (Model-Based Rate Pacing)
  // -------------------------------------------------------------
  let bbrState: BbrState = state.bbrState;
  let bbrCycle = state.bbrCycleIndex;
  const bbrBtlBw = config.bandwidthMbps;
  const bbrMinRtt = config.baselineRttMs;
  let bbrLost = state.bbrLostPackets;

  let pacingGain = 1.0;

  if (bbrState === 'STARTUP') {
    pacingGain = 2.89;
    if (tick >= 3) {
      bbrState = 'DRAIN';
    }
  } else if (bbrState === 'DRAIN') {
    pacingGain = 1 / 2.89;
    bbrState = 'PROBE_BW';
    bbrCycle = 0;
  } else if (bbrState === 'PROBE_BW') {
    bbrCycle = (bbrCycle + 1) % BBR_PACING_GAINS.length;
    pacingGain = BBR_PACING_GAINS[bbrCycle];
    if (tick % 20 === 0) {
      bbrState = 'PROBE_RTT';
    }
  } else if (bbrState === 'PROBE_RTT') {
    pacingGain = 0.5;
    bbrState = 'PROBE_BW';
  }

  const bbrPacingRate = Number((config.bandwidthMbps * pacingGain).toFixed(1));
  const bbrCwnd = Math.max(4, Math.round(bdp * (bbrState === 'PROBE_RTT' ? 0.5 : 1.25)));
  const bbrQueue = pacingGain > 1.0 ? Math.min(config.bufferCapacity, Math.round(bdp * 0.25)) : 0;

  if (randomDropped) {
    bbrLost += 1;
  }

  const bbrThroughput = Number(
    Math.min(config.bandwidthMbps, bbrPacingRate * (1 - config.lossRatePct * 0.01)).toFixed(1)
  );

  const newPoint: TcpSimPoint = {
    time: tick,
    renoCwnd,
    renoSsthresh,
    renoThroughput,
    renoQueue,
    cubicCwnd,
    cubicThroughput,
    cubicQueue,
    bbrCwnd,
    bbrPacingRate,
    bbrThroughput,
    bbrQueue,
    bbrBtlBw,
    bbrMinRtt,
    eventDescription: `${renoEvent} | Cubic [${cubicState}] cwnd=${cubicCwnd} | BBR [${bbrState}] pacing=${bbrPacingRate}M`,
  };

  return {
    timeTick: tick,
    renoState,
    renoCwnd,
    renoSsthresh,
    renoQueue,
    renoThroughput,
    renoLostPackets: renoLost,
    renoRetransmissions: renoRetrans,
    cubicState,
    cubicCwnd,
    cubicWmax,
    cubicEpochTime: cubicEpoch,
    cubicK,
    cubicQueue,
    cubicThroughput,
    cubicLostPackets: cubicLost,
    bbrState,
    bbrCwnd,
    bbrBtlBw,
    bbrMinRtt,
    bbrPacingRate,
    bbrQueue,
    bbrThroughput,
    bbrLostPackets: bbrLost,
    bbrCycleIndex: bbrCycle,
    history: [...state.history.slice(-40), newPoint],
  };
}
