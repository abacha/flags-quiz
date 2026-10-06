import { describe, expect, it } from 'vitest';
import { awardMedal, hasMedal, loadMedals, type MedalStore } from './progress';

function memoryStore(): MedalStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('medals', () => {
  it('starts with no medals', () => {
    expect(hasMedal(loadMedals(memoryStore()), 'africa', 'easy')).toBe(false);
  });

  it('keeps an awarded medal across loads', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'easy');
    expect(hasMedal(loadMedals(store), 'africa', 'easy')).toBe(true);
    expect(hasMedal(loadMedals(store), 'africa', 'medium')).toBe(false);
  });

  it('keeps earlier medals when awarding another difficulty', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'easy');
    awardMedal(store, 'africa', 'hard');
    expect(loadMedals(store)).toEqual({ africa: { easy: true, hard: true } });
  });

  it('stores everything under one key', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'medium');
    expect([...store.data.keys()]).toEqual(['flags-quiz:medals']);
  });
});
