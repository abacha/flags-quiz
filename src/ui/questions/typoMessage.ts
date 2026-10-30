import { el } from '../dom';

export function typoMessage(): HTMLElement {
  return el('p', { className: 'type-message', hidden: true }, ['Confira a grafia']);
}
