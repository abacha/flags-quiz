import { describe, expect, it } from 'vitest';
import { loadContinent, saveContinent, type ContinentStore } from './continentChoice';

function memoryStore(): ContinentStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('continent choice', () => {
  it('opens on Mundo on the first visit', () => {
    expect(loadContinent(memoryStore())).toBe('world');
  });

  it('remembers the last continent under its own key', () => {
    const store = memoryStore();
    saveContinent(store, 'oceania');
    expect(loadContinent(store)).toBe('oceania');
    expect(store.data.get('flags-quiz:continent')).toBe('oceania');
  });
});
