import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../packages/sim/src/index.ts';
import type { InputFrame } from '../packages/protocol/src/index.ts';

const frame = (seq: number, values: Partial<InputFrame> = {}): InputFrame => ({
  seq, moveX: 0, moveZ: 0, aimYaw: 0, aimPitch: 0, fire: false, boost: false, lift: false, ...values,
});

test('a player moves through the authoritative world and stale input stops driving', async () => {
  const sim = await createSimulation({ mode: 'training', matchId: 'movement-test' });
  try {
    sim.addPlayer('pilot');
    const before = sim.getSnapshot().players[0].position;
    assert.equal(sim.applyInput('pilot', { seq: 1, moveX: 1, moveZ: 0, aimYaw: 0, aimPitch: 0, fire: false, boost: false, lift: false }).accepted, true);
    for (let i = 0; i < 120; i++) sim.step();
    const after = sim.getSnapshot().players[0];
    assert.ok(after.position.x > before.x + 0.05, 'accepted movement must alter authoritative position');
    assert.ok(Math.abs(after.velocity.x) < 0.15, 'after input timeout the ground controller must brake instead of driving forever');
    assert.ok(after.position.y > 0.8 && after.position.y < 1.3, 'a real collider must keep the root above the floor');
  } finally { sim.destroy(); }
});

test('forged transforms, NaN, duplicate sequence and excess input cannot mutate the world', async () => {
  const sim = await createSimulation({ mode: 'training' });
  try {
    sim.addPlayer('pilot');
    const before = sim.getSnapshot().players[0];
    assert.equal(sim.applyInput('pilot', { ...frame(1), position: { x: 9000, y: 9000, z: 9000 } }).accepted, false);
    assert.equal(sim.applyInput('pilot', frame(1, { moveX: NaN })).accepted, false);
    assert.equal(sim.applyInput('pilot', frame(1)).accepted, true);
    assert.equal(sim.getSnapshot().players[0].lastAppliedSeq, 0, 'received input is not acknowledged before its physics step');
    assert.equal(sim.applyInput('pilot', frame(1)).accepted, false);
    for (let seq = 2; seq <= 30; seq++) assert.equal(sim.applyInput('pilot', frame(seq)).accepted, true);
    assert.equal(sim.applyInput('pilot', frame(31)).reason, 'input-rate-limit');
    assert.deepEqual(sim.getSnapshot().players[0].position, before.position);
    sim.step();
    assert.equal(sim.getSnapshot().players[0].lastAppliedSeq, 30);
  } finally { sim.destroy(); }
});

test('held fire respects cooldown and real swept projectiles damage a training target', async () => {
  const sim = await createSimulation({ mode: 'training' });
  try {
    sim.addPlayer('pilot');
    let seq = 0;
    for (let tick = 0; tick < 60; tick++) {
      if (tick % 3 === 0) sim.applyInput('pilot', frame(++seq, { fire: true }));
      sim.step();
    }
    assert.equal(sim.getSnapshot().players[0].shotsFired, 4, 'a 0.25-second weapon cannot fire once per input or physics frame');
    sim.applyInput('pilot', frame(++seq));
    for (let tick = 0; tick < 60; tick++) sim.step();
    const snapshot = sim.getSnapshot();
    assert.equal(snapshot.targets[0].health, 0, 'four authoritative 35-point hits destroy the 140-point target');
    assert.equal(snapshot.players[0].shotsFired, 4, 'neutral input does not leave a stuck firing state');
    assert.ok(snapshot.events.some((event) => event.type === 'hit' && event.targetId === 'target-1'));
  } finally { sim.destroy(); }
});

test('a shot hits an enemy touching the shooter instead of treating that enemy as a blocked muzzle', async () => {
  const sim = await createSimulation({ mode: 'arena' });
  try {
    sim.addPlayer('shooter');
    sim.addPlayer('opponent');
    let seq = 0;
    let reachedContact = false;
    for (let tick = 0; tick < 600; tick++) {
      if (tick % 3 === 0) sim.applyInput('shooter', frame(++seq, { moveZ: -1 }));
      sim.step();
      const [shooter, opponent] = sim.getSnapshot().players;
      if (Math.abs(shooter.position.z - opponent.position.z) <= 0.87) { reachedContact = true; break; }
    }
    assert.equal(reachedContact, true, 'real dynamic capsules must reach contact through normal movement');
    sim.applyInput('shooter', frame(++seq));
    for (let tick = 0; tick < 30; tick++) sim.step();
    const before = sim.getSnapshot();
    assert.ok(Math.abs(before.players[0].position.z - before.players[1].position.z) < 0.9);
    sim.applyInput('shooter', frame(++seq, { fire: true }));
    sim.step();
    const after = sim.getSnapshot();
    assert.equal(after.players[1].health, before.players[1].health - 35, 'the enemy inside the muzzle path must receive one authoritative hit');
    assert.equal(after.players[0].shotsFired, before.players[0].shotsFired + 1);
    assert.ok(before.players[0].energy - after.players[0].energy >= 500, 'point-blank shots still pay weapon energy');
    assert.equal(after.events.filter((event) => event.type === 'hit' && event.targetId === 'opponent').length, 1);
    sim.step();
    assert.equal(sim.getSnapshot().players[1].health, after.players[1].health, 'cooldown prevents repeated damage in the next tick');
  } finally { sim.destroy(); }
});

test('a solid cover inside the muzzle path still blocks the shot', async () => {
  const sim = await createSimulation({ mode: 'training' });
  try {
    sim.addPlayer('pilot');
    let seq = 0;
    // Begin braking before the cover's X coordinate: the dynamic root has
    // finite braking force and should not stop instantaneously at the input edge.
    for (let tick = 0; tick < 180 && sim.getSnapshot().players[0].position.x < 3; tick++) {
      if (tick % 3 === 0) sim.applyInput('pilot', frame(++seq, { moveX: 1 }));
      sim.step();
    }
    sim.applyInput('pilot', frame(++seq));
    for (let tick = 0; tick < 60; tick++) sim.step();
    for (let tick = 0; tick < 240; tick++) {
      if (tick % 3 === 0) sim.applyInput('pilot', frame(++seq, { moveZ: -1 }));
      sim.step();
    }
    const position = sim.getSnapshot().players[0].position;
    assert.ok(position.x > 3.9 && position.x < 6.1 && position.z > 0.45 && position.z < 0.7, `the real root must be touching the front of the cover: ${JSON.stringify(position)}`);
    sim.applyInput('pilot', frame(++seq, { fire: true }));
    sim.step();
    const snapshot = sim.getSnapshot();
    assert.equal(snapshot.players[0].shotsFired, 1);
    assert.equal(snapshot.projectiles.length, 0, 'the muzzle must not spawn a projectile beyond a wall');
    assert.ok(snapshot.events.some((event) => event.type === 'rejected' && event.reason === 'muzzle-blocked'));
    assert.ok(snapshot.targets.every((target) => target.health === target.maxHealth));
  } finally { sim.destroy(); }
});

test('lift spends finite energy and releasing the thruster lets the root fall back to the floor', async () => {
  const sim = await createSimulation({ mode: 'training' });
  try {
    sim.addPlayer('pilot');
    let seq = 0;
    for (let tick = 0; tick < 90; tick++) {
      if (tick % 3 === 0) sim.applyInput('pilot', frame(++seq, { boost: true, lift: true }));
      sim.step();
    }
    const lifted = sim.getSnapshot().players[0];
    assert.ok(lifted.position.y > 2, 'an enabled thruster must actually lift the dynamic root');
    assert.ok(lifted.energy >= 0 && lifted.energy < 40000, 'the boost must consume a bounded, nonnegative energy pool');
    sim.applyInput('pilot', frame(++seq));
    for (let tick = 0; tick < 300; tick++) sim.step();
    const landed = sim.getSnapshot().players[0];
    assert.ok(landed.position.y > 0.8 && landed.position.y < 1.3, 'gravity and real floor contact must restore ground height');
    assert.equal(landed.boosting, false);
  } finally { sim.destroy(); }
});

test('two players receive one immutable authoritative result after combat', async () => {
  const sim = await createSimulation({ mode: 'arena', matchId: 'duel-test' });
  try {
    sim.addPlayer('alpha');
    assert.equal(sim.getSnapshot().status, 'waiting');
    sim.addPlayer('beta');
    assert.equal(sim.getSnapshot().status, 'running');
    assert.throws(() => sim.addPlayer('third'), /room-full/);
    let seq = 0;
    for (let tick = 0; tick < 2400 && sim.getSnapshot().status !== 'finished'; tick++) {
      if (tick % 3 === 0) {
        seq++;
        sim.applyInput('alpha', frame(seq, { fire: true }));
        sim.applyInput('beta', frame(seq, { fire: true, aimYaw: Math.PI }));
      }
      sim.step();
    }
    const result = sim.getSnapshot().result;
    assert.ok(result, 'server projectiles must be able to end the actual two-player combat');
    assert.equal(result.matchId, 'duel-test');
    assert.equal(result.reason, 'core-destroyed');
    for (let tick = 0; tick < 120; tick++) sim.step();
    assert.deepEqual(sim.getSnapshot().result, result, 'late input/steps cannot settle a different outcome');
    assert.equal(sim.applyInput('alpha', frame(++seq)).reason, 'match-finished');
  } finally { sim.destroy(); }
});
