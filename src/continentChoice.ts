import { CONTINENT_KEYS } from './ui/labels';
import type { ContinentKey } from './engine/pool';

export type ContinentStore = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'flags-quiz:continent';

export function loadContinent(store: ContinentStore): ContinentKey {
  const stored = store.getItem(STORAGE_KEY);
  return (CONTINENT_KEYS as readonly string[]).includes(stored ?? '') ? (stored as ContinentKey) : 'world';
}

export function saveContinent(store: ContinentStore, continent: ContinentKey): void {
  store.setItem(STORAGE_KEY, continent);
}

export type Area = 'flags' | 'maps' | 'capitals';

const AREAS: readonly Area[] = ['flags', 'maps', 'capitals'];

const AREA_STORAGE_KEY = 'flags-quiz:area';

export function loadArea(store: ContinentStore): Area {
  const stored = store.getItem(AREA_STORAGE_KEY);
  return AREAS.find((area) => area === stored) ?? 'flags';
}

export function saveArea(store: ContinentStore, area: Area): void {
  store.setItem(AREA_STORAGE_KEY, area);
}
