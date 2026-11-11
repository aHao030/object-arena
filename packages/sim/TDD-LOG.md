# Authoritative slice verification

Agreed test seam: `createSimulation` public interface, using the real Rapier WASM world; no internal mocks. It covers player movement, input validation and expiry, projectiles/targets and result invariants. It does not claim browser hand-feel or production networking/persistence verification.

- RED: 2026-11-11, `node --test --experimental-strip-types tests/simulation.test.ts` failed with missing simulation module before implementation.
- GREEN: first movement/ground/input-expiry behavior passed with `node --import tsx --test tests/simulation.test.ts` against actual Rapier 0.21.0 WASM.
- RED: the real SDK cadence test failed (`serverTick=0` after 1.25 seconds). Disabling Colyseus patches before installing its fixed loop left an idle clock interval stealing elapsed time.
- GREEN: moved patch disabling after the fixed loop; the SDK test then verifies real tick cadence, snapshots, projectile hits and two players in the same room.

The implementation is a named vertical slice, `mecha-slice-0.1`, not the full m0.1 combat specification. Melee, shields, module failure, durable results/replay and full finite-torque posture are not implemented. A stabilized dynamic capsule is used; snapshots and catalog disclose that approximation.

Additional public behavior verification: malformed/forged inputs, duplicate sequence/rate limiting, ACK after actual step, weapon cooldown and target hits, finite lift then gravity landing, two-player combat and immutable result all pass against the real WASM. The network test uses real Colyseus SDK clients and verifies training cadence/hits, two clients sharing an arena and room capacity. Manual HTTP invocation of `/api/lab/check` returned an actual MuJoCo report (HTTP 200).

## Review fixes — mecha-slice-0.2

- RED: the real-WASM contact-distance regression moved two dynamic capsules into contact, fired once and observed enemy HP `1000` instead of `965`. The muzzle obstruction branch incorrectly rejected an enemy as if it were a wall.
- GREEN: actor contacts in the muzzle path now queue one authoritative hit for the normal damage phase; static geometry still rejects the muzzle. The contact test verifies one 35-point hit, paid energy and unchanged cooldown, without changing transforms through a test-only shortcut. A real-cover regression also verifies that solid geometry still blocks shots.
- RED: a real SDK two-client room ending off the 20Hz snapshot cadence delivered a result but zero `finished` snapshots; clients retained the last `running` state.
- GREEN: room settlement now sends the exact terminal snapshot before the result, independent of tick modulo, once. Fixed-loop and onLeave settlement share that path. A server-owned short-duration test subclass selects an off-cadence fixture without weakening production combat or allowing client duration overrides; the existing full combat SDK test also requires the final snapshot/result to match.
- Final verification: `npm test` passed all 23 current behavior tests (including the new real-cover, contact-distance, off-cadence terminal/onLeave and full SDK combat assertions); `npx tsc --noEmit` passed. Finished fixed-loop ticks return after the once-only publisher, including terminal ticks divisible by three.

## Movement — mecha-slice-0.3 (2026-11-11)

Scope: the authorized `createSimulation` public seam with real Rapier 0.21.0 WASM. The user-authorized movement direction and subsequent movement spec/task are the source of this increment; fixed review base is `373abf3276d5a60b4807051c699f52489be09ec6`. No private-body test access, mocked physics, transform setters, new dependencies or test-only teleport hooks were used. Independent Standards/Spec review is coordinated by the root task after this implementation.

Sequential tracer bullets, each run with `node --import tsx --test tests/movement.test.ts`:

1. RED: camera-relative walking failed before the body finished turning. GREEN: movement uses accepted camera yaw while visual body yaw remains rate-limited; diagonal magnitude normalization is retained. Walking is now bounded by a 6m/s target, 3600N maximum, 10000W mechanical power and a 0.12s response.
2. RED: jump/landing state was absent. GREEN: optional boolean `jump`/`slow` remain compatible with omitted legacy fields; jump applies one ground-only 6.5m/s impulse, costing 4753.125J before baseline drain, and marks the ascending root airborne. A held jump cannot re-trigger in air. Holding lift cannot stack vertical propulsion onto the first 0.18s. Tightening the cost check exposed ground-only battery recovery missing from the old code; that recovery was restricted in the charge slice.
3. RED: directionless boost did not reach the specified fast camera-forward speed. GREEN: the 16m/s target uses finite 7000N force, 0.18s response and at most 30000W electrical input, with 400W thruster overhead plus positive mechanical work divided by 0.8 efficiency. Air steering changes force while velocity changes over actual physics steps; held Space can request lift after the initial jump interval. No linear-velocity assignment is used.
4. RED: continuous airborne propulsion never exhausted an independent resource. GREEN: charge starts at 100, drains 32/s while thrust is applied, never recovers in air, and locks at zero. Ordinary landing recovery is 0.18s, exhausted landing recovery is 0.8s; both block jump/boost. Ground non-thrust cooldown recovers 85 charge/s, and an exhausted booster unlocks at >=35 charge after recovery. Battery recovery also requires ground, no thrust and the existing shot cooldown. Weapon shot cost, cooldown, damage and heat thresholds are retained; propulsion no longer adds weapon heat.
5. RED: Shift still moved at walk speed. GREEN: Shift selects a 2.5m/s ground target. Neutral and >250ms expired input brake with finite force; expired input stops new propulsion.

Additional regression evidence: ordinary landing and explicit-release jump re-arming, TTL expiry not fabricating a jump release, legacy frames, malformed optional flags, forged charge/energy/recovery and detached snapshots. The seven movement tests plus seven pre-existing simulation tests pass with `node --import tsx --test tests/movement.test.ts tests/simulation.test.ts` (14/14). `npm run typecheck` passes. Root task owns the complete-suite/build result and final independent reviews.

Public-snapshot measurements after 0.5s initial settling, then 1s held input: walk 5.790m/s and 4.798m displacement; slow 2.413m/s and 2.163m; boost 13.720m/s and 9.320m (remaining battery 21170J, charge 68). One jump step gives vertical velocity 6.305m/s and battery 45239J, including gravity/damping and baseline drain. Vertical thrust reaches charge exhaustion at 3.133s with 3788J battery remaining; in that fixture the root is at the arena ceiling (10.980m), so this does not claim sustained unobstructed flight altitude or free-flight endurance.

These constants are this project's selected profile, not values claimed for Minecraft or EXVS. Snapshot/API evidence verifies authoritative behavior; perceived browser control feel, actual Pointer Lock, mobile performance, full articulated balance and replay support require their own evidence. Protocol/catalog explicitly report `mecha-slice-0.3`; persisted replay is still not implemented.
