export interface LsmEntry {
  key: string;
  value: string;
  version: number;
  isTombstone: boolean;
  timestamp: number;
}

export interface SSTableMetadata {
  id: string;
  level: number; // 0, 1, 2
  minKey: string;
  maxKey: string;
  entries: LsmEntry[];
  sizeBytes: number;
  bloomFilterBits: number[]; // e.g. bit array
  createdAt: number;
}

export interface LsmMetrics {
  totalWrites: number;
  totalDiskFlushes: number;
  totalCompactions: number;
  writeAmplification: number;
  readAmplification: number;
  spaceAmplification: number;
  memTableSizeBytes: number;
  diskSizeBytes: number;
  liveRecordsCount: number;
  tombstoneCount: number;
}

// B+ Tree Types
export interface BPlusNode {
  id: string;
  isLeaf: boolean;
  keys: number[];
  children?: BPlusNode[]; // If !isLeaf
  values?: string[]; // If isLeaf
  next?: BPlusNode | null; // Leaf-level sibling link
  prev?: BPlusNode | null;
  parentId?: string | null;
}

export interface BPlusTreeMetrics {
  height: number;
  totalNodes: number;
  leafNodes: number;
  internalNodes: number;
  totalKeys: number;
  capacityUtilizationPct: number;
}

// ACID Simulator Types
export type IsolationLevel =
  'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';

export type AnomalyScenarioId =
  'dirty-read' | 'non-repeatable-read' | 'phantom-read' | 'lost-update' | 'write-skew' | 'deadlock';

export interface DatabaseRow {
  id: string;
  name: string;
  balance: number;
  role?: string;
  status?: string;
  xmin: number; // creation tx id (MVCC)
  xmax?: number; // expiration/deletion tx id (MVCC)
  lock?: {
    txId: 'T1' | 'T2';
    mode: 'SHARED' | 'EXCLUSIVE';
  };
}

export interface TransactionStep {
  id: string;
  txId: 'T1' | 'T2';
  operation: 'BEGIN' | 'SELECT' | 'UPDATE' | 'INSERT' | 'DELETE' | 'COMMIT' | 'ROLLBACK';
  queryText: string;
  targetRowId?: string;
  newValues?: Partial<DatabaseRow>;
  explanation: string;
  anomalyWarning?: string;
  blockedByLock?: boolean;
}

export interface TransactionState {
  id: 'T1' | 'T2';
  status: 'IDLE' | 'ACTIVE' | 'COMMITTED' | 'ABORTED' | 'BLOCKED';
  snapshotTxId: number;
  localReadCache: Record<string, DatabaseRow>;
  currentStepIndex: number;
  history: string[];
}
