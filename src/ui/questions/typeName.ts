import { el } from '../dom';
import { typoMessage } from './typoMessage';
import type { Submit } from './render';

export function renderTypeName(prompt: string, figure: HTMLElement, submit: Submit): HTMLElement {
  const input = el('input', {
    type: 'text',
    required: true,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    placeholder: 'Nome',
  });
  const message = typoMessage();
  const form = el('form', { className: 'type-form' }, [input, el('button', { className: 'primary', type: 'submit' }, ['Responder'])]);
  form.onsubmit = (event) => {
    event.preventDefault();
    if (input.value.trim() === '') {
      input.value = '';
      return;
    }
    message.hidden = submit({ kind: 'text', text: input.value }).length === 0;
  };
  queueMicrotask(() => input.focus());
  return el('div', { className: 'question' }, [el('h2', {}, [prompt]), figure, form, message]);
}
