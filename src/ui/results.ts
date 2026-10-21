import type { ContinentKey, Difficulty } from '../engine/pool';
import { el } from './dom';
import { DIFFICULTIES, DIFFICULTY_LABEL } from './labels';
import type { Navigate } from './navigation';

export function statBlocks(stats: [value: string, label: string][]): HTMLElement {
  return el(
    'div',
    { className: 'stats' },
    stats.map(([value, label]) => el('div', { className: 'card stat' }, [el('b', {}, [value]), el('span', {}, [label])])),
  );
}

export function resultActions(navigate: Navigate, mode: 'game' | 'quiz', continent: ContinentKey, difficulty: Difficulty): HTMLElement {
  const next: Difficulty | undefined = DIFFICULTIES[DIFFICULTIES.indexOf(difficulty) + 1];
  return el('div', { className: 'result-actions' }, [
    ...(next
      ? [
          el('button', { className: 'primary', type: 'button', onclick: () => navigate({ name: mode, continent, difficulty: next }) }, [
            `Próximo nível: ${DIFFICULTY_LABEL[next]} →`,
          ]),
        ]
      : []),
    el('button', { className: next ? 'outline' : 'primary', type: 'button', onclick: () => navigate({ name: mode, continent, difficulty }) }, [
      'Jogar de novo',
    ]),
    el('button', { className: 'link', type: 'button', onclick: () => navigate({ name: 'hub', continent }) }, ['Voltar ao início']),
  ]);
}

export function mapResultActions(navigate: Navigate, mode: 'mapGame' | 'mapQuiz', continent: ContinentKey): HTMLElement {
  return el('div', { className: 'result-actions' }, [
    el('button', { className: 'primary', type: 'button', onclick: () => navigate({ name: mode, continent }) }, ['Jogar de novo']),
    el('button', { className: 'link', type: 'button', onclick: () => navigate({ name: 'hub', continent }) }, ['Voltar ao início']),
  ]);
}
