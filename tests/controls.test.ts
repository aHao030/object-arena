import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTROL_LABELS, KEY_ACTIONS, makeInputFrame, type ControlAction} from '../apps/web/src/input.ts';

test('Minecraft keys send jump, sprint and slow intents while retaining EXVS lift and keyboard fire', () => {
  const frameFor = (...codes: string[]) => makeInputFrame(7,
    new Set<ControlAction>(codes.map(code => KEY_ACTIONS[code])), {yaw: 0.4, pitch: 0.2});
  assert.deepEqual(frameFor('KeyW', 'KeyA', 'Space'), {
    seq: 7, moveX: -1, moveZ: -1, aimYaw: 0.4, aimPitch: 0.2,
    fire: false, boost: false, lift: true, jump: true, slow: false,
  }, 'Space jumps and requests continued lift without enabling ground continuous boost');
  const sprint = frameFor('KeyD', 'KeyQ', 'KeyF');
  assert.equal(sprint.moveX, 1);
  assert.equal(sprint.boost, true);
  assert.equal(sprint.fire, true);
  assert.equal(sprint.jump, false);
  assert.equal(frameFor('ControlLeft', 'KeyW').boost, false,
    'the browser-reserved Ctrl+W chord must not be the forward sprint binding');
  assert.equal(frameFor('ControlRight', 'KeyW').boost, false);
  for (const slow of ['ShiftLeft', 'ShiftRight']) {
    const frame = frameFor('KeyS', slow);
    assert.equal(frame.moveZ, 1);
    assert.equal(frame.slow, true);
    assert.equal(frame.boost, false);
  }
  assert.deepEqual(frameFor('KeyE'), {
    seq: 7, moveX: 0, moveZ: 0, aimYaw: 0.4, aimPitch: 0.2,
    fire: false, boost: true, lift: true, jump: false, slow: false,
  }, 'the auxiliary E lift still powers its thruster');
  assert.equal(frameFor('ArrowUp').moveZ, -1);
  assert.equal(frameFor('ArrowDown').moveZ, 1);
  assert.equal(KEY_ACTIONS.ArrowLeft, 'turnLeft');
  assert.equal(KEY_ACTIONS.ArrowRight, 'turnRight');
  assert.deepEqual([CONTROL_LABELS.jump, CONTROL_LABELS.boost, CONTROL_LABELS.slow],
    ['跳跃 / 续升', '推进冲刺', '缓行']);
});
