import { countries } from '../../data/countries';
import { goalFor, poolFor } from '../../engine/pool';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { solutionCard } from '../questions/feedback';

export function renderResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'result' }>): void {
  const { continent, difficulty, won, correct, missed } = screen;
  const review = missed.length
    ? [el('h2', {}, ['Bandeiras para revisar']), el('div', { className: 'solution-grid' }, missed.map((c) => solutionCard(c)))]
    : [];
  root.append(
    el('main', { className: 'screen' }, [
      el('h1', {}, [won ? '🏅 Medalha conquistada!' : `Você fez ${correct} de ${goalFor(difficulty, poolFor(countries, continent, difficulty).length)}`]),
      el('p', { className: 'detail' }, [`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      ...review,
      el('button', { className: 'primary', onclick: () => navigate({ name: 'game', continent, difficulty }) }, ['Jogar de novo']),
      el('button', { className: 'link', onclick: () => navigate({ name: 'continent', continent }) }, ['Voltar']),
    ]),
  );
}
