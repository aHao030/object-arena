import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_BINDINGS, buildKeyActions, formatKey, changeBinding, loadBindings} from '../apps/web/src/keyBindings.ts';
import {makeInputFrame, type ControlAction} from '../apps/web/src/input.ts';

test('default keys keep movement, ascent, sprint and empty skills independent of primary fire', () => {
  const keys = buildKeyActions(DEFAULT_BINDINGS);
  const held = new Set<ControlAction>(['KeyW', 'KeyD', 'Space', 'ShiftRight'].map(code => keys[code]));
  held.add('fire');
  assert.deepEqual(makeInputFrame(2, held, {yaw: 0.3, pitch: 0.1}), {
    seq: 2, moveX: 1, moveZ: -1, aimYaw: 0.3, aimPitch: 0.1,
    jump: true, lift: true, boost: true, slow: false, fire: true,
  });
  assert.equal(keys.ShiftLeft, 'boost');
  assert.equal(keys.KeyC, 'slow');
  assert.equal(keys.ArrowUp, 'forward');
  assert.equal(keys.ArrowDown, 'back');
  assert.equal(keys.ArrowLeft, 'turnLeft');
  assert.equal(keys.ArrowRight, 'turnRight');
  for (const code of ['KeyQ', 'KeyE', 'KeyR', 'KeyT']) assert.equal(keys[code], undefined);
  assert.equal(formatKey('KeyW'), 'W');
  assert.equal(formatKey('Digit7'), '7');
  assert.equal(formatKey('Space'), '空格');
  assert.equal(formatKey('ShiftRight'), 'Shift');
});

test('valid persisted custom keys return as an independent usable profile', () => {
  const restored = loadBindings(JSON.stringify({...DEFAULT_BINDINGS, jump: 'KeyJ', boost: 'ShiftRight', skill4: 'Digit4'}));
  assert.equal(restored.jump, 'KeyJ');
  assert.equal(restored.boost, 'ShiftLeft');
  assert.equal(restored.skill4, 'Digit4');
  assert.equal(buildKeyActions(restored).KeyJ, 'jump');
  assert.equal(buildKeyActions(restored).Digit4, undefined);
  restored.jump = 'KeyK';
  assert.equal(DEFAULT_BINDINGS.jump, 'Space');
});

test('a saved custom key changes its action without activating an empty skill or its old key', () => {
  const changed = changeBinding(DEFAULT_BINDINGS, 'jump', 'KeyJ');
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  assert.equal(changed.bindings.jump, 'KeyJ');
  assert.equal(DEFAULT_BINDINGS.jump, 'Space', 'changing a profile never mutates the defaults');
  const keys = buildKeyActions(changed.bindings);
  assert.equal(keys.Space, undefined, 'the old key no longer controls ascent');
  const held = new Set<ControlAction>(['KeyJ', 'KeyW', 'ShiftLeft'].map(code => keys[code]));
  const frame = makeInputFrame(3, held, {yaw: 0, pitch: 0});
  assert.equal(frame.jump, true);
  assert.equal(frame.lift, true);
  assert.equal(frame.boost, true);
  assert.equal(frame.moveZ, -1);
  const skill = changeBinding(changed.bindings, 'skill1', 'Digit1');
  assert.equal(skill.ok, true);
  if (!skill.ok) return;
  assert.equal(buildKeyActions(skill.bindings).Digit1, undefined, 'remapping an empty slot does not create a weapon');
  const rightShift = changeBinding(skill.bindings, 'boost', 'ShiftRight');
  assert.equal(rightShift.ok, true);
  if (!rightShift.ok) return;
  assert.equal(rightShift.bindings.boost, 'ShiftLeft', 'both Shift keys share one configurable binding');
  assert.equal(buildKeyActions(rightShift.bindings).ShiftRight, 'boost');
});

test('conflicting keys and reserved browser or UI keys cannot change the current profile', () => {
  const profile = {...DEFAULT_BINDINGS};
  const original = JSON.stringify(profile);
  for (const [action, code] of [
    ['jump', 'KeyW'], ['jump', 'KeyQ'], ['jump', 'ShiftRight'],
    ...['ControlLeft', 'ControlRight', 'MetaLeft', 'AltRight', 'Tab', 'Escape', 'Enter',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'F12', 'Unidentified',
      'Keya', 'Space;alert(1)'].map(code => ['jump', code]),
  ] as const) {
    const result = changeBinding(profile, action as 'jump', code);
    assert.equal(result.ok, false, `${code} must remain unavailable`);
    if (!result.ok) assert.ok(result.message.length > 0, 'a rejected key explains recovery');
    assert.equal(JSON.stringify(profile), original, 'rejection never mutates the active profile');
  }
});

test('corrupt, incomplete, unsafe or duplicate stored keys fall back without accepting extra properties', () => {
  const serialized = JSON.stringify(DEFAULT_BINDINGS);
  for (const raw of [null, '', 'broken-json', 'null', '42', '[]', '{}',
    JSON.stringify({...DEFAULT_BINDINGS, jump: 2}),
    JSON.stringify({...DEFAULT_BINDINGS, jump: 'KeyW'}),
    JSON.stringify({...DEFAULT_BINDINGS, jump: 'ShiftRight'}),
    JSON.stringify({...DEFAULT_BINDINGS, jump: 'ControlLeft'}),
    JSON.stringify({...DEFAULT_BINDINGS, forward: 'ArrowUp'}),
    serialized.replace('"forward":"KeyW"', '"__proto__":{"polluted":true}'),
    serialized.slice(0, -1) + ',"__proto__":{"polluted":true}}',
  ]) {
    const restored = loadBindings(raw);
    assert.deepEqual(restored, DEFAULT_BINDINGS);
    assert.notEqual(restored, DEFAULT_BINDINGS, 'fallbacks are independent profiles');
    assert.equal(Object.hasOwn(restored, '__proto__'), false);
    assert.equal(Object.getPrototypeOf(restored), Object.prototype);
  }
});
