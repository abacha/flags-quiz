import { countries, type Continent } from '../../data/countries';
import { goalFor, poolFor, type Difficulty } from '../../engine/pool';
import { hasMedal, loadMedals } from '../../progress';
import { loadQuizRecords, quizRecord } from '../../quizRecords';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import type { Mode, Navigate } from '../navigation';
import { formatTime } from '../time';

function learnDetail(continent: Continent, difficulty: Difficulty): string {
  const medal = hasMedal(loadMedals(localStorage), continent, difficulty) ? ' · 🏅' : '';
  const pool = poolFor(countries, continent, difficulty);
  return `${pool.length} países · ${goalFor(difficulty, pool.length)} acertos${medal}`;
}

function quizDetail(continent: Continent, difficulty: Difficulty): string {
  const { bestScore, bestTimeMs } = quizRecord(loadQuizRecords(localStorage), continent, difficulty);
  const parts = [`${poolFor(countries, continent, difficulty).length} países`];
  if (bestScore !== undefined) parts.push(`recorde ${bestScore} pts`);
  if (bestTimeMs !== undefined) parts.push(formatTime(bestTimeMs));
  return parts.join(' · ');
}

export function renderDifficulty(root: HTMLElement, navigate: Navigate, mode: Mode, continent: Continent): void {
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, [CONTINENT_LABEL[continent]]),
      el('p', { className: 'detail' }, [mode === 'quiz' ? 'Quiz' : 'Learn']),
      ...DIFFICULTIES.map((difficulty) =>
        el(
          'button',
          {
            className: 'big',
            onclick: () => navigate({ name: mode === 'quiz' ? 'quiz' : 'game', continent, difficulty }),
          },
          [
            el('span', {}, [DIFFICULTY_LABEL[difficulty]]),
            el('span', { className: 'detail' }, [mode === 'quiz' ? quizDetail(continent, difficulty) : learnDetail(continent, difficulty)]),
          ],
        ),
      ),
      el('button', { className: 'link', onclick: () => navigate({ name: 'continent', mode }) }, ['Voltar']),
    ]),
  );
}
