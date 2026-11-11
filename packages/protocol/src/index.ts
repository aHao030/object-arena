/** Shared wire contract for the first authoritative, local-development slice. */
export const SIM_RULESET = 'mecha-slice-0.2' as const;
export const PHYSICS_HZ = 60;
export const SNAPSHOT_HZ = 20;
export const INPUT_HZ = 30;
export const ENERGY_CAPACITY = 50_000;
export const CATALOG_CP = 95;

export type MatchMode = 'training' | 'arena';
export type Vector3 = { x: number; y: number; z: number };

/** moveX/moveZ are local horizontal axes (positive Z is backwards).
 * Yaw 0 faces -Z; positive pitch looks up. Values are radians and SI units. */
export interface InputFrame {
  seq: number;
  moveX: number;
  moveZ: number;
  aimYaw: number;
  aimPitch: number;
  fire: boolean;
  boost: boolean;
  lift: boolean;
}

export interface PlayerSnapshot {
  id: string;
  position: Vector3;
  velocity: Vector3;
  rotationYaw: number;
  aimPitch: number;
  energy: number;
  health: number;
  heat: number;
  grounded: boolean;
  boosting: boolean;
  overheated: boolean;
  lastAppliedSeq: number;
  appliedAtTick: number;
  shotsFired: number;
}

export interface TargetSnapshot {
  id: string;
  position: Vector3;
  radius: number;
  health: number;
  maxHealth: number;
}

export interface ProjectileSnapshot {
  id: string;
  ownerId: string;
  position: Vector3;
  velocity: Vector3;
}

export interface MatchResult {
  matchId: string;
  resultId: string;
  winnerId: string | null;
  reason: 'targets-cleared' | 'core-destroyed' | 'time-limit' | 'player-left';
  finishedAtTick: number;
}

export interface SimulationEvent {
  id: string;
  tick: number;
  type: 'shot' | 'hit' | 'rejected';
  playerId: string;
  targetId?: string;
  position?: Vector3;
  reason?: string;
  damage?: number;
}

export interface Snapshot {
  ruleset: typeof SIM_RULESET;
  matchId: string;
  mode: MatchMode;
  serverTick: number;
  remaining: number;
  status: 'waiting' | 'running' | 'finished';
  players: PlayerSnapshot[];
  targets: TargetSnapshot[];
  projectiles: ProjectileSnapshot[];
  events: SimulationEvent[];
  result: MatchResult | null;
}

export const CATALOG = {
  ruleset: SIM_RULESET,
  cp: CATALOG_CP,
  combatHeight: 2.2,
  mass: 180,
  energyCapacity: ENERGY_CAPACITY,
  coreHealth: 1000,
  physicsHz: PHYSICS_HZ,
  snapshotHz: SNAPSHOT_HZ,
  inputHz: INPUT_HZ,
  implemented: ['authoritative-rapier-root', 'ground-movement', 'limited-boost', 'server-projectiles', 'training-targets', 'two-player-room'],
  notImplemented: ['melee', 'shield', 'part-disable', 'full-m0.1-loadouts', 'client-prediction', 'persistent-replay'],
  limitations: ['原型使用稳定胶囊根体；尚非完整关节机体与m0.1姿态控制。', '结果仅保存在进程内，重启清空；本地开发不提供账户身份认证。'],
} as const;

export const INTEGRATIONS = {
  modelApi: { status: 'not-connected', sendsUserFiles: false },
  mujoco: { status: 'active', role: 'mechanical-validation-only', engineVersion: '4.0.0', profile: 'articulated-lab' },
  simulation: { status: 'active', engine: 'Rapier', networking: 'Colyseus', ruleset: SIM_RULESET },
} as const;
