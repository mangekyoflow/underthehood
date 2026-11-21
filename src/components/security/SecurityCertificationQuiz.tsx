import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';
import { playSuccess, playTick, playAlert } from '../../lib/sound';
import confetti from 'canvas-confetti';
import clsx from 'clsx';

interface Question {
  id: number;
  question: string;
  category: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question:
      'Why is PKCE (RFC 7636) required for Single Page Applications (SPAs) and mobile clients using OAuth 2.0?',
    category: 'Authentication',
    options: [
      'Public clients cannot securely store client secrets; PKCE cryptographically binds the authorization code exchange to the original authorization request via code_verifier.',
      'PKCE eliminates the need for redirect URIs, preventing man-in-the-middle attacks.',
      'PKCE automatically encrypts all JWT payloads with RSA-4096 before sending over HTTPS.',
      'PKCE stores the user credentials directly on the authorization server in plaintext for faster lookup.',
    ],
    correctIndex: 0,
    explanation:
      'Public clients (browsers and mobile apps) have publicly accessible binaries and cannot hold a static client_secret. PKCE generates an ephemeral code_verifier and code_challenge per flow, ensuring only the exact initiator can redeem the authorization code.',
  },
  {
    id: 2,
    question:
      'How does an attacker exploit JWT Algorithm Confusion when a server accepts RS256 and HS256 interchangeably?',
    category: 'Cryptography',
    options: [
      "The attacker modifies the JWT header to alg: HS256 and signs the forged token using the server's publicly available RSA public key as the symmetric HMAC secret.",
      'The attacker replaces the JWT payload with binary bytecode that crashes the V8 runtime.',
      'The attacker deletes the JWT header completely so that the parser defaults to base64 encoding.',
      'The attacker changes the token expiration timestamp into a negative integer.',
    ],
    correctIndex: 0,
    explanation:
      "If the server's verification library does not strictly whitelist algorithms, it will treat the RS256 RSA public key (which is public knowledge) as a symmetric secret string for HS256 HMAC verification. The attacker can sign any payload with that public key and verify successfully.",
  },
  {
    id: 3,
    question:
      'What architectural mechanism in WebAuthn / Passkeys completely eliminates credential phishing?',
    category: 'Identity',
    options: [
      'The user is required to enter an SMS one-time passcode after biometric scanning.',
      'The client browser extracts the active origin and cryptographically incorporates the RP ID into the authenticatorData signed by the hardware private key.',
      'WebAuthn passwords are encrypted in the local browser localStorage cache with AES-GCM.',
      'The web server directly scans the physical fingerprint via WebUSB.',
    ],
    correctIndex: 1,
    explanation:
      'WebAuthn is phish-resistant because the browser itself guarantees the Relying Party (RP) origin. If a user is on evil-phish.com, the hardware authenticator signs a challenge with rpId: "evil-phish.com", which the real target bank.com will reject.',
  },
  {
    id: 4,
    question:
      'Why do SQL Prepared Statements (Parameterized Queries) guarantee immunity against SQL Injection?',
    category: 'Web Exploits',
    options: [
      'They escape single quotes by replacing them with backslashes.',
      'The database query compiler parses the SQL AST before user values are bound, treating parameter inputs strictly as literal data rather than executable instructions.',
      'They convert all string inputs into 32-bit integer hashes.',
      'They only allow SELECT queries and automatically reject DROP TABLE statements.',
    ],
    correctIndex: 1,
    explanation:
      'Prepared statements separate code compilation from data evaluation. The query tree structure is locked in place during preparation; user variables are subsequently substituted as raw data bytes, preventing attackers from modifying the query grammar.',
  },
  {
    id: 5,
    question:
      'How does AWS EC2 Instance Metadata Service Version 2 (IMDSv2) mitigate SSRF attacks?',
    category: 'Cloud Security',
    options: [
      'It requires a session token retrieved via a PUT request with an X-aws-ec2-metadata-token-ttl-seconds header, and sets IP hop limit to 1.',
      'It encrypts all EC2 metadata using asymmetric PGP keys before transmission.',
      'It blocks all HTTP traffic to port 80 and forces SSH certificate tunnels.',
      'It moves the metadata service from 169.254.169.254 to a public DNS name.',
    ],
    correctIndex: 0,
    explanation:
      'Most SSRF vulnerabilities involve GET/POST requests and cannot specify arbitrary headers or make PUT requests to obtain the session token. Furthermore, the IP hop limit of 1 prevents packet forwarding through reverse proxies or container gateways.',
  },
  {
    id: 6,
    question:
      'Why is setting the `HttpOnly` cookie flag insufficient to completely mitigate Cross-Site Scripting (XSS)?',
    category: 'Web Exploits',
    options: [
      'HttpOnly cookies can still be read by `document.cookie` if jQuery is loaded.',
      "While HttpOnly prevents JavaScript from reading the cookie string, an attacker with XSS execution can still issue arbitrary API calls (fetch/XHR) using the victim's ambient session credentials.",
      'HttpOnly is only supported on Google Chrome and ignored by Firefox and Safari.',
      'HttpOnly cookies expire after 60 seconds unless renewed by JavaScript.',
    ],
    correctIndex: 1,
    explanation:
      "HttpOnly prevents direct credential theft via `document.cookie`, but an injected script executes with full DOM context and can make authenticated requests, modify profile data, transfer funds, or invoke APIs directly using the browser's session.",
  },
  {
    id: 7,
    question:
      'What is the primary operational difference between `SameSite=Strict` and `SameSite=Lax` cookie attributes?',
    category: 'Architecture',
    options: [
      'SameSite=Strict never sends cookies on cross-site requests (even top-level links), whereas SameSite=Lax sends cookies on safe top-level GET navigations (e.g. following a link).',
      'SameSite=Lax encrypts cookies with AES-256 while SameSite=Strict uses RSA.',
      'SameSite=Strict only works over HTTP, while SameSite=Lax requires HTTPS.',
      'SameSite=Lax permits cross-origin POST requests from any domain.',
    ],
    correctIndex: 0,
    explanation:
      'Under SameSite=Strict, cookies are withheld on all cross-site requests, meaning a user clicking a link from an email or another site will arrive unauthenticated. SameSite=Lax permits cookies on top-level GET navigations while withholding them on cross-site POST/PUT requests.',
  },
  {
    id: 8,
    question: 'Why is Argon2id chosen over fast hashes like SHA-256 for password storage?',
    category: 'Cryptography',
    options: [
      'Argon2id produces shorter hash outputs that require less database storage.',
      'Argon2id is memory-hard, requiring configurable RAM allocation per computation, which negates the parallel performance advantage of GPUs and custom ASICs.',
      'Argon2id is reversible, allowing password recovery by systems administrators.',
      'Argon2id executes in 0.001 microseconds on single-core microcontrollers.',
    ],
    correctIndex: 1,
    explanation:
      'Fast cryptographic hashes like SHA-256 can be computed billions of times per second on GPU clusters. Argon2id forces the algorithm to allocate tens or hundreds of megabytes of RAM per hash, exhausting hardware memory bandwidth on brute-force rigs.',
  },
  {
    id: 9,
    question:
      'In Cross-Origin Resource Sharing (CORS), what condition triggers a browser preflight (OPTIONS) request?',
    category: 'Web Exploits',
    options: [
      'Any GET request made from a different domain name.',
      'Methods other than GET/POST/HEAD, custom request headers (e.g. Authorization, X-Api-Key), or non-standard Content-Types (e.g. application/json).',
      'Whenever the user is browsing in Incognito mode.',
      'Whenever the destination port is 443.',
    ],
    correctIndex: 1,
    explanation:
      'A CORS preflight is triggered for any non-simple HTTP request: custom headers (like Authorization), HTTP methods like PUT/DELETE/PATCH, or Content-Type application/json. The browser dispatches an OPTIONS request to verify server authorization before executing the real request.',
  },
  {
    id: 10,
    question:
      'What is the foundational architectural axiom of Zero Trust Architecture (NIST SP 800-207)?',
    category: 'Architecture',
    options: [
      'Establish a strong perimeter firewall and trust all hosts located inside the internal network.',
      'Assume the network perimeter is already breached; enforce continuous explicit verification of identity, device health, and context for every transaction.',
      'Prohibit all outbound Internet connections from production databases.',
      'Mandate that all internal microservices communicate using plaintext HTTP without TLS.',
    ],
    correctIndex: 1,
    explanation:
      'Zero Trust eliminates implicit trust based on network location. The core principle is "never trust, always verify": every request must be authenticated, authorized, and encrypted regardless of whether it originates inside or outside the corporate firewall.',
  },
];

export const SecurityCertificationQuiz: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState<boolean>(false);

  const activeQ = QUESTIONS[currentIdx];
  const isAnswered = selectedAnswers[activeQ.id] !== undefined;
  const isCorrect = isAnswered && selectedAnswers[activeQ.id] === activeQ.correctIndex;

  const handleSelectOption = (optIdx: number) => {
    if (isAnswered) return;
    playTick();
    const isRight = optIdx === activeQ.correctIndex;
    if (isRight) playSuccess();
    else playAlert();

    setSelectedAnswers((prev) => ({ ...prev, [activeQ.id]: optIdx }));
  };

  const handleNext = () => {
    playTick();
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setShowResults(true);
      // Trigger confetti if scored 80% or higher
      const correctCount = Object.entries(selectedAnswers).filter(
        ([qid, idx]) => QUESTIONS.find((q) => q.id === Number(qid))?.correctIndex === idx
      ).length;
      if (correctCount >= 8) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleRestart = () => {
    playTick();
    setSelectedAnswers({});
    setCurrentIdx(0);
    setShowResults(false);
  };

  const scoreCount = Object.entries(selectedAnswers).filter(
    ([qid, idx]) => QUESTIONS.find((q) => q.id === Number(qid))?.correctIndex === idx
  ).length;

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-xs space-y-6 font-mono">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-parchment-200 dark:border-parchment-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-ink-light dark:text-ink-dark">
              Security Architecture Certification Quiz
            </h3>
          </div>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted font-sans">
            10 production-grade scenarios testing auth, cryptography, cloud security, and exploit
            mitigation.
          </p>
        </div>

        <Badge variant={scoreCount >= 8 ? 'emerald' : 'purple'}>
          Question {currentIdx + 1} of {QUESTIONS.length}
        </Badge>
      </div>

      {!showResults ? (
        <div className="space-y-5">
          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-parchment-200 dark:bg-parchment-800 overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-ink-muted uppercase">
              <span>Category:</span>
              <span className="text-emerald-600 dark:text-emerald-400">{activeQ.category}</span>
            </div>
            <h4 className="text-sm sm:text-base font-serif font-bold text-ink-light dark:text-ink-dark leading-snug">
              {activeQ.question}
            </h4>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {activeQ.options.map((opt, idx) => {
              const isSelected = selectedAnswers[activeQ.id] === idx;
              const isOptionCorrect = idx === activeQ.correctIndex;

              let style =
                'border-parchment-200 dark:border-parchment-800 bg-parchment-50/60 dark:bg-parchment-950/60 hover:bg-parchment-100 dark:hover:bg-parchment-800';
              if (isAnswered) {
                if (isOptionCorrect) {
                  style =
                    'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-bold';
                } else if (isSelected) {
                  style = 'border-red-500 bg-red-500/10 text-red-900 dark:text-red-200 font-bold';
                } else {
                  style = 'border-parchment-200 dark:border-parchment-800 opacity-50';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={clsx(
                    'w-full p-3.5 rounded-xl border text-left text-xs font-sans transition-all flex items-start gap-3 cursor-pointer',
                    style
                  )}
                >
                  <span className="w-5 h-5 rounded-md border font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 leading-relaxed">{opt}</span>
                  {isAnswered && isOptionCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  {isAnswered && isSelected && !isOptionCorrect && (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner */}
          {isAnswered && (
            <div
              className={clsx(
                'p-4 rounded-xl border text-xs font-sans space-y-1 animate-fade-in',
                isCorrect
                  ? 'border-emerald-500/40 bg-emerald-500/5 text-ink-light dark:text-ink-dark'
                  : 'border-red-500/40 bg-red-500/5 text-ink-light dark:text-ink-dark'
              )}
            >
              <div className="font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                {isCorrect ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span>{isCorrect ? 'Correct Analysis' : 'Incorrect Analysis'}</span>
              </div>
              <p className="leading-relaxed">{activeQ.explanation}</p>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-ink-muted">
              {scoreCount} / {Object.keys(selectedAnswers).length} correct so far
            </span>

            {isAnswered && (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                <span>
                  {currentIdx < QUESTIONS.length - 1 ? 'NEXT QUESTION' : 'VIEW SCORECARD'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6 text-center py-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h4 className="text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
              Certification Quiz Completed
            </h4>
            <p className="text-xs text-ink-muted dark:text-ink-darkMuted font-sans">
              Tactile security comprehension results across all 10 domain scenarios.
            </p>
          </div>

          <div className="inline-block p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
            <div className="text-3xl font-serif font-bold text-emerald-600 dark:text-emerald-400">
              {scoreCount} / {QUESTIONS.length}
            </div>
            <div className="text-[11px] font-mono text-ink-muted mt-1">
              Score: {Math.round((scoreCount / QUESTIONS.length) * 100)}%
            </div>
          </div>

          <div>
            <button
              onClick={handleRestart}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RETAKE CERTIFICATION QUIZ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
