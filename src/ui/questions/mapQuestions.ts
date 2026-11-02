import type { Country } from '../../data/countries';
import type { Question } from '../../engine/question';
import { el } from '../dom';
import { renderMap } from '../map/map';
import { mapPool, type MapScope } from '../../data/maps';
import { flagFigure, renderNameChoices } from './choices';
import { renderSpellName } from './spellName';
import type { Submit } from './render';
import { renderTypeName } from './typeName';

export type MapQuestion = Extract<Question, { format: 'mapToNames' | 'mapTypeName' | 'mapFlagToNames' | 'mapFindCountry' | 'mapSpellName' }>;

function highlightedMap(scope: MapScope, country: Country): HTMLElement {
  const view = renderMap(scope);
  view.paint(country.iso2, 'highlight');
  view.focus([country.iso2]);
  return view.element;
}

export function mapSolution(question: MapQuestion, scope: MapScope): HTMLElement {
  const view = renderMap(scope);
  view.paint(question.target.iso2, 'missed', question.target.name);
  view.focus([question.target.iso2]);
  return view.element;
}

function renderFindCountry(target: Country, scope: MapScope, submit: Submit): HTMLElement {
  let marked: Country | undefined;
  const confirm = el('button', { className: 'primary', type: 'button', disabled: true }, ['Responder']);
  confirm.dataset.keys = 'Enter';
  const view = renderMap(scope, (country) => {
    if (marked) view.paint(marked.iso2, 'idle');
    marked = country;
    view.paint(country.iso2, 'highlight');
    confirm.disabled = false;
  });
  view.focus(mapPool(scope.continent, scope.level).map((c) => c.iso2));
  confirm.onclick = () => submit({ kind: 'choice', iso2: marked!.iso2 });
  return el('div', { className: 'question' }, [
    el('h2', {}, [`Onde fica ${target.name}?`]),
    el('div', { className: 'map-flag' }, [view.element, flagFigure(target)]),
    confirm,
  ]);
}

export function renderMapQuestion(question: MapQuestion, scope: MapScope, submit: Submit): HTMLElement {
  switch (question.format) {
    case 'mapToNames':
      return renderNameChoices('Que país é este?', highlightedMap(scope, question.target), question.options, submit);
    case 'mapTypeName':
      return renderTypeName('Escreva o nome deste país', highlightedMap(scope, question.target), submit);
    case 'mapFlagToNames':
      return renderNameChoices(
        'Que país é este?',
        el('div', { className: 'map-flag' }, [highlightedMap(scope, question.target), flagFigure(question.target)]),
        question.options,
        submit,
      );
    case 'mapFindCountry':
      return renderFindCountry(question.target, scope, submit);
    case 'mapSpellName':
      return renderSpellName('Monte o nome deste país', highlightedMap(scope, question.target), question.letters, submit);
  }
}
