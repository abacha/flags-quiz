import type { ContinentKey } from './engine/pool';

export type ContinentStore = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'flags-quiz:continent';

export function loadContinent(store: ContinentStore): ContinentKey {
  return (store.getItem(STORAGE_KEY) as ContinentKey | null) ?? 'world';
}

export function saveContinent(store: ContinentStore, continent: ContinentKey): void {
  store.setItem(STORAGE_KEY, continent);
}
