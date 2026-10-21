import { describe, expect, it } from 'vitest';
import { awardMapMedal, loadMapMedals, loadMapQuizRecords, saveMapQuizOutcome } from './mapRecords';
import { hasMedal } from './progress';
import { quizRecord, type RecordStore } from './quizRecords';

function memoryStore(): RecordStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const outcome = (score: number, timeMs: number, finished = true, errors = 0) => ({ score, timeMs, finished, errors });

describe('map quiz records', () => {
  it('starts empty', () => {
    expect(quizRecord(loadMapQuizRecords(memoryStore()), 'africa', 'easy')).toEqual({});
  });

  it('keeps map records apart from flag records', () => {
    const store = memoryStore();
    saveMapQuizOutcome(store, 'africa', 'easy', outcome(40, 61500));
    expect(loadMapQuizRecords(store)).toEqual({ africa: { easy: { bestScore: 40, bestTimeMs: 61000, completed: true } } });
    expect(store.getItem('flags-quiz:quiz-records-v2')).toBeNull();
  });

  it('applies the same record rules as the flag quiz', () => {
    const store = memoryStore();
    saveMapQuizOutcome(store, 'africa', 'easy', outcome(10, 90000, true, 8));
    expect(saveMapQuizOutcome(store, 'africa', 'easy', outcome(10, 80000, true, 8))).toEqual({ score: false, time: false });
    expect(saveMapQuizOutcome(store, 'africa', 'easy', outcome(12, 80000, true, 0))).toEqual({ score: true, time: true });
  });

  it('keeps continents and levels separate', () => {
    const store = memoryStore();
    saveMapQuizOutcome(store, 'africa', 'easy', outcome(40, 61000));
    const records = loadMapQuizRecords(store);
    expect(quizRecord(records, 'europe', 'easy')).toEqual({});
    expect(quizRecord(records, 'africa', 'medium')).toEqual({});
  });

  it('reads a record saved before the levels existed as no record', () => {
    const store = memoryStore();
    store.setItem('flags-quiz:map-quiz-records', JSON.stringify({ africa: { bestScore: 40, bestTimeMs: 61000, completed: true } }));
    const records = loadMapQuizRecords(store);
    for (const difficulty of ['easy', 'medium', 'hard', 'general'] as const) expect(quizRecord(records, 'africa', difficulty)).toEqual({});
    expect(saveMapQuizOutcome(store, 'africa', 'easy', outcome(5, 9000))).toEqual({ score: true, time: true });
  });
});

describe('map medals', () => {
  it('starts with no medals', () => {
    expect(hasMedal(loadMapMedals(memoryStore()), 'europe', 'easy')).toBe(false);
  });

  it('awards a map medal per level under its own key', () => {
    const store = memoryStore();
    awardMapMedal(store, 'europe', 'easy');
    const medals = loadMapMedals(store);
    expect(hasMedal(medals, 'europe', 'easy')).toBe(true);
    expect(hasMedal(medals, 'europe', 'medium')).toBe(false);
    expect(hasMedal(medals, 'africa', 'easy')).toBe(false);
    expect(store.getItem('flags-quiz:medals')).toBeNull();
  });

  it('reads a medal saved before the levels existed as no medal and still awards new ones', () => {
    const store = memoryStore();
    store.setItem('flags-quiz:map-medals', JSON.stringify({ europe: true }));
    expect(hasMedal(loadMapMedals(store), 'europe', 'general')).toBe(false);
    awardMapMedal(store, 'europe', 'general');
    expect(hasMedal(loadMapMedals(store), 'europe', 'general')).toBe(true);
  });
});
