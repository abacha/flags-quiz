import { capitalPool } from '../../data/capitals';
import type { Difficulty } from '../../engine/pool';
import { onBack } from '../backButton';
import { celebrateResult, learnCheer } from '../celebrate';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { capitalCard } from '../questions/capitalQuestions';
import { flagLadder, learnResultTitle, resultActions, statBlocks } from '../results';

const LEARN_DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export function renderCapitalResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'capitalResult' }>): void {
  const { continent, difficulty, won, medal, done, correct, answered, missed } = screen;
  const size = capitalPool(continent, difficulty).length;
  const review = missed.length
    ? [el('h2', {}, ['Capitais para revisar']), el('div', { className: 'solution-grid' }, missed.map(capitalCard))]
    : [];
  onBack(() => navigate({ name: 'hub', continent: screen.continent }));
  const title = el('h1', {}, [learnResultTitle(won, medal, done, size)]);
  root.append(
    el('main', { className: 'screen result' }, [
      title,
      el('p', { className: 'detail' }, [`Capitais · ${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      statBlocks([[`${correct}/${answered}`, 'acertos']]),
      resultActions(navigate, continent, { ...flagLadder('capitalGame', continent, difficulty), levels: LEARN_DIFFICULTIES }),
      ...review,
    ]),
  );
  celebrateResult(title, learnCheer(won, medal));
}
