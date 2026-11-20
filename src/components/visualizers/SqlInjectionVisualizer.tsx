import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, GitCommit, Database, Code, CheckCircle2 } from 'lucide-react';

interface Props {
  currentStep: number;
}

export const SqlInjectionVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [username, setUsername] = useState("admin' OR '1'='1' -- ");
  const [password, setPassword] = useState('anything');
  const [mode, setMode] = useState<'concatenated' | 'parameterized'>('concatenated');

  const isInjectionPayload =
    username.includes("' OR '1'='1'") || username.includes("' OR 1=1") || username.includes("'--");
  const isVulnerable = mode === 'concatenated' && isInjectionPayload;

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            Database Engine & AST Grammar Parser
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            SQL Injection: AST Tree Mutation vs. Parameterized Queries
          </h3>
        </div>

        {/* Query Architecture Mode */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode(mode === 'concatenated' ? 'parameterized' : 'concatenated')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              mode === 'parameterized'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold'
            }`}
          >
            {mode === 'parameterized' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Mode:{' '}
            {mode === 'parameterized'
              ? 'PREPARED STATEMENT (SAFE)'
              : 'STRING CONCATENATION (VULNERABLE)'}
          </button>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="my-5 p-4 rounded-xl bg-white dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
        <div className="flex items-center justify-between mb-3 text-xs font-mono">
          <span className="text-ink-muted dark:text-ink-darkMuted">Login Form Submission:</span>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={() => {
                setUsername('alice');
                setPassword('password123');
              }}
              className="text-ink-muted hover:text-ink-light underline"
            >
              Normal User
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setUsername("admin' OR '1'='1' -- ");
                setPassword('whatever');
              }}
              className="text-red-600 dark:text-red-400 font-semibold underline"
            >
              Tautology Payload (`admin&apos; OR &apos;1&apos;=&apos;1&apos; --`)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div>
            <label className="text-ink-muted dark:text-ink-darkMuted block mb-1">
              Username Input:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-parchment-50 dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark focus:outline-none"
            />
          </div>
          <div>
            <label className="text-ink-muted dark:text-ink-darkMuted block mb-1">
              Password Input:
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-parchment-50 dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SQL String as Evaluated by DB Engine */}
      <div className="p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono">
        <div className="text-ink-muted dark:text-ink-darkMuted mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-blue-500" /> Compiled SQL Query Representation
          </span>
          <span className="text-[10px]">
            {mode === 'parameterized'
              ? 'Pre-compiled AST template + bound values'
              : 'Raw interpolated text passed to parser'}
          </span>
        </div>

        {mode === 'concatenated' ? (
          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-red-200 dark:border-red-900/40 text-ink-light dark:text-ink-dark leading-relaxed">
            <span className="text-purple-600 dark:text-purple-400 font-bold">SELECT</span> *{' '}
            <span className="text-purple-600 dark:text-purple-400 font-bold">FROM</span> users{' '}
            <span className="text-purple-600 dark:text-purple-400 font-bold">WHERE</span> username =
            &apos;
            <span className="text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/30 px-1 rounded">
              {username}
            </span>
            &apos; <span className="text-purple-600 dark:text-purple-400 font-bold">AND</span>{' '}
            password = &apos;{password}&apos;
          </div>
        ) : (
          <div className="p-3 bg-white dark:bg-parchment-900 rounded-lg border border-emerald-200 dark:border-emerald-900/40 text-ink-light dark:text-ink-dark space-y-1">
            <div>
              <span className="text-purple-600 dark:text-purple-400 font-bold">PREPARE</span>{' '}
              query_stmt <span className="text-purple-600 dark:text-purple-400 font-bold">AS</span>{' '}
              <span className="text-purple-600 dark:text-purple-400 font-bold">SELECT</span> *{' '}
              <span className="text-purple-600 dark:text-purple-400 font-bold">FROM</span> users{' '}
              <span className="text-purple-600 dark:text-purple-400 font-bold">WHERE</span> username
              = $1 <span className="text-purple-600 dark:text-purple-400 font-bold">AND</span>{' '}
              password = $2;
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
              EXECUTE query_stmt ($1 = &quot;{username}&quot;, $2 = &quot;{password}&quot;);
            </div>
          </div>
        )}
      </div>

      {/* Visual AST (Abstract Syntax Tree) Grammar Comparison */}
      <div className="my-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AST Node Tree */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950">
          <div className="text-xs font-mono font-bold uppercase text-ink-muted dark:text-ink-darkMuted mb-3 flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-purple-500" /> Database Parser AST (Syntax Tree)
          </div>

          {isVulnerable ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded text-red-700 dark:text-red-300">
                <div className="font-bold">ROOT: BinaryExpression (OR) [MUTATED!]</div>
                <div className="pl-4 mt-1 border-l-2 border-red-300 dark:border-red-700 space-y-1">
                  <div>├── Left: `username = &apos;admin&apos;`</div>
                  <div className="text-red-600 dark:text-red-400 font-bold">
                    └── Right: `&apos;1&apos; = &apos;1&apos;` (ALWAYS EVALUATES TO TRUE!)
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-ink-muted dark:text-ink-darkMuted">
                Notice: The single quote broke out of the literal context, and `--` severed the
                password branch entirely from the AST!
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded text-emerald-700 dark:text-emerald-300">
                <div className="font-bold">ROOT: BinaryExpression (AND) [PRESERVED]</div>
                <div className="pl-4 mt-1 border-l-2 border-emerald-300 dark:border-emerald-700 space-y-1">
                  <div>├── Left: `username = Literal($1)`</div>
                  <div>└── Right: `password = Literal($2)`</div>
                </div>
              </div>
              <div className="text-[11px] text-ink-muted dark:text-ink-darkMuted">
                The AST structure is immutable. User input exists solely as a leaf data node and
                cannot alter grammar operators.
              </div>
            </div>
          )}
        </div>

        {/* Database Execution Result */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold uppercase text-ink-muted dark:text-ink-darkMuted mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-500" /> Database Result
            </div>

            {isVulnerable ? (
              <div className="p-3 bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-lg text-xs font-mono">
                <div className="text-red-700 dark:text-red-300 font-bold flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-4 h-4" /> AUTHENTICATION BYPASSED!
                </div>
                <div className="text-ink-light dark:text-ink-dark text-[11px]">
                  Returned Record:{' '}
                  <code className="font-bold text-red-600 dark:text-red-400">
                    User: Admin, ID: 1, Role: SuperUser
                  </code>
                </div>
                <div className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                  Because `&apos;1&apos;=&apos;1&apos;` is true for every table row, the database
                  returned the first record without checking passwords.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-mono">
                <div className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4" /> SAFE EVALUATION: 0 ROWS RETURNED
                </div>
                <div className="text-ink-light dark:text-ink-dark text-[11px]">
                  Database searched for user with literal username: <br />
                  <code className="text-emerald-700 dark:text-emerald-400 font-bold">
                    &quot;{username}&quot;
                  </code>
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-1">
                  No matching user found. Authentication failed securely.
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 text-[11px] text-ink-muted dark:text-ink-darkMuted leading-relaxed">
            Rule of thumb: Never sanitize inputs via regex or string replacement. Always use
            parameterized queries (Prepared Statements).
          </div>
        </div>
      </div>
    </div>
  );
};
