import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Cpu,
  Layers,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  Activity,
  Binary,
} from 'lucide-react';
import { playTick, playSuccess, playAlert } from '../../lib/sound';
import { ChallengeCard } from '../common/ChallengeCard';
import { ExplanationDrawer } from '../common/ExplanationDrawer';
import { MODULES } from '../../data/modulesData';
import { RiscvInstruction, HazardType, PipelineRegisterState } from '../../types/silicon';
import clsx from 'clsx';

interface RiscvPipelineVisualizerProps {
  onChallengeComplete?: (id: string) => void;
  completedChallenges?: Record<string, boolean>;
}

// Preset Programs
const PRESET_PROGRAMS: Record<
  string,
  { name: string; desc: string; instructions: RiscvInstruction[] }
> = {
  forwarding: {
    name: 'RAW Data Hazard & Forwarding',
    desc: 'Consecutive ALU instructions with data dependencies bypassed by EX/MEM forwarding units.',
    instructions: [
      { id: 1, pc: 0x100, asm: 'ADD x1, x2, x3', opcode: 'ADD', rd: 'x1', rs1: 'x2', rs2: 'x3' },
      { id: 2, pc: 0x104, asm: 'SUB x4, x1, x5', opcode: 'SUB', rd: 'x4', rs1: 'x1', rs2: 'x5' },
      { id: 3, pc: 0x108, asm: 'AND x6, x1, x4', opcode: 'AND', rd: 'x6', rs1: 'x1', rs2: 'x4' },
      { id: 4, pc: 0x10c, asm: 'OR  x7, x4, x6', opcode: 'OR', rd: 'x7', rs1: 'x4', rs2: 'x6' },
      { id: 5, pc: 0x110, asm: 'ADD x2, x7, x1', opcode: 'ADD', rd: 'x2', rs1: 'x7', rs2: 'x1' },
    ],
  },
  loaduse: {
    name: 'Load-Use Hazard & Bubble Stall',
    desc: 'LW instruction followed immediately by register consumer, forcing a 1-cycle hardware bubble.',
    instructions: [
      {
        id: 1,
        pc: 0x100,
        asm: 'LW  x1, 0(x2)',
        opcode: 'LW',
        rd: 'x1',
        rs1: 'x2',
        rs2: 'x0',
        imm: 0,
      },
      { id: 2, pc: 0x104, asm: 'ADD x3, x1, x4', opcode: 'ADD', rd: 'x3', rs1: 'x1', rs2: 'x4' },
      { id: 3, pc: 0x108, asm: 'SUB x5, x3, x6', opcode: 'SUB', rd: 'x5', rs1: 'x3', rs2: 'x6' },
      {
        id: 4,
        pc: 0x10c,
        asm: 'SW  x5, 4(x2)',
        opcode: 'SW',
        rd: 'x0',
        rs1: 'x2',
        rs2: 'x5',
        imm: 4,
      },
    ],
  },
  branch: {
    name: 'Branch Hazard & Pipeline Flush',
    desc: 'BEQ conditional branch evaluating taken, discarding speculative instructions in IF and ID stages.',
    instructions: [
      {
        id: 1,
        pc: 0x100,
        asm: 'ADD x1, x0, 5',
        opcode: 'ADD',
        rd: 'x1',
        rs1: 'x0',
        rs2: 'x0',
        imm: 5,
      },
      {
        id: 2,
        pc: 0x104,
        asm: 'ADD x2, x0, 5',
        opcode: 'ADD',
        rd: 'x2',
        rs1: 'x0',
        rs2: 'x0',
        imm: 5,
      },
      {
        id: 3,
        pc: 0x108,
        asm: 'BEQ x1, x2, +8',
        opcode: 'BEQ',
        rd: 'x0',
        rs1: 'x1',
        rs2: 'x2',
        imm: 8,
      },
      {
        id: 4,
        pc: 0x10c,
        asm: 'SUB x3, x1, x2 (Flushed)',
        opcode: 'SUB',
        rd: 'x3',
        rs1: 'x1',
        rs2: 'x2',
      },
      {
        id: 5,
        pc: 0x110,
        asm: 'OR  x4, x1, x2 (Flushed)',
        opcode: 'OR',
        rd: 'x4',
        rs1: 'x1',
        rs2: 'x2',
      },
      {
        id: 6,
        pc: 0x114,
        asm: 'ADD x5, x1, x2 (Target)',
        opcode: 'ADD',
        rd: 'x5',
        rs1: 'x1',
        rs2: 'x2',
      },
    ],
  },
};

export const RiscvPipelineVisualizer: React.FC<RiscvPipelineVisualizerProps> = ({
  onChallengeComplete,
  completedChallenges = {},
}) => {
  const moduleData = MODULES['riscv-pipeline'];

  // Active Program State
  const [selectedPreset, setSelectedPreset] = useState<string>('forwarding');
  const program = PRESET_PROGRAMS[selectedPreset].instructions;

  // Pipeline Registers
  const [cycle, setCycle] = useState<number>(1);
  const [pcIndex, setPcIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [clockSpeedHz] = useState<number>(2);

  // Hardware Pipeline Stages (IF, ID, EX, MEM, WB)
  const [ifReg, setIfReg] = useState<PipelineRegisterState>({ pc: 0x100, inst: program[0] });
  const [idReg, setIdReg] = useState<PipelineRegisterState>({ pc: 0, inst: null });
  const [exReg, setExReg] = useState<PipelineRegisterState>({ pc: 0, inst: null });
  const [memReg, setMemReg] = useState<PipelineRegisterState>({ pc: 0, inst: null });
  const [wbReg, setWbReg] = useState<PipelineRegisterState>({ pc: 0, inst: null });

  // Register File (x0 is hardwired to 0)
  const [registers, setRegisters] = useState<Record<string, number>>({
    x0: 0,
    x1: 0,
    x2: 10,
    x3: 20,
    x4: 0,
    x5: 4,
    x6: 0,
    x7: 0,
  });

  // Telemetry Metrics
  const [activeHazard, setActiveHazard] = useState<HazardType>('none');
  const [hazardLog, setHazardLog] = useState<string>(
    'Normal pipeline execution. No hazards detected.'
  );
  const [stallCount, setStallCount] = useState<number>(0);
  const [flushCount, setFlushCount] = useState<number>(0);
  const [retiredCount, setRetiredCount] = useState<number>(0);

  // History space-time matrix for visual diagram: cycle -> stage mapping
  const [historyMatrix, setHistoryMatrix] = useState<
    Array<{
      cycle: number;
      ifInst?: string;
      idInst?: string;
      exInst?: string;
      memInst?: string;
      wbInst?: string;
      hazard: string;
    }>
  >([]);

  // Reset Pipeline
  const handleReset = useCallback(() => {
    setCycle(1);
    setPcIndex(0);
    setIsRunning(false);
    setIfReg({ pc: program[0].pc, inst: program[0] });
    setIdReg({ pc: 0, inst: null });
    setExReg({ pc: 0, inst: null });
    setMemReg({ pc: 0, inst: null });
    setWbReg({ pc: 0, inst: null });
    setRegisters({
      x0: 0,
      x1: 0,
      x2: 10,
      x3: 20,
      x4: 0,
      x5: 4,
      x6: 0,
      x7: 0,
    });
    setActiveHazard('none');
    setHazardLog('Pipeline reset to Cycle 1.');
    setStallCount(0);
    setFlushCount(0);
    setRetiredCount(0);
    setHistoryMatrix([]);
  }, [program]);

  // Step Single Clock Cycle
  const handleStep = useCallback(() => {
    playTick();

    // 1. Check Hazards in current cycle before clock edge
    let currentHazard: HazardType = 'none';
    let hazardMessage = 'Normal execution. No data hazards.';

    // Check Load-Use Hazard:
    // If instruction in EX is LW and its rd matches rs1 or rs2 of instruction in ID
    const isLoadUse =
      exReg.inst &&
      exReg.inst.opcode === 'LW' &&
      idReg.inst &&
      exReg.inst.rd !== 'x0' &&
      (exReg.inst.rd === idReg.inst.rs1 || exReg.inst.rd === idReg.inst.rs2);

    // Check Branch Hazard:
    // If instruction in EX is BEQ and condition met (branch taken)
    const isBranchTaken =
      exReg.inst && exReg.inst.opcode === 'BEQ' && exReg.valRs1 === exReg.valRs2;

    if (isLoadUse) {
      currentHazard = 'load_use_stall';
      hazardMessage = `Load-Use Hazard on ${exReg.inst?.rd}! Injected 1 bubble stall into EX stage.`;
      setStallCount((s) => s + 1);
      playAlert();

      // Check challenge 2
      if (!completedChallenges['challenge-riscv-2']) {
        playSuccess();
        onChallengeComplete?.('challenge-riscv-2');
      }
    } else if (isBranchTaken) {
      currentHazard = 'branch_flush';
      hazardMessage = `Branch Taken! Flushed speculative instructions in IF and ID stages.`;
      setFlushCount((f) => f + 1);
      playAlert();
    } else {
      // Check Forwarding:
      // EX-to-EX forwarding
      const exToExRs1 =
        memReg.inst && memReg.inst.rd !== 'x0' && idReg.inst && memReg.inst.rd === idReg.inst.rs1;
      const exToExRs2 =
        memReg.inst && memReg.inst.rd !== 'x0' && idReg.inst && memReg.inst.rd === idReg.inst.rs2;

      // MEM-to-EX forwarding
      const memToExRs1 =
        wbReg.inst && wbReg.inst.rd !== 'x0' && idReg.inst && wbReg.inst.rd === idReg.inst.rs1;
      const memToExRs2 =
        wbReg.inst && wbReg.inst.rd !== 'x0' && idReg.inst && wbReg.inst.rd === idReg.inst.rs2;

      if (exToExRs1 || exToExRs2) {
        currentHazard = exToExRs1 ? 'forward_ex_rs1' : 'forward_ex_rs2';
        hazardMessage = `EX-to-EX Forwarding active for register ${memReg.inst?.rd} (ALU bypass).`;
        // Check challenge 1
        if (!completedChallenges['challenge-riscv-1']) {
          playSuccess();
          onChallengeComplete?.('challenge-riscv-1');
        }
      } else if (memToExRs1 || memToExRs2) {
        currentHazard = memToExRs1 ? 'forward_mem_rs1' : 'forward_mem_rs2';
        hazardMessage = `MEM-to-EX Forwarding active for register ${wbReg.inst?.rd} (Writeback bypass).`;
        if (!completedChallenges['challenge-riscv-1']) {
          playSuccess();
          onChallengeComplete?.('challenge-riscv-1');
        }
      }
    }

    setActiveHazard(currentHazard);
    setHazardLog(hazardMessage);

    // 2. Perform Writeback (WB) State Update
    if (wbReg.inst && wbReg.inst.rd !== 'x0' && wbReg.aluResult !== undefined) {
      setRegisters((prev) => ({
        ...prev,
        [wbReg.inst!.rd]: wbReg.aluResult!,
      }));
      setRetiredCount((r) => r + 1);
    }

    // 3. Advance Pipeline Registers on Clock Edge
    setCycle((c) => c + 1);

    // Record space-time matrix
    setHistoryMatrix((prev) => [
      ...prev,
      {
        cycle,
        ifInst: ifReg.inst?.asm,
        idInst: idReg.inst?.asm,
        exInst: exReg.isBubble ? 'BUBBLE' : exReg.inst?.asm,
        memInst: memReg.inst?.asm,
        wbInst: wbReg.inst?.asm,
        hazard: currentHazard,
      },
    ]);

    // Stage 5: WB <= MEM
    setWbReg({
      ...memReg,
    });

    // Stage 4: MEM <= EX
    let computedAluResult = 0;
    if (exReg.inst) {
      const op1 = exReg.valRs1 ?? 0;
      const op2 = exReg.valRs2 ?? 0;
      if (exReg.inst.opcode === 'ADD') computedAluResult = op1 + op2;
      else if (exReg.inst.opcode === 'SUB') computedAluResult = op1 - op2;
      else if (exReg.inst.opcode === 'AND') computedAluResult = op1 & op2;
      else if (exReg.inst.opcode === 'OR') computedAluResult = op1 | op2;
      else if (exReg.inst.opcode === 'LW') computedAluResult = op1 + (exReg.inst.imm ?? 0);
      else if (exReg.inst.opcode === 'SW') computedAluResult = op1 + (exReg.inst.imm ?? 0);
      else if (exReg.inst.opcode === 'BEQ') computedAluResult = op1 === op2 ? 1 : 0;
    }

    setMemReg({
      ...exReg,
      aluResult: computedAluResult,
    });

    // Stage 3: EX <= ID (or inject BUBBLE if Load-Use stall)
    if (isLoadUse) {
      // Bubble inserted into EX stage:
      setExReg({
        pc: 0,
        inst: null,
        isBubble: true,
      });
      // ID and IF are frozen (stall):
      return;
    } else if (isBranchTaken) {
      // Flush IF and ID
      setExReg({ pc: 0, inst: null, isBubble: true });
      setIdReg({ pc: 0, inst: null, isBubble: true });
      // Jump PC to target instruction (in branch preset, jump to index 5)
      setPcIndex(5);
      setIfReg({ pc: program[5].pc, inst: program[5] });
      return;
    } else {
      // Normal advance ID -> EX
      let r1Val = idReg.inst ? (registers[idReg.inst.rs1] ?? 0) : 0;
      let r2Val = idReg.inst ? (registers[idReg.inst.rs2] ?? 0) : 0;

      // Handle immediate values
      if (idReg.inst?.imm !== undefined && idReg.inst.opcode === 'ADD' && idReg.inst.rs2 === 'x0') {
        r2Val = idReg.inst.imm;
      }

      // Check Forwarding values:
      if (memReg.inst && memReg.inst.rd !== 'x0') {
        if (idReg.inst && memReg.inst.rd === idReg.inst.rs1) r1Val = computedAluResult;
        if (idReg.inst && memReg.inst.rd === idReg.inst.rs2) r2Val = computedAluResult;
      }
      if (wbReg.inst && wbReg.inst.rd !== 'x0') {
        if (idReg.inst && wbReg.inst.rd === idReg.inst.rs1) r1Val = wbReg.aluResult ?? r1Val;
        if (idReg.inst && wbReg.inst.rd === idReg.inst.rs2) r2Val = wbReg.aluResult ?? r2Val;
      }

      setExReg({
        ...idReg,
        valRs1: r1Val,
        valRs2: r2Val,
        isBubble: false,
      });
    }

    // Stage 2: ID <= IF
    setIdReg({
      ...ifReg,
      isBubble: false,
    });

    // Stage 1: IF <= Next Instruction
    const nextIdx = pcIndex + 1;
    if (nextIdx < program.length) {
      setPcIndex(nextIdx);
      setIfReg({ pc: program[nextIdx].pc, inst: program[nextIdx] });
    } else {
      setIfReg({ pc: 0x100 + nextIdx * 4, inst: null });
    }
  }, [
    cycle,
    pcIndex,
    program,
    ifReg,
    idReg,
    exReg,
    memReg,
    wbReg,
    registers,
    completedChallenges,
    onChallengeComplete,
  ]);

  // Stop auto-clock when user moves out of the browser tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsRunning(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Auto-Clock Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isRunning) {
      timer = setInterval(() => {
        handleStep();
      }, 1000 / clockSpeedHz);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, clockSpeedHz, handleStep]);

  // Preset Selection Change
  const handleSelectPreset = (key: string) => {
    playTick();
    setSelectedPreset(key);
    const newProg = PRESET_PROGRAMS[key].instructions;
    setCycle(1);
    setPcIndex(0);
    setIsRunning(false);
    setIfReg({ pc: newProg[0].pc, inst: newProg[0] });
    setIdReg({ pc: 0, inst: null });
    setExReg({ pc: 0, inst: null });
    setMemReg({ pc: 0, inst: null });
    setWbReg({ pc: 0, inst: null });
    setRegisters({
      x0: 0,
      x1: 0,
      x2: 10,
      x3: 20,
      x4: 0,
      x5: 4,
      x6: 0,
      x7: 0,
    });
    setActiveHazard('none');
    setHazardLog(`Loaded preset: ${PRESET_PROGRAMS[key].name}`);
    setStallCount(0);
    setFlushCount(0);
    setRetiredCount(0);
    setHistoryMatrix([]);
  };

  const cpi = retiredCount > 0 ? (cycle / retiredCount).toFixed(2) : '1.00';

  return (
    <div className="space-y-6">
      {/* Module Header Strip */}
      <div className="p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 uppercase">
              MODULE 13 • COMPUTER ARCHITECTURE &amp; VLSI
            </span>
            <span className="text-xs font-mono text-ink-muted">5-Stage Pipeline Hazard Unit</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink-light dark:text-ink-dark">
            RISC-V 5-Stage Pipelined Processor
          </h2>
          <p className="text-xs sm:text-sm font-serif italic text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Step through IF, ID, EX, MEM, and WB stages to observe hardware forwarding and load-use
            bubble insertion.
          </p>
        </div>

        {/* Telemetry Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-xs">
          <div className="p-2 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-center gap-2">
            <Binary className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-[10px] text-ink-muted block">Clock Cycle</span>
              <span className="font-bold text-ink-light dark:text-ink-dark">Cycle {cycle}</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-[10px] text-ink-muted block">CPI (Cycles/Inst)</span>
              <span className="font-bold text-ink-light dark:text-ink-dark">{cpi}</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-[10px] text-ink-muted block">Stalls / Flushes</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {stallCount} / {flushCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Program Presets & Controls */}
      <div className="p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-parchment-200 dark:border-parchment-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-mono font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider">
              Instruction Stream Presets
            </span>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStep}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Step Clock (+1)</span>
            </button>

            <button
              onClick={() => {
                playTick();
                setIsRunning(!isRunning);
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs',
                isRunning
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-parchment-200 dark:bg-parchment-800 text-ink-light dark:text-ink-dark hover:bg-parchment-300 dark:hover:bg-parchment-700'
              )}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Halt' : 'Auto Clock'}</span>
            </button>

            <button
              onClick={() => {
                playTick();
                handleReset();
              }}
              className="p-1.5 rounded-xl border border-parchment-300 dark:border-parchment-700 text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-parchment-200 dark:hover:bg-parchment-800 transition-all cursor-pointer"
              title="Reset Pipeline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(PRESET_PROGRAMS).map(([k, p]) => (
            <button
              key={k}
              onClick={() => handleSelectPreset(k)}
              className={clsx(
                'p-3 rounded-xl border text-left transition-all cursor-pointer',
                selectedPreset === k
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-300 shadow-xs'
                  : 'border-parchment-200 dark:border-parchment-800 hover:bg-parchment-100 dark:hover:bg-parchment-900 text-ink-muted'
              )}
            >
              <div className="font-mono text-xs font-bold text-ink-light dark:text-ink-dark mb-1">
                {p.name}
              </div>
              <div className="text-[11px] font-sans leading-snug">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hazard Status Alert Banner */}
      <div
        className={clsx(
          'p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs transition-colors',
          activeHazard === 'none'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
            : activeHazard.includes('forward')
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-800 dark:text-cyan-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
        )}
      >
        <div className="flex items-center gap-2">
          {activeHazard === 'none' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : activeHazard.includes('forward') ? (
            <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          )}
          <span className="font-bold">{hazardLog}</span>
        </div>
        <div className="text-[11px] opacity-80">
          Forwarding Unit: <strong className="uppercase">{activeHazard.replace(/_/g, ' ')}</strong>
        </div>
      </div>

      {/* 5-Stage Pipeline Block Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs">
        {/* Stage 1: IF */}
        <div className="p-3.5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-parchment-200 dark:border-parchment-800 pb-1.5">
            <span className="font-bold text-blue-600 dark:text-blue-400">1. IF</span>
            <span className="text-[10px] text-ink-muted">Instruction Fetch</span>
          </div>
          <div className="text-[11px] text-ink-muted">PC: 0x{ifReg.pc.toString(16)}</div>
          <div className="p-2 rounded-lg bg-parchment-100 dark:bg-parchment-950 font-bold text-ink-light dark:text-ink-dark min-h-[44px] flex items-center">
            {ifReg.inst ? (
              ifReg.inst.asm
            ) : (
              <span className="text-ink-muted font-normal italic">Empty</span>
            )}
          </div>
        </div>

        {/* Stage 2: ID */}
        <div className="p-3.5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-parchment-200 dark:border-parchment-800 pb-1.5">
            <span className="font-bold text-purple-600 dark:text-purple-400">2. ID</span>
            <span className="text-[10px] text-ink-muted">Decode &amp; Regs</span>
          </div>
          <div className="text-[11px] text-ink-muted">
            {idReg.inst ? `rs1:${idReg.inst.rs1} • rs2:${idReg.inst.rs2}` : 'Idle'}
          </div>
          <div className="p-2 rounded-lg bg-parchment-100 dark:bg-parchment-950 font-bold text-ink-light dark:text-ink-dark min-h-[44px] flex items-center">
            {idReg.inst ? (
              idReg.inst.asm
            ) : (
              <span className="text-ink-muted font-normal italic">Empty</span>
            )}
          </div>
        </div>

        {/* Stage 3: EX */}
        <div className="p-3.5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-2 shadow-xs relative overflow-hidden">
          {exReg.isBubble && (
            <div className="absolute top-1 right-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider animate-pulse">
              BUBBLE
            </div>
          )}
          <div className="flex items-center justify-between border-b border-parchment-200 dark:border-parchment-800 pb-1.5">
            <span className="font-bold text-amber-600 dark:text-amber-400">3. EX</span>
            <span className="text-[10px] text-ink-muted">Execute / ALU</span>
          </div>
          <div className="text-[11px] text-ink-muted">
            {exReg.inst
              ? `A:${exReg.valRs1} • B:${exReg.valRs2}`
              : exReg.isBubble
                ? 'Stall Bubble'
                : 'Idle'}
          </div>
          <div
            className={clsx(
              'p-2 rounded-lg font-bold min-h-[44px] flex items-center',
              exReg.isBubble
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300'
                : 'bg-parchment-100 dark:bg-parchment-950 text-ink-light dark:text-ink-dark'
            )}
          >
            {exReg.isBubble ? (
              'NOP (STALL BUBBLE)'
            ) : exReg.inst ? (
              exReg.inst.asm
            ) : (
              <span className="text-ink-muted font-normal italic">Empty</span>
            )}
          </div>
        </div>

        {/* Stage 4: MEM */}
        <div className="p-3.5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-parchment-200 dark:border-parchment-800 pb-1.5">
            <span className="font-bold text-cyan-600 dark:text-cyan-400">4. MEM</span>
            <span className="text-[10px] text-ink-muted">Memory Access</span>
          </div>
          <div className="text-[11px] text-ink-muted">
            {memReg.aluResult !== undefined ? `Result: ${memReg.aluResult}` : 'Idle'}
          </div>
          <div className="p-2 rounded-lg bg-parchment-100 dark:bg-parchment-950 font-bold text-ink-light dark:text-ink-dark min-h-[44px] flex items-center">
            {memReg.inst ? (
              memReg.inst.asm
            ) : (
              <span className="text-ink-muted font-normal italic">Empty</span>
            )}
          </div>
        </div>

        {/* Stage 5: WB */}
        <div className="p-3.5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-parchment-200 dark:border-parchment-800 pb-1.5">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">5. WB</span>
            <span className="text-[10px] text-ink-muted">Writeback</span>
          </div>
          <div className="text-[11px] text-ink-muted">
            {wbReg.inst && wbReg.inst.rd !== 'x0' ? `Commit: ${wbReg.inst.rd}` : 'Idle'}
          </div>
          <div className="p-2 rounded-lg bg-parchment-100 dark:bg-parchment-950 font-bold text-ink-light dark:text-ink-dark min-h-[44px] flex items-center">
            {wbReg.inst ? (
              wbReg.inst.asm
            ) : (
              <span className="text-ink-muted font-normal italic">Empty</span>
            )}
          </div>
        </div>
      </div>

      {/* Architectural Register File & Execution Space-Time Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Left: General Purpose Registers (x0 to x7) */}
        <div className="lg:col-span-5 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-parchment-200 dark:border-parchment-800 pb-2.5">
            <h4 className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              Architectural Register File (32-bit RV32I)
            </h4>
            <span className="text-[10px] text-ink-muted">Dual-Read, Single-Write</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {Object.entries(registers).map(([reg, val]) => (
              <div
                key={reg}
                className={clsx(
                  'p-2 rounded-xl border text-center transition-all',
                  wbReg.inst && wbReg.inst.rd === reg
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'bg-parchment-100 dark:bg-parchment-950 border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark'
                )}
              >
                <div className="text-[10px] text-ink-muted font-semibold">{reg}</div>
                <div className="text-sm font-bold">{val}</div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-ink-muted dark:text-ink-darkMuted leading-relaxed pt-1">
            Register <code>x0</code> is hardwired to zero in the RISC-V ISA. Register writes in
            stage 5 commit synchronously on the rising clock edge.
          </div>
        </div>

        {/* Right: Space-Time Pipeline Execution Grid */}
        <div className="lg:col-span-7 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-parchment-200 dark:border-parchment-800 pb-2.5">
            <h4 className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Pipeline Space-Time Reservation Matrix
            </h4>
            <span className="text-[10px] text-ink-muted">Recent Clock Cycles</span>
          </div>

          {historyMatrix.length === 0 ? (
            <div className="p-6 text-center text-ink-muted font-serif italic text-xs">
              Click &quot;Step Clock (+1)&quot; or &quot;Auto Clock&quot; to begin advancing
              instructions through the pipeline stages.
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar max-h-48">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-parchment-200 dark:border-parchment-800 text-ink-muted">
                    <th className="py-1 px-2 font-bold">Cyc</th>
                    <th className="py-1 px-2 text-blue-600 dark:text-blue-400">IF</th>
                    <th className="py-1 px-2 text-purple-600 dark:text-purple-400">ID</th>
                    <th className="py-1 px-2 text-amber-600 dark:text-amber-400">EX</th>
                    <th className="py-1 px-2 text-cyan-600 dark:text-cyan-400">MEM</th>
                    <th className="py-1 px-2 text-emerald-600 dark:text-emerald-400">WB</th>
                  </tr>
                </thead>
                <tbody>
                  {historyMatrix.slice(-6).map((h) => (
                    <tr
                      key={h.cycle}
                      className="border-b border-parchment-100 dark:border-parchment-800/40 hover:bg-parchment-100/50 dark:hover:bg-parchment-900/50"
                    >
                      <td className="py-1 px-2 font-bold text-ink-muted">{h.cycle}</td>
                      <td className="py-1 px-2 truncate max-w-[100px]">{h.ifInst || '—'}</td>
                      <td className="py-1 px-2 truncate max-w-[100px]">{h.idInst || '—'}</td>
                      <td
                        className={clsx(
                          'py-1 px-2 truncate max-w-[100px] font-semibold',
                          h.exInst === 'BUBBLE' ? 'text-amber-500 font-bold' : ''
                        )}
                      >
                        {h.exInst || '—'}
                      </td>
                      <td className="py-1 px-2 truncate max-w-[100px]">{h.memInst || '—'}</td>
                      <td className="py-1 px-2 truncate max-w-[100px] text-emerald-600 dark:text-emerald-400">
                        {h.wbInst || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Challenges Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted font-bold">
            Interactive Processor Pipeline Challenges
          </h4>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            {moduleData.challenges.filter((c) => completedChallenges[c.id]).length} /{' '}
            {moduleData.challenges.length} Solved
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleData.challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              isCompleted={!!completedChallenges[c.id]}
              onComplete={(id) => onChallengeComplete?.(id)}
              accentColor="silicon"
            />
          ))}
        </div>
      </div>

      {/* Architecture Deep Dive Drawer */}
      <ExplanationDrawer module={moduleData} />
    </div>
  );
};
