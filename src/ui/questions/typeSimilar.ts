import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagImg } from '../flag';
import type { Submit } from './render';

export function renderTypeSimilar(countries: Country[], submit: Submit): HTMLElement {
  const fields = countries.map((country) => ({
    country,
    input: el('input', {
      type: 'text',
      required: true,
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: false,
      placeholder: 'Nome do país',
    }),
  }));
  const form = el('form', { className: 'type-form' }, [
    el('div', { className: 'type-grid' }, fields.map(({ country, input }) => el('label', { className: 'type-item' }, [flagImg(country), input]))),
    el('button', { className: 'primary', type: 'submit' }, ['Responder']),
  ]);
  form.onsubmit = (event) => {
    event.preventDefault();
    const blanks = fields.filter(({ input }) => input.value.trim() === '');
    if (blanks.length > 0) {
      blanks.forEach(({ input }) => (input.value = ''));
      blanks[0].input.focus();
      return;
    }
    submit({ kind: 'texts', texts: Object.fromEntries(fields.map(({ country, input }) => [country.iso2, input.value])) });
  };
  queueMicrotask(() => fields[0].input.focus());
  return el('div', { className: 'question' }, [el('h2', {}, ['Bandeiras parecidas: escreva o nome de cada uma']), form]);
}
