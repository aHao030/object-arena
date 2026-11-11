# Mechanical lab verification log

Scope: `.scratch/mecha-arena/issues/09-mujoco-workbench.md`; original two-joint mechanical fixture, not an imported mech or combat certification.

## Red: before implementation

Command: `node --test tests/mujoco.test.ts`

Observed exit code: 1. The new integration test could not import the not-yet-created `apps/lab/src/index.js` (`ERR_MODULE_NOT_FOUND`). Test cases require actual MuJoCo motion, torque saturation under a heavy load, repeatable isolated state, and rejection of arbitrary model/XML/URL/plugin inputs.

## Green

Installed dependency inspected: `@mujoco/mujoco` 4.0.0, official Google DeepMind package, ESM single-threaded WASM. Local generated types verified `MjModel.from_xml_string`, `MjData.actuator_force`, and `mj_versionString`. Node: v24.19.0, Windows. The Node loader uses actual package bytes through `wasmBinary` plus `locateFile`; no Python or DOM was needed.

Command: `node --test tests/mujoco.test.ts`

Observed exit code: 0. Five tests passed, zero failures. Recorded full test duration: 2934.9662 ms while an independent type check ran concurrently. Tests cover input rejection, actual engine state advancement, heavy-load torque saturation, reproducible isolated state, and concurrent-work backpressure.

Command: `npx tsc --noEmit --target ES2022 --module nodenext --moduleResolution nodenext --esModuleInterop --skipLibCheck tests/mujoco.test.ts`

Observed exit code: 0, no diagnostics.

## Actual comparison evidence

Both cases target shoulder -0.5 rad and elbow +0.25 rad, run 1,000 actual `mj_step` calls at 0.002 s, and use the same 12/6 N·m torque-limited PD controller. Model, conditions, engine and hashes are saved in the accompanying JSON files. The 2 seconds below is simulated duration, not a claim about real-time speed or all deployment hardware.

| Case | Payload | Final shoulder / elbow rad | Final max error rad | Peak torque N·m | Saturated steps | Status | This machine's wall time |
|---|---:|---|---:|---:|---:|---|---:|
| [light](evidence/light.json) | 0.1 kg | -0.45203782 / 0.27026158 | 0.04796218 | 12 | 35 | passed | 221.71 ms |
| [heavy](evidence/heavy.json) | 5 kg | 0.46878514 / 0.31532366 | 0.96878514 | 12 | 1000 | needs-review | 279.85 ms |

The heavy case's failure is a successful diagnostic execution, not an engine exception. Low-load transient saturation also occurs; `saturatedSteps` is not by itself the pass criterion. Pass/fail uses final tracking error ≤0.15 rad. Absolute mechanical actuator work was 3.14498336 J and 51.72319257 J respectively; it is not electrical input energy.

The fixture has real joints, geometry-derived inertia, gravity and finite motor torque, but disables self-collision and external contacts. These results do not validate imported model joints, a walking controller, mech combat or cross-engine equivalence. Runtime, concurrency and resource behavior on a deployed host still require that host's integration check.
