import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parentPort, workerData } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import loadMujoco from '@mujoco/mujoco';

const TIMESTEP = 0.002;
const STEPS = 1000;
const CPU_BUDGET_MS = 2000;
const TORQUE_LIMITS = [12, 6];
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

// Original MJCF fixture. No XML, paths, assets, include tags or plugins come from input.
function armXml(payloadKg) {
  return `<mujoco model="object-arena-original-two-link-arm-v1">
  <compiler angle="radian" inertiafromgeom="true"/>
  <option timestep="0.002" gravity="0 0 -9.81" integrator="implicitfast"/>
  <default><joint damping="0.2" armature="0.02" limited="true" range="-1.5 1.5"/></default>
  <worldbody>
    <body name="upper_arm" pos="0 0 1">
      <joint name="shoulder" type="hinge" axis="0 1 0"/>
      <geom name="upper_link" type="capsule" fromto="0 0 0 0.4 0 0" size="0.035" mass="0.6" contype="0" conaffinity="0"/>
      <body name="lower_arm" pos="0.4 0 0">
        <joint name="elbow" type="hinge" axis="0 1 0"/>
        <geom name="lower_link" type="capsule" fromto="0 0 0 0.35 0 0" size="0.03" mass="0.4" contype="0" conaffinity="0"/>
        <body name="payload" pos="0.35 0 0">
          <geom name="payload_mass" type="sphere" size="0.035" mass="${payloadKg}" contype="0" conaffinity="0"/>
        </body>
      </body>
    </body>
  </worldbody>
  <actuator>
    <motor name="shoulder_motor" joint="shoulder" gear="1" ctrllimited="true" ctrlrange="-12 12" forcelimited="true" forcerange="-12 12"/>
    <motor name="elbow_motor" joint="elbow" gear="1" ctrllimited="true" ctrlrange="-6 6" forcelimited="true" forcerange="-6 6"/>
  </actuator>
</mujoco>`;
}

async function run() {
  const { payloadKg, targetAngle } = workerData;
  const modelXml = armXml(payloadKg);
  const wasmUrl = import.meta.resolve('@mujoco/mujoco/mujoco.wasm');
  // The published Emscripten build can otherwise try to fetch a file:// URL in Node.
  const wasmBinary = await readFile(fileURLToPath(wasmUrl));
  const mujoco = await loadMujoco({
    wasmBinary,
    locateFile: (name) => name.endsWith('.wasm') ? fileURLToPath(wasmUrl) : name,
    print: () => {},
    printErr: () => {},
  });
  let model;
  let data;
  try {
    model = mujoco.MjModel.from_xml_string(modelXml);
    if (model.nq !== 2 || model.nv !== 2 || model.nu !== 2) {
      throw new Error('Original mechanical fixture has unexpected dimensions.');
    }
    data = new mujoco.MjData(model);
    mujoco.mj_forward(model, data);
    const targets = [targetAngle, -targetAngle / 2];
    const conditions = {
      fixture: 'original-two-link-arm-v1',
      controller: 'torque-limited-pd-v1',
      profile: 'articulated-lab',
      payloadKg,
      targetAnglesRad: targets,
      initialAnglesRad: [0, 0],
      timestepSeconds: TIMESTEP,
      simulatedSeconds: TIMESTEP * STEPS,
      gravityMps2: [0, 0, -9.81],
      linkLengthsM: [0.4, 0.35],
      linkMassesKg: [0.6, 0.4],
      jointLimitsRad: [-1.5, 1.5],
      externalContacts: false,
      selfCollision: false,
      torqueLimitsNm: TORQUE_LIMITS,
      kp: [80, 50],
      kd: [7, 4],
      passToleranceRad: 0.15,
      cpuBudgetMs: CPU_BUDGET_MS,
      wallTimeoutMs: 8000,
      scope: 'Isolated original two-link fixture; not a user mech certification or battle-physics equivalence test.',
    };
    const modelHash = sha256(modelXml);
    const version = mujoco.mj_versionString();
    let peakControl = 0;
    let maxTrackingError = 0;
    let controlWorkJ = 0;
    let saturatedSteps = 0;
    const cpuStarted = performance.now();
    for (let step = 0; step < STEPS; step += 1) {
      if (step % 25 === 0 && performance.now() - cpuStarted > CPU_BUDGET_MS) {
        const error = new Error('Mechanical simulation exceeded its 2-second computation budget.');
        error.code = 'LAB_TIMEOUT';
        throw error;
      }
      let saturated = false;
      for (let joint = 0; joint < 2; joint += 1) {
        const error = targets[joint] - data.qpos[joint];
        const requestedTorque = conditions.kp[joint] * error - conditions.kd[joint] * data.qvel[joint];
        if (Math.abs(requestedTorque) > TORQUE_LIMITS[joint]) saturated = true;
        data.ctrl[joint] = clamp(requestedTorque, TORQUE_LIMITS[joint]);
      }
      if (saturated) saturatedSteps += 1;
      mujoco.mj_step(model, data);
      for (let joint = 0; joint < 2; joint += 1) {
        const angle = data.qpos[joint];
        const force = data.actuator_force[joint];
        if (!Number.isFinite(angle) || !Number.isFinite(force) || !Number.isFinite(data.qvel[joint])) {
          throw new Error('Mechanical solver produced non-finite state.');
        }
        peakControl = Math.max(peakControl, Math.abs(force));
        maxTrackingError = Math.max(maxTrackingError, Math.abs(targets[joint] - angle));
        controlWorkJ += Math.abs(force * data.qvel[joint]) * TIMESTEP;
      }
    }
    const finalAngles = Array.from(data.qpos).slice(0, 2);
    const trackingError = Math.max(...finalAngles.map((angle, joint) => Math.abs(targets[joint] - angle)));
    return {
      engine: 'MuJoCo',
      version,
      profile: 'articulated-lab',
      modelHash,
      conditionHash: sha256(JSON.stringify({ modelHash, version, conditions })),
      steps: STEPS,
      finalAngles,
      peakControl,
      maxTrackingError,
      trackingError,
      controlWorkJ,
      saturatedSteps,
      status: trackingError <= conditions.passToleranceRad ? 'passed' : 'needs-review',
      conditions,
    };
  } finally {
    data?.delete();
    model?.delete();
  }
}

try {
  parentPort.postMessage({ report: await run() });
} catch (error) {
  parentPort.postMessage({ error: {
    code: error.code === 'LAB_TIMEOUT' ? 'LAB_TIMEOUT' : 'LAB_ENGINE_ERROR',
    message: String(error.message || 'Mechanical engine failed.').slice(0, 500),
  } });
}
