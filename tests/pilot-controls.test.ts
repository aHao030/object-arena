import test from 'node:test';
import assert from 'node:assert/strict';
import {createPilotControls} from '../apps/web/src/pilotControls.ts';
import {createSimulation} from '../packages/sim/src/index.ts';

test('a quick jump or shot between network frames is delivered once instead of disappearing', () => {
  for (const action of ['jump', 'fire'] as const) {
    const controls = createPilotControls();
    controls.press(action); controls.release(action);
    assert.equal(controls.read(1, {yaw: 0, pitch: 0})[action], true);
    assert.equal(controls.read(2, {yaw: 0, pitch: 0})[action], false);
  }
});

test('holding continues an action and clearing the room discards both held and queued actions', () => {
  const controls = createPilotControls();
  controls.press('fire'); controls.press('forward');
  assert.equal(controls.read(1, {yaw: 0, pitch: 0}).fire, true);
  assert.equal(controls.read(2, {yaw: 0, pitch: 0}).fire, true);
  controls.press('jump'); controls.release('jump'); controls.clear();
  const neutral = controls.read(3, {yaw: 0, pitch: 0});
  assert.equal(neutral.fire, false); assert.equal(neutral.jump, false); assert.equal(neutral.moveZ, 0);
  assert.equal(controls.isHeld('forward'), false);
});

test('releasing F cannot cancel a held mouse shot and releasing the mouse cannot cancel a held F shot', async () => {
  const sim = await createSimulation({mode:'training'});
  const controls = createPilotControls();
  let seq = 0;
  const advance = (ticks: number) => {
    for (let tick = 0; tick < ticks; tick++) {
      if (tick % 3 === 0) sim.applyInput('pilot', controls.read(++seq, {yaw:0,pitch:0}));
      sim.step();
    }
  };
  try {
    sim.addPlayer('pilot');
    controls.press('fire','mouse:primary'); advance(18);
    controls.press('fire','key:KeyF'); controls.release('fire','key:KeyF');
    const before = sim.getSnapshot().players[0].shotsFired;
    advance(36);
    assert.ok(sim.getSnapshot().players[0].shotsFired > before, 'the mouse is still held after F is released');
    controls.press('fire','key:KeyF'); controls.release('fire','mouse:primary');
    const middle = sim.getSnapshot().players[0].shotsFired;
    advance(36);
    assert.ok(sim.getSnapshot().players[0].shotsFired > middle, 'F is still held after the mouse is released');
    controls.clear();
    const last = sim.getSnapshot().players[0].shotsFired;
    advance(30);
    assert.equal(sim.getSnapshot().players[0].shotsFired, last);
  } finally {sim.destroy();}
});
