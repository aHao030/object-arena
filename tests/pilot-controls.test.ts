import test from 'node:test';
import assert from 'node:assert/strict';
import {createPilotControls} from '../apps/web/src/pilotControls.ts';

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
