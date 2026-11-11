import type {ControlAction} from './input';

export type BindingAction = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'boost' | 'slow'
  | 'skill1' | 'skill2' | 'skill3' | 'skill4';
export type Bindings = Record<BindingAction, string>;

export const DEFAULT_BINDINGS: Readonly<Bindings> = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  jump: 'Space', boost: 'ShiftLeft', slow: 'KeyC',
  skill1: 'KeyQ', skill2: 'KeyE', skill3: 'KeyR', skill4: 'KeyT',
};

export const BINDING_LABELS: Record<BindingAction, string> = {
  forward: '前进', back: '后退', left: '左移', right: '右移',
  jump: '跳跃 / 升空', boost: '加速 / 推进', slow: '缓行',
  skill1: '技能 1', skill2: '技能 2', skill3: '技能 3', skill4: '技能 4',
};

export function formatKey(code: string): string {
  if (code === 'Space') return '空格';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  return code.replace(/^(Key|Digit)/, '');
}

const CONTROL_BINDINGS = ['forward', 'back', 'left', 'right', 'jump', 'boost', 'slow'] as const;
const normalizeKey = (code: string) => code === 'ShiftRight' ? 'ShiftLeft' : code;
const isAllowedKey = (code: string) => /^(Key[A-Z]|Digit[0-9]|Space|ShiftLeft)$/.test(code);

export function buildKeyActions(bindings: Readonly<Bindings>): Record<string, ControlAction> {
  const actions: Record<string, ControlAction> = {
    ArrowUp: 'forward', ArrowDown: 'back', ArrowLeft: 'turnLeft', ArrowRight: 'turnRight',
  };
  for (const action of CONTROL_BINDINGS) {
    const code = normalizeKey(bindings[action]);
    actions[code] = action;
    if (code === 'ShiftLeft') actions.ShiftRight = action;
  }
  return actions;
}

export type BindingChange = {ok: true; bindings: Bindings} | {ok: false; message: string};
export function changeBinding(bindings: Readonly<Bindings>, action: BindingAction, code: string): BindingChange {
  if (!Object.hasOwn(DEFAULT_BINDINGS, action)) return {ok: false, message: '未知的驾驶动作。'};
  const normalized = normalizeKey(code);
  if (!isAllowedKey(normalized)) {
    return {ok: false, message: '请使用字母、数字、空格或 Shift；方向键与浏览器快捷键保留。'};
  }
  const conflict = (Object.keys(DEFAULT_BINDINGS) as BindingAction[])
    .find(other => other !== action && normalizeKey(bindings[other]) === normalized);
  if (conflict) return {ok: false, message: `${formatKey(normalized)} 已用于${BINDING_LABELS[conflict]}，请先更换该动作的按键。`};
  return {ok: true, bindings: {...bindings, [action]: normalized}};
}

export function loadBindings(raw: string | null): Bindings {
  const defaults = () => ({...DEFAULT_BINDINGS});
  if (raw === null) return defaults();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults();
    const actions = Object.keys(DEFAULT_BINDINGS) as BindingAction[];
    if (Object.keys(parsed).length !== actions.length) return defaults();
    const candidate = parsed as Record<string, unknown>;
    const next = defaults();
    const occupied = new Set<string>();
    for (const action of actions) {
      if (!Object.hasOwn(candidate, action) || typeof candidate[action] !== 'string') return defaults();
      const code = normalizeKey(candidate[action]);
      if (!isAllowedKey(code) || occupied.has(code)) return defaults();
      next[action] = code; occupied.add(code);
    }
    return next;
  } catch {return defaults();}
}
