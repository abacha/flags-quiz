import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagFigure } from './choices';
import { bindKeys } from './keys';
import type { Submit } from './render';

export function renderYesNo(prompt: string, figure: HTMLElement, submit: Submit): HTMLElement {
  return el('div', { className: 'question' }, [
    el('h2', {}, [prompt]),
    figure,
    el('div', { className: 'yes-no' }, [
      bindKeys(el('button', { className: 'big', onclick: () => submit({ kind: 'yesNo', yes: true }) }, ['Sim']), 0, 2),
      bindKeys(el('button', { className: 'big', onclick: () => submit({ kind: 'yesNo', yes: false }) }, ['Não']), 1, 2),
    ]),
  ]);
}

export function renderTrueFalse(target: Country, shown: Country, submit: Submit): HTMLElement {
  return renderYesNo(`Esta é a bandeira de ${shown.name}?`, flagFigure(target), submit);
}
