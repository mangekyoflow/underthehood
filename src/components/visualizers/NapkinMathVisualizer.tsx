import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Server,
  Database,
  Cloud,
  Zap,
  Users,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Sliders,
  Layers,
  HardDrive,
  Wifi,
  Activity,
  Info,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { playTick, playSuccess, playAlert } from '../../lib/sound';

interface Props {
  onChallengeComplete?: (id: string) => void;
  isChallengeSolved?: (id: string) => boolean;
}

interface NapkinStep {
  short: string;
  title: string;
  chapter: string;
  body: string[];
  callout: { kind: 'insight' | 'tip' | 'warn' | 'next'; text: string };
  scratchpad: {
    title: string;
    lines: string[];
    highlight?: string;
  };
}

export const NapkinMathVisualizer: React.FC<Props> = ({
  onChallengeComplete,
  isChallengeSolved,
}) => {
  // Navigation & Step State
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const prevStepRef = useRef(currentStep);

  // Interactive What-If Capacity Sliders
  const [dauMillions, setDauMillions] = useState<number>(10);
  const [requestsPerUser, setRequestsPerUser] = useState<number>(20);
  const [peakMultiplier, setPeakMultiplier] = useState<number>(3.0);
  const [serverCapacityRps, setServerCapacityRps] = useState<number>(1000);
  const [dailyPhotosMillions, setDailyPhotosMillions] = useState<number>(1.0);
  const [photoSizeMb, setPhotoSizeMb] = useState<number>(2.0);
  const [showWhatIf, setShowWhatIf] = useState<boolean>(false);

  // Direction tracking for animated step slide
  useEffect(() => {
    if (currentStep !== prevStepRef.current) {
      setSlideDirection(currentStep > prevStepRef.current ? 'next' : 'prev');
      prevStepRef.current = currentStep;
    }
  }, [currentStep]);

  // Derived Napkin Calculations
  const calc = useMemo(() => {
    const dau = dauMillions * 1_000_000;
    const totalDailyReqs = dau * requestsPerUser;
    // Napkin rule: 1 day ≈ 100,000 s (exact: 86,400 s)
    const exactAvgQps = Math.round(totalDailyReqs / 86_400);
    const napkinAvgQps = Math.round(totalDailyReqs / 100_000);
    const peakQps = Math.round(exactAvgQps * peakMultiplier);
    const serversMin = Math.ceil(peakQps / serverCapacityRps);
    const serversWithHeadroom = Math.ceil(serversMin * 1.3); // +30% headroom

    // Storage
    const photoUploads = dailyPhotosMillions * 1_000_000;
    const dailyStorageTb = (photoUploads * photoSizeMb) / (1024 * 1024);
    const yearlyStorageTb = Math.round(dailyStorageTb * 365);
    const yearlyReplicatedPb = ((yearlyStorageTb * 3) / 1024).toFixed(1);

    // Egress Bandwidth: 100 thumbnails (200 KB each) per user per day = 20 MB/user/day
    const dailyEgressTb = (dau * 20) / (1024 * 1024);
    const egressGbps = Math.round((dailyEgressTb * 1024 * 1024 * 8) / 86_400 / 1000);

    // Cache RAM: hot profiles (10M * 2KB = 20GB) + new photos (1M * 1KB = 1GB)
    const hotProfilesGb = (dau * 2) / (1024 * 1024);
    const hotPhotosGb = (photoUploads * 1) / (1024 * 1024);
    const totalCacheGb = Math.round(hotProfilesGb + hotPhotosGb);

    return {
      dau,
      totalDailyReqs,
      exactAvgQps,
      napkinAvgQps,
      peakQps,
      serversMin,
      serversWithHeadroom,
      dailyStorageTb: dailyStorageTb.toFixed(1),
      yearlyStorageTb,
      yearlyReplicatedPb,
      dailyEgressTb: Math.round(dailyEgressTb),
      egressGbps,
      totalCacheGb,
    };
  }, [
    dauMillions,
    requestsPerUser,
    peakMultiplier,
    serverCapacityRps,
    dailyPhotosMillions,
    photoSizeMb,
  ]);

  // Challenge checks
  useEffect(() => {
    if (dauMillions === 25 && onChallengeComplete && !isChallengeSolved?.('challenge-napkin-1')) {
      onChallengeComplete('challenge-napkin-1');
      playSuccess();
    }
  }, [dauMillions, onChallengeComplete, isChallengeSolved]);

  useEffect(() => {
    if (currentStep === 6 && onChallengeComplete && !isChallengeSolved?.('challenge-napkin-2')) {
      onChallengeComplete('challenge-napkin-2');
      playSuccess();
    }
  }, [currentStep, onChallengeComplete, isChallengeSolved]);

  // Step definitions matching designed-to-scale.vercel.app/#/napkin-math/1
  const steps: NapkinStep[] = [
    {
      short: 'The question',
      chapter: 'problem',
      title: 'Will one server do?',
      body: [
        'You’re designing PhotoShare. Before choosing any technology or drafting microservice diagrams, you need a sense of scale: is this one server, or a hundred?',
        'You don’t need exact decimals — just the right order of magnitude. Napkin math gets you there in minutes.',
      ],
      callout: {
        kind: 'insight',
        text: 'Principal architects and technical interviewers both start here: rough numbers first, then design the architecture to fit them.',
      },
      scratchpad: {
        title: 'Initial Scale Questions',
        lines: [
          'PhotoShare product target:',
          '• 10M Daily Active Users (DAU)',
          '• 1M Photo uploads per day',
          '• Will a single EC2 / VPS instance cope?',
          '• How much storage and bandwidth?',
        ],
        highlight: 'Order of Magnitude: 1 machine or 100?',
      },
    },
    {
      short: 'Requests / s',
      chapter: 'technique',
      title: 'Daily users → requests per second',
      body: [
        'Start from what you know: users and how often they act. 10M users × 20 requests = 200M requests a day.',
        'A day has 86,400 seconds. Round it to 100,000 — napkin math is about being quick, not precise. 200M ÷ 100,000 ≈ 2,000 req/s (exact: 2,300 req/s).',
      ],
      callout: {
        kind: 'tip',
        text: 'Handy shortcut: 1M requests per day ≈ 12 requests per second (12 × 200 = 2,400 req/s).',
      },
      scratchpad: {
        title: 'Requests per Second Math',
        lines: [
          '10M users × 20 req/day = 200M req/day',
          '1 day = 86,400 s  (round to ≈ 100,000 s)',
          '= 200M ÷ 86,400 ≈ 2,300 req/s average',
          'Shortcut: 1M req/day ≈ 12 req/s',
        ],
        highlight: 'Average load ≈ 2,300 req/s',
      },
    },
    {
      short: 'Peak',
      chapter: 'insight',
      title: 'Plan for the peak, not the average',
      body: [
        'Traffic isn’t flat: people browse heavily in the evening, on lunch breaks, and during breaking events. A typical internet peak is 2–3× the daily average.',
        'Size for 3× (7,000 req/s) and a lone server is clearly overwhelmed: connection queues saturate, socket buffers overflow, and packet drop skyrockets to 35%+.',
      ],
      callout: {
        kind: 'warn',
        text: 'A system sized only for its average load is down at exactly the moment most users open the app!',
      },
      scratchpad: {
        title: 'Peak Traffic Calculation',
        lines: [
          'Evening spike factor ≈ 3× daily average',
          '2,300 req/s × 3 = ~7,000 req/s peak',
          'Single server load limit: ~1,000 req/s',
          'Server operating at >230% capacity!',
        ],
        highlight: 'Lone server OVERLOADED (35% drops)',
      },
    },
    {
      short: 'Web Tier',
      chapter: 'solution',
      title: 'How many servers?',
      body: [
        'A production load test shows a typical compute instance handles about 1,000 req/s cleanly. With peak traffic at 7,000 req/s, we need 7 servers.',
        'Add ~30% headroom for sudden traffic spikes and server failures (N+2 redundancy): 7 × 1.3 ≈ 10 servers. Each server runs comfortably at ~70% CPU during peak.',
      ],
      callout: {
        kind: 'tip',
        text: 'Distributing traffic evenly across these 10 instances is the job of a Layer 4 / Layer 7 Load Balancer.',
      },
      scratchpad: {
        title: 'Compute Fleet Sizing',
        lines: [
          '1 server capacity ≈ 1,000 req/s (benchmarked)',
          '7,000 peak req/s ÷ 1,000 = 7 servers required',
          '+ 30% headroom (failover & spikes)',
          '= 10 Web Servers (70% busy at peak)',
        ],
        highlight: 'Web Tier: 10 Servers behind Load Balancer',
      },
    },
    {
      short: 'Storage',
      chapter: 'technique',
      title: 'How much storage?',
      body: [
        'Photos are the heavy asset: 1M photo uploads × 2 MB = 2 TB per day. Over a single year, that compounds to ~730 TB of raw storage.',
        'Cloud storage (S3, GCS) maintains 3 geometric replicas across availability zones so a failed drive loses nothing. Plan for about 2.2 PB in year one. That rules out a single database disk immediately.',
      ],
      callout: {
        kind: 'insight',
        text: 'Storage grows every single day and never resets. Requests per second come and go; bytes stay forever.',
      },
      scratchpad: {
        title: 'Storage Tier Math',
        lines: [
          '1M photos × 2 MB = 2 TB per day',
          '2 TB × 365 days ≈ 730 TB per year raw',
          '× 3 copies for durability ≈ 2.2 PB',
          '= Plan for ~2 PB object store in Year 1',
        ],
        highlight: 'Storage Tier: ~2 PB / year (3× replicated)',
      },
    },
    {
      short: 'Bandwidth',
      chapter: 'technique',
      title: 'How much network & CDN egress?',
      body: [
        'Uploads are the small part: 2 TB a day is about 20 MB/s coming in. Viewing is the big part: if each user views 100 photos a day as 200 KB thumbnails, that’s 200 TB a day going out!',
        '200 TB ÷ 86,400 s ≈ 2.3 GB/s — about 18 Gbit/s on average, and over 40 Gbit/s at peak. That is a job for an Edge CDN (Cloudflare/CloudFront), not your 10 web servers.',
      ],
      callout: {
        kind: 'insight',
        text: 'Read-heavy media apps are almost always limited by network bandwidth before CPU! Always estimate egress bytes early.',
      },
      scratchpad: {
        title: 'Network Egress Calculation',
        lines: [
          'Upload bandwidth in: 2 TB/day ≈ 20 MB/s',
          'View egress: 10M users × 100 photos × 200 KB',
          '= 200 TB per day egress',
          '200 TB ÷ 100,000 s ≈ 2 GB/s = ~16 Gbit/s',
        ],
        highlight: 'CDN Edge required: ~16 Gbit/s egress',
      },
    },
    {
      short: 'Cache size',
      chapter: 'technique',
      title: 'Will the hot data fit in memory?',
      body: [
        'Feeds query photo metadata and user profiles on every scroll. Could a fast Redis/Memcached cache hold the working set? Hot user profiles: 10M × 2 KB = 20 GB. Today’s new photos: 1M × 1 KB metadata = 1 GB.',
        'About 21 GB total — it easily fits in the RAM of a single 64 GB cache server (with a replica for high availability). No exotic sharded memory cluster needed!',
      ],
      callout: {
        kind: 'tip',
        text: 'Napkin math often says: “this working set is much smaller than you think”. That is just as valuable as discovering something huge.',
      },
      scratchpad: {
        title: 'Cache Memory Sizing',
        lines: [
          'User profiles: 10M × 2 KB = 20 GB',
          'New photo metadata: 1M × 1 KB = 1 GB',
          'Total working set = ~21 GB hot RAM',
          'Fits in one 64 GB Redis instance (+ 1 replica)',
        ],
        highlight: 'Cache Tier: 21 GB in RAM (1 Instance)',
      },
    },
    {
      short: 'Numbers',
      chapter: 'insight',
      title: 'Numbers worth memorising',
      body: [
        'A handful of hardware and network constants make 95% of all architecture estimates possible. Memorize orders of magnitude, not exact digits.',
        'Notice the 1,000× jump between RAM and SSD, and the 100× jump between local datacenter LAN and cross-ocean transatlantic hops.',
      ],
      callout: {
        kind: 'next',
        text: 'Ready to try your own architecture? Open the "What-If Capacity Sandbox" below to test different DAU, photo sizes, and traffic spikes!',
      },
      scratchpad: {
        title: 'Rules of Thumb',
        lines: [
          '1 day ≈ 100,000 seconds (exact 86.4k)',
          '1M req/day ≈ 12 req/s',
          '1 KB × 1M = 1 GB',
          '1 MB × 1M = 1 TB',
          'RAM: 100 ns | NVMe: 100 µs | LAN: 0.5 ms',
        ],
        highlight: 'Hardware Latency Reference Table',
      },
    },
  ];

  const activeStep = steps[currentStep] || steps[0];

  const handleStepSelect = (idx: number) => {
    playTick();
    setCurrentStep(idx);
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      playTick();
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      playTick();
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    playTick();
    setCurrentStep(0);
    setDauMillions(10);
    setRequestsPerUser(20);
    setPeakMultiplier(3.0);
    setServerCapacityRps(1000);
    setDailyPhotosMillions(1.0);
    setPhotoSizeMb(2.0);
  };

  return (
    <div className="space-y-6">
      {/* Real-time Metric Chips Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Daily Active Users"
          value={`${dauMillions}M`}
          unit="DAU"
          variant="cyan"
          trend="neutral"
          description="Active PhotoShare users"
        />
        <MetricCard
          label="Average Load"
          value={currentStep === 0 ? '?' : `${calc.exactAvgQps.toLocaleString()}`}
          unit={currentStep === 0 ? '' : 'req/s'}
          variant="blue"
          trend="neutral"
          description="Sustained 24h baseline"
        />
        <MetricCard
          label="Peak Traffic (3×)"
          value={currentStep < 2 ? '?' : `${calc.peakQps.toLocaleString()}`}
          unit={currentStep < 2 ? '' : 'req/s'}
          variant={currentStep === 2 ? 'amber' : 'purple'}
          trend={currentStep === 2 ? 'alert' : 'neutral'}
          description="Evening browse burst"
        />
        <MetricCard
          label="Web Tier Compute"
          value={currentStep < 3 ? '?' : `${calc.serversWithHeadroom}`}
          unit={currentStep < 3 ? '' : 'servers'}
          variant="emerald"
          trend="up"
          description="1,000 rps + 30% buffer"
        />
        <MetricCard
          label="Year 1 Storage"
          value={currentStep < 4 ? '?' : `${calc.yearlyStorageTb} TB`}
          unit={currentStep < 4 ? '' : `(~${calc.yearlyReplicatedPb} PB)`}
          variant="zinc"
          trend="neutral"
          description="3× Geo-Replication"
        />
        <MetricCard
          label="Hot Cache RAM"
          value={currentStep < 6 ? '?' : `${calc.totalCacheGb} GB`}
          unit={currentStep < 6 ? '' : 'RAM'}
          variant="emerald"
          trend="up"
          description="Profiles & Photo Index"
        />
      </div>

      {/* Main Interactive Stage: Architecture SVG + Napkin Scratchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dynamic SVG System Topology Canvas (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-parchment-200 dark:border-parchment-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-light dark:text-ink-dark">
                Live System Architecture Topology
              </span>
            </div>
            <span className="text-[11px] font-mono text-ink-muted dark:text-ink-darkMuted">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="py-6 px-2 relative min-h-[340px] flex items-center justify-center">
            <svg viewBox="0 0 760 320" className="w-full h-auto max-h-[380px] overflow-visible">
              <defs>
                <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="cdnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Connected Animated Flow Paths */}
              {/* Users -> Server / LB */}
              <path
                d={currentStep < 3 ? 'M 130 160 L 380 160' : 'M 130 160 L 260 160'}
                fill="none"
                stroke={currentStep === 2 ? '#ef4444' : '#3b82f6'}
                strokeWidth={currentStep === 2 ? '3.5' : '2.5'}
                strokeDasharray="6 6"
                className={`animate-packet-flow ${currentStep === 2 ? 'opacity-90' : 'opacity-70'}`}
              />

              {/* LB -> Web Tier Servers (visible when step >= 3) */}
              {currentStep >= 3 && (
                <>
                  <path
                    d="M 330 160 L 410 90"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    className="animate-packet-flow opacity-70"
                  />
                  <path
                    d="M 330 160 L 410 160"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    className="animate-packet-flow opacity-70"
                  />
                  <path
                    d="M 330 160 L 410 230"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    className="animate-packet-flow opacity-70"
                  />
                </>
              )}

              {/* Web Tier -> Storage (visible when step >= 4) */}
              {currentStep >= 4 && (
                <path
                  d="M 530 160 L 630 100"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  className="animate-packet-flow opacity-70"
                />
              )}

              {/* Web Tier -> Cache (visible when step >= 6) */}
              {currentStep >= 6 && (
                <path
                  d="M 530 160 L 630 220"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  className="animate-packet-flow opacity-70"
                />
              )}

              {/* Users -> CDN (visible when step >= 5) */}
              {currentStep >= 5 && (
                <path
                  d="M 130 130 C 240 30, 480 30, 630 40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  className="animate-packet-flow opacity-80"
                />
              )}

              {/* NODE 1: USERS POOL */}
              <g transform="translate(40, 110)">
                <rect
                  width="90"
                  height="100"
                  rx="16"
                  fill="currentColor"
                  className="text-white dark:text-parchment-950"
                  stroke="#0ea5e9"
                  strokeWidth="1.5"
                />
                <circle cx="45" cy="38" r="18" fill="#e0f2fe" className="dark:fill-sky-950" />
                <Users className="w-5 h-5 text-sky-600 dark:text-sky-400" x="35" y="28" />
                <text
                  x="45"
                  y="70"
                  textAnchor="middle"
                  className="text-[11px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                >
                  {dauMillions}M Users
                </text>
                <text
                  x="45"
                  y="85"
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-current text-ink-muted dark:text-ink-darkMuted"
                >
                  {calc.exactAvgQps} req/s
                </text>
              </g>

              {/* STEP 0, 1, 2: SINGLE SERVER SCENARIO */}
              {currentStep < 3 && (
                <g transform="translate(380, 105)">
                  {/* Spotlight or Burst ring for overloaded server */}
                  {currentStep === 2 && (
                    <circle
                      cx="60"
                      cy="55"
                      r="70"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      className="animate-fx-burst opacity-80"
                    />
                  )}
                  <rect
                    width="120"
                    height="110"
                    rx="16"
                    fill="currentColor"
                    className={`transition-colors text-white dark:text-parchment-950 ${
                      currentStep === 2
                        ? 'stroke-red-500 stroke-2 shadow-lg'
                        : 'stroke-parchment-300 dark:stroke-parchment-700 stroke-1'
                    }`}
                  />
                  <rect
                    x="10"
                    y="10"
                    width="100"
                    height="24"
                    rx="6"
                    fill={currentStep === 2 ? '#fef2f2' : '#f0fdf4'}
                    className={
                      currentStep === 2 ? 'dark:fill-red-950/50' : 'dark:fill-emerald-950/40'
                    }
                  />
                  <text
                    x="60"
                    y="26"
                    textAnchor="middle"
                    className={`text-[10px] font-mono font-bold ${
                      currentStep === 2
                        ? 'fill-red-600 dark:fill-red-400'
                        : 'fill-emerald-600 dark:fill-emerald-400'
                    }`}
                  >
                    {currentStep === 0
                      ? '1 SERVER (?)'
                      : currentStep === 1
                        ? '1 SERVER (80%)'
                        : 'OVERLOADED (230%)'}
                  </text>
                  <Server
                    className={`w-8 h-8 mx-auto mt-4 ${currentStep === 2 ? 'text-red-500 animate-bounce' : 'text-blue-500'}`}
                    x="44"
                    y="38"
                  />
                  <text
                    x="60"
                    y="88"
                    textAnchor="middle"
                    className="text-[10px] font-mono font-semibold fill-current text-ink-light dark:text-ink-dark"
                  >
                    App Server
                  </text>
                  <text
                    x="60"
                    y="100"
                    textAnchor="middle"
                    className="text-[8px] font-mono fill-current text-ink-muted"
                  >
                    {currentStep === 2 ? '35% Packet Drop!' : '1,000 rps limit'}
                  </text>
                </g>
              )}

              {/* STEP 3+: LOAD BALANCER & WEB TIER FLEET */}
              {currentStep >= 3 && (
                <>
                  {/* Load Balancer */}
                  <g transform="translate(250, 115)">
                    <rect
                      width="80"
                      height="90"
                      rx="14"
                      fill="currentColor"
                      className="text-white dark:text-parchment-950 stroke-blue-500 stroke-1.5 shadow-sm"
                    />
                    <circle cx="40" cy="34" r="16" fill="#eff6ff" className="dark:fill-blue-950" />
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" x="30" y="24" />
                    <text
                      x="40"
                      y="64"
                      textAnchor="middle"
                      className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                    >
                      Load Balancer
                    </text>
                    <text
                      x="40"
                      y="78"
                      textAnchor="middle"
                      className="text-[8px] font-mono fill-current text-blue-600 dark:text-blue-400"
                    >
                      L4/L7 Anycast
                    </text>
                  </g>

                  {/* Web Fleet Cluster */}
                  <g transform="translate(410, 60)">
                    <rect
                      width="125"
                      height="200"
                      rx="16"
                      fill="currentColor"
                      className="text-white dark:text-parchment-950 stroke-emerald-500/60 stroke-1.5 shadow-sm"
                    />
                    <rect
                      x="8"
                      y="8"
                      width="109"
                      height="22"
                      rx="6"
                      fill="#ecfdf5"
                      className="dark:fill-emerald-950/40"
                    />
                    <text
                      x="62"
                      y="23"
                      textAnchor="middle"
                      className="text-[9px] font-mono font-bold fill-emerald-600 dark:fill-emerald-400"
                    >
                      WEB TIER · {calc.serversWithHeadroom} NODES
                    </text>

                    {/* Server Nodes Micro-Cards */}
                    {[0, 1, 2].map((sIdx) => (
                      <g key={sIdx} transform={`translate(10, ${38 + sIdx * 50})`}>
                        <rect
                          width="105"
                          height="42"
                          rx="8"
                          fill="#f8fafc"
                          className="dark:fill-parchment-900 border"
                          stroke="#e2e8f0"
                          strokeWidth="1"
                        />
                        <Server
                          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                          x="8"
                          y="14"
                        />
                        <text
                          x="30"
                          y="20"
                          className="text-[9px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                        >
                          Server #{sIdx + 1}
                        </text>
                        <text
                          x="30"
                          y="32"
                          className="text-[8px] font-mono fill-emerald-600 dark:fill-emerald-400 font-semibold"
                        >
                          ~70% CPU (700 rps)
                        </text>
                      </g>
                    ))}
                  </g>
                </>
              )}

              {/* STEP 5+: CDN EDGE NETWORK */}
              {currentStep >= 5 && (
                <g transform="translate(620, 15)">
                  <rect
                    width="115"
                    height="65"
                    rx="12"
                    fill="currentColor"
                    className="text-white dark:text-parchment-950 stroke-emerald-500 stroke-1.5 shadow-sm"
                  />
                  <Cloud className="w-4 h-4 text-emerald-500" x="12" y="14" />
                  <text
                    x="34"
                    y="26"
                    className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                  >
                    Edge CDN
                  </text>
                  <text
                    x="12"
                    y="44"
                    className="text-[8px] font-mono fill-emerald-600 dark:fill-emerald-400 font-semibold"
                  >
                    {calc.egressGbps} Gbit/s Egress
                  </text>
                  <text
                    x="12"
                    y="55"
                    className="text-[7.5px] font-mono fill-current text-ink-muted"
                  >
                    Photo Thumbnail Offload
                  </text>
                </g>
              )}

              {/* STEP 4+: STORAGE TIER */}
              {currentStep >= 4 && (
                <g transform="translate(620, 95)">
                  <rect
                    width="115"
                    height="80"
                    rx="12"
                    fill="currentColor"
                    className="text-white dark:text-parchment-950 stroke-purple-500 stroke-1.5 shadow-sm"
                  />
                  <Database className="w-4 h-4 text-purple-500" x="12" y="14" />
                  <text
                    x="34"
                    y="26"
                    className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                  >
                    Object Store
                  </text>
                  <text
                    x="12"
                    y="44"
                    className="text-[8.5px] font-mono fill-purple-600 dark:fill-purple-400 font-semibold"
                  >
                    {calc.yearlyStorageTb} TB / Year
                  </text>
                  <text x="12" y="56" className="text-[8px] font-mono fill-current text-ink-muted">
                    ~{calc.yearlyReplicatedPb} PB (3× Replicas)
                  </text>
                  <text
                    x="12"
                    y="68"
                    className="text-[7.5px] font-mono fill-emerald-600 dark:fill-emerald-400"
                  >
                    Durable Disk Fleet
                  </text>
                </g>
              )}

              {/* STEP 6+: IN-MEMORY CACHE (REDIS) */}
              {currentStep >= 6 && (
                <g transform="translate(620, 195)">
                  <rect
                    width="115"
                    height="80"
                    rx="12"
                    fill="currentColor"
                    className="text-white dark:text-parchment-950 stroke-amber-500 stroke-1.5 shadow-sm"
                  />
                  <Zap className="w-4 h-4 text-amber-500" x="12" y="14" />
                  <text
                    x="34"
                    y="26"
                    className="text-[10px] font-mono font-bold fill-current text-ink-light dark:text-ink-dark"
                  >
                    Redis Cache
                  </text>
                  <text
                    x="12"
                    y="44"
                    className="text-[8.5px] font-mono fill-amber-600 dark:fill-amber-400 font-semibold"
                  >
                    {calc.totalCacheGb} GB in RAM
                  </text>
                  <text x="12" y="56" className="text-[8px] font-mono fill-current text-ink-muted">
                    Hot Profiles & Index
                  </text>
                  <text
                    x="12"
                    y="68"
                    className="text-[7.5px] font-mono fill-emerald-600 dark:fill-emerald-400"
                  >
                    Fits in 64 GB Box
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Stepper Scrubber Bottom Bar */}
          <div className="pt-3 border-t border-parchment-200 dark:border-parchment-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {steps.map((st, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => handleStepSelect(sIdx)}
                  className={`btn-pop h-2.5 rounded-full transition-all duration-300 ease-out cursor-pointer ${
                    sIdx === currentStep
                      ? 'w-7 bg-blue-600 dark:bg-blue-400 shadow-sm scale-105'
                      : sIdx < currentStep
                        ? 'w-2.5 bg-emerald-500/70 dark:bg-emerald-400/70 hover:opacity-100 hover:scale-110'
                        : 'w-2.5 bg-parchment-300 dark:bg-parchment-700 hover:bg-parchment-400 hover:scale-110'
                  }`}
                  title={st.title}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 0}
                className="btn-pop px-3 py-1 rounded-lg border border-parchment-300 dark:border-parchment-700 text-xs font-mono disabled:opacity-40 disabled:pointer-events-none hover:bg-parchment-100 dark:hover:bg-parchment-800 transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                disabled={currentStep === steps.length - 1}
                className="btn-pop px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-semibold shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Handwritten Napkin Scratchpad + Architectural Reasoning (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Handwritten-Style Napkin Scratchpad Card */}
          <div className="p-5 rounded-2xl bg-parchment-100 dark:bg-parchment-950 border border-amber-600/30 dark:border-amber-500/20 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold rounded-bl-xl border-l border-b border-amber-500/20 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              NAPKIN SCRATCHPAD
            </div>

            <h4 className="text-sm font-serif font-bold text-ink-light dark:text-ink-dark mb-3 flex items-center gap-2">
              <span>{activeStep.scratchpad.title}</span>
            </h4>

            {/* Monospace Arithmetic Calculations */}
            <div className="space-y-1.5 font-mono text-xs text-ink-muted dark:text-ink-darkMuted bg-white/70 dark:bg-parchment-900/70 p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800">
              {activeStep.scratchpad.lines.map((line, lIdx) => (
                <div key={lIdx} className="leading-relaxed flex items-center justify-between">
                  <span>{line}</span>
                </div>
              ))}
            </div>

            {/* Highlighted Result Pill */}
            {activeStep.scratchpad.highlight && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 font-mono text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{activeStep.scratchpad.highlight}</span>
              </div>
            )}
          </div>

          {/* Staggered Step Explanation Card */}
          <div
            key={currentStep}
            className="guide__content is-in p-5 rounded-2xl bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 space-y-3.5 shadow-xs flex-1"
            style={
              { '--slide': `${slideDirection === 'prev' ? -18 : 18}px` } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-2">
              <Badge variant="cyan">STEP 0{currentStep + 1}</Badge>
              <h3 className="text-base font-serif font-bold text-ink-light dark:text-ink-dark">
                {activeStep.title}
              </h3>
            </div>

            {activeStep.body.map((p, pIdx) => (
              <p
                key={pIdx}
                className="text-xs sm:text-sm font-sans text-ink-light dark:text-ink-dark leading-relaxed"
              >
                {p}
              </p>
            ))}

            {/* Architectural Callout Tip */}
            <div
              className={`p-3.5 rounded-xl border text-xs font-sans flex items-start gap-2.5 ${
                activeStep.callout.kind === 'warn'
                  ? 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200'
                  : activeStep.callout.kind === 'tip'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-mono text-[10px] uppercase tracking-wider block mb-0.5">
                  {activeStep.callout.kind === 'warn'
                    ? 'Architecture Pitfall'
                    : 'Architectural Rule'}
                </strong>
                {activeStep.callout.text}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Latency Numbers Worth Memorising (Step 7 or Quick Reference) */}
      <div className="p-5 rounded-2xl bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-light dark:text-ink-dark">
              Latency Numbers Every Systems Architect Must Know (Jeff Dean's Rules)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
            Order of Magnitude Constants
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
            <span className="text-ink-muted text-[10px] block">L1 Cache / RAM</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              100 ns
            </span>
            <span className="text-[9px] text-ink-muted block mt-0.5">Speed of light</span>
          </div>

          <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
            <span className="text-ink-muted text-[10px] block">NVMe SSD Read</span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400">100 µs</span>
            <span className="text-[9px] text-ink-muted block mt-0.5">1,000× slower than RAM</span>
          </div>

          <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
            <span className="text-ink-muted text-[10px] block">Datacenter LAN RTT</span>
            <span className="text-base font-bold text-purple-600 dark:text-purple-400">0.5 ms</span>
            <span className="text-[9px] text-ink-muted block mt-0.5">Same rack / switch</span>
          </div>

          <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
            <span className="text-ink-muted text-[10px] block">Transatlantic RTT</span>
            <span className="text-base font-bold text-amber-600 dark:text-amber-400">100 ms</span>
            <span className="text-[9px] text-ink-muted block mt-0.5">NYC to London fiber</span>
          </div>

          <div className="p-3 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
            <span className="text-ink-muted text-[10px] block">Seconds in Day</span>
            <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">~100,000 s</span>
            <span className="text-[9px] text-ink-muted block mt-0.5">Exact: 86,400 s</span>
          </div>
        </div>
      </div>

      {/* Interactive What-If Capacity Sandbox Drawer */}
      <div className="p-5 rounded-2xl bg-white/90 dark:bg-parchment-900/90 border border-parchment-200 dark:border-parchment-800 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-ink-light dark:text-ink-dark">
              Interactive "What-If" Capacity Sandbox
            </h4>
          </div>
          <button
            onClick={() => {
              playTick();
              setShowWhatIf(!showWhatIf);
            }}
            className="btn-pop px-3 py-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 text-xs font-mono text-ink-light dark:text-ink-dark hover:bg-parchment-100 dark:hover:bg-parchment-800 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>{showWhatIf ? 'Collapse Sliders' : 'Tune Parameters & Test Scenarios'}</span>
          </button>
        </div>

        {showWhatIf && (
          <div className="pt-3 border-t border-parchment-200 dark:border-parchment-800 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in">
            {/* Slider 1: DAU */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-muted">Daily Active Users:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {dauMillions}M users
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={dauMillions}
                onChange={(e) => {
                  playTick();
                  setDauMillions(Number(e.target.value));
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted font-mono block">
                Hint: Set to 25M for Challenge #1
              </span>
            </div>

            {/* Slider 2: Requests Per User */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-muted">Requests / User / Day:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {requestsPerUser} reqs
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={requestsPerUser}
                onChange={(e) => {
                  playTick();
                  setRequestsPerUser(Number(e.target.value));
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted font-mono block">
                Feed scrolls, likes, queries
              </span>
            </div>

            {/* Slider 3: Peak Traffic Multiplier */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-muted">Peak Traffic Multiplier:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {peakMultiplier.toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min="1.5"
                max="5.0"
                step="0.5"
                value={peakMultiplier}
                onChange={(e) => {
                  playTick();
                  setPeakMultiplier(Number(e.target.value));
                }}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted font-mono block">
                Evening and event burst factor
              </span>
            </div>

            {/* Slider 4: Server Capacity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-muted">Server Max Capacity:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {serverCapacityRps} req/s
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="3000"
                step="250"
                value={serverCapacityRps}
                onChange={(e) => {
                  playTick();
                  setServerCapacityRps(Number(e.target.value));
                }}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted font-mono block">
                Stateless app server benchmark
              </span>
            </div>

            {/* Slider 5: Photo Uploads */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-muted">Daily Photo Uploads:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {dailyPhotosMillions}M photos
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.2"
                value={dailyPhotosMillions}
                onChange={(e) => {
                  playTick();
                  setDailyPhotosMillions(Number(e.target.value));
                }}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted font-mono block">Write ingest rate</span>
            </div>

            {/* Slider 6: Photo Size */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-muted">Avg Photo File Size:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {photoSizeMb} MB
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={photoSizeMb}
                onChange={(e) => {
                  playTick();
                  setPhotoSizeMb(Number(e.target.value));
                }}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted font-mono block">
                Compressed JPEG / WebP
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
