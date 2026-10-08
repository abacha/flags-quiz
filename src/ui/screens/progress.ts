import { isCompleted, loadQuizRecords, quizRecord } from '../../quizRecords';
import { el } from '../dom';
import { CONTINENT_KEYS, CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { formatTime } from '../time';

export function renderProgress(root: HTMLElement, navigate: Navigate): void {
  const records = loadQuizRecords(localStorage);
  const continents = CONTINENT_KEYS.map((continent) => ({
    continent,
    levels: DIFFICULTIES.map((difficulty) => ({ difficulty, record: quizRecord(records, continent, difficulty) })),
  }));
  const completed = continents.flatMap(({ levels }) => levels).filter(({ record }) => isCompleted(record)).length;
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, ['Progresso']),
      el('p', { className: 'progress-total' }, [`${completed}/${CONTINENT_KEYS.length * DIFFICULTIES.length} quizzes concluídos`]),
      ...continents.map(({ continent, levels }) => {
        const done = levels.filter(({ record }) => isCompleted(record)).length;
        const fill = el('div', { className: 'progress-fill' });
        fill.style.width = `${(done / levels.length) * 100}%`;
        return el('section', { className: 'level progress-continent' }, [
          el('div', { className: 'progress-head' }, [
            el('h2', {}, [CONTINENT_LABEL[continent]]),
            el('span', { className: 'progress-count' }, [`${done}/${levels.length}`]),
          ]),
          el('div', { className: 'progress-bar' }, [fill]),
          el(
            'ul',
            { className: 'progress-levels' },
            levels.map(({ difficulty, record }) =>
              el('li', {}, [
                el('span', {}, [DIFFICULTY_LABEL[difficulty]]),
                el('span', { className: 'detail' }, [levelStatus(record.bestTimeMs, isCompleted(record))]),
              ]),
            ),
          ),
        ]);
      }),
      el('button', { className: 'link', onclick: () => navigate({ name: 'home' }) }, ['Voltar']),
    ]),
  );
}

function levelStatus(bestTimeMs: number | undefined, completed: boolean): string {
  if (!completed) return '—';
  return bestTimeMs === undefined ? '✓' : `✓ ${formatTime(bestTimeMs)}`;
}
