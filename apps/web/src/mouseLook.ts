export interface MouseAim {yaw: number; pitch: number;}

const MOUSE_SENSITIVITY = 0.003;
export const MOUSE_PITCH_MIN = -30 * Math.PI / 180;
export const MOUSE_PITCH_MAX = 40 * Math.PI / 180;

/** Convert relative pointer movement to an aim intent; the server controls the body. */
export function applyMouseLook(aim: MouseAim, deltaX: number, deltaY: number): MouseAim {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return aim;
  const yaw = aim.yaw - deltaX * MOUSE_SENSITIVITY;
  return {
    yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
    pitch: Math.max(MOUSE_PITCH_MIN, Math.min(MOUSE_PITCH_MAX, aim.pitch - deltaY * MOUSE_SENSITIVITY)),
  };
}
