import type { ContinentKey, Difficulty } from './engine/pool';
import type { Medals } from './progress';
import { mergeQuizOutcome, quizRecord, type NewRecords, type QuizOutcome, type QuizRecords, type RecordStore } from './quizRecords';

export type MapMedals = Medals;
export type MapQuizRecords = QuizRecords;

const MEDALS_KEY = 'flags-quiz:map-medals';
const RECORDS_KEY = 'flags-quiz:map-quiz-records';

export function loadMapMedals(store: RecordStore): MapMedals {
  const raw = store.getItem(MEDALS_KEY);
  return raw === null ? {} : (JSON.parse(raw) as MapMedals);
}

export function awardMapMedal(store: RecordStore, continent: ContinentKey, difficulty: Difficulty): void {
  const medals = loadMapMedals(store);
  medals[continent] = { ...medals[continent], [difficulty]: true };
  store.setItem(MEDALS_KEY, JSON.stringify(medals));
}

export function loadMapQuizRecords(store: RecordStore): MapQuizRecords {
  const raw = store.getItem(RECORDS_KEY);
  return raw === null ? {} : (JSON.parse(raw) as MapQuizRecords);
}

export function saveMapQuizOutcome(store: RecordStore, continent: ContinentKey, difficulty: Difficulty, outcome: QuizOutcome): NewRecords {
  const records = loadMapQuizRecords(store);
  const { next, newRecords } = mergeQuizOutcome(quizRecord(records, continent, difficulty), outcome);
  records[continent] = { ...records[continent], [difficulty]: next };
  store.setItem(RECORDS_KEY, JSON.stringify(records));
  return newRecords;
}
