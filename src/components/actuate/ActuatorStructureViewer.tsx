import React, { useState, useEffect } from 'react';
import { Cog, Sliders, Layers, Zap, Flame, Activity, Info, Compass } from 'lucide-react';
import { playTick } from '../../lib/sound';
import clsx from 'clsx';

interface ActuatorPart {
  id: string;
  name: string;
  category: 'casing' | 'motor' | 'gearing' | 'sensor' | 'electronics';
  material: string;
  role: string;
  specs: string;
  tolerances: string;
  failureMode: string;
  color: string;
  assembledX: number;
  explodedX: number;
  width: number;
}

const ACTUATOR_PARTS: ActuatorPart[] = [
  {
    id: 'casing',
    name: 'CNC Aluminum Housing & Heat Sink Fins',
    category: 'casing',
    material: 'Anodized Aircraft Aluminum 7075-T6',
    role: 'Rigid structural enclosure protecting internal electronics and dissipating motor stator Joule heating.',
    specs: 'Thermal resistance: 1.2 °C/W, IP65 ingress seal',
    tolerances: '±5 µm bearing bore concentricity',
    failureMode: 'Thermal throttling under sustained payload overload; bearing bore fretting.',
    color: '#64748b',
    assembledX: 30,
    explodedX: 20,
    width: 35,
  },
  {
    id: 'electronics',
    name: 'Integrated FOC Inverter & Driver PCB',
    category: 'electronics',
    material: 'FR4 Multi-Layer PCB with 6x GaN / MOSFET H-Bridge',
    role: 'Field-Oriented Control (FOC) microcontroller generating 3-phase SVPWM currents to regulate joint torque.',
    specs: 'Operating Bus: 48V DC, Peak Current: 40A, 25 kHz PWM',
    tolerances: '0.1% current shunt resistance accuracy',
    failureMode:
      'MOSFET punch-through on high-voltage inductive kickback; gate-driver desaturation.',
    color: '#10b981',
    assembledX: 70,
    explodedX: 75,
    width: 25,
  },
  {
    id: 'encoder',
    name: 'High-Resolution 19-Bit Optical Encoder Disk',
    category: 'sensor',
    material: 'Chrome-on-Glass Precision Code Wheel & Dual Photodiode Array',
    role: 'Measures absolute shaft position at sub-milliradian precision for real-time PID feedback and commutation.',
    specs: '524,288 counts per revolution (0.00068° resolution)',
    tolerances: 'Radial runout < 2 µm',
    failureMode:
      'Dust / lubricant contamination on optical grating; optical read-head misalignment.',
    color: '#f59e0b',
    assembledX: 100,
    explodedX: 120,
    width: 20,
  },
  {
    id: 'stator',
    name: '12-Slot Stator Core & Copper Phase Windings',
    category: 'motor',
    material: 'Low-Loss Silicon Steel Laminations (0.2mm) & Class-H Copper Wire',
    role: 'Carries U, V, W alternating phase currents, establishing rotating electromagnetic flux in the airgap.',
    specs: 'Phase Resistance: 0.18 Ω, Inductance: 0.32 mH',
    tolerances: 'Airgap clearance: 0.35 mm ± 0.05 mm',
    failureMode:
      'Inter-turn winding short-circuit caused by thermal insulation degradation above 180°C.',
    color: '#ea580c',
    assembledX: 125,
    explodedX: 165,
    width: 50,
  },
  {
    id: 'rotor',
    name: '14-Pole Neodymium Magnet Rotor Assembly',
    category: 'motor',
    material: 'NdFeB N52H Permanent Magnets & Titanium Rotor Cup',
    role: 'Interacts with stator electromagnetic flux to produce direct rotational shaft torque (Lorentz force).',
    specs: 'Remanence Br: 1.45 Tesla, Rotor Inertia: 0.00045 kg·m²',
    tolerances: 'Dynamic balancing: ISO G1.0 grade',
    failureMode:
      'Thermal demagnetization if temperature exceeds Curie point (150°C); magnet adhesive peeling.',
    color: '#3b82f6',
    assembledX: 180,
    explodedX: 235,
    width: 45,
  },
  {
    id: 'harmonic-drive',
    name: 'Precision Harmonic Drive (Strain Wave Gearing)',
    category: 'gearing',
    material: 'SNCM439 High-Tensile Alloy Steel & Flexible Ball Bearing',
    role: 'Zero-backlash speed reduction and 50:1 torque amplification (Wave Generator + Flexspline + Circular Spline).',
    specs: 'Gear Ratio: 50:1, Backlash: < 0.1 arc-min, Rated Torque: 80 Nm',
    tolerances: 'Tooth profile pitch error < 1.5 µm',
    failureMode:
      'Flexspline cyclic fatigue tooth fracture under extreme shock loading or improper lubrication.',
    color: '#8b5cf6',
    assembledX: 230,
    explodedX: 300,
    width: 55,
  },
  {
    id: 'output-flange',
    name: 'Dual Cross-Roller Bearing & Output Flange',
    category: 'casing',
    material: 'Case-Hardened Carbon-Chromium Bearing Steel GCr15',
    role: 'Supports combined axial, radial, and moment loads while coupling amplified torque to the downstream robot link.',
    specs: 'Dynamic Load Rating: 14.5 kN, Moment Rigidity: 120 Nm/arcmin',
    tolerances: 'Axial runout < 3 µm',
    failureMode: 'Roller brinelling / pitting under shock impacts; seal rupture.',
    color: '#06b6d4',
    assembledX: 290,
    explodedX: 375,
    width: 35,
  },
];

const ROBOT_ARM_JOINTS = [
  {
    id: 'j1-base',
    name: 'Joint 1: Base Turret Azimuth',
    type: 'Harmonic 100:1 Actuator',
    ratedTorque: '120 Nm',
    maxSpeed: '180 °/s',
    role: 'Rotates entire arm around vertical axis; supports cantilevered arm gravity moments.',
  },
  {
    id: 'j2-shoulder',
    name: 'Joint 2: Shoulder Pitch Joint',
    type: 'High-Torque 120:1 Actuator + Brake',
    ratedTorque: '210 Nm',
    maxSpeed: '120 °/s',
    role: 'Lifts entire payload against gravity; features mechanical electromagnetic safety brake.',
  },
  {
    id: 'j3-elbow',
    name: 'Joint 3: Elbow Pitch Joint',
    type: 'Compact 80:1 Harmonic Actuator',
    ratedTorque: '90 Nm',
    maxSpeed: '180 °/s',
    role: 'Controls forward reach and extension; high acceleration dynamic moves.',
  },
  {
    id: 'j4-wrist-pitch',
    name: 'Joint 4: Wrist Pitch Joint',
    type: 'Miniature 50:1 Actuator',
    ratedTorque: '35 Nm',
    maxSpeed: '240 °/s',
    role: 'Elevates tool pitch angle for orientation control.',
  },
  {
    id: 'j5-wrist-yaw',
    name: 'Joint 5: Wrist Yaw Joint',
    type: 'Miniature 50:1 Actuator',
    ratedTorque: '25 Nm',
    maxSpeed: '270 °/s',
    role: 'Lateral orientation adjustment before object grasping.',
  },
  {
    id: 'j6-wrist-roll',
    name: 'Joint 6: Tool Flange Continuous Roll',
    type: 'Ultra-Compact Hollow-Shaft Actuator',
    ratedTorque: '15 Nm',
    maxSpeed: '360 °/s',
    role: 'Infinite continuous tool rotation with slip-ring cable feedthrough.',
  },
];

interface ActuatorStructureViewerProps {
  tutorialAction?: { actionType: string; params: any; timestamp: number } | null;
}

export const ActuatorStructureViewer: React.FC<ActuatorStructureViewerProps> = ({
  tutorialAction,
}) => {
  const [activeTab, setActiveTab] = useState<
    'exploded' | 'gearing' | 'kinematics' | 'energy' | 'foc' | 'benchmarks'
  >('exploded');
  const [explodeSlider, setExplodeSlider] = useState<number>(65); // 0% assembled to 100% exploded
  const [selectedPartId, setSelectedPartId] = useState<string>('harmonic-drive');
  const [selectedJointId, setSelectedJointId] = useState<string>('j2-shoulder');

  // FOC & SVPWM Commutation State
  const [focAngle, setFocAngle] = useState<number>(45); // Electrical angle 0-360 deg
  const [focIq, setFocIq] = useState<number>(18); // Torque current 0-30 A
  const [focId, setFocId] = useState<number>(0); // Direct flux current -10 to +10 A

  // Gearing & Thermal Simulator State
  const [motorRpm, setMotorRpm] = useState<number>(3000);
  const [motorTorqueNm, setMotorTorqueNm] = useState<number>(1.2);
  const [gearRatio, setGearRatio] = useState<number>(80);
  const [ambientTemp, setAmbientTemp] = useState<number>(25); // °C
  const [isMotorSpinning, setIsMotorSpinning] = useState<boolean>(true);

  // Apply Tutorial Action from Robotics Tutorial Deck
  useEffect(() => {
    if (!tutorialAction || tutorialAction.actionType !== 'actuator') return;
    const p = tutorialAction.params;
    if (p.tab !== undefined) setActiveTab(p.tab);
    if (p.explode !== undefined) setExplodeSlider(p.explode);
    if (p.part !== undefined) setSelectedPartId(p.part);
    if (p.motorRpm !== undefined) setMotorRpm(p.motorRpm);
    if (p.motorTorque !== undefined) setMotorTorqueNm(p.motorTorque);
    if (p.gearRatio !== undefined) setGearRatio(p.gearRatio);
    setIsMotorSpinning(true);
  }, [tutorialAction]);

  // Stop animations when user moves out of the browser tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsMotorSpinning(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Physics Calculations:
  // Mechanical efficiency decreases slightly at extreme loads (0.85 nominal)
  const efficiency = 0.85;
  const outputTorqueNm = motorTorqueNm * gearRatio * efficiency;
  const outputRpm = motorRpm / gearRatio;
  const outputDegPerSec = outputRpm * 6; // 1 RPM = 360 deg / 60s = 6 deg/s
  const inputPowerW = (motorTorqueNm * (motorRpm * 2 * Math.PI)) / 60;
  const outputPowerW = (outputTorqueNm * (outputRpm * 2 * Math.PI)) / 60;
  const heatLossW = Math.max(0, inputPowerW - outputPowerW);
  // Thermal resistance Rth = 1.2 °C/W
  const jointTempC = ambientTemp + heatLossW * 0.95;

  const selectedPart = ACTUATOR_PARTS.find((p) => p.id === selectedPartId) || ACTUATOR_PARTS[0];

  const handleSelectPart = (id: string) => {
    playTick();
    setSelectedPartId(id);
  };

  const handleSelectJoint = (id: string) => {
    playTick();
    setSelectedJointId(id);
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/90 dark:bg-parchment-900/90 shadow-xs space-y-6">
      {/* Structural Header & Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              PHYSICAL ACTUATOR ANATOMY
            </span>
            <span className="text-xs font-mono text-ink-muted dark:text-ink-darkMuted">
              ROBOTIC JOINTS, HARMONIC GEARING &amp; KINEMATICS
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-ink-light dark:text-ink-dark tracking-tight">
            Robotic Actuator Structure &amp; Kinematics
          </h2>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-1 max-w-2xl font-sans">
            Inspect the internal electromechanical anatomy of a robotic servo joint: from BLDC
            stator coils and NdFeB magnet rotors down to zero-backlash harmonic drive strain wave
            gears.
          </p>
        </div>

        {/* View mode segmented buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800 text-xs font-mono overflow-x-auto no-scrollbar shrink-0 max-w-full">
          <button
            onClick={() => {
              playTick();
              setActiveTab('exploded');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'exploded'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Exploded Joint View</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('gearing');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'gearing'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Cog className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Harmonic Drive &amp; Thermal</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('kinematics');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'kinematics'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>6-DOF Manipulator Chain</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('energy');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'energy'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Flux &amp; Torque Flow</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('foc');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'foc'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>FOC &amp; SVPWM Inverter</span>
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('benchmarks');
            }}
            className={clsx(
              'btn-pop px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'benchmarks'
                ? 'bg-white dark:bg-parchment-800 text-ink-light dark:text-ink-dark font-bold shadow-xs border border-parchment-300 dark:border-parchment-700'
                : 'text-ink-muted dark:text-ink-darkMuted hover:text-ink-light'
            )}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Industrial Benchmarks</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Exploded Joint Actuator Anatomy */}
      {activeTab === 'exploded' && (
        <div className="space-y-6">
          {/* Explode Scrubber Slider Bar */}
          <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink-light dark:text-ink-dark uppercase">
                Joint Assembly State:
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {explodeSlider}% Exploded
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-72">
              <span className="text-[10px] text-ink-muted">Assembled</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={explodeSlider}
                onChange={(e) => setExplodeSlider(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-ink-muted">Exploded</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Exploded Mechanical CAD View (7 cols) */}
            <div className="lg:col-span-7 p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-slate-950 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>TACTILE CAD ASSEMBLY (BLDC + HARMONIC GEARING + ENCODER)</span>
                <span className="text-amber-400 font-bold">Zero-Backlash Servo</span>
              </div>

              {/* Exploded Actuator SVG Diagram */}
              <div className="w-full bg-slate-900 rounded-xl p-3 border border-slate-800 relative overflow-x-auto shadow-inner">
                <svg viewBox="0 0 460 220" className="w-full h-auto select-none">
                  {/* Central Axis Guide Line */}
                  <line
                    x1="10"
                    y1="110"
                    x2="450"
                    y2="110"
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />

                  {/* Render Each Part with Dynamic Explode Offsets */}
                  {ACTUATOR_PARTS.map((part) => {
                    const isSelected = part.id === selectedPartId;
                    const factor = explodeSlider / 100;
                    // Interpolate between assembledX and explodedX
                    const currentX = part.assembledX + (part.explodedX - part.assembledX) * factor;

                    return (
                      <g
                        key={part.id}
                        onClick={() => handleSelectPart(part.id)}
                        className="cursor-pointer transition-transform duration-200"
                      >
                        {/* Part Body */}
                        <rect
                          x={currentX}
                          y={50}
                          width={part.width}
                          height={120}
                          rx="4"
                          fill={isSelected ? `${part.color}90` : `${part.color}40`}
                          stroke={part.color}
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          className="hover:opacity-100 transition-opacity"
                        />
                        {/* Center Hub Bore */}
                        <rect
                          x={currentX + 2}
                          y={85}
                          width={part.width - 4}
                          height={50}
                          fill="#0f172a"
                          opacity="0.7"
                          stroke={part.color}
                          strokeWidth="0.5"
                        />
                        {/* Label */}
                        <text
                          x={currentX + part.width / 2}
                          y={35}
                          textAnchor="middle"
                          fontSize="8"
                          fill={isSelected ? '#ffffff' : '#94a3b8'}
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {part.name.split(' ')[0]}
                        </text>
                        {/* Connecting Line to Axis */}
                        <line
                          x1={currentX + part.width / 2}
                          y1="40"
                          x2={currentX + part.width / 2}
                          y2="50"
                          stroke={part.color}
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Click any component along the shaft axis to inspect tolerances</span>
                <span className="text-amber-500 font-semibold">50:1 Reduction Ratio</span>
              </div>
            </div>

            {/* Right: Component Spec Inspector (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 font-mono space-y-4">
              <div>
                <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
                  Actuator Component Anatomy
                </span>
                <h3 className="text-base font-bold text-ink-light dark:text-ink-dark mt-0.5">
                  {selectedPart.name}
                </h3>
                <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-1 leading-relaxed font-sans">
                  {selectedPart.role}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800/80">
                  <span className="text-ink-muted">Material Grade:</span>
                  <span className="font-bold text-ink-light dark:text-ink-dark">
                    {selectedPart.material}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800/80">
                  <span className="text-ink-muted">Operating Rating:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedPart.specs}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-parchment-100 dark:border-parchment-800/80">
                  <span className="text-ink-muted">Machining Tolerance:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {selectedPart.tolerances}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-ink-muted">Critical Failure Mode:</span>
                  <span
                    className="font-bold text-rose-600 dark:text-rose-400 truncate max-w-[200px]"
                    title={selectedPart.failureMode}
                  >
                    {selectedPart.failureMode}
                  </span>
                </div>
              </div>

              {/* Engineering callout */}
              <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 text-[11px] leading-relaxed text-ink-muted">
                <div className="flex items-center gap-1.5 font-bold text-ink-light dark:text-ink-dark mb-1">
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                  <span>Why Harmonic Drive Gearing?</span>
                </div>
                <span>
                  Traditional planetary gearboxes suffer from mechanical backlash (slack between
                  gear teeth), causing PID controllers to ring and buzz during precision
                  positioning. Strain-wave harmonic drives engage ~30% of teeth simultaneously,
                  delivering zero backlash and sub-arcminute pointing precision.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Harmonic Drive Strain Wave Gearing & Thermal Simulator */}
      {activeTab === 'gearing' && (
        <div className="space-y-6">
          {/* Controls & KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 font-mono text-xs">
            <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
              <div className="text-[10px] text-ink-muted uppercase">Output Joint Torque</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {outputTorqueNm.toFixed(1)} Nm
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                Ratio: {gearRatio}:1 (η = 85%)
              </div>
            </div>

            <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
              <div className="text-[10px] text-ink-muted uppercase">Joint Angular Velocity</div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                {outputDegPerSec.toFixed(0)} °/s
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                {outputRpm.toFixed(1)} RPM at joint flange
              </div>
            </div>

            <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
              <div className="text-[10px] text-ink-muted uppercase">Power Transfer</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {outputPowerW.toFixed(0)} W
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                Input: {inputPowerW.toFixed(0)}W | Loss: {heatLossW.toFixed(0)}W
              </div>
            </div>

            <div className="p-3 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
              <div className="text-[10px] text-ink-muted uppercase">Joint Temperature</div>
              <div
                className={clsx(
                  'text-lg font-bold mt-0.5',
                  jointTempC > 85
                    ? 'text-rose-600 dark:text-rose-400'
                    : jointTempC > 70
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {jointTempC.toFixed(1)} °C
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                {jointTempC > 85 ? '⚠ THERMAL THROTTLING' : 'Normal Operating Range'}
              </div>
            </div>
          </div>

          {/* Interactive Mechanical & Thermal Canvas Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Harmonic Drive Dynamic Cross-Section (7 cols) */}
            <div className="lg:col-span-7 p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-slate-950 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>HARMONIC DRIVE (STRAIN WAVE) INTERNAL MESH</span>
                <span className="text-purple-400 font-bold">Zero Backlash</span>
              </div>

              {/* Strain Wave Gearing Animated SVG */}
              <div className="w-full bg-slate-900 rounded-xl p-4 border border-slate-800 relative flex items-center justify-center overflow-hidden">
                <svg viewBox="-140 -140 280 280" className="w-64 h-64 sm:w-72 sm:h-72 select-none">
                  <defs>
                    <radialGradient id="thermal-grad" cx="50%" cy="50%" r="50%">
                      <stop
                        offset="0%"
                        stopColor="#ef4444"
                        stopOpacity={Math.min(0.8, (jointTempC - 20) / 80)}
                      />
                      <stop
                        offset="60%"
                        stopColor="#f59e0b"
                        stopOpacity={Math.min(0.4, (jointTempC - 20) / 100)}
                      />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                    </radialGradient>
                  </defs>

                  {/* Heat dissipation halo */}
                  <circle cx="0" cy="0" r="130" fill="url(#thermal-grad)" />

                  {/* Outer Stationary Circular Spline (Rigid Ring) */}
                  <circle
                    cx="0"
                    cy="0"
                    r="115"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="18"
                    strokeDasharray="3 3"
                  />
                  <circle cx="0" cy="0" r="124" fill="none" stroke="#64748b" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="106" fill="none" stroke="#64748b" strokeWidth="1" />

                  {/* Flexible Cup (Flexspline) - Elliptically Deflected */}
                  <g>
                    <ellipse
                      cx="0"
                      cy="0"
                      rx="106"
                      ry="94"
                      fill="#1e293b"
                      stroke="#8b5cf6"
                      strokeWidth="3"
                    />
                    {/* Gear Teeth indications on major axis */}
                    <circle cx="0" cy="-104" r="3" fill="#a855f7" />
                    <circle cx="0" cy="104" r="3" fill="#a855f7" />
                    {/* Disengaged gaps on minor axis */}
                    <circle cx="-94" cy="0" r="2" fill="#64748b" opacity="0.5" />
                    <circle cx="94" cy="0" r="2" fill="#64748b" opacity="0.5" />
                  </g>

                  {/* Inner Elliptical Wave Generator (Cam + Bearing) */}
                  <g
                    className={activeTab === 'gearing' && isMotorSpinning ? 'animate-spin' : ''}
                    style={{ animationDuration: `${Math.max(0.4, 60 / (motorRpm / 20))}s` }}
                  >
                    <ellipse
                      cx="0"
                      cy="0"
                      rx="90"
                      ry="76"
                      fill="#0f172a"
                      stroke="#f59e0b"
                      strokeWidth="3"
                    />
                    {/* High-speed motor shaft core */}
                    <circle cx="0" cy="0" r="28" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx="0" cy="0" r="6" fill="#38bdf8" />
                    {/* Keyway slot */}
                    <rect x="-3" y="-28" width="6" height="8" fill="#e2e8f0" />
                    {/* Ball bearings in elliptical race */}
                    {Array.from({ length: 12 }).map((_, i) => {
                      const ang = (i * 30 * Math.PI) / 180;
                      const bx = 83 * Math.cos(ang);
                      const by = 70 * Math.sin(ang);
                      return (
                        <circle
                          key={i}
                          cx={bx}
                          cy={by}
                          r="4"
                          fill="#cbd5e1"
                          stroke="#475569"
                          strokeWidth="0.5"
                        />
                      );
                    })}
                  </g>

                  {/* Callout text labels */}
                  <text
                    x="0"
                    y="-126"
                    textAnchor="middle"
                    fontSize="8"
                    fill="#94a3b8"
                    fontFamily="monospace"
                  >
                    CIRCULAR SPLINE (STATIONARY 100T)
                  </text>
                  <text
                    x="0"
                    y="132"
                    textAnchor="middle"
                    fontSize="8"
                    fill="#a855f7"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    FLEXSPLINE (OUTPUT 98T - 2 FEWER TEETH)
                  </text>
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Wave Generator rotates at motor shaft speed</span>
                <span className="text-purple-400 font-semibold">
                  {motorRpm} RPM input → {outputRpm.toFixed(1)} RPM output
                </span>
              </div>
            </div>

            {/* Right: Interactive Tuning Knobs & Heat Dissipation (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50/80 dark:bg-parchment-950/60 font-mono space-y-4">
              <div>
                <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
                  Electro-Mechanical Powertrain Sliders
                </span>
                <h3 className="text-base font-bold text-ink-light dark:text-ink-dark mt-0.5">
                  Torque Amplification &amp; Thermal Dissipation
                </h3>
              </div>

              {/* Sliders */}
              <div className="space-y-3.5 text-xs">
                {/* Motor RPM & Play/Pause */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-ink-muted">Motor Speed (RPM):</span>
                      <button
                        onClick={() => {
                          playTick();
                          setIsMotorSpinning(!isMotorSpinning);
                        }}
                        className={clsx(
                          'px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all',
                          isMotorSpinning
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                            : 'bg-parchment-200 dark:bg-parchment-800 text-ink-muted border-parchment-300'
                        )}
                        title={isMotorSpinning ? 'Pause Motor' : 'Start Motor'}
                      >
                        {isMotorSpinning ? 'Pause' : 'Start'}
                      </button>
                    </div>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {motorRpm} RPM
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="100"
                    value={motorRpm}
                    onChange={(e) => {
                      playTick();
                      setMotorRpm(Number(e.target.value));
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Motor Torque */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-ink-muted">Motor Shaft Torque:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {motorTorqueNm.toFixed(2)} Nm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={motorTorqueNm}
                    onChange={(e) => {
                      playTick();
                      setMotorTorqueNm(Number(e.target.value));
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Gear Ratio */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-ink-muted">Harmonic Gear Ratio:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {gearRatio}:1
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[50, 80, 100, 160].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => {
                          playTick();
                          setGearRatio(ratio);
                        }}
                        className={clsx(
                          'py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                          gearRatio === ratio
                            ? 'border-amber-400 bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-xs'
                            : 'border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-900 text-ink-muted hover:text-ink-light'
                        )}
                      >
                        {ratio}:1
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ambient Temp */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-ink-muted">Ambient Environment Temp:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {ambientTemp} °C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="50"
                    step="1"
                    value={ambientTemp}
                    onChange={(e) => {
                      playTick();
                      setAmbientTemp(Number(e.target.value));
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Engineering insight */}
              <div className="p-3 rounded-xl bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 text-[11px] leading-relaxed text-ink-muted space-y-1">
                <div className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  <span>The Thermal Bottleneck in High-Density Robotics</span>
                </div>
                <div>
                  BLDC motors produce maximum power at thousands of RPM, but robot arms require
                  slow, tremendous joint torques. Harmonic drives bridge this with compact 80:1 to
                  160:1 gear reduction. However, 15% of mechanical power converts directly into heat
                  via strain-wave friction. Without proper aluminum casing heat-sinking, prolonged
                  torque stalls induce thermal runaway!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 6-DOF Manipulator Chain */}
      {activeTab === 'kinematics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROBOT_ARM_JOINTS.map((joint) => {
              const isSelected = joint.id === selectedJointId;
              return (
                <div
                  key={joint.id}
                  onClick={() => handleSelectJoint(joint.id)}
                  className={clsx(
                    'p-5 rounded-2xl border font-mono text-xs space-y-3 cursor-pointer transition-all',
                    isSelected
                      ? 'border-amber-400 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs'
                      : 'border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 hover:border-parchment-300'
                  )}
                >
                  <div className="flex items-center justify-between text-ink-muted">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                      {joint.name.split(':')[0]}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-parchment-200 dark:bg-parchment-800 text-ink-muted">
                      {joint.type.split(' ')[0]}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                    {joint.name.split(':')[1]}
                  </h4>

                  <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                    {joint.role}
                  </p>

                  <div className="pt-2 border-t border-parchment-200 dark:border-parchment-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Peak Torque:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {joint.ratedTorque}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Max Velocity:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {joint.maxSpeed}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: Flux & Torque Flow (Electromechanical Energy Cascade) */}
      {activeTab === 'energy' &&
        (() => {
          const motorRadPerSec = (motorRpm * 2 * Math.PI) / 60;
          const mechPowerIn = motorTorqueNm * motorRadPerSec;
          const inverterLossW = Math.max(4, 0.04 * mechPowerIn + 6);
          const copperLossW = Math.max(6, 0.075 * mechPowerIn + 8);
          const totalElecPowerIn = mechPowerIn + inverterLossW + copperLossW;
          const gearboxLossW = mechPowerIn * (1 - efficiency);
          const usefulOutputPowerW = outputTorqueNm * ((outputRpm * 2 * Math.PI) / 60);
          const overallEfficiencyPct =
            totalElecPowerIn > 0
              ? Math.min(92, Math.max(10, (usefulOutputPowerW / totalElecPowerIn) * 100))
              : 0;

          const invPct = ((inverterLossW / totalElecPowerIn) * 100).toFixed(1);
          const copperPct = ((copperLossW / totalElecPowerIn) * 100).toFixed(1);
          const gearPct = ((gearboxLossW / totalElecPowerIn) * 100).toFixed(1);
          const usefulPct = ((usefulOutputPowerW / totalElecPowerIn) * 100).toFixed(1);

          return (
            <div className="space-y-6">
              {/* Header Badge */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-ink-light dark:text-ink-dark">
                    ELECTROMECHANICAL FLUX &amp; TORQUE POWER CASCADE
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink-muted">Net System Efficiency:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                    {overallEfficiencyPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Energy KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 font-mono text-xs">
                <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
                  <div className="text-[10px] text-ink-muted uppercase">DC Bus Input Power</div>
                  <div className="text-lg font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                    {totalElecPowerIn.toFixed(0)} W
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    V_bus = 48V DC • I_bus = {(totalElecPowerIn / 48).toFixed(1)}A
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
                  <div className="text-[10px] text-ink-muted uppercase">Electromagnetic Airgap</div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {mechPowerIn.toFixed(0)} W
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    τ_motor = {motorTorqueNm.toFixed(2)} Nm @ {motorRpm} RPM
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
                  <div className="text-[10px] text-ink-muted uppercase">Output Useful Work</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {usefulOutputPowerW.toFixed(0)} W
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    τ_joint = {outputTorqueNm.toFixed(1)} Nm @ {outputRpm.toFixed(1)} RPM
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950">
                  <div className="text-[10px] text-ink-muted uppercase">
                    Total Thermal Dissipation
                  </div>
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {(inverterLossW + copperLossW + gearboxLossW).toFixed(0)} W
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    Joule + Inverter + Gear friction
                  </div>
                </div>
              </div>

              {/* Interactive Sankey / Cascade Diagram Canvas */}
              <div className="p-4 sm:p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-slate-950 text-white font-mono space-y-4 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <span>
                    ENERGY CONVERSION CASCADE (DC BUS → GAIN INVERTER → BLDC → HARMONIC DRIVE)
                  </span>
                  <span className="text-emerald-400 font-bold">100% In → {usefulPct}% Out</span>
                </div>

                {/* SVG Sankey Diagram */}
                <div className="w-full bg-slate-900 rounded-xl p-3 border border-slate-800 overflow-x-auto">
                  <svg viewBox="0 0 760 210" className="w-full h-auto select-none min-w-[640px]">
                    <defs>
                      <linearGradient id="elec-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                      <linearGradient id="magnetic-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <linearGradient id="mech-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>

                    {/* Stage 1: DC Bus Box */}
                    <g transform="translate(15, 30)">
                      <rect
                        width="110"
                        height="90"
                        rx="8"
                        fill="#1e293b"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                      />
                      <text
                        x="55"
                        y="24"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#38bdf8"
                      >
                        1. DC BATTERY
                      </text>
                      <text
                        x="55"
                        y="44"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill="#ffffff"
                      >
                        {totalElecPowerIn.toFixed(0)} W
                      </text>
                      <text x="55" y="60" textAnchor="middle" fontSize="8" fill="#94a3b8">
                        48V Li-Ion Pack
                      </text>
                      <text x="55" y="76" textAnchor="middle" fontSize="8" fill="#64748b">
                        100% Input
                      </text>
                    </g>

                    {/* Connector 1 */}
                    <path
                      d="M 125 75 L 180 75"
                      fill="none"
                      stroke="url(#elec-flow)"
                      strokeWidth="14"
                      opacity="0.8"
                    />

                    {/* Stage 2: GaN Inverter Box */}
                    <g transform="translate(180, 30)">
                      <rect
                        width="115"
                        height="90"
                        rx="8"
                        fill="#1e293b"
                        stroke="#818cf8"
                        strokeWidth="1.5"
                      />
                      <text
                        x="57"
                        y="24"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#818cf8"
                      >
                        2. GaN INVERTER
                      </text>
                      <text
                        x="57"
                        y="44"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill="#ffffff"
                      >
                        {(totalElecPowerIn - inverterLossW).toFixed(0)} W
                      </text>
                      <text x="57" y="60" textAnchor="middle" fontSize="8" fill="#94a3b8">
                        SVPWM 25 kHz
                      </text>
                      <text x="57" y="76" textAnchor="middle" fontSize="8" fill="#a5b4fc">
                        - {inverterLossW.toFixed(0)}W Heat ({invPct}%)
                      </text>
                    </g>

                    {/* Loss 1: Inverter Thermal Tap */}
                    <path
                      d="M 237 120 L 237 165"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="237"
                      y="180"
                      textAnchor="middle"
                      fontSize="8"
                      fill="#ef4444"
                      fontFamily="monospace"
                    >
                      ▼ Inverter Loss ({inverterLossW.toFixed(0)}W)
                    </text>

                    {/* Connector 2 */}
                    <path
                      d="M 295 75 L 350 75"
                      fill="none"
                      stroke="url(#magnetic-flow)"
                      strokeWidth="12"
                      opacity="0.8"
                    />

                    {/* Stage 3: BLDC Stator & Rotor Airgap Box */}
                    <g transform="translate(350, 30)">
                      <rect
                        width="125"
                        height="90"
                        rx="8"
                        fill="#1e293b"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />
                      <text
                        x="62"
                        y="24"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#f59e0b"
                      >
                        3. BLDC STATOR
                      </text>
                      <text
                        x="62"
                        y="44"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill="#ffffff"
                      >
                        {mechPowerIn.toFixed(0)} W Airgap
                      </text>
                      <text x="62" y="60" textAnchor="middle" fontSize="8" fill="#94a3b8">
                        Lorentz τ = {motorTorqueNm.toFixed(2)} Nm
                      </text>
                      <text x="62" y="76" textAnchor="middle" fontSize="8" fill="#fcd34d">
                        - {copperLossW.toFixed(0)}W Copper ({copperPct}%)
                      </text>
                    </g>

                    {/* Loss 2: Copper Stator Thermal Tap */}
                    <path
                      d="M 412 120 L 412 165"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="412"
                      y="180"
                      textAnchor="middle"
                      fontSize="8"
                      fill="#ef4444"
                      fontFamily="monospace"
                    >
                      ▼ Joule Heating I²R ({copperLossW.toFixed(0)}W)
                    </text>

                    {/* Connector 3 */}
                    <path
                      d="M 475 75 L 530 75"
                      fill="none"
                      stroke="url(#mech-flow)"
                      strokeWidth="10"
                      opacity="0.8"
                    />

                    {/* Stage 4: Harmonic Drive Gearbox Box */}
                    <g transform="translate(530, 30)">
                      <rect
                        width="120"
                        height="90"
                        rx="8"
                        fill="#1e293b"
                        stroke="#a855f7"
                        strokeWidth="1.5"
                      />
                      <text
                        x="60"
                        y="24"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#a855f7"
                      >
                        4. STRAIN WAVE
                      </text>
                      <text
                        x="60"
                        y="44"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill="#ffffff"
                      >
                        {usefulOutputPowerW.toFixed(0)} W Work
                      </text>
                      <text x="60" y="60" textAnchor="middle" fontSize="8" fill="#94a3b8">
                        {gearRatio}:1 Reduction
                      </text>
                      <text x="60" y="76" textAnchor="middle" fontSize="8" fill="#d8b4fe">
                        - {gearboxLossW.toFixed(0)}W Friction ({gearPct}%)
                      </text>
                    </g>

                    {/* Loss 3: Gearbox Friction Thermal Tap */}
                    <path
                      d="M 590 120 L 590 165"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="5"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="590"
                      y="180"
                      textAnchor="middle"
                      fontSize="8"
                      fill="#ef4444"
                      fontFamily="monospace"
                    >
                      ▼ Strain Wave Friction ({gearboxLossW.toFixed(0)}W)
                    </text>

                    {/* Final Output Arrow */}
                    <path
                      d="M 650 75 L 685 75"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="8"
                      markerEnd="url(#arrow)"
                    />

                    {/* Stage 5: Output Joint Flange */}
                    <g transform="translate(685, 35)">
                      <circle
                        cx="35"
                        cy="40"
                        r="32"
                        fill="#047857"
                        stroke="#34d399"
                        strokeWidth="2"
                      />
                      <text
                        x="35"
                        y="36"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#ffffff"
                      >
                        JOINT
                      </text>
                      <text
                        x="35"
                        y="49"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#a7f3d0"
                      >
                        {usefulPct}%
                      </text>
                    </g>
                  </svg>
                </div>

                {/* Energy Distribution Stacked Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Power Flow Budget:</span>
                    <span>
                      Useful: <strong className="text-emerald-400">{usefulPct}%</strong> • Losses:{' '}
                      <strong className="text-rose-400">
                        {(100 - Number(usefulPct)).toFixed(1)}%
                      </strong>
                    </span>
                  </div>
                  <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${usefulPct}%` }}
                      title={`Useful Mechanical Output: ${usefulPct}%`}
                    />
                    <div
                      className="bg-purple-500 h-full transition-all"
                      style={{ width: `${gearPct}%` }}
                      title={`Gearbox Friction: ${gearPct}%`}
                    />
                    <div
                      className="bg-amber-500 h-full transition-all"
                      style={{ width: `${copperPct}%` }}
                      title={`Stator Copper Joule Loss: ${copperPct}%`}
                    />
                    <div
                      className="bg-indigo-500 h-full transition-all"
                      style={{ width: `${invPct}%` }}
                      title={`Inverter GaN Switching: ${invPct}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Useful
                      Output ({usefulPct}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Gear
                      Friction ({gearPct}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Copper
                      Loss ({copperPct}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Inverter
                      Loss ({invPct}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Powertrain Controls & Architectural Tradeoffs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Dynamic Operating Point Sliders */}
                <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 font-mono text-xs space-y-4">
                  <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5 uppercase">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    Load Operating Point Sliders
                  </span>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-ink-muted">Motor Torque Demand (τ_m):</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {motorTorqueNm.toFixed(2)} Nm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={motorTorqueNm}
                      onChange={(e) => {
                        playTick();
                        setMotorTorqueNm(Number(e.target.value));
                      }}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-ink-muted">Motor Velocity (RPM):</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {motorRpm} RPM
                      </span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="4500"
                      step="100"
                      value={motorRpm}
                      onChange={(e) => {
                        playTick();
                        setMotorRpm(Number(e.target.value));
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-ink-muted">Gearbox Ratio:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {gearRatio}:1
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[50, 80, 100, 160].map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            playTick();
                            setGearRatio(r);
                          }}
                          className={clsx(
                            'py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                            gearRatio === r
                              ? 'border-purple-500 bg-purple-500/15 text-purple-800 dark:text-purple-300'
                              : 'border-parchment-300 dark:border-parchment-700 text-ink-muted'
                          )}
                        >
                          {r}:1
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Architectural Takeaways */}
                <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 font-mono text-xs space-y-3">
                  <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5 uppercase">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    Robotics Engineering Tradeoff: QDD vs Harmonic
                  </span>

                  <div className="space-y-2 text-[11px] text-ink-muted dark:text-ink-darkMuted leading-relaxed">
                    <div className="p-2.5 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
                      <strong className="text-ink-light dark:text-ink-dark block font-bold mb-0.5">
                        Quasi-Direct Drive (QDD, 6:1 to 10:1):
                      </strong>
                      High backdrivability (&gt;90%) and lower mechanical losses, but requires heavy
                      motors with huge phase currents, increasing stator copper $I^2R$ heat. Ideal
                      for explosive quadruped jumping.
                    </div>

                    <div className="p-2.5 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
                      <strong className="text-ink-light dark:text-ink-dark block font-bold mb-0.5">
                        High-Reduction Harmonic Drive (50:1 to 160:1):
                      </strong>
                      Produces massive joint holding torque with tiny motor currents. However,
                      strain-wave friction permanently caps mechanical efficiency at 80-85%,
                      requiring dedicated thermal dissipation management.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* VIEW 5: Field-Oriented Control (FOC) & Space Vector PWM (SVPWM) */}
      {activeTab === 'foc' &&
        (() => {
          const focRad = (focAngle * Math.PI) / 180;
          // Inverse Park Transform:
          // V_alpha = Id * cos(theta) - Iq * sin(theta)
          // V_beta  = Id * sin(theta) + Iq * cos(theta)
          const vAlpha = focId * Math.cos(focRad) - focIq * Math.sin(focRad);
          const vBeta = focId * Math.sin(focRad) + focIq * Math.cos(focRad);
          const vMagnitude = Math.sqrt(vAlpha * vAlpha + vBeta * vBeta);
          let vAngleRad = Math.atan2(vBeta, vAlpha);
          if (vAngleRad < 0) vAngleRad += 2 * Math.PI;
          const vAngleDeg = (vAngleRad * 180) / Math.PI;
          const sector = Math.min(6, Math.floor(vAngleDeg / 60) + 1);

          // Approximate duty cycles for inverter half-bridges
          const dutyA = Math.max(5, Math.min(95, Math.round(50 + 40 * Math.sin(focRad))));
          const dutyB = Math.max(
            5,
            Math.min(95, Math.round(50 + 40 * Math.sin(focRad - (2 * Math.PI) / 3)))
          );
          const dutyC = Math.max(
            5,
            Math.min(95, Math.round(50 + 40 * Math.sin(focRad + (2 * Math.PI) / 3)))
          );

          // Electromagnetic Torque: tau = 1.5 * p * psi_f * Iq (p=7, psi_f=0.015 Wb -> 0.1575 * Iq)
          const motorTorqueFoc = (1.5 * 7 * 0.015 * focIq).toFixed(2);
          const isFieldWeakening = focId < -0.5;

          // SVPWM Hexagon Vertices (radius = 90, center = [140, 140])
          const cx = 140;
          const cy = 140;
          const rHex = 90;
          const hexPoints = Array.from({ length: 6 })
            .map((_, i) => {
              const ang = (i * 60 * Math.PI) / 180;
              return `${cx + rHex * Math.cos(ang)},${cy - rHex * Math.sin(ang)}`;
            })
            .join(' ');

          // Arrow tip for stator voltage vector Vs
          const arrowLen = Math.min(rHex * 0.95, (vMagnitude / 30) * rHex * 0.95);
          const arrowTipX = cx + arrowLen * Math.cos(vAngleRad);
          const arrowTipY = cy - arrowLen * Math.sin(vAngleRad);

          return (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-bold text-ink-light dark:text-ink-dark">
                    FIELD-ORIENTED CONTROL (FOC) &amp; SVPWM 3-PHASE INVERTER
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink-muted">SVPWM Sector:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/20">
                    Sector {sector}
                  </span>
                  <span className="text-ink-muted">Torque τ:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {motorTorqueFoc} Nm
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: SVPWM Hexagon & Space Vector Canvas */}
                <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-950 text-white font-mono flex flex-col items-center justify-between shadow-inner">
                  <div className="w-full flex items-center justify-between text-xs text-parchment-400 pb-2 border-b border-parchment-800">
                    <span>Space Vector Hexagon (α-β Plane)</span>
                    <span className="text-cyan-400 font-bold">
                      |Vs| = {vMagnitude.toFixed(1)} V
                    </span>
                  </div>

                  <svg viewBox="0 0 280 280" className="w-64 h-64 my-2 select-none">
                    {/* Hexagon Grid */}
                    <polygon
                      points={hexPoints}
                      fill="none"
                      stroke="#334155"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    {/* Sector dividing lines */}
                    {Array.from({ length: 6 }).map((_, i) => {
                      const ang = (i * 60 * Math.PI) / 180;
                      return (
                        <line
                          key={i}
                          x1={cx}
                          y1={cy}
                          x2={cx + rHex * Math.cos(ang)}
                          y2={cy - rHex * Math.sin(ang)}
                          stroke="#475569"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Active Sector Highlight Triangle */}
                    {(() => {
                      const secStart = ((sector - 1) * 60 * Math.PI) / 180;
                      const secEnd = (sector * 60 * Math.PI) / 180;
                      const p1 = `${cx},${cy}`;
                      const p2 = `${cx + rHex * Math.cos(secStart)},${cy - rHex * Math.sin(secStart)}`;
                      const p3 = `${cx + rHex * Math.cos(secEnd)},${cy - rHex * Math.sin(secEnd)}`;
                      return (
                        <polygon
                          points={`${p1} ${p2} ${p3}`}
                          fill="rgba(6, 182, 212, 0.18)"
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                        />
                      );
                    })()}

                    {/* Stator Voltage Vector Vs Arrow */}
                    <line
                      x1={cx}
                      y1={cy}
                      x2={arrowTipX}
                      y2={arrowTipY}
                      stroke="#22d3ee"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <circle cx={arrowTipX} cy={arrowTipY} r="4" fill="#38bdf8" />
                    <circle cx={cx} cy={cy} r="4" fill="#ffffff" />

                    {/* Vector Labels */}
                    <text x={cx + 96} y={cy + 4} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      V1(100)
                    </text>
                    <text
                      x={cx + 42}
                      y={cy - 85}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      V2(110)
                    </text>
                    <text
                      x={cx - 75}
                      y={cy - 85}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      V3(010)
                    </text>
                    <text
                      x={cx - 130}
                      y={cy + 4}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      V4(011)
                    </text>
                    <text
                      x={cx - 75}
                      y={cy + 95}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      V5(001)
                    </text>
                    <text
                      x={cx + 42}
                      y={cy + 95}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      V6(101)
                    </text>
                  </svg>

                  <div className="w-full flex items-center justify-between text-[11px] pt-2 border-t border-parchment-800 text-parchment-400">
                    <span>θe = {focAngle}°</span>
                    <span>Angle γ = {vAngleDeg.toFixed(1)}°</span>
                    <span className="text-emerald-400">V0/V7 (Zero Vectors)</span>
                  </div>
                </div>

                {/* Right: Inverter Gate Pulses & Transforms */}
                <div className="space-y-4 font-mono text-xs">
                  {/* Sliders: Rotor Electrical Angle, Iq, Id */}
                  <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-ink-muted">Rotor Electrical Angle (θe):</span>
                        <span className="font-bold text-cyan-600 dark:text-cyan-400">
                          {focAngle}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={focAngle}
                        onChange={(e) => {
                          playTick();
                          setFocAngle(Number(e.target.value));
                        }}
                        className="w-full accent-cyan-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-ink-muted">Torque-Producing Current (Iq):</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {focIq} A
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={focIq}
                        onChange={(e) => {
                          playTick();
                          setFocIq(Number(e.target.value));
                        }}
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-ink-muted">Flux-Direct Current (Id):</span>
                        <span
                          className={clsx(
                            'font-bold',
                            isFieldWeakening
                              ? 'text-purple-600 dark:text-purple-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {focId} A {isFieldWeakening && '(Field Weakening)'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-10}
                        max={10}
                        value={focId}
                        onChange={(e) => {
                          playTick();
                          setFocId(Number(e.target.value));
                        }}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 3-Phase Half-Bridge Duty Cycles */}
                  <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-parchment-50 dark:bg-parchment-950 space-y-2.5">
                    <span className="font-bold text-ink-light dark:text-ink-dark block">
                      SVPWM Half-Bridge Duty Cycles:
                    </span>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          Phase U (PWM_A):
                        </span>
                        <span className="font-bold">{dutyA}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-parchment-200 dark:bg-parchment-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${dutyA}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          Phase V (PWM_B):
                        </span>
                        <span className="font-bold">{dutyB}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-parchment-200 dark:bg-parchment-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${dutyB}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-purple-600 dark:text-purple-400 font-bold">
                          Phase W (PWM_C):
                        </span>
                        <span className="font-bold">{dutyC}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-parchment-200 dark:bg-parchment-800 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${dutyC}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clarke-Park Mathematical Takeaway */}
                  <div className="p-4 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-1.5 text-[11px]">
                    <strong className="text-ink-light dark:text-ink-dark block font-bold">
                      Why FOC is Universal in Humanoid &amp; Quadruped Actuators:
                    </strong>
                    <p className="text-ink-muted leading-relaxed font-sans">
                      By decoupling AC 3-phase stator currents into an orthogonal DC-like reference
                      frame (Id along rotor magnetic flux, Iq perpendicular to flux), the
                      microcontroller regulates motor torque linearly with zero torque ripple,
                      maximum efficiency (Id=0), and rapid sub-millisecond dynamic response.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* VIEW 6: Industrial Actuator Benchmarks & Teardown Comparison */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-ink-light dark:text-ink-dark">
                INDUSTRIAL ROBOTIC ACTUATOR BENCHMARK MATRIX
              </span>
            </div>
            <div className="text-ink-muted">
              Quasi-Direct Drive (QDD) vs Strain Wave (Harmonic) vs Cycloidal (RV)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            {/* Actuator 1: Unitree QDD */}
            <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-ink-muted">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                  Unitree Go2 / B2
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20">
                  QDD
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                M107 Quasi-Direct Drive
              </h4>
              <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                Low gear ratio with high-pole-count outrunner PMSM. Low reflected inertia enables
                high-bandwidth proprioceptive force sensing.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Gear Ratio:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    6.33 : 1 (Planetary)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Peak Torque:</span>
                  <span className="font-bold">360 Nm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Backdrivability:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    &gt; 95% (Transparent)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Application:</span>
                  <span className="font-bold text-ink-muted">Quadruped dynamic jump/run</span>
                </div>
              </div>
            </div>

            {/* Actuator 2: Harmonic Drive */}
            <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-ink-muted">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                  Harmonic Drive
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/20">
                  Strain Wave
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                SHA-25A Hollow Shaft Servo
              </h4>
              <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                Elliptical wave generator flexing a cup gear. Zero backlash with high single-stage
                reduction in compact envelope.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Gear Ratio:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    100 : 1 (Cup Flex)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Peak Torque:</span>
                  <span className="font-bold">127 Nm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Backlash:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    &lt; 0.1 arcmin (Zero)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Application:</span>
                  <span className="font-bold text-ink-muted">Cobots &amp; Surgical Robots</span>
                </div>
              </div>
            </div>

            {/* Actuator 3: Tesla Optimus */}
            <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-ink-muted">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                  Tesla Optimus
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/20">
                  Compound
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                Gen 2 Rotary Actuator
              </h4>
              <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                Custom brushless frameless torque motor with dual absolute position encoders and
                integrated cycloidal planetary stage.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Gear Ratio:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    28 : 1 (Compound)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Peak Torque:</span>
                  <span className="font-bold">180 Nm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Torque Density:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    42 Nm / kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Application:</span>
                  <span className="font-bold text-ink-muted">Humanoid hip/knee/shoulder</span>
                </div>
              </div>
            </div>

            {/* Actuator 4: Nabtesco Cycloidal */}
            <div className="p-5 rounded-2xl border border-parchment-200 dark:border-parchment-800 bg-white/80 dark:bg-parchment-900/80 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-ink-muted">
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase">
                  Nabtesco
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/20">
                  Cycloidal (RV)
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                RV-E Heavy Industrial Drive
              </h4>
              <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed font-sans">
                Dual-stage cycloidal disc pin-wheel mechanism. Absorbs extreme shock loads (500%)
                with maximum torsional rigidity.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-parchment-200 dark:border-parchment-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Gear Ratio:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    161 : 1 (Cycloid Disc)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Peak Torque:</span>
                  <span className="font-bold">1100 Nm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Shock Capacity:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    500% Rated Load
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Application:</span>
                  <span className="font-bold text-ink-muted">
                    Heavy industrial arm base (J1/J2)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
