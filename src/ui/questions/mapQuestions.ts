import type { Country } from '../../data/countries';
import type { MapScope } from '../../data/maps';
import type { Question } from '../../engine/question';
import { el } from '../dom';
import { renderMap } from '../map/map';
import { flagFigure, renderFlagChoices, renderNameChoices } from './choices';
import { renderSpellName } from './spellName';
import type { Submit } from './render';
import { renderTypeName } from './typeName';

export type MapQuestion = Extract<Question, { format: 'mapToNames' | 'mapTypeName' | 'mapFlagToNames' | 'mapToFlags' | 'mapSpellName' }>;

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
    case 'mapToFlags':
      return renderFlagChoices('Qual é a bandeira deste país?', question.options, submit, highlightedMap(scope, question.target));
    case 'mapSpellName':
      return renderSpellName('Monte o nome deste país', highlightedMap(scope, question.target), question.letters, submit);
  }
}
