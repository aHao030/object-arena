# Mechanical lab

Runs the actual single-threaded `@mujoco/mujoco` 4.0.0 WASM engine in a bounded Node worker. No Python installation, browser renderer or simulated replacement engine is used.

```sh
npm run lab
npm run lab -- --payload 5 --target -0.5
node --test tests/mujoco.test.ts
```

The root application owns dependency installation. Public server entry:

```js
import { runMechanicalCheck } from '../../lab/src/index.js';
const report = await runMechanicalCheck({ payloadKg: 0.1, targetAngle: -0.5 });
```

Only `payloadKg` (0.1–5 kg) and optional `targetAngle` (-0.8–0.8 radians) are accepted; every extra field is rejected. The fixed original MJCF supplies two links, two hinge joints, geometry-derived inertia, gravity, joint limits and torque-limited motors. External contacts and self-collision are disabled: this fixture tests load-dependent motor tracking, not collision safety or a full robot gait.

Each check actually constructs `MjModel`/`MjData`, calls `mj_forward`, performs 1,000 `mj_step` calls at 0.002 s, and frees both WASM handles in `finally`. The bounded PD controller does not compensate gravity, making a heavy-load saturation counterexample observable. `trackingError` is the maximum final joint error in radians; `maxTrackingError` covers the whole trajectory. `peakControl` is measured actuator torque in N·m. `controlWorkJ` integrates absolute mechanical actuator power, not electrical energy usage.

The result has `profile: articulated-lab`, engine/version, SHA-256 model and condition hashes, conditions, actual angles/torque/error and wall elapsed time. `passed` only means this fixture's final error is at most 0.15 rad; `needs-review` is a valid diagnostic result. Neither status certifies a user-uploaded mech or modifies combat CP/HP. The next implementation stage must bind tests to a validated user mechanical template, controller and module IDs.

The simulation loop has a 2,000 ms computation deadline, a worker has an 8,000 ms wall deadline including cold WASM loading, and at most two jobs can run concurrently. Excess work returns `LAB_BUSY`; validation, timeout or engine failures throw coded errors instead of fabricating a passing report. The worker has a 128 MB JavaScript old-generation limit; WASM's linear memory is separate. Only the trusted fixture can be compiled; raw XML, plugins, includes, remote URLs and arbitrary assets are not exposed through this API.

Node loading resolves the package's exported WASM file, reads it as `wasmBinary`, and supplies `locateFile` so Emscripten does not attempt a `file://` network fetch. No DOM or WebGL is needed. See the actual execution evidence in [VERIFICATION.md](VERIFICATION.md).

Primary API references: [official WASM README](https://github.com/google-deepmind/mujoco/blob/4.0.0/wasm/README.md), the installed package's generated `mujoco.d.ts`, and [official package](https://www.npmjs.com/package/@mujoco/mujoco). The MJCF fixture is original project code.
