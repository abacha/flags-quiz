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
