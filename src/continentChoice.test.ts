import { describe, expect, it } from 'vitest';
import { loadArea, loadContinent, saveArea, saveContinent, type ContinentStore } from './continentChoice';

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

  it('falls back to Mundo when the stored continent is not one of the known keys', () => {
    const store = memoryStore();
    store.data.set('flags-quiz:continent', 'atlantis');
    expect(loadContinent(store)).toBe('world');
  });

  it('opens on the flags area on the first visit', () => {
    expect(loadArea(memoryStore())).toBe('flags');
  });

  it('remembers the area under its own key', () => {
    const store = memoryStore();
    saveArea(store, 'maps');
    expect(loadArea(store)).toBe('maps');
    expect(store.data.get('flags-quiz:area')).toBe('maps');
  });

  it('falls back to flags when the stored area is unknown', () => {
    const store = memoryStore();
    store.data.set('flags-quiz:area', 'atlantis');
    expect(loadArea(store)).toBe('flags');
  });

  it('remembers the capitals area', () => {
    const store = memoryStore();
    saveArea(store, 'capitals');
    expect(loadArea(store)).toBe('capitals');
  });
});
