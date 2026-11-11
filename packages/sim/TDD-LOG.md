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
