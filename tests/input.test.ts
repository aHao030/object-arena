import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInputFrame, type ControlAction} from '../apps/web/src/input.ts';
import {createSimulation} from '../packages/sim/src/index.ts';

test('the standalone lift control lifts a real server body and release lands it', async () => {
  const sim = await createSimulation({mode: 'training'});
  try {
    sim.addPlayer('pilot');
    const held = new Set<ControlAction>(['lift']);
    let seq = 0;
    for (let tick = 0; tick < 90; tick++) {
      if (tick % 3 === 0) sim.applyInput('pilot', makeInputFrame(++seq, held, {yaw: 0, pitch: 0}));
      sim.step();
    }
    const flying = sim.getSnapshot().players[0];
    assert.ok(flying.position.y > 2, 'the UI standalone lift intent must produce actual vertical thrust');
    assert.ok(flying.energy < 40000, 'standalone lift must spend the same finite thruster energy');
    held.clear();
    sim.applyInput('pilot', makeInputFrame(++seq, held, {yaw: 0, pitch: 0}));
    for (let tick = 0; tick < 300; tick++) sim.step();
    const landed = sim.getSnapshot().players[0];
    assert.ok(landed.position.y > 0.8 && landed.position.y < 1.3);
    assert.equal(landed.boosting, false);
  } finally {sim.destroy();}
});
