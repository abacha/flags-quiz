import type { Country } from '../../data/countries';
import type { Grade } from '../../engine/answer';
import type { Question } from '../../engine/question';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_FROM } from '../labels';

export function solutionCard(country: Country, caption = country.name): HTMLElement {
  return el('figure', { className: 'solution-card' }, [flagImg(country), el('figcaption', {}, [caption])]);
}

function solution(question: Question): HTMLElement {
  switch (question.format) {
    case 'matchPairs':
    case 'sortSimilar':
    case 'typeSimilar':
      return el('div', { className: 'solution-grid' }, question.countries.map((c) => solutionCard(c)));
    case 'oddOneOut':
      return el('div', { className: 'solution-grid' }, [
        solutionCard(question.intruder, `${question.intruder.name} não é ${CONTINENT_FROM[question.target.continent]}`),
      ]);
    default:
      return el('div', { className: 'solution-grid' }, [solutionCard(question.target)]);
  }
}

export function renderFeedback(question: Question, result: Grade, onContinue: () => void): HTMLElement {
  return el('section', { className: `feedback ${result.correct ? 'right' : 'wrong'}` }, [
    el('p', { className: 'verdict' }, [result.correct ? 'Certo!' : 'Errado']),
    ...(result.correct ? [] : [solution(question)]),
    el('button', { className: 'primary', onclick: onContinue }, ['Continuar']),
  ]);
}
