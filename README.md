# underthehood 🛡️ 🌐 🗄️

> A unified, interactive visual engineering suite combining **Cybersecurity & Cryptography**, **Internet Plumbing & Protocols**, and **Database Internals & Storage Engines**.

Instead of static diagrams or dry RFC documentation, this platform turns complex systems engineering concepts into **interactive, tactile state machines and live simulations**. Step through packet journeys, operate database storage engines, analyze concurrent transaction collisions, and witness real-world exploits in action.

---

## 🎨 The Philosophy

1. **Explorable Explanations (Bret Victor):** Do not just describe a mechanism—let the learner click "Simulate Attacker", inspect packet hex dumps, step through B+ tree node splits, and trigger bufferbloat.
2. **Progressive Disclosure:** Each module starts with an intuitive mental model before exposing internal algorithms (LSM Leveled Compaction, BBR pacing rate, Double Ratchet KDF chains, Linux namespaces).
3. **Tactile Feedback:** Built-in Web Audio API synthesizer for tactile clicks, frequency tones, and achievement alerts, coupled with confetti rewards on challenge completion.
4. **Deep Educational Dive:** Paired with real CVE case studies, RFC specifications, production hardening blueprints, and developer FAQs.

---

## 🔍 Global Command Palette (`⌘K` / `Ctrl+K`)

Use the instant search bar in the header or press `⌘K` anywhere to search across **all 29 interactive modules**:

- Security attacks, CVE case studies, and defense blueprints
- Internet routing, DNS resolution, TCP algorithms (Reno vs BBR), and QUIC
- Database engines (RocksDB LSM-Trees, PostgreSQL B+ Trees, ACID anomalies)
- Interactive challenges and guided systems experiments

---

## 📚 Unified Curriculum (29 Interactive Modules)

### Suite 01: Designed to Secure (23 Security Modules)

#### Track 1: Identity & Authentication Protocols (`auth`)

1. **OAuth 2.0 with PKCE (Proof Key for Code Exchange)**
2. **JWT Anatomy & Signature Tampering Engine**
3. **WebAuthn & Passkeys (FIDO2)**
4. **Session Fixation & Cookie Hijacking**
5. **Open Redirect Vulnerabilities & OAuth Hijacking**

#### Track 2: Web Exploits & Browser Security (`exploits`)

6. **CSRF Attacks vs. SameSite Cookie Armor**
7. **XSS & Content Security Policy (CSP)**
8. **SQL AST Injection vs. Parameterized Queries**
9. **CORS & Preflight (OPTIONS) Handshake**
10. **SSRF & Cloud Metadata Defense (IMDSv2)**
11. **Clickjacking & Frame-Busting Armor**
12. **OS Command Injection & Remote Code Execution (RCE)**
13. **Prototype Pollution in JavaScript/Node.js**

#### Track 3: Cloud Infrastructure & Zero Trust (`architecture`)

14. **Zero Trust & Service-to-Service mTLS**
15. **Rate Limiting & DDoS Defense (Token Bucket)**
16. **Broken Object Level Authorization (IDOR / BOLA)**
17. **Supply Chain Security & Dependency Confusion**
18. **Mass Assignment & Object Injection**
19. **Container Escape & Docker Socket Breakout**

#### Track 4: Applied Cryptography & Data Protection (`crypto`)

20. **TLS 1.3 Handshake & Ephemeral Diffie-Hellman**
21. **Password Hashing & Key Derivation (Argon2id vs. GPU Clusters)**
22. **End-to-End Encryption & The Double Ratchet (Signal / WhatsApp)**
23. **Replay Attacks & Cryptographic Nonce Defenses**

---

### Suite 02: Designed to Route (Internet Plumbing & Protocols)

24. **Module 01: The Life of a URL Request**
    - Complete 16-step request lifecycle: Browser DNS cache &rarr; OS stub resolver &rarr; Recursive Resolver (`8.8.8.8`) &rarr; Root DNS (`.`) &rarr; TLD (`.dev`) &rarr; Authoritative IP &rarr; TCP 3-Way Handshake &rarr; TLS 1.3 Key Share &rarr; HTTP/2 GET & Reverse Proxy &rarr; PostgreSQL query &rarr; DOM parsing & GPU paint.
    - Dynamic latency waterfall breakdown and packet hex dump inspector.
25. **Module 02: TCP Congestion Control Simulator**
    - Real-time comparison: **TCP Reno** (loss-based AIMD) vs **TCP BBR** (model-based pacing).
    - Live charts for `cwnd`, `ssthresh`, pacing rate, throughput, and router buffer queue depth.
    - Interactive bufferbloat, cross-traffic, and packet loss triggers.
26. **Module 03: HTTP/1.1 vs HTTP/2 vs HTTP/3 Protocol Race**
    - 3-lane real-time protocol race loading 9 heterogeneous assets.
    - **Drop Packet on Stream #2**: Demonstrates TCP Head-of-Line blocking (HTTP/2 stalls all streams; HTTP/3 continues over independent QUIC streams).

---

### Suite 03: Designed to Query (Database Internals & Storage Engines)

27. **Module 04: LSM-Tree Storage Engine (RocksDB & Cassandra)**
    - Full write pipeline: Append-only WAL &rarr; Active MemTable (SkipList) &rarr; Immutable MemTable &rarr; L0 SSTables &rarr; Leveled Compaction &rarr; L1 & L2 sorted runs.
    - Point lookup read path tracing (MemTable &rarr; Bloom Filter &rarr; L0 &rarr; L1 &rarr; L2) and tombstone cleanup.
    - Real-time metrics: Write Amplification, Read Amplification, Space Amplification, and RAM usage.
28. **Module 05: B+ Tree Node Splitter (PostgreSQL & InnoDB)**
    - Mathematical B+ Tree indexing algorithm in TypeScript with configurable order $M$ (3, 4, 5).
    - Dynamic insertion with node splits, median promotions, and root splits.
    - Point query traversal and sequential range scan through horizontal leaf linked list.
29. **Module 06: ACID & Transaction Isolation Simulator**
    - Interactive concurrent transaction ($T_1$, $T_2$) execution timeline across 4 ANSI SQL isolation levels (`READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`).
    - 5 Anomaly scenarios: Dirty Read ($G_{1a}$), Non-Repeatable Read ($G_{1b}$), Phantom Read ($A_3$), Lost Update ($P_4$), and Write Skew (Snapshot Isolation on-call doctor anomaly).
    - MVCC metadata inspection (`xmin`, `xmax`) and lock tracking.

---

### Suite 04: Systems Playground & Challenges

- **Playground View:** Switch instantly between all 6 systems engineering simulations.
- **8 Guided Experiments:** Hands-on experiments with hypotheses, setups, and takeaways.
- **12 Practical Challenges:** Real-time criteria verification, Web Audio chimes, and confetti celebration.
- **System Design Calculator & Latency Visualizer:** Latency numbers every engineer should know.
- **Systems Architecture Cheatsheet (`⌘K` Reference Manual):** RFC cheat sheets, port numbers, and engine trade-offs.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or pnpm

### Development

```bash
# Navigate to project
cd /Users/akhilpasham/proyecto/underthehood

# Run dev server
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS with custom editorial themes (Light Parchment & Dark Obsidian)
- **Icons:** Lucide React
- **Typography:** Newsreader (Editorial Serif), Inter (Sans-serif), JetBrains Mono (Monospace)
- **Controls:** Keyboard-driven step scrubber (`←` and `→` arrow keys, Auto-Play timer, `⌘K` Command Palette)
