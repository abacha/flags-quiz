import { capitalLabel, mainCapital } from '../../data/capitals';
import type { Country } from '../../data/countries';
import type { Question } from '../../engine/question';
import { el } from '../dom';
import { flagImg } from '../flag';
import { renderNameChoices } from './choices';
import { solutionCard } from './feedback';
import { renderPairs } from './pairs';
import type { Submit } from './render';
import { renderYesNo } from './trueFalse';
import { renderTypeName } from './typeName';

export type CapitalQuestion = Extract<
  Question,
  { format: 'countryToCapitals' | 'capitalToCountries' | 'capitalPairs' | 'capitalTrueFalse' | 'typeCapital' | 'typeCapitalCountry' }
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
  return solutionCard(country, `${country.name} · ${capitalLabel(country)}`);
}

export function capitalSolution(question: Question): HTMLElement {
  if (question.format === 'capitalPairs') return el('div', { className: 'solution-grid' }, question.countries.map(capitalCard));
  return el('div', { className: 'solution-grid' }, [capitalCard(question.target)]);
}

export function renderCapitalQuestion(question: CapitalQuestion, submit: Submit): HTMLElement {
  switch (question.format) {
    case 'countryToCapitals':
      return renderNameChoices('Qual é a capital deste país?', countryFigure(question.target), question.options, submit, mainCapital);
    case 'capitalToCountries':
      return renderNameChoices('De que país é esta capital?', capitalFigure(question.target), question.options, submit, flagAndName);
    case 'capitalPairs':
      return renderPairs('Ligue cada país à sua capital', question.countries, submit, { face: countryFigure, label: mainCapital });
    case 'capitalTrueFalse':
      return renderYesNo(`A capital de ${question.target.name} é ${mainCapital(question.shown)}?`, countryFigure(question.target), submit);
    case 'typeCapital':
      return renderTypeName('Escreva a capital deste país', countryFigure(question.target), submit, 'Capital');
    case 'typeCapitalCountry':
      return renderTypeName('De que país é esta capital?', capitalFigure(question.target), submit, 'País');
  }
}
