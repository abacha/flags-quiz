import { describe, expect, it } from 'vitest';
import { MAP_ALL } from './data/maps';
import { awardMapMedal, loadMapMedals, loadMapQuizRecords, saveMapQuizOutcome } from './mapRecords';
import { medalOf } from './progress';
import { quizRecord, type RecordStore } from './quizRecords';

function memoryStore(): RecordStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const outcome = (score: number, timeMs: number, finished = true, errors = 0) => ({ score, timeMs, finished, errors });

describe('map quiz records', () => {
  it('starts empty', () => {
    expect(quizRecord(loadMapQuizRecords(memoryStore()), 'africa', 'west-coast')).toEqual({});
  });

  it('keeps map records apart from flag records', () => {
    const store = memoryStore();
    saveMapQuizOutcome(store, 'africa', 'west-coast', outcome(40, 61500));
    expect(loadMapQuizRecords(store)).toEqual({ africa: { 'west-coast': { bestScore: 40, bestTimeMs: 61000, completed: true } } });
    expect(store.getItem('flags-quiz:quiz-records-v2')).toBeNull();
  });

  it('applies the same record rules as the flag quiz', () => {
    const store = memoryStore();
    saveMapQuizOutcome(store, 'africa', 'west-coast', outcome(10, 90000, true, 8));
    expect(saveMapQuizOutcome(store, 'africa', 'west-coast', outcome(10, 80000, true, 8))).toEqual({ score: false, time: false });
    expect(saveMapQuizOutcome(store, 'africa', 'west-coast', outcome(12, 80000, true, 0))).toEqual({ score: true, time: true });
  });

  it('keeps continents and levels separate', () => {
    const store = memoryStore();
    saveMapQuizOutcome(store, 'africa', 'west-coast', outcome(40, 61000));
    const records = loadMapQuizRecords(store);
    expect(quizRecord(records, 'europe', 'west-coast')).toEqual({});
    expect(quizRecord(records, 'africa', MAP_ALL)).toEqual({});
  });

  it('ignores the records saved per difficulty before the regions existed', () => {
    const store = memoryStore();
    const old = JSON.stringify({ africa: { general: { bestScore: 40, bestTimeMs: 61000, completed: true } } });
    store.setItem('flags-quiz:map-quiz-records', old);
    expect(quizRecord(loadMapQuizRecords(store), 'africa', MAP_ALL)).toEqual({});
    expect(saveMapQuizOutcome(store, 'africa', MAP_ALL, outcome(5, 9000))).toEqual({ score: true, time: true });
    expect(store.getItem('flags-quiz:map-quiz-records')).toBe(old);
  });
});

describe('map medals', () => {
  it('starts with no medals', () => {
    expect(medalOf(loadMapMedals(memoryStore()), 'europe', 'balkans')).toBeUndefined();
  });

  it('awards a map medal per level under its own key', () => {
    const store = memoryStore();
    awardMapMedal(store, 'europe', 'balkans', 'silver');
    awardMapMedal(store, 'europe', 'balkans', 'bronze');
    const medals = loadMapMedals(store);
    expect(medalOf(medals, 'europe', 'balkans')).toBe('silver');
    expect(medalOf(medals, 'europe', MAP_ALL)).toBeUndefined();
    expect(medalOf(medals, 'africa', 'balkans')).toBeUndefined();
    expect(store.getItem('flags-quiz:medals')).toBeNull();
  });

  it('ignores the medals saved per difficulty before the regions existed', () => {
    const store = memoryStore();
    const old = JSON.stringify({ europe: { general: 'gold' } });
    store.setItem('flags-quiz:map-medals', old);
    expect(medalOf(loadMapMedals(store), 'europe', MAP_ALL)).toBeUndefined();
    awardMapMedal(store, 'europe', MAP_ALL, 'bronze');
    expect(medalOf(loadMapMedals(store), 'europe', MAP_ALL)).toBe('bronze');
    expect(store.getItem('flags-quiz:map-medals')).toBe(old);
  });
});
