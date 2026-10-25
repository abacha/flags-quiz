import type { MapLevel } from './data/maps';
import type { ContinentKey } from './engine/pool';
import type { Medal } from './engine/round';
import { readMedals, writeMedal, type Medals } from './progress';
import { mergeQuizOutcome, quizRecord, type NewRecords, type QuizOutcome, type QuizRecords, type RecordStore } from './quizRecords';

export type MapMedals = Medals<MapLevel>;
export type MapQuizRecords = QuizRecords<MapLevel>;

const MEDALS_KEY = 'flags-quiz:map-medals-v2';
const RECORDS_KEY = 'flags-quiz:map-quiz-records-v2';

export function loadMapMedals(store: RecordStore): MapMedals {
  return readMedals(store, MEDALS_KEY);
}

export function awardMapMedal(store: RecordStore, continent: ContinentKey, level: MapLevel, medal: Medal): void {
  writeMedal(store, MEDALS_KEY, continent, level, medal);
}

export function loadMapQuizRecords(store: RecordStore): MapQuizRecords {
  const raw = store.getItem(RECORDS_KEY);
  return raw === null ? {} : (JSON.parse(raw) as MapQuizRecords);
}

export function saveMapQuizOutcome(store: RecordStore, continent: ContinentKey, level: MapLevel, outcome: QuizOutcome): NewRecords {
  const records = loadMapQuizRecords(store);
  const { next, newRecords } = mergeQuizOutcome(quizRecord(records, continent, level), outcome);
  records[continent] = { ...records[continent], [level]: next };
  store.setItem(RECORDS_KEY, JSON.stringify(records));
  return newRecords;
}
