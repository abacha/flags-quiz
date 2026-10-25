import type { Country } from '../data/countries';
import { mapLevelLabel, mapLevels, type MapLevel, type MapScope } from '../data/maps';
import type { ContinentKey, Difficulty } from '../engine/pool';
import type { Medal } from '../engine/round';
import { el } from './dom';
import { DIFFICULTIES, DIFFICULTY_LABEL } from './labels';
import { renderMap } from './map/map';
import type { Navigate, Screen } from './navigation';

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

export interface LevelLadder<L extends string> {
  levels: readonly L[];
  current: L;
  label: (level: L) => string;
  play: (level: L) => Screen;
}

export function flagLadder(mode: 'game' | 'quiz', continent: ContinentKey, difficulty: Difficulty): LevelLadder<Difficulty> {
  return { levels: DIFFICULTIES, current: difficulty, label: (d) => DIFFICULTY_LABEL[d], play: (d) => ({ name: mode, continent, difficulty: d }) };
}

export function mapLadder(mode: 'mapGame' | 'mapQuiz', continent: ContinentKey, level: MapLevel): LevelLadder<MapLevel> {
  return {
    levels: mapLevels(continent),
    current: level,
    label: (l) => mapLevelLabel(continent, l),
    play: (l) => ({ name: mode, continent, level: l }),
  };
}

export function resultActions<L extends string>(navigate: Navigate, continent: ContinentKey, { levels, current, label, play }: LevelLadder<L>): HTMLElement {
  const next: L | undefined = levels[levels.indexOf(current) + 1];
  return el('div', { className: 'result-actions' }, [
    ...(next
      ? [el('button', { className: 'primary', type: 'button', onclick: () => navigate(play(next)) }, [`Próximo nível: ${label(next)} →`])]
      : []),
    el('button', { className: next ? 'outline' : 'primary', type: 'button', onclick: () => navigate(play(current)) }, ['Jogar de novo']),
    el('button', { className: 'link', type: 'button', onclick: () => navigate({ name: 'hub', continent }) }, ['Voltar ao início']),
  ]);
}

export function mapReview(scope: MapScope, countries: Country[]): HTMLElement[] {
  const view = renderMap(scope);
  for (const country of countries) view.paint(country.iso2, 'missed');
  return [view.element, el('ul', { className: 'map-names' }, countries.map((c) => el('li', { className: 'tag' }, [c.name])))];
}
