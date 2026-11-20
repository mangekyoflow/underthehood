import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Laptop,
  Server,
  ShieldCheck,
  Database,
  HardDrive,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Cpu,
  Layers,
  Lock,
  Unlock,
  Clock,
  Zap,
  Network,
  Binary,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UrlLifecycleStep, DnsCacheStatus } from '../../types/route';
import { MODULES } from '../../data/modulesData';
import { SimulationControls } from '../common/SimulationControls';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { ChallengeCard } from '../common/ChallengeCard';
import { TerminalLog, LogEntry } from '../common/TerminalLog';
import { HexDumpViewer } from './HexDumpViewer';
import { LatencyWaterfall } from './LatencyWaterfall';
import { MtuFragmentationVisualizer } from './MtuFragmentationVisualizer';
import { playTick, playSuccess } from '../../lib/sound';
import clsx from 'clsx';

interface UrlLifecycleModuleProps {
  onChallengeComplete: (id: string) => void;
  completedChallenges: Record<string, boolean>;
}

export const UrlLifecycleModule: React.FC<UrlLifecycleModuleProps> = ({
  onChallengeComplete,
  completedChallenges,
}) => {
  const moduleData = MODULES['url-lifecycle'];

  // User Interactive Settings
  const [url, setUrl] = useState('https://api.systemslab.dev/v1/metrics');
  const [protocolMode, setProtocolMode] = useState<'HTTPS' | 'HTTP'>('HTTPS');
  const [dnsCacheMode, setDnsCacheMode] = useState<DnsCacheStatus>('full-miss');
  const [dnsRecordType, setDnsRecordType] = useState<'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT'>('A');
  const [activeInspector, setActiveInspector] = useState<'none' | 'hexdump' | 'waterfall' | 'mtu'>(
    'none'
  );

  // Playback State
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const targetServerIp =
    dnsRecordType === 'AAAA'
      ? '2606:4700:3038::6815:3a0c'
      : dnsRecordType === 'MX'
        ? '198.51.100.25'
        : '104.21.58.12';

  // Build the dynamic steps according to settings
  const steps: UrlLifecycleStep[] = React.useMemo(() => {
    const list: UrlLifecycleStep[] = [];

    // Step 1: User enters URL
    list.push({
      id: 1,
      phase: 'DNS',
      title: '1. User Enters URL & Initiates Navigation',
      shortLabel: 'URL Input',
      sourceNode: 'browser',
      targetNode: 'browser',
      protocol: 'DOM/Engine',
      srcIp: '192.168.1.105',
      dstIp: '127.0.0.1',
      srcPort: 53214,
      dstPort: 0,
      packetSummary: `NAVIGATE -> ${url}`,
      packetHeaders: {
        Scheme: protocolMode.toLowerCase(),
        Host: 'api.systemslab.dev',
        Path: '/v1/metrics',
        Engine: 'V8 / Blink Network Service',
      },
      explanation:
        'User submits the URL in the navigation bar. The browser parses the scheme, hostname, and path, and checks whether the domain requires HSTS preload or immediate DNS resolution.',
      latencyMs: 1,
    });

    // Step 2: Browser DNS Cache Check
    if (dnsCacheMode === 'browser-hit') {
      list.push({
        id: 2,
        phase: 'DNS',
        title: '2. Browser DNS Cache HIT',
        shortLabel: 'Browser Cache Hit',
        sourceNode: 'browser',
        targetNode: 'browser',
        protocol: 'DOM/Engine',
        srcIp: '192.168.1.105',
        dstIp: '127.0.0.1',
        srcPort: 53214,
        dstPort: 0,
        packetSummary: 'CACHE HIT: api.systemslab.dev -> 104.21.58.12 (TTL: 240s)',
        packetHeaders: {
          'Cache-Source': 'Chrome NetInternals / HostResolverCache',
          'Resolved-IP': '104.21.58.12',
          'TTL-Remaining': '240s',
        },
        explanation:
          'Browser finds a valid, unexpired DNS record in its internal in-memory cache. All subsequent DNS lookup steps are completely bypassed!',
        latencyMs: 1,
      });
    } else {
      list.push({
        id: 2,
        phase: 'DNS',
        title: '2. Browser DNS Cache MISS',
        shortLabel: 'Browser Cache Miss',
        sourceNode: 'browser',
        targetNode: 'os-resolver',
        protocol: 'DOM/Engine',
        srcIp: '192.168.1.105',
        dstIp: '127.0.0.1',
        srcPort: 53214,
        dstPort: 0,
        packetSummary: 'CACHE MISS: Checking OS stub resolver (getaddrinfo)',
        packetHeaders: {
          Lookup: 'api.systemslab.dev',
          Status: 'MISS (Cache Expired or Cold)',
        },
        explanation:
          'Browser checks its internal DNS cache (typically 1-minute TTL). The record is absent or expired, so the browser issues a getaddrinfo() system call to the OS resolver.',
        latencyMs: 2,
      });

      if (dnsCacheMode === 'os-hit') {
        list.push({
          id: 3,
          phase: 'DNS',
          title: '3. Operating System DNS Cache HIT',
          shortLabel: 'OS Cache Hit',
          sourceNode: 'os-resolver',
          targetNode: 'browser',
          protocol: 'DOM/Engine',
          srcIp: '127.0.0.1',
          dstIp: '192.168.1.105',
          srcPort: 0,
          dstPort: 53214,
          packetSummary: 'OS CACHE HIT: /etc/hosts or systemd-resolved -> 104.21.58.12',
          packetHeaders: {
            Daemon: 'systemd-resolved / mDNSResponder',
            'Resolved-IP': '104.21.58.12',
            'Hosts-File': 'Checked',
          },
          explanation:
            'The operating system finds the IP address in its local socket resolver cache or local hosts file. Recursive network DNS queries are skipped.',
          latencyMs: 3,
          isReturnTrip: true,
        });
      } else {
        // Full recursive miss
        list.push({
          id: 3,
          phase: 'DNS',
          title: '3. Query Configured Recursive Resolver',
          shortLabel: 'OS -> Recursive DNS',
          sourceNode: 'os-resolver',
          targetNode: 'recursive-dns',
          protocol: 'UDP',
          srcIp: '192.168.1.105',
          dstIp: '8.8.8.8',
          srcPort: 53214,
          dstPort: 53,
          packetSummary: 'DNS Standard Query A api.systemslab.dev',
          packetHeaders: {
            'Transaction ID': '0x7a3f',
            Flags: '0x0100 (Standard query, Recursion Desired)',
            Questions: '1 (api.systemslab.dev: type A, class IN)',
          },
          explanation:
            'The OS resolver forwards a UDP datagram over port 53 to the configured Recursive Resolver (e.g., ISP Anycast or 8.8.8.8 / 1.1.1.1).',
          latencyMs: 15,
        });

        list.push({
          id: 4,
          phase: 'DNS',
          title: '4. Recursive Resolver Queries Root Server (.)',
          shortLabel: 'Recursive -> Root (.)',
          sourceNode: 'recursive-dns',
          targetNode: 'root-dns',
          protocol: 'UDP',
          srcIp: '8.8.8.8',
          dstIp: '198.41.0.4',
          srcPort: 48921,
          dstPort: 53,
          packetSummary: 'DNS Query A api.systemslab.dev -> Root Referral [.dev]',
          packetHeaders: {
            Target: 'a.root-servers.net (198.41.0.4)',
            Referral: 'Referral to .dev TLD Name Servers',
          },
          explanation:
            'The Recursive Resolver does not hold the answer yet. It queries one of the 13 Root Server clusters for the ".dev" Top-Level Domain delegator.',
          latencyMs: 25,
        });

        list.push({
          id: 5,
          phase: 'DNS',
          title: '5. Recursive Resolver Queries TLD Server (.dev)',
          shortLabel: 'Recursive -> TLD (.dev)',
          sourceNode: 'recursive-dns',
          targetNode: 'tld-dns',
          protocol: 'UDP',
          srcIp: '8.8.8.8',
          dstIp: '192.5.6.30',
          srcPort: 48921,
          dstPort: 53,
          packetSummary: 'DNS Query -> Referral to ns1.systemslab.dev',
          packetHeaders: {
            Target: 'nic.dev (192.5.6.30)',
            Authority: 'systemslab.dev NS ns1.digitalocean.com',
          },
          explanation:
            'The .dev TLD registry returns the authoritative nameserver responsible for the "systemslab.dev" domain zone.',
          latencyMs: 30,
        });

        let answerSummary = `DNS Answer: api.systemslab.dev A ${targetServerIp} (TTL: 300)`;
        let answerHeaders: Record<string, string> = {
          Flags: '0x8180 (Standard query response, No error)',
          Answer: `api.systemslab.dev: type A, class IN, addr ${targetServerIp}`,
          TTL: '300s',
        };

        if (dnsRecordType === 'AAAA') {
          answerSummary = `DNS Answer: api.systemslab.dev AAAA ${targetServerIp} (TTL: 300)`;
          answerHeaders = {
            Flags: '0x8180 (Standard query response, No error)',
            Answer: `api.systemslab.dev: type AAAA (IPv6), addr ${targetServerIp}`,
            TTL: '300s',
          };
        } else if (dnsRecordType === 'CNAME') {
          answerSummary = `DNS Answer: api.systemslab.dev CNAME lb-prod-edge.cloudflare.net -> ${targetServerIp}`;
          answerHeaders = {
            Flags: '0x8180 (Standard query response, No error)',
            CNAME: 'lb-prod-edge.cloudflare.net',
            'A Record': `${targetServerIp} (Canonical alias resolved)`,
            TTL: '120s',
          };
        } else if (dnsRecordType === 'MX') {
          answerSummary = `DNS Answer: api.systemslab.dev MX 10 mail.systemslab.dev -> ${targetServerIp}`;
          answerHeaders = {
            Flags: '0x8180 (Standard query response, No error)',
            Preference: '10',
            Exchange: `mail.systemslab.dev (${targetServerIp})`,
            TTL: '3600s',
          };
        } else if (dnsRecordType === 'TXT') {
          answerSummary = `DNS Answer: api.systemslab.dev TXT "v=spf1 include:_spf.google.com ~all"`;
          answerHeaders = {
            Flags: '0x8180 (Standard query response, No error)',
            Text: '"v=spf1 include:_spf.google.com ~all"',
            'Fallback A': targetServerIp,
            TTL: '3600s',
          };
        }

        list.push({
          id: 6,
          phase: 'DNS',
          title: `6. Authoritative Nameserver Returns ${dnsRecordType} Record`,
          shortLabel: 'Auth DNS -> Recursive',
          sourceNode: 'auth-dns',
          targetNode: 'recursive-dns',
          protocol: 'UDP',
          srcIp: '173.245.58.51',
          dstIp: '8.8.8.8',
          srcPort: 53,
          dstPort: 48921,
          packetSummary: answerSummary,
          packetHeaders: answerHeaders,
          explanation: `The authoritative nameserver has the authoritative zone record and returns the target host address (${targetServerIp}) for query type ${dnsRecordType}.`,
          latencyMs: 20,
          isReturnTrip: true,
        });

        list.push({
          id: 7,
          phase: 'DNS',
          title: '7. Recursive Resolver Returns IP to Client OS',
          shortLabel: 'Recursive -> Client',
          sourceNode: 'recursive-dns',
          targetNode: 'browser',
          protocol: 'UDP',
          srcIp: '8.8.8.8',
          dstIp: '192.168.1.105',
          srcPort: 53,
          dstPort: 53214,
          packetSummary: `DNS Response Delivered: ${targetServerIp}`,
          packetHeaders: {
            'Resolved-IP': targetServerIp,
            'Record-Type': dnsRecordType,
            'Client Cache': 'OS & Browser Cache Populated',
          },
          explanation:
            'The recursive resolver caches the response and returns the resolved IP to the browser client.',
          latencyMs: 12,
          isReturnTrip: true,
        });
      }
    }

    // TCP Three-Way Handshake
    list.push({
      id: list.length + 1,
      phase: 'TCP',
      title: '8. TCP Handshake: SYN (Client to Server)',
      shortLabel: 'TCP SYN',
      sourceNode: 'browser',
      targetNode: 'web-server',
      protocol: 'TCP',
      srcIp: '192.168.1.105',
      dstIp: targetServerIp,
      srcPort: 52418,
      dstPort: protocolMode === 'HTTPS' ? 443 : 80,
      packetSummary: '[SYN] Seq=0 Win=65535 MSS=1460 SACK_PERM=1',
      packetHeaders: {
        Flags: '[SYN]',
        'Sequence Number': '10049281',
        'Window Size': '65,535 bytes',
        Options: 'MSS: 1460, SACK permitted, Window Scale: 7',
      },
      explanation:
        'The client initiates a reliable byte-stream transport connection by transmitting a TCP SYN packet containing an Initial Sequence Number (ISN) and TCP options.',
      latencyMs: 22,
    });

    list.push({
      id: list.length + 1,
      phase: 'TCP',
      title: '9. TCP Handshake: SYN-ACK (Server to Client)',
      shortLabel: 'TCP SYN-ACK',
      sourceNode: 'web-server',
      targetNode: 'browser',
      protocol: 'TCP',
      srcIp: targetServerIp,
      dstIp: '192.168.1.105',
      srcPort: protocolMode === 'HTTPS' ? 443 : 80,
      dstPort: 52418,
      packetSummary: '[SYN, ACK] Seq=0 Ack=1 Win=65535 MSS=1460',
      packetHeaders: {
        Flags: '[SYN, ACK]',
        'Sequence Number': '42918401',
        Acknowledgment: '10049282 (ISN + 1)',
      },
      explanation:
        "Server acknowledges the client's SYN, increments the sequence number, and sends its own SYN and sequence number back.",
      latencyMs: 22,
      isReturnTrip: true,
    });

    list.push({
      id: list.length + 1,
      phase: 'TCP',
      title: '10. TCP Handshake: ACK (Connection ESTABLISHED)',
      shortLabel: 'TCP ACK',
      sourceNode: 'browser',
      targetNode: 'web-server',
      protocol: 'TCP',
      srcIp: '192.168.1.105',
      dstIp: targetServerIp,
      srcPort: 52418,
      dstPort: protocolMode === 'HTTPS' ? 443 : 80,
      packetSummary: '[ACK] Seq=1 Ack=1 State=ESTABLISHED',
      packetHeaders: {
        Flags: '[ACK]',
        'Sequence Number': '10049282',
        Acknowledgment: '42918402',
        'Socket State': 'ESTABLISHED',
      },
      explanation:
        "The client acknowledges the server's SYN-ACK. The TCP socket enters the ESTABLISHED state. Both endpoints now possess synchronized sequence numbers.",
      latencyMs: 22,
    });

    // TLS 1.3 Handshake (if HTTPS)
    if (protocolMode === 'HTTPS') {
      list.push({
        id: list.length + 1,
        phase: 'TLS',
        title: '11. TLS 1.3 ClientHello & Key Share',
        shortLabel: 'TLS ClientHello',
        sourceNode: 'browser',
        targetNode: 'web-server',
        protocol: 'TLS 1.3',
        srcIp: '192.168.1.105',
        dstIp: targetServerIp,
        srcPort: 52418,
        dstPort: 443,
        packetSummary: 'TLS 1.3 ClientHello (Cipher: AES_GCM_256, SNI: api.systemslab.dev)',
        packetHeaders: {
          'TLS Version': 'TLS 1.3 (0x0304)',
          'Cipher Suites': 'TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256',
          'Server Name Indication (SNI)': 'api.systemslab.dev',
          'Key Share': 'ECDHE x25519 public key parameters',
        },
        explanation:
          'In TLS 1.3, the client sends supported cipher suites and speculatively sends its Elliptic Curve Diffie-Hellman (ECDHE) key share in the very first packet, saving a full RTT compared to TLS 1.2.',
        latencyMs: 24,
      });

      list.push({
        id: list.length + 1,
        phase: 'TLS',
        title: '12. TLS 1.3 ServerHello, Cert & Handshake Finished',
        shortLabel: 'TLS ServerHello',
        sourceNode: 'web-server',
        targetNode: 'browser',
        protocol: 'TLS 1.3',
        srcIp: targetServerIp,
        dstIp: '192.168.1.105',
        srcPort: 443,
        dstPort: 52418,
        packetSummary: 'TLS 1.3 ServerHello -> Certificate, Handshake Finished (Encrypted)',
        packetHeaders: {
          'Selected Cipher': 'TLS_AES_256_GCM_SHA384',
          Certificate: "CN=*.systemslab.dev (Let's Encrypt E6)",
          'Session Keys': 'Derived via HKDF-Expand-Label (Symmetric AES key ready)',
        },
        explanation:
          'Server responds with its chosen cipher suite and matching public key share, presents its X.509 certificate, and concludes the handshake. All subsequent application data is encrypted.',
        latencyMs: 24,
        isReturnTrip: true,
      });
    }

    // HTTP Request
    list.push({
      id: list.length + 1,
      phase: 'HTTP',
      title: `13. HTTP GET Request (${protocolMode === 'HTTPS' ? 'Encrypted' : 'Plaintext'})`,
      shortLabel: 'HTTP Request',
      sourceNode: 'browser',
      targetNode: 'web-server',
      protocol: protocolMode === 'HTTPS' ? 'HTTP/2' : 'HTTP/1.1',
      srcIp: '192.168.1.105',
      dstIp: targetServerIp,
      srcPort: 52418,
      dstPort: protocolMode === 'HTTPS' ? 443 : 80,
      packetSummary: `GET /v1/metrics ${protocolMode === 'HTTPS' ? 'HTTP/2 (Encrypted TLS Record)' : 'HTTP/1.1 (Plaintext)'}`,
      packetHeaders: {
        Method: 'GET',
        Path: '/v1/metrics',
        Host: 'api.systemslab.dev',
        'User-Agent': 'Mozilla/5.0 (SystemsPlayground/2.0)',
        Accept: 'application/json, text/html',
      },
      explanation:
        'The browser formats and transmits the HTTP request payload across the established, encrypted socket channel.',
      latencyMs: 20,
    });

    // Server Processing
    list.push({
      id: list.length + 1,
      phase: 'HTTP',
      title: '14. Web Server & Application Execution',
      shortLabel: 'App Processing',
      sourceNode: 'web-server',
      targetNode: 'app-engine',
      protocol: 'DOM/Engine',
      srcIp: targetServerIp,
      dstIp: '10.0.4.18',
      srcPort: 8080,
      dstPort: 5432,
      packetSummary: 'SQL Query: SELECT status, latency, qps FROM metrics LIMIT 50',
      packetHeaders: {
        Server: 'envoy / nginx reverse proxy',
        Upstream: 'Go Fiber / Node.js Engine (PID: 4912)',
        'Database Query': 'PostgreSQL read replica (Index scan: 1.8ms)',
      },
      explanation:
        'The edge reverse proxy passes the request to backend application handlers, executes database queries, prepares JSON/HTML, and compresses the response with Brotli.',
      latencyMs: 35,
    });

    // HTTP Response
    list.push({
      id: list.length + 1,
      phase: 'HTTP',
      title: '15. HTTP 200 OK Response Delivered',
      shortLabel: 'HTTP Response',
      sourceNode: 'web-server',
      targetNode: 'browser',
      protocol: protocolMode === 'HTTPS' ? 'HTTP/2' : 'HTTP/1.1',
      srcIp: targetServerIp,
      dstIp: '192.168.1.105',
      srcPort: protocolMode === 'HTTPS' ? 443 : 80,
      dstPort: 52418,
      packetSummary: 'HTTP/2 200 OK (Content-Type: application/json, Content-Length: 482B)',
      packetHeaders: {
        Status: '200 OK',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Encoding': 'br',
        'Cache-Control': 'max-age=60, stale-while-revalidate=120',
      },
      packetPayload: '{"status":"healthy","qps":1420,"p99_latency_ms":12.4,"cluster":"us-east-1"}',
      explanation:
        'Server transmits the HTTP response payload back to the client browser over the TCP connection.',
      latencyMs: 22,
      isReturnTrip: true,
    });

    // Browser Render
    list.push({
      id: list.length + 1,
      phase: 'RENDER',
      title: '16. Browser DOM Parsing, Layout & Paint',
      shortLabel: 'Render & Paint',
      sourceNode: 'browser',
      targetNode: 'browser',
      protocol: 'DOM/Engine',
      srcIp: '192.168.1.105',
      dstIp: '127.0.0.1',
      srcPort: 0,
      dstPort: 0,
      packetSummary: 'Parse HTML -> Construct DOM & CSSOM -> Composite & Paint Pixels',
      packetHeaders: {
        'Parse HTML': 'Tokens -> Nodes -> DOM Tree',
        'Style Recalc': 'CSSOM Rules Computed',
        Layout: 'Geometry calculated in Blink',
        Paint: 'Skia/Raster GPU draw calls completed',
      },
      explanation:
        "The browser's rendering engine parses the payload, executes scripts, computes styling layouts, and issues GPU draw calls to display the web page to the user.",
      latencyMs: 14,
    });

    return list;
  }, [url, protocolMode, dnsCacheMode, dnsRecordType, targetServerIp]);

  const currentStep = steps[currentStepIdx] || steps[0];

  // Auto-play timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isPlaying) {
      const baseDelay = 1400 / speed;
      timer = setTimeout(() => {
        if (currentStepIdx < steps.length - 1) {
          setCurrentStepIdx((prev) => prev + 1);
          playTick();
        } else {
          setIsPlaying(false);
          playSuccess();
        }
      }, baseDelay);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, currentStepIdx, steps.length, speed]);

  // Log events on step change
  useEffect(() => {
    if (!currentStep) return;
    const now = new Date();
    const timeStr =
      now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    let level: 'info' | 'warn' | 'success' | 'debug' = 'info';
    if (currentStep.phase === 'DNS' && currentStep.title.includes('HIT')) level = 'success';
    if (currentStep.phase === 'RENDER') level = 'success';
    if (currentStep.protocol === 'TLS 1.3') level = 'debug';

    setLogs((prev) => [
      ...prev.slice(-30),
      {
        id: `${currentStep.id}-${Date.now()}`,
        timestamp: timeStr,
        level,
        category: currentStep.phase,
        message: `${currentStep.shortLabel}: ${currentStep.packetSummary}`,
      },
    ]);

    // Challenge triggers
    if (dnsCacheMode === 'browser-hit' && currentStep.title.includes('Browser DNS Cache HIT')) {
      onChallengeComplete('challenge-url-1');
    }
    if (protocolMode === 'HTTP') {
      onChallengeComplete('challenge-url-2');
    }
  }, [currentStepIdx, currentStep, dnsCacheMode, protocolMode]);

  // Cumulative latency calculation
  const cumulativeLatency = steps
    .slice(0, currentStepIdx + 1)
    .reduce((acc, s) => acc + s.latencyMs, 0);
  const totalSimulatedLatency = steps.reduce((acc, s) => acc + s.latencyMs, 0);

  // Node layout map for visual diagram
  const nodes = [
    {
      id: 'browser',
      label: 'Client Browser',
      sub: '192.168.1.105',
      icon: Laptop,
      x: 10,
      y: 30,
      color: 'text-cyan-400',
    },
    {
      id: 'os-resolver',
      label: 'OS Resolver',
      sub: '127.0.0.1:53',
      icon: Cpu,
      x: 28,
      y: 75,
      color: 'text-sky-400',
    },
    {
      id: 'recursive-dns',
      label: 'Recursive DNS',
      sub: '8.8.8.8:53',
      icon: Network,
      x: 48,
      y: 75,
      color: 'text-blue-400',
    },
    {
      id: 'root-dns',
      label: 'Root DNS (.)',
      sub: '198.41.0.4',
      icon: Globe,
      x: 68,
      y: 88,
      color: 'text-indigo-400',
    },
    {
      id: 'tld-dns',
      label: 'TLD (.dev)',
      sub: '192.5.6.30',
      icon: Server,
      x: 86,
      y: 88,
      color: 'text-violet-400',
    },
    {
      id: 'auth-dns',
      label: 'Authoritative DNS',
      sub: 'systemslab.dev',
      icon: Database,
      x: 92,
      y: 62,
      color: 'text-purple-400',
    },
    {
      id: 'web-server',
      label: 'Edge Web Server',
      sub: targetServerIp,
      icon: Server,
      x: 65,
      y: 20,
      color: 'text-emerald-400',
    },
    {
      id: 'app-engine',
      label: 'Backend / DB',
      sub: '10.0.4.18:5432',
      icon: HardDrive,
      x: 90,
      y: 20,
      color: 'text-amber-400',
    },
  ];

  const activeSource = nodes.find((n) => n.id === currentStep?.sourceNode);
  const activeTarget = nodes.find((n) => n.id === currentStep?.targetNode);

  return (
    <div className="space-y-6">
      {/* Module Title & Configuration Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="cyan">MODULE 01</Badge>
            <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted font-semibold">
              NETWORK PROTOCOL STACK
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight">
            The Life of a URL Request
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl font-sans">
            {moduleData.tagline}
          </p>
        </div>

        {/* Interactive URL and Protocol Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Protocol Switcher */}
          <div className="flex bg-parchment-200/50 dark:bg-parchment-950 p-1 rounded-xl border border-parchment-300/70 dark:border-parchment-800 text-xs font-mono">
            <button
              onClick={() => {
                playTick();
                setProtocolMode('HTTPS');
                setCurrentStepIdx(0);
              }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold',
                protocolMode === 'HTTPS'
                  ? 'bg-emerald-500/10 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>HTTPS (TLS 1.3)</span>
            </button>
            <button
              onClick={() => {
                playTick();
                setProtocolMode('HTTP');
                setCurrentStepIdx(0);
              }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold',
                protocolMode === 'HTTP'
                  ? 'bg-amber-500/10 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-2xs'
                  : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <Unlock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>HTTP (Plaintext)</span>
            </button>
          </div>

          {/* DNS Cache Scenario */}
          <div className="flex items-center gap-1.5 bg-parchment-100 dark:bg-parchment-950 px-2.5 py-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">DNS Cache:</span>
            <select
              value={dnsCacheMode}
              onChange={(e) => {
                playTick();
                setDnsCacheMode(e.target.value as DnsCacheStatus);
                setCurrentStepIdx(0);
              }}
              className="bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="full-miss">Full Miss (Root → TLD → Auth)</option>
              <option value="browser-hit">Browser Cache Hit (0 RTT)</option>
              <option value="os-hit">OS Cache Hit (/etc/hosts)</option>
            </select>
          </div>

          {/* DNS Record Type Selector */}
          <div className="flex items-center gap-1.5 bg-parchment-100 dark:bg-parchment-950 px-2.5 py-1.5 rounded-xl border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
            <span className="text-ink-muted dark:text-ink-darkMuted">Record:</span>
            <select
              value={dnsRecordType}
              onChange={(e) => {
                playTick();
                setDnsRecordType(e.target.value as 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT');
                setCurrentStepIdx(0);
              }}
              className="bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
            >
              <option value="A">A (IPv4)</option>
              <option value="AAAA">AAAA (IPv6)</option>
              <option value="CNAME">CNAME (Alias)</option>
              <option value="MX">MX (Mail Exchanger)</option>
              <option value="TXT">TXT (SPF/Domain)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Diagram & Packet Canvas */}
      <div className="relative rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 p-4 sm:p-6 overflow-hidden bg-grid-pattern shadow-xs">
        {/* URL Address Bar Simulation */}
        <div className="max-w-xl mx-auto mb-6 flex items-center gap-2 p-2 rounded-xl bg-parchment-50 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 shadow-inner">
          <div className="flex items-center gap-1 px-2 text-ink-muted font-mono text-xs">
            {protocolMode === 'HTTPS' ? (
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span
              className={
                protocolMode === 'HTTPS'
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-amber-700 dark:text-amber-400 font-semibold'
              }
            >
              {protocolMode.toLowerCase()}://
            </span>
          </div>
          <input
            type="text"
            value={url.replace(/^https?:\/\//, '')}
            onChange={(e) => setUrl(`${protocolMode.toLowerCase()}://${e.target.value}`)}
            className="flex-1 bg-transparent text-xs font-mono text-ink-light dark:text-ink-dark focus:outline-none border-b border-transparent focus:border-cyan-500 py-1"
          />
          <button
            onClick={() => {
              playTick();
              setCurrentStepIdx(0);
              setIsPlaying(true);
            }}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <span>Request</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Network Topology Visualizer Canvas */}
        <div className="relative w-full h-[380px] sm:h-[420px] rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/80 overflow-hidden">
          {/* SVG Animated Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="cyanLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Static topology dashed guides */}
            <path
              d="M 100 130 Q 300 130 500 90"
              stroke="currentColor"
              className="text-parchment-300 dark:text-parchment-800"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            <path
              d="M 120 180 Q 250 280 350 280"
              stroke="currentColor"
              className="text-parchment-300 dark:text-parchment-800"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            <path
              d="M 350 280 L 520 280"
              stroke="currentColor"
              className="text-parchment-300 dark:text-parchment-800"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            <path
              d="M 520 280 L 680 320"
              stroke="currentColor"
              className="text-parchment-300 dark:text-parchment-800"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            <path
              d="M 680 320 L 820 320"
              stroke="currentColor"
              className="text-parchment-300 dark:text-parchment-800"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            <path
              d="M 820 320 L 880 240"
              stroke="currentColor"
              className="text-parchment-300 dark:text-parchment-800"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            <path
              d="M 650 90 L 850 90"
              stroke="currentColor"
              className="text-parchment-300 dark:text-parchment-800"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />

            {/* Active Packet Transmission Line */}
            {activeSource && activeTarget && activeSource.id !== activeTarget.id && (
              <line
                x1={`${activeSource.x}%`}
                y1={`${activeSource.y}%`}
                x2={`${activeTarget.x}%`}
                y2={`${activeTarget.y}%`}
                stroke="url(#cyanLine)"
                strokeWidth="3"
                strokeDasharray="6 6"
                className="animate-pulse"
                filter="url(#glow)"
              />
            )}
          </svg>

          {/* Render Nodes */}
          {nodes.map((node) => {
            const Icon = node.icon;
            const isSource = activeSource?.id === node.id;
            const isTarget = activeTarget?.id === node.id;
            const isActive = isSource || isTarget;

            return (
              <div
                key={node.id}
                className={clsx(
                  'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all duration-300',
                  isActive ? 'scale-110 z-20' : 'opacity-85 hover:opacity-100 z-10'
                )}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <div
                  className={clsx(
                    'relative w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 shadow-md',
                    isActive
                      ? isSource
                        ? 'bg-cyan-500/10 dark:bg-cyan-950 border-cyan-500 text-cyan-700 dark:text-cyan-300 ring-4 ring-cyan-500/20'
                        : 'bg-emerald-500/10 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-4 ring-emerald-500/20'
                      : 'bg-white dark:bg-parchment-900 border-parchment-300 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted hover:border-parchment-400'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500" />
                    </span>
                  )}
                </div>

                <div className="mt-2 text-center whitespace-nowrap">
                  <div
                    className={clsx(
                      'text-[11px] font-semibold font-mono',
                      isActive
                        ? 'text-ink-light dark:text-ink-dark'
                        : 'text-ink-muted dark:text-ink-darkMuted'
                    )}
                  >
                    {node.label}
                  </div>
                  <div className="text-[9px] font-mono text-ink-muted dark:text-ink-darkMuted">
                    {node.sub}
                  </div>
                </div>
              </div>
            );
          })}

          {/* In-Flight Packet Inspector Pill */}
          <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white/95 dark:bg-parchment-900/95 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping-slow" />
                <span className="text-ink-muted dark:text-ink-darkMuted font-semibold">
                  PROTOCOL:
                </span>
                <span className="text-cyan-700 dark:text-cyan-300 font-bold">
                  {currentStep.protocol}
                </span>
              </div>
              <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted bg-parchment-100 dark:bg-parchment-800 px-1.5 py-0.5 rounded border border-parchment-200 dark:border-parchment-700 font-semibold">
                +{currentStep.latencyMs} ms
              </span>
            </div>

            <div className="text-xs font-mono font-medium text-ink-light dark:text-ink-dark truncate">
              {currentStep.packetSummary}
            </div>

            <div className="mt-2 pt-2 border-t border-parchment-200 dark:border-parchment-800 grid grid-cols-2 gap-2 text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted">
              <div>
                <span>SRC: </span>
                <span className="text-ink-light dark:text-ink-dark">
                  {currentStep.srcIp}:{currentStep.srcPort || 'any'}
                </span>
              </div>
              <div>
                <span>DST: </span>
                <span className="text-ink-light dark:text-ink-dark">
                  {currentStep.dstIp}:{currentStep.dstPort || 'any'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Explanation Banner */}
        <div className="mt-4 p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="cyan">{currentStep.phase}</Badge>
              <h3 className="text-sm font-serif font-bold text-ink-light dark:text-ink-dark">
                {currentStep.title}
              </h3>
            </div>
            <div className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-ink-muted dark:text-ink-darkMuted" />
              <span>Elapsed: {cumulativeLatency} ms (Estimated)</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-ink-light dark:text-ink-dark leading-relaxed font-sans">
            {currentStep.explanation}
          </p>

          {/* Packet Header Inspector Accordion */}
          {Object.keys(currentStep.packetHeaders).length > 0 && (
            <div className="mt-3 pt-3 border-t border-parchment-200 dark:border-parchment-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted block mb-1.5 font-semibold">
                Packet Headers & Wire Metadata
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono">
                {Object.entries(currentStep.packetHeaders).map(([k, v]) => (
                  <div
                    key={k}
                    className="p-1.5 rounded-lg bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 flex items-start justify-between gap-2"
                  >
                    <span className="text-ink-muted dark:text-ink-darkMuted text-[11px]">{k}:</span>
                    <span className="text-cyan-700 dark:text-cyan-300 text-[11px] font-semibold truncate">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Simulation Controls Deck */}
        <div className="mt-4">
          <SimulationControls
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onStepForward={() => {
              if (currentStepIdx < steps.length - 1) {
                setCurrentStepIdx((prev) => prev + 1);
              }
            }}
            onStepBackward={() => {
              if (currentStepIdx > 0) {
                setCurrentStepIdx((prev) => prev - 1);
              }
            }}
            onReset={() => {
              setIsPlaying(false);
              setCurrentStepIdx(0);
            }}
            canStepForward={currentStepIdx < steps.length - 1}
            canStepBackward={currentStepIdx > 0}
            speed={speed}
            onSpeedChange={setSpeed}
            currentStep={currentStepIdx + 1}
            totalSteps={steps.length}
            statusText={
              isPlaying
                ? 'TRANSMITTING PACKETS'
                : currentStepIdx === steps.length - 1
                  ? 'PAGE RENDERED'
                  : 'PAUSED'
            }
            variant="network"
          />
        </div>

        {/* Deep Protocol Inspectors Toolbar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 text-xs font-mono">
          <span className="text-[11px] text-ink-muted dark:text-ink-darkMuted font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Deep Wire Analysis:</span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                playTick();
                setActiveInspector(activeInspector === 'hexdump' ? 'none' : 'hexdump');
              }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs cursor-pointer font-semibold',
                activeInspector === 'hexdump'
                  ? 'bg-cyan-500/10 dark:bg-cyan-950 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-2xs'
                  : 'bg-white dark:bg-parchment-900 border-parchment-300 dark:border-parchment-700 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <Binary className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Wireshark Wire Hex</span>
              {activeInspector === 'hexdump' ? (
                <ChevronUp className="w-3 h-3 ml-0.5" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                playTick();
                setActiveInspector(activeInspector === 'waterfall' ? 'none' : 'waterfall');
              }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs cursor-pointer font-semibold',
                activeInspector === 'waterfall'
                  ? 'bg-emerald-500/10 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'bg-white dark:bg-parchment-900 border-parchment-300 dark:border-parchment-700 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Latency Waterfall (Gantt)</span>
              {activeInspector === 'waterfall' ? (
                <ChevronUp className="w-3 h-3 ml-0.5" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                playTick();
                setActiveInspector(activeInspector === 'mtu' ? 'none' : 'mtu');
              }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs cursor-pointer font-semibold',
                activeInspector === 'mtu'
                  ? 'bg-purple-500/10 dark:bg-purple-950 border-purple-500 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'bg-white dark:bg-parchment-900 border-parchment-300 dark:border-parchment-700 text-ink-muted dark:text-ink-darkMuted hover:text-ink-light dark:hover:text-ink-dark'
              )}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>MTU & TCP Sizer</span>
              {activeInspector === 'mtu' ? (
                <ChevronUp className="w-3 h-3 ml-0.5" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Conditionally Rendered Deep Views */}
        {activeInspector === 'hexdump' && currentStep && (
          <div className="mt-4">
            <HexDumpViewer step={currentStep} dnsRecordType={dnsRecordType} />
          </div>
        )}

        {activeInspector === 'waterfall' && (
          <div className="mt-4">
            <LatencyWaterfall
              steps={steps}
              currentStepIdx={currentStepIdx}
              onSelectStep={(idx) => setCurrentStepIdx(idx)}
              protocolMode={protocolMode}
              dnsCacheMode={dnsCacheMode}
            />
          </div>
        )}

        {activeInspector === 'mtu' && (
          <div className="mt-4">
            <MtuFragmentationVisualizer />
          </div>
        )}
      </div>

      {/* Latency Contribution Breakdown & Live Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Cumulative Latency"
          value={cumulativeLatency}
          unit="ms"
          change={currentStepIdx === steps.length - 1 ? 'COMPLETED' : 'IN-PROGRESS'}
          trend="up"
          variant="cyan"
          description="Total physical serialization & RTT delay"
        />
        <MetricCard
          label="DNS Resolution"
          value={dnsCacheMode === 'browser-hit' ? 0 : dnsCacheMode === 'os-hit' ? 3 : 102}
          unit="ms"
          trend={dnsCacheMode === 'browser-hit' ? 'up' : 'down'}
          change={dnsCacheMode === 'browser-hit' ? 'CACHE HIT' : 'COLD MISS'}
          variant={dnsCacheMode === 'browser-hit' ? 'emerald' : 'zinc'}
          description="Recursive root, TLD and Auth traversal"
        />
        <MetricCard
          label="TCP + TLS Handshake"
          value={protocolMode === 'HTTPS' ? 114 : 66}
          unit="ms"
          trend="neutral"
          change={protocolMode === 'HTTPS' ? '1 RTT TLS 1.3' : 'NO TLS'}
          variant={protocolMode === 'HTTPS' ? 'cyan' : 'amber'}
          description="Reliable transport & session key derivation"
        />
        <MetricCard
          label="Time to First Byte (TTFB)"
          value={cumulativeLatency > 150 ? 150 : cumulativeLatency}
          unit="ms"
          trend="neutral"
          variant="zinc"
          description="From enter keystroke to HTTP response header"
        />
      </div>

      {/* Telemetry Log & Interactive Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalLog
          logs={logs}
          onClear={() => setLogs([])}
          title="WIRESHARK & SOCKET TELEMETRY LOG"
          maxHeight="max-h-56"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-semibold">
              Module Challenges
            </h4>
            <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-semibold">
              Solve by manipulating controls
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

      {/* Architectural Deep-Dive Drawer */}
      <ExplanationDrawer module={moduleData} />
    </div>
  );
};
