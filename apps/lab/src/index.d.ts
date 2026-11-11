export interface MechanicalCheckInput {
  payloadKg: number;
  /** Shoulder target, radians in [-0.8, 0.8]. Elbow target is -targetAngle/2. */
  targetAngle?: number;
}

export interface MechanicalCheckConditions {
  fixture: string;
  controller: string;
  profile: 'articulated-lab';
  payloadKg: number;
  targetAnglesRad: number[];
  initialAnglesRad: number[];
  timestepSeconds: number;
  simulatedSeconds: number;
  gravityMps2: number[];
  linkLengthsM: number[];
  linkMassesKg: number[];
  jointLimitsRad: number[];
  externalContacts: false;
  selfCollision: false;
  torqueLimitsNm: number[];
  kp: number[];
  kd: number[];
  passToleranceRad: number;
  cpuBudgetMs: number;
  wallTimeoutMs: number;
  scope: string;
}

export interface MechanicalCheckReport {
  engine: 'MuJoCo';
  version: string;
  profile: 'articulated-lab';
  modelHash: string;
  conditionHash: string;
  steps: number;
  /** Actual MuJoCo joint positions, radians. */
  finalAngles: number[];
  /** Maximum absolute actuator torque observed, N m. */
  peakControl: number;
  /** Largest joint error at final simulation time, radians. */
  trackingError: number;
  /** Largest joint error across the whole trajectory, radians. */
  maxTrackingError: number;
  /** Integral of absolute actuator mechanical power; not electrical input energy. */
  controlWorkJ: number;
  saturatedSteps: number;
  status: 'passed' | 'needs-review';
  conditions: MechanicalCheckConditions;
  elapsedMs: number;
}

export class MechanicalCheckError extends Error {
  code: 'LAB_INVALID_INPUT' | 'LAB_BUSY' | 'LAB_TIMEOUT' | 'LAB_ENGINE_ERROR';
}

export function runMechanicalCheck(input: MechanicalCheckInput): Promise<MechanicalCheckReport>;
