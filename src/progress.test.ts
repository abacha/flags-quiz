import { describe, expect, it } from 'vitest';
import { awardMedal, loadMedals, medalOf, type MedalStore } from './progress';

function memoryStore(): MedalStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('medals', () => {
  it('starts with no medals', () => {
    expect(medalOf(loadMedals(memoryStore()), 'africa', 'easy')).toBeUndefined();
  });

  it('keeps an awarded medal across loads', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'easy', 'silver');
    expect(medalOf(loadMedals(store), 'africa', 'easy')).toBe('silver');
    expect(medalOf(loadMedals(store), 'africa', 'medium')).toBeUndefined();
  });

  it('keeps the best medal of a level', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'easy', 'silver');
    awardMedal(store, 'africa', 'easy', 'bronze');
    expect(medalOf(loadMedals(store), 'africa', 'easy')).toBe('silver');
    awardMedal(store, 'africa', 'easy', 'gold');
    expect(medalOf(loadMedals(store), 'africa', 'easy')).toBe('gold');
  });

  it('keeps earlier medals when awarding another difficulty', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'easy', 'gold');
    awardMedal(store, 'africa', 'hard', 'bronze');
    expect(loadMedals(store)).toEqual({ africa: { easy: 'gold', hard: 'bronze' } });
  });

  it('stores everything under one key', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'medium', 'gold');
    expect([...store.data.keys()]).toEqual(['flags-quiz:medals']);
  });

  it('reads a medal saved before the tiers existed as bronze', () => {
    const store = memoryStore();
    store.data.set('flags-quiz:medals', '{"africa":{"easy":true}}');
    expect(medalOf(loadMedals(store), 'africa', 'easy')).toBe('bronze');
    awardMedal(store, 'world', 'general', 'gold');
    expect(loadMedals(store)).toEqual({ africa: { easy: 'bronze' }, world: { general: 'gold' } });
  });
});
