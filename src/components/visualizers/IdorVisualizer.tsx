import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, User, FileText, Database } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const IdorVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [currentUser, setCurrentUser] = useState<'alice' | 'bob' | 'eve'>('alice');
  const [targetDocId, setTargetDocId] = useState<number>(9002);
  const [authzMode, setAuthzMode] = useState<'vulnerable' | 'scoped'>('scoped');

  const users = {
    alice: { id: 101, name: 'Alice (Accountant)', role: 'user' },
    bob: { id: 102, name: 'Bob (Patient)', role: 'user' },
    eve: { id: 666, name: 'Eve (Malicious User)', role: 'user' },
  };

  const documents: Record<
    number,
    { title: string; ownerId: number; ownerName: string; classification: string }
  > = {
    9001: {
      title: "Alice's Q3 Corporate Tax Filing",
      ownerId: 101,
      ownerName: 'Alice',
      classification: 'Confidential Financials',
    },
    9002: {
      title: "Bob's Medical Record & Diagnoses",
      ownerId: 102,
      ownerName: 'Bob',
      classification: 'Protected Health Information (PHI)',
    },
    9003: {
      title: 'Company Executive Compensation Spreadsheet',
      ownerId: 999,
      ownerName: 'Admin',
      classification: 'Top Secret HR',
    },
  };

  const activeUserData = users[currentUser];
  const activeDocData = documents[targetDocId];
  const isOwner = activeDocData.ownerId === activeUserData.id;

  const isAccessGranted = authzMode === 'vulnerable' || isOwner;
  const isBreach = authzMode === 'vulnerable' && !isOwner;

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            OWASP API Security #1: Broken Object Level Authorization (BOLA)
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            Insecure Direct Object Reference (IDOR) Simulator
          </h3>
        </div>

        {/* Authorization Mode Knob */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAuthzMode(authzMode === 'scoped' ? 'vulnerable' : 'scoped')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              authzMode === 'scoped'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            {authzMode === 'scoped' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Object ACL:{' '}
            {authzMode === 'scoped'
              ? 'SCOPED TENANT CHECK (SECURE)'
              : 'NAIVE DIRECT LOOKUP (VULNERABLE)'}
          </button>
        </div>
      </div>

      {/* Interactive Entity Selection Row */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        <div>
          <label className="text-ink-muted dark:text-ink-darkMuted block mb-1 font-bold uppercase text-[11px]">
            1. Authenticated User (Valid Login Session):
          </label>
          <div className="flex items-center gap-1.5">
            {(['alice', 'bob', 'eve'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setCurrentUser(u)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                  currentUser === u
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white dark:bg-parchment-900 border-parchment-200 dark:border-parchment-800 text-ink-muted'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {users[u].name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-ink-muted dark:text-ink-darkMuted block mb-1 font-bold uppercase text-[11px]">
            2. Requested Document (URL Parameter / API ID):
          </label>
          <div className="flex items-center gap-1.5">
            {([9001, 9002, 9003] as const).map((docId) => (
              <button
                key={docId}
                onClick={() => setTargetDocId(docId)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                  targetDocId === docId
                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                    : 'bg-white dark:bg-parchment-900 border-parchment-200 dark:border-parchment-800 text-ink-muted'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Doc #{docId} ({documents[docId].ownerName})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Wire Journey & SQL Query Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Step 1: Inbound HTTP Request */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark">
                1. Client HTTP Call
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                Authenticated
              </span>
            </div>
            <pre className="text-[11px] font-mono bg-parchment-50 dark:bg-parchment-900 p-2.5 rounded border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark overflow-x-auto">
              {`GET /api/documents/${targetDocId}
Host: medical.portal.com
Authorization: Bearer jwt_${currentUser}`}
            </pre>
          </div>
          <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            JWT is 100% valid. The user is genuinely authenticated!
          </span>
        </div>

        {/* Step 2: Database Query Execution */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-500" /> 2. SQL Query Executed
              </span>
              <span className="text-[10px] font-mono text-ink-muted">Backend Logic</span>
            </div>
            <pre
              className={`text-[11px] font-mono p-2.5 rounded border overflow-x-auto ${
                authzMode === 'scoped'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
              }`}
            >
              {authzMode === 'scoped'
                ? `-- SECURE SCOPED QUERY
SELECT * FROM documents
WHERE id = ${targetDocId}
  AND owner_id = ${activeUserData.id};`
                : `-- VULNERABLE DIRECT REFERENCE
SELECT * FROM documents
WHERE id = ${targetDocId};`}
            </pre>
          </div>
          <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            {authzMode === 'scoped'
              ? 'Query scopes resource by authenticated user ID.'
              : 'Direct lookup blindly trusts client-provided ID.'}
          </span>
        </div>

        {/* Step 3: Authorization Check Result */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark">
                3. Response Returned
              </span>
              <span className="text-[10px] font-mono text-ink-muted">HTTP Wire</span>
            </div>
            <div className="p-2.5 bg-parchment-50 dark:bg-parchment-900 rounded border border-parchment-200 dark:border-parchment-800 text-[11px] font-mono space-y-1">
              <div>
                Status:{' '}
                <span className="font-bold">
                  {isAccessGranted ? 'HTTP 200 OK' : 'HTTP 403 Forbidden'}
                </span>
              </div>
              <div className="text-[10px] text-parchment-400">
                Resource Owner: {activeDocData.ownerName} (ID: {activeDocData.ownerId})
              </div>
              <div className="text-[10px] text-parchment-400">
                Requester: {activeUserData.name} (ID: {activeUserData.id})
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-ink-muted dark:text-ink-darkMuted mt-3">
            Owner Match:{' '}
            <span className={isOwner ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
              {isOwner ? 'MATCH (Legitimate)' : 'MISMATCH (Horizontal Privilege Escalation)'}
            </span>
          </span>
        </div>
      </div>

      {/* Outcome Banner */}
      {isBreach ? (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-400 flex items-center gap-2 font-mono text-xs">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-bold text-sm">
              CRITICAL BOLA / IDOR BREACH: Confidential Data Leaked!
            </div>
            <div className="text-[11px] opacity-90 mt-0.5">
              {activeUserData.name} successfully viewed "{activeDocData.title}", which belongs
              exclusively to {activeDocData.ownerName}. The server verified that{' '}
              {activeUserData.name} was logged in, but never verified that they owned document #
              {targetDocId}!
            </div>
          </div>
        </div>
      ) : !isAccessGranted ? (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-mono text-xs">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-bold text-sm">
              ACCESS BLOCKED: Scoped Authorization Enforced (403 Forbidden)
            </div>
            <div className="text-[11px] opacity-90 mt-0.5">
              The query strictly scoped results by `owner_id = {activeUserData.id}`. The database
              returned 0 rows, and the API responded with 403 Forbidden. Horizontal privilege
              escalation prevented.
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-mono text-xs">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-bold text-sm">AUTHORIZED ACCESS: User Owns Requested Object</div>
            <div className="text-[11px] opacity-90 mt-0.5">
              {activeUserData.name} accessed their own document #{targetDocId}. Both identity
              authentication and object-level authorization verified.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
