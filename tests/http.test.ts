import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { performance } from 'node:perf_hooks';
import { createGameServer } from '../apps/server/src/index.ts';

test('an unfinished trickling lab body neither reserves the engine nor outlives its absolute read deadline', { timeout: 15_000 }, async () => {
  const server = createGameServer();
  await server.listen(0, '127.0.0.1');
  const address = server.transport.server?.address();
  assert(address && typeof address === 'object');
  const endpoint = `http://127.0.0.1:${address.port}`;
  const started = performance.now();
  const slow = request(endpoint + '/api/lab/check', {
    method: 'POST', agent: false,
    headers: { 'Content-Type': 'application/json', 'Content-Length': '100' },
  });
  const closed = new Promise<number>((resolve) => slow.once('close', () => resolve(performance.now() - started)));
  slow.on('error', () => {});
  slow.on('response', (response) => response.resume());
  slow.flushHeaders(); slow.write('{');
  const trickle = setInterval(() => { if (!slow.destroyed) slow.write(' '); }, 150);
  try {
    // Give the real HTTP route time to start consuming the deliberately incomplete body.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const valid = await fetch(endpoint + '/api/lab/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payloadKg: 0.1 }), signal: AbortSignal.timeout(8000),
    });
    assert.equal(valid.status, 200, 'an unfinished request must not occupy the mechanical-engine slot');
    const report = await valid.json();
    assert.equal(report.engine, 'MuJoCo');
    assert.equal(report.steps, 1000);
    let closeDeadline: ReturnType<typeof setTimeout> | undefined;
    const closedAfter = await Promise.race([
      closed,
      new Promise<never>((_, reject) => { closeDeadline = setTimeout(() => reject(new Error('unfinished request socket stayed open past its absolute body deadline')), 3200); }),
    ]).finally(() => clearTimeout(closeDeadline));
    assert(closedAfter < 3100, `trickling data must not refresh the 2-second deadline (${closedAfter}ms)`);
    const after = await fetch(endpoint + '/api/lab/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payloadKg: 0.1 }), signal: AbortSignal.timeout(8000),
    });
    assert.equal(after.status, 200, 'timed-out body cleanup must not poison subsequent legitimate checks');
    await after.arrayBuffer();
  } finally {
    clearInterval(trickle); slow.destroy();
    await server.gracefullyShutdown(false);
  }
});
