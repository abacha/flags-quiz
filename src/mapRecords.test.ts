import { describe, expect, it } from 'vitest';
import { awardMapMedal, hasMapMedal, loadMapMedals, loadMapQuizRecords, mapQuizRecord, saveMapQuizOutcome } from './mapRecords';
import type { RecordStore } from './quizRecords';

function memoryStore(): RecordStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const outcome = (score: number, timeMs: number, finished = true, errors = 0) => ({ score, timeMs, finished, errors });

describe('map quiz records', () => {
  it('starts empty', () => {
    expect(mapQuizRecord(loadMapQuizRecords(memoryStore()), 'africa')).toEqual({});
  });

  it('keeps map records apart from flag records', () => {
    const store = memoryStore();
    saveMapQuizOutcome(store, 'africa', outcome(40, 61500));
    expect(loadMapQuizRecords(store)).toEqual({ africa: { bestScore: 40, bestTimeMs: 61000, completed: true } });
    expect(store.getItem('flags-quiz:quiz-records-v2')).toBeNull();
  });

  it('applies the same record rules as the flag quiz', () => {
    const store = memoryStore();
    saveMapQuizOutcome(store, 'africa', outcome(10, 90000, true, 8));
    expect(saveMapQuizOutcome(store, 'africa', outcome(10, 80000, true, 8))).toEqual({ score: false, time: false });
    expect(saveMapQuizOutcome(store, 'africa', outcome(12, 80000, true, 0))).toEqual({ score: true, time: true });
  });

  it('keeps continents separate', () => {
    const store = memoryStore();
    saveMapQuizOutcome(store, 'africa', outcome(40, 61000));
    expect(mapQuizRecord(loadMapQuizRecords(store), 'europe')).toEqual({});
  });
});

describe('map medals', () => {
  it('starts with no medals', () => {
    expect(hasMapMedal(loadMapMedals(memoryStore()), 'europe')).toBe(false);
  });

  it('awards a map medal under its own key', () => {
    const store = memoryStore();
    awardMapMedal(store, 'europe');
    expect(hasMapMedal(loadMapMedals(store), 'europe')).toBe(true);
    expect(hasMapMedal(loadMapMedals(store), 'africa')).toBe(false);
    expect(store.getItem('flags-quiz:medals')).toBeNull();
  });
});
