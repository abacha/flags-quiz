// Mobile browsers treat a press held past ~500ms as a long press and send no click when the
// finger lifts, so a slow tap on a button did nothing. A touch held on a button for
// LONG_PRESS_MS and released inside it clicks the button here; a click the browser still
// sends right after is dropped so the button never fires twice. Shorter taps stay native,
// which keeps the double-tap guard in main.ts working on their `detail`.
//
// Touch events carry this instead of pointer events: when a held finger drifts a few pixels,
// Android starts a scroll and ends the pointer stream with pointercancel, yet still delivers
// touchend. A drift up to MAX_DRIFT_PX still counts as a press; a longer drag is a scroll.
const LONG_PRESS_MS = 350;
const FOLLOW_UP_MS = 500;
const MAX_DRIFT_PX = 24;

export function clickOnLongPress(doc: Document, now: () => number = () => performance.now()): () => void {
  let pressed: { button: HTMLButtonElement; at: number; x: number; y: number } | null = null;
  let clickedByUs: { button: HTMLButtonElement; until: number } | null = null;
  let dispatching = false;

  const onStart = (event: TouchEvent) => {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;
    const button = touch ? (event.target as Element | null)?.closest('button') : null;
    pressed = touch && button ? { button, at: now(), x: touch.clientX, y: touch.clientY } : null;
  };

  const onEnd = (event: TouchEvent) => {
    const press = pressed;
    pressed = null;
    const touch = event.changedTouches[0];
    if (!press || !touch || press.button.disabled || now() - press.at < LONG_PRESS_MS) return;
    if (Math.hypot(touch.clientX - press.x, touch.clientY - press.y) > MAX_DRIFT_PX) return;
    const box = press.button.getBoundingClientRect();
    const inside = touch.clientX >= box.left && touch.clientX <= box.right && touch.clientY >= box.top && touch.clientY <= box.bottom;
    if (!inside) return;
    dispatching = true;
    press.button.click();
    dispatching = false;
    clickedByUs = { button: press.button, until: now() + FOLLOW_UP_MS };
  };

  const onCancel = () => {
    pressed = null;
  };

  const onClick = (event: MouseEvent) => {
    if (dispatching || !clickedByUs) return;
    const { button, until } = clickedByUs;
    clickedByUs = null;
    if (now() <= until && button.contains(event.target as Node)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  };

  const listeners: [string, (event: never) => void][] = [
    ['touchstart', onStart],
    ['touchend', onEnd],
    ['touchcancel', onCancel],
    ['click', onClick],
  ];
  for (const [type, listener] of listeners) doc.addEventListener(type, listener as EventListener, { capture: true, passive: type !== 'click' });
  return () => {
    for (const [type, listener] of listeners) doc.removeEventListener(type, listener as EventListener, { capture: true });
  };
}
