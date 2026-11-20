import React, { useState } from 'react';
import { Cloud, Server, Shield, ShieldCheck, ShieldAlert, Database, Terminal } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const SsrfVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [selectedUrlPreset, setSelectedUrlPreset] = useState<string>('imds');
  const [imdsVersion, setImdsVersion] = useState<'v1' | 'v2'>('v1');
  const [privateIpFilter, setPrivateIpFilter] = useState<boolean>(false);

  const presets: Record<
    string,
    { label: string; url: string; targetType: 'cloud_metadata' | 'internal_db' | 'safe_public' }
  > = {
    safe: {
      label: 'Safe Public URL (Avatar)',
      url: 'https://cdn.photos.com/avatar.png',
      targetType: 'safe_public',
    },
    imds: {
      label: 'AWS/GCP Cloud Metadata (169.254.169.254)',
      url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/AppRole',
      targetType: 'cloud_metadata',
    },
    internal_db: {
      label: 'Internal Subnet Database (10.0.4.15:5432)',
      url: 'http://10.0.4.15:5432/dump',
      targetType: 'internal_db',
    },
    localhost: {
      label: 'Localhost Loopback (127.0.0.1:6379)',
      url: 'http://127.0.0.1:6379/KEYS',
      targetType: 'internal_db',
    },
  };

  const currentTarget = presets[selectedUrlPreset];

  // Evaluate SSRF vulnerability outcome
  const isTargetPrivate = currentTarget.targetType !== 'safe_public';
  const isBlockedByCidrFilter = isTargetPrivate && privateIpFilter;
  const isBlockedByImdsV2 = currentTarget.targetType === 'cloud_metadata' && imdsVersion === 'v2';

  const isExploitSuccessful = isTargetPrivate && !isBlockedByCidrFilter && !isBlockedByImdsV2;

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Cloud Infrastructure & Network Pivot Defense
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            SSRF & Cloud Metadata Defense (IMDSv2)
          </h3>
        </div>

        {/* Defense Knobs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPrivateIpFilter(!privateIpFilter)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              privateIpFilter
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Private IP CIDR Denylist: {privateIpFilter ? 'ACTIVE' : 'DISABLED'}
          </button>

          <button
            onClick={() => setImdsVersion(imdsVersion === 'v1' ? 'v2' : 'v1')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              imdsVersion === 'v2'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400 font-bold'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            Cloud IMDS: {imdsVersion === 'v2' ? 'IMDSv2 (TOKEN REQUIRED)' : 'IMDSv1 (LEGACY GET)'}
          </button>
        </div>
      </div>

      {/* Preset Target Selector */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
        <label className="text-ink-muted dark:text-ink-darkMuted block mb-2 font-bold uppercase text-[11px]">
          Simulate Attacker Input in Webhook / URL Fetcher Field:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(presets).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setSelectedUrlPreset(key)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                selectedUrlPreset === key
                  ? 'bg-white dark:bg-parchment-900 border-blue-500/60 shadow-xs text-blue-600 dark:text-blue-400 font-bold'
                  : 'bg-white/60 dark:bg-parchment-950/60 border-parchment-200 dark:border-parchment-800 text-ink-muted'
              }`}
            >
              <div className="text-[11px] truncate">{item.label}</div>
              <div className="text-[9px] text-parchment-400 truncate mt-0.5">{item.url}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Topology Diagram: Attacker -> Vulnerable Web Server -> Cloud Metadata / Internal VPC */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Node 1: External Client / Attacker */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-red-500" /> Attacker Machine
              </span>
              <span className="text-[10px] font-mono text-red-600 dark:text-red-400">
                Public Internet
              </span>
            </div>
            <div className="text-[11px] font-mono space-y-1">
              <span className="text-ink-muted dark:text-ink-darkMuted">Submits POST request:</span>
              <pre className="p-2 bg-parchment-100 dark:bg-parchment-900 rounded text-[10px] overflow-x-auto text-ink-light dark:text-ink-dark">
                {`POST /api/generate-pdf
{
  "sourceUrl": "${currentTarget.url}"
}`}
              </pre>
            </div>
          </div>
          <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            Attacker cannot reach internal IP directly, so they trick the web server into fetching
            it on their behalf.
          </div>
        </div>

        {/* Node 2: Web Server Application */}
        <div
          className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
            isBlockedByCidrFilter
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : isExploitSuccessful
                ? 'bg-red-500/10 border-red-500/40'
                : 'bg-white dark:bg-parchment-950 border-parchment-200 dark:border-parchment-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-500" /> Backend Web App
              </span>
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                EC2 / GCE Instance
              </span>
            </div>
            <div className="text-[11px] font-mono space-y-2">
              <div className="p-2 bg-white dark:bg-parchment-900 rounded border border-parchment-200 dark:border-parchment-800 text-[10px]">
                <div>Target Resolution:</div>
                <div className="font-bold text-ink-light dark:text-ink-dark truncate mt-0.5">
                  {currentTarget.url}
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span>CIDR Denylist Check:</span>
                <span
                  className={
                    privateIpFilter ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'
                  }
                >
                  {privateIpFilter ? 'BLOCKED PRIVATE IP' : 'DISABLED'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            Has ambient network access to VPC and link-local metadata address.
          </div>
        </div>

        {/* Node 3: Target Resource (Cloud Metadata / Internal VPC) */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                {currentTarget.targetType === 'cloud_metadata' ? (
                  <Cloud className="w-4 h-4 text-purple-500" />
                ) : (
                  <Database className="w-4 h-4 text-purple-500" />
                )}
                {currentTarget.targetType === 'cloud_metadata'
                  ? 'Cloud IMDS Service'
                  : 'Internal Subnet DB'}
              </span>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
                169.254.169.254
              </span>
            </div>
            <div className="text-[11px] font-mono space-y-1">
              {currentTarget.targetType === 'cloud_metadata' ? (
                <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded border border-purple-200 dark:border-purple-900/40 text-[10px]">
                  <div>
                    Policy:{' '}
                    {imdsVersion === 'v2' ? 'IMDSv2 (PUT Token Required)' : 'IMDSv1 (Simple GET)'}
                  </div>
                  <div className="text-parchment-400 mt-1">
                    Holds temporary IAM STS role credentials
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-parchment-100 dark:bg-parchment-900 rounded text-[10px]">
                  Internal Microservice / Database listening on private IP.
                </div>
              )}
            </div>
          </div>
          <div className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            Assumes requests from the VM are legitimate.
          </div>
        </div>
      </div>

      {/* Attack Evaluation Trace & Outcome Banner */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 text-xs font-mono">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-parchment-100 dark:border-parchment-800 text-ink-muted dark:text-ink-darkMuted">
          <span className="uppercase text-[11px] font-semibold">SSRF Execution Trace</span>
          <span className="font-semibold text-ink-light dark:text-ink-dark">
            Target: {currentTarget.label}
          </span>
        </div>

        {/* Live Terminal Output Simulation */}
        <div className="p-3 bg-parchment-950 rounded-lg text-emerald-400 text-[11px] font-mono overflow-x-auto mb-4 leading-relaxed">
          {isBlockedByCidrFilter ? (
            <div>
              <span className="text-red-400">[FILTER TRIGGERED]</span> Resolved address belongs to
              private/link-local subnet (RFC 1918 / 169.254.0.0/16).
              <br />
              <span className="text-parchment-400">
                Socket connection refused before dispatch. HTTP 400 Bad Request returned to client.
              </span>
            </div>
          ) : isBlockedByImdsV2 ? (
            <div>
              <span className="text-amber-400">[IMDSv2 ENFORCED]</span> Request rejected with HTTP
              401 Unauthorized.
              <br />
              <span className="text-parchment-400">
                Missing `X-aws-ec2-metadata-token` header. Attacker cannot trigger custom PUT header
                via simple SSRF.
              </span>
            </div>
          ) : isExploitSuccessful ? (
            <div>
              <span className="text-red-400">[CATASTROPHIC DATA LEAK] HTTP 200 OK</span>
              <br />
              {`{
  "Code": "Success",
  "AccessKeyId": "ASIAV7QZXE...",
  "SecretAccessKey": "4Gg8hL1p92K...",
  "Token": "IQoJb3JpZ2luX2VjEPH...",
  "Expiration": "2026-11-19T22:00:00Z"
}`}
            </div>
          ) : (
            <div>
              <span className="text-emerald-400">[NORMAL EXTERNAL REQUEST] HTTP 200 OK</span>
              <br />
              <span className="text-parchment-400">Fetched public image asset successfully.</span>
            </div>
          )}
        </div>

        {/* Exploit Status Outcome */}
        {isExploitSuccessful ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                SSRF VULNERABILITY EXPLOITED: Cloud IAM Keys Exfiltrated!
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The Capital One breach model: the application fetched the AWS metadata endpoint
                without a private IP denylist. The attacker gained temporary cloud IAM credentials
                with admin privileges to all S3 buckets!
              </div>
            </div>
          </div>
        ) : isBlockedByCidrFilter || isBlockedByImdsV2 ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">DEFENSE IN DEPTH: SSRF Attack Blocked!</div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {isBlockedByCidrFilter
                  ? 'Private IP denylist intercepted the request at the socket level before contacting the internal network.'
                  : 'IMDSv2 session token requirement defeated the unauthenticated GET-based SSRF attempt.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/40 text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">Safe Public Request: Normal Operation</div>
              <div className="text-[11px] opacity-90 mt-0.5">
                Public internet assets are fetched without security exposure.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
