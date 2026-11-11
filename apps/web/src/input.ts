import type {InputFrame} from '../../../packages/protocol/src/index';

export const CONTROL_LABELS = {
  forward: '前进', back: '后退', left: '左移', right: '右移',
  turnLeft: '左转', turnRight: '右转', fire: '射击', jump: '跳跃 / 续升', boost: '推进冲刺', slow: '缓行', lift: '升空',
} as const;
export type ControlAction = keyof typeof CONTROL_LABELS;

export const KEY_ACTIONS: Record<string, ControlAction> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnLeft', ArrowRight: 'turnRight',
  Space: 'jump', KeyQ: 'boost',
  ShiftLeft: 'slow', ShiftRight: 'slow', KeyF: 'fire', KeyE: 'lift',
};

/** Map pilot intents to the server's control protocol. */
export function makeInputFrame(seq: number, held: ReadonlySet<ControlAction>, aim: {yaw: number; pitch: number}): InputFrame {
  return {seq,
    moveX: Number(held.has('right')) - Number(held.has('left')),
    moveZ: Number(held.has('back')) - Number(held.has('forward')),
    aimYaw: aim.yaw, aimPitch: aim.pitch,
    fire: held.has('fire'), jump: held.has('jump'), slow: held.has('slow'),
    // E powers auxiliary lift directly; Space lets the server distinguish jump from airborne lift.
    boost: held.has('boost') || held.has('lift'), lift: held.has('lift') || held.has('jump')};
}
