import type {InputFrame} from '../../../packages/protocol/src/index';

export const CONTROL_LABELS = {
  forward: '前进', back: '后退', left: '左移', right: '右移',
  turnLeft: '左转', turnRight: '右转', fire: '射击', boost: '推进', lift: '升空',
} as const;
export type ControlAction = keyof typeof CONTROL_LABELS;

/** Map pilot intents to the server's control protocol. */
export function makeInputFrame(seq: number, held: ReadonlySet<ControlAction>, aim: {yaw: number; pitch: number}): InputFrame {
  return {seq,
    moveX: Number(held.has('right')) - Number(held.has('left')),
    moveZ: Number(held.has('back')) - Number(held.has('forward')),
    aimYaw: aim.yaw, aimPitch: aim.pitch,
    // lift is an independent UI intent; the wire protocol uses it to direct boost.
    fire: held.has('fire'), boost: held.has('boost') || held.has('lift'), lift: held.has('lift')};
}
