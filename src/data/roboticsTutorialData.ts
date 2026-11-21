import { ActuateModuleId } from '../types';

export type StepChapter = 'setup' | 'problem' | 'solution' | 'technique' | 'insight' | 'recap';

export interface StepMetricValue {
  label: string;
  value: string;
  sublabel?: string;
  status?: 'good' | 'warn' | 'bad' | 'neutral';
}

export interface StepCallout {
  kind: 'insight' | 'warn' | 'tip';
  title?: string;
  text: string;
}

export interface RoboticsTutorialStep {
  step: number;
  totalSteps: number;
  short: string;
  chapter: StepChapter;
  title: string;
  phase: string;
  actionSummary: string;
  narrative: string;
  deepDive: string;
  changes: string[];
  callout: StepCallout;
  metrics: Record<string, StepMetricValue>;
  formula?: string;
  formulaExplanation?: string;
  hardwarePrinciple: string;
  realWorldContext: string;
  codeSnippet?: {
    language: string;
    filename: string;
    code: string;
  };
  interactiveAction: {
    label: string;
    description: string;
    badge: string;
    actionType: 'pid' | 'ros' | 'ik' | 'foc' | 'actuator';
    params: Record<string, any>;
  };
}

export interface ModuleMetricMeta {
  key: string;
  label: string;
  description: string;
}

export const MODULE_METRICS_CONFIG: Record<
  ActuateModuleId | 'actuator-structure',
  ModuleMetricMeta[]
> = {
  'pid-control-loop': [
    { key: 'riseTime', label: 'Rise Time (tr)', description: 'Time to reach 90% of setpoint' },
    { key: 'overshoot', label: 'Overshoot (Mp)', description: 'Peak error overshoot percentage' },
    { key: 'droop', label: 'Steady Error', description: 'Gravitational position droop' },
    { key: 'stability', label: 'Damping State', description: 'Transient decay & phase margin' },
  ],
  'ros2-teleoperation': [
    {
      key: 'latency',
      label: 'Packet Latency',
      description: 'End-to-end round trip & buffer delay',
    },
    { key: 'queue', label: 'Queue Backlog', description: 'Pending frames in driver socket' },
    { key: 'delivery', label: 'Delivery Rate', description: 'Packet delivery percentage' },
    {
      key: 'protocol',
      label: 'Transport QoS',
      description: 'Network transport & buffering policy',
    },
  ],
  'inverse-kinematics': [
    { key: 'manipulability', label: 'Manipulability', description: 'Yoshikawa dexterity volume w' },
    {
      key: 'condition',
      label: 'Condition κ(J)',
      description: 'Jacobian singularity amplification',
    },
    { key: 'error', label: 'Tracking Error', description: 'Cartesian distance to target' },
    { key: 'jointVel', label: 'Peak Joint Vel', description: 'Max instantaneous joint velocity' },
  ],
  'foc-motor-control': [
    { key: 'mtpa', label: 'Torque/Amp (MTPA)', description: 'Electromagnetic efficiency' },
    {
      key: 'iq',
      label: 'Torque Current (Iq)',
      description: 'Perpendicular torque-producing current',
    },
    { key: 'id', label: 'Flux Current (Id)', description: 'Direct field weakening current' },
    { key: 'busUtil', label: 'Inverter DC Bus', description: 'Bus voltage utilization limit' },
  ],
  'actuator-structure': [
    { key: 'ratio', label: 'Gear Reduction', description: 'Transmission mechanical advantage' },
    {
      key: 'backlash',
      label: 'Angular Backlash',
      description: 'Lost motion between input & output',
    },
    { key: 'thermal', label: 'Winding Temp', description: 'Coil temperature under load' },
    { key: 'torqueDensity', label: 'Torque Density', description: 'Peak output torque per kg' },
  ],
};

export const ROBOTICS_TUTORIAL_DATA: Record<
  ActuateModuleId | 'actuator-structure',
  RoboticsTutorialStep[]
> = {
  'pid-control-loop': [
    {
      step: 1,
      totalSteps: 5,
      short: 'P-Only',
      chapter: 'setup',
      title: 'Open-Loop Failure & Proportional Action (Kp)',
      phase: 'FUNDAMENTALS // PROPORTIONAL FEEDBACK',
      actionSummary: 'Command 90° Step with P-Only Controller (Kp=2.5, Ki=0, Kd=0)',
      changes: [
        '+ Commanded setpoint step from 0° to 90°',
        '+ Proportional gain Kp = 2.5 restoring torque',
        '~ High peak overshoot (42.5%) under zero damping',
        '~ Steady-state gravity droop (-14.8° position offset)',
      ],
      callout: {
        kind: 'warn',
        title: 'Underdamped Oscillation & Gravity Offset',
        text: 'Without velocity damping, high Kp turns the physical link into an undamped spring-mass resonator (J * d²θ/dt² + Kp * θ = 0). When horizontal, gravitational torque τ = m·g·L·cos(θ) balances against Kp·e, causing permanent steady-state droop.',
      },
      metrics: {
        riseTime: {
          label: 'Rise Time (tr)',
          value: '0.28s',
          status: 'good',
          sublabel: 'Fast initial rise',
        },
        overshoot: {
          label: 'Overshoot (Mp)',
          value: '42.5%',
          status: 'bad',
          sublabel: 'Underdamped ringing',
        },
        droop: { label: 'Steady Error', value: '-14.8°', status: 'bad', sublabel: 'Gravity droop' },
        stability: {
          label: 'Damping State',
          value: 'Underdamped',
          status: 'bad',
          sublabel: 'Undamped oscillation',
        },
      },
      narrative:
        'In physical robotics, commanding a raw voltage or PWM without feedback fails because arm mass, motor winding resistance, and bearing friction cause the joint to stop far short of the target setpoint. Proportional control (Kp) injects a restoring torque proportional to the instantaneous angular error e(t) = target - current.',
      deepDive:
        'Increasing Kp increases loop stiffness and reduces rise time. However, a high Kp with zero damping turns the physical link into an undamped torsional spring-mass system (J * d²θ/dt² + Kp * θ = 0), leading to sustained oscillations around the setpoint.',
      formula: '\\tau_P(t) = K_p \\cdot e(t) = K_p \\cdot (\\theta_{sp} - \\theta_{pv})',
      formulaExplanation:
        'Torque output is directly proportional to positional error. If error is zero, proportional torque drops to zero.',
      hardwarePrinciple:
        'Humanoid Joint Compliance: Compliant manipulation uses low Kp for safe human-robot interaction, while high-speed pick-and-place requires stiff gains (Kp >= 4.0).',
      realWorldContext:
        'Boston Dynamics Atlas and Unitree G1 humanoid joints switch between low-stiffness compliant impedance mode and high-stiffness position mode during foot strike vs swing phases.',
      codeSnippet: {
        language: 'python',
        filename: 'p_controller.py',
        code: `class ProportionalJointController:
    def __init__(self, kp: float):
        self.kp = kp

    def compute_torque(self, target_rad: float, current_rad: float) -> float:
        error = target_rad - current_rad
        # Proportional restoring torque
        tau = self.kp * error
        return tau`,
      },
      interactiveAction: {
        label: 'Test P-Only Controller (Kp=2.5, Ki=0, Kd=0)',
        description:
          'Sets Kp=2.5 with zero damping to observe under-damped overshoot and steady-state gravity droop',
        badge: 'P-ONLY STEP',
        actionType: 'pid',
        params: { kp: 2.5, ki: 0.0, kd: 0.0, setpoint: 90, disturbance: 0, noise: false },
      },
    },
    {
      step: 2,
      totalSteps: 5,
      short: 'Gravity Droop',
      chapter: 'problem',
      title: 'Eliminating Gravity Droop with Integral Action (Ki)',
      phase: 'GRAVITY SINK // INTEGRAL ACCUMULATOR',
      actionSummary: 'Activate Integral Accumulator (Ki=0.8) to Lift Against Gravity',
      changes: [
        '+ Integral accumulator Ki = 0.8 engaged',
        '+ Anti-windup saturation clamping limit ±10.0 Nm',
        '~ Steady-state droop completely eliminated (-14.8° → 0.0°)',
        '~ Settling time slightly lengthened due to integral phase lag',
      ],
      callout: {
        kind: 'insight',
        title: 'Integral Action Eliminates Offset at the Cost of Phase Margin',
        text: 'Integral control guarantees zero steady-state error by accumulating past error over time. However, unbounded integration during physical collisions causes catastrophic "windup"—anti-windup clamping is mandatory in production servos.',
      },
      metrics: {
        riseTime: {
          label: 'Rise Time (tr)',
          value: '0.34s',
          status: 'good',
          sublabel: 'Nominal rise',
        },
        overshoot: {
          label: 'Overshoot (Mp)',
          value: '36.0%',
          status: 'warn',
          sublabel: 'Oscillating overshoot',
        },
        droop: {
          label: 'Steady Error',
          value: '0.0°',
          status: 'good',
          sublabel: 'Zero steady-state droop',
        },
        stability: {
          label: 'Damping State',
          value: 'Lag Compensated',
          status: 'neutral',
          sublabel: 'Lifts against gravity',
        },
      },
      narrative:
        "Earth's gravitational acceleration exerts a constant downward torque on horizontal arm links. With only proportional control, the arm reaches equilibrium where Kp*error equals gravity torque, leaving a permanent steady-state droop. Integral gain (Ki) accumulates past error over time until enough voltage builds to hold the arm perfectly level.",
      deepDive:
        'Integral control guarantees zero steady-state error. However, if the joint hits a physical end-stop or an oversized payload stalls the motor, the integral term can grow infinitely—a catastrophic condition called "Integral Windup". When the obstruction clears, accumulated windup causes a violent overshoot. Modern robotics servos implement clamping anti-windup.',
      formula:
        '\\tau_I(t) = K_i \\int_0^t e(\\tau) d\\tau \\implies I_k = I_{k-1} + e_k \\cdot \\Delta t',
      formulaExplanation:
        'Accumulates the discrete Riemann sum of errors over sampling intervals Δt to eliminate offset.',
      hardwarePrinciple:
        'Anti-Windup Clamping: Always clamp the integral accumulator to prevent inverter transistor saturation when motors encounter physical resistance.',
      realWorldContext:
        'NASA Robonaut and industrial 6-axis arms use dynamic gravity compensation vectors tau_ff = G(q) combined with small Ki to eliminate droop without sluggish phase lag.',
      codeSnippet: {
        language: 'python',
        filename: 'pi_antiwindup.py',
        code: `class PIJointController:
    def __init__(self, kp: float, ki: float, dt: float, max_integral: float = 10.0):
        self.kp = kp
        self.ki = ki
        self.dt = dt
        self.integral = 0.0
        self.max_integral = max_integral

    def update(self, target: float, pv: float) -> float:
        error = target - pv
        self.integral += error * self.dt
        # Anti-windup clamping
        self.integral = max(-self.max_integral, min(self.max_integral, self.integral))
        return self.kp * error + self.ki * self.integral`,
      },
      interactiveAction: {
        label: 'Activate Integral Compensation (Ki=0.8)',
        description:
          'Adds integral accumulation to lift the arm against gravity and eliminate steady-state offset',
        badge: 'INTEGRAL ENGAGED',
        actionType: 'pid',
        params: { kp: 3.5, ki: 0.8, kd: 0.2, setpoint: 90, disturbance: 0, noise: false },
      },
    },
    {
      step: 3,
      totalSteps: 5,
      short: 'Critical Damping',
      chapter: 'solution',
      title: 'Critical Damping with Derivative Action (Kd)',
      phase: 'STABILITY // CRITICAL DAMPING',
      actionSummary: 'Tune Derivative Braking (Kd=1.6) for Sub-5% Overshoot',
      changes: [
        '+ Derivative velocity damper Kd = 0.45 engaged',
        '~ Overshoot slashed from 36.0% down to 1.2%',
        '~ Settling time compressed from 1.8s down to 0.38s',
        '+ Loop phase margin boosted to +68°',
      ],
      callout: {
        kind: 'tip',
        title: 'Derivative Lead Dissipates Mechanical Kinetic Energy',
        text: 'Derivative control acts as an electronic viscous damper (B_eff = B + Kd). By opposing instantaneous angular velocity dθ/dt, it dissipates kinetic energy right before the link reaches the setpoint, preventing overshoot.',
      },
      metrics: {
        riseTime: {
          label: 'Rise Time (tr)',
          value: '0.38s',
          status: 'good',
          sublabel: 'Smooth trajectory',
        },
        overshoot: {
          label: 'Overshoot (Mp)',
          value: '1.2%',
          status: 'good',
          sublabel: 'Near-zero overshoot',
        },
        droop: {
          label: 'Steady Error',
          value: '0.0°',
          status: 'good',
          sublabel: 'Zero error held',
        },
        stability: {
          label: 'Damping State',
          value: 'Critically Damped',
          status: 'good',
          sublabel: 'Optimal transient decay',
        },
      },
      narrative:
        'While Kp and Ki drive the arm toward the target, mechanical inertia carries it past the setpoint. Derivative control (Kd) predicts future error by measuring the rate of change of error. It applies opposing braking torque proportional to joint velocity, critically damping the response and eliminating overshoot.',
      deepDive:
        'A critically damped system (damping ratio ζ = 1.0) reaches the target setpoint as fast as possible without oscillating. If Kd is too low, the arm overshoots (under-damped). If Kd is too high, the motion becomes sluggish and resists legitimate motion commands (over-damped).',
      formula:
        '\\tau_D(t) = K_d \\frac{de(t)}{dt} = -K_d \\cdot \\dot{\\theta}_{pv} \\implies \\tau = K_p e + K_i \\int e + K_d \\dot{e}',
      formulaExplanation:
        'D-term measures rate of change; computing derivative on Process Variable (-dPV/dt) avoids derivative kick when setpoint jumps.',
      hardwarePrinciple:
        'Derivative Kick Mitigation: Always compute derivative on Process Variable velocity rather than setpoint error to prevent instantaneous torque spikes when user steps setpoint.',
      realWorldContext:
        'Universal Robots (UR5/UR10) collaborative arms run 500 Hz joint velocity damping loops to guarantee smooth trajectory tracking and instant collision stop detection.',
      codeSnippet: {
        language: 'python',
        filename: 'pid_complete.py',
        code: `class PIDController:
    def __init__(self, kp: float, ki: float, kd: float, dt: float):
        self.kp, self.ki, self.kd = kp, ki, kd
        self.dt = dt
        self.integral = 0.0
        self.last_pv = 0.0

    def compute(self, setpoint: float, pv: float) -> float:
        error = setpoint - pv
        self.integral += error * self.dt
        # Derivative on measurement avoids derivative kick
        d_pv = (pv - self.last_pv) / self.dt
        self.last_pv = pv
        return (self.kp * error) + (self.ki * self.integral) - (self.kd * d_pv)`,
      },
      interactiveAction: {
        label: 'Tune for Critical Damping (Kd=1.6)',
        description:
          'Sets Kp=3.8, Ki=0.8, Kd=1.6 achieving < 5% peak overshoot with rapid 350ms settling time',
        badge: 'CRITICAL DAMPING',
        actionType: 'pid',
        params: { kp: 3.8, ki: 0.8, kd: 1.6, setpoint: 90, disturbance: 0, noise: false },
      },
    },
    {
      step: 4,
      totalSteps: 5,
      short: 'Shock Load',
      chapter: 'technique',
      title: 'Disturbance Rejection & Real-World Collisions',
      phase: 'ROBUSTNESS // EXTERNAL LOAD DROP',
      actionSummary: 'Inject 35 Nm External Payload Impact',
      changes: [
        '+ External shock torque pulse (+3.5 Nm downward collision)',
        '~ Transient position deflection bounded within 4.2°',
        '+ Stiff proportional restoration returns to target in 180 ms',
        '~ Integral term dynamically adapts to sustained payload mass',
      ],
      callout: {
        kind: 'insight',
        title: 'Stiffness vs Compliance in Quadruped & Humanoid Limbs',
        text: 'When a legged robot strikes unexpected terrain, infinite stiffness shatters gear teeth. Modern actuators run virtual impedance control, dynamically softening Kp during foot strike and stiffening it during push-off.',
      },
      metrics: {
        riseTime: {
          label: 'Recovery Time',
          value: '0.18s',
          status: 'good',
          sublabel: 'Fast torque response',
        },
        overshoot: {
          label: 'Peak Deflection',
          value: '4.2°',
          status: 'good',
          sublabel: 'Deflection rejected',
        },
        droop: {
          label: 'Steady Error',
          value: '0.0°',
          status: 'good',
          sublabel: 'Re-centered at setpoint',
        },
        stability: {
          label: 'Damping State',
          value: 'Robust Rejection',
          status: 'good',
          sublabel: 'Survives 3.5 Nm impact',
        },
      },
      narrative:
        'In real-world operation, robots do not operate in a vacuum. A humanoid foot collides with uneven ground, or a manipulator gripper grasps a heavy payload. This applies an instantaneous external torque disturbance. A well-tuned closed-loop PID controller detects the resulting positional displacement and instantly applies corrective current to restore the target angle.',
      deepDive:
        'The frequency response of disturbance rejection depends on loop bandwidth. High loop gain at low frequencies (provided by Ki) forces the steady-state error from a step disturbance to zero. The time it takes to return to 98% of the setpoint is the Disturbance Recovery Time.',
      formula:
        'J \\ddot{\\theta}(t) + B \\dot{\\theta}(t) + \\tau_{gravity} = \\tau_{motor}(t) + \\tau_{disturb}(t)',
      formulaExplanation:
        'Rotational dynamics equation relating link inertia J, damping B, motor torque tau_m, and external disturbance tau_d.',
      hardwarePrinciple:
        'Motor Current Saturation: Real inverters cannot supply infinite current. When a massive disturbance occurs, current clamps at I_max, requiring safe deceleration and stall detection.',
      realWorldContext:
        'Tesla Optimus walking balance algorithms utilize high-bandwidth disturbance rejection at the ankle actuators (up to 1 kHz control loop) to resist sudden ground slips.',
      codeSnippet: {
        language: 'python',
        filename: 'disturbance_monitor.py',
        code: `def monitor_joint_disturbance(torque_cmd: float, max_torque: float = 40.0) -> bool:
    # If motor is commanded beyond 90% peak for > 200ms, flag disturbance
    if abs(torque_cmd) > (max_torque * 0.9):
        print("[WARNING] External load disturbance detected! Engaging stiffness boost.")
        return True
    return False`,
      },
      interactiveAction: {
        label: 'Drop 35 Nm External Payload',
        description:
          'Injects an abrupt 35 Nm external impact force to evaluate closed-loop disturbance recovery time',
        badge: 'IMPACT DROP',
        actionType: 'pid',
        params: { kp: 3.8, ki: 1.2, kd: 1.8, setpoint: 90, disturbance: 35, noise: false },
      },
    },
    {
      step: 5,
      totalSteps: 5,
      short: 'Noise Filter',
      chapter: 'recap',
      title: 'Optical Encoder Discretization & Derivative Noise',
      phase: 'PHYSICAL SENSING // QUANTIZATION NOISE',
      actionSummary: 'Toggle 12-Bit Optical Encoder Quantization Noise',
      changes: [
        '+ High-frequency optical encoder discretization noise injected',
        '+ First-order low-pass filter on derivative path (τ = 5 ms)',
        '- High-frequency motor chatter and thermal coil heating eliminated',
        '~ Command torque output smoothed for power inverter stage',
      ],
      callout: {
        kind: 'warn',
        title: 'Finite Differences Amplify High-Frequency Quantization Noise',
        text: 'Differentiating discrete encoder ticks (Δθ/Δt) amplifies quantization noise to infinity as sampling rates exceed 1 kHz. Production servos must low-pass or Kalman-filter the derivative feedback channel.',
      },
      metrics: {
        riseTime: {
          label: 'Rise Time (tr)',
          value: '0.40s',
          status: 'good',
          sublabel: 'Clean trajectory',
        },
        overshoot: {
          label: 'Overshoot (Mp)',
          value: '0.5%',
          status: 'good',
          sublabel: 'Filtered response',
        },
        droop: { label: 'Steady Error', value: '0.0°', status: 'good', sublabel: 'Zero drift' },
        stability: {
          label: 'Damping State',
          value: 'Filter Attenuated',
          status: 'good',
          sublabel: 'Zero inverter chatter',
        },
      },
      narrative:
        'In simulation, joint angle is continuous. On physical robots, angles are measured with discrete optical or magnetic encoders (e.g. 12-bit to 19-bit resolutions). Calculating raw finite-difference derivative de/dt amplifies single-bit quantization noise into massive high-frequency torque chatter, which can overheat motor coils and vibrate gearboxes.',
      deepDive:
        'To prevent sensor noise from destroying actuators, robotics engineers pass the derivative term through a 1st-order or 2nd-order low-pass filter (LPF): D_filtered(s) = (Kd * s) / (1 + s * Tf), where Tf is the filter time constant.',
      formula:
        '\\tau_D[k] = \\frac{T_f}{T_f + \\Delta t} \\tau_D[k-1] + \\frac{K_d}{T_f + \\Delta t} (e[k] - e[k-1])',
      formulaExplanation:
        'Discrete low-pass filtered derivative avoiding infinite high-frequency noise amplification.',
      hardwarePrinciple:
        'Low-Pass Derivative Filtering: Never run unfiltered numerical differentiation on encoder feedback; always filter at 5x-10x below the control loop Nyquist frequency.',
      realWorldContext:
        'Kollmorgen and Maxon robotic servo drives embed hardware digital biquad filters on DSPs to filter 19-bit BiSS-C encoder velocity telemetry at 20 kHz.',
      codeSnippet: {
        language: 'python',
        filename: 'filtered_derivative.py',
        code: `class LowPassDerivative:
    def __init__(self, kd: float, cutoff_hz: float, dt: float):
        self.kd = kd
        self.alpha = (2 * 3.14159 * cutoff_hz * dt) / (1 + 2 * 3.14159 * cutoff_hz * dt)
        self.filtered_d = 0.0
        self.last_val = 0.0
        self.dt = dt

    def update(self, val: float) -> float:
        raw_derivative = (val - self.last_val) / self.dt
        self.last_val = val
        self.filtered_d = (1.0 - self.alpha) * self.filtered_d + self.alpha * raw_derivative
        return self.kd * self.filtered_d`,
      },
      interactiveAction: {
        label: 'Inject Optical Encoder Noise',
        description:
          'Toggles sensor quantization noise to observe high-frequency torque chatter and evaluate filter stability',
        badge: 'SENSOR NOISE',
        actionType: 'pid',
        params: { kp: 3.8, ki: 0.8, kd: 1.6, setpoint: 90, disturbance: 0, noise: true },
      },
    },
  ],

  'ros2-teleoperation': [
    {
      step: 1,
      totalSteps: 4,
      short: 'Pub/Sub',
      chapter: 'setup',
      title: 'Distributed Robotics Architecture & The Pub/Sub Model',
      phase: 'DISTRIBUTED MIDDLEWARE // ROS 2 NODE GRAPH',
      actionSummary: 'Initialize Reliable TCP Teleop Link with 0% Packet Loss',
      changes: [
        '+ Teleoperation operator joystick node publishing /cmd_vel at 50 Hz',
        '+ Humanoid motor driver node subscribing to /cmd_vel',
        '~ Baseline lossless gigabit Ethernet link',
        '~ Nominal round-trip network latency 8 ms',
      ],
      callout: {
        kind: 'insight',
        title: 'DDS Data Distribution Service in ROS 2',
        text: 'ROS 2 replaces ROS 1 single roscore master with peer-to-peer OMG DDS discovery. Nodes discover each other dynamically over UDP multicast without centralized single points of failure.',
      },
      metrics: {
        latency: {
          label: 'Latency (RTT)',
          value: '8 ms',
          status: 'good',
          sublabel: 'Local Ethernet',
        },
        queue: {
          label: 'Queue Backlog',
          value: '0 msgs',
          status: 'good',
          sublabel: 'Synchronous flow',
        },
        delivery: { label: 'Delivery Rate', value: '100%', status: 'good', sublabel: 'Lossless' },
        protocol: {
          label: 'Transport QoS',
          value: 'DDS Multicast',
          status: 'good',
          sublabel: 'Nominal DDS',
        },
      },
      narrative:
        'A modern robot is a distributed network of independent computing nodes: operator gamepad, vision perception, SLAM navigation, and motor actuators. Nodes communicate asynchronously via publish/subscribe message topics (e.g. cmd_vel for movement, joint_states for angle telemetry).',
      deepDive:
        'In ROS 2, nodes use Data Distribution Service (DDS) or Zenoh protocols. Topics are typed structures (e.g., geometry_msgs/Twist containing linear velocities [vx, vy, vz] and angular velocities [wx, wy, wz]).',
      formula:
        '\\text{Throughput} = f_{pub} \\times \\text{Size}_{payload}, \\quad \\text{Latency} = \\text{RTT}_{transport} + \\text{Queue}_{buffer}',
      formulaExplanation:
        'Total control latency is the sum of wireless propagation, queue buffering delay, and actuator execution time.',
      hardwarePrinciple:
        'Watchdog Heartbeats: Actuator nodes must implement a 100ms hardware watchdog that immediately zeros motor velocity if fresh cmd_vel packets cease arriving.',
      realWorldContext:
        'Autonomous mobile robots (AMRs) in Amazon fulfillment centers run ROS 2 Navigation (Nav2) publishing 50 Hz velocity commands over facility Wi-Fi.',
      codeSnippet: {
        language: 'python',
        filename: 'teleop_node.py',
        code: `import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

class TeleopPublisher(Node):
    def __init__(self):
        super().__init__('teleop_node')
        self.publisher_ = self.create_publisher(Twist, 'cmd_vel', 10)
        self.timer = self.create_timer(0.02, self.publish_velocity) # 50 Hz

    def publish_velocity(self):
        msg = Twist()
        msg.linear.x = 1.0 # 1 m/s forward
        msg.angular.z = 0.5 # 0.5 rad/s yaw
        self.publisher_.publish(msg)`,
      },
      interactiveAction: {
        label: 'Initialize Reliable TCP Teleop Link',
        description:
          'Connects teleoperation operator node to robot actuator over standard Reliable QoS',
        badge: 'RELIABLE CONNECT',
        actionType: 'ros',
        params: {
          qos: 'reliable',
          loss: 0,
          latency: 25,
          jitter: 5,
          history: 'KEEP_ALL',
          lin: 1.0,
          ang: 0.5,
        },
      },
    },
    {
      step: 2,
      totalSteps: 4,
      short: 'Bufferbloat',
      chapter: 'problem',
      title: 'The Wireless Pitfall: Head-of-Line Blocking & Bufferbloat',
      phase: 'DEGRADATION // WIRELESS BUFFERBLOAT',
      actionSummary: 'Simulate 20% WiFi Packet Loss & 35ms Jitter',
      changes: [
        '+ Simulated 12% wireless packet loss & 150 ms link jitter',
        '+ RELIABLE QoS (TCP-like retransmission with unbounded queue)',
        '~ Latency cascades to 2,450 ms (Bufferbloat disaster)',
        '- Robot operates on stale commands seconds in the past',
      ],
      callout: {
        kind: 'warn',
        title: 'Why Reliable QoS Destroys Real-Time Robotic Teleoperation',
        text: 'When packet N drops over Wi-Fi, reliable transport stalls delivery of packets N+1, N+2... until packet N is retransmitted. In robotics, a velocity command from 2 seconds ago is not just useless—it causes fatal crashes.',
      },
      metrics: {
        latency: {
          label: 'Latency (RTT)',
          value: '2,450 ms',
          status: 'bad',
          sublabel: 'Severe bufferbloat',
        },
        queue: {
          label: 'Queue Backlog',
          value: '48 msgs',
          status: 'bad',
          sublabel: 'Stale commands piling up',
        },
        delivery: {
          label: 'Delivery Rate',
          value: '100%',
          status: 'warn',
          sublabel: 'Delivered but obsolete',
        },
        protocol: {
          label: 'Transport QoS',
          value: 'Reliable (TCP)',
          status: 'bad',
          sublabel: 'Head-of-Line Blocking',
        },
      },
      narrative:
        'In typical web applications, TCP ensures every single packet arrives intact. But when applied to robot teleoperation over lossy wireless links (Wi-Fi, 4G/5G, satellite), packet drops trigger TCP acknowledgments (ACKs) and retransmissions.',
      deepDive:
        'When packet #42 is lost, all newer packets (#43, #44, #45) must wait in line until #42 is retransmitted. This causes "Bufferbloat": the teleop queue balloons to thousands of milliseconds. When the link recovers, the robot blindly executes stale, obsolete movement commands seconds after the human operator released the joystick—leading to wall collisions and dangerous tipping.',
      formula:
        '\\tau_{bufferbloat} = \\frac{N_{queued}}{f_{publish}} + \\text{RTT} \\times N_{retransmits}',
      formulaExplanation:
        'Latency grows proportionally with queue depth and retransmission count, degrading real-time control stability.',
      hardwarePrinciple:
        'Timeliness Trumps Completeness: An old velocity command from 500ms ago is actively dangerous; robots must drop obsolete frames rather than queue them.',
      realWorldContext:
        'Bomb-disposal and search-and-rescue robots operating inside reinforced concrete buildings frequently suffer wireless packet loss and must avoid TCP bufferbloat.',
      codeSnippet: {
        language: 'python',
        filename: 'bufferbloat_warning.py',
        code: `def check_packet_freshness(header_timestamp_ms: float, current_time_ms: float) -> bool:
    age_ms = current_time_ms - header_timestamp_ms
    if age_ms > 100.0:
        # Command is stale due to bufferbloat! Drop it immediately.
        print(f"[DROP] Stale packet detected ({age_ms:.1f}ms old). Discarding.")
        return False
    return True`,
      },
      interactiveAction: {
        label: 'Simulate 20% WiFi Loss & 35ms Jitter',
        description:
          'Injects real-world RF degradation to watch Reliable QoS bufferbloat spike past 1800ms',
        badge: 'BUFFERBLOAT SIM',
        actionType: 'ros',
        params: {
          qos: 'reliable',
          loss: 20,
          latency: 45,
          jitter: 35,
          history: 'KEEP_ALL',
          lin: 1.0,
          ang: 0.8,
        },
      },
    },
    {
      step: 3,
      totalSteps: 4,
      short: 'Best-Effort',
      chapter: 'solution',
      title: 'Best-Effort QoS (KEEP_LAST_1): Loss-Tolerant Teleop',
      phase: 'QOS RESILIENCE // DROP OLDEST STRATEGY',
      actionSummary: 'Switch to Best-Effort QoS (Depth=1) to Clear Bufferbloat',
      changes: [
        '+ Switched QoS to BEST_EFFORT with KEEP_LAST depth = 1',
        '- Dropped stale packet retransmissions and bloated socket queues',
        '~ End-to-end latency slashed from 2,450 ms down to 12 ms',
        '+ Dropped packets simply skipped in favor of newest velocity',
      ],
      callout: {
        kind: 'tip',
        title: 'Freshness Trumps Completeness in Continuous State Streams',
        text: 'For sensor streams (IMU, LIDAR, joystick), stale data is toxic. KEEP_LAST(1) guarantees that the robot always executes the absolute newest command, dropping stale packets without blocking.',
      },
      metrics: {
        latency: {
          label: 'Latency (RTT)',
          value: '12 ms',
          status: 'good',
          sublabel: 'Real-time responsive',
        },
        queue: {
          label: 'Queue Backlog',
          value: '1 msg',
          status: 'good',
          sublabel: 'Latest-only ring buffer',
        },
        delivery: {
          label: 'Delivery Rate',
          value: '96.2%',
          status: 'good',
          sublabel: 'Loss-tolerant skip',
        },
        protocol: {
          label: 'Transport QoS',
          value: 'Best-Effort UDP',
          status: 'good',
          sublabel: 'KEEP_LAST_1',
        },
      },
      narrative:
        'The solution to bufferbloat is configuring ROS 2 Quality of Service (QoS) to BEST_EFFORT reliability with a KEEP_LAST history depth of 1. If a wireless packet is dropped, the system does not retransmit it. Instead, the actuator simply waits for the next fresh packet arriving 20ms later.',
      deepDive:
        'In real-time motion control at 50 Hz, losing 1 packet in 5 is unnoticeable to human reflexes because the next fresh packet arrives in 20ms. The control bufferbloat drops to 0ms, and the robot halts the instant the operator releases the controls.',
      formula:
        '\\text{Effective Delay}_{best-effort} = \\text{RTT}_{link} \\le 30\\text{ ms}, \\quad \\text{Bufferbloat} = 0\\text{ ms}',
      formulaExplanation:
        'Without retransmission queues, teleoperation latency remains locked to raw physical transmission time.',
      hardwarePrinciple:
        'QoS Contract Compatibility: ROS 2 publisher and subscriber QoS profiles must match; a Best-Effort subscriber will fail to receive packets from a strictly Reliable publisher unless properly configured.',
      realWorldContext:
        'DARPA Subterranean Challenge winning quadrupeds ran custom ROS 2 QoS configurations with KEEP_LAST(1) for all critical locomotion command topics.',
      codeSnippet: {
        language: 'python',
        filename: 'best_effort_qos.py',
        code: `from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy

# High-rate real-time teleoperation QoS profile
teleop_qos = QoSProfile(
    reliability=ReliabilityPolicy.BEST_EFFORT, # No retransmission delays
    history=HistoryPolicy.KEEP_LAST,
    depth=1 # Always hold only the freshest command
)`,
      },
      interactiveAction: {
        label: 'Switch to Best-Effort QoS (Depth=1)',
        description:
          'Eliminates queue backlog, instantly restoring zero-lag deterministic robot steering under 20% loss',
        badge: 'ZERO BLOAT',
        actionType: 'ros',
        params: {
          qos: 'best-effort',
          loss: 20,
          latency: 40,
          jitter: 20,
          history: 'KEEP_LAST_1',
          lin: 1.0,
          ang: -0.6,
        },
      },
    },
    {
      step: 4,
      totalSteps: 4,
      short: 'Zenoh / SHM',
      chapter: 'technique',
      title: 'Zenoh: Next-Gen Zero-Overhead Protocol for Mobile Robotics',
      phase: 'MODERN PROTOCOLS // ZENOH MIDDLEWARE',
      actionSummary: 'Engage Zenoh Peer-to-Peer Stream Protocol',
      changes: [
        '+ Activated Zenoh router with Eclipse Iceoryx zero-copy shared memory',
        '+ Protocol wire overhead reduced from 48 bytes (DDS) to 4 bytes',
        '~ Zero serialization copy for 4K camera and 100 Hz joint states',
        '+ Deterministic sub-5ms teleop over 5G / Wi-Fi mesh',
      ],
      callout: {
        kind: 'insight',
        title: 'Why Modern Humanoids (Figure, 1X, Unitree) Embrace Zenoh',
        text: 'Traditional DDS requires heavy multicast discovery and complex XML schemas. Zenoh operates over minimal unicast UDP/QUIC with 90% less wire overhead, and seamlessly bridges to shared memory on-chassis.',
      },
      metrics: {
        latency: {
          label: 'Latency (RTT)',
          value: '4 ms',
          status: 'good',
          sublabel: 'Deterministic zero-copy',
        },
        queue: {
          label: 'Queue Backlog',
          value: '0 msgs',
          status: 'good',
          sublabel: 'Zero-copy lock-free ring',
        },
        delivery: {
          label: 'Delivery Rate',
          value: '99.8%',
          status: 'good',
          sublabel: 'Adaptive batching',
        },
        protocol: {
          label: 'Transport QoS',
          value: 'Zenoh + Iceoryx',
          status: 'good',
          sublabel: 'Next-Gen Protocol',
        },
      },
      narrative:
        'While DDS is the default ROS 2 middleware, its heavy discovery multicast packets and complex XML schemas struggle over low-bandwidth cellular, satellite, and mesh networks. Zenoh is an ultra-lightweight, zero-copy pub/sub protocol specifically engineered for distributed robotics and edge computing.',
      deepDive:
        'Zenoh uses compact 4-to-6 byte protocol wire headers, supports direct peer-to-peer unicast without multicast storms, and handles intermittent connectivity with integrated resource storage and query capabilities.',
      formula:
        '\\text{Wire Overhead}_{Zenoh} \\approx 6\\text{ bytes} \\quad \\text{vs} \\quad \\text{Wire Overhead}_{RTPS/DDS} \\ge 64\\text{ bytes}',
      formulaExplanation:
        'Zenoh achieves 10x lower wire serialization overhead than standard DDS RTPS packets, maximizing wireless throughput.',
      hardwarePrinciple:
        'Cellular Teleoperation: For wide-area teleoperation (e.g. self-driving delivery bots, agricultural tractors), Zenoh provides seamless NAT traversal without VPN tunnels.',
      realWorldContext:
        'Autoware (autonomous driving stack) and modern humanoid developers are transitioning from FastDDS/CycloneDDS to Zenoh for high-bandwidth LiDAR and multi-camera teleop streaming.',
      codeSnippet: {
        language: 'python',
        filename: 'zenoh_teleop.py',
        code: `import zenoh

session = zenoh.open(zenoh.Config())
pub = session.declare_publisher('robot/cmd_vel')

# Send low-overhead binary payload
pub.put(b'{"linear_x": 1.0, "angular_z": 0.4}')
print("[ZENOH] Velocity published with 6-byte header over WAN.")`,
      },
      interactiveAction: {
        label: 'Engage Zenoh Stream Protocol',
        description:
          'Switches middleware to Zenoh, delivering sub-20ms teleoperation with zero discovery multicast overhead',
        badge: 'ZENOH ACTIVE',
        actionType: 'ros',
        params: {
          qos: 'zenoh',
          loss: 15,
          latency: 25,
          jitter: 10,
          history: 'KEEP_LAST_1',
          lin: 1.0,
          ang: 0.4,
        },
      },
    },
  ],

  'inverse-kinematics': [
    {
      step: 1,
      totalSteps: 4,
      short: 'FK vs IK',
      chapter: 'setup',
      title: 'Forward vs Inverse Kinematics in Multi-Link Manipulators',
      phase: 'KINEMATICS // CARTESIAN TO JOINT SPACE',
      actionSummary: 'Load Tabletop Workspace Reach Target (X=180, Y=110)',
      changes: [
        '+ Configured 3-DOF planar robotic manipulator (L1=120mm, L2=100mm, L3=80mm)',
        '+ Forward Kinematics computes Cartesian end-effector x, y from joint angles',
        '~ Target setpoint commanded at (x=160mm, y=140mm)',
        '+ Jacobian matrix maps joint angular velocities to Cartesian velocities',
      ],
      callout: {
        kind: 'insight',
        title: 'The Non-Linearity of Multi-Joint Inverse Kinematics',
        text: 'While Forward Kinematics has a unique closed-form solution via trigonometry, Inverse Kinematics involves non-linear transcendental equations with multiple or infinite possible configurations (elbow-up vs elbow-down).',
      },
      metrics: {
        manipulability: {
          label: 'Manipulability (w)',
          value: '0.85',
          status: 'good',
          sublabel: 'High volume',
        },
        condition: {
          label: 'Condition κ(J)',
          value: '2.4',
          status: 'good',
          sublabel: 'Isotropic workspace',
        },
        error: {
          label: 'Cartesian Error',
          value: '0.2 mm',
          status: 'good',
          sublabel: 'Target converged',
        },
        jointVel: {
          label: 'Peak Joint Vel',
          value: '45°/s',
          status: 'good',
          sublabel: 'Smooth motion',
        },
      },
      narrative:
        'High-level task planners specify where the robot gripper should be in physical 3D space: [x, y, z]. Forward Kinematics (FK) is easy: knowing the joint angles [θ1, θ2, θ3], link lengths and trigonometry uniquely calculate the end-effector position. Inverse Kinematics (IK) solves the opposite, highly non-linear problem: finding joint angles that place the gripper at a desired Cartesian coordinate.',
      deepDive:
        'For a planar 3-link arm with link lengths L1, L2, L3, the forward kinematics equations are: x = L1*cos(θ1) + L2*cos(θ1+θ2) + L3*cos(θ1+θ2+θ3). Inverse kinematics has multiple valid solutions (elbow-up vs elbow-down configurations).',
      formula: 'x_{ee} = f(\\vec{\\theta}) \\iff \\vec{\\theta} = f^{-1}(x_{ee})',
      formulaExplanation:
        'Forward map f is unique; inverse map f⁻¹ is non-linear and requires numerical or geometric inversion.',
      hardwarePrinciple:
        'Physical Reach Boundaries: An arm cannot reach any point where sqrt(x² + y²) > L1 + L2 + L3. Commands outside this sphere cause numerical divergence.',
      realWorldContext:
        'Surgical robots (Intuitive da Vinci) compute inverse kinematics at 1 kHz to map surgeon master console hand positions directly to micro-wrist instrument coordinates.',
      codeSnippet: {
        language: 'python',
        filename: 'forward_kinematics.py',
        code: `import math

def forward_kinematics(l1: float, l2: float, l3: float, t1: float, t2: float, t3: float):
    # Joint positions in 2D plane
    x1 = l1 * math.cos(t1)
    y1 = l1 * math.sin(t1)
    x2 = x1 + l2 * math.cos(t1 + t2)
    y2 = y1 + l2 * math.sin(t1 + t2)
    ee_x = x2 + l3 * math.cos(t1 + t2 + t3)
    ee_y = y2 + l3 * math.sin(t1 + t2 + t3)
    return ee_x, ee_y`,
      },
      interactiveAction: {
        label: 'Load Tabletop Workspace Reach',
        description: 'Sets Cartesian target to (X=180, Y=110) within nominal dexterity workspace',
        badge: 'TABLETOP PRESET',
        actionType: 'ik',
        params: { targetX: 180, targetY: 110, solver: 'dls', lambda: 0.2 },
      },
    },
    {
      step: 2,
      totalSteps: 4,
      short: 'Dexterity Ellipsoid',
      chapter: 'technique',
      title: 'The Manipulator Jacobian (J) & Yoshikawa Dexterity Ellipsoid',
      phase: 'DIFFERENTIAL KINEMATICS // VELOCITY MAPPING',
      actionSummary: 'Inspect Mid-Reach Isotropic Manipulability (w > 900)',
      changes: [
        '+ Computed Yoshikawa Manipulability Ellipsoid via SVD: J = U Σ V^T',
        '+ Principal axes of ellipsoid represent maximum Cartesian velocity directions',
        '~ Ellipsoid volume w = √(det(J·J^T)) indicates spatial dexterity',
        '+ Arm oriented in optimal dexterous workspace configuration',
      ],
      callout: {
        kind: 'tip',
        title: 'Manipulability Ellipsoid as a Real-Time Trajectory Guide',
        text: 'The Yoshikawa ellipsoid shows which directions the end-effector can accelerate effortlessly. When pushing heavy objects or machining, planners align the major axis with the tool required force vector.',
      },
      metrics: {
        manipulability: {
          label: 'Manipulability (w)',
          value: '0.92',
          status: 'good',
          sublabel: 'Max dexterity volume',
        },
        condition: {
          label: 'Condition κ(J)',
          value: '1.8',
          status: 'good',
          sublabel: 'Near-circular dexterity',
        },
        error: {
          label: 'Cartesian Error',
          value: '0.1 mm',
          status: 'good',
          sublabel: 'Optimal tracking',
        },
        jointVel: {
          label: 'Peak Joint Vel',
          value: '38°/s',
          status: 'good',
          sublabel: 'Low joint effort',
        },
      },
      narrative:
        'Rather than solving full non-linear trigonometric equations at each microsecond, differential inverse kinematics uses the Jacobian matrix J(θ). The Jacobian is a matrix of partial derivatives that directly maps joint angular velocities dθ/dt to Cartesian end-effector velocities dx/dt.',
      deepDive:
        'dx/dt = J(θ) * dθ/dt. The matrix J*J^T defines the Yoshikawa Manipulability Ellipsoid. The volume of this ellipsoid, w = sqrt(det(J*J^T)), measures the arm instantaneous dexterity—its ability to move freely in any direction without hitting mechanical resistance.',
      formula:
        'J = \\begin{bmatrix} \\frac{\\partial x}{\\partial \\theta_1} & \\frac{\\partial x}{\\partial \\theta_2} & \\frac{\\partial x}{\\partial \\theta_3} \\\\ \\frac{\\partial y}{\\partial \\theta_1} & \\frac{\\partial y}{\\partial \\theta_2} & \\frac{\\partial y}{\\partial \\theta_3} \\end{bmatrix}, \\quad w = \\sqrt{\\det(J J^T)}',
      formulaExplanation:
        'High manipulability (w > 800) means the arm can effortlessly accelerate in any Cartesian direction.',
      hardwarePrinciple:
        'Trajectory Optimization: Industrial robotic trajectory planners maximize manipulability w along the path to ensure joints do not saturate or strain gearboxes.',
      realWorldContext:
        'KUKA iiwa and Franka Emika Panda 7-DOF arms exploit redundancy (7 > 6) to maximize manipulability while simultaneously avoiding joint limit collisions.',
      codeSnippet: {
        language: 'python',
        filename: 'jacobian.py',
        code: `import numpy as np

def compute_jacobian(l1, l2, l3, r1, r2, r3):
    s1, c1 = np.sin(r1), np.cos(r1)
    s12, c12 = np.sin(r1 + r2), np.cos(r1 + r2)
    s123, c123 = np.sin(r1 + r2 + r3), np.cos(r1 + r2 + r3)
    
    J = np.array([
        [-l1*s1 - l2*s12 - l3*s123, -l2*s12 - l3*s123, -l3*s123],
        [ l1*c1 + l2*c12 + l3*c123,  l2*c12 + l3*c123,  l3*c123]
    ])
    manipulability = np.sqrt(max(0, np.linalg.det(J @ J.T)))
    return J, manipulability`,
      },
      interactiveAction: {
        label: 'Inspect Mid-Reach Manipulability',
        description:
          'Positions arm in isotropic configuration with manipulability w > 900 for optimal multidirectional velocity',
        badge: 'OPTIMAL DEXTERITY',
        actionType: 'ik',
        params: { targetX: 160, targetY: 140, solver: 'dls', lambda: 0.15 },
      },
    },
    {
      step: 3,
      totalSteps: 4,
      short: 'Singularity',
      chapter: 'problem',
      title: 'The Boundary Singularity Crisis',
      phase: 'SINGULARITY // VELOCITY BLOWUP',
      actionSummary: 'Drive Arm to Extension Singularity (275, 15)',
      changes: [
        '+ Target commanded near boundary workspace (x=280mm, y=0mm - fully outstretched)',
        '~ Manipulability drops to w = 0.00 (Ellipsoid flattens into a line)',
        '~ Jacobian determinant det(J) → 0 (Matrix becomes non-invertible)',
        '- Pure Moore-Penrose pseudo-inverse (J^+) demands infinite joint velocities',
      ],
      callout: {
        kind: 'warn',
        title: 'The Singularity Catastrophe in Unconstrained Robotics',
        text: 'At a kinematic singularity, the arm loses one degree of Cartesian freedom. Inverting the Jacobian (dq = J^-1 · dx) causes joint speed commands to explode past motor limits, tripping emergency overcurrent stops.',
      },
      metrics: {
        manipulability: {
          label: 'Manipulability (w)',
          value: '0.00',
          status: 'bad',
          sublabel: 'Singularity reached',
        },
        condition: {
          label: 'Condition κ(J)',
          value: '∞',
          status: 'bad',
          sublabel: 'Degenerate matrix',
        },
        error: {
          label: 'Cartesian Error',
          value: '42.0 mm',
          status: 'bad',
          sublabel: 'Stuck at boundary',
        },
        jointVel: {
          label: 'Peak Joint Vel',
          value: '>2,500°/s',
          status: 'bad',
          sublabel: 'Motor trip hazard',
        },
      },
      narrative:
        'A kinematic singularity occurs when two or more links align into a straight line (fully extended outward or folded back on themselves). At this geometric posture, the arm loses one degree of freedom: it physically cannot move outward any further.',
      deepDive:
        'Mathematically, the Jacobian loses rank: det(J*J^T) -> 0, and the condition number explodes to infinity. If a naive controller attempts to invert the Jacobian using the standard Moore-Penrose pseudoinverse, dividing by det(J*J^T) ≈ 0 causes requested joint speeds to explode toward infinity.',
      formula:
        '\\lim_{\\det(J J^T) \\to 0} J^+ = \\lim_{\\det \\to 0} \\frac{\\text{adj}(J J^T)}{\\det(J J^T)} \\implies \\|\\dot{\\vec{\\theta}}\\| \\to \\infty',
      formulaExplanation:
        'The pseudoinverse approaches infinity at singular configurations, demanding impossible physical motor speeds.',
      hardwarePrinciple:
        'Inverter Overcurrent Trip: Unmanaged singularities cause instantaneous current demand spikes (I > 40A) that trigger inverter hardware fault shutoffs.',
      realWorldContext:
        'Industrial welding robots encounter "wrist singularities" when axis 4 and axis 6 align, requiring software singularity avoidance locks to prevent robot halts.',
      codeSnippet: {
        language: 'python',
        filename: 'singularity_detector.py',
        code: `def is_singular(J_matrix: np.ndarray, threshold: float = 450.0) -> bool:
    JJT = J_matrix @ J_matrix.T
    det = np.linalg.det(JJT)
    manipulability = np.sqrt(max(0.0, det))
    if manipulability < threshold:
        print("[CRITICAL] Near Singularity! Joint velocities will blow up without damping.")
        return True
    return False`,
      },
      interactiveAction: {
        label: 'Drive to Extension Singularity (275, 15)',
        description:
          'Extends arm straight out; observe manipulability drop below 450 and condition number spike',
        badge: 'SINGULARITY CRISIS',
        actionType: 'ik',
        params: { targetX: 275, targetY: 15, solver: 'pseudoinverse', lambda: 0.01 },
      },
    },
    {
      step: 4,
      totalSteps: 4,
      short: 'Damped DLS',
      chapter: 'solution',
      title: 'Damped Least Squares (DLS / Levenberg-Marquardt)',
      phase: 'SINGULARITY RESOLUTION // DAMPED INVERSION',
      actionSummary: 'Engage DLS Damping (λ = 0.35) for Smooth Inversion',
      changes: [
        '+ Switched inversion to Damped Least Squares: J* = J^T (J J^T + λ² I)^-1',
        '+ Adaptive damping factor λ = 0.05 kicks in near singular points',
        '~ Peak joint velocity clamped to safe 62°/s without trajectory divergence',
        '+ Arm smoothly slides along boundary without numerical explosion',
      ],
      callout: {
        kind: 'tip',
        title: 'Trading Microscopic Cartesian Accuracy for Infinite Numerical Stability',
        text: 'DLS balances tracking error against joint velocity energy: min ||J·dq - dx||² + λ²||dq||². When approaching a singularity, λ bounds the inverse, preventing motor runaways at the expense of sub-millimeter tracking error.',
      },
      metrics: {
        manipulability: {
          label: 'Manipulability (w)',
          value: '0.48',
          status: 'neutral',
          sublabel: 'Damped transmission',
        },
        condition: {
          label: 'Condition κ(J)',
          value: '14.2',
          status: 'good',
          sublabel: 'Bounded by λ damping',
        },
        error: {
          label: 'Cartesian Error',
          value: '0.8 mm',
          status: 'good',
          sublabel: 'Controlled deviation',
        },
        jointVel: {
          label: 'Peak Joint Vel',
          value: '62°/s',
          status: 'good',
          sublabel: 'Well below motor limit',
        },
      },
      narrative:
        'Physical robots cannot tolerate infinite joint velocity spikes. The industry-standard solution is Damped Least Squares (DLS), also known as the Levenberg-Marquardt kinematic formulation.',
      deepDive:
        'DLS adds a damping factor λ²*I to the matrix inversion: J* = J^T * (J*J^T + λ²*I)⁻¹. When far from singularities, det(J*J^T) dominates and the solver acts as a precision pseudoinverse. Near singularities where det(J*J^T) -> 0, the damping term prevents the denominator from vanishing, gracefully trading a millimeter of tracking error for guaranteed smooth, bounded joint velocities.',
      formula:
        '\\Delta \\vec{\\theta} = J^T \\left( J J^T + \\lambda^2 I \\right)^{-1} \\Delta \\vec{x}',
      formulaExplanation:
        'λ acts as a numerical shock absorber: larger λ guarantees bounded motor speeds even directly on the singular boundary.',
      hardwarePrinciple:
        'Smooth Path Inversion: DLS guarantees that humanoid arms and robotic grippers traverse near-singular postures with zero jerky movements or inverter trips.',
      realWorldContext:
        'Pinocchio, Drake, and ROS MoveIt motion planning frameworks use DLS Jacobian solvers to guarantee stable real-time Cartesian arm teleoperation.',
      codeSnippet: {
        language: 'python',
        filename: 'dls_solver.py',
        code: `def solve_dls_ik(J: np.ndarray, delta_x: np.ndarray, damping_lambda: float = 0.2):
    # Damped Least Squares: J^T * (J * J^T + lambda^2 * I)^-1
    JJT = J @ J.T
    damped_matrix = JJT + (damping_lambda ** 2) * np.eye(2)
    inv_damped = np.linalg.inv(damped_matrix)
    d_theta = J.T @ (inv_damped @ delta_x)
    return d_theta # Bounded, smooth joint increments`,
      },
      interactiveAction: {
        label: 'Engage DLS Damping (λ = 0.35)',
        description:
          'Applies Damped Least Squares to smoothly glide through the singularity without joint velocity spikes',
        badge: 'DLS STABILIZED',
        actionType: 'ik',
        params: { targetX: 275, targetY: 15, solver: 'dls', lambda: 0.35 },
      },
    },
  ],

  'foc-motor-control': [
    {
      step: 1,
      totalSteps: 5,
      short: 'Stator 3-Phase',
      chapter: 'setup',
      title: 'Permanent Magnet Motors & 3-Phase Stator Geometry',
      phase: 'ELECTROMAGNETISM // 3-PHASE COMMUTATION',
      actionSummary: 'Inspect 3-Phase Stator Windings (U, V, W) at 45°',
      changes: [
        '+ 3-phase stator windings placed 120° apart (U, V, W)',
        '+ Rotor with permanent NdFeB neodymium magnet pair',
        '~ Trapezoidal 6-step commutation generates 14% torque ripple',
        '~ Commanded target velocity: 120 rad/s',
      ],
      callout: {
        kind: 'insight',
        title: 'Why Trapezoidal Commutation Fails for Precision Robotics',
        text: 'Standard 6-step trapezoidal commutation only energizes two phases at a time, creating torque ripple and acoustic noise. Field-Oriented Control energizes all three phases continuously with sinusoidal vector alignment.',
      },
      metrics: {
        mtpa: {
          label: 'Torque/Amp (MTPA)',
          value: '0.58 Nm/A',
          status: 'warn',
          sublabel: 'High ripple (14%)',
        },
        iq: {
          label: 'Torque Current (Iq)',
          value: '12.0 A',
          status: 'neutral',
          sublabel: 'Fluctuating current',
        },
        id: {
          label: 'Flux Current (Id)',
          value: '4.2 A',
          status: 'bad',
          sublabel: 'Parasitic flux',
        },
        busUtil: {
          label: 'Inverter DC Bus',
          value: '86.5%',
          status: 'warn',
          sublabel: 'Trapezoidal limit',
        },
      },
      narrative:
        'High-performance robot joints (Tesla Optimus, Unitree quadrupeds) use frameless Permanent Magnet Synchronous Motors (PMSM) with strong neodymium (NdFeB) rotor magnets. Three copper stator windings (U, V, W) are mechanically spaced 120° apart around the circumference.',
      deepDive:
        'Passing alternating currents through the three coils generates a rotating magnetic stator flux vector. The rotor permanent magnet field locks onto this rotating field and is dragged along with it, converting electrical power into mechanical shaft torque.',
      formula:
        '\\vec{B}_s(\\theta_e) = B_U \\hat{u} + B_V \\hat{v} + B_W \\hat{w}, \\quad \\tau = \\vec{m}_{rotor} \\times \\vec{B}_s',
      formulaExplanation:
        'Maximum torque occurs when stator flux is oriented exactly 90° orthogonal to the rotor permanent magnets.',
      hardwarePrinciple:
        'Torque Ripple Elimination: Primitive 6-step trapezoidal commutation causes 14% torque ripple, causing audible whining and vibration in robot arms; FOC achieves smooth, silent sinusoidal motion.',
      realWorldContext:
        'High-torque quasi-direct drive (QDD) actuators in robotic legs require smooth zero-cogging torque to achieve compliant back-drivability when walking.',
      codeSnippet: {
        language: 'c',
        filename: 'three_phase_pwm.c',
        code: `// 3-Phase sinusoidal duty cycle synthesis
void set_phase_voltages(float angle_rad, float magnitude) {
    float duty_u = 0.5f + magnitude * sinf(angle_rad);
    float duty_v = 0.5f + magnitude * sinf(angle_rad - (2.0f * M_PI / 3.0f));
    float duty_w = 0.5f + magnitude * sinf(angle_rad + (2.0f * M_PI / 3.0f));
    PWM_SetDuty(CHANNEL_U, duty_u);
    PWM_SetDuty(CHANNEL_V, duty_v);
    PWM_SetDuty(CHANNEL_W, duty_w);
}`,
      },
      interactiveAction: {
        label: 'Inspect 3-Phase Stator Windings @ 45°',
        description: 'Energizes U, V, W coils with balanced 3-phase sinusoidal currents',
        badge: '3-PHASE STATOR',
        actionType: 'foc',
        params: { angle: 45, iq: 15.0, id: 0.0, rpm: 1200, rotating: true },
      },
    },
    {
      step: 2,
      totalSteps: 5,
      short: 'Clarke Transform',
      chapter: 'technique',
      title: 'The Clarke Transformation (3-Phase abc ➔ αβ)',
      phase: 'MATHEMATICAL REDUCTION // CLARKE TRANSFORM',
      actionSummary: 'Set Stator Electrical Angle to 90° (Pure Beta Axis)',
      changes: [
        '+ Measured instantaneous currents Ia, Ib, Ic via low-side shunt resistors',
        '+ Applied Clarke matrix to transform 3-axis (abc) to 2-axis stationary orthogonal (αβ)',
        '- Eliminated 3-phase redundancy: Iα = Ia, Iβ = (Ia + 2Ib) / √3',
        '~ Stator flux vector represented in Cartesian 2D plane',
      ],
      callout: {
        kind: 'tip',
        title: 'Degrees of Freedom Reduction in 3-Phase Wye Circuits',
        text: 'Because neutral is ungrounded (Ia + Ib + Ic = 0 by Kirchhoff Current Law), three currents contain only two independent degrees of freedom. Clarke transformation projects them into stationary orthogonal components.',
      },
      metrics: {
        mtpa: {
          label: 'Torque/Amp (MTPA)',
          value: '0.78 Nm/A',
          status: 'neutral',
          sublabel: 'Orthogonal αβ frame',
        },
        iq: {
          label: 'Torque Current (Iq)',
          value: '16.5 A',
          status: 'good',
          sublabel: 'Stationary vector',
        },
        id: {
          label: 'Flux Current (Id)',
          value: '0.0 A',
          status: 'good',
          sublabel: 'Decoupled orthogonal',
        },
        busUtil: {
          label: 'Inverter DC Bus',
          value: '100.0%',
          status: 'neutral',
          sublabel: 'SPWM baseline',
        },
      },
      narrative:
        'Controlling three mutually dependent phases (ia + ib + ic = 0) simultaneously in software is computationally cumbersome. Edith Clarke transformation simplifies the system by projecting the three 120°-spaced currents onto a 2-axis orthogonal stationary Cartesian coordinate system: Alpha (α) and Beta (β).',
      deepDive:
        'In the αβ frame, iα aligns with the Phase A axis, and iβ is rotated 90° orthogonal to it. This reduces 3 AC variables into 2 orthogonal AC variables without loss of magnetic vector information.',
      formula:
        '\\begin{bmatrix} i_\\alpha \\\\ i_\\beta \\end{bmatrix} = \\begin{bmatrix} 1 & -\\frac{1}{2} & -\\frac{1}{2} \\\\ 0 & \\frac{\\sqrt{3}}{2} & -\\frac{\\sqrt{3}}{2} \\end{bmatrix} \\begin{bmatrix} i_a \\\\ i_b \\\\ i_c \\end{bmatrix}',
      formulaExplanation:
        'Projects 3-phase stator currents into 2 orthogonal stationary components (iα, iβ).',
      hardwarePrinciple:
        'Current Shunt Sampling: FOC controllers only need to measure two phase currents (ia, ib); the third is computed via Kirchhoff Current Law: ic = -ia - ib.',
      realWorldContext:
        'TI C2000 and STM32 motor control microcontrollers implement hardware trigonometric accelerators (CORDIC) to compute Clarke transforms in under 150 nanoseconds.',
      codeSnippet: {
        language: 'c',
        filename: 'clarke_transform.c',
        code: `// Clarke Transform: 3-phase abc -> 2-phase alpha-beta
void clarke_transform(float ia, float ib, float *i_alpha, float *i_beta) {
    *i_alpha = ia;
    *i_beta = (ia + 2.0f * ib) * 0.577350269f; // 1 / sqrt(3)
}`,
      },
      interactiveAction: {
        label: 'Set Electrical Angle = 90°',
        description: 'Rotates stationary vector into pure beta axis (Iα = 0, Iβ = max)',
        badge: 'CLARKE TRANSFORM',
        actionType: 'foc',
        params: { angle: 90, iq: 18.0, id: 0.0, rpm: 1500, rotating: true },
      },
    },
    {
      step: 3,
      totalSteps: 5,
      short: 'Park Transform',
      chapter: 'solution',
      title: 'The Park Transformation (αβ ➔ dq Rotating Rotor Frame)',
      phase: 'SYNCHRONOUS ROTATION // PARK TRANSFORM',
      actionSummary: 'Set MTPA Peak Torque (Iq = 22A, Id = 0A)',
      changes: [
        '+ Measured rotor electrical angle θe with 14-bit magnetic absolute encoder',
        '+ Park transformation rotates stationary (αβ) frame into synchronous rotor frame (dq)',
        '~ AC sinusoidal signals transformed into pure DC quantities (Id, Iq)',
        '+ Direct PI current loops regulate torque (Iq) independently of flux (Id = 0)',
      ],
      callout: {
        kind: 'insight',
        title: 'The Secret of FOC: Turning AC Motors into Simple DC Motors',
        text: 'By locking the reference frame to the spinning rotor, stator currents appear as constant DC values. Iq controls 100% of torque, and Id controls magnetizing flux—allowing classic linear PI loops to run at 25 kHz!',
      },
      metrics: {
        mtpa: {
          label: 'Torque/Amp (MTPA)',
          value: '0.95 Nm/A',
          status: 'good',
          sublabel: 'Max Torque Per Amp',
        },
        iq: {
          label: 'Torque Current (Iq)',
          value: '22.0 A',
          status: 'good',
          sublabel: 'Direct torque control',
        },
        id: {
          label: 'Flux Current (Id)',
          value: '0.0 A',
          status: 'good',
          sublabel: 'Zero demag current',
        },
        busUtil: {
          label: 'Inverter DC Bus',
          value: '115.5%',
          status: 'good',
          sublabel: 'SVPWM vector bridge',
        },
      },
      narrative:
        'While the Clarke transform reduced the system to 2 variables, iα and iβ are still rapidly oscillating AC sinusoids that are difficult for standard PI controllers to track at high RPM without phase lag. Robert Park breakthrough was rotating the coordinate system at the exact rotational speed of the rotor (θe) using high-resolution encoder feedback.',
      deepDive:
        'In this rotating dq frame, the currents become constant DC values! Id (Direct Axis) controls magnetic flux along the rotor pole. Iq (Quadrature Axis) is oriented exactly 90° orthogonal to the rotor pole and produces 100% of electromagnetic torque.',
      formula:
        '\\begin{bmatrix} I_d \\\\ I_q \\end{bmatrix} = \\begin{bmatrix} \\cos(\\theta_e) & \\sin(\\theta_e) \\\\ -\\sin(\\theta_e) & \\cos(\\theta_e) \\end{bmatrix} \\begin{bmatrix} i_\\alpha \\\\ i_\\beta \\end{bmatrix}, \\quad \\tau_m = \\frac{3}{2} p \\lambda_m I_q',
      formulaExplanation:
        'Torque is directly linear to Quadrature current Iq (p = pole pairs, λm = permanent magnet flux linkage).',
      hardwarePrinciple:
        'Maximum Torque Per Ampere (MTPA): Maintaining Id = 0 ensures every ampere of battery current produces maximum mechanical torque with minimum Joule heat loss (I²R).',
      realWorldContext:
        'ODrive, VESC, and custom humanoid motor drivers run FOC dq current PI loops at 20 kHz to 50 kHz for razor-sharp torque response.',
      codeSnippet: {
        language: 'c',
        filename: 'park_transform.c',
        code: `// Park Transform: Stationary alpha-beta -> Rotating dq frame
void park_transform(float i_alpha, float i_beta, float sin_th, float cos_th, float *id, float *iq) {
    *id =  i_alpha * cos_th + i_beta * sin_th;
    *iq = -i_alpha * sin_th + i_beta * cos_th;
}`,
      },
      interactiveAction: {
        label: 'Set MTPA Peak Torque (Iq=22A, Id=0A)',
        description:
          'Aligns current vector orthogonal to rotor flux for maximum electromagnetic joint torque',
        badge: 'MTPA TORQUE',
        actionType: 'foc',
        params: { angle: 45, iq: 22.0, id: 0.0, rpm: 1800, rotating: true },
      },
    },
    {
      step: 4,
      totalSteps: 5,
      short: 'Field Weakening',
      chapter: 'technique',
      title: 'Field Weakening: Overcoming Back-EMF at High Speeds',
      phase: 'OVERDRIVE // FLUX WEAKENING',
      actionSummary: 'Apply Negative Id Flux Weakening (Id = -7A) to Boost RPM',
      changes: [
        '+ Commanded rotor speed past rated base speed (120 rad/s → 280 rad/s)',
        '~ Motor back-EMF V_emf = ω·λ_m approaches DC supply voltage V_dc',
        '+ Injected negative d-axis current (Id = -8.5 A) to weaken permanent magnet flux',
        '~ Maximum motor speed doubled without increasing DC battery voltage',
      ],
      callout: {
        kind: 'warn',
        title: 'The Danger of Permanent Demagnetization in Field Weakening',
        text: 'Injecting negative Id generates a magnetic field that opposes the rotor permanent magnets. If Id exceeds coercive force Hc at elevated temperatures, the NdFeB magnets permanently lose their magnetization.',
      },
      metrics: {
        mtpa: {
          label: 'Torque/Amp (MTPA)',
          value: '0.82 Nm/A',
          status: 'warn',
          sublabel: 'Compromised for speed',
        },
        iq: {
          label: 'Torque Current (Iq)',
          value: '20.0 A',
          status: 'good',
          sublabel: 'Maintained torque',
        },
        id: {
          label: 'Flux Current (Id)',
          value: '-8.5 A',
          status: 'warn',
          sublabel: 'Active field weakening',
        },
        busUtil: {
          label: 'Inverter DC Bus',
          value: '115.5%',
          status: 'good',
          sublabel: 'DC rail saturation',
        },
      },
      narrative:
        'As a motor spins faster, its permanent magnets sweep past stator coils, generating a counter-voltage called Back-Electromotive Force (Back-EMF). Eventually, Back-EMF equals the DC bus battery voltage, and the motor cannot spin any faster—hitting the "base speed" barrier.',
      deepDive:
        'To break through this speed limit, the FOC controller injects negative direct current (Id < 0). This negative current creates an opposing magnetic field that partially demagnetizes the stator airgap, artificially reducing effective flux and suppressing Back-EMF. This allows the motor to spin up to 1.5x to 2x its nominal base speed.',
      formula:
        'V_{dq} \\le \\frac{V_{bus}}{\\sqrt{3}}, \\quad \\lambda_{eff} = \\lambda_m + L_d I_d \\quad (I_d < 0)',
      formulaExplanation:
        'By driving Id negative, effective linkage flux decreases, keeping terminal voltage within the inverter DC bus limit at high RPM.',
      hardwarePrinciple:
        'Demagnetization Danger: Overly aggressive negative Id can permanently demagnetize neodymium magnets if motor core temperature exceeds 120°C.',
      realWorldContext:
        'Quadruped robots (Boston Dynamics Spot) use field weakening during explosive dynamic jumps and fast running gaits to exceed base motor speed.',
      codeSnippet: {
        language: 'c',
        filename: 'field_weakening.c',
        code: `float compute_field_weakening_id(float v_mag, float v_max, float current_id) {
    if (v_mag > (v_max * 0.95f)) {
        // Approaching inverter saturation: ramp Id negative
        float id_inject = current_id - 0.2f;
        return fmaxf(-12.0f, id_inject);
    }
    return 0.0f; // Nominal MTPA
}`,
      },
      interactiveAction: {
        label: 'Apply Negative Id Flux Weakening (Id = -7A)',
        description:
          'Suppresses Back-EMF with negative direct axis current to boost rotor speed to 2800 RPM',
        badge: 'FLUX WEAKENING',
        actionType: 'foc',
        params: { angle: 45, iq: 14.0, id: -7.0, rpm: 2800, rotating: true },
      },
    },
    {
      step: 5,
      totalSteps: 5,
      short: 'Space Vector PWM',
      chapter: 'recap',
      title: 'Space Vector PWM (SVPWM) Inverter Bridges',
      phase: 'POWER STAGE // 3-PHASE GAN INVERTER',
      actionSummary: 'Run Continuous SVPWM Commutation Loop at 2000 RPM',
      changes: [
        '+ Replaced Sinusoidal SPWM with 8-sector Space Vector PWM (SVPWM)',
        '+ Modulated inverter leg duty cycles via adjacent vector synthesis V1..V6 and zero vectors V0, V7',
        '+ Inverter DC bus voltage utilization boosted by +15.5% (V_max = V_dc / √3)',
        '- High-frequency harmonic current distortion and thermal dissipation minimized',
      ],
      callout: {
        kind: 'tip',
        title: 'The Geometric Advantage of Hexagonal Space Vectors',
        text: 'SVPWM injects an optimal third-harmonic component that flattens the crest of phase voltages, allowing the inverter to deliver 15.5% higher phase voltage without clipping or entering overmodulation.',
      },
      metrics: {
        mtpa: {
          label: 'Torque/Amp (MTPA)',
          value: '0.98 Nm/A',
          status: 'good',
          sublabel: 'Peak efficiency',
        },
        iq: {
          label: 'Torque Current (Iq)',
          value: '22.0 A',
          status: 'good',
          sublabel: 'Low ripple (<1%)',
        },
        id: {
          label: 'Flux Current (Id)',
          value: '0.0 A',
          status: 'good',
          sublabel: 'Clean sinusoidal flux',
        },
        busUtil: {
          label: 'Inverter DC Bus',
          value: '115.5%',
          status: 'good',
          sublabel: 'Max SVPWM headroom',
        },
      },
      narrative:
        'A 3-phase inverter consists of 6 power transistors (GaN FETs or MOSFETs) arranged in 3 half-bridge legs. Switching each leg between Vbus and Ground yields 8 possible switching states: 6 active voltage vectors (V1 to V6) spaced 60° apart forming a hexagon, and 2 zero vectors (V0, V7).',
      deepDive:
        'Space Vector PWM (SVPWM) determines the exact duty-cycle time spent on adjacent active vectors and zero vectors during each PWM cycle. SVPWM achieves 15.5% higher DC bus voltage utilization than conventional sinusoidal PWM (Vbus / sqrt(3) vs Vbus / 2), delivering more torque with less battery current.',
      formula:
        '\\vec{V}^* = \\frac{T_1}{T_s} \\vec{V}_a + \\frac{T_2}{T_s} \\vec{V}_b + \\frac{T_0}{T_s} \\vec{V}_0, \\quad \\text{Utilization} = \\frac{2}{\\sqrt{3}} \\approx 115.5\\%',
      formulaExplanation:
        'Synthesizes arbitrary stator voltage vectors inside the SVPWM voltage hexagon with minimal harmonic distortion.',
      hardwarePrinciple:
        'Dead-Time Insertion: Inverter gate drivers must insert 50-100ns dead-time between high-side and low-side FET switching to prevent shoot-through short circuits that destroy power silicon.',
      realWorldContext:
        'Modern GaN (Gallium Nitride) robotic inverters switch at 50 kHz with zero reverse-recovery losses, fitting inside compact joint housings.',
      codeSnippet: {
        language: 'c',
        filename: 'svpwm_modulator.c',
        code: `// Space Vector Modulation Sector Time Allocations
void svpwm_calculate(float valpha, float vbeta, float vbus, float *tA, float *tB, float *tC) {
    float v_mag = sqrtf(valpha * valpha + vbeta * vbeta);
    float angle = atan2f(vbeta, valpha);
    int sector = (int)(angle / (M_PI / 3.0f)) + 1;
    // Calculate vector timings T1, T2, T0 and map to Phase A, B, C duty cycles
}`,
      },
      interactiveAction: {
        label: 'Run Continuous SVPWM Commutation Loop',
        description:
          'Synthesizes smooth rotating stator flux vector across the 6-sector hexagon at 2000 RPM',
        badge: 'SVPWM ACTIVE',
        actionType: 'foc',
        params: { angle: 120, iq: 18.0, id: 0.0, rpm: 2000, rotating: true },
      },
    },
  ],

  'actuator-structure': [
    {
      step: 1,
      totalSteps: 4,
      short: 'Exploded Joint',
      chapter: 'setup',
      title: 'Anatomy of a Robotic Joint: The Exploded Stack',
      phase: 'MECHANICAL DESIGN // ACTUATOR INTEGRATION',
      actionSummary: 'Explode Joint Stack to 75% to Inspect Internal Subsystems',
      changes: [
        '+ Inspected concentric actuator stack: Frameless BLDC Stator + Rotor',
        '+ Integrated strain-wave gear reducer, cross-roller bearing, and dual encoders',
        '+ Hollow-shaft design routes power buses and CAN-FD/EtherCAT wiring internally',
        '~ Nominal joint torque: 80 Nm continuous, 180 Nm peak',
      ],
      callout: {
        kind: 'insight',
        title: 'Why Hollow-Shaft Concentric Actuators Dominate Modern Humanoids',
        text: 'Running wires externally around moving humanoid joints leads to cable fatigue and snagging. Concentric frameless motors allow a large hollow bore down the center for slip rings and wiring harnesses.',
      },
      metrics: {
        ratio: {
          label: 'Gear Reduction',
          value: '80:1',
          status: 'good',
          sublabel: 'Strain wave reduction',
        },
        backlash: {
          label: 'Angular Backlash',
          value: '0 arcsec',
          status: 'good',
          sublabel: 'True zero backlash',
        },
        thermal: {
          label: 'Winding Temp',
          value: '28°C',
          status: 'good',
          sublabel: 'Ambient nominal',
        },
        torqueDensity: {
          label: 'Torque Density',
          value: '85 Nm/kg',
          status: 'good',
          sublabel: 'High torque compact',
        },
      },
      narrative:
        'High-density humanoid actuators are marvels of mechatronic packaging. Instead of bulky discrete components connected by long cables, modern actuators combine CNC aluminum structural heat sinks, frameless high-torque BLDC stators, strain-wave harmonic gearboxes, 19-bit optical encoders, and integrated GaN inverters into a single sealed cylindrical joint.',
      deepDive:
        'The stack includes CNC 7075-T6 Housing for heat dissipation, frameless high-pole stator and rotor, strain-wave harmonic drive with zero backlash, and dual encoders (motor-side for FOC and output-side for deflection compensation).',
      formula:
        '\\tau_{joint} = \\tau_{motor} \\times N_{gear} \\times \\eta_{mech}, \\quad \\text{Backlash} \\approx 0 \\text{ arcsec}',
      formulaExplanation:
        'Output torque is amplified by the gear ratio N, while mechanical efficiency η ≈ 85%.',
      hardwarePrinciple:
        'Concentricity Tolerances: Bearing bores and harmonic drive mountings must maintain ±5 µm concentricity to prevent premature flexspline metal fatigue.',
      realWorldContext:
        'Tesla Optimus humanoids utilize 14 rotary actuators across the arms and legs, sharing modular stator diameters (35mm, 50mm, 70mm).',
      codeSnippet: {
        language: 'python',
        filename: 'actuator_spec.py',
        code: `class RoboticActuatorSpec:
    name: str = "Humanoid Shoulder Rotary Joint"
    bus_voltage: float = 48.0 # Volts DC
    peak_torque: float = 80.0 # Nm
    continuous_torque: float = 35.0 # Nm
    gear_ratio: int = 80 # Harmonic Drive (80:1)
    encoder_resolution: int = 19 # 524,288 counts/rev
    thermal_resistance: float = 1.2 # °C/W`,
      },
      interactiveAction: {
        label: 'Explode Joint Stack to 75%',
        description:
          'Separates casing, stator, strain-wave flexspline, cross-roller bearing, and inverter PCB',
        badge: 'EXPLODED VIEW',
        actionType: 'actuator',
        params: { tab: 'exploded', explode: 75, part: 'harmonic-drive' },
      },
    },
    {
      step: 2,
      totalSteps: 4,
      short: 'Harmonic Drive',
      chapter: 'technique',
      title: 'Harmonic Drive (Strain-Wave) Operating Principle',
      phase: 'GEARING KINEMATICS // ELASTIC FLEXSPLINE',
      actionSummary: 'Inspect Harmonic Gearing (Spin Wave Generator @ 3000 RPM)',
      changes: [
        '+ Wave Generator (elliptical cam) rotates at motor input shaft speed',
        '+ Flexspline (thin flexible cup with 200 external teeth) continuously deforms',
        '+ Circular Spline (rigid outer ring with 202 internal teeth) engages at elliptical major axis',
        '~ With every full 360° rotation of the wave generator, output advances by exactly 2 teeth (Ratio = 100:1)',
      ],
      callout: {
        kind: 'tip',
        title: 'How Continuous Elastic Deformation Produces Zero Backlash',
        text: 'Unlike spur or planetary gears with clearances that create backlash, strain-wave gears maintain 30% of their teeth in simultaneous preloaded contact, yielding zero backlash and extreme repeatability.',
      },
      metrics: {
        ratio: {
          label: 'Gear Reduction',
          value: '100:1',
          status: 'good',
          sublabel: 'High single-stage ratio',
        },
        backlash: {
          label: 'Angular Backlash',
          value: '0 arcsec',
          status: 'good',
          sublabel: 'Zero lost motion',
        },
        thermal: {
          label: 'Winding Temp',
          value: '34°C',
          status: 'good',
          sublabel: 'Elastic hysteresis heat',
        },
        torqueDensity: {
          label: 'Torque Density',
          value: '92 Nm/kg',
          status: 'good',
          sublabel: 'Class-leading compactness',
        },
      },
      narrative:
        'Traditional spur and planetary gearboxes have a major flaw: tooth backlash. In a 6-axis robot arm, a tiny 0.1° backlash at the shoulder translates into centimeters of end-effector wobble. Harmonic drives eliminate backlash entirely through elastic deflection!',
      deepDive:
        'A harmonic drive consists of 3 concentric components: an elliptical Wave Generator cam, a flexible toothed steel Flexspline (100 teeth), and a rigid outer Circular Spline (102 teeth). Because the flexspline has 2 fewer teeth, each full 360° rotation of the Wave Generator advances the flexspline by only 2 teeth in the opposite direction.',
      formula: 'R = \\frac{Z_f}{Z_c - Z_f} = \\frac{100}{102 - 100} = \\frac{100}{2} = 50:1',
      formulaExplanation:
        'Gear ratio R is determined purely by the tooth count difference; provides 50:1 to 160:1 reduction in a single stage with zero backlash.',
      hardwarePrinciple:
        'Flexspline Fatigue Life: Because the steel flexspline continuously flexes elastically, operating torque must remain within the fatigue limit to prevent fractures.',
      realWorldContext:
        'Space robotic arms (Canadarm2 on the ISS) and Mars rovers exclusively use harmonic drives because zero backlash is vital for precision docking in microgravity.',
      codeSnippet: {
        language: 'python',
        filename: 'harmonic_kinematics.py',
        code: `def harmonic_reduction(motor_rpm: float, gear_ratio: float = 80.0, eff: float = 0.85):
    output_rpm = motor_rpm / gear_ratio
    deg_per_sec = output_rpm * 6.0 # 360 deg / 60s
    return output_rpm, deg_per_sec`,
      },
      interactiveAction: {
        label: 'Inspect Harmonic Drive Gearing',
        description:
          'Switches to Gearing simulation tab; observe elliptical wave generator rotating with zero backlash',
        badge: '50:1 REDUCTION',
        actionType: 'actuator',
        params: { tab: 'gearing', motorRpm: 3000, gearRatio: 80, motorTorque: 1.2 },
      },
    },
    {
      step: 3,
      totalSteps: 4,
      short: 'Thermal Limit',
      chapter: 'problem',
      title: 'Torque Amplification vs Thermal Joule Heating',
      phase: 'THERMAL DYNAMICS // JOULE DISSIPATION',
      actionSummary: 'Simulate Sustained 80 Nm Overload and Monitor Heating',
      changes: [
        '+ Commanded 120 Nm stall torque hold for sustained humanoid squat',
        '~ Stator current reaches 28 A: Copper losses P_loss = 3 · I² · R surge to 145 W',
        '~ Winding temperature climbs rapidly toward thermal runaway (68°C → 95°C)',
        '- High gear ratio (80:1) increases reflected rotor inertia by N² (6,400×)',
      ],
      callout: {
        kind: 'warn',
        title: 'The Thermal Bottle-Neck of Quasi-Direct vs High-Ratio Gearing',
        text: 'High gear ratios amplify torque but also amplify rotor inertia by N², making impacts rigid. Quasi-direct drives (QDD, 8:1 - 10:1) have high backdrivability and absorb impacts, but require huge currents and overheat during sustained squats.',
      },
      metrics: {
        ratio: {
          label: 'Gear Reduction',
          value: '80:1',
          status: 'neutral',
          sublabel: 'Reflected inertia 6400×',
        },
        backlash: {
          label: 'Angular Backlash',
          value: '0 arcsec',
          status: 'good',
          sublabel: 'Preloaded',
        },
        thermal: {
          label: 'Winding Temp',
          value: '68°C',
          status: 'bad',
          sublabel: 'Joule heating limit',
        },
        torqueDensity: {
          label: 'Torque Density',
          value: '85 Nm/kg',
          status: 'good',
          sublabel: 'Thermal de-rating',
        },
      },
      narrative:
        'Electric motors are limited by heat. When a robotic actuator holds a heavy payload or climbs stairs, motor stator coils draw high current. Stator resistive losses generate heat according to Joule law: Ploss = I² * R.',
      deepDive:
        'Stator copper windings have maximum insulation temperature ratings (Class H: 180°C). If temperature exceeds thermal throttling thresholds, neodymium rotor magnets suffer irreversible demagnetization. Actuator enclosures must conduct heat through aircraft-grade aluminum fins (1.2°C/W thermal resistance) to the robot frame.',
      formula:
        'P_{loss} = I_{rms}^2 R_{stator} + P_{eddy} + P_{friction}, \\quad T_{joint} = T_{ambient} + P_{loss} \\times R_{th}',
      formulaExplanation:
        'Joint equilibrium temperature rises linearly with thermal dissipation and thermal resistance Rth.',
      hardwarePrinciple:
        'Thermal Throttling: Embedded joint microcontrollers continuously monitor thermistors on winding coils and gate drivers, automatically derating torque if T_joint > 85°C.',
      realWorldContext:
        'Boston Dynamics Atlas uses custom thermal conduction fluid loops and high-airflow fans to cool its high-power knee and hip actuators during backflips and parkour.',
      codeSnippet: {
        language: 'python',
        filename: 'thermal_protection.py',
        code: `def thermal_torque_derate(temp_c: float, nominal_torque: float = 80.0) -> float:
    if temp_c > 90.0:
        return 0.0 # Emergency thermal shutdown
    elif temp_c > 75.0:
        # Linear derating between 75°C and 90°C
        scale = (90.0 - temp_c) / 15.0
        return nominal_torque * scale
    return nominal_torque`,
      },
      interactiveAction: {
        label: 'Simulate Sustained 80 Nm Overload',
        description:
          'Injects high torque load to monitor thermal gradient heating up to 84°C thermal threshold',
        badge: 'THERMAL TEST',
        actionType: 'actuator',
        params: { tab: 'gearing', motorRpm: 3200, gearRatio: 80, motorTorque: 1.6 },
      },
    },
    {
      step: 4,
      totalSteps: 4,
      short: 'Sizing Matrix',
      chapter: 'solution',
      title: 'Humanoid Joint Sizing & Benchmark Trade-Offs',
      phase: 'ROBOTIC SIZING // TORQUE DENSITY',
      actionSummary: 'View Humanoid Joint Sizing Benchmarks Matrix',
      changes: [
        '+ Evaluated 4 architecture trade-offs: Direct Drive, Planetary (QDD), Strain Wave, Cycloidal',
        '+ Selected Quasi-Direct Drive (10:1) for hip/knee impacts with active backdrivability',
        '+ Selected Strain Wave (80:1) for precision waist and arm trajectory tracking',
        '+ Optimized thermal dissipation via aluminum chassis heat-sinking',
      ],
      callout: {
        kind: 'insight',
        title: 'The Hybrid Actuation Strategy of State-of-the-Art Humanoids',
        text: 'Humanoids do not use a single actuator type. Locomotion joints (hips, knees) face explosive terrain impacts and need low-ratio QDDs. Manipulation joints (shoulders, wrists) need zero-backlash strain-wave gears to thread needles.',
      },
      metrics: {
        ratio: {
          label: 'Gear Reduction',
          value: '10:1 (Leg) / 80:1 (Arm)',
          status: 'good',
          sublabel: 'Hybrid architecture',
        },
        backlash: {
          label: 'Angular Backlash',
          value: '< 1 arcmin',
          status: 'good',
          sublabel: 'Task-specific backlash',
        },
        thermal: {
          label: 'Winding Temp',
          value: '42°C',
          status: 'good',
          sublabel: 'Thermal equilibrium',
        },
        torqueDensity: {
          label: 'Torque Density',
          value: '95 Nm/kg',
          status: 'good',
          sublabel: 'Optimized hybrid',
        },
      },
      narrative:
        'Humanoid robotics engineering involves sizing the right actuator for the right joint. Hip and knee joints demand massive peak torque (> 150 Nm) to support body weight and dynamic running impact, while wrist and finger actuators prioritize ultra-low mass and rapid acceleration.',
      deepDive:
        'Engineers balance three primary actuator paradigms: Quasi-Direct Drive (QDD, 6:1 to 10:1 planetary), High-Reduction Harmonic Drive (50:1 to 100:1 zero backlash), and Linear Ball-Screw Actuators (high-efficiency linear thrust).',
      formula:
        '\\text{Torque Density} = \\frac{\\tau_{peak}}{\\text{Mass}_{actuator}} \\ge 120\\text{ Nm/kg}, \\quad J_{reflected} = N^2 \\cdot J_{rotor}',
      formulaExplanation:
        'Reflected rotor inertia scales with the square of the gear ratio N², explaining why high-ratio joints are harder to back-drive.',
      hardwarePrinciple:
        'Reflected Inertia Impact: High gear ratios increase reflected inertia by N², requiring force/torque sensor feedback to avoid damaging gear teeth during sudden collisions.',
      realWorldContext:
        'Tesla Optimus Gen 2 replaced planetary gearboxes with custom strain-wave harmonic actuators and linear roller screws to shed 10 kg of total body mass.',
      codeSnippet: {
        language: 'python',
        filename: 'actuator_selection.py',
        code: `def recommend_actuator(joint_name: str):
    if joint_name in ["ankle", "knee"]:
        return "Linear Ball-Screw or High-Torque Harmonic (150 Nm+)"
    elif joint_name in ["shoulder", "hip"]:
        return "Harmonic Drive (80:1) with Dual Encoders (80 Nm)"
    else:
        return "Quasi-Direct Drive Planetary (Compact, 15 Nm)"`,
      },
      interactiveAction: {
        label: 'View Humanoid Joint Sizing Benchmarks',
        description:
          'Switches to benchmark matrix comparing shoulder, elbow, wrist, hip, and knee actuator specs',
        badge: 'BENCHMARKS',
        actionType: 'actuator',
        params: { tab: 'benchmarks' },
      },
    },
  ],
};
