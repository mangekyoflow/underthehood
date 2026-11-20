import React, { useState } from 'react';
import { Box, ShieldCheck, ShieldAlert, Terminal, Server, Lock, Unlock } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const ContainerEscapeVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [containerMode, setContainerMode] = useState<'socket_mounted' | 'privileged' | 'hardened'>(
    'hardened'
  );
  const [exploitRan, setExploitRan] = useState<boolean>(false);

  const isVulnerable = containerMode !== 'hardened';
  const isHostCompromised = exploitRan && isVulnerable;

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Linux Namespaces, cgroups & Container Runtime Sandbox
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Container Escape & Docker Socket Breakout
          </h3>
        </div>

        {/* Container Mode Knob */}
        <div className="flex flex-wrap items-center gap-2">
          {(['hardened', 'socket_mounted', 'privileged'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setContainerMode(mode);
                setExploitRan(false);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all cursor-pointer ${
                containerMode === mode
                  ? mode === 'hardened'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
                  : 'bg-white dark:bg-parchment-950 border-parchment-200 dark:border-parchment-800 text-ink-muted'
              }`}
            >
              {mode === 'hardened'
                ? 'ROOTLESS & UNPRIVILEGED [SECURE]'
                : mode === 'socket_mounted'
                  ? 'DOCKER.SOCK MOUNTED [VULNERABLE]'
                  : '--PRIVILEGED CAP_SYS_ADMIN [VULNERABLE]'}
            </button>
          ))}
        </div>
      </div>

      {/* Breakout Action Trigger Bar */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink-light dark:text-ink-dark">
            Container Privilege Profile:
          </span>
          <span className="text-purple-600 dark:text-purple-400 font-bold">
            {containerMode === 'hardened'
              ? 'seccomp=default, user=1000, --cap-drop=ALL'
              : containerMode === 'socket_mounted'
                ? '-v /var/run/docker.sock:/var/run/docker.sock'
                : '--privileged --cap-add=SYS_ADMIN'}
          </span>
        </div>

        <button
          onClick={() => setExploitRan(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5" /> Run Breakout Exploit
        </button>
      </div>

      {/* 2 Layer Representation: Container Namespace vs Host Operating System */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs font-mono">
        {/* Layer 1: The Sandboxed Container */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Box className="w-4 h-4 text-blue-500" /> Container Runtime Boundary
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                PID / Mount Namespace
              </span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 bg-parchment-50 dark:bg-parchment-900 rounded border border-parchment-200 dark:border-parchment-800 text-[10px]">
                <div>Mounted Volumes:</div>
                <div className="font-bold text-ink-light dark:text-ink-dark mt-0.5">
                  {containerMode === 'socket_mounted'
                    ? '/var/run/docker.sock'
                    : 'Isolated container rootfs'}
                </div>
              </div>
              <p className="text-[10px] text-ink-muted leading-relaxed">
                {containerMode === 'socket_mounted'
                  ? 'Accessing /var/run/docker.sock allows talking directly to the host dockerd daemon with root privileges.'
                  : containerMode === 'privileged'
                    ? 'Privileged flag gives container direct raw device node access (/dev/sda) on the host machine.'
                    : 'Container processes are trapped inside strict user namespaces without host device access.'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-ink-muted mt-3">
            Container isolation relies on kernel namespaces and cgroups.
          </span>
        </div>

        {/* Layer 2: The Host Node Operating System */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
            isHostCompromised
              ? 'border-red-300 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'
              : 'border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Server className="w-4 h-4 text-purple-500" /> Host Node (Linux Kernel / Hypervisor)
              </span>
              <span
                className={`text-[10px] font-bold ${isHostCompromised ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {isHostCompromised ? 'ROOT COMPROMISE' : 'ISOLATED'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 bg-parchment-50 dark:bg-parchment-900 rounded border border-parchment-200 dark:border-parchment-800 text-[10px]">
                <div>Host Root Status:</div>
                <div className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1 mt-0.5">
                  {isHostCompromised ? (
                    <Unlock className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  {isHostCompromised
                    ? 'HOST / ROOT ACCESSED VIA ESCAPE'
                    : 'Host Root Isolated & Protected'}
                </div>
              </div>
              <p className="text-[10px] text-ink-muted leading-relaxed">
                Host OS runs all cloud worker nodes, control plane kubelets, and encrypted secret
                stores.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-ink-muted mt-3">
            Compromising the host breaks all multitenancy and adjacent container workloads.
          </span>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800 text-ink-muted">
          <span className="uppercase font-bold text-[11px]">Breakout Terminal Trace:</span>
          <span>
            Status:{' '}
            {exploitRan ? (isHostCompromised ? 'ESCAPE SUCCEEDED' : 'ESCAPE BLOCKED') : 'IDLE'}
          </span>
        </div>

        <div className="p-3 bg-parchment-950 rounded-lg text-emerald-400 text-[11px] font-mono overflow-x-auto leading-relaxed mb-4">
          {!exploitRan ? (
            <span className="text-parchment-400">
              Click "Run Breakout Exploit" above to simulate container escape payload...
            </span>
          ) : containerMode === 'socket_mounted' ? (
            <div>
              <span className="text-parchment-400">
                # Inside compromised container with /var/run/docker.sock
              </span>
              <br />
              <span className="text-amber-400">
                $ curl -X POST --unix-socket /var/run/docker.sock http://localhost/containers/create
                -d
                '&#123;"Image":"alpine","Cmd":["chroot","/host","cat","/etc/shadow"],"HostConfig":&#123;"Binds":["/:/host"]&#125;&#125;'
              </span>
              <br />
              <span className="text-red-400 font-bold">
                [CATASTROPHIC BREAKOUT] Host Docker daemon executed container mounting host root
                filesystem!
              </span>
              <br />
              <span className="text-amber-300">
                root:$6$X8z...:19000:0:99999:7::: (Host root password hash extracted)
              </span>
            </div>
          ) : containerMode === 'privileged' ? (
            <div>
              <span className="text-parchment-400">
                # Inside privileged container with CAP_SYS_ADMIN
              </span>
              <br />
              <span className="text-amber-400">
                $ mkdir /tmp/cgrp && mount -t cgroup -o rdma cgroup /tmp/cgrp
              </span>
              <br />
              <span className="text-amber-400">
                $ echo 1 &gt; /tmp/cgrp/notify_on_release &amp;&amp; echo "/escape.sh" &gt;
                /tmp/cgrp/release_agent
              </span>
              <br />
              <span className="text-red-400 font-bold">
                [CATASTROPHIC BREAKOUT] cgroup release_agent executed binary on host kernel!
              </span>
            </div>
          ) : (
            <div>
              <span className="text-parchment-400"># Inside hardened container</span>
              <br />
              <span className="text-amber-400">
                $ curl --unix-socket /var/run/docker.sock http://localhost/info
              </span>
              <br />
              <span className="text-red-400">
                curl: (7) Couldn't connect to server: No such file or directory
              </span>
              <br />
              <span className="text-amber-400">$ mount /dev/sda1 /mnt</span>
              <br />
              <span className="text-red-400">
                mount: permission denied (Operation not permitted)
              </span>
              <br />
              <span className="text-emerald-400 font-bold">
                ✓ Sandbox strictly intact. Escape impossible without root privileges.
              </span>
            </div>
          )}
        </div>

        {/* Outcome Banner */}
        {isHostCompromised ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                CONTAINER ESCAPE ACHIEVED: Host Node Compromised!
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {containerMode === 'socket_mounted'
                  ? 'Mounting /var/run/docker.sock into a container gives that container absolute root control over the host Docker daemon.'
                  : 'Running with --privileged disables seccomp, AppArmor, and device limits, allowing cgroup release_agent breakout.'}
              </div>
            </div>
          </div>
        ) : exploitRan ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                CONTAINER ISOLATION PRESERVED: Sandboxed Kernel
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                By running unprivileged containers, dropping Linux capabilities (
                <code className="font-bold">--cap-drop=ALL</code>), and never mounting the host
                Docker socket, the process cannot break out of its namespace.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-parchment-100 dark:bg-parchment-900 text-ink-muted">
            Select a container privilege configuration and run the breakout exploit to observe the
            kernel namespace boundary.
          </div>
        )}
      </div>
    </div>
  );
};
