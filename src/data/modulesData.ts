import { ModuleId, SystemsTrackId, Challenge } from '../types';

export interface ModuleDefinition {
  id: ModuleId;
  trackId: SystemsTrackId;
  number: string;
  title: string;
  subtitle: string;
  tagline: string;
  accentColor: 'network' | 'database' | 'robotics' | 'silicon';
  overview: string;
  concept: string;
  architectureDetails: {
    components: { name: string; role: string; details: string }[];
  };
  keyTakeaway: string;
  challenges: Challenge[];
}

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  'url-lifecycle': {
    id: 'url-lifecycle',
    trackId: 'route',
    number: '01',
    title: 'The Life of a URL Request',
    subtitle: 'Internet Plumbing & Packet Lifecycles',
    tagline:
      'Track every packet, DNS lookup, TCP/TLS handshake, and HTTP payload from keystroke to rendered pixel.',
    accentColor: 'network',
    overview:
      'When you type a URL into your browser address bar and press Enter, dozens of coordinated network protocols activate within milliseconds across the globe.',
    concept:
      'A web request is not a single transmission, but a multi-tiered protocol stack executing in precise sequence: Hierarchical DNS resolution translates names to IP addresses; a TCP 3-way handshake establishes reliable byte-stream state; TLS 1.3 derives ephemeral session keys via Diffie-Hellman; and HTTP transfers serialized application resources.',
    architectureDetails: {
      components: [
        {
          name: 'Browser Client',
          role: 'Initiator & Parser',
          details:
            'Maintains in-memory DNS cache, handles connection pooling, parses HTML/CSS/JS, and renders the DOM.',
        },
        {
          name: 'OS Resolver / Stub',
          role: 'Local Resolution',
          details:
            'Checks /etc/hosts, OS socket caches (e.g. systemd-resolved or mDNSResponder), and delegates cache misses to the configured recursive resolver.',
        },
        {
          name: 'Recursive Resolver',
          role: 'Query Coordinator',
          details:
            'Usually ISP or Anycast DNS (8.8.8.8, 1.1.1.1) that traverses the root, TLD, and authoritative nameservers on behalf of the client.',
        },
        {
          name: 'Root Server (.)',
          role: 'Root Zone Anchor',
          details:
            '13 root server IP identities (hundreds of anycast instances) directing queries to the appropriate Top-Level Domain (TLD) servers.',
        },
        {
          name: 'TLD Server (.dev / .com)',
          role: 'Domain Registrar Registry',
          details:
            "Maintains records for all domains under that extension and points to the domain's authoritative name servers.",
        },
        {
          name: 'Authoritative Nameserver',
          role: 'DNS Authority',
          details:
            'Holds actual DNS zone records (A, AAAA, CNAME) configured by the domain owner and returns the server IP.',
        },
        {
          name: 'Edge Gateway / CDN',
          role: 'TLS Termination & Routing',
          details:
            'Terminates TCP/TLS connections close to the user, inspects SNI, and proxies or serves cached content.',
        },
        {
          name: 'Application Server',
          role: 'Compute & Database Query',
          details:
            'Executes business logic, queries database storage engines, and produces the HTTP response body.',
        },
      ],
    },
    keyTakeaway:
      'DNS caching at the browser and OS level eliminates the entire 4-step hierarchical resolution tree on subsequent requests. TLS 1.3 reduces cryptographic setup from 2 RTTs down to 1 RTT, saving 50-150ms of user-perceived latency.',
    challenges: [
      {
        id: 'challenge-url-1',
        moduleId: 'url-lifecycle',
        title: 'Cache Warm-up',
        description:
          'Observe the difference in round-trip count when switching DNS cache from Full Miss to Browser Cache Hit.',
        hint: 'Click the DNS Cache toggle to switch from "Full Miss" to "Browser Hit", then step through or play the simulation.',
        targetCriteria: 'dns-cache-hit',
        completed: false,
      },
      {
        id: 'challenge-url-2',
        moduleId: 'url-lifecycle',
        title: 'Compare Plaintext vs Encrypted',
        description:
          'Switch the protocol to HTTP and notice which cryptographic handshake stage disappears completely.',
        hint: 'Toggle the Protocol switch between HTTPS and HTTP.',
        targetCriteria: 'protocol-http',
        completed: false,
      },
    ],
  },
  'tcp-congestion': {
    id: 'tcp-congestion',
    trackId: 'route',
    number: '02',
    title: 'TCP Congestion Control Simulator',
    subtitle: 'Reno vs BBR: Loss-Based vs Model-Based',
    tagline:
      'Witness the fundamental battle of transport protocols: why packet loss wrecks TCP Reno, and how BBR measures real bottleneck bandwidth.',
    accentColor: 'network',
    overview:
      'TCP must regulate transmission speed without knowing network capacity in advance. TCP Reno treats packet loss as the only congestion signal, whereas Google BBR creates a continuous mathematical model of the physical pipe.',
    concept:
      'TCP Reno uses additive-increase/multiplicative-decrease (AIMD): it probes bandwidth by expanding cwnd until intermediate router buffers fill completely and overflow (packet drop), causing throughput to plummet by 50%. TCP BBR (Bottleneck Bandwidth and RTT) paces packets to match the physical bottleneck delivery rate (BtlBw) while keeping in-flight data equal to the Bandwidth-Delay Product (BDP), preventing bufferbloat.',
    architectureDetails: {
      components: [
        {
          name: 'Sender (Client/Server)',
          role: 'Transmission Controller',
          details:
            'Calculates cwnd (Congestion Window), ssthresh (Slow Start Threshold), and pacing rate per socket.',
        },
        {
          name: 'Network Pipe',
          role: 'Physical Medium',
          details: 'Imposes propagation delay (minRTT) and physical serialization bandwidth limit.',
        },
        {
          name: 'Intermediate Router Buffer',
          role: 'Bottleneck Queue',
          details:
            'Absorbs transient packet bursts. In deep buffers, loss-based algorithms induce hundreds of milliseconds of bufferbloat.',
        },
        {
          name: 'Receiver',
          role: 'Acknowledgment Source',
          details:
            'Sends cumulative and selective ACKs (SACK) back to the sender with timestamp options.',
        },
      ],
    },
    keyTakeaway:
      'High packet loss on lossy links (like Wi-Fi or satellite) catastrophically degrades TCP Reno because it misinterprets random wireless drops as network saturation. BBR isolates packet loss from bandwidth estimation.',
    challenges: [
      {
        id: 'challenge-tcp-1',
        moduleId: 'tcp-congestion',
        title: 'Trigger Multiplicative Decrease',
        description:
          'Introduce 5% packet loss or fill the router buffer to watch TCP Reno halve its congestion window.',
        hint: 'Set packet loss slider > 3% or reduce router buffer size and hit Run.',
        targetCriteria: 'reno-loss-event',
        completed: false,
      },
      {
        id: 'challenge-tcp-2',
        moduleId: 'tcp-congestion',
        title: 'Inspect BBR Bottleneck Pacing',
        description:
          'Observe BBR operating in PROBE_BW mode with high throughput while maintaining a near-empty router queue.',
        hint: 'Run the simulation for at least 15 cycles under BBR mode.',
        targetCriteria: 'bbr-probe-bw',
        completed: false,
      },
    ],
  },
  'http-race': {
    id: 'http-race',
    trackId: 'route',
    number: '03',
    title: 'HTTP/1.1 vs HTTP/2 vs HTTP/3',
    subtitle: 'The Protocol Race & Head-of-Line Blocking',
    tagline:
      'Simulate concurrent asset downloads over three protocol generations and inject packet drops to expose TCP Head-of-Line blocking.',
    accentColor: 'network',
    overview:
      'As web pages grew from simple text to hundreds of assets, browser networking evolved from multiple TCP connections (HTTP/1.1) to multiplexed TCP streams (HTTP/2) to UDP-based QUIC independent streams (HTTP/3).',
    concept:
      "HTTP/1.1 is limited by 6 concurrent TCP connections per domain, forcing sequential FIFO requests (Application HoL Blocking). HTTP/2 multiplexes streams onto a single TCP connection, but if one TCP packet drops, TCP's in-order delivery requirement stalls ALL streams until retransmission occurs (Transport HoL Blocking). HTTP/3 replaces TCP with QUIC over UDP, ensuring packet loss on Stream A never blocks independent Stream B.",
    architectureDetails: {
      components: [
        {
          name: 'HTTP/1.1 Lane',
          role: '6 Connection Pool',
          details:
            'Spawns 6 independent TCP sockets. Each socket can only send one request-response pair at a time.',
        },
        {
          name: 'HTTP/2 Lane',
          role: 'Single TCP Multiplexed',
          details:
            'Interleaves binary frames (HEADERS, DATA) with stream IDs over one reliable ordered TCP socket.',
        },
        {
          name: 'HTTP/3 Lane',
          role: 'QUIC over UDP',
          details:
            'Maintains independent cryptographic stream state. Packet loss is recovered per-stream without kernel-level byte-stream stalling.',
        },
      ],
    },
    keyTakeaway:
      'HTTP/2 is fantastic on clean fiber networks, but under 2-5% packet loss, HTTP/1.1 or HTTP/3 can often outperform HTTP/2 because a single dropped TCP segment freezes all multiplexed web assets.',
    challenges: [
      {
        id: 'challenge-http-1',
        moduleId: 'http-race',
        title: 'Expose TCP Head-of-Line Blocking',
        description:
          'Inject packet loss during an active download and verify that HTTP/2 stalls while HTTP/3 streams continue loading.',
        hint: 'Click "Simulate Packet Loss on Stream 2" while the race is underway.',
        targetCriteria: 'hol-blocking-demonstrated',
        completed: false,
      },
      {
        id: 'challenge-http-2',
        moduleId: 'http-race',
        title: 'Compare 0-RTT Connection Latency',
        description:
          'Notice how HTTP/3 initiates data delivery faster due to combined QUIC cryptographic and transport handshakes.',
        hint: 'Restart the race and observe the connection establishment phase in milliseconds.',
        targetCriteria: 'handshake-compared',
        completed: false,
      },
    ],
  },
  'lsm-tree': {
    id: 'lsm-tree',
    trackId: 'query',
    number: '04',
    title: 'LSM-Tree Simulator',
    subtitle: 'Storage Engines: RocksDB & Cassandra Architecture',
    tagline:
      'Observe writes flow from in-memory MemTables into immutable SSTables, and watch background compaction clean up tombstones.',
    accentColor: 'database',
    overview:
      'Log-Structured Merge-Trees transform random disk writes into high-throughput sequential appends, forming the core storage engine behind RocksDB, Cassandra, LevelDB, and TiKV.',
    concept:
      'Traditional B-trees perform in-place updates, causing random I/O that punishes magnetic disks and causes flash write exhaustion. An LSM-Tree accepts writes in memory (MemTable) backed by an append-only Write-Ahead Log (WAL). When MemTable hits capacity, it is flushed to disk as an immutable Sorted String Table (SSTable). Background compaction merges overlapping SSTables, cleans up tombstones, and resolves write/read amplification trade-offs.',
    architectureDetails: {
      components: [
        {
          name: 'Write-Ahead Log (WAL)',
          role: 'Crash Durability',
          details:
            'Sequential disk append that enables complete in-memory state reconstruction in the event of a sudden power loss.',
        },
        {
          name: 'Active MemTable',
          role: 'Fast In-Memory Writes',
          details:
            'A concurrent SkipList or Red-Black Tree keeping keys sorted in RAM for O(log N) insertions and fast range scans.',
        },
        {
          name: 'Immutable MemTable',
          role: 'Flush Staging',
          details:
            'Read-only snapshot of a full MemTable frozen while a background worker flushes its sorted contents to disk.',
        },
        {
          name: 'Level 0 (L0) SSTables',
          role: 'Flushed Disk Run',
          details:
            'Direct disk dump of MemTables. Keys can overlap between different L0 SSTables, requiring multi-table lookups.',
        },
        {
          name: 'Level 1 & L2 SSTables',
          role: 'Compacted Non-Overlapping Runs',
          details:
            'Consolidated sorted key ranges where each key exists at most once per level, minimizing read amplification.',
        },
        {
          name: 'Bloom Filter',
          role: 'Probabilistic Skip',
          details:
            'In-memory bit array per SSTable that definitively answers whether a key is NOT present, skipping useless disk reads.',
        },
      ],
    },
    keyTakeaway:
      'LSM-Trees optimize write throughput at the cost of read amplification (having to check MemTable and multiple SSTable levels) and space amplification (temporary duplication of stale records until compaction).',
    challenges: [
      {
        id: 'challenge-lsm-1',
        moduleId: 'lsm-tree',
        title: 'Trigger MemTable Disk Flush',
        description:
          'Insert enough key-value pairs to exceed the MemTable capacity threshold and create an L0 SSTable.',
        hint: 'Insert 4 or 5 keys until MemTable reaches 100% capacity and triggers a flush.',
        targetCriteria: 'memtable-flushed',
        completed: false,
      },
      {
        id: 'challenge-lsm-2',
        moduleId: 'lsm-tree',
        title: 'Clean Up Tombstones via Compaction',
        description:
          'Delete a key (generating a tombstone) and trigger manual compaction to merge L0 into L1 and eliminate the dead record.',
        hint: 'Delete an existing key, observe the tombstone entry, and click "Trigger Compaction".',
        targetCriteria: 'tombstone-compacted',
        completed: false,
      },
    ],
  },
  'bplus-tree': {
    id: 'bplus-tree',
    trackId: 'query',
    number: '05',
    title: 'B+ Tree Node Splitter',
    subtitle: 'Relational Indexing: PostgreSQL & MySQL InnoDB Engine',
    tagline:
      'Step through genuine B+ Tree node insertions, recursive parent promotions, node splits, and sequential leaf linked-list scans.',
    accentColor: 'database',
    overview:
      'The B+ Tree is the undisputed standard indexing structure for relational databases like PostgreSQL, MySQL (InnoDB), and SQLite, engineered specifically to minimize disk block reads.',
    concept:
      'Unlike standard binary search trees with high depth, a B+ Tree is a self-balancing M-way search tree with high fan-out (order 100-500 in practice), keeping tree height shallow (3-4 levels for millions of rows). Crucially, internal nodes store only routing separator keys and child pointers; all actual user records reside strictly in leaf nodes. Leaves are threaded together into a doubly linked list, enabling fast sequential range scans.',
    architectureDetails: {
      components: [
        {
          name: 'Root Node',
          role: 'Tree Entrypoint',
          details:
            'Directs lookups to appropriate child subtrees. When the root splits, tree height increments by 1.',
        },
        {
          name: 'Internal Routing Nodes',
          role: 'Separator Guides',
          details:
            'Hold up to M-1 keys acting as traffic guides: keys < K follow left pointer; keys >= K follow right pointer.',
        },
        {
          name: 'Leaf Nodes',
          role: 'Record Storage',
          details:
            'Contain sorted numerical keys and actual data pointers. Always remain at uniform depth from the root.',
        },
        {
          name: 'Leaf Linked List',
          role: 'Sequential Traversal',
          details:
            'Pointers connecting each leaf to its next sibling, turning range queries (WHERE id BETWEEN 10 AND 50) into linear scans without tree re-traversals.',
        },
      ],
    },
    keyTakeaway:
      'High branching factor means a B+ Tree can index 100 million rows with a depth of just 3 or 4, translating to at most 3 or 4 random disk page lookups per point query.',
    challenges: [
      {
        id: 'challenge-bplus-1',
        moduleId: 'bplus-tree',
        title: 'Force a Root Node Split',
        description:
          'Insert keys until an internal node and the root node both exceed capacity and split, increasing tree height.',
        hint: 'Insert several numbers (e.g. 10, 20, 30, 40, 50, 60, 70, 80) and observe the root splitting into two children with a new root.',
        targetCriteria: 'root-split-triggered',
        completed: false,
      },
      {
        id: 'challenge-bplus-2',
        moduleId: 'bplus-tree',
        title: 'Run a Range Scan Across Linked Leaves',
        description:
          'Perform a range query (e.g., 20 to 60) and observe the traversal jump directly between linked leaf nodes.',
        hint: 'Enter min=20, max=60 and click "Range Scan".',
        targetCriteria: 'range-scan-executed',
        completed: false,
      },
    ],
  },
  'acid-isolation': {
    id: 'acid-isolation',
    trackId: 'query',
    number: '06',
    title: 'ACID & Transaction Isolation Simulator',
    subtitle: 'Concurrency Anomalies & Isolation Levels',
    tagline:
      'Execute concurrent transactions step-by-step and witness Dirty Reads, Non-Repeatable Reads, Phantom Reads, and Write Skew.',
    accentColor: 'database',
    overview:
      'In high-concurrency systems, multiple clients read and write the same database records simultaneously. ACID transaction isolation levels dictate the precise boundary between performance and data corruption.',
    concept:
      'The ANSI SQL standard defines four isolation levels: Read Uncommitted (allows dirty reads of uncommitted changes), Read Committed (reads only committed data, but subject to non-repeatable reads), Repeatable Read (guarantees consistent snapshot reads within a transaction), and Serializable (strict serial ordering or serialization conflict aborts). Modern databases implement these via either Two-Phase Locking (2PL) or Multi-Version Concurrency Control (MVCC).',
    architectureDetails: {
      components: [
        {
          name: 'Transaction A (T1)',
          role: 'Concurrent Client 1',
          details:
            'Executes financial balance adjustments or stock inventory reads and updates with isolated transaction state.',
        },
        {
          name: 'Transaction B (T2)',
          role: 'Concurrent Client 2',
          details: 'Executes overlapping read/write queries on the identical shared rows.',
        },
        {
          name: 'Shared Table Engine',
          role: 'Data & Lock Manager',
          details:
            'Maintains row data, active lock states (Shared S-locks for reads, Exclusive X-locks for writes), and MVCC version tuples.',
        },
        {
          name: 'MVCC Snapshot Engine',
          role: 'Version Tracking',
          details:
            'Tags records with creation txid (xmin) and deletion txid (xmax), enabling transactions to read older snapshots without read locks.',
        },
      ],
    },
    keyTakeaway:
      'Repeatable Read prevents non-repeatable reads, but under classic Snapshot Isolation (like in PostgreSQL or MySQL), it can still allow "Write Skew" anomalies where two transactions satisfy local preconditions but violate global constraints.',
    challenges: [
      {
        id: 'challenge-acid-1',
        moduleId: 'acid-isolation',
        title: 'Reproduce a Dirty Read',
        description:
          "Select Read Uncommitted, execute T1's uncommitted write, and have T2 read the uncommitted row before T1 rolls back.",
        hint: 'Select the "Dirty Read" scenario and execute steps 1, 2, 3 in sequence.',
        targetCriteria: 'dirty-read-observed',
        completed: false,
      },
      {
        id: 'challenge-acid-2',
        moduleId: 'acid-isolation',
        title: 'Prevent Non-Repeatable Read',
        description:
          'Switch isolation level from Read Committed to Repeatable Read to ensure T1 reads the identical value across queries.',
        hint: 'Choose "Non-Repeatable Read" scenario and switch isolation dropdown to "Repeatable Read".',
        targetCriteria: 'non-repeatable-prevented',
        completed: false,
      },
    ],
  },
  'pid-control-loop': {
    id: 'pid-control-loop',
    trackId: 'actuate',
    number: '07',
    title: 'Closed-Loop PID Control & Actuation',
    subtitle: 'Feedback Dynamics, Gain Tuning & Disturbance Rejection',
    tagline:
      'Tune proportional, integral, and derivative gains to drive physical robotic joints to setpoint targets while counteracting real-time load disturbances.',
    accentColor: 'robotics',
    overview:
      'In robotics and physical AI, actuators (servos, brushless motors, hydraulic joints) cannot achieve precise position or velocity via open-loop commands. Real-world friction, payload mass, and inertia require closed-loop feedback control.',
    concept:
      'A PID (Proportional-Integral-Derivative) controller computes an error value e(t) as the difference between a desired setpoint SP(t) and measured process variable PV(t). The control output u(t) = K_p·e(t) + K_i·∫e(τ)dτ + K_d·(de(t)/dt) balances immediate responsiveness (P), steady-state offset elimination (I), and damping against rapid oscillations (D). Poorly tuned loops lead to catastrophic overshoot, mechanical ringing, or sluggish response.',
    architectureDetails: {
      components: [
        {
          name: 'Setpoint Generator (SP)',
          role: 'Reference Command',
          details:
            'Defines the desired physical target (e.g., joint angle in degrees or linear position in mm).',
        },
        {
          name: 'Error Detector (Δ)',
          role: 'Comparator',
          details:
            'Continuously computes error delta e(t) = SP(t) - PV(t) at high loop rates (e.g. 1 kHz).',
        },
        {
          name: 'Proportional Term (Kp)',
          role: 'Immediate Restorative Force',
          details:
            'Multiplies error directly. Higher Kp increases rise speed but increases overshoot and reduces stability margins.',
        },
        {
          name: 'Integral Term (Ki)',
          role: 'Steady-State Bias Corrector',
          details:
            'Accumulates past errors over time ∫e(τ)dτ, eliminating steady-state offset caused by gravity or viscous friction.',
        },
        {
          name: 'Derivative Term (Kd)',
          role: 'Predictive Damping',
          details:
            'Assesses error rate of change de(t)/dt, counteracting aggressive motion to dampen oscillations before setpoint arrival.',
        },
        {
          name: 'Disturbance / Load Injector',
          role: 'External Dynamics',
          details:
            'Simulates external forces (wind gusts, varying payload mass, mechanical friction) acting against the motor shaft.',
        },
        {
          name: 'Plant / Actuator (Motor)',
          role: 'Physical Dynamics',
          details:
            'Models second-order mechanical system with inertia J, damping b, and torque saturation limits.',
        },
        {
          name: 'Sensor Feedback (Encoder/IMU)',
          role: 'Measurement Filter',
          details:
            'Measures shaft angle, introducing discretization and sensor noise into the closed feedback loop.',
        },
      ],
    },
    keyTakeaway:
      'Tuning PID is a delicate balance of control theory: Kp provides responsiveness, Ki eradicates steady-state droop, and Kd dampens overshoot. In physical systems, anti-windup clamping on the integral accumulator is vital to prevent severe overshoot when actuators hit saturation limits.',
    challenges: [
      {
        id: 'challenge-pid-1',
        moduleId: 'pid-control-loop',
        title: 'Sub-15% Overshoot Tuning',
        description:
          'Tune Kp, Ki, and Kd feedback gains to drive the robot arm to setpoint with <15% peak overshoot while eliminating steady-state error (<1%).',
        hint: 'Increase Kp to ~3.5-4.5 for fast rise, add Kd to ~1.2-2.0 to dampen the overshoot curve, and set Ki to ~0.5-1.5 to wipe out steady-state error.',
        targetCriteria: 'pid-overshoot-under-15',
        completed: false,
      },
      {
        id: 'challenge-pid-2',
        moduleId: 'pid-control-loop',
        title: 'Disturbance Rejection',
        description:
          'Inject an external 40N load disturbance and verify that the integral accumulator recovers to the setpoint within 1.5 seconds.',
        hint: 'Ensure Ki is >= 1.0 so the error accumulator generates enough corrective torque when the external load hits.',
        targetCriteria: 'pid-disturbance-recovery',
        completed: false,
      },
    ],
  },
  'ros2-teleoperation': {
    id: 'ros2-teleoperation',
    trackId: 'actuate',
    number: '08',
    title: 'ROS 2 & Zenoh Teleoperation',
    subtitle: 'Pub/Sub Determinism, DDS/Zenoh QoS & Teleop Latency',
    tagline:
      'Simulate distributed robotics node graphs under real-world packet drops, jitter, and QoS policy mismatches between operator teleop and robot actuators.',
    accentColor: 'robotics',
    overview:
      'Modern robotic systems (humanoids, autonomous mobile robots, surgical arms) rely on ROS 2 and Zenoh for distributed publish-subscribe communications. Teleoperating robots across lossy wireless links introduces latency, packet drops, and bufferbloat that threaten physical stability.',
    concept:
      'ROS 2 utilizes DDS (Data Distribution Service) and Zenoh middleware with Quality of Service (QoS) contracts. While reliable TCP-like streams (RELIABLE QoS) guarantee packet arrival through retransmissions, they cause disastrous head-of-line bufferbloat in teleoperation: stale velocity commands (cmd_vel) queue up and execute seconds late. Best-effort (BEST_EFFORT QoS with KEEP_LAST depth=1) or Zenoh loss-tolerant pub-sub discards dropped frames and always applies the freshest control command, preventing robot runaway.',
    architectureDetails: {
      components: [
        {
          name: 'Operator Teleop Node',
          role: 'Command Publisher',
          details:
            'Captures joystick/gamepad inputs and publishes geometry_msgs/Twist (cmd_vel) at 50-100 Hz.',
        },
        {
          name: 'Zenoh Router / DDS Middleware',
          role: 'Transport Broker & QoS Arbiter',
          details:
            'Negotiates Reliability, Durability, and History contracts between publisher and subscriber sockets.',
        },
        {
          name: 'Wireless Link Medium',
          role: 'Channel Degradation',
          details:
            'Imposes variable RTT latency, packet jitter, and random packet loss (0% to 25%).',
        },
        {
          name: 'Robot Executor Node',
          role: 'Command Dispatcher',
          details:
            'Receives incoming cmd_vel messages, enforces deadline monitors, and controls motor drivers.',
        },
        {
          name: 'Robot Arm Actuator',
          role: 'Physical Kinematics',
          details:
            'Translates velocity vectors into joint trajectories; halts on watchdog timeout if packets stall.',
        },
        {
          name: 'Telemetry & Video Node',
          role: 'Feedback Publisher',
          details:
            'Publishes joint states, odometry (/odom), and compressed camera feeds back to the operator dashboard.',
        },
      ],
    },
    keyTakeaway:
      'In high-rate closed-loop robotics, timeliness beats completeness. When network loss exceeds 10%, Reliable QoS queues outdated commands and causes delayed erratic movements. Best Effort QoS combined with shallow queue depths (KEEP_LAST, depth=1) guarantees deterministic sub-30ms responsiveness.',
    challenges: [
      {
        id: 'challenge-ros2-1',
        moduleId: 'ros2-teleoperation',
        title: 'Loss-Tolerant QoS Configuration',
        description:
          'Maintain responsive robot teleoperation control while wireless packet drop exceeds 15% by switching from Reliable QoS to Best Effort or Zenoh profile.',
        hint: 'Under Reliable QoS, packet loss > 15% balloons bufferbloat. Switch QoS Mode to "Best Effort" or "Zenoh Stream" to drop stale commands.',
        targetCriteria: 'ros2-qos-loss-resilient',
        completed: false,
      },
      {
        id: 'challenge-ros2-2',
        moduleId: 'ros2-teleoperation',
        title: 'Eliminate Teleop Bufferbloat',
        description:
          'Reduce teleoperation queue latency below 30ms during high network jitter by tuning queue depth and transport protocol.',
        hint: 'Set history depth to KEEP_LAST(1) and engage Best Effort mode.',
        targetCriteria: 'ros2-bufferbloat-eliminated',
        completed: false,
      },
    ],
  },
  'inverse-kinematics': {
    id: 'inverse-kinematics',
    trackId: 'actuate',
    number: '09',
    title: 'Inverse Kinematics & Jacobian Control',
    subtitle: 'Manipulability Ellipsoids, Singularity Avoidance & DLS',
    tagline:
      'Resolve Cartesian target coordinates into joint angle trajectories using Analytical & Damped Least Squares Jacobian solvers without actuator velocity explosions.',
    accentColor: 'robotics',
    overview:
      'In physical AI and robotic manipulation, high-level task planners specify end-effector coordinates in 3D Cartesian space (X, Y, Z, roll, pitch, yaw). Inverse Kinematics (IK) translates these target coordinates into actuator joint angle positions (θ₁, θ₂, θ₃).',
    concept:
      'Forward kinematics is uniquely determined via trigonometric link geometry, but inverse kinematics is non-linear and multi-modal. Near kinematic singularities (where arm is outstretched or folded), the Jacobian determinant det(J) approaches zero, causing the raw Moore-Penrose pseudoinverse J† to demand infinite joint velocities. Damped Least Squares (DLS, Levenberg-Marquardt) introduces a damping parameter λ²·I that guarantees bounded joint speeds and numerical stability through singular regions.',
    architectureDetails: {
      components: [
        {
          name: 'Cartesian Target Planner',
          role: 'Task Reference',
          details:
            'Outputs target end-effector coordinates (X, Y, Z) and desired orientation angles.',
        },
        {
          name: 'Forward Kinematics Engine (FK)',
          role: 'Geometry Evaluator',
          details:
            'Computes current end-effector position using Denavit-Hartenberg (D-H) link rotation matrices.',
        },
        {
          name: 'Jacobian Matrix Calculator J(θ)',
          role: 'Velocity Sensitivity Matrix',
          details:
            'Computes partial derivatives of Cartesian position with respect to each joint angle: dx/dt = J(θ)·dθ/dt.',
        },
        {
          name: 'Damped Least Squares (DLS) Solver',
          role: 'Singularity-Robust Inversion',
          details:
            'Solves Δθ = J^T·(J·J^T + λ²·I)⁻¹·Δx to prevent joint velocity blowup near singular boundaries.',
        },
        {
          name: 'Manipulability Monitor',
          role: 'Kinematic Metric',
          details:
            'Calculates Yoshikawa index w = √(det(J·J^T)) and condition number κ(J) to alert when degrees of freedom are lost.',
        },
        {
          name: 'Joint Limit & Velocity Clamping',
          role: 'Physical Safety Shield',
          details:
            'Enforces hard mechanical joint limits and rate limiters before sending setpoints to actuator servo controllers.',
        },
      ],
    },
    keyTakeaway:
      'Kinematic singularities occur when robot joints line up, causing the loss of one or more degrees of freedom. Raw pseudoinverse solvers blow up near singularities. Damped Least Squares (DLS) is essential for physical robots to glide smoothly through singular postures without tripping motor overcurrent faults.',
    challenges: [
      {
        id: 'challenge-ik-1',
        moduleId: 'inverse-kinematics',
        title: 'Precision End-Effector Positioning',
        description:
          'Drag or position the target coordinate to (X ≥ 170, Y ≥ 100) and converge with an end-effector error < 2.0 mm.',
        hint: 'Use Damped Least Squares (DLS) and click the Tabletop preset to reach the target accurately.',
        targetCriteria: 'ik-target-converged',
        completed: false,
      },
      {
        id: 'challenge-ik-2',
        moduleId: 'inverse-kinematics',
        title: 'Singularity Recovery via DLS Damping',
        description:
          'Enter a near-boundary kinematic singularity (Manipulability < 450) and engage Damped Least Squares with λ ≥ 0.15 to prevent joint velocity blowup.',
        hint: 'Click "Boundary Singularity" and increase the damping slider λ above 0.15.',
        targetCriteria: 'ik-dls-singularity-managed',
        completed: false,
      },
    ],
  },
  'foc-motor-control': {
    id: 'foc-motor-control',
    trackId: 'actuate',
    number: '10',
    title: 'Field-Oriented Control & SVPWM',
    subtitle: 'Vector Commutation, Clarke/Park Transforms & 3-Phase Inverter',
    tagline:
      'Decouple magnetic flux from electromagnetic torque using Clarke & Park transforms to drive robotic PMSM actuators at peak efficiency.',
    accentColor: 'robotics',
    overview:
      'Brushed DC motors mechanically commutate via brushes and commutator segments, causing friction, sparks, and wear. Brushless PMSM and BLDC motors achieve high power density and longevity by electronically commutating three-phase stator windings. Field-Oriented Control (FOC) is the gold standard for high-performance robotics.',
    concept:
      'FOC transforms three-phase stationary currents (Ia, Ib, Ic) into a stationary orthogonal frame (Iα, Iβ) via Clarke Transform, and then rotates them into the rotor reference frame (Id, Iq) via Park Transform using high-resolution encoder feedback (θ_e). Direct current (Id) controls magnetic flux along the rotor pole, while Quadrature current (Iq) directly dictates mechanical torque (τ = 1.5 * p * λ_m * Iq). Space Vector PWM (SVPWM) calculates optimal switching sequences across 6 inverter sectors, providing 15.5% higher DC-bus voltage utilization than sinusoidal PWM.',
    architectureDetails: {
      components: [
        {
          name: 'Optical / Magnetic Encoder (19-bit)',
          role: 'Rotor Angle Measurement',
          details:
            'Supplies sub-milliradian absolute rotor position θ_e for synchronous Clarke/Park reference frame rotation.',
        },
        {
          name: 'Clarke Transform (abc ➔ αβ)',
          role: 'Stationary Coordinate Reduction',
          details:
            'Converts 3-phase currents into 2-phase orthogonal vectors: Iα = Ia, Iβ = (Ia + 2Ib)/√3.',
        },
        {
          name: 'Park Transform (αβ ➔ dq)',
          role: 'Rotating Frame Alignment',
          details:
            'Projects orthogonal currents onto the rotor magnetic axis: Id = Iα·cos(θ) + Iβ·sin(θ), Iq = -Iα·sin(θ) + Iβ·cos(θ).',
        },
        {
          name: 'Dual PI Current Regulators',
          role: 'Current Loop Control',
          details:
            'Executes high-speed PI loops (typically at 20-50 kHz) to drive Id to 0 (or negative in field-weakening) and Iq to target torque.',
        },
        {
          name: 'Inverse Park Transform (dq ➔ αβ)',
          role: 'Voltage Stator Reconstruction',
          details:
            'Translates reference voltage commands Vd*, Vq* back to the stationary stator coordinate system Vα, Vβ.',
        },
        {
          name: 'Space Vector PWM (SVPWM) Modulator',
          role: 'Hexagon Switching Generation',
          details:
            'Selects active inverter voltage vectors (V1-V6) and zero vectors (V0, V7) to synthesize the rotating stator flux vector.',
        },
        {
          name: '3-Phase GaN / MOSFET H-Bridge Inverter',
          role: 'Power Stage',
          details:
            'High-frequency switching bridge applying pulse-width-modulated bus voltage to U, V, W motor windings.',
        },
      ],
    },
    keyTakeaway:
      'By decoupling torque generation (Iq) from magnetic flux alignment (Id), FOC eliminates torque ripple and maximizes motor torque per ampere (MTPA). In high-speed runs where Back-EMF approaches DC bus voltage, injecting negative Id (field weakening) opposes rotor permanent magnet flux to extend RPM beyond the base speed envelope.',
    challenges: [
      {
        id: 'challenge-foc-1',
        moduleId: 'foc-motor-control',
        title: 'Torque Commutation & Rotor Alignment',
        description:
          'Set Quadrature Current Iq ≥ 15 A while keeping Direct Current Id at 0 A to produce over 2.0 Nm of clean motor torque.',
        hint: 'Use the Iq slider to raise torque current, and observe the space vector voltage hexagon track smoothly.',
        targetCriteria: 'foc-torque-target-achieved',
        completed: false,
      },
      {
        id: 'challenge-foc-2',
        moduleId: 'foc-motor-control',
        title: 'Field-Weakening High-Speed Sprint',
        description:
          'Inject negative direct current (Id ≤ -3 A) to engage field weakening and achieve motor RPM > 3000 under DC bus voltage constraints.',
        hint: 'Adjust Id below -3 A to weaken rotor magnet Back-EMF and observe the field-weakening badge illuminate.',
        targetCriteria: 'foc-field-weakening-engaged',
        completed: false,
      },
    ],
  },
  'uvm-verification': {
    id: 'uvm-verification',
    trackId: 'silicon',
    number: '11',
    title: 'UVM & Cocotb Hardware Verification',
    subtitle: 'Constrained-Random Testbench & Functional Coverage',
    tagline:
      'Step through the classical verification harness: Sequence Item Generator ➔ Driver ➔ DUT (32-bit ALU) ➔ Monitor ➔ Scoreboard, and catch elusive corner-case bugs.',
    accentColor: 'silicon',
    overview:
      'Modern microprocessors and AI accelerators (ASICs and SoCs) cost tens of millions of dollars to fabricate. Design Verification (DV) using UVM (Universal Verification Methodology) and Cocotb ensures zero hardware bugs make it to silicon tapeout.',
    concept:
      'Directed test cases only verify what human verification engineers anticipate. UVM uses constrained-random stimulus generation (uvm_sequence) to bombard the Device Under Test (DUT) with pseudo-random operands while strictly checking results against a software reference model in the Scoreboard. Functional Coverage metrics (covergroups and coverpoints) quantitatively measure which architectural states, arithmetic overflows, and register boundary conditions have been stimulated.',
    architectureDetails: {
      components: [
        {
          name: 'Sequence Item Generator (uvm_sequence)',
          role: 'Constrained-Random Stimulus',
          details:
            'Generates randomized transaction items (opcodes, 32-bit operands) obeying constraints and biasing toward corner cases.',
        },
        {
          name: 'UVM Driver (uvm_driver)',
          role: 'Pin-Level Protocol Adapter',
          details:
            'Translates abstract transaction items into cycle-accurate physical bus signals (clk, rst_n, valid, alu_op, operand_a, operand_b).',
        },
        {
          name: 'Device Under Test (DUT / 32-bit ALU)',
          role: 'Hardware Silicon Logic',
          details:
            'Synthesizable RTL block executing arithmetic, bitwise logic, barrel shifts, and setting status flags (carry, zero, negative, signed overflow).',
        },
        {
          name: 'UVM Monitor (uvm_monitor)',
          role: 'Passive Interface Listener',
          details:
            'Non-intrusively samples bus signals on clock edges, packetizes responses, and broadcasts via TLM analysis ports.',
        },
        {
          name: 'Golden Reference Scoreboard (uvm_scoreboard)',
          role: 'Assertion & Correctness Checker',
          details:
            'Computes mathematical golden truth in Python/C++ and raises assertions upon any bit-level discrepancy with the DUT.',
        },
        {
          name: 'Functional Coverage Collector (uvm_subscriber)',
          role: 'Verification Completeness Gauge',
          details:
            'Tracks hit bins across opcodes, arithmetic saturation, maximum signed values (0x7FFFFFFF), minimum negative values (0x80000000), and overflow flags.',
        },
      ],
    },
    keyTakeaway:
      '100% code line coverage does not mean hardware is bug-free; only functional coverage verifies that every boundary state and cross-product has been exercised. A single unhandled corner-case overflow in a 32-bit ALU can compromise an entire processor architecture.',
    challenges: [
      {
        id: 'challenge-uvm-1',
        moduleId: 'uvm-verification',
        title: 'Expose 32-Bit ALU Corner-Case Bug',
        description:
          'Modify the stimulus generator from uniform random to constrained corner-case mode to reach 100% functional coverage and catch the unhandled overflow bug.',
        hint: 'Click "Constrained Corner-Cases" stimulus mode and run cycles until 100% coverage is achieved and the scoreboard assertion fails on signed overflow.',
        targetCriteria: 'uvm-100-coverage-overflow',
        completed: false,
      },
      {
        id: 'challenge-uvm-2',
        moduleId: 'uvm-verification',
        title: 'Scoreboard Assertion Verification',
        description:
          'Step clock cycles to observe the scoreboard compare DUT output against the golden model and successfully log assertion PASS/FAIL results.',
        hint: 'Execute at least 10 clock cycles with active transaction comparisons.',
        targetCriteria: 'uvm-scoreboard-assertion-caught',
        completed: false,
      },
    ],
  },
  'pre-silicon-emulation': {
    id: 'pre-silicon-emulation',
    trackId: 'silicon',
    number: '12',
    title: 'Pre-Silicon Emulation & CDC',
    subtitle: 'Clock Domain Crossing, Metastability & Dual-Clock FIFO',
    tagline:
      'Tame asynchronous timing hazards across gigahertz AI accelerator cores and memory buses: inspect 2-FF synchronizers, Gray codes, and prevent metastability.',
    accentColor: 'silicon',
    overview:
      'Modern System-on-Chips (SoCs) integrate heterogeneous IPs operating on completely asynchronous clock frequencies (e.g. 1 GHz AI neural engine crossing into 400 MHz LPDDR5 memory controller). Transferring data across asynchronous clock domains is the leading cause of intermittent silicon failures.',
    concept:
      'When a digital signal transitions during a destination flip-flop setup or hold timing window (t_setup / t_hold aperture), the bistable latch enters metastability: an indeterminate voltage between V_DD and GND that oscillates before settling randomly. A 2-Flip-Flop (2-FF) synchronizer provides a settling cycle for 1-bit control signals, dramatically increasing Mean Time Between Failures (MTBF). For multi-bit data buses, a Dual-Clock Asynchronous FIFO with Gray-coded pointers (where only one bit changes per count) prevents catastrophic multi-bit skew and race conditions.',
    architectureDetails: {
      components: [
        {
          name: 'Domain A Transmitter (1 GHz)',
          role: 'High-Speed Fast Clock IP',
          details: 'AI neural accelerator core producing high-throughput data words every 1.0 ns.',
        },
        {
          name: 'Dual-Clock Asynchronous FIFO',
          role: 'CDC Isolation Buffer',
          details:
            'Dual-port SRAM with independent write clock (clk_a) and read clock (clk_b), isolating fast burst traffic from slower consumers.',
        },
        {
          name: 'Gray-Code Pointer Logic',
          role: 'Single-Bit Skew Prevention',
          details:
            'Converts binary read/write pointers into Gray code before crossing clock domains so multi-bit bus skew cannot cause erroneous pointer jumps.',
        },
        {
          name: '2-Stage Flip-Flop Synchronizer',
          role: 'Metastability Attenuation',
          details:
            'Cascaded flip-flops clocked by destination clock that give metastable intermediate voltages a full clock period to resolve.',
        },
        {
          name: 'Domain B Receiver (400 MHz)',
          role: 'Slow Clock IP',
          details: 'Memory bus controller reading synchronized words at 2.5 ns clock intervals.',
        },
        {
          name: 'Static Timing & Hazard Monitor',
          role: 'CDC Rule Checker',
          details:
            'Detects setup/hold window intrusions, MTBF degradation, and FIFO overflow/underflow conditions.',
        },
      ],
    },
    keyTakeaway:
      'Never synchronize multi-bit data buses using individual 2-FF synchronizers: differential trace delays will cause bits to arrive in different clock cycles, corrupting the data word. Always use an Asynchronous FIFO with Gray-coded pointers to cross multi-bit data safely.',
    challenges: [
      {
        id: 'challenge-cdc-1',
        moduleId: 'pre-silicon-emulation',
        title: 'Eliminate Burst Metastability',
        description:
          'Size the dual-clock asynchronous FIFO correctly and enable Gray coding to transfer burst traffic without a single CDC violation.',
        hint: 'Increase FIFO depth to 8 or 16 entries and select the Asynchronous FIFO synchronizer mode before initiating burst data transfer.',
        targetCriteria: 'cdc-fifo-sized-no-metastability',
        completed: false,
      },
      {
        id: 'challenge-cdc-2',
        moduleId: 'pre-silicon-emulation',
        title: 'Trigger & Mitigate CDC Timing Hazard',
        description:
          'Observe a metastability timing violation on an unsynchronized line, then switch to a 2-FF or Async FIFO to restore MTBF reliability.',
        hint: 'Click "Inject Setup/Hold Hazard" under No Synchronizer mode to observe metastability, then engage the 2-FF Synchronizer.',
        targetCriteria: 'cdc-hazard-mitigated',
        completed: false,
      },
    ],
  },
  'riscv-pipeline': {
    id: 'riscv-pipeline',
    trackId: 'silicon',
    number: '13',
    title: 'RISC-V 5-Stage Pipelined Processor',
    subtitle: 'Instruction Parallelism, Hazard Unit & Data Forwarding',
    tagline:
      'Step through IF, ID, EX, MEM, and WB stages to witness how modern hardware hazard units eliminate pipeline stalls and resolve data hazards.',
    accentColor: 'silicon',
    overview:
      'Single-cycle processors are limited by the slowest instruction path (load word), leading to abysmal clock frequencies. Pipelining breaks instruction execution into discrete clock stages (IF, ID, EX, MEM, WB), dramatically increasing processor throughput and instruction-level parallelism (ILP).',
    concept:
      'Pipelining introduces structural, data (Read-After-Write), and control (branch) hazards. Without mitigation, a dependent instruction must wait up to 3 cycles for its operand to be written back to the register file. Modern processors solve this with Hardware Forwarding (bypassing the ALU result directly from EX or MEM stage into the EX stage input multiplexers) and Load-Use Hazard Detection (inserting a single hardware bubble stall when an instruction consumes data immediately loaded from memory).',
    architectureDetails: {
      components: [
        {
          name: 'IF: Instruction Fetch',
          role: 'Program Counter & I-Cache',
          details:
            'Fetches 32-bit RISC-V instruction from memory address pointed to by PC, then increments PC = PC + 4 (or updates on branch target).',
        },
        {
          name: 'ID: Instruction Decode & Register Read',
          role: 'Decoder & Dual-Port Regfile',
          details:
            'Decodes opcode, extracts source register identifiers (rs1, rs2) and destination (rd), sign-extends immediates, and reads register values.',
        },
        {
          name: 'EX: Execute / ALU & Address Calc',
          role: 'Arithmetic & Branch Computation',
          details:
            'Performs ALU operations (ADD, SUB, SLT, AND, OR), computes effective memory address for loads/stores, and evaluates branch conditions.',
        },
        {
          name: 'MEM: Data Memory Access',
          role: 'Load & Store Execution',
          details:
            'Reads word from Data Memory on LW instruction, or writes word to Data Memory on SW instruction. Bypasses for ALU instructions.',
        },
        {
          name: 'WB: Register Writeback',
          role: 'Architectural State Commit',
          details:
            'Writes the final result (ALU output or memory read data) back to destination register rd in the register file.',
        },
        {
          name: 'Hazard & Forwarding Unit',
          role: 'Data Dependency Bypasser',
          details:
            'Compares destination registers (EX.rd, MEM.rd) with source registers (ID.rs1, ID.rs2) to drive forwarding multiplexers and stall bubbles.',
        },
      ],
    },
    keyTakeaway:
      'Data forwarding eliminates stall cycles for ALU-to-ALU dependencies. However, for a Load instruction immediately followed by a dependent instruction (Load-Use hazard), the data is not available until the end of MEM stage, requiring mandatory hardware bubble insertion (1 cycle stall). Branch prediction flushes speculatively fetched instructions when a branch is taken.',
    challenges: [
      {
        id: 'challenge-riscv-1',
        moduleId: 'riscv-pipeline',
        title: 'Bypass RAW Data Hazard via Forwarding',
        description:
          'Step the pipeline through dependent ALU instructions and observe the EX-to-EX or MEM-to-EX forwarding unit supply operands without inserting a stall.',
        hint: 'Select the "Data Hazard & Bypassing" preset and step clock cycles to watch the forwarding arrows activate.',
        targetCriteria: 'riscv-forwarding-observed',
        completed: false,
      },
      {
        id: 'challenge-riscv-2',
        moduleId: 'riscv-pipeline',
        title: 'Load-Use Bubble Insertion & Stall',
        description:
          'Execute a Load-Word instruction followed immediately by an ALU consumer to observe the hazard unit inject an instruction bubble into EX stage.',
        hint: 'Select the "Load-Use Hazard Stall" preset and step to cycle 4 to observe the hardware pipeline bubble.',
        targetCriteria: 'riscv-load-use-bubble-inserted',
        completed: false,
      },
    ],
  },
  'napkin-math': {
    id: 'napkin-math',
    trackId: 'route',
    number: '04',
    title: 'Napkin Math Capacity Planning',
    subtitle: 'From Product Idea to Servers, Bandwidth & Storage',
    tagline:
      'Turn user actions and DAU into precise orders of magnitude: calculate QPS, server tier counts, replication terabytes, and cache memory on a napkin.',
    accentColor: 'network',
    overview:
      'Before writing architecture blueprints or choosing database technologies, every systems architect and principal engineer starts with napkin math: estimating the order of magnitude to determine whether a service needs one server or a thousand.',
    concept:
      'Napkin math trades decimal precision for speed and intuition. By rounding a day to 100,000 seconds (86,400s actual) and remembering that 1M requests/day ≈ 12 req/s, you can calculate average QPS, size for a 2-3x evening peak, budget web tier servers with 30% failure headroom, size replicated durable storage across years, and budget Redis cache RAM in minutes.',
    architectureDetails: {
      components: [
        {
          name: 'User Client Pool',
          role: 'Traffic Generator',
          details: '10M Daily Active Users generating 20 requests/day = 200M requests/day.',
        },
        {
          name: 'Load Balancer Tier',
          role: 'Traffic Distribution',
          details: 'Distributes incoming peak 7,000 QPS across active web compute instances.',
        },
        {
          name: 'Web Server Fleet',
          role: 'Compute Tier',
          details:
            '10 stateless nodes, each serving ~700-1,000 req/s at ~70% load with N+2 redundancy.',
        },
        {
          name: 'In-Memory Cache (Redis)',
          role: 'Hot Data Layer',
          details:
            "21 GB RAM holding hot user profile metadata (20 GB) and today's new photos (1 GB).",
        },
        {
          name: 'Object Store / DB',
          role: 'Durable Storage',
          details:
            '2 TB daily write ingest, compounding to 730 TB/year raw and ~2.2 PB with 3x replication.',
        },
        {
          name: 'CDN Edge Network',
          role: 'Egress Offload',
          details:
            'Serves 200 TB/day viewing egress (~16 Gbit/s), keeping heavy photo streams off the web servers.',
        },
      ],
    },
    keyTakeaway:
      'Always size for the 2–3× peak, never the daily average. Requests per second come and go, but storage grows every day and never resets. Media apps hit bandwidth limits before CPU limits.',
    challenges: [
      {
        id: 'challenge-napkin-1',
        moduleId: 'napkin-math',
        title: 'Size for Peak Traffic Spikes',
        description:
          'Use the What-If capacity sliders to size PhotoShare for 25M daily users and find the required web tier server count with 30% headroom.',
        hint: 'Drag the DAU slider to 25M and inspect the calculated server fleet count.',
        targetCriteria: 'napkin-sized-25m-users',
        completed: false,
      },
      {
        id: 'challenge-napkin-2',
        moduleId: 'napkin-math',
        title: 'Fit Hot Metadata in RAM',
        description:
          'Observe the hot cache memory calculation across profile size and photo uploads to ensure working set fits in a 64 GB Redis node.',
        hint: 'Step through to Step 7 (Cache Size) and inspect the RAM breakdown.',
        targetCriteria: 'napkin-ram-cache-sized',
        completed: false,
      },
    ],
  },
  'actuator-structure': {
    id: 'actuator-structure',
    trackId: 'actuate',
    number: '10b',
    title: 'Actuator Anatomy & Gearing',
    subtitle: 'Harmonic Reducers, Cycloidal Drives & Rotor-Stator Flux Cascade',
    tagline:
      'Inspect robotic joint physics: exploded CAD assembly, zero-backlash strain wave gears, cycloidal pins, and power loss cascades.',
    accentColor: 'robotics',
    overview:
      'Modern humanoid and robotic arm actuators pack brushless frameless motors, zero-backlash high-ratio gear reducers, dual absolute encoders, and integrated GaN inverter electronics into a compact joint unit.',
    concept:
      'Robotic joints require tremendous torque density and zero backlash for dynamic stability. Harmonic drive reducers utilize an elliptical wave generator flexing a thin cup against a circular spline to achieve 50:1 to 160:1 ratios with zero backlash. Cycloidal drives use rolling pin discs for extreme shock load resistance. Power flows from the battery bus through the inverter, copper stator coils, magnetic air gap, and mechanical gearing, with losses quantified at each stage.',
    architectureDetails: {
      components: [
        {
          name: 'CNC 7075-T6 Housing',
          role: 'Rigid Structural Shell',
          details:
            'Anodized aircraft aluminum housing dissipating motor stator Joule heating with ±5µm bearing bore concentricity.',
        },
        {
          name: 'Frameless BLDC / PMSM Motor',
          role: 'Electromagnetic Torque Generator',
          details:
            'High-pole-pair permanent magnet rotor with 0.5mm air gap and stator windings generating electromagnetic torque.',
        },
        {
          name: 'Harmonic / Cycloidal Reducer',
          role: 'Torque Multiplier & Speed Reducer',
          details:
            'Strain wave flexspline or cycloidal disc multiplying motor torque by 50:1–160:1 with near-zero angular backlash.',
        },
        {
          name: 'Dual Absolute Encoders',
          role: 'Rotor & Joint Angle Feedback',
          details:
            '19-bit optical/magnetic encoders measuring high-speed motor rotor angle for FOC commutation and output link position.',
        },
        {
          name: 'Integrated FOC Inverter PCB',
          role: 'Motor Commutation & Control',
          details:
            'High-frequency GaN FET H-bridge switching up to 50 kHz with onboard current shunts and real-time DSP.',
        },
      ],
    },
    keyTakeaway:
      'Gearing reduces required motor torque by ratio N but increases reflected inertia by N^2. In dynamic robotics, choosing between low-ratio quasi-direct drive (QDD) and high-ratio harmonic drives dictates transparency and impact survivability.',
    challenges: [
      {
        id: 'challenge-actuator-1',
        moduleId: 'actuator-structure',
        title: 'Inspect Gearmesh Backlash',
        description:
          'Switch between Harmonic Drive and Cycloidal Drive modes to observe the tooth contact mechanics.',
        hint: 'Use the Transmission mode tab to inspect harmonic flexspline tooth engagement.',
        targetCriteria: 'actuator-transmission-inspected',
        completed: false,
      },
    ],
  },
  'silicon-structure': {
    id: 'silicon-structure',
    trackId: 'silicon',
    number: '13b',
    title: 'Silicon Structure & Die Layout',
    subtitle: 'Wafer Floorplanning, Metal Interconnect Stack & GAA Transistors',
    tagline:
      'Examine semiconductor physics from 300mm wafer reticles down to 14-layer copper interconnects and Gate-All-Around (GAA) nanosheets.',
    accentColor: 'silicon',
    overview:
      'Modern microprocessors and AI accelerators are monolithic marvels containing tens of billions of transistors etched into silicon, organized across hierarchically scaled metal interconnect layers.',
    concept:
      'Modern VLSI dies balance compute tiles, SRAM caches, clock distribution networks, and high-speed SerDes I/O. Interconnect layers scale from tight pitch M1-M4 local routing up to thick M12-M14 global power distribution planes (VDD/VSS). At the physical device level, Gate-All-Around (GAA) nanosheet transistors wrap gate dielectric completely around silicon channels to eliminate sub-threshold leakage at sub-3nm nodes.',
    architectureDetails: {
      components: [
        {
          name: 'Systolic AI Tensor Array',
          role: 'Matrix Multiplication Compute',
          details:
            'High-throughput systolic tile running BF16/INT8 operations at 1.0 GHz with local register files.',
        },
        {
          name: 'Dual-Port SRAM Cache Bank',
          role: 'Ultra-Low Latency Storage',
          details:
            '6T SRAM cells providing 1-cycle latency read/write pipelines alongside the compute cores.',
        },
        {
          name: '14-Metal Layer Stack',
          role: 'Hierarchical Interconnect',
          details:
            'Progressive metal wire scaling from 24nm pitch copper wires at M1 up to 1200nm thick copper straps at M14.',
        },
        {
          name: 'GAA Nanosheet Transistors',
          role: 'Logic Switching Channel',
          details:
            'Horizontal silicon nanosheets completely encircled by high-k metal gates (HKMG) for ultimate electrostatic channel control.',
        },
      ],
    },
    keyTakeaway:
      'Modern chip design is dominated by wire delay and RC parasitics rather than transistor switching speed. Metal layer planning and power delivery integrity (IR drop) dictate maximum operating frequency.',
    challenges: [
      {
        id: 'challenge-silicon-1',
        moduleId: 'silicon-structure',
        title: 'Inspect Interconnect Scaling',
        description:
          'Examine the 14-layer metal interconnect stack and compare M1 wire pitch against M14 power mesh straps.',
        hint: 'Switch to the 14-Layer Interconnect view to inspect wire dimensions and RC delays.',
        targetCriteria: 'silicon-stack-inspected',
        completed: false,
      },
    ],
  },
};
