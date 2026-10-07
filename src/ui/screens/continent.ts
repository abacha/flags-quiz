import type { ContinentKey } from '../../engine/pool';
import { loadMedals } from '../../progress';
import { loadQuizRecords } from '../../quizRecords';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import { levelSummary } from '../levelSummary';
import type { Navigate } from '../navigation';

export function renderContinent(root: HTMLElement, navigate: Navigate, continent: ContinentKey): void {
  const medals = loadMedals(localStorage);
  const records = loadQuizRecords(localStorage);
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, [CONTINENT_LABEL[continent]]),
      ...DIFFICULTIES.map((difficulty) => {
        const summary = levelSummary(continent, difficulty, medals, records);
        return el('section', { className: 'level' }, [
          el('h2', {}, [DIFFICULTY_LABEL[difficulty]]),
          el('p', { className: 'detail' }, [summary.flags]),
          el('p', { className: 'detail' }, [summary.learn]),
          el('p', { className: 'detail' }, [summary.quiz]),
          el('div', { className: 'level-actions' }, [
            el('button', { className: 'primary', onclick: () => navigate({ name: 'game', continent, difficulty }) }, ['Aprender']),
            el('button', { className: 'primary', onclick: () => navigate({ name: 'quiz', continent, difficulty }) }, ['Quiz']),
          ]),
        ]);
      }),
      el('button', { className: 'link', onclick: () => navigate({ name: 'home' }) }, ['Voltar']),
    ]),
  );
}
