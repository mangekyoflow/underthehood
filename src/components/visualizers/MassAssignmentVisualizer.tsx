import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Database, Check, AlertTriangle } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const MassAssignmentVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [bindingMode, setBindingMode] = useState<'vulnerable' | 'hardened'>('hardened');
  const [injectAdminRole, setInjectAdminRole] = useState<boolean>(true);
  const [injectVerified, setInjectVerified] = useState<boolean>(false);
  const [injectCredits, setInjectCredits] = useState<boolean>(false);

  // Raw client payload object
  const clientPayload: Record<string, any> = {
    displayName: 'Alice Walker',
    email: 'alice@company.com',
  };

  if (injectAdminRole) clientPayload.role = 'admin';
  if (injectVerified) clientPayload.isVerified = true;
  if (injectCredits) clientPayload.accountBalance = 50000;

  // Evaluated database write fields
  const dbSavedFields: Record<string, any> =
    bindingMode === 'vulnerable'
      ? { ...clientPayload }
      : {
          displayName: clientPayload.displayName,
          email: clientPayload.email,
        };

  const isPrivilegeEscalated =
    bindingMode === 'vulnerable' && (injectAdminRole || injectVerified || injectCredits);

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Object Relational Mapping & Data Transfer Security
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Mass Assignment & API Auto-Binding Exploits
          </h3>
        </div>

        {/* Binding Mode Knob */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setBindingMode(bindingMode === 'hardened' ? 'vulnerable' : 'hardened')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              bindingMode === 'hardened'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            {bindingMode === 'hardened' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Binding Mode:{' '}
            {bindingMode === 'hardened'
              ? 'STRICT DTO ALLOWLIST (ZOD) [SECURE]'
              : 'MODEL.UPDATE(REQ.BODY) [VULNERABLE]'}
          </button>
        </div>
      </div>

      {/* Attacker Injected Keys Control Bar */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
        <label className="text-ink-muted dark:text-ink-darkMuted block mb-2 font-bold uppercase text-[11px]">
          Simulate Attacker Appending Internal Model Keys to JSON Request:
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setInjectAdminRole(!injectAdminRole)}
            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
              injectAdminRole
                ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300 font-bold'
                : 'bg-white dark:bg-parchment-900 border-parchment-200 dark:border-parchment-800 text-ink-muted'
            }`}
          >
            {injectAdminRole ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Check className="w-3.5 h-3.5 opacity-30" />
            )}
            role: "admin"
          </button>

          <button
            onClick={() => setInjectVerified(!injectVerified)}
            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
              injectVerified
                ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300 font-bold'
                : 'bg-white dark:bg-parchment-900 border-parchment-200 dark:border-parchment-800 text-ink-muted'
            }`}
          >
            {injectVerified ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Check className="w-3.5 h-3.5 opacity-30" />
            )}
            isVerified: true
          </button>

          <button
            onClick={() => setInjectCredits(!injectCredits)}
            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
              injectCredits
                ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300 font-bold'
                : 'bg-white dark:bg-parchment-900 border-parchment-200 dark:border-parchment-800 text-ink-muted'
            }`}
          >
            {injectCredits ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Check className="w-3.5 h-3.5 opacity-30" />
            )}
            accountBalance: 50000
          </button>
        </div>
      </div>

      {/* Two-Column Side-by-Side Inspection Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs font-mono">
        {/* Column 1: Client Inbound HTTP Payload */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark">
                1. Client Inbound HTTP Body
              </span>
              <span className="text-[10px] text-ink-muted">POST /api/profile</span>
            </div>
            <pre className="p-3 bg-parchment-50 dark:bg-parchment-900 rounded-lg border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark overflow-x-auto">
              {JSON.stringify(clientPayload, null, 2)}
            </pre>
          </div>
          <span className="text-[10px] text-ink-muted mt-3">
            Expected profile edit form fields mixed with unauthorized privileged properties.
          </span>
        </div>

        {/* Column 2: Backend Evaluation & Database Write */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
            isPrivilegeEscalated
              ? 'border-red-300 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'
              : 'border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-500" /> 2. Stored Database Record
              </span>
              <span
                className={`text-[10px] font-bold ${isPrivilegeEscalated ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {isPrivilegeEscalated ? 'PRIVILEGE ESCALATION' : 'FILTERED DTO'}
              </span>
            </div>
            <pre className="p-3 bg-white dark:bg-parchment-950 rounded-lg border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark overflow-x-auto">
              {JSON.stringify(dbSavedFields, null, 2)}
            </pre>
          </div>
          <span className="text-[10px] text-ink-muted mt-3">
            {bindingMode === 'hardened'
              ? 'Only whitelisted fields (displayName, email) were extracted into the database update.'
              : 'Auto-binder blindly wrote all JSON object keys directly into database columns.'}
          </span>
        </div>
      </div>

      {/* Outcome Banner */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 font-mono text-xs">
        {isPrivilegeEscalated ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">MASS ASSIGNMENT VULNERABILITY EXPLOITED!</div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The client successfully promoted their account to{' '}
                <code className="font-bold">role: "admin"</code>. The backend controller ran{' '}
                <code className="font-bold">User.update(req.body)</code> without filtering input
                through a Data Transfer Object (DTO) schema.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                DATA TRANSFER OBJECT (DTO) ENFORCED: Unauthorized Keys Discarded
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                The strict schema whitelist extracted only legitimate user-editable fields.
                Sensitive database properties like <code className="font-bold">role</code> and{' '}
                <code className="font-bold">balance</code> were completely ignored.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
