import type { ContinentKey, Difficulty } from './engine/pool';
import type { Medal } from './engine/round';
import { readMedals, writeMedal, type Medals } from './progress';
import { mergeQuizOutcome, quizRecord, type NewRecords, type QuizOutcome, type QuizRecords, type RecordStore } from './quizRecords';

export type CapitalMedals = Medals;
export type CapitalQuizRecords = QuizRecords;

const MEDALS_KEY = 'flags-quiz:capital-medals';
const RECORDS_KEY = 'flags-quiz:capital-quiz-records';

export function loadCapitalMedals(store: RecordStore): CapitalMedals {
  return readMedals(store, MEDALS_KEY);
}

export function awardCapitalMedal(store: RecordStore, continent: ContinentKey, difficulty: Difficulty, medal: Medal): void {
  writeMedal(store, MEDALS_KEY, continent, difficulty, medal);
}

export function loadCapitalQuizRecords(store: RecordStore): CapitalQuizRecords {
  const raw = store.getItem(RECORDS_KEY);
  return raw === null ? {} : (JSON.parse(raw) as CapitalQuizRecords);
}

export function saveCapitalQuizOutcome(store: RecordStore, continent: ContinentKey, difficulty: Difficulty, outcome: QuizOutcome): NewRecords {
  const records = loadCapitalQuizRecords(store);
  const { next, newRecords } = mergeQuizOutcome(quizRecord(records, continent, difficulty), outcome);
  records[continent] = { ...records[continent], [difficulty]: next };
  store.setItem(RECORDS_KEY, JSON.stringify(records));
  return newRecords;
}
