export interface MouseControlCallbacks {
  onLook(deltaX: number, deltaY: number): void;
  onStateChange(locked: boolean, message: string): void;
}

/** Owns browser pointer capture and listeners; it only emits relative look intents. */
export function createMouseControls(element: HTMLCanvasElement, callbacks: MouseControlCallbacks) {
  const doc = element.ownerDocument;
  let drag: {id: number; x: number; y: number} | null = null;
  let pending: object | null = null;
  let wanted = false;
  let locked = false;
  let disposed = false;
  let lastPointerType = 'mouse';
  const removers: (() => void)[] = [];
  const listen = (target: EventTarget, type: string, handler: EventListener) => {
    target.addEventListener(type, handler);
    removers.push(() => target.removeEventListener(type, handler));
  };
  function stopDrag() {
    const previous = drag;
    drag = null;
    if (previous && element.hasPointerCapture(previous.id)) element.releasePointerCapture(previous.id);
  }
  function capture() {
    if (disposed || pending || doc.pointerLockElement === element) return;
    if (!element.requestPointerLock) {
      callbacks.onStateChange(false, '当前浏览器不支持锁定鼠标；请按住右键拖动视角。');
      return;
    }
    const request = {};
    pending = request; wanted = true;
    try {
      element.focus({preventScroll: true});
      const completion = element.requestPointerLock();
      if (completion && typeof completion.then === 'function') {
        void completion.then(() => {
          if (pending === request) pending = null;
          if (disposed || !wanted) exitOwnedLock();
          else if (doc.pointerLockElement === element) changed();
        }, () => failed(request));
      }
    } catch {failed(request);}
  }
  function failed(request: object | null) {
    if (!request || pending !== request) return;
    pending = null;
    if (disposed || !wanted) return;
    wanted = false;
    callbacks.onStateChange(false, '未能锁定鼠标；请按住右键拖动视角，或再次单击战场。');
  }
  function exitOwnedLock() {
    if (doc.pointerLockElement === element) doc.exitPointerLock();
  }
  function release() {
    wanted = false;
    stopDrag();
    if (locked) {
      locked = false;
      if (!disposed) callbacks.onStateChange(false, '单击战场启用鼠标视角，或按住右键拖动。');
    }
    exitOwnedLock();
  }
  function changed() {
    if (doc.pointerLockElement === element) {
      pending = null;
      stopDrag();
      if (!wanted) {exitOwnedLock(); return;}
      if (!locked) {
        locked = true;
        callbacks.onStateChange(true, '鼠标视角已启用 · 移动鼠标观察，Esc 释放光标。');
      }
    } else if (locked) {
      locked = false; wanted = false;
      callbacks.onStateChange(false, '单击战场启用鼠标视角，或按住右键拖动。');
    }
  }
  listen(doc, 'pointerlockchange', changed);
  listen(doc, 'pointerlockerror', () => failed(pending));
  listen(doc, 'mousemove', event => {
    if (!wanted || doc.pointerLockElement !== element) return;
    const mouse = event as MouseEvent;
    callbacks.onLook(mouse.movementX, mouse.movementY);
  });
  listen(element, 'click', event => {
    const click = event as PointerEvent;
    const pointerType = click.pointerType || lastPointerType;
    if (click.button === 0 && pointerType === 'mouse') capture();
  });
  listen(element, 'pointerdown', event => {
    const pointer = event as PointerEvent;
    lastPointerType = pointer.pointerType || 'mouse';
    if (pointer.pointerType !== 'mouse' || pointer.button !== 2 || doc.pointerLockElement === element) return;
    pointer.preventDefault();
    element.focus({preventScroll: true});
    drag = {id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY};
    element.setPointerCapture(pointer.pointerId);
  });
  listen(element, 'pointermove', event => {
    const pointer = event as PointerEvent;
    if (!drag || pointer.pointerId !== drag.id) return;
    if (!(pointer.buttons & 2)) {stopDrag(); return;}
    callbacks.onLook(pointer.clientX - drag.x, pointer.clientY - drag.y);
    drag.x = pointer.clientX; drag.y = pointer.clientY;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    listen(element, type, event => {if ((event as PointerEvent).pointerId === drag?.id) stopDrag();});
  }
  if (doc.defaultView) listen(doc.defaultView, 'blur', release);
  listen(doc, 'visibilitychange', () => {if (doc.hidden) release();});
  listen(element, 'contextmenu', event => event.preventDefault());
  return {
    capture,
    release,
    dispose() {
      if (disposed) return;
      release();
      disposed = true;
      for (const remove of removers) remove();
    },
  };
}
