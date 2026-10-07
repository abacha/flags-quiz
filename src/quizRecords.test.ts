import { describe, expect, it } from 'vitest';
import { loadQuizRecords, quizRecord, saveQuizOutcome, type RecordStore } from './quizRecords';

function memoryStore(): RecordStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const outcome = (score: number, timeMs: number, finished = true, errors = 0) => ({ score, timeMs, finished, errors });

describe('quiz records', () => {
  it('starts empty', () => {
    expect(quizRecord(loadQuizRecords(memoryStore()), 'africa', 'easy')).toEqual({});
  });

  it('keeps the first finished flawless quiz as both records', () => {
    const store = memoryStore();
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 95000))).toEqual({ score: true, time: true });
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy')).toEqual({ bestScore: 18, bestTimeMs: 95000 });
  });

  it('updates the score only when strictly higher', () => {
    const store = memoryStore();
    saveQuizOutcome(store, 'africa', 'easy', outcome(10, 90000, true, 8));
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(10, 80000, true, 8)).score).toBe(false);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(12, 80000, true, 6)).score).toBe(true);
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy').bestScore).toBe(12);
  });

  it('records the time only for a finished quiz with no errors and a lower time', () => {
    const store = memoryStore();
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(16, 60000, true, 2)).time).toBe(false);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(5, 30000, false, 0)).time).toBe(false);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 100000)).time).toBe(true);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 120000)).time).toBe(false);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 90000)).time).toBe(true);
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy').bestTimeMs).toBe(90000);
  });

  it('compares times in whole seconds, ignoring the milliseconds past them', () => {
    const store = memoryStore();
    saveQuizOutcome(store, 'africa', 'easy', outcome(18, 95000));
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 95700)).time).toBe(false);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 94900)).time).toBe(true);
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy').bestTimeMs).toBe(94000);
  });

  it('lets an early end with a negative score set the first best score', () => {
    const store = memoryStore();
    expect(saveQuizOutcome(store, 'africa', 'hard', outcome(-2, 15000, false, 2))).toEqual({ score: true, time: false });
    expect(quizRecord(loadQuizRecords(store), 'africa', 'hard')).toEqual({ bestScore: -2 });
  });

  it('keeps levels apart under one storage key', () => {
    const store = memoryStore();
    saveQuizOutcome(store, 'africa', 'easy', outcome(18, 95000));
    saveQuizOutcome(store, 'africa', 'general', outcome(40, 400000, true, 14));
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy').bestScore).toBe(18);
    expect(quizRecord(loadQuizRecords(store), 'africa', 'general')).toEqual({ bestScore: 40 });
    expect([...store.data.keys()]).toEqual(['flags-quiz:quiz-records-v2']);
  });

  it('ignores a record saved under the old pre-Mundo key', () => {
    const store = memoryStore();
    store.data.set('flags-quiz:quiz-records', JSON.stringify({ africa: { easy: { bestScore: 999, bestTimeMs: 1000 } } }));
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy')).toEqual({});
  });

  it('keeps Mundo records under world, apart from the continents', () => {
    const store = memoryStore();
    saveQuizOutcome(store, 'africa', 'easy', outcome(18, 95000));
    saveQuizOutcome(store, 'world', 'easy', outcome(70, 400000));
    expect(quizRecord(loadQuizRecords(store), 'world', 'easy')).toEqual({ bestScore: 70, bestTimeMs: 400000 });
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy')).toEqual({ bestScore: 18, bestTimeMs: 95000 });
  });
});
