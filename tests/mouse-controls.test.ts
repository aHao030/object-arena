import test from 'node:test';
import assert from 'node:assert/strict';
import {createMouseControls} from '../apps/web/src/mouseControls.ts';

function dispatch(target: EventTarget, type: string, values: Record<string, unknown> = {}) {
  const event = new Event(type, {cancelable: true});
  Object.assign(event, values);
  target.dispatchEvent(event);
  return event;
}

class BrowserDocument extends EventTarget {
  defaultView = new EventTarget();
  pointerLockElement: EventTarget | null = null;
  hidden = false;
  exits = 0;
  exitPointerLock() {
    this.exits++;
    this.pointerLockElement = null;
    dispatch(this, 'pointerlockchange');
  }
  grant(element: EventTarget) {
    this.pointerLockElement = element;
    dispatch(this, 'pointerlockchange');
  }
}

class BrowserCanvas extends EventTarget {
  ownerDocument = new BrowserDocument();
  captures = new Set<number>();
  requests = 0;
  released: number[] = [];
  requestPointerLock: (() => void | Promise<void>) | undefined = () => {this.requests++;};
  focus() {}
  setPointerCapture(id: number) {this.captures.add(id);}
  hasPointerCapture(id: number) {return this.captures.has(id);}
  releasePointerCapture(id: number) {this.captures.delete(id); this.released.push(id);}
}

function setup() {
  const canvas = new BrowserCanvas();
  const looks: number[][] = [];
  const states: {locked: boolean; message: string}[] = [];
  const fires: boolean[] = [];
  const controls = createMouseControls(canvas as unknown as HTMLCanvasElement, {
    onLook: (x, y) => looks.push([x, y]),
    onStateChange: (locked, message) => states.push({locked, message}),
    onFireChange: pressed => fires.push(pressed),
  });
  return {canvas, doc: canvas.ownerDocument, controls, looks, states, fires};
}

const startDrag = (canvas: BrowserCanvas) => dispatch(canvas, 'pointerdown',
  {pointerType: 'mouse', pointerId: 7, button: 2, buttons: 2, clientX: 10, clientY: 20});
const drag = (canvas: BrowserCanvas) => dispatch(canvas, 'pointermove',
  {pointerType: 'mouse', pointerId: 7, buttons: 2, clientX: 16, clientY: 17});

test('a primary mouse press fires before lock permission and releases outside the canvas after denial', () => {
  const {canvas, doc, controls, fires} = setup();
  try {
    dispatch(canvas, 'pointerdown', {pointerType: 'mouse', pointerId: 1, button: 0, buttons: 1});
    assert.deepEqual(fires, [true], 'shooting must start on press, including the first unlocked press');
    dispatch(canvas, 'pointerdown', {pointerType: 'mouse', pointerId: 1, button: 0, buttons: 1});
    dispatch(canvas, 'click', {pointerType: 'mouse', button: 0});
    assert.equal(canvas.requests, 1);
    dispatch(doc, 'pointerlockerror');
    assert.deepEqual(fires, [true], 'denying pointer lock cannot gate firing or duplicate the held intent');
    dispatch(doc, 'mouseup', {button: 0});
    dispatch(doc, 'pointerup', {pointerType: 'mouse', pointerId: 1, button: 0});
    assert.deepEqual(fires, [true, false], 'global release must end shooting once');
    for (const pointerType of ['touch', 'pen']) {
      dispatch(canvas, 'pointerdown', {pointerType, pointerId: 2, button: 0});
      dispatch(canvas, 'click', {button: 0});
      dispatch(canvas, 'pointerup', {pointerType, pointerId: 2, button: 0});
    }
    assert.deepEqual(fires, [true, false], 'touch and pen compatibility clicks cannot fire automatically');
  } finally {controls.dispose();}
});

test('pressing primary while right-dragging fires without accepting touch or pen compatibility mouse events', () => {
  const {canvas, doc, controls, fires, looks} = setup();
  try {
    for (const pointerType of ['touch', 'pen']) {
      dispatch(canvas, 'pointerdown', {pointerType, pointerId: 2, button: 0});
      dispatch(canvas, 'mousedown', {button: 0, buttons: 1});
    }
    assert.deepEqual(fires, [], 'touch and pen compatibility mousedown cannot fire');
    startDrag(canvas);
    dispatch(canvas, 'mousedown', {button: 0, buttons: 1, sourceCapabilities: {firesTouchEvents: true}});
    assert.deepEqual(fires, [], 'an identified touch compatibility event must remain ignored after mouse activity');
    dispatch(canvas, 'mousedown', {button: 0, buttons: 3});
    assert.deepEqual(fires, [true], 'a chorded left press may have mousedown without a second pointerdown');
    dispatch(canvas, 'pointermove', {pointerType: 'mouse', pointerId: 7, buttons: 3, clientX: 16, clientY: 17});
    assert.deepEqual(looks, [[6, -3]], 'shooting leaves the right-drag look active');
    dispatch(doc, 'mouseup', {button: 0});
    assert.deepEqual(fires, [true, false]);
    assert.equal(canvas.captures.has(7), true, 'releasing primary does not release the held right drag');
  } finally {controls.dispose();}
});

test('mouse fire cannot remain held after release, focus loss, room exit or controller disposal', () => {
  for (const ending of ['primary-up', 'global-pointerup', 'global-mouseup', 'window-mouseup',
    'pointer-cancel', 'blur', 'hidden', 'release', 'dispose']) {
    const {canvas, doc, controls, fires} = setup();
    try {
      dispatch(canvas, 'pointerdown', {pointerType: 'mouse', pointerId: 1, button: 0, buttons: 1});
      const finish = () => {
        if (ending === 'primary-up') dispatch(canvas, 'pointerup', {pointerType: 'mouse', pointerId: 1, button: 0});
        if (ending === 'global-pointerup') dispatch(doc, 'pointerup', {pointerType: 'mouse', pointerId: 1, button: 0});
        if (ending === 'global-mouseup') dispatch(doc, 'mouseup', {button: 0});
        if (ending === 'window-mouseup') dispatch(doc.defaultView, 'mouseup', {button: 0});
        if (ending === 'pointer-cancel') dispatch(doc, 'pointercancel', {pointerType: 'mouse', pointerId: 1});
        if (ending === 'blur') dispatch(doc.defaultView, 'blur');
        if (ending === 'hidden') {doc.hidden = true; dispatch(doc, 'visibilitychange');}
        if (ending === 'release') controls.release();
        if (ending === 'dispose') controls.dispose();
      };
      finish(); finish();
      assert.deepEqual(fires, [true, false], `${ending} must emit exactly one released fire intent`);
      controls.dispose();
      dispatch(canvas, 'pointerdown', {pointerType: 'mouse', pointerId: 1, button: 0, buttons: 1});
      assert.deepEqual(fires, [true, false], 'disposed controllers cannot restart firing');
    } finally {controls.dispose();}
  }
});

test('releasing mouse controls ends a right drag and releases its browser pointer capture', () => {
  const {canvas, controls, looks} = setup();
  try {
    assert.equal(startDrag(canvas).defaultPrevented, true);
    drag(canvas);
    assert.deepEqual(looks, [[6, -3]]);
    controls.release();
    assert.deepEqual(canvas.released, [7]);
    drag(canvas);
    assert.deepEqual(looks, [[6, -3]], 'leaving a room cannot leave right-drag look active');
    assert.equal(dispatch(canvas, 'contextmenu').defaultPrevented, true);
  } finally {controls.dispose();}
});

test('touch and pen clicks leave the cursor free while mouse clicks and the explicit button can request lock', () => {
  const {canvas, controls} = setup();
  const legacy = setup();
  try {
    for (const pointerType of ['touch', 'pen']) {
      dispatch(canvas, 'click', {button: 0, pointerType});
      dispatch(canvas, 'pointerdown', {pointerType, button: 0, pointerId: 1});
      dispatch(canvas, 'click', {button: 0});
      assert.equal(canvas.requests, 0, 'synthetic mouse clicks after touch or pen must not capture');
    }
    controls.capture();
    controls.capture();
    assert.equal(canvas.requests, 1, 'the explicit button works after touch but cannot queue duplicate pending requests');
    dispatch(legacy.canvas, 'click', {button: 0});
    assert.equal(legacy.canvas.requests, 1, 'a plain mouse click works in browsers without PointerEvent click metadata');
  } finally {controls.dispose(); legacy.controls.dispose();}
});

test('a capture canceled before the browser grants it immediately releases a late lock without activating look', () => {
  const {canvas, doc, controls, looks, states} = setup();
  try {
    controls.capture();
    controls.release();
    doc.grant(canvas);
    assert.equal(doc.pointerLockElement, null, 'a delayed browser grant cannot trap the cursor after release');
    assert.equal(doc.exits, 1);
    assert.equal(states.some(state => state.locked), false, 'a canceled request cannot announce successful capture');
    dispatch(doc, 'mousemove', {movementX: 20, movementY: -10});
    assert.deepEqual(looks, []);
    controls.capture();
    assert.equal(canvas.requests, 2, 'a finished cancellation allows a fresh user request');
  } finally {controls.dispose();}
});

test('locked movement, Escape, drag termination and disposal follow browser lifecycle events', () => {
  const {canvas, doc, controls, looks, states} = setup();
  try {
    controls.capture();
    doc.grant(canvas);
    assert.equal(states.at(-1)?.locked, true);
    dispatch(doc, 'mousemove', {movementX: 12, movementY: -4});
    assert.deepEqual(looks, [[12, -4]]);
    doc.exitPointerLock(); // The browser releases Pointer Lock when the pilot presses Escape.
    assert.equal(states.at(-1)?.locked, false);
    dispatch(doc, 'mousemove', {movementX: 30, movementY: 30});
    assert.equal(looks.length, 1);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      startDrag(canvas);
      dispatch(canvas, type, {pointerId: 7});
      assert.equal(canvas.captures.size, 0, `${type} must release a right drag`);
      drag(canvas);
      assert.equal(looks.length, 1);
    }
    for (const boundary of ['blur', 'hidden']) {
      controls.capture();
      doc.grant(canvas);
      if (boundary === 'blur') dispatch(doc.defaultView, 'blur');
      else {doc.hidden = true; dispatch(doc, 'visibilitychange'); doc.hidden = false;}
      assert.equal(doc.pointerLockElement, null, `${boundary} must unlock the canvas`);
      startDrag(canvas);
      if (boundary === 'blur') dispatch(doc.defaultView, 'blur');
      else {doc.hidden = true; dispatch(doc, 'visibilitychange'); doc.hidden = false;}
      assert.equal(canvas.captures.size, 0, `${boundary} must also end right drag`);
    }
    controls.capture();
    doc.grant(canvas);
    controls.dispose();
    assert.equal(doc.pointerLockElement, null);
    const requests = canvas.requests, changes = states.length;
    controls.capture();
    dispatch(canvas, 'click', {button: 0});
    startDrag(canvas); drag(canvas);
    dispatch(doc, 'mousemove', {movementX: 5, movementY: 5});
    dispatch(doc.defaultView, 'blur');
    doc.grant(new EventTarget());
    controls.release();
    assert.equal(canvas.requests, requests, 'disposed controls cannot request capture');
    assert.equal(states.length, changes, 'disposed controls cannot publish browser state');
    assert.equal(looks.length, 1);
    assert.equal(dispatch(canvas, 'contextmenu').defaultPrevented, false, 'dispose removes browser listeners');
    assert.notEqual(doc.pointerLockElement, null, 'release never exits another element\'s lock');
  } finally {controls.dispose();}
});

test('replacing a captured canvas resets the displayed mouse state before the replacement becomes active', () => {
  const {canvas, doc, controls, states} = setup();
  controls.capture(); doc.grant(canvas);
  assert.equal(states.at(-1)?.locked, true);
  controls.dispose();
  const replacement = createMouseControls(canvas as unknown as HTMLCanvasElement, {
    onLook: () => {},
    onStateChange: (locked, message) => states.push({locked, message}),
  });
  try {
    replacement.release();
    assert.deepEqual(states.map(state => state.locked), [true, false],
      'changing render modes must return the UI to Enable mouse look instead of leaving it stuck on Exit');
  } finally {replacement.dispose();}
});

test('browser failures preserve right drag and late Promise completion cannot recapture a canceled canvas', async () => {
  for (const failure of ['unsupported', 'throw', 'event', 'promise']) {
    const {canvas, doc, controls, looks, states} = setup();
    try {
      if (failure === 'unsupported') canvas.requestPointerLock = undefined;
      if (failure === 'throw') canvas.requestPointerLock = () => {throw new Error('denied');};
      if (failure === 'promise') canvas.requestPointerLock = () => Promise.reject(new Error('denied'));
      assert.doesNotThrow(() => controls.capture());
      if (failure === 'event') dispatch(doc, 'pointerlockerror');
      await Promise.resolve();
      await Promise.resolve();
      assert.equal(states.at(-1)?.locked, false, `${failure} must report the failure`);
      assert.match(states.at(-1)?.message ?? '', /右键拖动/);
      startDrag(canvas); drag(canvas);
      assert.deepEqual(looks, [[6, -3]], `${failure} must leave right drag available`);
      if (failure === 'event') {
        controls.capture();
        assert.equal(canvas.requests, 2, 'a failed legacy void request must allow a fresh attempt');
      }
    } finally {controls.dispose();}
  }
  for (const ending of ['release', 'dispose'] as const) {
    for (const owner of ['canvas', 'other']) {
      const {canvas, doc, controls, states} = setup();
      let resolve!: () => void;
      canvas.requestPointerLock = () => new Promise<void>(done => {resolve = done;});
      controls.capture();
      controls[ending]();
      const other = new EventTarget();
      doc.pointerLockElement = owner === 'canvas' ? canvas : other;
      resolve();
      await Promise.resolve();
      await Promise.resolve();
      assert.equal(doc.pointerLockElement === canvas, false, `${ending} must release its late Promise grant`);
      if (owner === 'other') assert.equal(doc.pointerLockElement, other, 'late completion cannot exit another element\'s lock');
      assert.equal(states.some(state => state.locked), false);
      controls.dispose();
    }
  }
});
