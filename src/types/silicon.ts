export type AluOpcode = 'ADD' | 'SUB' | 'MUL' | 'AND' | 'OR' | 'XOR' | 'SHL' | 'SHR';

export interface UvmTransaction {
  id: number;
  cycle: number;
  op: AluOpcode;
  a: number;
  b: number;
  expectedResult: number;
  dutResult: number;
  isCornerCase: boolean;
  hasOverflow: boolean;
  status: 'PASS' | 'FAIL';
  assertionDetail: string;
}

export interface CoverageBin {
  id: string;
  name: string;
  category: 'opcode' | 'corner' | 'overflow';
  hits: number;
  targetHits: number;
  covered: boolean;
}

export type SynchronizerType = 'none' | 'two-ff' | 'async-fifo';

export interface FifoEntry {
  id: number;
  data: number;
  binaryPointer: number;
  grayPointer: string;
}

export interface CdcTelemetry {
  clkA_MHz: number;
  clkB_MHz: number;
  synchronizer: SynchronizerType;
  hazardDetected: boolean;
  metastableEvents: number;
  fifoOccupancy: number;
  fifoCapacity: number;
  mtbfYears: number;
}
