import type { Country } from '../../data/countries';
import type { MapScope } from '../../data/maps';
import type { Question } from '../../engine/question';
import { el } from '../dom';
import { renderMap } from '../map/map';
import { renderNameChoices } from './choices';
import { renderPairs } from './pairs';
import type { Submit } from './render';
import { renderYesNo } from './trueFalse';
import { renderTypeName } from './typeName';

export type MapQuestion = Extract<Question, { format: 'mapToNames' | 'nameToMap' | 'mapPairs' | 'mapTrueFalse' | 'mapTypeName' }>;

const letterOf = (index: number) => String.fromCharCode(65 + index);

function highlightedMap(scope: MapScope, ...highlighted: Country[]): HTMLElement {
  const view = renderMap(scope);
  highlighted.forEach((country, index) => view.paint(country.iso2, 'highlight', highlighted.length > 1 ? letterOf(index) : undefined));
  view.focus(highlighted.map((c) => c.iso2));
  return view.element;
}

function solutionCountries(question: MapQuestion): Country[] {
  return question.format === 'mapPairs' ? question.countries : [question.target];
}

export function mapSolution(question: MapQuestion, scope: MapScope): HTMLElement {
  const view = renderMap(scope);
  const shown = solutionCountries(question);
  for (const country of shown) view.paint(country.iso2, 'missed', country.name);
  view.focus(shown.map((c) => c.iso2));
  return view.element;
}

export function renderMapQuestion(question: MapQuestion, scope: MapScope, submit: Submit): HTMLElement {
  switch (question.format) {
    case 'mapToNames':
      return renderNameChoices('Que país é este?', highlightedMap(scope, question.target), question.options, submit);
    case 'nameToMap': {
      const view = renderMap(scope, (country) => submit({ kind: 'choice', iso2: country.iso2 }));
      return el('div', { className: 'question' }, [el('h2', {}, [`Onde fica ${question.target.name}?`]), view.element]);
    }
    case 'mapPairs':
      return renderPairs('Ligue cada nome ao país', question.countries, submit, {
        figure: highlightedMap(scope, ...question.countries),
        face: (_country, index) => el('span', { className: 'pair-letter' }, [letterOf(index)]),
      });
    case 'mapTrueFalse':
      return renderYesNo(`Este é ${question.shown.name}?`, highlightedMap(scope, question.target), submit);
    case 'mapTypeName':
      return renderTypeName('Escreva o nome deste país', highlightedMap(scope, question.target), submit);
  }
}
