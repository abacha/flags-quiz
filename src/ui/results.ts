import type { Country } from '../data/countries';
import type { ContinentKey, Difficulty } from '../engine/pool';
import type { Medal } from '../engine/round';
import { el } from './dom';
import { DIFFICULTIES, DIFFICULTY_LABEL } from './labels';
import { renderMap } from './map/map';
import type { Navigate } from './navigation';

const MEDAL_TITLE: Record<Medal, string> = {
  gold: '🥇 Medalha de ouro!',
  silver: '🥈 Medalha de prata!',
  bronze: '🥉 Medalha de bronze!',
};

export function learnResultTitle(won: boolean, medal: Medal | null, correct: number, goal: number): string {
  if (!won) return `Você fez ${correct} de ${goal}`;
  return medal ? MEDAL_TITLE[medal] : '✓ Meta concluída sem medalha';
}

export function statBlocks(stats: [value: string, label: string][]): HTMLElement {
  return el(
    'div',
    { className: 'stats' },
    stats.map(([value, label]) => el('div', { className: 'card stat' }, [el('b', {}, [value]), el('span', {}, [label])])),
  );
}

export function resultActions(navigate: Navigate, mode: 'game' | 'quiz' | 'mapGame' | 'mapQuiz', continent: ContinentKey, difficulty: Difficulty): HTMLElement {
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

export function mapReview(continent: ContinentKey, countries: Country[]): HTMLElement[] {
  const view = renderMap(continent);
  for (const country of countries) view.paint(country.iso2, 'missed');
  return [view.element, el('ul', { className: 'map-names' }, countries.map((c) => el('li', { className: 'tag' }, [c.name])))];
}
