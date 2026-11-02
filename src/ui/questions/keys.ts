const SHORTCUT = /^([1-6]|ArrowLeft|ArrowRight|Backspace|Enter|\p{L})$/u;

export function bindKeys(button: HTMLButtonElement, index: number, optionCount: number): HTMLButtonElement {
  const keys = [String(index + 1)];
  if (optionCount === 2) keys.push(index === 0 ? 'ArrowLeft' : 'ArrowRight');
  button.dataset.keys = keys.join(' ');
  button.dataset.hint = String(index + 1);
  return button;
}

export function pressShortcut(question: HTMLElement, event: KeyboardEvent): void {
  if (question.inert || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLInputElement || !SHORTCUT.test(event.key)) return;
  const key = event.key.length === 1 ? event.key.toLocaleLowerCase('pt-BR') : event.key;
  // An exact key wins over a loose one, so "e" takes a plain "e" tile before an "é" one.
  const button =
    question.querySelector<HTMLButtonElement>(`[data-keys~="${key}"]:not(:disabled)`) ??
    question.querySelector<HTMLButtonElement>(`[data-loose-keys~="${key}"]:not(:disabled)`);
  if (!button) return;
  event.preventDefault();
  button.click();
}
