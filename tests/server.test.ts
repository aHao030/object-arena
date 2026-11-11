import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../apps/server/src/index.ts';
import { MachineRoom } from '../apps/server/src/rooms.ts';
import type { MatchResult, Snapshot } from '../packages/protocol/src/index.ts';

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Test-owned server configuration keeps this a real Rapier/Colyseus round,
// without spending twenty seconds on every terminal-delivery regression.
class ShortArenaRoom extends MachineRoom {
  protected override matchDuration = 61 / 60;
}

test('both SDK clients receive one final snapshot when the terminal tick is off the 20Hz cadence', { timeout: 12_000 }, async () => {
  const server = createGameServer();
  server.define('short-arena', ShortArenaRoom, { mode: 'arena' });
  const rooms: Room[] = [];
  await server.listen(0, '127.0.0.1');
  const address = server.transport.server?.address();
  assert.ok(address && typeof address === 'object');
  const endpoint = `http://127.0.0.1:${address.port}`;
  let offCadenceChecked = false;
  try {
    for (let attempt = 0; attempt < 6 && !offCadenceChecked; attempt++) {
      const alpha = await new Client(endpoint).create('short-arena');
      rooms.push(alpha);
      const alphaSnapshots: Snapshot[] = [], betaSnapshots: Snapshot[] = [];
      const alphaResults: MatchResult[] = [], betaResults: MatchResult[] = [];
      let firstRunningTick: number | undefined;
      alpha.onMessage('snapshot', (snapshot: Snapshot) => {
        alphaSnapshots.push(snapshot);
        if (snapshot.status === 'running') firstRunningTick ??= snapshot.serverTick;
      });
      alpha.onMessage('result', (result: MatchResult) => { alphaResults.push(result); });
      await sleep(attempt * 17);
      const beta = await new Client(endpoint).joinById(alpha.roomId);
      rooms.push(beta);
      beta.onMessage('snapshot', (snapshot: Snapshot) => { betaSnapshots.push(snapshot); });
      beta.onMessage('result', (result: MatchResult) => { betaResults.push(result); });
      await sleep(30);
      assert.notEqual(firstRunningTick, undefined, 'the first pilot must see the second pilot enter the live match');
      // The waiting interval is real server time. Select a fixture whose known
      // 61-step lifetime ends between regular snapshots, rather than assuming
      // websocket matchmaking always consumes the same number of ticks.
      if ((firstRunningTick! + 61) % 3 === 0) { await beta.leave(); await alpha.leave(); continue; }
      const deadline = Date.now() + 2000;
      while ((!alphaResults.length || !betaResults.length) && Date.now() < deadline) await sleep(10);
      assert.equal(alphaResults.length, 1);
      assert.equal(betaResults.length, 1);
      const result = alphaResults[0];
      assert.notEqual(result.finishedAtTick % 3, 0, 'the regression must exercise a terminal tick outside the snapshot cadence');
      assert.deepEqual(betaResults[0], result);
      await sleep(120);
      for (const received of [alphaSnapshots, betaSnapshots]) {
        const terminal = received.filter((snapshot) => snapshot.status === 'finished');
        assert.equal(terminal.length, 1, 'each connection receives exactly one final snapshot instead of remaining in running state');
        assert.equal(received.at(-1)?.status, 'finished');
        assert.equal(terminal[0].serverTick, result.finishedAtTick);
        assert.deepEqual(terminal[0].result, result);
      }
      assert.deepEqual(alphaSnapshots.at(-1), betaSnapshots.at(-1), 'both final authority states must match');
      offCadenceChecked = true;
      await beta.leave(); await alpha.leave();
    }
    assert.equal(offCadenceChecked, true, 'a non-cadence terminal fixture must be selected');

    const survivor = await new Client(endpoint).create('arena');
    rooms.push(survivor);
    const leaveSnapshots: Snapshot[] = [], leaveResults: MatchResult[] = [];
    survivor.onMessage('snapshot', (snapshot: Snapshot) => { leaveSnapshots.push(snapshot); });
    survivor.onMessage('result', (result: MatchResult) => { leaveResults.push(result); });
    const quitter = await new Client(endpoint).joinById(survivor.roomId);
    rooms.push(quitter);
    quitter.onMessage('snapshot', () => {});
    quitter.onMessage('result', () => {});
    await sleep(40);
    await quitter.leave();
    await sleep(150);
    assert.equal(leaveResults.length, 1, 'onLeave must also emit only one settlement');
    assert.equal(leaveResults[0].reason, 'player-left');
    assert.equal(leaveResults[0].winnerId, survivor.sessionId);
    const leaveFinal = leaveSnapshots.filter((snapshot) => snapshot.status === 'finished');
    assert.equal(leaveFinal.length, 1, 'onLeave must publish one final authority snapshot');
    assert.deepEqual(leaveFinal[0].result, leaveResults[0]);
    assert.equal(leaveFinal[0].serverTick, leaveResults[0].finishedAtTick);
    await survivor.leave();
  } finally {
    await Promise.allSettled(rooms.map((room) => room.leave()));
    await server.gracefullyShutdown(false);
  }
});

test('real SDK clients receive synchronized damage and one identical authoritative match result', { timeout: 25_000 }, async () => {
  const server = createGameServer();
  const rooms: Room[] = [];
  await server.listen(0, '127.0.0.1');
  const address = server.transport.server?.address();
  assert.ok(address && typeof address === 'object');
  const endpoint = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await (await fetch(endpoint + '/health')).json()).ok, true);
    const training = await new Client(endpoint).create('training');
    rooms.push(training);
    let latest: Snapshot | undefined;
    let snapshots = 0;
    training.onMessage('snapshot', (snapshot: Snapshot) => { latest = snapshot; snapshots++; });
    training.onMessage('input-rejected', () => {});
    training.onMessage('result', () => {});
    let seq = 0;
    const sender = setInterval(() => training.send('input', {
      seq: ++seq, moveX: 0, moveZ: 0, aimYaw: 0, aimPitch: 0,
      fire: true, boost: false, lift: false,
    }), 50);
    try { await sleep(1250); } finally { clearInterval(sender); }
    assert.ok(latest, 'SDK must receive the authoritative protocol');
    assert.ok(latest.serverTick >= 55, `physics must actually advance near 60Hz, got tick ${latest.serverTick}`);
    assert.ok(snapshots >= 12, `20Hz snapshots must not be starved by an idle clock, got ${snapshots}`);
    assert.equal(latest.players.length, 1);
    assert.equal(latest.targets[0].health, 0, 'a real websocket input must cause a real server projectile hit');
    assert.ok(latest.players[0].shotsFired >= 4 && latest.players[0].shotsFired <= 6);
    await training.leave();

    const alpha = await new Client(endpoint).create('arena');
    rooms.push(alpha);
    const alphaSnapshots = new Map<number, Snapshot>();
    const betaSnapshots = new Map<number, Snapshot>();
    const alphaResults: MatchResult[] = [], betaResults: MatchResult[] = [];
    alpha.onMessage('snapshot', (snapshot: Snapshot) => { alphaSnapshots.set(snapshot.serverTick, snapshot); });
    alpha.onMessage('result', (result: MatchResult) => { alphaResults.push(result); });
    alpha.onMessage('input-rejected', () => {});
    const beta = await new Client(endpoint).joinById(alpha.roomId);
    rooms.push(beta);
    let duel: Snapshot | undefined;
    beta.onMessage('snapshot', (snapshot: Snapshot) => { duel = snapshot; betaSnapshots.set(snapshot.serverTick, snapshot); });
    beta.onMessage('result', (result: MatchResult) => { betaResults.push(result); });
    beta.onMessage('input-rejected', () => {});
    await sleep(180);
    assert.equal(duel?.status, 'running');
    assert.equal(duel?.players.length, 2);
    assert.equal(duel?.matchId, alpha.roomId);
    await assert.rejects(new Client(endpoint).joinById(alpha.roomId));
    let duelSeq = 0;
    const duelSender = setInterval(() => {
      duelSeq++;
      const input = { seq: duelSeq, moveX: 0, moveZ: 0, aimYaw: 0, aimPitch: 0, fire: true, boost: false, lift: false };
      alpha.send('input', input);
      beta.send('input', { ...input, aimYaw: Math.PI });
    }, 50);
    try {
      // A full-health duel includes two overheat recovery windows. Do not
      // weaken the real weapon/heat rules just to make the network test short.
      const deadline = Date.now() + 22_000;
      while ((!alphaResults.length || !betaResults.length) && Date.now() < deadline) await sleep(25);
    } finally { clearInterval(duelSender); }
    assert.equal(alphaResults.length, 1, 'first real client receives exactly one result event');
    assert.equal(betaResults.length, 1, 'second real client receives exactly one result event');
    assert.deepEqual(alphaResults[0], betaResults[0], 'both sockets must agree on winner, reason and authoritative result');
    assert.equal(alphaResults[0].matchId, alpha.roomId);
    assert.equal(alphaResults[0].resultId, `${alpha.roomId}:result`);
    assert.equal(alphaResults[0].reason, 'core-destroyed');
    const sharedDamagedTick = [...alphaSnapshots.keys()].find((tick) => {
      const first = alphaSnapshots.get(tick)!;
      return betaSnapshots.has(tick) && first.players.length === 2 && first.players.every((player) => player.health < 1000);
    });
    assert.notEqual(sharedDamagedTick, undefined, 'both clients must observe actual damage to both pilots at a shared server tick');
    const alphaDamage = alphaSnapshots.get(sharedDamagedTick!)!;
    const betaDamage = betaSnapshots.get(sharedDamagedTick!)!;
    const healthById = (snapshot: Snapshot) => snapshot.players.map((player) => ({ id: player.id, health: player.health })).sort((a,b) => a.id.localeCompare(b.id));
    assert.deepEqual(healthById(alphaDamage), healthById(betaDamage), 'authoritative damage is identical for both clients');
    const storedResult = await (await fetch(`${endpoint}/api/matches/${alpha.roomId}`)).json();
    assert.deepEqual(storedResult, alphaResults[0], 'the HTTP recovery path returns the same unique result');
    await sleep(100);
    assert.equal(alphaResults.length, 1, 'finished-room ticks do not broadcast a second settlement');
    assert.equal(betaResults.length, 1);
    for (const snapshots of [alphaSnapshots, betaSnapshots]) {
      const finalSnapshot = snapshots.get(alphaResults[0].finishedAtTick);
      assert.equal(finalSnapshot?.status, 'finished', 'combat settlement must deliver its final state even between snapshot ticks');
      assert.deepEqual(finalSnapshot?.result, alphaResults[0]);
    }
  } finally {
    await Promise.allSettled(rooms.map((room) => room.leave()));
    await server.gracefullyShutdown(false);
  }
});
