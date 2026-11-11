import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../packages/sim/src/index.ts';
import type { InputFrame } from '../packages/protocol/src/index.ts';

const frame = (seq: number, values: Partial<InputFrame> = {}): InputFrame => ({
  seq, moveX: 0, moveZ: 0, aimYaw: 0, aimPitch: 0, fire: false, boost: false, lift: false, ...values,
});

test('Space jumps once from the ground, pays impulse energy and cannot jump again in air', async () => {
  const held = await driver(), released = await driver();
  try {
    const before = held.sim.getSnapshot().players[0];
    assert.equal(before.landingRecovery, 0, 'initial ground contact must not count as a landing');
    const jump = held.drive(1, { jump: true, lift: true });
    assert.ok(jump.velocity.y > 6 && jump.velocity.y < 6.6, 'a ground jump supplies one bounded upward impulse');
    assert.equal(jump.grounded, false, 'ascending roots cannot remain grounded because the ray still reaches the floor');
    assert.ok(before.energy - jump.energy >= 4753, '180kg at 6.5m/s costs at least kinetic energy divided by 0.8 efficiency');
    const firstHeld = held.drive(9, { jump: true, lift: true });
    released.drive(1, { jump: true });
    const firstReleased = released.drive(9);
    assert.ok(Math.abs(firstHeld.position.y - firstReleased.position.y) < 0.01, 'held lift does not stack thruster force onto the first 0.18 seconds of a jump');
    released.drive(1, { jump: false });
    const beforeRepress = released.sim.getSnapshot().players[0];
    const repress = released.drive(1, { jump: true });
    assert.ok(repress.velocity.y < beforeRepress.velocity.y, 'repressing Space in midair cannot add another jump impulse');
    const later = held.drive(20, { jump: true });
    assert.ok(later.position.y > jump.position.y + 1, 'the impulse moves the real body upward');
    assert.ok(later.velocity.y < firstHeld.velocity.y, 'holding jump alone is not repeated jumping');
  } finally { held.sim.destroy(); released.sim.destroy(); }
});

async function driver() {
  const sim = await createSimulation({ mode: 'training' });
  sim.addPlayer('pilot');
  let sequence = 0;
  const drive = (ticks: number, values: Partial<InputFrame> = {}) => {
    for (let tick = 0; tick < ticks; tick++) {
      if (tick % 3 === 0) assert.equal(sim.applyInput('pilot', frame(++sequence, values)).accepted, true);
      sim.step();
    }
    return sim.getSnapshot().players[0];
  };
  drive(30);
  return { sim, drive, send: (values: Partial<InputFrame> = {}) => sim.applyInput('pilot', frame(++sequence, values)) };
}

test('walking follows camera yaw immediately and diagonal walking has no speed advantage', async () => {
  const camera = await driver(), straight = await driver(), diagonal = await driver();
  try {
    const turned = camera.drive(6, { moveZ: -1, aimYaw: Math.PI / 2 });
    assert.ok(turned.velocity.x < -1, 'camera-left forward input must move left before the body finishes turning');
    assert.ok(Math.abs(turned.velocity.z) < 0.05, 'movement must use camera yaw rather than the lagging body yaw');
    assert.ok(turned.rotationYaw < Math.PI / 2, 'visual facing still turns at a finite angular rate');
    const axis = straight.drive(60, { moveX: 1 });
    const both = diagonal.drive(60, { moveX: 1, moveZ: -1 });
    const speed = (v: { x: number; z: number }) => Math.hypot(v.x, v.z);
    assert.ok(speed(axis.velocity) > 5 && speed(axis.velocity) < 6.2, 'ordinary walking settles near six metres per second');
    assert.ok(Math.abs(speed(axis.velocity) - speed(both.velocity)) < 0.05, 'normalized diagonal input must share the walk speed budget');
  } finally { camera.sim.destroy(); straight.sim.destroy(); diagonal.sim.destroy(); }
});

test('boost rapidly exceeds walk speed and airborne steering applies finite thrust while retaining inertia', async () => {
  const walk = await driver(), boosted = await driver(), air = await driver(), heldLift = await driver();
  try {
    const walking = walk.drive(60, { moveX: 1 });
    const fast = boosted.drive(60, { boost: true, aimYaw: -Math.PI / 2 });
    assert.ok(fast.velocity.x > 12 && fast.velocity.x < 16.5, 'directionless boost uses camera forward and reaches a bounded fast speed');
    assert.ok(fast.position.x > walking.position.x * 1.7, 'quick propulsion must be observably faster than walking');
    assert.ok(fast.energy > 0 && fast.energy < walking.energy - 10000, 'fast movement pays finite battery energy');
    air.drive(1, { jump: true });
    const airborne = air.drive(24, { boost: true, moveX: 1 });
    assert.equal(airborne.grounded, false);
    const turning = air.drive(1, { boost: true, moveZ: -1 });
    assert.ok(turning.velocity.x > airborne.velocity.x - 1, 'air steering cannot erase existing velocity in one tick');
    assert.ok(turning.velocity.z < airborne.velocity.z - 0.1, 'the new direction affects actual airborne thrust');
    const turned = air.drive(12, { boost: true, moveZ: -1 });
    assert.ok(turned.velocity.z < -3, 'held airborne direction develops meaningful lateral movement');
    assert.ok(Math.hypot(turned.velocity.x, turned.velocity.z) < 17, 'air steering has a bounded speed target');
    heldLift.drive(1, { jump: true, lift: true });
    const flying = heldLift.drive(30, { jump: true, lift: true });
    assert.equal(flying.boosting, true, 'holding Space can request limited lift after the initial jump window');
    assert.ok(flying.velocity.y > 5, 'held lift can counter gravity using finite propulsion');
  } finally { walk.sim.destroy(); boosted.sim.destroy(); air.sim.destroy(); heldLift.sim.destroy(); }
});

test('airborne propulsion exhausts independent charge, cannot recover in air, and unlocks after landing recovery', async () => {
  const pilot = await driver();
  try {
    let exhausted = pilot.sim.getSnapshot().players[0];
    for (let elapsed = 0; elapsed < 240 && !exhausted.boostOverheated; elapsed += 3) {
      exhausted = pilot.drive(3, { boost: true, lift: true });
    }
    assert.equal(exhausted.boostOverheated, true, 'continuous propulsion must exhaust its independent charge');
    assert.equal(exhausted.boostCharge, 0);
    assert.equal(exhausted.grounded, false, 'the thruster can reach exhaustion in air');
    assert.ok(exhausted.energy > 0 && exhausted.energy < 50000, 'charge exhaustion is independent of battery exhaustion');
    assert.equal(exhausted.heat, 0, 'propulsion charge does not create weapon heat');
    const falling = pilot.drive(12, { boost: true, lift: true });
    assert.equal(falling.boosting, false, 'overheated propulsion cannot keep applying lift');
    assert.equal(falling.boostCharge, 0, 'airborne roots cannot recover propulsion charge');
    assert.ok(falling.energy < exhausted.energy, 'battery also cannot recharge in air');
    let landed = falling;
    for (let elapsed = 0; elapsed < 360 && !landed.grounded; elapsed += 3) landed = pilot.drive(3);
    assert.equal(landed.grounded, true, 'gravity lands the exhausted dynamic root');
    assert.ok(landed.landingRecovery > 0.7, 'exhausted landing has the longer recovery');
    const locked = pilot.drive(3, { jump: true, boost: true, lift: true });
    assert.equal(locked.boosting, false, 'landing recovery blocks propulsion');
    assert.ok(locked.velocity.y < 0.5, 'landing recovery also blocks jump');
    const recovered = pilot.drive(66);
    assert.equal(recovered.boostOverheated, false);
    assert.ok(recovered.boostCharge >= 35, 'ground cooldown must restore enough charge to unlock propulsion');
    assert.equal(recovered.landingRecovery, 0);
    assert.equal(pilot.drive(3, { boost: true, moveX: 1 }).boosting, true);
  } finally { pilot.sim.destroy(); }
});

test('Shift slows ground travel and neutral or expired input brakes with finite forces', async () => {
  const slow = await driver(), stale = await driver();
  try {
    const moving = slow.drive(60, { moveX: 1, slow: true });
    assert.ok(moving.velocity.x > 2.2 && moving.velocity.x < 2.6, 'Shift selects the slower 2.5m/s ground controller');
    const braking = slow.drive(1);
    assert.ok(braking.velocity.x > 0 && braking.velocity.x < moving.velocity.x, 'releasing movement starts finite braking rather than erasing velocity');
    assert.ok(braking.position.x > moving.position.x, 'the physical body travels while braking');
    assert.ok(Math.abs(slow.drive(30).velocity.x) < 0.15, 'neutral ground input comes to a prompt stop');
    stale.drive(18, { boost: true, moveX: 1 });
    for (let tick = 0; tick < 18; tick++) stale.sim.step();
    assert.equal(stale.sim.getSnapshot().players[0].boosting, false, 'a 250ms expired input stops issuing propulsion');
    for (let tick = 0; tick < 120; tick++) stale.sim.step();
    assert.ok(Math.abs(stale.sim.getSnapshot().players[0].velocity.x) < 0.15, 'expired ground controls brake rather than drive forever');
  } finally { slow.sim.destroy(); stale.sim.destroy(); }
});

test('ordinary landing recovers briefly and stale input cannot re-arm a held jump button', async () => {
  const pilot = await driver();
  try {
    pilot.drive(1, { jump: true });
    let landed = pilot.sim.getSnapshot().players[0];
    for (let tick = 0; tick < 180 && !landed.grounded; tick++) {
      pilot.sim.step();
      landed = pilot.sim.getSnapshot().players[0];
    }
    assert.equal(landed.grounded, true);
    assert.ok(landed.landingRecovery > 0.15 && landed.landingRecovery <= 0.18, 'ordinary landing gets the short recovery interval');
    for (let tick = 0; tick < 60; tick++) pilot.sim.step();
    const resumed = pilot.drive(3, { jump: true });
    assert.ok(resumed.velocity.y < 0.5, 'resuming an expired held Space cannot fabricate a fresh jump edge');
    pilot.drive(3, { jump: false });
    assert.ok(pilot.drive(1, { jump: true }).velocity.y > 6, 'explicit release and press re-arm the grounded jump');
  } finally { pilot.sim.destroy(); }
});

test('movement buttons accept omitted legacy values, reject malformed flags and reject forged resources', async () => {
  const pilot = await driver();
  try {
    const before = pilot.sim.getSnapshot().players[0];
    for (const values of [{ jump: 1 }, { jump: undefined }, { slow: 'true' }, { slow: null }]) {
      assert.equal(pilot.send(values as Partial<InputFrame>).reason, 'invalid-button');
    }
    for (const values of [{ boostCharge: 1000 }, { boostOverheated: false }, { landingRecovery: 0 }, { energy: 999999 }]) {
      assert.equal(pilot.send(values as Partial<InputFrame>).reason, 'unknown-field');
    }
    assert.equal(pilot.send().accepted, true, 'legacy frames without optional jump/slow are still accepted');
    const detached = pilot.sim.getSnapshot();
    detached.players[0].boostCharge = -999;
    detached.players[0].position.y = 10000;
    assert.deepEqual(pilot.sim.getSnapshot().players[0], before, 'client-side snapshot mutation cannot change authoritative resources or positions');
  } finally { pilot.sim.destroy(); }
});
