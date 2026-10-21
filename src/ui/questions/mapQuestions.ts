import type { Country } from '../../data/countries';
import type { Question } from '../../engine/question';
import type { ContinentKey } from '../../engine/pool';
import { el } from '../dom';
import { renderMap } from '../map/map';
import { renderNameChoices } from './choices';
import { renderPairs } from './pairs';
import type { Submit } from './render';
import { renderYesNo } from './trueFalse';
import { renderTypeName } from './typeName';

export type MapQuestion = Extract<Question, { format: 'mapToNames' | 'nameToMap' | 'mapPairs' | 'mapTrueFalse' | 'mapTypeName' }>;

const letterOf = (index: number) => String.fromCharCode(65 + index);

function highlightedMap(continent: ContinentKey, ...highlighted: Country[]): HTMLElement {
  const view = renderMap(continent);
  highlighted.forEach((country, index) => view.paint(country.iso2, 'highlight', highlighted.length > 1 ? letterOf(index) : undefined));
  return view.element;
}

function solutionCountries(question: MapQuestion): Country[] {
  return question.format === 'mapPairs' ? question.countries : [question.target];
}

export function mapSolution(question: MapQuestion, continent: ContinentKey): HTMLElement {
  const view = renderMap(continent);
  for (const country of solutionCountries(question)) view.paint(country.iso2, 'missed', country.name);
  return view.element;
}

export function renderMapQuestion(question: MapQuestion, continent: ContinentKey, submit: Submit): HTMLElement {
  switch (question.format) {
    case 'mapToNames':
      return renderNameChoices('Que país é este?', highlightedMap(continent, question.target), question.options, submit);
    case 'nameToMap': {
      const view = renderMap(continent, (country) => submit({ kind: 'choice', iso2: country.iso2 }));
      return el('div', { className: 'question' }, [el('h2', {}, [`Onde fica ${question.target.name}?`]), view.element]);
    }
    case 'mapPairs':
      return renderPairs('Ligue cada nome ao país', question.countries, submit, {
        figure: highlightedMap(continent, ...question.countries),
        face: (_country, index) => el('span', { className: 'pair-letter' }, [letterOf(index)]),
      });
    case 'mapTrueFalse':
      return renderYesNo(`Este é ${question.shown.name}?`, highlightedMap(continent, question.target), submit);
    case 'mapTypeName':
      return renderTypeName('Escreva o nome deste país', highlightedMap(continent, question.target), submit);
  }
}
