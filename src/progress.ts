import type { ContinentKey, Difficulty } from './engine/pool';
import type { Medal } from './engine/round';

export type MedalStore = Pick<Storage, 'getItem' | 'setItem'>;
export type Medals<L extends string = Difficulty> = Partial<Record<ContinentKey, Partial<Record<L, Medal>>>>;

const STORAGE_KEY = 'flags-quiz:medals';
const MEDAL_RANK: readonly Medal[] = ['bronze', 'silver', 'gold'];

export function readMedals<L extends string>(store: MedalStore, key: string): Medals<L> {
  const raw = store.getItem(key);
  if (raw === null) return {};
  const medals = JSON.parse(raw) as Record<string, unknown>;
  for (const levels of Object.values(medals)) {
    if (typeof levels !== 'object' || levels === null) continue;
    for (const [difficulty, medal] of Object.entries(levels)) if (medal === true) (levels as Record<string, Medal>)[difficulty] = 'bronze';
  }
  return medals as Medals<L>;
}

export function writeMedal<L extends string>(store: MedalStore, key: string, continent: ContinentKey, level: L, medal: Medal): void {
  const medals = readMedals<L>(store, key);
  const held = medalOf(medals, continent, level);
  if (held && MEDAL_RANK.indexOf(held) >= MEDAL_RANK.indexOf(medal)) return;
  medals[continent] = { ...medals[continent], [level]: medal };
  store.setItem(key, JSON.stringify(medals));
}

export function loadMedals(store: MedalStore): Medals {
  return readMedals(store, STORAGE_KEY);
}

export function awardMedal(store: MedalStore, continent: ContinentKey, difficulty: Difficulty, medal: Medal): void {
  writeMedal(store, STORAGE_KEY, continent, difficulty, medal);
}

export function medalOf<L extends string>(medals: Medals<L>, continent: ContinentKey, level: L): Medal | undefined {
  return medals[continent]?.[level];
}
