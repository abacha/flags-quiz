import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagFigure } from './choices';
import type { Submit } from './render';

export function renderTrueFalse(target: Country, shown: Country, submit: Submit): HTMLElement {
  return el('div', { className: 'question' }, [
    el('h2', {}, [`Esta é a bandeira de ${shown.name}?`]),
    flagFigure(target),
    el('div', { className: 'yes-no' }, [
      el('button', { className: 'big', onclick: () => submit({ kind: 'yesNo', yes: true }) }, ['Sim']),
      el('button', { className: 'big', onclick: () => submit({ kind: 'yesNo', yes: false }) }, ['Não']),
    ]),
  ]);
}
