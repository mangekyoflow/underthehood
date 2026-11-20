import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { UrlLifecycleStep } from '../../types/route';
import clsx from 'clsx';

interface HexDumpViewerProps {
  step: UrlLifecycleStep;
  dnsRecordType?: string;
}

export const HexDumpViewer: React.FC<HexDumpViewerProps> = ({ step, dnsRecordType = 'A' }) => {
  const [copied, setCopied] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'all' | 'eth' | 'ip' | 'l4' | 'app'>('all');

  // Deterministically generate a realistic byte stream for this step
  const generatePacketBytes = (): {
    bytes: number[];
    ethRange: [number, number];
    ipRange: [number, number];
    l4Range: [number, number];
    appRange: [number, number];
  } => {
    const bytes: number[] = [];

    // 1. Ethernet II Header (14 bytes)
    const isIpv6 = step.dstIp.includes(':') || step.srcIp.includes(':');
    const ethHeader = [
      0x02,
      0x42,
      0xc0,
      0xa8,
      0x01,
      0x69, // Dst MAC
      0x52,
      0x54,
      0x00,
      0x12,
      0x34,
      0x56, // Src MAC
      isIpv6 ? 0x86 : 0x08,
      isIpv6 ? 0xdd : 0x00, // EtherType
    ];
    const ethRange: [number, number] = [0, ethHeader.length];
    bytes.push(...ethHeader);

    // 2. IP Header (20 bytes for IPv4)
    const isUdp = step.protocol === 'UDP';

    const parseIpv4 = (ipStr: string): number[] => {
      const parts = ipStr.split('.').map(Number);
      return parts.length === 4 ? parts : [127, 0, 0, 1];
    };
    const srcBytes = parseIpv4(step.srcIp);
    const dstBytes = parseIpv4(step.dstIp);

    const ipStart = bytes.length;
    const ipHeader = [
      0x45, // Version 4, IHL 5 (20 bytes)
      0x00, // DSCP / ECN
      0x00,
      0x48, // Total Length
      0x1c,
      0x46, // Identification
      0x40,
      0x00, // Flags (Don't Fragment), Fragment Offset 0
      0x40, // TTL (64)
      isUdp ? 0x11 : 0x06, // Protocol: 17 for UDP, 6 for TCP
      0xb1,
      0xe6, // Header Checksum
      ...srcBytes,
      ...dstBytes,
    ];
    bytes.push(...ipHeader);
    const ipRange: [number, number] = [ipStart, bytes.length];

    // 3. Transport Layer Header
    const l4Start = bytes.length;
    if (isUdp) {
      const srcP = step.srcPort || 53214;
      const dstP = step.dstPort || 53;
      const udpHeader = [
        (srcP >> 8) & 0xff,
        srcP & 0xff,
        (dstP >> 8) & 0xff,
        dstP & 0xff,
        0x00,
        0x24, // Length
        0x7a,
        0x1c, // Checksum
      ];
      bytes.push(...udpHeader);
    } else {
      const srcP = step.srcPort || 52418;
      const dstP = step.dstPort || 443;
      const isSyn = step.packetSummary.includes('SYN');
      const isAck = step.packetSummary.includes('ACK');
      let flags = 0x00;
      if (isSyn && isAck) flags = 0x12;
      else if (isSyn) flags = 0x02;
      else if (isAck) flags = 0x10;
      else flags = 0x18;

      const tcpHeader = [
        (srcP >> 8) & 0xff,
        srcP & 0xff,
        (dstP >> 8) & 0xff,
        dstP & 0xff,
        0x00,
        0xa4,
        0x9f,
        0x1b, // Sequence Number
        0x42,
        0x91,
        0x84,
        0x01, // Acknowledgment Number
        0x80, // Data Offset
        flags,
        0xff,
        0xff, // Window Size
        0xa3,
        0x22, // Checksum
        0x00,
        0x00, // Urgent Pointer
        0x02,
        0x04,
        0x05,
        0xb4,
        0x01,
        0x03,
        0x03,
        0x07,
        0x01,
        0x01,
        0x04,
        0x02,
      ];
      bytes.push(...tcpHeader);
    }
    const l4Range: [number, number] = [l4Start, bytes.length];

    // 4. Application Layer Payload
    const appStart = bytes.length;
    let payloadText = step.packetSummary;
    if (step.phase === 'DNS') {
      payloadText = `\x00\x01\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03api\x0asystemslab\x03dev\x00\x00\x01\x00\x01`;
    } else if (step.protocol === 'TLS 1.3') {
      payloadText = `\x16\x03\x03\x00\x45\x01\x00\x00\x41\x03\x03TLS13_CLIENT_HELLO_CHACHA_POLY1305_SNI_SYSTEMSLAB_DEV`;
    } else if (step.phase === 'HTTP') {
      payloadText = `GET /v1/metrics HTTP/2\r\nHost: api.systemslab.dev\r\nUser-Agent: Browser/1.0\r\nAccept: */*\r\n\r\n`;
    }

    const appBytes: number[] = [];
    for (let i = 0; i < Math.min(payloadText.length, 64); i++) {
      appBytes.push(payloadText.charCodeAt(i) & 0xff);
    }
    bytes.push(...appBytes);
    const appRange: [number, number] = [appStart, bytes.length];

    return { bytes, ethRange, ipRange, l4Range, appRange };
  };

  const { bytes, ethRange, ipRange, l4Range, appRange } = generatePacketBytes();

  const getByteLayer = (idx: number): 'eth' | 'ip' | 'l4' | 'app' => {
    if (idx < ethRange[1]) return 'eth';
    if (idx < ipRange[1]) return 'ip';
    if (idx < l4Range[1]) return 'l4';
    return 'app';
  };

  const getLayerColor = (layer: 'eth' | 'ip' | 'l4' | 'app', isDimmed: boolean) => {
    if (isDimmed) return 'text-ink-muted/30';
    switch (layer) {
      case 'eth':
        return 'text-amber-700 dark:text-amber-300 font-semibold';
      case 'ip':
        return 'text-sky-700 dark:text-sky-300 font-semibold';
      case 'l4':
        return 'text-cyan-700 dark:text-cyan-300 font-bold';
      case 'app':
        return 'text-emerald-700 dark:text-emerald-300 font-semibold';
    }
  };

  // Group bytes into 16-byte rows
  const rows: { offset: string; hex: { byte: string; idx: number }[]; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = chunk.map((b, cIdx) => ({
      byte: b.toString(16).padStart(2, '0').toUpperCase(),
      idx: i + cIdx,
    }));
    const ascii = chunk.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
    rows.push({
      offset: i.toString(16).padStart(4, '0').toUpperCase(),
      hex,
      ascii,
    });
  }

  const handleCopyHex = () => {
    const dump = rows
      .map(
        (r) =>
          `${r.offset}  ${r.hex
            .map((h) => h.byte)
            .join(' ')
            .padEnd(48, ' ')}  |${r.ascii}|`
      )
      .join('\n');
    navigator.clipboard.writeText(dump);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 font-mono space-y-3 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-parchment-200 dark:border-parchment-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-ink-light dark:text-ink-dark">
            Wire Shark Hex Inspector & Dissector
          </span>
          <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted bg-parchment-200 dark:bg-parchment-800 px-1.5 py-0.5 rounded border border-parchment-300 dark:border-parchment-700 font-semibold">
            {bytes.length} bytes captured
          </span>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex bg-parchment-200/50 dark:bg-parchment-900 p-0.5 rounded-xl border border-parchment-300/70 dark:border-parchment-800 text-[10px]">
            <button
              onClick={() => setActiveLayer('all')}
              className={clsx(
                'px-2 py-0.5 rounded-lg transition-colors cursor-pointer',
                activeLayer === 'all'
                  ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-2xs'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              All Layers
            </button>
            <button
              onClick={() => setActiveLayer('eth')}
              className={clsx(
                'px-2 py-0.5 rounded-lg transition-colors cursor-pointer',
                activeLayer === 'eth'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold'
                  : 'text-ink-muted hover:text-amber-600'
              )}
            >
              L2: Eth
            </button>
            <button
              onClick={() => setActiveLayer('ip')}
              className={clsx(
                'px-2 py-0.5 rounded-lg transition-colors cursor-pointer',
                activeLayer === 'ip'
                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold'
                  : 'text-ink-muted hover:text-sky-600'
              )}
            >
              L3: IP
            </button>
            <button
              onClick={() => setActiveLayer('l4')}
              className={clsx(
                'px-2 py-0.5 rounded-lg transition-colors cursor-pointer',
                activeLayer === 'l4'
                  ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold'
                  : 'text-ink-muted hover:text-cyan-600'
              )}
            >
              L4: {step.protocol}
            </button>
            <button
              onClick={() => setActiveLayer('app')}
              className={clsx(
                'px-2 py-0.5 rounded-lg transition-colors cursor-pointer',
                activeLayer === 'app'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'text-ink-muted hover:text-emerald-600'
              )}
            >
              L7: Payload
            </button>
          </div>

          <button
            onClick={handleCopyHex}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-parchment-100 hover:bg-parchment-200 dark:bg-parchment-900 dark:hover:bg-parchment-800 text-[10px] text-ink-muted hover:text-ink-light dark:hover:text-ink-dark border border-parchment-300 dark:border-parchment-700 transition-colors cursor-pointer"
            title="Copy Wireshark Hex Dump to Clipboard"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copied ? 'Copied!' : 'Copy Hex'}</span>
          </button>
        </div>
      </div>

      {/* Layer Color Legend */}
      <div className="flex items-center gap-3 text-[10px] text-ink-muted dark:text-ink-darkMuted flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-amber-500" />
          <span>Ethernet II (14B)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-sky-500" />
          <span>IPv4 Header (20B)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-cyan-500" />
          <span>{step.protocol} Header</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-emerald-500" />
          <span>Application Data</span>
        </span>
      </div>

      {/* Hex Dump Table */}
      <div className="overflow-x-auto rounded-xl bg-parchment-100/90 dark:bg-black/60 p-3 border border-parchment-300/80 dark:border-parchment-800 font-mono text-[11px] leading-relaxed select-all">
        {rows.map((row) => (
          <div
            key={row.offset}
            className="flex items-center hover:bg-parchment-200/50 dark:hover:bg-parchment-900/40 px-1 rounded transition-colors"
          >
            {/* Offset */}
            <span className="text-ink-muted dark:text-ink-darkMuted w-12 shrink-0 select-none">
              {row.offset}
            </span>

            {/* Hex Bytes */}
            <div className="flex items-center gap-1.5 mr-4 shrink-0">
              {row.hex.map(({ byte, idx }) => {
                const layer = getByteLayer(idx);
                const isDimmed = activeLayer !== 'all' && activeLayer !== layer;
                return (
                  <span
                    key={idx}
                    className={clsx(
                      'w-5 text-center transition-colors',
                      getLayerColor(layer, isDimmed),
                      idx % 8 === 7 && idx % 16 !== 15 ? 'mr-1' : ''
                    )}
                  >
                    {byte}
                  </span>
                );
              })}
            </div>

            {/* ASCII Column */}
            <span className="text-ink-muted dark:text-ink-darkMuted select-none border-l border-parchment-300 dark:border-parchment-800 pl-3">
              {row.ascii}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
