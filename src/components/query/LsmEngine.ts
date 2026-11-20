import { LsmEntry, SSTableMetadata, LsmMetrics } from '../../types/query';

export interface LsmState {
  wal: LsmEntry[];
  activeMemTable: LsmEntry[];
  immutableMemTable: LsmEntry[] | null;
  l0Tables: SSTableMetadata[];
  l1Tables: SSTableMetadata[];
  l2Tables: SSTableMetadata[];
  memTableThreshold: number; // e.g. 4
  compactionStrategy: 'leveled' | 'size-tiered';
  metrics: LsmMetrics;
  versionCounter: number;
}

export const BLOOM_SIZE = 32;

export function hashBloom(key: string, seed: number, size: number = BLOOM_SIZE): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = Math.abs((h * seed + key.charCodeAt(i)) % size);
  }
  return h;
}

export function getBloomHashes(key: string, size: number = BLOOM_SIZE): [number, number, number] {
  return [hashBloom(key, 31, size), hashBloom(key, 37, size), hashBloom(key, 41, size)];
}

// Generate 32-bit Bloom filter
export function generateBloomFilter(entries: LsmEntry[]): number[] {
  const bits = new Array(BLOOM_SIZE).fill(0);
  entries.forEach((e) => {
    const [h1, h2, h3] = getBloomHashes(e.key, BLOOM_SIZE);
    bits[h1] = 1;
    bits[h2] = 1;
    bits[h3] = 1;
  });
  return bits;
}

export function testBloomFilter(key: string, bits: number[]): boolean {
  const [h1, h2, h3] = getBloomHashes(key, bits.length);
  return bits[h1] === 1 && bits[h2] === 1 && bits[h3] === 1;
}

export function createInitialLsmState(threshold: number = 4): LsmState {
  return {
    wal: [],
    activeMemTable: [],
    immutableMemTable: null,
    l0Tables: [],
    l1Tables: [],
    l2Tables: [],
    memTableThreshold: threshold,
    compactionStrategy: 'leveled',
    metrics: {
      totalWrites: 0,
      totalDiskFlushes: 0,
      totalCompactions: 0,
      writeAmplification: 1.0,
      readAmplification: 1.0,
      spaceAmplification: 1.0,
      memTableSizeBytes: 0,
      diskSizeBytes: 0,
      liveRecordsCount: 0,
      tombstoneCount: 0,
    },
    versionCounter: 1,
  };
}

export function insertOrUpdateKey(
  state: LsmState,
  key: string,
  value: string,
  isTombstone: boolean = false
): { nextState: LsmState; flushOccurred: boolean; logMessage: string } {
  const version = state.versionCounter + 1;
  const newEntry: LsmEntry = {
    key,
    value: isTombstone ? 'DELETED' : value,
    version,
    isTombstone,
    timestamp: Date.now(),
  };

  const updatedWal = [...state.wal, newEntry];

  const existingIdx = state.activeMemTable.findIndex((e) => e.key === key);
  let updatedMemTable: LsmEntry[];
  if (existingIdx >= 0) {
    updatedMemTable = state.activeMemTable.map((e, idx) => (idx === existingIdx ? newEntry : e));
  } else {
    updatedMemTable = [...state.activeMemTable, newEntry].sort((a, b) =>
      a.key.localeCompare(b.key)
    );
  }

  const tombstoneDelta = isTombstone
    ? 1
    : existingIdx >= 0 && state.activeMemTable[existingIdx].isTombstone
      ? -1
      : 0;

  let nextState: LsmState = {
    ...state,
    wal: updatedWal,
    activeMemTable: updatedMemTable,
    versionCounter: version,
    metrics: {
      ...state.metrics,
      totalWrites: state.metrics.totalWrites + 1,
      memTableSizeBytes: updatedMemTable.length * 64,
      liveRecordsCount:
        state.metrics.liveRecordsCount + (isTombstone ? 0 : existingIdx >= 0 ? 0 : 1),
      tombstoneCount: Math.max(0, state.metrics.tombstoneCount + tombstoneDelta),
    },
  };

  let flushOccurred = false;
  let logMessage = isTombstone
    ? `Tombstone inserted for key "${key}" [v${version}]. WAL appended.`
    : `Write request: key "${key}" = "${value}" [v${version}]. Added to WAL & Active MemTable.`;

  if (updatedMemTable.length >= state.memTableThreshold) {
    flushOccurred = true;
    nextState = flushMemTable(nextState);
    logMessage += ` MemTable hit threshold (${state.memTableThreshold}) -> Flushed to L0 SSTable.`;
  }

  return { nextState, flushOccurred, logMessage };
}

export function flushMemTable(state: LsmState): LsmState {
  if (state.activeMemTable.length === 0) return state;

  const entriesToFlush = [...state.activeMemTable];
  const sortedEntries = entriesToFlush.sort((a, b) => a.key.localeCompare(b.key));

  const newSSTable: SSTableMetadata = {
    id: `sstable-l0-${Date.now() % 10000}`,
    level: 0,
    minKey: sortedEntries[0].key,
    maxKey: sortedEntries[sortedEntries.length - 1].key,
    entries: sortedEntries,
    sizeBytes: sortedEntries.length * 128,
    bloomFilterBits: generateBloomFilter(sortedEntries),
    createdAt: Date.now(),
  };

  const newL0 = [newSSTable, ...state.l0Tables];
  const totalDiskFlushes = state.metrics.totalDiskFlushes + 1;
  const diskSizeBytes = state.metrics.diskSizeBytes + newSSTable.sizeBytes;

  const writeAmp = Number(
    (1 + totalDiskFlushes * 0.4 + state.metrics.totalCompactions * 1.2).toFixed(2)
  );
  const readAmp = Number(
    (
      1 +
      newL0.length +
      (state.l1Tables.length > 0 ? 1 : 0) +
      (state.l2Tables.length > 0 ? 1 : 0)
    ).toFixed(1)
  );

  return {
    ...state,
    activeMemTable: [],
    immutableMemTable: null,
    wal: [],
    l0Tables: newL0,
    metrics: {
      ...state.metrics,
      totalDiskFlushes,
      diskSizeBytes,
      writeAmplification: writeAmp,
      readAmplification: readAmp,
      memTableSizeBytes: 0,
    },
  };
}

export function triggerCompaction(state: LsmState): { nextState: LsmState; logMessage: string } {
  if (state.l0Tables.length === 0) {
    return { nextState: state, logMessage: 'No L0 SSTables available to compact.' };
  }

  const allEntries: LsmEntry[] = [];
  state.l0Tables.forEach((t) => allEntries.push(...t.entries));
  state.l1Tables.forEach((t) => allEntries.push(...t.entries));

  const mergedMap = new Map<string, LsmEntry>();
  allEntries.forEach((entry) => {
    const existing = mergedMap.get(entry.key);
    if (!existing || entry.version > existing.version) {
      mergedMap.set(entry.key, entry);
    }
  });

  const activeEntries = Array.from(mergedMap.values())
    .filter((e) => !e.isTombstone)
    .sort((a, b) => a.key.localeCompare(b.key));

  const newL1: SSTableMetadata[] = [];
  const newL2 = [...state.l2Tables];

  if (activeEntries.length > 0) {
    const chunkSize = 4;
    for (let i = 0; i < activeEntries.length; i += chunkSize) {
      const chunk = activeEntries.slice(i, i + chunkSize);
      newL1.push({
        id: `sstable-l1-${i / chunkSize + 1}`,
        level: 1,
        minKey: chunk[0].key,
        maxKey: chunk[chunk.length - 1].key,
        entries: chunk,
        sizeBytes: chunk.length * 128,
        bloomFilterBits: generateBloomFilter(chunk),
        createdAt: Date.now(),
      });
    }
  }

  if (newL1.length > 3) {
    const promoted = newL1.pop();
    if (promoted) {
      promoted.level = 2;
      promoted.id = `sstable-l2-${newL2.length + 1}`;
      newL2.push(promoted);
    }
  }

  const compactions = state.metrics.totalCompactions + 1;
  const newDiskSize = (newL1.length + newL2.length) * 4 * 128;
  const writeAmp = Number((state.metrics.writeAmplification + 1.2).toFixed(2));
  const readAmp = Number((1 + (newL1.length > 0 ? 1 : 0) + (newL2.length > 0 ? 1 : 0)).toFixed(1));
  const spaceAmp = Number((newDiskSize / Math.max(1, activeEntries.length * 128)).toFixed(2));

  const logMessage = `Compacted ${state.l0Tables.length} L0 SSTables into Level 1 (${state.compactionStrategy} policy). Purged dead tombstones & obsolete keys.`;

  return {
    nextState: {
      ...state,
      l0Tables: [],
      l1Tables: newL1,
      l2Tables: newL2,
      metrics: {
        ...state.metrics,
        totalCompactions: compactions,
        diskSizeBytes: newDiskSize,
        writeAmplification: writeAmp,
        readAmplification: readAmp,
        spaceAmplification: spaceAmp,
        tombstoneCount: 0,
      },
    },
    logMessage,
  };
}

export interface ReadPathResult {
  key: string;
  found: boolean;
  isTombstone: boolean;
  value?: string;
  version?: number;
  bloomFilteredCount: number;
  steps: {
    target: string;
    action: string;
    result: 'HIT' | 'MISS' | 'BLOOM_NEGATIVE';
  }[];
}

export function tracePointLookup(state: LsmState, searchKey: string): ReadPathResult {
  const steps: ReadPathResult['steps'] = [];
  let bloomFilteredCount = 0;

  // Step 1: Check Active MemTable
  const inMem = state.activeMemTable.find((e) => e.key === searchKey);
  if (inMem) {
    steps.push({
      target: 'Active MemTable',
      action: 'In-memory skiplist binary search',
      result: 'HIT',
    });
    return {
      key: searchKey,
      found: !inMem.isTombstone,
      isTombstone: inMem.isTombstone,
      value: inMem.value,
      version: inMem.version,
      bloomFilteredCount,
      steps,
    };
  }
  steps.push({
    target: 'Active MemTable',
    action: 'In-memory skiplist search',
    result: 'MISS',
  });

  // Step 2: Check Immutable MemTable
  if (state.immutableMemTable) {
    const inImm = state.immutableMemTable.find((e) => e.key === searchKey);
    if (inImm) {
      steps.push({
        target: 'Immutable MemTable',
        action: 'Search staging flush buffer',
        result: 'HIT',
      });
      return {
        key: searchKey,
        found: !inImm.isTombstone,
        isTombstone: inImm.isTombstone,
        value: inImm.value,
        version: inImm.version,
        bloomFilteredCount,
        steps,
      };
    }
  }

  // Step 3: Check L0 SSTables with Bloom Filter
  for (const table of state.l0Tables) {
    const bloomPass = testBloomFilter(searchKey, table.bloomFilterBits);
    if (!bloomPass) {
      bloomFilteredCount++;
      steps.push({
        target: `L0 SSTable (${table.id})`,
        action: 'Bloom filter negative: zero bit match, skipped disk read!',
        result: 'BLOOM_NEGATIVE',
      });
      continue;
    }

    const foundEntry = table.entries.find((e) => e.key === searchKey);
    if (foundEntry) {
      steps.push({
        target: `L0 SSTable (${table.id})`,
        action: `Bloom filter positive -> found in block [${table.minKey} - ${table.maxKey}]`,
        result: 'HIT',
      });
      return {
        key: searchKey,
        found: !foundEntry.isTombstone,
        isTombstone: foundEntry.isTombstone,
        value: foundEntry.value,
        version: foundEntry.version,
        bloomFilteredCount,
        steps,
      };
    } else {
      steps.push({
        target: `L0 SSTable (${table.id})`,
        action: `Checked block in [${table.minKey} - ${table.maxKey}]`,
        result: 'MISS',
      });
    }
  }

  // Step 4: Check L1 SSTables
  for (const table of state.l1Tables) {
    if (searchKey >= table.minKey && searchKey <= table.maxKey) {
      const bloomPass = testBloomFilter(searchKey, table.bloomFilterBits);
      if (!bloomPass) {
        bloomFilteredCount++;
        steps.push({
          target: `L1 SSTable (${table.id})`,
          action: 'Bloom filter negative: skipped disk page read',
          result: 'BLOOM_NEGATIVE',
        });
        continue;
      }

      const foundEntry = table.entries.find((e) => e.key === searchKey);
      if (foundEntry) {
        steps.push({
          target: `L1 SSTable (${table.id})`,
          action: 'Found in non-overlapping sorted run',
          result: 'HIT',
        });
        return {
          key: searchKey,
          found: !foundEntry.isTombstone,
          isTombstone: foundEntry.isTombstone,
          value: foundEntry.value,
          version: foundEntry.version,
          bloomFilteredCount,
          steps,
        };
      }
    }
  }

  // Step 5: Check L2 SSTables
  for (const table of state.l2Tables) {
    if (searchKey >= table.minKey && searchKey <= table.maxKey) {
      const foundEntry = table.entries.find((e) => e.key === searchKey);
      if (foundEntry) {
        steps.push({
          target: `L2 SSTable (${table.id})`,
          action: 'Found in L2 deep storage run',
          result: 'HIT',
        });
        return {
          key: searchKey,
          found: !foundEntry.isTombstone,
          isTombstone: foundEntry.isTombstone,
          value: foundEntry.value,
          version: foundEntry.version,
          bloomFilteredCount,
          steps,
        };
      }
    }
  }

  steps.push({
    target: 'Storage Exhausted',
    action: 'Key not found in any level',
    result: 'MISS',
  });

  return {
    key: searchKey,
    found: false,
    isTombstone: false,
    bloomFilteredCount,
    steps,
  };
}
