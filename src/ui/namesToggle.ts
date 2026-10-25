import { el } from './dom';

export function namesToggle(onChange: (shown: boolean) => void): HTMLLabelElement {
  const input = el('input', { type: 'checkbox', checked: true, onchange: () => onChange(input.checked) });
  return el('label', { className: 'names-toggle' }, [input, ' Nomes']);
}
