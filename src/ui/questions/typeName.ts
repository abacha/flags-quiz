import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagFigure } from './choices';
import type { Submit } from './render';

export function renderTypeName(target: Country, submit: Submit): HTMLElement {
  const input = el('input', {
    type: 'text',
    required: true,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    placeholder: 'Nome do país',
  });
  const form = el('form', { className: 'type-form' }, [input, el('button', { className: 'primary', type: 'submit' }, ['Responder'])]);
  form.onsubmit = (event) => {
    event.preventDefault();
    submit({ kind: 'text', text: input.value });
  };
  queueMicrotask(() => input.focus());
  return el('div', { className: 'question' }, [el('h2', {}, ['Escreva o nome do país desta bandeira']), flagFigure(target), form]);
}
