// Mobile browsers treat a press held past ~500ms as a long press and send no click when the
// finger lifts, so a slow tap on a button did nothing. A touch held on a button for
// LONG_PRESS_MS and released inside it clicks the button here; a click the browser still
// sends right after is dropped so the button never fires twice. Shorter taps stay native,
// which keeps the double-tap guard in main.ts working on their `detail`.
const LONG_PRESS_MS = 350;
const FOLLOW_UP_MS = 500;

export function clickOnLongPress(doc: Document, now: () => number = () => performance.now()): () => void {
  let pressed: { button: HTMLButtonElement; at: number } | null = null;
  let clickedByUs: { button: HTMLButtonElement; until: number } | null = null;
  let dispatching = false;

  const onDown = (event: PointerEvent) => {
    const button = event.pointerType === 'mouse' ? null : (event.target as Element | null)?.closest('button');
    pressed = button ? { button, at: now() } : null;
  };

  const onUp = (event: PointerEvent) => {
    const press = pressed;
    pressed = null;
    if (!press || press.button.disabled || now() - press.at < LONG_PRESS_MS) return;
    const box = press.button.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
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

  doc.addEventListener('pointerdown', onDown, { capture: true });
  doc.addEventListener('pointerup', onUp, { capture: true });
  doc.addEventListener('pointercancel', onCancel, { capture: true });
  doc.addEventListener('click', onClick, { capture: true });
  return () => {
    doc.removeEventListener('pointerdown', onDown, { capture: true });
    doc.removeEventListener('pointerup', onUp, { capture: true });
    doc.removeEventListener('pointercancel', onCancel, { capture: true });
    doc.removeEventListener('click', onClick, { capture: true });
  };
}
