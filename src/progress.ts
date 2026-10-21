import type { ContinentKey, Difficulty } from './engine/pool';
import type { Medal } from './engine/round';

export type MedalStore = Pick<Storage, 'getItem' | 'setItem'>;
export type Medals = Partial<Record<ContinentKey, Partial<Record<Difficulty, Medal>>>>;

const STORAGE_KEY = 'flags-quiz:medals';
const MEDAL_RANK: readonly Medal[] = ['bronze', 'silver', 'gold'];

export function readMedals(store: MedalStore, key: string): Medals {
  const raw = store.getItem(key);
  if (raw === null) return {};
  const medals = JSON.parse(raw) as Record<string, unknown>;
  for (const levels of Object.values(medals)) {
    if (typeof levels !== 'object' || levels === null) continue;
    for (const [difficulty, medal] of Object.entries(levels)) if (medal === true) (levels as Record<string, Medal>)[difficulty] = 'bronze';
  }
  return medals as Medals;
}

export function writeMedal(store: MedalStore, key: string, continent: ContinentKey, difficulty: Difficulty, medal: Medal): void {
  const medals = readMedals(store, key);
  const held = medalOf(medals, continent, difficulty);
  if (held && MEDAL_RANK.indexOf(held) >= MEDAL_RANK.indexOf(medal)) return;
  medals[continent] = { ...medals[continent], [difficulty]: medal };
  store.setItem(key, JSON.stringify(medals));
}

export function loadMedals(store: MedalStore): Medals {
  return readMedals(store, STORAGE_KEY);
}

export function awardMedal(store: MedalStore, continent: ContinentKey, difficulty: Difficulty, medal: Medal): void {
  writeMedal(store, STORAGE_KEY, continent, difficulty, medal);
}

export function medalOf(medals: Medals, continent: ContinentKey, difficulty: Difficulty): Medal | undefined {
  return medals[continent]?.[difficulty];
}
