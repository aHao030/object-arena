import { Worker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';

const MAX_JOBS = 2;
const WALL_TIMEOUT_MS = 8000;
let activeJobs = 0;

export class MechanicalCheckError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MechanicalCheckError';
    this.code = code;
  }
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new MechanicalCheckError('LAB_INVALID_INPUT', 'Only a mechanical check parameter object is accepted.');
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (!['payloadKg', 'targetAngle'].includes(key) || !('value' in descriptors[key])) {
      throw new MechanicalCheckError('LAB_INVALID_INPUT', 'Only payloadKg and targetAngle are allowed; model XML, URLs and plugins are not accepted.');
    }
  }
  const payloadKg = descriptors.payloadKg?.value;
  const targetAngle = descriptors.targetAngle?.value === undefined ? -0.5 : descriptors.targetAngle.value;
  if (typeof payloadKg !== 'number' || !Number.isFinite(payloadKg) || payloadKg < 0.1 || payloadKg > 5) {
    throw new MechanicalCheckError('LAB_INVALID_INPUT', 'payloadKg must be a finite number between 0.1 and 5 kg.');
  }
  if (typeof targetAngle !== 'number' || !Number.isFinite(targetAngle) || targetAngle < -0.8 || targetAngle > 0.8) {
    throw new MechanicalCheckError('LAB_INVALID_INPUT', 'targetAngle must be a finite number between -0.8 and 0.8 radians.');
  }
  return { payloadKg, targetAngle };
}

/** Run a bounded, isolated MuJoCo test of the platform's original two-link arm. */
export async function runMechanicalCheck(input) {
  const parameters = validateInput(input);
  if (activeJobs >= MAX_JOBS) {
    throw new MechanicalCheckError('LAB_BUSY', 'The mechanical lab is busy; retry after the current checks finish.');
  }
  activeJobs += 1;
  const startedAt = performance.now();
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./worker.js', import.meta.url), {
        workerData: parameters,
        // Do not inherit application loaders/test-runner switches in this plain-JS worker.
        execArgv: [],
        resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 },
      });
      let settled = false;
      const finish = (error, report) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // The trusted worker has no further work after its single response.
        void worker.terminate();
        if (error) reject(error);
        else resolve({ ...report, elapsedMs: Math.round((performance.now() - startedAt) * 100) / 100 });
      };
      const timer = setTimeout(() => {
        finish(new MechanicalCheckError('LAB_TIMEOUT', 'Mechanical check exceeded its 8-second wall deadline.'));
      }, WALL_TIMEOUT_MS);
      worker.once('message', (message) => {
        if (message?.error) {
          finish(new MechanicalCheckError(message.error.code, message.error.message));
        } else if (message?.report) {
          finish(null, message.report);
        } else {
          finish(new MechanicalCheckError('LAB_ENGINE_ERROR', 'Mechanical engine returned an invalid response.'));
        }
      });
      worker.once('error', (error) => {
        finish(new MechanicalCheckError('LAB_ENGINE_ERROR', `Mechanical engine worker failed: ${error.message}`));
      });
      worker.once('exit', (code) => {
        if (!settled) finish(new MechanicalCheckError('LAB_ENGINE_ERROR', `Mechanical engine exited before producing a report (${code}).`));
      });
    });
  } finally {
    activeJobs -= 1;
  }
}
