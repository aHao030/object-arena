import test from 'node:test';
import assert from 'node:assert/strict';
import { runMechanicalCheck } from '../apps/lab/src/index.js';

test('mechanical lab rejects untrusted model sources and out-of-range numeric inputs', async () => {
  for (const input of [
    { payloadKg: 0 }, { payloadKg: 5.01 }, { payloadKg: Number.NaN },
    { payloadKg: '1' }, { payloadKg: 1, targetAngle: Number.POSITIVE_INFINITY },
    { payloadKg: 1, targetAngle: null },
    { payloadKg: 1, targetAngle: 2 }, { payloadKg: 1, xml: '<mujoco/>' },
    { payloadKg: 1, url: 'http://127.0.0.1/model.xml' },
    { payloadKg: 1, plugin: 'untrusted' }, null,
  ]) {
    await assert.rejects(runMechanicalCheck(input as any), { code: 'LAB_INVALID_INPUT' });
  }
});

test('real MuJoCo WASM steps the original two-joint articulated model', { timeout: 20000 }, async () => {
  const report = await runMechanicalCheck({ payloadKg: 0.1 });
  assert.equal(report.engine, 'MuJoCo');
  assert.match(report.version, /^4\./);
  assert.equal(report.profile, 'articulated-lab');
  assert.match(report.modelHash, /^[a-f0-9]{64}$/);
  assert.equal(report.steps, 1000);
  assert.equal(report.conditions.timestepSeconds, 0.002);
  assert.equal(report.conditions.simulatedSeconds, 2);
  assert.equal(report.conditions.payloadKg, 0.1);
  assert.equal(report.finalAngles.length, 2);
  assert(report.finalAngles.every(Number.isFinite));
  assert(report.finalAngles.some((angle) => Math.abs(angle) > 0.1));
  assert(Number.isFinite(report.trackingError));
  assert(report.peakControl > 0 && report.peakControl <= 12);
  assert(report.controlWorkJ > 0);
  assert(report.elapsedMs > 0);
  assert.equal(report.status, 'passed');
  assert(report.trackingError < report.conditions.passToleranceRad);
});

test('heavy payload reaches real torque saturation and fails the light-payload tracking criterion', { timeout: 30000 }, async () => {
  const light = await runMechanicalCheck({ payloadKg: 0.1 });
  const heavy = await runMechanicalCheck({ payloadKg: 5 });
  assert.notEqual(light.modelHash, heavy.modelHash);
  assert(heavy.trackingError > light.trackingError + 0.2);
  assert.equal(heavy.status, 'needs-review');
  assert(heavy.saturatedSteps > 0);
  assert(heavy.peakControl <= 12);
  assert.deepEqual(heavy.conditions.torqueLimitsNm, [12, 6]);
});

test('repeat checks bind identical dynamics to model and conditions, without sharing simulation state', { timeout: 30000 }, async () => {
  const a = await runMechanicalCheck({ payloadKg: 0.25, targetAngle: -0.4 });
  const b = await runMechanicalCheck({ payloadKg: 0.25, targetAngle: -0.4 });
  assert.equal(a.modelHash, b.modelHash);
  assert.equal(a.conditionHash, b.conditionHash);
  for (let joint = 0; joint < 2; joint += 1) {
    assert(Math.abs(a.finalAngles[joint] - b.finalAngles[joint]) < 1e-9);
  }
  assert.deepEqual(a.conditions.targetAnglesRad, [-0.4, 0.2]);
});

test('lab bounds concurrent engine work instead of spawning unlimited workers', { timeout: 20000 }, async () => {
  const first = runMechanicalCheck({ payloadKg: 0.1 });
  const second = runMechanicalCheck({ payloadKg: 0.25 });
  await assert.rejects(runMechanicalCheck({ payloadKg: 1 }), { code: 'LAB_BUSY' });
  const reports = await Promise.all([first, second]);
  assert(reports.every((report) => report.steps === 1000));
});
