import {
  IsolationLevel,
  AnomalyScenarioId,
  DatabaseRow,
  TransactionStep,
  TransactionState,
} from '../../types/query';

export interface ScenarioDefinition {
  id: AnomalyScenarioId;
  name: string;
  anomalyName: string;
  description: string;
  initialRows: DatabaseRow[];
  steps: TransactionStep[];
  preventedBy: IsolationLevel[];
  explanation: {
    whyItHappens: string;
    howLevelFixesIt: string;
  };
}

export const SCENARIOS: Record<AnomalyScenarioId, ScenarioDefinition> = {
  'dirty-read': {
    id: 'dirty-read',
    name: 'Dirty Read Scenario',
    anomalyName: 'Dirty Read (G1a Anomaly)',
    description:
      'Transaction 1 updates an account balance but does not commit. Transaction 2 reads the uncommitted value. Transaction 1 then rolls back, leaving Transaction 2 acting on phantom uncommitted data.',
    initialRows: [
      { id: 'acc_1', name: 'Alice Savings', balance: 1000, xmin: 100 },
      { id: 'acc_2', name: 'Bob Checking', balance: 500, xmin: 100 },
    ],
    steps: [
      {
        id: 's1',
        txId: 'T1',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'Transaction 1 begins. Assigned txid = 201.',
      },
      {
        id: 's2',
        txId: 'T1',
        operation: 'UPDATE',
        queryText: 'UPDATE accounts SET balance = 1500 WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        newValues: { balance: 1500 },
        explanation:
          "T1 modifies Alice's balance to $1,500. This uncommitted modification is held in T1's private write set / buffer pool.",
      },
      {
        id: 's3',
        txId: 'T2',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'Transaction 2 begins. Assigned txid = 202.',
      },
      {
        id: 's4',
        txId: 'T2',
        operation: 'SELECT',
        queryText: 'SELECT balance FROM accounts WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        explanation:
          "T2 reads Alice's balance. Under Read Uncommitted, T2 sees dirty $1,500! Under Read Committed, T2 reads the last committed value ($1,000) or blocks.",
        anomalyWarning: 'DIRTY READ: T2 read uncommitted in-flight data!',
      },
      {
        id: 's5',
        txId: 'T1',
        operation: 'ROLLBACK',
        queryText: 'ROLLBACK;',
        explanation:
          "T1 encounters an error or cancels and rolls back! Alice's balance is restored to $1,000. T2's previous read of $1,500 was completely invalid.",
      },
      {
        id: 's6',
        txId: 'T2',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T2 commits after having made business decisions based on a dirty read.',
      },
    ],
    preventedBy: ['READ_COMMITTED', 'REPEATABLE_READ', 'SERIALIZABLE'],
    explanation: {
      whyItHappens:
        'In Read Uncommitted, queries do not acquire shared locks and do not inspect MVCC transaction commit status (xmin/xmax). A transaction can view dirty in-flight memory writes of another transaction.',
      howLevelFixesIt:
        'Read Committed requires that any row read by a query must have a committed xmin (creation txid) that is committed before the current statement began.',
    },
  },

  'non-repeatable-read': {
    id: 'non-repeatable-read',
    name: 'Non-Repeatable Read (Fuzzy Read)',
    anomalyName: 'Non-Repeatable Read (G1b Anomaly)',
    description:
      'Transaction 1 reads a row. Transaction 2 modifies and commits the same row. Transaction 1 reads the row a second time and observes a different value within the same transaction.',
    initialRows: [
      { id: 'acc_1', name: 'Alice Savings', balance: 1000, xmin: 100 },
      { id: 'acc_2', name: 'Bob Checking', balance: 500, xmin: 100 },
    ],
    steps: [
      {
        id: 'nr1',
        txId: 'T1',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'Transaction 1 begins.',
      },
      {
        id: 'nr2',
        txId: 'T1',
        operation: 'SELECT',
        queryText: 'SELECT balance FROM accounts WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        explanation: "T1 reads Alice's balance = $1,000.",
      },
      {
        id: 'nr3',
        txId: 'T2',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'Transaction 2 begins.',
      },
      {
        id: 'nr4',
        txId: 'T2',
        operation: 'UPDATE',
        queryText: 'UPDATE accounts SET balance = 1800 WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        newValues: { balance: 1800 },
        explanation: "T2 updates Alice's balance to $1,800.",
      },
      {
        id: 'nr5',
        txId: 'T2',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T2 commits successfully. New balance is permanently recorded on disk.',
      },
      {
        id: 'nr6',
        txId: 'T1',
        operation: 'SELECT',
        queryText: 'SELECT balance FROM accounts WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        explanation:
          "T1 re-reads Alice's balance. In Read Committed, it now sees $1,800! In Repeatable Read, it sees its initial snapshot of $1,000.",
        anomalyWarning:
          'NON-REPEATABLE READ: T1 observed the same row change from $1,000 to $1,800 within one transaction.',
      },
      {
        id: 'nr7',
        txId: 'T1',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T1 commits.',
      },
    ],
    preventedBy: ['REPEATABLE_READ', 'SERIALIZABLE'],
    explanation: {
      whyItHappens:
        "Under Read Committed, each individual query obtains a new snapshot of committed data. Even though T1 is still active, its second query sees T2's newly committed update.",
      howLevelFixesIt:
        'Repeatable Read freezes the snapshot at transaction start. Any modifications committed by other transactions after T1 began remain invisible to T1.',
    },
  },

  'phantom-read': {
    id: 'phantom-read',
    name: 'Phantom Read Scenario',
    anomalyName: 'Phantom Read (A3 Anomaly)',
    description:
      'Transaction 1 executes a range query (WHERE balance > 400). Transaction 2 inserts a brand new account matching the predicate and commits. Transaction 1 re-runs the range query and sees a new "phantom" row.',
    initialRows: [
      { id: 'acc_1', name: 'Alice Savings', balance: 1000, xmin: 100 },
      { id: 'acc_2', name: 'Bob Checking', balance: 500, xmin: 100 },
    ],
    steps: [
      {
        id: 'p1',
        txId: 'T1',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'T1 begins.',
      },
      {
        id: 'p2',
        txId: 'T1',
        operation: 'SELECT',
        queryText: 'SELECT * FROM accounts WHERE balance > 400;',
        explanation:
          'T1 queries all accounts with balance > 400. Returns 2 rows (Alice $1000, Bob $500).',
      },
      {
        id: 'p3',
        txId: 'T2',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'T2 begins.',
      },
      {
        id: 'p4',
        txId: 'T2',
        operation: 'INSERT',
        queryText: 'INSERT INTO accounts (id, name, balance) VALUES ("acc_3", "Charlie VIP", 850);',
        newValues: { id: 'acc_3', name: 'Charlie VIP', balance: 850, xmin: 202 },
        explanation: 'T2 inserts a brand new account with balance $850.',
      },
      {
        id: 'p5',
        txId: 'T2',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T2 commits the newly inserted row.',
      },
      {
        id: 'p6',
        txId: 'T1',
        operation: 'SELECT',
        queryText: 'SELECT * FROM accounts WHERE balance > 400;',
        explanation:
          'T1 re-executes the range query. Under Read Committed, it now returns 3 rows (Charlie VIP appeared!). Under Repeatable Read (PostgreSQL MVCC) or Serializable, predicate snapshot or predicate locks prevent phantoms.',
        anomalyWarning:
          'PHANTOM READ: A new record matching the range filter appeared mid-transaction.',
      },
      {
        id: 'p7',
        txId: 'T1',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T1 commits.',
      },
    ],
    preventedBy: ['REPEATABLE_READ', 'SERIALIZABLE'],
    explanation: {
      whyItHappens:
        'Standard row-level locks only lock rows that already exist. An insertion of a NEW row does not conflict with existing row locks unless index range locks (next-key locks) or snapshot isolation are used.',
      howLevelFixesIt:
        'Serializable uses Predicate Locks or SSI (Serializable Snapshot Isolation) to track read-write dependencies across predicates.',
    },
  },

  'lost-update': {
    id: 'lost-update',
    name: 'Lost Update Scenario',
    anomalyName: 'Lost Update (P4 Anomaly)',
    description:
      "Transaction 1 and Transaction 2 both read Alice's balance ($1,000) at the same time. Both calculate updates ($1,000 - 200 = 800 by T1, and $1,000 + 300 = 1300 by T2). Both write back. One update overwrites the other without knowledge.",
    initialRows: [
      { id: 'acc_1', name: 'Alice Savings', balance: 1000, xmin: 100 },
      { id: 'acc_2', name: 'Bob Checking', balance: 500, xmin: 100 },
    ],
    steps: [
      {
        id: 'lu1',
        txId: 'T1',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'T1 begins.',
      },
      {
        id: 'lu2',
        txId: 'T2',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'T2 begins.',
      },
      {
        id: 'lu3',
        txId: 'T1',
        operation: 'SELECT',
        queryText: 'SELECT balance FROM accounts WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        explanation: 'T1 reads Alice balance = $1,000.',
      },
      {
        id: 'lu4',
        txId: 'T2',
        operation: 'SELECT',
        queryText: 'SELECT balance FROM accounts WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        explanation: 'T2 reads Alice balance = $1,000 concurrently.',
      },
      {
        id: 'lu5',
        txId: 'T1',
        operation: 'UPDATE',
        queryText: 'UPDATE accounts SET balance = 800 WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        newValues: { balance: 800 },
        explanation: 'T1 subtracts $200 and writes $800.',
      },
      {
        id: 'lu6',
        txId: 'T1',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T1 commits balance = $800.',
      },
      {
        id: 'lu7',
        txId: 'T2',
        operation: 'UPDATE',
        queryText: 'UPDATE accounts SET balance = 1300 WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        newValues: { balance: 1300 },
        explanation:
          "T2 adds $300 to original $1,000 and writes $1,300, completely wiping out T1's $200 deduction!",
        anomalyWarning:
          "LOST UPDATE: T2 overwrote T1's committed deduction of $200. Money vanished!",
      },
      {
        id: 'lu8',
        txId: 'T2',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T2 commits.',
      },
    ],
    preventedBy: ['REPEATABLE_READ', 'SERIALIZABLE'],
    explanation: {
      whyItHappens:
        'Without pessimistic SELECT FOR UPDATE locks or optimistic concurrency checks, concurrent read-modify-write operations clobber each other.',
      howLevelFixesIt:
        'Repeatable Read (in PostgreSQL / Oracle) raises an error: "could not serialize access due to concurrent update" when T2 attempts to write to a row modified by T1 after T2\'s snapshot.',
    },
  },

  'write-skew': {
    id: 'write-skew',
    name: 'Write Skew (Doctor On-Call)',
    anomalyName: 'Write Skew (Snapshot Isolation Anomaly)',
    description:
      'Rule: At least 1 doctor must be on duty. Currently Dr. Alice and Dr. Bob are both on duty. Alice requests leave; the system checks duty count (2) and approves. Simultaneously Bob requests leave; system checks duty count (2) and approves. Both commit, leaving ZERO doctors on duty!',
    initialRows: [
      { id: 'doc_1', name: 'Dr. Alice', balance: 0, role: 'Surgeon', status: 'ON_DUTY', xmin: 100 },
      { id: 'doc_2', name: 'Dr. Bob', balance: 0, role: 'Physician', status: 'ON_DUTY', xmin: 100 },
    ],
    steps: [
      {
        id: 'ws1',
        txId: 'T1',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'T1 (Dr. Alice) begins transaction.',
      },
      {
        id: 'ws2',
        txId: 'T2',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'T2 (Dr. Bob) begins transaction.',
      },
      {
        id: 'ws3',
        txId: 'T1',
        operation: 'SELECT',
        queryText: 'SELECT COUNT(*) FROM doctors WHERE status = "ON_DUTY";',
        explanation: 'T1 checks count of doctors on duty = 2. Safe to leave (>= 1).',
      },
      {
        id: 'ws4',
        txId: 'T2',
        operation: 'SELECT',
        queryText: 'SELECT COUNT(*) FROM doctors WHERE status = "ON_DUTY";',
        explanation: 'T2 checks count of doctors on duty = 2. Safe to leave (>= 1).',
      },
      {
        id: 'ws5',
        txId: 'T1',
        operation: 'UPDATE',
        queryText: 'UPDATE doctors SET status = "OFF_DUTY" WHERE id = "doc_1";',
        targetRowId: 'doc_1',
        newValues: { status: 'OFF_DUTY' },
        explanation: 'T1 changes Alice to OFF_DUTY.',
      },
      {
        id: 'ws6',
        txId: 'T1',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T1 commits.',
      },
      {
        id: 'ws7',
        txId: 'T2',
        operation: 'UPDATE',
        queryText: 'UPDATE doctors SET status = "OFF_DUTY" WHERE id = "doc_2";',
        targetRowId: 'doc_2',
        newValues: { status: 'OFF_DUTY' },
        explanation:
          'T2 changes Bob to OFF_DUTY. Notice T1 and T2 modified DIFFERENT rows, so row locks never collided!',
        anomalyWarning:
          'WRITE SKEW: Both committed! 0 doctors remain on duty, violating integrity constraint.',
      },
      {
        id: 'ws8',
        txId: 'T2',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T2 commits.',
      },
    ],
    preventedBy: ['SERIALIZABLE'],
    explanation: {
      whyItHappens:
        'Write Skew occurs under Snapshot Isolation (Repeatable Read) because T1 writes to row 1 and T2 writes to row 2. No single row lock is shared, but their overlapping read sets formed the precondition for the writes.',
      howLevelFixesIt:
        "Only true Serializable (via Serializable Snapshot Isolation / SSI or 2-Phase Locking) detects the cyclic dependency between T1's read of row 2 and T2's read of row 1, aborting T2 with a serialization error.",
    },
  },

  deadlock: {
    id: 'deadlock',
    name: 'Deadlock & Wait-For Cycle',
    anomalyName: 'Deadlock (Cyclic Lock Dependency)',
    description:
      'Transaction 1 holds exclusive lock on Account 1 and requests Account 2. Transaction 2 holds exclusive lock on Account 2 and requests Account 1. Neither can proceed without the other releasing its lock.',
    initialRows: [
      { id: 'acc_1', name: 'Alice Savings', balance: 1000, xmin: 100 },
      { id: 'acc_2', name: 'Bob Checking', balance: 500, xmin: 100 },
    ],
    steps: [
      {
        id: 'dl1',
        txId: 'T1',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'Transaction 1 begins.',
      },
      {
        id: 'dl2',
        txId: 'T2',
        operation: 'BEGIN',
        queryText: 'BEGIN TRANSACTION;',
        explanation: 'Transaction 2 begins.',
      },
      {
        id: 'dl3',
        txId: 'T1',
        operation: 'UPDATE',
        queryText: 'UPDATE accounts SET balance = balance - 100 WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        newValues: { balance: 900 },
        explanation: 'T1 acquires Exclusive X-Lock on Alice (acc_1).',
      },
      {
        id: 'dl4',
        txId: 'T2',
        operation: 'UPDATE',
        queryText: 'UPDATE accounts SET balance = balance - 50 WHERE id = "acc_2";',
        targetRowId: 'acc_2',
        newValues: { balance: 450 },
        explanation: 'T2 acquires Exclusive X-Lock on Bob (acc_2).',
      },
      {
        id: 'dl5',
        txId: 'T1',
        operation: 'UPDATE',
        queryText: 'UPDATE accounts SET balance = balance + 100 WHERE id = "acc_2";',
        targetRowId: 'acc_2',
        explanation:
          'T1 attempts to update Bob (acc_2), but T2 holds an exclusive lock! T1 enters WAITING state.',
        blockedByLock: true,
      },
      {
        id: 'dl6',
        txId: 'T2',
        operation: 'UPDATE',
        queryText: 'UPDATE accounts SET balance = balance + 50 WHERE id = "acc_1";',
        targetRowId: 'acc_1',
        explanation:
          'T2 attempts to update Alice (acc_1), but T1 holds an exclusive lock! T2 enters WAITING state.',
        blockedByLock: true,
        anomalyWarning:
          'DEADLOCK DETECTED: Cyclic dependency T1 -> T2 -> T1! Database engine aborts one transaction.',
      },
      {
        id: 'dl7',
        txId: 'T2',
        operation: 'ROLLBACK',
        queryText: 'ROLLBACK (DEADLOCK ABORT);',
        explanation:
          'Database lock manager automatically aborts T2 with: "ERROR: deadlock detected. Process 202 waits for ExclusiveLock on relation accounts". Releases locks so T1 can proceed.',
      },
      {
        id: 'dl8',
        txId: 'T1',
        operation: 'COMMIT',
        queryText: 'COMMIT;',
        explanation: 'T1 acquires lock on acc_2 and successfully commits.',
      },
    ],
    preventedBy: [],
    explanation: {
      whyItHappens:
        "Deadlocks occur when transactions acquire multiple exclusive locks in conflicting orders (e.g., T1 touches A then B, while T2 touches B then A). Neither isolation level eliminates deadlocks; transactions must enforce consistent ordering or rely on the engine's deadlock detector.",
      howLevelFixesIt:
        'PostgreSQL / MySQL run a background deadlock detection thread that searches the lock Wait-For Graph for directed cycles every deadlock_timeout (default 1000ms), picking the cheapest transaction to abort.',
    },
  },
};
