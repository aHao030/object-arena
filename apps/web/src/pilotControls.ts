import {makeInputFrame, type ControlAction} from './input';

/** Samples user actions at the network cadence without dropping a short click/jump. */
export function createPilotControls() {
  const held = new Map<ControlAction, Set<string>>();
  const queued = new Set<ControlAction>();
  return {
    press(action: ControlAction, source = 'default') {
      if (!held.has(action) && (action === 'jump' || action === 'fire')) queued.add(action);
      const sources = held.get(action) ?? new Set<string>();
      sources.add(source); held.set(action, sources);
    },
    release(action: ControlAction, source = 'default') {
      const sources = held.get(action);
      sources?.delete(source);
      if (sources?.size === 0) held.delete(action);
    },
    clear() {held.clear(); queued.clear();},
    isHeld(action: ControlAction) {return held.has(action);},
    read(seq: number, aim: {yaw: number; pitch: number}) {
      const actions = new Set([...held.keys(), ...queued]);
      queued.clear();
      return makeInputFrame(seq, actions, aim);
    },
  };
}
export type PilotControls = ReturnType<typeof createPilotControls>;
