// A fast double-tap on a button (e.g. "Continuar") would otherwise land its second click
// on whatever element the first click's DOM swap put under the pointer. `detail` counts
// clicks within the OS double-click interval; the app has no legitimate double-click
// interaction, and keyboard-triggered clicks have `detail` 0. Android counts a second tap
// up to 100dp away as part of the double-tap, so only a second click near the first is
// dropped: a quick tap on a flag and then on a name in the pairs question must both land.
const SAME_SPOT_PX = 24;

export function ignoreDoubleTap(doc: Document): () => void {
  let last = { x: 0, y: 0 };
  const onClick = (event: MouseEvent) => {
    const sameSpot = Math.hypot(event.clientX - last.x, event.clientY - last.y) <= SAME_SPOT_PX;
    if (event.detail > 1 && sameSpot) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    last = { x: event.clientX, y: event.clientY };
  };
  doc.addEventListener('click', onClick, { capture: true });
  return () => doc.removeEventListener('click', onClick, { capture: true });
}
