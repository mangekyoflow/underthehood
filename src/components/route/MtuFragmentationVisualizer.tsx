import React, { useState } from 'react';
import { Layers, Sliders, Info } from 'lucide-react';
import { playTick } from '../../lib/sound';
import clsx from 'clsx';

export const MtuFragmentationVisualizer: React.FC = () => {
  const [payloadSize, setPayloadSize] = useState<number>(3800);
  const [mtuSize, setMtuSize] = useState<number>(1500); // Standard Ethernet
  const ipHeaderSize = 20; // IPv4
  const tcpHeaderSize = 20; // TCP minimum

  const mss = mtuSize - ipHeaderSize - tcpHeaderSize; // Maximum Segment Size

  // Segment generation
  const numPackets = Math.max(1, Math.ceil(payloadSize / mss));
  const packets: {
    id: number;
    payloadBytes: number;
    seqStart: number;
    seqEnd: number;
    isFull: boolean;
  }[] = [];

  let bytesRemaining = payloadSize;
  let currentSeq = 0;

  for (let i = 0; i < numPackets; i++) {
    const chunk = Math.min(bytesRemaining, mss);
    packets.push({
      id: i + 1,
      payloadBytes: chunk,
      seqStart: currentSeq,
      seqEnd: currentSeq + chunk,
      isFull: chunk === mss,
    });
    currentSeq += chunk;
    bytesRemaining -= chunk;
  }

  const totalHeadersBytes = numPackets * (ipHeaderSize + tcpHeaderSize);
  const totalWireBytes = payloadSize + totalHeadersBytes;
  const overheadPct = ((totalHeadersBytes / totalWireBytes) * 100).toFixed(1);

  return (
    <div className="rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 p-4 font-mono text-xs space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-parchment-200 dark:border-parchment-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider text-[11px]">
            Ethernet MTU & TCP Segmentation Inspector
          </span>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted bg-parchment-200/70 dark:bg-parchment-800 px-1.5 py-0.5 rounded border border-parchment-300 dark:border-parchment-700">
            MSS = {mss} bytes
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-ink-muted dark:text-ink-darkMuted">
          <span>MTU: {mtuSize}B</span>
          <span>&bull;</span>
          <span>IP Hdr: {ipHeaderSize}B</span>
          <span>&bull;</span>
          <span>TCP Hdr: {tcpHeaderSize}B</span>
        </div>
      </div>

      {/* Interactive Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-ink-muted dark:text-ink-darkMuted flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Application Payload Size:</span>
            </span>
            <span className="text-cyan-700 dark:text-cyan-300 font-bold">{payloadSize} bytes</span>
          </div>
          <input
            type="range"
            min={400}
            max={7500}
            step={100}
            value={payloadSize}
            onChange={(e) => {
              playTick();
              setPayloadSize(Number(e.target.value));
            }}
            className="w-full h-1.5 bg-parchment-200 dark:bg-parchment-800 rounded-lg appearance-none cursor-pointer accent-cyan-600"
          />
          <div className="flex justify-between text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1">
            <span>400 B (Small API JSON)</span>
            <span>3,800 B</span>
            <span>7,500 B (Web Bundle)</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-ink-muted dark:text-ink-darkMuted">Network Interface MTU:</span>
            <span className="text-ink-light dark:text-ink-dark font-bold">{mtuSize} bytes</span>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Standard Ethernet (1500B)', val: 1500 },
              { label: 'Jumbo Frame (9000B)', val: 9000 },
              { label: 'Tunnel / VPN (1420B)', val: 1420 },
            ].map((preset) => (
              <button
                key={preset.val}
                onClick={() => {
                  playTick();
                  setMtuSize(preset.val);
                }}
                className={clsx(
                  'flex-1 py-1 px-2 rounded-lg text-[10px] border transition-colors cursor-pointer',
                  mtuSize === preset.val
                    ? 'bg-cyan-500/10 dark:bg-cyan-950 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold'
                    : 'bg-parchment-100 dark:bg-parchment-950 border-parchment-300 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
                )}
              >
                {preset.label.split(' ')[0]} ({preset.val})
              </button>
            ))}
          </div>
          <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted mt-1 font-sans">
            Standard WAN path MTU is 1500 bytes. VPNs drop MTU to ~1420 to fit outer IPsec tunnel
            headers.
          </div>
        </div>
      </div>

      {/* Packet Breakdown Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
          <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
            PACKETS GENERATED
          </div>
          <div className="text-lg font-bold text-cyan-700 dark:text-cyan-300 font-mono">
            {numPackets}
          </div>
          <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted font-sans">
            {numPackets > 1 ? 'Segmented in kernel' : 'Fits in single segment'}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
          <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
            MAX SEGMENT SIZE (MSS)
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
            {mss} B
          </div>
          <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted font-sans">
            MTU − 20(IP) − 20(TCP)
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
          <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
            TOTAL WIRE BYTES
          </div>
          <div className="text-lg font-bold text-ink-light dark:text-ink-dark font-mono">
            {totalWireBytes} B
          </div>
          <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted font-sans">
            +{totalHeadersBytes} B overhead
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800">
          <div className="text-[10px] text-ink-muted dark:text-ink-darkMuted uppercase">
            PROTOCOL OVERHEAD
          </div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono">
            {overheadPct}%
          </div>
          <div className="text-[9px] text-ink-muted dark:text-ink-darkMuted font-sans">
            Headers vs payload ratio
          </div>
        </div>
      </div>

      {/* Visual Packet Strips */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-ink-light dark:text-ink-dark font-mono">
          TCP Segment Wire Layout ({numPackets} Datagrams)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {packets.map((pkt) => (
            <div
              key={pkt.id}
              className="p-2.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-900 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                  <span className="text-cyan-700 dark:text-cyan-300 font-bold">
                    Segment #{pkt.id}
                  </span>
                  <span className="text-ink-muted dark:text-ink-darkMuted">
                    {pkt.payloadBytes + 40}B total
                  </span>
                </div>

                {/* Layered Bar */}
                <div className="h-4 rounded-lg overflow-hidden flex text-[9px] text-white font-bold">
                  <div
                    className="w-[15%] bg-sky-600 flex items-center justify-center"
                    title="IPv4 Header (20B)"
                  >
                    IP
                  </div>
                  <div
                    className="w-[15%] bg-cyan-600 flex items-center justify-center"
                    title="TCP Header (20B)"
                  >
                    TCP
                  </div>
                  <div
                    className="flex-1 bg-emerald-600 flex items-center justify-center truncate px-1"
                    title={`Payload: ${pkt.payloadBytes}B`}
                  >
                    {pkt.payloadBytes}B
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-parchment-200 dark:border-parchment-800 text-[9px] text-ink-muted dark:text-ink-darkMuted flex justify-between font-mono">
                <span>Seq: {pkt.seqStart}</span>
                <span>Ack: {pkt.seqEnd}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engineering Insight Banner */}
      <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-900/60 border border-parchment-200 dark:border-parchment-800 text-[11px] text-ink-muted dark:text-ink-darkMuted leading-relaxed flex items-start gap-2 font-sans">
        <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-ink-light dark:text-ink-dark font-semibold">
            Why TCP segments rather than letting IP fragment:{' '}
          </span>
          IP fragmentation breaks large packets at router interfaces without transport awareness. If
          even a single IP fragment is lost to buffer overflow, the receiver cannot reconstruct the
          datagram and TCP must retransmit the entire payload. By negotiating the MSS during the SYN
          handshake, TCP ensures segments never exceed the Path MTU (PMTU), avoiding fragmentation
          entirely.
        </div>
      </div>
    </div>
  );
};
