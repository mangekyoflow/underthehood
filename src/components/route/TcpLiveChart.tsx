import React from 'react';
import { TcpSimPoint } from '../../types/route';
import clsx from 'clsx';

interface TcpLiveChartProps {
  data: TcpSimPoint[];
  metric: 'cwnd' | 'throughput' | 'queue';
  activeAlgo: 'all' | 'reno' | 'cubic' | 'bbr';
  className?: string;
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 180;
const CHART_PADDING = { top: 20, right: 30, bottom: 25, left: 45 } as const;
const CHART_W = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const CHART_H = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

export const TcpLiveChart: React.FC<TcpLiveChartProps> = ({
  data,
  metric,
  activeAlgo,
  className,
}) => {
  if (data.length < 2) {
    return (
      <div className="h-44 flex items-center justify-center font-mono text-xs text-ink-muted dark:text-ink-darkMuted">
        Run simulation to generate dynamic telemetry curves...
      </div>
    );
  }

  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const padding = CHART_PADDING;
  const chartW = CHART_W;
  const chartH = CHART_H;

  let maxVal = 10;
  if (metric === 'cwnd') {
    const maxCwnd = Math.max(
      ...data.map((d) => Math.max(d.renoCwnd, d.cubicCwnd || 0, d.bbrCwnd, d.renoSsthresh))
    );
    maxVal = Math.max(30, maxCwnd * 1.15);
  } else if (metric === 'throughput') {
    const maxTp = Math.max(
      ...data.map((d) => Math.max(d.renoThroughput, d.cubicThroughput || 0, d.bbrThroughput))
    );
    maxVal = Math.max(20, maxTp * 1.2);
  } else {
    const maxQ = Math.max(...data.map((d) => Math.max(d.renoQueue, d.cubicQueue || 0, d.bbrQueue)));
    maxVal = Math.max(15, maxQ * 1.2);
  }

  const minTime = data[0].time;
  const maxTime = Math.max(data[data.length - 1].time, minTime + 10);

  const getX = (t: number) =>
    padding.left + ((t - minTime) / Math.max(1, maxTime - minTime)) * chartW;
  const getY = (v: number) => padding.top + chartH - (v / maxVal) * chartH;

  const buildPath = (accessor: (d: TcpSimPoint) => number) => {
    return data
      .map(
        (d, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(d.time).toFixed(1)} ${getY(accessor(d)).toFixed(1)}`
      )
      .join(' ');
  };

  const renoPath =
    metric === 'cwnd'
      ? buildPath((d) => d.renoCwnd)
      : metric === 'throughput'
        ? buildPath((d) => d.renoThroughput)
        : buildPath((d) => d.renoQueue);

  const cubicPath =
    metric === 'cwnd'
      ? buildPath((d) => d.cubicCwnd || 0)
      : metric === 'throughput'
        ? buildPath((d) => d.cubicThroughput || 0)
        : buildPath((d) => d.cubicQueue || 0);

  const bbrPath =
    metric === 'cwnd'
      ? buildPath((d) => d.bbrCwnd)
      : metric === 'throughput'
        ? buildPath((d) => d.bbrThroughput)
        : buildPath((d) => d.bbrQueue);

  const ssthreshPath = metric === 'cwnd' ? buildPath((d) => d.renoSsthresh) : null;
  const yUnit = metric === 'cwnd' ? 'pkts' : metric === 'throughput' ? 'Mbps' : 'pkts';

  const showReno = activeAlgo === 'all' || activeAlgo === 'reno';
  const showCubic = activeAlgo === 'all' || activeAlgo === 'cubic';
  const showBbr = activeAlgo === 'all' || activeAlgo === 'bbr';

  return (
    <div
      className={clsx(
        'w-full relative rounded-xl bg-white dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 p-3 shadow-xs',
        className
      )}
    >
      <div className="flex items-center justify-between text-xs font-mono text-ink-muted dark:text-ink-darkMuted mb-2 px-1">
        <span className="font-semibold text-ink-light dark:text-ink-dark">
          {metric === 'cwnd'
            ? 'CONGESTION WINDOW (cwnd & ssthresh)'
            : metric === 'throughput'
              ? 'THROUGHPUT DELIVERY RATE'
              : 'ROUTER BUFFER OCCUPANCY (Queue Depth)'}
        </span>
        <div className="flex items-center gap-3">
          {showReno && (
            <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400 font-semibold">
              <span className="w-2.5 h-0.5 bg-cyan-500 inline-block" />
              <span>Reno (AIMD)</span>
            </span>
          )}
          {showCubic && (
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" />
              <span>Cubic (Linux)</span>
            </span>
          )}
          {showBbr && (
            <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-semibold">
              <span className="w-2.5 h-0.5 bg-purple-500 inline-block" />
              <span>BBR (Google)</span>
            </span>
          )}
          {ssthreshPath && (
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className="w-2.5 h-0.5 border-b border-dashed border-ink-muted inline-block" />
              <span>ssthresh</span>
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible font-mono text-[10px]"
      >
        {/* Y Axis Gridlines and Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const val = Math.round(maxVal * pct);
          const y = getY(val);
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                className="text-parchment-200 dark:text-parchment-800"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-ink-muted text-[9px]"
              >
                {val} {pct === 1 ? yUnit : ''}
              </text>
            </g>
          );
        })}

        {/* X Axis Timeline Labels */}
        {[0, 0.5, 1].map((pct) => {
          const t = Math.round(minTime + (maxTime - minTime) * pct);
          const x = getX(t);
          return (
            <text
              key={pct}
              x={x}
              y={height - 5}
              textAnchor={pct === 0 ? 'start' : pct === 1 ? 'end' : 'middle'}
              className="fill-ink-muted text-[9px]"
            >
              +{t} RTTs
            </text>
          );
        })}

        {/* Curves */}
        {ssthreshPath && (
          <path
            d={ssthreshPath}
            fill="none"
            stroke="currentColor"
            className="text-ink-muted/50"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {showReno && (
          <path
            d={renoPath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {showCubic && (
          <path
            d={cubicPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {showBbr && (
          <path
            d={bbrPath}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
};
