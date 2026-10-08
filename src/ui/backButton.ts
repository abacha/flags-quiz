type BackAction = () => void;

let pending: BackAction | null = null;
let action: BackAction | null = null;
let armed = false;
let ignoreNextPop = false;

export function onBack(next: BackAction): void {
  pending = next;
}

export function settleBack(): void {
  action = pending;
  pending = null;
  if (action) arm();
  else if (armed) {
    armed = false;
    ignoreNextPop = true;
    history.back();
  }
}

export function listenForBack(): () => void {
  const onPop = () => {
    if (ignoreNextPop) {
      ignoreNextPop = false;
      return;
    }
    armed = false;
    action?.();
    if (action) arm();
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}

function arm(): void {
  if (armed) return;
  history.pushState({ back: true }, '');
  armed = true;
}
