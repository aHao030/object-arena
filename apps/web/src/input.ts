import type {InputFrame} from '../../../packages/protocol/src/index';
import {DEFAULT_BINDINGS, buildKeyActions} from './keyBindings';

export const CONTROL_LABELS = {
  forward: '前进', back: '后退', left: '左移', right: '右移',
  turnLeft: '左转', turnRight: '右转', fire: '射击', jump: '跳跃 / 升空', boost: '加速 / 推进', slow: '缓行', lift: '升空',
} as const;
export type ControlAction = keyof typeof CONTROL_LABELS;

/** Slots describe the current loadout, not abilities that have yet to be built. */
export const SKILL_SLOTS = [
  {binding: 'skill1', label: '未装备'},
  {binding: 'skill2', label: '未装备'},
  {binding: 'skill3', label: '未装备'},
  {binding: 'skill4', label: '未装备'},
] as const;

export const KEY_ACTIONS = buildKeyActions(DEFAULT_BINDINGS);

/** Map pilot intents to the server's control protocol. */
export function makeInputFrame(seq: number, held: ReadonlySet<ControlAction>, aim: {yaw: number; pitch: number}): InputFrame {
  return {seq,
    moveX: Number(held.has('right')) - Number(held.has('left')),
    moveZ: Number(held.has('back')) - Number(held.has('forward')),
    aimYaw: aim.yaw, aimPitch: aim.pitch,
    fire: held.has('fire'), jump: held.has('jump'), slow: held.has('slow'),
    // Space starts a jump; the server delays and budgets sustained airborne lift.
    boost: held.has('boost') || held.has('lift'), lift: held.has('lift') || held.has('jump')};
}
