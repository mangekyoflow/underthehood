import { BPlusNode, BPlusTreeMetrics } from '../../types/query';

let nodeIdCounter = 1;

export function createNode(isLeaf: boolean, keys: number[] = []): BPlusNode {
  return {
    id: `node-${nodeIdCounter++}`,
    isLeaf,
    keys,
    children: isLeaf ? undefined : [],
    values: isLeaf ? keys.map((k) => `rec_${k}`) : undefined,
    next: null,
    prev: null,
  };
}

export function resetNodeCounter(): void {
  nodeIdCounter = 1;
}

// Clone tree deeply for immutable state updates
export function cloneTree(node: BPlusNode | null): BPlusNode | null {
  if (!node) return null;
  const copy: BPlusNode = {
    id: node.id,
    isLeaf: node.isLeaf,
    keys: [...node.keys],
    children: node.children ? node.children.map((c) => cloneTree(c)!) : undefined,
    values: node.values ? [...node.values] : undefined,
    next: node.next,
    prev: node.prev,
    parentId: node.parentId,
  };
  return copy;
}

// Tree Insertion with genuine splitting and separator promotion
export function insertKey(
  root: BPlusNode | null,
  key: number,
  maxKeys: number = 3
): { newRoot: BPlusNode; splitOccurred: boolean; trace: string[] } {
  const trace: string[] = [];

  if (!root) {
    const newRoot = createNode(true, [key]);
    trace.push(`Created initial root leaf with key ${key}.`);
    return { newRoot, splitOccurred: false, trace };
  }

  const workingRoot = cloneTree(root)!;

  // 1. Traverse to leaf
  const path: BPlusNode[] = [];
  let curr: BPlusNode = workingRoot;
  while (!curr.isLeaf) {
    path.push(curr);
    let childIdx = 0;
    while (childIdx < curr.keys.length && key >= curr.keys[childIdx]) {
      childIdx++;
    }
    trace.push(
      `Traversing internal node ${curr.id} [${curr.keys.join(', ')}]: routed to child index ${childIdx}`
    );
    curr = curr.children![childIdx];
  }

  // 2. Insert into leaf in sorted order
  if (curr.keys.includes(key)) {
    trace.push(`Key ${key} already exists in leaf ${curr.id}. No duplicates inserted.`);
    return { newRoot: workingRoot, splitOccurred: false, trace };
  }

  const insertIdx = curr.keys.findIndex((k) => k > key);
  if (insertIdx === -1) {
    curr.keys.push(key);
    curr.values?.push(`rec_${key}`);
  } else {
    curr.keys.splice(insertIdx, 0, key);
    curr.values?.splice(insertIdx, 0, `rec_${key}`);
  }
  trace.push(`Inserted key ${key} into leaf ${curr.id} -> [${curr.keys.join(', ')}]`);

  // 3. Handle splits if capacity exceeded
  let splitOccurred = false;
  if (curr.keys.length > maxKeys) {
    splitOccurred = true;
    let nodeToSplit: BPlusNode | null = curr;
    let promotedKey: number | null = null;
    let newSibling: BPlusNode | null = null;

    while (nodeToSplit && nodeToSplit.keys.length > maxKeys) {
      const mid = Math.floor(nodeToSplit.keys.length / 2);

      if (nodeToSplit.isLeaf) {
        promotedKey = nodeToSplit.keys[mid];
        const rightKeys = nodeToSplit.keys.slice(mid);
        nodeToSplit.keys = nodeToSplit.keys.slice(0, mid);

        newSibling = createNode(true, rightKeys);
        newSibling.next = nodeToSplit.next;
        nodeToSplit.next = newSibling;

        trace.push(
          `Leaf ${nodeToSplit.id} exceeded capacity (${maxKeys}). Split into [${nodeToSplit.keys.join(', ')}] and [${rightKeys.join(', ')}]. Promoted separator ${promotedKey}.`
        );
      } else {
        promotedKey = nodeToSplit.keys[mid];
        const rightKeys = nodeToSplit.keys.slice(mid + 1);
        const rightChildren = nodeToSplit.children!.slice(mid + 1);

        nodeToSplit.keys = nodeToSplit.keys.slice(0, mid);
        nodeToSplit.children = nodeToSplit.children!.slice(0, mid + 1);

        newSibling = createNode(false, rightKeys);
        newSibling.children = rightChildren;

        trace.push(`Internal node ${nodeToSplit.id} split. Promoted separator ${promotedKey}.`);
      }

      const parent = path.pop();
      if (!parent) {
        const newRoot = createNode(false, [promotedKey]);
        newRoot.children = [nodeToSplit, newSibling];
        trace.push(
          `Root node split! Created new root ${newRoot.id} with separator [${promotedKey}]. Tree height increased.`
        );
        return { newRoot, splitOccurred: true, trace };
      } else {
        const pIdx = parent.keys.findIndex((k) => k > promotedKey!);
        if (pIdx === -1) {
          parent.keys.push(promotedKey);
          parent.children!.push(newSibling);
        } else {
          parent.keys.splice(pIdx, 0, promotedKey);
          parent.children!.splice(pIdx + 1, 0, newSibling);
        }
        nodeToSplit = parent;
      }
    }
  }

  return { newRoot: workingRoot, splitOccurred, trace };
}

// Tree Deletion with Underflow Borrowing & Merging
export function deleteKey(
  root: BPlusNode | null,
  key: number,
  maxKeys: number = 3
): { newRoot: BPlusNode | null; deleted: boolean; trace: string[] } {
  const trace: string[] = [];
  if (!root) return { newRoot: null, deleted: false, trace: ['Tree is empty.'] };

  const workingRoot = cloneTree(root)!;

  // 1. Traverse to leaf
  const path: { node: BPlusNode; childIdx: number }[] = [];
  let curr = workingRoot;
  while (!curr.isLeaf) {
    let childIdx = 0;
    while (childIdx < curr.keys.length && key >= curr.keys[childIdx]) {
      childIdx++;
    }
    path.push({ node: curr, childIdx });
    curr = curr.children![childIdx];
  }

  // 2. Check key exists
  const keyIdx = curr.keys.indexOf(key);
  if (keyIdx === -1) {
    trace.push(`Key ${key} not found in tree. Nothing deleted.`);
    return { newRoot: workingRoot, deleted: false, trace };
  }

  curr.keys.splice(keyIdx, 1);
  curr.values?.splice(keyIdx, 1);
  trace.push(`Removed key ${key} from leaf ${curr.id} -> remaining [${curr.keys.join(', ')}]`);

  // Min keys threshold: ceil(maxKeys / 2) - 1
  const minKeys = Math.max(1, Math.floor(maxKeys / 2));

  // If leaf underflows and has parent
  if (curr.keys.length < minKeys && path.length > 0) {
    const parentEntry = path[path.length - 1];
    const parent = parentEntry.node;
    const childIdx = parentEntry.childIdx;

    // Try borrowing from left sibling
    const leftSibling = childIdx > 0 ? parent.children![childIdx - 1] : null;
    const rightSibling =
      childIdx < parent.children!.length - 1 ? parent.children![childIdx + 1] : null;

    if (leftSibling && leftSibling.keys.length > minKeys) {
      // Borrow from left sibling
      const borrowedKey = leftSibling.keys.pop()!;
      curr.keys.unshift(borrowedKey);
      parent.keys[childIdx - 1] = curr.keys[0];
      trace.push(
        `Leaf ${curr.id} underflowed. Borrowed key ${borrowedKey} from left sibling ${leftSibling.id}. Updated parent separator.`
      );
    } else if (rightSibling && rightSibling.keys.length > minKeys) {
      // Borrow from right sibling
      const borrowedKey = rightSibling.keys.shift()!;
      curr.keys.push(borrowedKey);
      parent.keys[childIdx] = rightSibling.keys[0];
      trace.push(
        `Leaf ${curr.id} underflowed. Borrowed key ${borrowedKey} from right sibling ${rightSibling.id}. Updated parent separator.`
      );
    } else if (leftSibling) {
      // Merge with left sibling
      leftSibling.keys.push(...curr.keys);
      leftSibling.next = curr.next;
      parent.children!.splice(childIdx, 1);
      parent.keys.splice(childIdx - 1, 1);
      trace.push(
        `Leaf ${curr.id} underflowed. Merged into left sibling ${leftSibling.id}. Removed parent separator.`
      );
    } else if (rightSibling) {
      // Merge with right sibling
      curr.keys.push(...rightSibling.keys);
      curr.next = rightSibling.next;
      parent.children!.splice(childIdx + 1, 1);
      parent.keys.splice(childIdx, 1);
      trace.push(
        `Leaf ${curr.id} underflowed. Merged with right sibling ${rightSibling.id}. Removed parent separator.`
      );
    }

    // Collapse root if root has 0 keys
    if (
      workingRoot.keys.length === 0 &&
      workingRoot.children &&
      workingRoot.children.length === 1
    ) {
      trace.push(
        `Root node ${workingRoot.id} emptied! Promoted single child ${workingRoot.children[0].id} to new root. Tree height decreased.`
      );
      return { newRoot: workingRoot.children[0], deleted: true, trace };
    }
  }

  // If root leaf is empty
  if (workingRoot.isLeaf && workingRoot.keys.length === 0) {
    return { newRoot: null, deleted: true, trace: ['Root leaf emptied. Tree is now null.'] };
  }

  return { newRoot: workingRoot, deleted: true, trace };
}

// Tree Search
export function searchKey(
  root: BPlusNode | null,
  key: number
): { found: boolean; path: string[]; leafId: string | null } {
  if (!root) return { found: false, path: [], leafId: null };

  const path: string[] = [];
  let curr = root;

  while (!curr.isLeaf) {
    path.push(curr.id);
    let childIdx = 0;
    while (childIdx < curr.keys.length && key >= curr.keys[childIdx]) {
      childIdx++;
    }
    curr = curr.children![childIdx];
  }

  path.push(curr.id);
  const found = curr.keys.includes(key);
  return { found, path, leafId: curr.id };
}

// Sequential Range Scan across linked leaves
export function executeRangeScan(
  root: BPlusNode | null,
  minKey: number,
  maxKey: number
): { keys: number[]; traversedLeafIds: string[]; trace: string[] } {
  if (!root) return { keys: [], traversedLeafIds: [], trace: [] };

  const trace: string[] = [];
  const traversedLeafIds: string[] = [];
  const resultKeys: number[] = [];

  let curr: BPlusNode = root;
  while (!curr.isLeaf) {
    let childIdx = 0;
    while (childIdx < curr.keys.length && minKey >= curr.keys[childIdx]) {
      childIdx++;
    }
    curr = curr.children![childIdx];
  }

  trace.push(`Navigated to starting leaf ${curr.id} for range [${minKey} .. ${maxKey}]`);

  let leaf: BPlusNode | null = curr;
  while (leaf) {
    traversedLeafIds.push(leaf.id);
    trace.push(`Scanning linked leaf ${leaf.id} [${leaf.keys.join(', ')}] via next pointer`);

    for (const k of leaf.keys) {
      if (k >= minKey && k <= maxKey) {
        resultKeys.push(k);
      }
      if (k > maxKey) {
        trace.push(`Key ${k} exceeds max ${maxKey}. Range scan completed.`);
        return { keys: resultKeys, traversedLeafIds, trace };
      }
    }

    leaf = leaf.next as BPlusNode | null;
  }

  return { keys: resultKeys, traversedLeafIds, trace };
}

// Calculate Tree Metrics
export function calculateTreeMetrics(
  root: BPlusNode | null,
  maxCapacity: number = 3
): BPlusTreeMetrics {
  if (!root) {
    return {
      height: 0,
      totalNodes: 0,
      leafNodes: 0,
      internalNodes: 0,
      totalKeys: 0,
      capacityUtilizationPct: 0,
    };
  }

  let totalNodes = 0;
  let leafNodes = 0;
  let internalNodes = 0;
  let totalKeys = 0;
  let height = 0;

  let hCursor: BPlusNode | null = root;
  while (hCursor) {
    height++;
    hCursor = hCursor.isLeaf ? null : hCursor.children![0];
  }

  const queue: BPlusNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    totalNodes++;
    totalKeys += node.keys.length;

    if (node.isLeaf) {
      leafNodes++;
    } else {
      internalNodes++;
      if (node.children) {
        queue.push(...node.children);
      }
    }
  }

  const maxPossibleKeys = totalNodes * maxCapacity;
  const capacityUtilizationPct =
    maxPossibleKeys > 0 ? Math.round((totalKeys / maxPossibleKeys) * 100) : 0;

  return {
    height,
    totalNodes,
    leafNodes,
    internalNodes,
    totalKeys,
    capacityUtilizationPct,
  };
}
