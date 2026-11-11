import { Room, type Client } from '@colyseus/core';
import { createSimulation, type Simulation } from '../../../packages/sim/src/index.ts';
import { PHYSICS_HZ, type MatchMode, type MatchResult, type Snapshot } from '../../../packages/protocol/src/index.ts';

/** Process-local results only; this is intentionally not a durable ledger. */
export const matchResults = new Map<string, MatchResult>();

function recordResult(result: MatchResult) {
  if (matchResults.has(result.matchId)) return;
  matchResults.set(result.matchId, result);
  while (matchResults.size > 1000) matchResults.delete(matchResults.keys().next().value!);
}

export class MachineRoom extends Room {
  /** Server-owned room configuration; never populated from join options. */
  protected matchDuration = 180;
  private simulation!: Simulation;
  private sentResult = false;
  private restarting = false;
  private lastRestartAt = 0;
  private disconnectedSeconds = new Map<string, number>();
  private mode: MatchMode = 'training';

  async onCreate(options: { mode?: MatchMode }) {
    this.mode = options.mode === 'arena' ? 'arena' : 'training';
    this.maxClients = this.mode === 'arena' ? 2 : 1;
    this.autoDispose = true;
    this.simulation = await createSimulation({ mode: this.mode, matchId: this.roomId, duration: this.matchDuration });
    this.onMessage('input', (client: Client, message: unknown) => {
      const verdict = this.simulation.applyInput(client.sessionId, message);
      if (!verdict.accepted) client.send('input-rejected', verdict);
    });
    this.onMessage('restart', (client: Client) => {
      if (this.mode !== 'training') { client.send('input-rejected', { reason: 'restart-training-only' }); return; }
      if (this.restarting) return;
      if (Date.now() - this.lastRestartAt < 1000) { client.send('input-rejected', { reason: 'restart-rate-limit' }); return; }
      this.lastRestartAt = Date.now();
      this.restarting = true;
      void createSimulation({ mode: 'training', matchId: `${this.roomId}:${Date.now()}`, duration: this.matchDuration }).then((simulation) => {
        if (this.clients.length === 0) { simulation.destroy(); return; }
        this.simulation.destroy();
        this.simulation = simulation;
        this.sentResult = false;
        this.disconnectedSeconds.clear();
        this.simulation.addPlayer(client.sessionId);
        client.send('snapshot', this.simulation.getSnapshot());
      }).finally(() => { this.restarting = false; });
    });
    this.setFixedTimestep(() => {
      this.simulation.step();
      const snapshot = this.simulation.getSnapshot();
      if (this.publishResult(snapshot)) return;
      if (snapshot.serverTick % 3 === 0) this.broadcast('snapshot', snapshot);
    }, PHYSICS_HZ);
    // Set this AFTER the simulation interval exists. Colyseus installs an idle
    // clock interval when patches are disabled before a simulation starts; that
    // extra clock tick would steal elapsed time from setFixedTimestep.
    this.patchRate = null;
  }

  onJoin(client: Client) {
    this.simulation.addPlayer(client.sessionId);
    // A message is used instead of schema patches; both clients see the exact
    // same authoritative protocol and can recover without local world writes.
    this.broadcast('snapshot', this.simulation.getSnapshot());
  }

  async onDrop(client: Client) {
    const used = this.disconnectedSeconds.get(client.sessionId) ?? 0;
    const startedAt = Date.now();
    try { await this.allowReconnection(client, Math.max(0, 15 - used)); }
    catch { /* onLeave handles the final removal. */ }
    finally { this.disconnectedSeconds.set(client.sessionId, used + (Date.now() - startedAt) / 1000); }
  }

  onReconnect(client: Client) { client.send('snapshot', this.simulation.getSnapshot()); }

  onLeave(client: Client) {
    this.simulation.removePlayer(client.sessionId);
    const snapshot = this.simulation.getSnapshot();
    if (!this.publishResult(snapshot)) this.broadcast('snapshot', snapshot);
  }

  private publishResult(snapshot: Snapshot): boolean {
    if (!snapshot.result) return false;
    if (!this.sentResult) {
      this.sentResult = true;
      recordResult(snapshot.result);
      // Terminal delivery is independent of the regular 20Hz cadence. Send
      // the state before its notification, once, including onLeave finishes.
      this.broadcast('snapshot', snapshot);
      this.broadcast('result', snapshot.result);
    }
    return true;
  }

  onDispose() { this.simulation.destroy(); }
}
