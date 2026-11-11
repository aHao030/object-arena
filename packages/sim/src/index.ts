import RAPIER from '@dimforge/rapier3d-compat';
import { randomUUID } from 'node:crypto';
import {
  ENERGY_CAPACITY, PHYSICS_HZ, SIM_RULESET,
  type InputFrame, type MatchMode, type MatchResult, type PlayerSnapshot,
  type ProjectileSnapshot, type SimulationEvent, type Snapshot, type TargetSnapshot, type Vector3,
} from '../../protocol/src/index.ts';

const DT = 1 / PHYSICS_HZ;
const MASS = 180;
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
const angleDelta = (to: number, from: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const copy = (v: Vector3): Vector3 => ({ x: v.x, y: v.y, z: v.z });
const neutral = (seq = 0): InputFrame => ({ seq, moveX: 0, moveZ: 0, aimYaw: 0, aimPitch: 0, fire: false, boost: false, lift: false });
let initialized: Promise<void> | undefined;

interface Pilot {
  id: string;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  input: InputFrame;
  inputAt: number;
  inputTimes: number[];
  maxSeq: number;
  appliedSeq: number;
  appliedAtTick: number;
  yaw: number;
  pitch: number;
  energy: number;
  health: number;
  heat: number;
  overheated: boolean;
  grounded: boolean;
  boosting: boolean;
  lastShotAt: number;
  shotsFired: number;
}
interface Bullet extends ProjectileSnapshot { life: number; }
interface Target extends TargetSnapshot { collider: RAPIER.Collider; }
export interface SimulationOptions { mode: MatchMode; matchId?: string; duration?: number; }
export interface InputAcceptance { accepted: boolean; reason?: string; }

/** Creates an independent authoritative world. Input cannot set transforms or damage.
 * step() consumes seconds in fixed 60 Hz increments; snapshots are detached copies.
 * This slice intentionally does not implement melee, shields, parts or persistence. */
export async function createSimulation(options: SimulationOptions) {
  initialized ??= RAPIER.init();
  await initialized;
  return new MachineSimulation(options);
}

class MachineSimulation {
  private world: RAPIER.World;
  private pilots = new Map<string, Pilot>();
  private targets: Target[] = [];
  private bullets: Bullet[] = [];
  private muzzleHits: { ownerId: string; colliderHandle: number; position: Vector3 }[] = [];
  private hitOwners = new Map<number, { kind: 'player' | 'target'; id: string }>();
  private events: SimulationEvent[] = [];
  private tick = 0;
  private time = 0;
  private runningTime = 0;
  private accumulator = 0;
  private serial = 0;
  private status: Snapshot['status'] = 'waiting';
  private result: MatchResult | null = null;
  private destroyed = false;
  readonly mode: MatchMode;
  readonly matchId: string;
  readonly duration: number;

  constructor(options: SimulationOptions) {
    this.mode = options.mode;
    this.matchId = options.matchId ?? randomUUID();
    this.duration = clamp(options.duration ?? 180, 1, 180);
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = DT;
    this.fixedBox({ x: 0, y: -0.15, z: 0 }, { x: 24, y: 0.15, z: 24 });
    this.fixedBox({ x: -24.25, y: 6, z: 0 }, { x: 0.25, y: 6, z: 24.5 });
    this.fixedBox({ x: 24.25, y: 6, z: 0 }, { x: 0.25, y: 6, z: 24.5 });
    this.fixedBox({ x: 0, y: 6, z: -24.25 }, { x: 24, y: 6, z: 0.25 });
    this.fixedBox({ x: 0, y: 6, z: 24.25 }, { x: 24, y: 6, z: 0.25 });
    this.fixedBox({ x: 0, y: 12.25, z: 0 }, { x: 24, y: 0.25, z: 24 });
    this.fixedBox({ x: -5, y: 1, z: -1 }, { x: 1.1, y: 1, z: 1.1 });
    this.fixedBox({ x: 5, y: 1, z: -1 }, { x: 1.1, y: 1, z: 1.1 });
    if (this.mode === 'training') {
      for (const [index, position] of [
        { x: 0, y: 1.45, z: -8 }, { x: -7, y: 1.45, z: -9 }, { x: 7, y: 1.45, z: -9 },
      ].entries()) {
        const collider = this.world.createCollider(RAPIER.ColliderDesc.ball(0.72).setTranslation(position.x, position.y, position.z));
        const target = { id: `target-${index + 1}`, position, radius: 0.72, health: 140, maxHealth: 140, collider };
        this.targets.push(target);
        this.hitOwners.set(collider.handle, { kind: 'target', id: target.id });
      }
    }
  }

  private fixedBox(position: Vector3, half: Vector3) {
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z)
      .setTranslation(position.x, position.y, position.z).setFriction(0.6));
  }

  addPlayer(id: string): void {
    if (this.destroyed || this.status === 'finished') throw new Error('match-not-joinable');
    if (this.pilots.has(id)) return;
    if (this.pilots.size >= (this.mode === 'training' ? 1 : 2)) throw new Error('room-full');
    const second = this.pilots.size === 1;
    const yaw = second ? Math.PI : 0;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 1.05, second ? -8 : 6).setLinearDamping(0.3).setAngularDamping(8).setCcdEnabled(true));
    // A stable movement capsule is the explicit prototype approximation. Body
    // position/gravity/contact are dynamic; articulated posture is not shipped.
    body.lockRotations(true, true);
    const collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(0.6, 0.42)
      .setMass(MASS).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min), body);
    this.hitOwners.set(collider.handle, { kind: 'player', id });
    this.pilots.set(id, {
      id, body, collider, input: { ...neutral(), aimYaw: yaw }, inputAt: -10, inputTimes: [],
      maxSeq: 0, appliedSeq: 0, appliedAtTick: 0, yaw, pitch: 0,
      energy: ENERGY_CAPACITY, health: 1000, heat: 0, overheated: false,
      grounded: false, boosting: false, lastShotAt: -10, shotsFired: 0,
    });
    this.status = this.mode === 'training' || this.pilots.size === 2 ? 'running' : 'waiting';
  }

  removePlayer(id: string): void {
    const pilot = this.pilots.get(id);
    if (!pilot || this.destroyed) return;
    if (this.mode === 'arena' && this.status === 'running') {
      const other = [...this.pilots.keys()].find((key) => key !== id) ?? null;
      this.finish(other, 'player-left');
    }
    this.hitOwners.delete(pilot.collider.handle);
    this.world.removeRigidBody(pilot.body);
    this.pilots.delete(id);
  }

  applyInput(id: string, data: unknown): InputAcceptance {
    if (this.destroyed || this.status === 'finished') return { accepted: false, reason: 'match-finished' };
    const pilot = this.pilots.get(id);
    if (!pilot) return { accepted: false, reason: 'unknown-player' };
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { accepted: false, reason: 'invalid-input' };
    const raw = data as Record<string, unknown>;
    const fields = new Set(['seq', 'moveX', 'moveZ', 'aimYaw', 'aimPitch', 'fire', 'boost', 'lift']);
    if (Object.keys(raw).some((key) => !fields.has(key))) return { accepted: false, reason: 'unknown-field' };
    for (const key of ['seq', 'moveX', 'moveZ', 'aimYaw', 'aimPitch']) {
      if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) return { accepted: false, reason: 'invalid-number' };
    }
    const seq = raw.seq as number;
    if (!Number.isSafeInteger(seq) || seq <= pilot.maxSeq || seq > pilot.maxSeq + 1024) return { accepted: false, reason: 'invalid-sequence' };
    for (const key of ['fire', 'boost', 'lift']) if (typeof raw[key] !== 'boolean') return { accepted: false, reason: 'invalid-button' };
    pilot.inputTimes = pilot.inputTimes.filter((time) => time > this.time - 1);
    if (pilot.inputTimes.length >= 30) return { accepted: false, reason: 'input-rate-limit' };
    let moveX = clamp(raw.moveX as number, -1, 1), moveZ = clamp(raw.moveZ as number, -1, 1);
    const length = Math.hypot(moveX, moveZ);
    if (length > 1) { moveX /= length; moveZ /= length; }
    pilot.input = {
      seq, moveX, moveZ, aimYaw: angleDelta(raw.aimYaw as number, 0),
      aimPitch: clamp(raw.aimPitch as number, -1.2, 1.2),
      fire: raw.fire as boolean, boost: raw.boost as boolean, lift: raw.lift as boolean,
    };
    pilot.inputAt = this.time;
    pilot.inputTimes.push(this.time);
    pilot.maxSeq = seq;
    return { accepted: true };
  }

  step(deltaSeconds = DT): void {
    if (this.destroyed || this.status === 'finished') return;
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    this.accumulator += Math.min(deltaSeconds, 0.25);
    while (this.accumulator + 1e-10 >= DT && (this.status as Snapshot['status']) !== 'finished') {
      this.advance();
      this.accumulator -= DT;
    }
  }

  private advance() {
    this.tick++;
    this.time += DT;
    if (this.status === 'running') this.runningTime += DT;
    for (const pilot of this.pilots.values()) {
      pilot.body.resetForces(true);
      const position = pilot.body.translation();
      const support = this.world.castRayAndGetNormal(new RAPIER.Ray(copy(position), { x: 0, y: -1, z: 0 }), 1.14, true,
        undefined, undefined, pilot.collider);
      pilot.grounded = Boolean(support && support.normal.y > 0.5);
      const current = this.status === 'running' && this.time - pilot.inputAt <= 0.25 + 1e-8
        ? pilot.input : { ...neutral(pilot.appliedSeq), aimYaw: pilot.yaw, aimPitch: pilot.pitch };
      if (current.seq > pilot.appliedSeq) {
        pilot.appliedSeq = current.seq;
        pilot.appliedAtTick = this.tick;
      }
      pilot.yaw += clamp(angleDelta(current.aimYaw, pilot.yaw), -Math.PI * DT, Math.PI * DT);
      pilot.pitch += clamp(current.aimPitch - pilot.pitch, -Math.PI * DT, Math.PI * DT);
      pilot.boosting = false;
      if (this.status !== 'running') continue;
      pilot.energy = Math.max(0, pilot.energy - 500 * DT);
      if (pilot.energy > 0 && !pilot.overheated && current.boost) this.boost(pilot, current);
      else if (pilot.grounded) this.groundDrive(pilot, current);
      if (pilot.heat >= 100) pilot.overheated = true;
      if (current.fire && !pilot.overheated && pilot.health > 0 && this.time - pilot.lastShotAt >= 0.25 - 1e-8) {
        if (pilot.energy >= 500 && this.bullets.filter((b) => b.ownerId === pilot.id).length < 16) this.shoot(pilot);
      }
      if (!pilot.boosting && this.time - pilot.lastShotAt >= 1) pilot.energy = Math.min(ENERGY_CAPACITY, pilot.energy + 3000 * DT);
      pilot.heat = Math.max(0, Math.min(100, pilot.heat) - (pilot.boosting || this.time - pilot.lastShotAt < 1 ? 10 : 6) * DT);
      if (pilot.overheated && pilot.heat <= 60) pilot.overheated = false;
    }
    this.world.step();
    // Close contacts are resolved in the same damage phase as flying bullets,
    // so an earlier pilot in the input loop cannot suppress a same-tick trade.
    for (const hit of this.muzzleHits) this.applyHit(hit.ownerId, hit.colliderHandle, hit.position);
    this.muzzleHits = [];
    this.advanceBullets();
    if (this.status !== 'running') return;
    const dead = [...this.pilots.values()].filter((p) => p.health <= 0);
    if (dead.length) this.finish(dead.length === this.pilots.size ? null : [...this.pilots.values()].find((p) => p.health > 0)?.id ?? null, 'core-destroyed');
    else if (this.mode === 'training' && this.targets.every((t) => t.health <= 0)) this.finish([...this.pilots.keys()][0] ?? null, 'targets-cleared');
    else if (this.runningTime + 1e-8 >= this.duration) {
      const ordered = [...this.pilots.values()].sort((a, b) => b.health - a.health);
      this.finish(ordered.length === 1 || ordered[0].health > ordered[1].health ? ordered[0]?.id ?? null : null, 'time-limit');
    }
  }

  private localDirection(pilot: Pilot, input: InputFrame): Vector3 {
    const c = Math.cos(pilot.yaw), s = Math.sin(pilot.yaw);
    return { x: input.moveX * c + input.moveZ * s, y: 0, z: -input.moveX * s + input.moveZ * c };
  }

  private groundDrive(pilot: Pilot, input: InputFrame) {
    const direction = this.localDirection(pilot, input), velocity = pilot.body.linvel();
    let x = (direction.x * 6 - velocity.x) * MASS / 0.22;
    let z = (direction.z * 6 - velocity.z) * MASS / 0.22;
    const force = Math.hypot(x, z), maximum = 1200;
    if (force > maximum) { x *= maximum / force; z *= maximum / force; }
    if (pilot.energy <= 0 && x * velocity.x + z * velocity.z > 0) return;
    let power = Math.max(0, x * (velocity.x + x * DT / MASS / 2) + z * (velocity.z + z * DT / MASS / 2));
    const available = Math.min(4800, pilot.energy * 0.8 / DT);
    if (power > available && power > 0) { const ratio = available / power; x *= ratio; z *= ratio; power *= ratio; }
    pilot.body.addForce({ x, y: 0, z }, true);
    pilot.energy = Math.max(0, pilot.energy - power / 0.8 * DT);
  }

  private boost(pilot: Pilot, input: InputFrame) {
    const direction = this.localDirection(pilot, input);
    direction.y = input.lift ? 1 : 0;
    let length = Math.hypot(direction.x, direction.y, direction.z);
    if (length < 1e-8) { direction.x = -Math.sin(pilot.yaw); direction.z = -Math.cos(pilot.yaw); length = 1; }
    const inputWatts = Math.min(12000, pilot.energy / DT);
    const velocity = pilot.body.linvel();
    let force = 3000 * inputWatts / 12000;
    const along = (direction.x * velocity.x + direction.y * velocity.y + direction.z * velocity.z) / length;
    if (along > 12) force = 0;
    const work = Math.max(0, force * (along + force * DT / MASS / 2));
    if (work > 0.8 * inputWatts) force *= 0.8 * inputWatts / work;
    pilot.body.addForce({ x: direction.x / length * force, y: direction.y / length * force, z: direction.z / length * force }, true);
    pilot.energy = Math.max(0, pilot.energy - inputWatts * DT);
    pilot.heat += 15 * DT;
    pilot.boosting = force > 0;
  }

  private shoot(pilot: Pilot) {
    pilot.lastShotAt = this.time;
    pilot.energy -= 500;
    pilot.heat += 8;
    pilot.shotsFired++;
    if (pilot.heat >= 100) pilot.overheated = true;
    const bodyPosition = pilot.body.translation();
    const direction = { x: -Math.sin(pilot.yaw) * Math.cos(pilot.pitch), y: Math.sin(pilot.pitch), z: -Math.cos(pilot.yaw) * Math.cos(pilot.pitch) };
    const start = { x: bodyPosition.x, y: bodyPosition.y + 0.48, z: bodyPosition.z };
    const blocker = this.world.castRay(new RAPIER.Ray(start, direction), 0.9, true, undefined, undefined, pilot.collider);
    this.event({ type: 'shot', playerId: pilot.id, position: start });
    if (blocker) {
      if (this.hitOwners.has(blocker.collider.handle)) {
        this.muzzleHits.push({ ownerId: pilot.id, colliderHandle: blocker.collider.handle, position: {
          x: start.x + direction.x * blocker.timeOfImpact,
          y: start.y + direction.y * blocker.timeOfImpact,
          z: start.z + direction.z * blocker.timeOfImpact,
        } });
      } else this.event({ type: 'rejected', playerId: pilot.id, reason: 'muzzle-blocked' });
      return;
    }
    const position = { x: start.x + direction.x * 0.9, y: start.y + direction.y * 0.9, z: start.z + direction.z * 0.9 };
    this.bullets.push({ id: `${this.matchId}:bullet:${++this.serial}`, ownerId: pilot.id, position,
      velocity: { x: direction.x * 45, y: direction.y * 45, z: direction.z * 45 }, life: 2 });
  }

  private advanceBullets() {
    const remaining: Bullet[] = [];
    for (const bullet of this.bullets) {
      const speed = Math.hypot(bullet.velocity.x, bullet.velocity.y, bullet.velocity.z);
      const direction = { x: bullet.velocity.x / speed, y: bullet.velocity.y / speed, z: bullet.velocity.z / speed };
      const owner = this.pilots.get(bullet.ownerId);
      const hit = this.world.castRay(new RAPIER.Ray(bullet.position, direction), speed * DT, true, undefined, undefined, owner?.collider);
      if (hit) {
        const position = { x: bullet.position.x + direction.x * hit.timeOfImpact, y: bullet.position.y + direction.y * hit.timeOfImpact, z: bullet.position.z + direction.z * hit.timeOfImpact };
        this.applyHit(bullet.ownerId, hit.collider.handle, position);
        continue;
      }
      bullet.position = { x: bullet.position.x + bullet.velocity.x * DT, y: bullet.position.y + bullet.velocity.y * DT, z: bullet.position.z + bullet.velocity.z * DT };
      bullet.life -= DT;
      if (bullet.life > 0) remaining.push(bullet);
    }
    this.bullets = remaining;
  }

  private applyHit(ownerId: string, colliderHandle: number, position: Vector3) {
    const target = this.hitOwners.get(colliderHandle);
    if (!target) return;
    if (target.kind === 'player') {
      const pilot = this.pilots.get(target.id);
      if (pilot) pilot.health = Math.max(0, pilot.health - 35);
    } else {
      const trainingTarget = this.targets.find((item) => item.id === target.id);
      if (trainingTarget) {
        trainingTarget.health = Math.max(0, trainingTarget.health - 35);
        if (trainingTarget.health === 0) {
          this.hitOwners.delete(trainingTarget.collider.handle);
          trainingTarget.collider.setEnabled(false);
        }
      }
    }
    this.event({ type: 'hit', playerId: ownerId, targetId: target.id, damage: 35, position });
  }

  private event(event: Omit<SimulationEvent, 'id' | 'tick'>) {
    this.events.push({ ...event, tick: this.tick, id: `${this.matchId}:event:${++this.serial}` });
    if (this.events.length > 48) this.events.shift();
  }

  private finish(winnerId: string | null, reason: MatchResult['reason']) {
    if (this.result) return;
    this.status = 'finished';
    this.result = { matchId: this.matchId, resultId: `${this.matchId}:result`, winnerId, reason, finishedAtTick: this.tick };
  }

  getSnapshot(): Snapshot {
    if (this.destroyed) throw new Error('simulation-destroyed');
    const players: PlayerSnapshot[] = [...this.pilots.values()].map((pilot) => ({
      id: pilot.id, position: copy(pilot.body.translation()), velocity: copy(pilot.body.linvel()),
      rotationYaw: pilot.yaw, aimPitch: pilot.pitch, energy: Math.round(pilot.energy), health: pilot.health,
      heat: Math.round(pilot.heat * 100) / 100, grounded: pilot.grounded, boosting: pilot.boosting,
      overheated: pilot.overheated, lastAppliedSeq: pilot.appliedSeq, appliedAtTick: pilot.appliedAtTick, shotsFired: pilot.shotsFired,
    }));
    return {
      ruleset: SIM_RULESET, matchId: this.matchId, mode: this.mode, serverTick: this.tick,
      remaining: Math.max(0, this.duration - this.runningTime), status: this.status, players,
      targets: this.targets.map(({ collider: _collider, ...target }) => ({ ...target, position: copy(target.position) })),
      projectiles: this.bullets.map(({ life: _life, ...bullet }) => ({ ...bullet, position: copy(bullet.position), velocity: copy(bullet.velocity) })),
      events: this.events.map((event) => ({ ...event, ...(event.position ? { position: copy(event.position) } : {}) })),
      result: this.result ? { ...this.result } : null,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.world.free();
    this.pilots.clear();
    this.bullets = [];
    this.muzzleHits = [];
  }
}

export type Simulation = Awaited<ReturnType<typeof createSimulation>>;
