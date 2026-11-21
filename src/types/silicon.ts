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

export type PipelineStage = 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';

export type RiscvOpcode = 'ADD' | 'SUB' | 'AND' | 'OR' | 'SLT' | 'LW' | 'SW' | 'BEQ' | 'NOP';

export interface RiscvInstruction {
  id: number;
  pc: number;
  asm: string;
  opcode: RiscvOpcode;
  rd: string;
  rs1: string;
  rs2: string;
  imm?: number;
  rawType?: 'R' | 'I' | 'S' | 'B';
}

export type HazardType =
  | 'none'
  | 'forward_ex_rs1'
  | 'forward_ex_rs2'
  | 'forward_mem_rs1'
  | 'forward_mem_rs2'
  | 'load_use_stall'
  | 'branch_flush';

export interface PipelineRegisterState {
  pc: number;
  inst: RiscvInstruction | null;
  valRs1?: number;
  valRs2?: number;
  aluResult?: number;
  memReadData?: number;
  isBubble?: boolean;
}

export interface RiscvCpuState {
  cycle: number;
  pc: number;
  ifStage: PipelineRegisterState;
  idStage: PipelineRegisterState;
  exStage: PipelineRegisterState;
  memStage: PipelineRegisterState;
  wbStage: PipelineRegisterState;
  registers: Record<string, number>;
  activeHazard: HazardType;
  hazardMessage: string;
  stallCount: number;
  flushCount: number;
  retiredCount: number;
}
