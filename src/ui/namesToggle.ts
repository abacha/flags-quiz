import { el } from './dom';

export function namesToggle(onChange: (shown: boolean) => void): HTMLButtonElement {
  let shown = true;
  const button = el('button', { className: 'tab names-toggle on', type: 'button' }, ['Nomes']);
  button.setAttribute('aria-pressed', 'true');
  button.onclick = () => {
    shown = !shown;
    button.classList.toggle('on', shown);
    button.setAttribute('aria-pressed', String(shown));
    onChange(shown);
  };
  return button;
}
