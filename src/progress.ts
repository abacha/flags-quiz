import type { Continent } from './data/countries';
import type { Difficulty } from './engine/pool';

export type MedalStore = Pick<Storage, 'getItem' | 'setItem'>;
export type Medals = Partial<Record<Continent, Partial<Record<Difficulty, true>>>>;

const STORAGE_KEY = 'flags-quiz:medals';

export function loadMedals(store: MedalStore): Medals {
  const raw = store.getItem(STORAGE_KEY);
  return raw === null ? {} : (JSON.parse(raw) as Medals);
}

export function awardMedal(store: MedalStore, continent: Continent, difficulty: Difficulty): void {
  const medals = loadMedals(store);
  medals[continent] = { ...medals[continent], [difficulty]: true };
  store.setItem(STORAGE_KEY, JSON.stringify(medals));
}

export function hasMedal(medals: Medals, continent: Continent, difficulty: Difficulty): boolean {
  return medals[continent]?.[difficulty] === true;
}
