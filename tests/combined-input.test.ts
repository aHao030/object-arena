import test from 'node:test';
import assert from 'node:assert/strict';
import {KEY_ACTIONS} from '../apps/web/src/input.ts';
import {createPilotControls} from '../apps/web/src/pilotControls.ts';
import {applyMouseLook} from '../apps/web/src/mouseLook.ts';
import {createSimulation} from '../packages/sim/src/index.ts';

test('W+D+Shift+Space and primary fire move, jump and shoot together while mouse aim changes', async () => {
  const controls = createPilotControls();
  controls.press(KEY_ACTIONS.Space, 'key:Space');
  const jump = controls.read(0, {yaw: 0, pitch: 0});
  assert.equal(jump.jump, true);
  assert.equal(jump.lift, true, 'holding Space also requests limited airborne lift');
  assert.equal(jump.boost, false, 'Space alone does not enable horizontal ground acceleration');
  for (const code of ['KeyW', 'KeyD', 'ShiftLeft', 'Space']) controls.press(KEY_ACTIONS[code], `key:${code}`);
  controls.press('fire', 'mouse:primary');
  let aim = {yaw: 0, pitch: 0};
  const input = controls.read(1, aim);
  assert.equal(input.boost, true, 'Shift must accelerate the combined directional input');
  assert.equal(input.slow, false, 'Shift cannot select the slow controller');
  assert.equal(input.jump, true);
  assert.equal(input.lift, true, 'Space keeps its lift request alongside horizontal acceleration');
  assert.equal(input.fire, true);
  assert.equal(input.moveX, 1);
  assert.equal(input.moveZ, -1);

  const sim = await createSimulation({mode: 'training'});
  let sequence = 1;
  try {
    sim.addPlayer('pilot');
    for (let tick = 0; tick < 30; tick++) sim.step();
    const before = sim.getSnapshot().players[0];
    for (let tick = 0; tick < 24; tick++) {
      if (tick % 3 === 0) {
        aim = applyMouseLook(aim, 4, -2);
        assert.equal(sim.applyInput('pilot', controls.read(++sequence, aim)).accepted, true);
      }
      sim.step();
    }
    const after = sim.getSnapshot().players[0];
    assert.equal(after.grounded, false);
    assert.equal(after.boosting, true);
    assert.ok(after.position.y > before.position.y + 1, 'the real root jumps while accelerating');
    assert.ok(after.velocity.x > 4 && after.velocity.z < -4, 'both horizontal directions contribute to real diagonal movement');
    assert.ok(Math.hypot(after.velocity.x, after.velocity.z) > 6, 'Shift exceeds ordinary walk speed');
    assert.ok(Math.hypot(after.velocity.x, after.velocity.z) < 17, 'diagonal boost retains the speed budget');
    assert.equal(after.shotsFired, 2, 'concurrent movement and jump cannot suppress the quarter-second weapon cadence');
    assert.ok(after.rotationYaw < before.rotationYaw && after.aimPitch > before.aimPitch, 'mouse changes reach authoritative body and weapon aim');
    assert.ok(after.energy > 0 && after.energy < before.energy - 5000, 'jump, thrust and shots pay finite battery energy');
    assert.ok(after.boostCharge > 0 && after.boostCharge < before.boostCharge, 'accelerating consumes finite independent charge');
    assert.ok(after.heat > 0 && after.heat <= 16, 'only the two shots generate weapon heat');
  } finally {sim.destroy();}
});

test('releasing individual keys and primary fire preserves the remaining movement, acceleration and shot sources', async () => {
  const pilot = await driver();
  const {controls} = pilot;
  try {
    for (const code of ['KeyW', 'ArrowUp', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space']) {
      controls.press(KEY_ACTIONS[code], `key:${code}`);
    }
    controls.press('fire', 'button:fire:pointer:7');
    controls.press('fire', 'button:fire:pointer:8');
    controls.press('fire', 'mouse:primary');
    const initial = pilot.drive(1);
    assert.ok(initial.velocity.y > 6, 'the concurrent jump reaches the real body');

    for (const code of ['KeyW', 'KeyD', 'ShiftLeft', 'Space']) controls.release(KEY_ACTIONS[code], `key:${code}`);
    controls.release('fire', 'button:fire:pointer:7');
    controls.release('fire', 'mouse:primary');
    const remaining = controls.read(100, {yaw: 0, pitch: 0});
    assert.equal(remaining.moveX, 0, 'D releases only sideways movement');
    assert.equal(remaining.moveZ, -1, 'ArrowUp keeps forward held after W releases');
    assert.equal(remaining.boost, true, 'right Shift keeps acceleration held after left Shift releases');
    assert.equal(remaining.fire, true, 'the second virtual button keeps shooting held after the first button and primary mouse release');
    assert.equal(remaining.jump, false);
    assert.equal(remaining.lift, false);
    const continuing = pilot.drive(30);
    assert.equal(continuing.boosting, true);
    assert.ok(continuing.velocity.z < -6, 'the remaining forward acceleration still drives the real body');
    assert.ok(continuing.shotsFired > initial.shotsFired, 'the remaining fire source continues authoritative shots');

    for (const code of ['ArrowUp', 'ShiftRight']) controls.release(KEY_ACTIONS[code], `key:${code}`);
    controls.release('fire', 'button:fire:pointer:8');
    const released = controls.read(101, {yaw: 0, pitch: 0});
    assert.equal(released.moveZ, 0);
    assert.equal(released.boost, false);
    assert.equal(released.fire, false);
    const stopped = pilot.drive(30);
    assert.equal(stopped.boosting, false);
    assert.equal(stopped.shotsFired, continuing.shotsFired, 'the final fire release stops subsequent shots');
  } finally {pilot.sim.destroy();}
});

test('concurrent movement, held Space lift and primary fire cannot bypass battery or weapon limits', async () => {
  const pilot = await driver();
  try {
    for (const code of ['KeyW', 'KeyD', 'ShiftLeft', 'Space']) {
      pilot.controls.press(KEY_ACTIONS[code], `key:${code}`);
    }
    pilot.controls.press('fire', 'mouse:primary');
    let exhausted = pilot.sim.getSnapshot().players[0];
    for (let tick = 0; tick < 120 && exhausted.energy > 0; tick += 3) {
      exhausted = pilot.drive(3, {yaw: -0.7, pitch: 0.6});
      assert.ok(exhausted.energy >= 0);
      assert.ok(exhausted.boostCharge >= 0 && exhausted.boostCharge <= 100);
      assert.ok(exhausted.heat >= 0 && exhausted.heat <= 100);
    }
    assert.equal(exhausted.energy, 0, 'the concurrent actions spend a finite battery');
    assert.equal(exhausted.grounded, false, 'the battery can exhaust before landing');
    assert.ok(exhausted.boostCharge > 0, 'this limit is battery exhaustion rather than depleted boost charge');
    assert.ok(exhausted.shotsFired >= 4 && exhausted.shotsFired <= 8,
      'movement and held Space retain the quarter-second weapon cadence during the first two seconds');
    const falling = pilot.drive(12, {yaw: -0.7, pitch: 0.6});
    assert.equal(falling.energy, 0, 'the airborne battery cannot refill to fund more actions');
    assert.equal(falling.boosting, false, 'held Space and acceleration cannot thrust without battery energy');
    assert.equal(falling.shotsFired, exhausted.shotsFired, 'held fire cannot produce unpaid shots');
    assert.equal(falling.boostCharge, exhausted.boostCharge, 'airborne waiting cannot restore boost charge');
    assert.ok(falling.velocity.y < exhausted.velocity.y, 'the real root falls under gravity despite held Space');
  } finally {pilot.sim.destroy();}
});

async function driver() {
  const sim = await createSimulation({mode: 'training'});
  const controls = createPilotControls();
  sim.addPlayer('pilot');
  for (let tick = 0; tick < 30; tick++) sim.step();
  let sequence = 0;
  const drive = (ticks: number, aim = {yaw: 0, pitch: 0}) => {
    for (let tick = 0; tick < ticks; tick++) {
      if (tick % 3 === 0) assert.equal(sim.applyInput('pilot', controls.read(++sequence, aim)).accepted, true);
      sim.step();
    }
    return sim.getSnapshot().players[0];
  };
  return {sim, controls, drive};
}
