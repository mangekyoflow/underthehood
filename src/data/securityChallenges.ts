import { Challenge } from '../types';
import { LogEntry } from '../components/common/TerminalLog';

export interface SecurityLessonMeta {
  cvss: string;
  cvssSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  attackVector: string;
  mitigationName: string;
  exploitFeasibility: string;
  initialLogs: Omit<LogEntry, 'id'>[];
  challenges: Challenge[];
}

export const SECURITY_LESSON_META: Record<string, SecurityLessonMeta> = {
  'oauth-pkce': {
    cvss: '8.8',
    cvssSeverity: 'HIGH',
    attackVector: 'NETWORK / CUSTOM URI',
    mitigationName: 'RFC 7636 PKCE S256',
    exploitFeasibility: 'HIGH (PUBLIC CLIENTS)',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'PKCE-ENGINE',
        message: 'Initialized cryptographically secure PRNG in window.crypto.subtle.',
      },
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'AUTH-FLOW',
        message: 'Client state: ephemeral verifier retained strictly in memory (43 chars).',
      },
      {
        timestamp: '12:00:02',
        level: 'success',
        category: 'SHA256',
        message: 'Generated code_challenge = BASE64URL(SHA256(verifier)). Ready for /authorize.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-oauth-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Detect Authorization Code Interception',
        description:
          'Observe how a rogue mobile app or network eavesdropper steals an authorization code without client authentication.',
        hint: 'Toggle PKCE to DISABLED and turn on Attacker Interception to observe the attack window.',
        targetCriteria: 'pkce-disabled-intercept',
        completed: false,
      },
      {
        id: 'sec-challenge-oauth-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Enforce Cryptographic Verifier Proof',
        description:
          'Activate PKCE with S256 method to verify that the IdP rejects rogue token exchange attempts.',
        hint: 'Enable PKCE and step through to Step 5 to verify SHA-256 match.',
        targetCriteria: 'pkce-s256-verified',
        completed: false,
      },
    ],
  },
  'jwt-tampering': {
    cvss: '9.1',
    cvssSeverity: 'CRITICAL',
    attackVector: 'HTTP HEADER / COOKIE',
    mitigationName: 'Strict JWS Verification',
    exploitFeasibility: 'HIGH (IF ALG NONE UNCHECKED)',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'JWT-PARSER',
        message: 'Decoded header: {"alg":"HS256","typ":"JWT"}.',
      },
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'CLAIMS',
        message: 'Payload claims: sub="usr_8492", role="user", exp=1735693200.',
      },
      {
        timestamp: '12:00:02',
        level: 'success',
        category: 'HMAC-VERIFY',
        message: 'HMAC-SHA256 signature verified against server secret key.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-jwt-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Exploit Privilege Escalation',
        description:
          'Tamper with the payload claims to elevate your role from standard user to admin.',
        hint: 'Toggle the Tamper Payload button or switch role to admin and observe signature verification failure.',
        targetCriteria: 'jwt-payload-tampered',
        completed: false,
      },
      {
        id: 'sec-challenge-jwt-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Test "alg: none" Vulnerability (CVE-2015-9235)',
        description:
          'Attempt to bypass cryptographic signature verification by stripping the signature and setting alg to none.',
        hint: 'Switch the Algorithm selector to "none" and see how legacy libraries accepted unsigned tokens.',
        targetCriteria: 'jwt-alg-none',
        completed: false,
      },
    ],
  },
  'webauthn-passkeys': {
    cvss: '8.1',
    cvssSeverity: 'HIGH',
    attackVector: 'PHISHING / CREDENTIAL PROXY',
    mitigationName: 'FIDO2 Origin Binding',
    exploitFeasibility: 'PREVENTED BY HARDWARE',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'FIDO2-CORE',
        message: 'Navigator.credentials.get() called with challenge 0x8f4c2b9a.',
      },
      {
        timestamp: '12:00:02',
        level: 'info',
        category: 'ORIGIN-BIND',
        message: 'Browser enforces RP ID binding to document.origin (mybank.com).',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'HARDWARE-SIGN',
        message: 'Secure Enclave / TPM signs clientDataHash using private key.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-webauthn-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Simulate Phishing Reverse-Proxy Attack',
        description:
          'Observe why Evilginx and AitM phishing toolkits fail against FIDO2 passkeys due to origin mismatch.',
        hint: 'Switch the Origin toggle to "Simulate Phishing Site" and watch the browser reject the credential assertion.',
        targetCriteria: 'webauthn-phishing-rejected',
        completed: false,
      },
      {
        id: 'sec-challenge-webauthn-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Verify Biometric Hardware User Presence',
        description:
          'Confirm user verification (UV flag) on TouchID or YubiKey before the hardware signs authentication data.',
        hint: 'Toggle Biometric Consent to confirmed and observe the authenticatorData UV bit set to 1.',
        targetCriteria: 'webauthn-biometric-verified',
        completed: false,
      },
    ],
  },
  'session-management': {
    cvss: '7.5',
    cvssSeverity: 'HIGH',
    attackVector: 'COOKIE THEFT / XSS',
    mitigationName: 'HttpOnly, Secure, SameSite=Lax',
    exploitFeasibility: 'MODERATE',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'COOKIE-POLICY',
        message: 'Inspected Set-Cookie directives on auth response.',
      },
      {
        timestamp: '12:00:02',
        level: 'success',
        category: 'STORAGE-SEC',
        message: 'HttpOnly attribute active: document.cookie cannot read session token.',
      },
      {
        timestamp: '12:00:03',
        level: 'info',
        category: 'SESSION-ID',
        message: 'Session ID entropy: 128-bit CSPRNG token with 15-minute sliding TTL.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-session-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Analyze Session Hijacking Exposure',
        description:
          'Examine what happens when session cookies lack the HttpOnly flag during an XSS exploit.',
        hint: 'Step through Step 3 to observe document.cookie extraction.',
        targetCriteria: 'session-cookie-exposed',
        completed: false,
      },
      {
        id: 'sec-challenge-session-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Enforce Session Rotation Upon Login',
        description:
          'Eliminate Session Fixation attacks by destroying the pre-authentication session ID and issuing a new token.',
        hint: 'Advance to Step 4 to inspect the session ID regeneration mechanism.',
        targetCriteria: 'session-id-rotated',
        completed: false,
      },
    ],
  },
  'csrf-defense': {
    cvss: '8.8',
    cvssSeverity: 'HIGH',
    attackVector: 'CROSS-SITE FORGED REQUEST',
    mitigationName: 'SameSite=Lax & Double Submit',
    exploitFeasibility: 'HIGH WITHOUT SAMESITE',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'BROWSER-ORIGIN',
        message: 'Target: https://bank.com/transfer. Initiator: https://attacker.com.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'CSRF-INSPECT',
        message: 'Cross-origin POST request detected. Evaluating ambient cookie policy...',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'SAMESITE',
        message: 'SameSite=Lax blocked ambient session cookies on cross-origin POST.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-csrf-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Simulate Ambient Credential Forgery',
        description:
          'Observe how a malicious webpage triggers an authenticated state change using ambient browser cookies.',
        hint: 'Step to Step 3 to observe automatic cookie inclusion without anti-CSRF protections.',
        targetCriteria: 'csrf-ambient-exploit',
        completed: false,
      },
      {
        id: 'sec-challenge-csrf-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Deploy Cryptographic Anti-CSRF Token',
        description:
          'Enforce synchronous token pattern or SameSite cookie attributes to block forged state-changing requests.',
        hint: 'Advance to Step 5 to inspect the cryptographic token match.',
        targetCriteria: 'csrf-token-validated',
        completed: false,
      },
    ],
  },
  'xss-csp': {
    cvss: '9.6',
    cvssSeverity: 'CRITICAL',
    attackVector: 'UNSANITIZED REFLECTION / DOM',
    mitigationName: 'Strict Content Security Policy',
    exploitFeasibility: 'HIGH',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'HTML-PARSER',
        message: 'Parsing incoming response body for dynamic user comment stream.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'XSS-FILTER',
        message: 'Raw HTML contains unescaped <script> tag: <script>fetch(...)</script>.',
      },
      {
        timestamp: '12:00:03',
        level: 'error',
        category: 'CSP-VIOLATION',
        message:
          'Refused to execute inline script because it violates directive: "script-src \'nonce-rAnd0m\'".',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-xss-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Inject Stored XSS Script Payload',
        description:
          'Test how malicious JavaScript executes within the victim’s origin when raw input is injected into the DOM.',
        hint: 'Use the payload selector in the visualizer to test the script tag.',
        targetCriteria: 'xss-payload-executed',
        completed: false,
      },
      {
        id: 'sec-challenge-xss-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Configure Nonce-Based CSP Policy',
        description:
          'Enforce strict Content-Security-Policy with cryptographic nonces to prevent unauthorized inline script execution.',
        hint: 'Toggle strict CSP and observe the browser block unauthorized inline execution.',
        targetCriteria: 'xss-csp-enforced',
        completed: false,
      },
    ],
  },
  'sql-injection': {
    cvss: '9.8',
    cvssSeverity: 'CRITICAL',
    attackVector: 'UNESCAPED SQL INTERPOLATION',
    mitigationName: 'Parameterized Prepared Statements',
    exploitFeasibility: 'HIGH',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'DB-DRIVER',
        message: 'Received client query on connection pool worker #4.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'AST-LEXER',
        message: "Query string contains unquoted boolean operator: OR '1'='1' --.",
      },
      {
        timestamp: '12:00:03',
        level: 'error',
        category: 'AST-MUTATE',
        message: 'Grammar tree mutated! WHERE clause resolved to tautology (ALWAYS TRUE).',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-sql-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Mutate the Query AST via Tautology',
        description:
          "Inject `admin' OR '1'='1' --` into a concatenated query to bypass password authentication.",
        hint: 'Select the Tautology Payload button under String Concatenation mode.',
        targetCriteria: 'sqli-ast-mutated',
        completed: false,
      },
      {
        id: 'sec-challenge-sql-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Enforce Parameterized PreparedStatement',
        description:
          'Switch to Prepared Statements to ensure the database engine compiles the SQL AST before binding user data.',
        hint: 'Toggle the mode to PREPARED STATEMENT (SAFE) and verify user data is treated strictly as literal data.',
        targetCriteria: 'sqli-parameterized-safe',
        completed: false,
      },
    ],
  },
  'cors-preflight': {
    cvss: '7.4',
    cvssSeverity: 'HIGH',
    attackVector: 'MISCONFIGURED ACCESS-CONTROL',
    mitigationName: 'Explicit Origin Whitelisting',
    exploitFeasibility: 'MODERATE',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'CORS-PREFLIGHT',
        message: 'Received OPTIONS /api/user. Origin: https://untrusted-site.com.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'HEADER-CHECK',
        message: 'Requested headers: Authorization, Content-Type: application/json.',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'ORIGIN-VERIFY',
        message: 'Rejected origin. Access-Control-Allow-Origin header omitted.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-cors-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Analyze Wildcard Origin Vulnerability',
        description:
          'Observe why returning Access-Control-Allow-Origin: * combined with credentials creates severe data leaks.',
        hint: 'Step through the preflight inspection to examine the wildcards.',
        targetCriteria: 'cors-wildcard-observed',
        completed: false,
      },
      {
        id: 'sec-challenge-cors-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Verify Strict Preflight Validation',
        description:
          'Ensure preflight OPTIONS requests strictly validate origin headers against an immutable allowlist.',
        hint: 'Step to the Preflight verification step.',
        targetCriteria: 'cors-preflight-validated',
        completed: false,
      },
    ],
  },
  'ssrf-cloud-metadata': {
    cvss: '9.8',
    cvssSeverity: 'CRITICAL',
    attackVector: 'SERVER-SIDE HTTP CLIENT',
    mitigationName: 'IMDSv2 & Egress IP Filtering',
    exploitFeasibility: 'HIGH IN CLOUD ENVIRONMENTS',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'HTTP-PROXY',
        message:
          'Worker received PDF render request with URL: http://169.254.169.254/latest/meta-data/.',
      },
      {
        timestamp: '12:00:02',
        level: 'error',
        category: 'SSRF-ALERT',
        message: 'Attempted connection to link-local cloud metadata address (169.254.169.254)!',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'EGRESS-WAF',
        message: 'Egress firewall dropped connection: private IP addresses blocked.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-ssrf-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Probe Cloud Instance Metadata Service',
        description:
          'Simulate requesting AWS/GCP internal metadata IP (169.254.169.254) to extract temporary IAM credentials.',
        hint: 'Run the SSRF exploit step to extract instance credentials.',
        targetCriteria: 'ssrf-metadata-probed',
        completed: false,
      },
      {
        id: 'sec-challenge-ssrf-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Enforce IMDSv2 Session Token Defense',
        description:
          'Verify that requiring a session token header (X-aws-ec2-metadata-token) blocks standard SSRF payloads.',
        hint: 'Advance to the IMDSv2 mitigation step.',
        targetCriteria: 'ssrf-imdsv2-enforced',
        completed: false,
      },
    ],
  },
  'clickjacking-defense': {
    cvss: '6.5',
    cvssSeverity: 'MEDIUM',
    attackVector: 'TRANSPARENT IFRAME OVERLAY',
    mitigationName: "frame-ancestors 'none'",
    exploitFeasibility: 'HIGH',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'DOM-IFRAME',
        message: 'Parent document https://malicious.com attempted to embed target inside <iframe>.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'UI-REDRESS',
        message: 'Iframe opacity set to 0.001 with absolute coordinate overlay.',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'FRAME-CHECK',
        message: 'Blocked embedding: CSP directive "frame-ancestors \'none\'" enforced by browser.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-clickjack-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Inspect UI Redressing Alignment',
        description:
          'Observe how an invisible iframe captures user clicks intended for a dummy decoy button.',
        hint: 'Step through the iframe overlay alignment in the visualizer.',
        targetCriteria: 'clickjack-overlay-aligned',
        completed: false,
      },
      {
        id: 'sec-challenge-clickjack-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Deploy X-Frame-Options: DENY Header',
        description:
          'Enforce frame-ancestors to prevent malicious sites from embedding privileged administrative interfaces.',
        hint: 'Enable framing defense to verify browser block.',
        targetCriteria: 'clickjack-headers-set',
        completed: false,
      },
    ],
  },
  'command-injection': {
    cvss: '9.8',
    cvssSeverity: 'CRITICAL',
    attackVector: 'SYSTEM SHELL EXECUTION',
    mitigationName: 'execFile() & Argument Arrays',
    exploitFeasibility: 'HIGH',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'PROC-SPAWN',
        message: 'System received user input for network ping utility: "8.8.8.8; cat /etc/passwd".',
      },
      {
        timestamp: '12:00:02',
        level: 'error',
        category: 'SHELL-INJECT',
        message: 'Metacharacter ";" parsed by /bin/sh as sequential command delimiter!',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'SECURE-EXEC',
        message:
          'Replaced system() with execFile(["/bin/ping", input]): metacharacters treated as literal argv.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-cmd-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Chain Shell Commands via Metacharacters',
        description:
          'Inject command separators (;, |, &&) into an unquoted shell command execution.',
        hint: 'Step to the shell concatenation step in the visualizer.',
        targetCriteria: 'cmd-injection-chained',
        completed: false,
      },
      {
        id: 'sec-challenge-cmd-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Eliminate the Shell Sub-process',
        description:
          'Bypass the OS shell interpreter entirely by using argument arrays passed directly to the kernel.',
        hint: 'Inspect the execFile parameter array execution step.',
        targetCriteria: 'cmd-execfile-safe',
        completed: false,
      },
    ],
  },
  'zero-trust': {
    cvss: '7.8',
    cvssSeverity: 'HIGH',
    attackVector: 'INTERNAL NETWORK COMPROMISE',
    mitigationName: 'Mutual TLS & Continuous Attestation',
    exploitFeasibility: 'CRITICAL IN HYBRID WORK',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'PERIMETER',
        message: 'Request originated from internal IP 10.0.4.15 (Corporate Subnet).',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'ZERO-TRUST',
        message: 'Implicit internal network trust revoked: "Never Trust, Always Verify".',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'MTLS-CHECK',
        message: 'Verified client certificate (mTLS) + device TPM compliance status.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-zt-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Simulate Lateral Movement on Flat Network',
        description:
          'Observe how attackers move unimpeded once behind a traditional perimeter firewall.',
        hint: 'Step through the castle-and-moat perimeter bypass scenario.',
        targetCriteria: 'zt-lateral-movement-observed',
        completed: false,
      },
      {
        id: 'sec-challenge-zt-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Enforce Continuous Microsegmentation',
        description:
          'Verify each service-to-service RPC using mTLS identities and real-time context evaluation.',
        hint: 'Step through the Zero Trust policy evaluation engine.',
        targetCriteria: 'zt-microsegmentation-enforced',
        completed: false,
      },
    ],
  },
  'rate-limiting-ddos': {
    cvss: '7.5',
    cvssSeverity: 'HIGH',
    attackVector: 'VOLUMETRIC / APPLICATION ABUSE',
    mitigationName: 'Redis Token Bucket & Leaky Bucket',
    exploitFeasibility: 'HIGH',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'RATE-LIMITER',
        message: 'Incoming burst: 140 req/sec from client IP 203.0.113.84.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'TOKEN-BUCKET',
        message: 'Token bucket capacity exhausted (0 tokens remaining). Refill rate: 10/sec.',
      },
      {
        timestamp: '12:00:03',
        level: 'error',
        category: 'HTTP-429',
        message: 'Returned 429 Too Many Requests with Retry-After: 12s.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-rate-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Exhaust Token Bucket via Rapid Burst',
        description:
          'Fire consecutive requests exceeding the bucket capacity to trigger HTTP 429 rate limiting.',
        hint: 'Use the traffic generator knob to spike request volume.',
        targetCriteria: 'rate-limit-bucket-exhausted',
        completed: false,
      },
      {
        id: 'sec-challenge-rate-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Configure Sliding Window Counter',
        description:
          'Implement distributed sliding log counters to eliminate boundary burst vulnerabilities.',
        hint: 'Step to the Redis sliding window evaluation step.',
        targetCriteria: 'rate-limit-sliding-window',
        completed: false,
      },
    ],
  },
  'idor-bola': {
    cvss: '8.6',
    cvssSeverity: 'HIGH',
    attackVector: 'DIRECT OBJECT REFERENCE',
    mitigationName: 'Tenant-Scoped Authorization Checks',
    exploitFeasibility: 'HIGH (OWASP API #1)',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'API-GATEWAY',
        message: 'Authenticated user_id=42 requested GET /api/invoices/9902.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'AUTHZ-CHECK',
        message: 'Validating invoice tenant ownership: invoice.owner_id === user.id.',
      },
      {
        timestamp: '12:00:03',
        level: 'error',
        category: 'IDOR-BLOCKED',
        message: 'Access denied: Invoice #9902 belongs to user #108. Returned HTTP 403.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-idor-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Manipulate Primary Key in REST Endpoint',
        description:
          'Change the target resource identifier in a URL to access another customer’s private invoice.',
        hint: 'Step to the parameter tampering step in the visualizer.',
        targetCriteria: 'idor-id-tampered',
        completed: false,
      },
      {
        id: 'sec-challenge-idor-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Enforce Row-Level Tenant Security',
        description:
          'Ensure the database query automatically appends `AND tenant_id = session.tenant_id`.',
        hint: 'Advance to the query scoping step to verify tenant constraint.',
        targetCriteria: 'idor-scoping-enforced',
        completed: false,
      },
    ],
  },
  'supply-chain-security': {
    cvss: '9.3',
    cvssSeverity: 'CRITICAL',
    attackVector: 'DEPENDENCY PACKAGE COMPROMISE',
    mitigationName: 'SBOM, Lockfile Hashes & Sigstore',
    exploitFeasibility: 'MODERATE (HIGH BLAST RADIUS)',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'NPM-INSTALL',
        message: 'Resolving transitive dependency tree: 1,420 packages loaded.',
      },
      {
        timestamp: '12:00:02',
        level: 'error',
        category: 'INTEGRITY-FAIL',
        message:
          'Hash mismatch for package "event-stream@3.3.6": expected sha512-abc, found sha512-bad!',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'SIGSTORE',
        message: 'Build aborted: unverified maintainer key signature rejected by build pipeline.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-supply-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Detect Typosquatting in Dependency Manifest',
        description:
          'Observe how malicious packages masquerade as legitimate utilities (e.g. cross-env vs crossenv).',
        hint: 'Step through the manifest resolution step in the visualizer.',
        targetCriteria: 'supply-typosquatting-detected',
        completed: false,
      },
      {
        id: 'sec-challenge-supply-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Verify Lockfile Cryptographic Hashes',
        description:
          'Enforce strict subresource integrity and signed provenance attestation (SLSA level 3).',
        hint: 'Verify the SHA-512 lockfile validation step.',
        targetCriteria: 'supply-hash-verified',
        completed: false,
      },
    ],
  },
  'tls-handshake': {
    cvss: '7.5',
    cvssSeverity: 'HIGH',
    attackVector: 'MAN-IN-THE-MIDDLE / CIPHER DOWNGRADE',
    mitigationName: 'TLS 1.3 & ECDHE Forward Secrecy',
    exploitFeasibility: 'LOW ON TLS 1.3',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'TLS-CLIENT',
        message: 'ClientHello sent with cipher suites: TLS_AES_256_GCM_SHA384.',
      },
      {
        timestamp: '12:00:02',
        level: 'info',
        category: 'ECDHE-KEY',
        message: 'Client included speculative X25519 public key share in ClientHello (1-RTT).',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'SESSION-KEYS',
        message: 'ServerHello completed Diffie-Hellman: Derived ephemeral traffic secrets.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-tls-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Compare TLS 1.2 vs TLS 1.3 Handshake RTTs',
        description:
          'Observe how TLS 1.3 eliminates an entire round-trip time by transmitting the key share in ClientHello.',
        hint: 'Step through the 1-RTT cryptographic derivation steps.',
        targetCriteria: 'tls-rtt-compared',
        completed: false,
      },
      {
        id: 'sec-challenge-tls-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Verify Perfect Forward Secrecy (PFS)',
        description:
          'Confirm that compromising the server’s private RSA key cannot decrypt past recorded sessions.',
        hint: 'Inspect the ephemeral ECDHE key generation step.',
        targetCriteria: 'tls-pfs-verified',
        completed: false,
      },
    ],
  },
  'password-hashing': {
    cvss: '8.5',
    cvssSeverity: 'HIGH',
    attackVector: 'OFFLINE GPU RAINBOW TABLE',
    mitigationName: 'Argon2id (Memory-Hard)',
    exploitFeasibility: 'HIGH AGAINST MD5/SHA256',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'HASH-BENCH',
        message: 'Benchmarking GPU hash rate: MD5 produces 45,000,000,000 hashes/sec on RTX 4090.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'SALT-CHECK',
        message: 'Raw fast hash without memory hardness susceptible to rainbow table collision.',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'ARGON2ID',
        message:
          'Argon2id configured: m=65536KB (64MB RAM), t=3 iterations, p=4 threads. ~250ms/hash.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-pwd-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Demonstrate GPU Rainbow Table Vulnerability',
        description:
          'Compare how fast SHA-256 can be cracked compared to a memory-hard password derivation function.',
        hint: 'Step through the hashing benchmark comparison in the visualizer.',
        targetCriteria: 'pwd-hash-benchmarked',
        completed: false,
      },
      {
        id: 'sec-challenge-pwd-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Calibrate Argon2id Work Factor',
        description:
          'Tune memory cost and iteration counts to force attackers into unacceptable hardware expenditure.',
        hint: 'Step to the Argon2id parameter calibration step.',
        targetCriteria: 'pwd-argon2id-tuned',
        completed: false,
      },
    ],
  },
  'e2ee-double-ratchet': {
    cvss: '8.2',
    cvssSeverity: 'HIGH',
    attackVector: 'COMMUNICATION INTERCEPTION',
    mitigationName: 'Signal Double Ratchet (DH + KDF)',
    exploitFeasibility: 'CRYPTOGRAPHICALLY SOUND',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'DH-RATCHET',
        message: 'Alice generated ephemeral Curve25519 keypair for message transmission.',
      },
      {
        timestamp: '12:00:02',
        level: 'info',
        category: 'SYMMETRIC-KDF',
        message: 'Ratchet step: Derived message key MK_1 and updated chain key CK_1.',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'FORWARD-SEC',
        message:
          'Previous message key deleted from RAM: Past communications permanently unrecoverable.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-e2ee-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Trigger Symmetric KDF Ratchet Step',
        description:
          'Advance the symmetric chain key to derive unique single-use message encryption keys.',
        hint: 'Step through message transmission to observe key turnover.',
        targetCriteria: 'e2ee-kdf-ratcheted',
        completed: false,
      },
      {
        id: 'sec-challenge-e2ee-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Verify Post-Compromise Security Recovery',
        description:
          'Observe how a new Diffie-Hellman round restores complete security even if a temporary key leaked.',
        hint: 'Step to the DH ratchet step in the visualizer.',
        targetCriteria: 'e2ee-post-compromise-verified',
        completed: false,
      },
    ],
  },
  'mass-assignment': {
    cvss: '8.4',
    cvssSeverity: 'HIGH',
    attackVector: 'OVER-POSTING PRIVILEGED ATTRIBUTES',
    mitigationName: 'Strict DTO Input Filtering',
    exploitFeasibility: 'HIGH IN MODERN ORMS',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'HTTP-BODY',
        message: 'Received PUT /api/profile: {"name":"Bob","isAdmin":true,"role":"superuser"}.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'ORM-BIND',
        message:
          'Unfiltered model bind: User.update(req.body) attempted to persist unwhitelisted fields.',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'DTO-FILTER',
        message: 'DTO filter applied: "isAdmin" and "role" stripped. Only "name" permitted.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-mass-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Inject Hidden Model Attribute',
        description:
          'Submit an unauthorized property (`is_admin: true`) in a standard profile update payload.',
        hint: 'Step to the over-posting demonstration step in the visualizer.',
        targetCriteria: 'mass-assignment-injected',
        completed: false,
      },
      {
        id: 'sec-challenge-mass-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Enforce Strong Parameters / DTO Whitelist',
        description:
          'Ensure ORM updates strictly use explicit field transfer objects rather than raw request dictionaries.',
        hint: 'Advance to the DTO validation step.',
        targetCriteria: 'mass-assignment-dto-filtered',
        completed: false,
      },
    ],
  },
  'container-escape': {
    cvss: '9.8',
    cvssSeverity: 'CRITICAL',
    attackVector: 'PRIVILEGED CONTAINER / HOST MOUNT',
    mitigationName: 'Drop Linux Capabilities & User Namespaces',
    exploitFeasibility: 'HIGH (IF --PRIVILEGED)',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'CGROUP-NS',
        message: 'Container started. Kernel namespaces: PID, Mount, Net, IPC, UTS.',
      },
      {
        timestamp: '12:00:02',
        level: 'error',
        category: 'CAP-CHECK',
        message: 'CAP_SYS_ADMIN granted! Container root has raw block device access to /dev/sda1.',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'SECCOMP-DROP',
        message:
          'Enforced Seccomp default profile + user namespaces: root inside container maps to UID 100000.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-container-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Analyze Privileged Flag Risk (`--privileged`)',
        description:
          'Observe how running containers with full capabilities allows mounting host block devices directly.',
        hint: 'Step through the privileged container escape sequence.',
        targetCriteria: 'container-privileged-analyzed',
        completed: false,
      },
      {
        id: 'sec-challenge-container-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Deploy User Namespaces & Seccomp Profile',
        description:
          'Restrict container root privileges by remapping container UID 0 to an unprivileged host UID.',
        hint: 'Inspect the capability dropping step in the visualizer.',
        targetCriteria: 'container-seccomp-enforced',
        completed: false,
      },
    ],
  },
  'open-redirect': {
    cvss: '6.5',
    cvssSeverity: 'MEDIUM',
    attackVector: 'UNVALIDATED REDIRECT PARAMETER',
    mitigationName: 'Relative Path Validation',
    exploitFeasibility: 'HIGH IN OAUTH / LOGIN',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'REDIRECT-REQ',
        message: 'Received login request with returnUrl="https://evil-phishing-portal.com".',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'URI-PARSER',
        message: 'Parsed target domain: evil-phishing-portal.com does not match host app.com.',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'PATH-GUARD',
        message: 'Enforced relative path check: redirected to default /dashboard.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-redirect-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Craft Phishing Redirect URI',
        description:
          'Observe how attackers hijack the post-login redirect flow to harvest credentials on a lookalike site.',
        hint: 'Step to the arbitrary redirect URL manipulation step.',
        targetCriteria: 'redirect-phishing-crafted',
        completed: false,
      },
      {
        id: 'sec-challenge-redirect-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Enforce Relative URI & Origin Whitelisting',
        description:
          'Ensure redirect targets must start with a single `/` and reject protocol-relative `//` URLs.',
        hint: 'Advance to the URL validation step in the visualizer.',
        targetCriteria: 'redirect-validation-enforced',
        completed: false,
      },
    ],
  },
  'replay-attacks': {
    cvss: '8.1',
    cvssSeverity: 'HIGH',
    attackVector: 'NETWORK SNIFFING & PACKET REPLAY',
    mitigationName: 'Cryptographic Nonces & Timestamp Windows',
    exploitFeasibility: 'HIGH ON STATELESS APIS',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'NET-INTERCEPT',
        message: 'Attacker captured valid signed transfer packet: id=992, amount=$1,000.',
      },
      {
        timestamp: '12:00:02',
        level: 'warn',
        category: 'REPLAY-INJECT',
        message: 'Attacker retransmitted identical payload 4 times to drain bank account.',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'NONCE-CACHE',
        message: 'Nonce "0x4b7e1a" already exists in Redis TTL cache! Replayed request dropped.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-replay-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Re-send Captured API Transaction',
        description:
          'Simulate retransmitting an intercepted valid payment payload without cryptographic freshness checks.',
        hint: 'Step through the network packet replay step in the visualizer.',
        targetCriteria: 'replay-payload-retransmitted',
        completed: false,
      },
      {
        id: 'sec-challenge-replay-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Validate Nonces in Distributed Cache',
        description:
          'Verify that every request includes a unique nonce stored in Redis with a 5-minute expiration window.',
        hint: 'Step to the nonce cache deduplication step in the visualizer.',
        targetCriteria: 'replay-nonce-verified',
        completed: false,
      },
    ],
  },
  'prototype-pollution': {
    cvss: '9.8',
    cvssSeverity: 'CRITICAL',
    attackVector: 'RECURSIVE OBJECT MERGE',
    mitigationName: 'Object.create(null) & Schema Validation',
    exploitFeasibility: 'HIGH IN NODE.JS / JS',
    initialLogs: [
      {
        timestamp: '12:00:01',
        level: 'info',
        category: 'JSON-PARSE',
        message: 'Merging user preferences object: {"__proto__":{"isAdmin":true}}.',
      },
      {
        timestamp: '12:00:02',
        level: 'error',
        category: 'PROTO-MUTATE',
        message:
          'Global Object.prototype polluted! All existing and future objects inherit {isAdmin: true}.',
      },
      {
        timestamp: '12:00:03',
        level: 'success',
        category: 'OBJECT-FREEZE',
        message: 'Applied Object.freeze(Object.prototype) or Map: prototype mutation blocked.',
      },
    ],
    challenges: [
      {
        id: 'sec-challenge-proto-1',
        moduleId: 'url-lifecycle' as any,
        title: 'Pollute the Root Object Prototype',
        description:
          'Inject `__proto__` properties into a deep merge function to alter application-wide authorization checks.',
        hint: 'Step through the recursive merge step in the visualizer.',
        targetCriteria: 'proto-pollution-injected',
        completed: false,
      },
      {
        id: 'sec-challenge-proto-2',
        moduleId: 'url-lifecycle' as any,
        title: 'Deploy Prototype-Free Dictionaries',
        description:
          'Ensure user input is merged into `Object.create(null)` or validate property keys against a forbidden list.',
        hint: 'Advance to the prototype protection step.',
        targetCriteria: 'proto-safe-merge-enforced',
        completed: false,
      },
    ],
  },
};

export const getSecurityMeta = (lessonId: string): SecurityLessonMeta => {
  return SECURITY_LESSON_META[lessonId] || SECURITY_LESSON_META['oauth-pkce'];
};
