import { countries } from '../../data/countries';
import { goalFor, poolFor } from '../../engine/pool';
import { onBack } from '../backButton';
import { celebrateResult, learnCheer } from '../celebrate';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { solutionCard } from '../questions/feedback';
import { flagLadder, learnResultTitle, resultActions, statBlocks } from '../results';

export function renderResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'result' }>): void {
  const { continent, difficulty, won, medal, correct, missed } = screen;
  const goal = goalFor(difficulty, poolFor(countries, continent, difficulty).length);
  const review = missed.length
    ? [el('h2', {}, ['Bandeiras para revisar']), el('div', { className: 'solution-grid' }, missed.map((c) => solutionCard(c)))]
    : [];
  onBack(() => navigate({ name: 'hub', continent: screen.continent }));
  const title = el('h1', {}, [learnResultTitle(won, medal, correct, goal)]);
  root.append(
    el('main', { className: 'screen result' }, [
      title,
      el('p', { className: 'detail' }, [`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      statBlocks([[`${correct}/${goal}`, 'acertos']]),
      resultActions(navigate, continent, flagLadder('game', continent, difficulty)),
      ...review,
    ]),
  );
  celebrateResult(title, learnCheer(won, medal));
}
