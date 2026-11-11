import {makeInputFrame, type ControlAction} from './input';

/** Samples user actions at the network cadence without dropping a short click/jump. */
export function createPilotControls() {
  const held = new Set<ControlAction>();
  const queued = new Set<ControlAction>();
  return {
    press(action: ControlAction) {
      if (!held.has(action) && (action === 'jump' || action === 'fire')) queued.add(action);
      held.add(action);
    },
    release(action: ControlAction) {held.delete(action);},
    clear() {held.clear(); queued.clear();},
    isHeld(action: ControlAction) {return held.has(action);},
    read(seq: number, aim: {yaw: number; pitch: number}) {
      const actions = new Set([...held, ...queued]);
      queued.clear();
      return makeInputFrame(seq, actions, aim);
    },
  };
}
export type PilotControls = ReturnType<typeof createPilotControls>;
