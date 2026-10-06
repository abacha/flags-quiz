const SHORTCUT = /^([1-6]|ArrowLeft|ArrowRight)$/;

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
  const button = question.querySelector<HTMLButtonElement>(`[data-keys~="${event.key}"]`);
  if (!button) return;
  event.preventDefault();
  button.click();
}
