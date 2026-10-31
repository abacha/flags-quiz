import { describe, expect, it } from 'vitest';
import { awardCapitalMedal, loadCapitalMedals, loadCapitalQuizRecords, saveCapitalQuizOutcome } from './capitalRecords';
import { medalOf } from './progress';
import { quizRecord, type RecordStore } from './quizRecords';

function memoryStore(): RecordStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const outcome = (score: number, timeMs: number, finished = true, errors = 0) => ({ score, timeMs, finished, errors });

describe('capital quiz records', () => {
  it('starts empty', () => {
    expect(quizRecord(loadCapitalQuizRecords(memoryStore()), 'africa', 'easy')).toEqual({});
  });

  it('keeps capital records apart from flag and map records', () => {
    const store = memoryStore();
    saveCapitalQuizOutcome(store, 'africa', 'easy', outcome(40, 61500));
    expect(loadCapitalQuizRecords(store)).toEqual({ africa: { easy: { bestScore: 40, bestTimeMs: 61000, completed: true } } });
    expect(store.data.has('flags-quiz:capital-quiz-records')).toBe(true);
    expect(store.getItem('flags-quiz:quiz-records-v2')).toBeNull();
    expect(store.getItem('flags-quiz:map-quiz-records-v2')).toBeNull();
  });

  it('applies the same record rules as the flag quiz', () => {
    const store = memoryStore();
    saveCapitalQuizOutcome(store, 'africa', 'easy', outcome(10, 90000, true, 8));
    expect(saveCapitalQuizOutcome(store, 'africa', 'easy', outcome(10, 80000, true, 8))).toEqual({ score: false, time: false });
    expect(saveCapitalQuizOutcome(store, 'africa', 'easy', outcome(12, 80000, true, 0))).toEqual({ score: true, time: true });
  });
});

describe('capital medals', () => {
  it('keeps the best medal under its own key, apart from flag and map medals', () => {
    const store = memoryStore();
    awardCapitalMedal(store, 'asia', 'medium', 'silver');
    awardCapitalMedal(store, 'asia', 'medium', 'bronze');
    expect(medalOf(loadCapitalMedals(store), 'asia', 'medium')).toBe('silver');
    expect(store.data.has('flags-quiz:capital-medals')).toBe(true);
    expect(store.getItem('flags-quiz:medals')).toBeNull();
    expect(store.getItem('flags-quiz:map-medals-v2')).toBeNull();
  });
});
