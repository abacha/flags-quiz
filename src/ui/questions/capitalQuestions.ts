import { capitalCoords, capitalLabel, mainCapital } from '../../data/capitals';
import type { Country } from '../../data/countries';
import type { MapScope } from '../../data/maps';
import type { Question } from '../../engine/question';
import { el } from '../dom';
import { renderMap } from '../map/map';
import { flagImg } from '../flag';
import { renderNameChoices } from './choices';
import { solutionCard } from './feedback';
import type { Submit } from './render';
import { renderTypeName } from './typeName';

export type CapitalQuestion = Extract<
  Question,
  { format: 'capitalOnMap' | 'countryToCapitals' | 'typeCapital' | 'typeCapitalCountry' }
>;

export function countryFigure(country: Country): HTMLElement {
  return el('div', { className: 'figure country-figure' }, [flagImg(country), el('span', { className: 'country-name' }, [country.name])]);
}

function capitalFigure(country: Country): HTMLElement {
  return el('div', { className: 'figure capital-figure' }, [mainCapital(country)]);
}

function flagAndName(country: Country): HTMLElement {
  return el('span', { className: 'flag-name' }, [flagImg(country), country.name]);
}

export function capitalCard(country: Country): HTMLElement {
  return solutionCard(country, country.name, capitalLabel(country));
}

function pinnedCapital(scope: MapScope, country: Country): HTMLElement {
  const view = renderMap(scope);
  view.pin(capitalCoords(country), mainCapital(country));
  view.focus([country.iso2]);
  return view.element;
}

export function capitalSolution(question: Question): HTMLElement {
  return el('div', { className: 'solution-grid' }, [capitalCard(question.target)]);
}

export function renderCapitalQuestion(question: CapitalQuestion, submit: Submit, scope?: MapScope): HTMLElement {
  switch (question.format) {
    case 'capitalOnMap':
      if (!scope) throw new Error('The capitalOnMap question needs a map scope');
      return renderNameChoices('Em que país fica esta capital?', pinnedCapital(scope, question.target), question.options, submit, flagAndName);
    case 'countryToCapitals':
      return renderNameChoices('Qual é a capital deste país?', countryFigure(question.target), question.options, submit, mainCapital);
    case 'typeCapital':
      return renderTypeName('Escreva a capital deste país', countryFigure(question.target), submit, 'Capital');
    case 'typeCapitalCountry':
      return renderTypeName('De que país é esta capital?', capitalFigure(question.target), submit, 'País');
  }
}
