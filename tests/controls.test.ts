import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTROL_LABELS, KEY_ACTIONS, makeInputFrame, type ControlAction} from '../apps/web/src/input.ts';

test('pilot keys keep movement, jump, sprint and skill slots independent', () => {
  const frameFor = (...codes: string[]) => makeInputFrame(7,
    new Set<ControlAction>(codes.map(code => KEY_ACTIONS[code])), {yaw: 0.4, pitch: 0.2});
  assert.deepEqual(frameFor('KeyW', 'KeyA', 'Space'), {
    seq: 7, moveX: -1, moveZ: -1, aimYaw: 0.4, aimPitch: 0.2,
    fire: false, boost: false, lift: true, jump: true, slow: false,
  }, 'Space requests a jump and sustained lift, subject to the server delay and resources');
  const sprint = frameFor('KeyD', 'ShiftLeft');
  assert.equal(sprint.moveX, 1);
  assert.equal(sprint.boost, true);
  assert.equal(sprint.fire, false);
  assert.equal(sprint.jump, false);
  assert.equal(frameFor('ControlLeft', 'KeyW').boost, false,
    'the browser-reserved Ctrl+W chord must not be the forward sprint binding');
  assert.equal(frameFor('ControlRight', 'KeyW').boost, false);
  for (const boost of ['ShiftLeft', 'ShiftRight']) {
    const frame = frameFor('KeyS', boost);
    assert.equal(frame.moveZ, 1);
    assert.equal(frame.slow, false);
    assert.equal(frame.boost, true);
  }
  assert.equal(frameFor('KeyC').slow, true);
  for (const code of ['KeyQ', 'KeyE', 'KeyR', 'KeyT', 'KeyF']) {
    assert.equal(KEY_ACTIONS[code], undefined, 'unequipped skills and former fire alias do not trigger abilities');
    assert.equal(frameFor(code).boost, false);
    assert.equal(frameFor(code).fire, false);
  }
  assert.equal(frameFor('ArrowUp').moveZ, -1);
  assert.equal(frameFor('ArrowDown').moveZ, 1);
  assert.equal(KEY_ACTIONS.ArrowLeft, 'turnLeft');
  assert.equal(KEY_ACTIONS.ArrowRight, 'turnRight');
  assert.deepEqual([CONTROL_LABELS.jump, CONTROL_LABELS.boost, CONTROL_LABELS.slow],
    ['跳跃 / 升空', '加速 / 推进', '缓行']);
});
