import test from 'node:test';
import assert from 'node:assert/strict';
import {applyMouseLook} from '../apps/web/src/mouseLook.ts';
import {makeInputFrame, type ControlAction} from '../apps/web/src/input.ts';
import {createSimulation} from '../packages/sim/src/index.ts';

test('moving the mouse right and up turns the real server body before forward drives right', async () => {
  const sim = await createSimulation({mode: 'training'});
  try {
    sim.addPlayer('pilot');
    const before = sim.getSnapshot().players[0];
    const aim = applyMouseLook({yaw: 0, pitch: 0}, 500, -100);
    const held = new Set<ControlAction>();
    let seq = 0;
    assert.equal(sim.applyInput('pilot', makeInputFrame(++seq, held, aim)).accepted, true);
    sim.step();
    const firstStep = sim.getSnapshot().players[0];
    assert.ok(firstStep.rotationYaw < 0 && firstStep.rotationYaw >= -0.05236,
      'mouse look must retain the server turn limit of 180 degrees per second at 60 Hz');
    assert.equal(firstStep.position.x, before.position.x, 'looking cannot teleport the root');
    assert.equal(firstStep.position.z, before.position.z);
    for (let tick = 1; tick < 45; tick++) {
      if (tick % 3 === 0) sim.applyInput('pilot', makeInputFrame(++seq, held, aim));
      sim.step();
    }
    const turned = sim.getSnapshot().players[0];
    assert.ok(turned.rotationYaw < -1.4 && turned.rotationYaw > -1.6, 'a rightward mouse sweep turns right');
    assert.ok(turned.aimPitch > 0.2 && turned.aimPitch < 0.4, 'an upward mouse sweep aims upward');
    held.add('forward');
    for (let tick = 0; tick < 90; tick++) {
      if (tick % 3 === 0) sim.applyInput('pilot', makeInputFrame(++seq, held, aim));
      sim.step();
    }
    const driven = sim.getSnapshot().players[0];
    assert.ok(driven.position.x > before.position.x + 3, 'forward must drive the authoritative root toward the right');
    assert.ok(Math.abs(driven.position.z - before.position.z) < 1, 'forward follows the new heading');
  } finally {sim.destroy();}
});

test('long mouse sweeps stay within the view limits and can immediately reverse away from them', () => {
  const lookingUp = applyMouseLook({yaw: 0, pitch: 0}, 0, -10000);
  assert.ok(Math.abs(lookingUp.pitch - 0.6981317007977318) < 1e-12, 'looking up stops at 40 degrees');
  const lookingDown = applyMouseLook(lookingUp, 0, 10000);
  assert.ok(Math.abs(lookingDown.pitch + 0.5235987755982988) < 1e-12, 'looking down stops at -30 degrees');
  assert.ok(applyMouseLook(lookingUp, 0, 1).pitch < lookingUp.pitch, 'the upper limit cannot leave the view stuck');
  assert.ok(applyMouseLook(lookingDown, 0, -1).pitch > lookingDown.pitch, 'the lower limit cannot leave the view stuck');
  const crossed = applyMouseLook({yaw: -3.1, pitch: 0}, 100, 0);
  assert.ok(crossed.yaw > 2.8 && crossed.yaw < 3, 'turning across the rear direction wraps without a discontinuous full turn');
  for (const deltaX of [Number.MAX_VALUE, -Number.MAX_VALUE]) {
    const aim = applyMouseLook({yaw: 0, pitch: 0}, deltaX, 0);
    assert.ok(Number.isFinite(aim.yaw) && aim.yaw >= -Math.PI && aim.yaw <= Math.PI,
      'even an extreme finite pointer delta produces a bounded server aim');
  }
});

test('invalid pointer movement cannot poison a valid aim or prevent later mouse control', () => {
  const original = {yaw: -1, pitch: 0.2};
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(applyMouseLook(original, invalid, 10), original);
    assert.deepEqual(applyMouseLook(original, 10, invalid), original);
  }
  const resumed = applyMouseLook(original, -10, -10);
  assert.ok(resumed.yaw > original.yaw && resumed.pitch > original.pitch, 'valid movement still turns left and up');
  assert.deepEqual(original, {yaw: -1, pitch: 0.2}, 'the mouse adapter must not mutate existing UI state');
});
