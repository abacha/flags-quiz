import type { ContinentKey } from './engine/pool';
import { mergeQuizOutcome, type NewRecords, type QuizOutcome, type QuizRecord, type RecordStore } from './quizRecords';

export type MapMedals = Partial<Record<ContinentKey, true>>;
export type MapQuizRecords = Partial<Record<ContinentKey, QuizRecord>>;

const MEDALS_KEY = 'flags-quiz:map-medals';
const RECORDS_KEY = 'flags-quiz:map-quiz-records';

export function loadMapMedals(store: RecordStore): MapMedals {
  const raw = store.getItem(MEDALS_KEY);
  return raw === null ? {} : (JSON.parse(raw) as MapMedals);
}

export function awardMapMedal(store: RecordStore, continent: ContinentKey): void {
  const medals = loadMapMedals(store);
  medals[continent] = true;
  store.setItem(MEDALS_KEY, JSON.stringify(medals));
}

export function hasMapMedal(medals: MapMedals, continent: ContinentKey): boolean {
  return medals[continent] === true;
}

export function loadMapQuizRecords(store: RecordStore): MapQuizRecords {
  const raw = store.getItem(RECORDS_KEY);
  return raw === null ? {} : (JSON.parse(raw) as MapQuizRecords);
}

export function mapQuizRecord(records: MapQuizRecords, continent: ContinentKey): QuizRecord {
  return records[continent] ?? {};
}

export function saveMapQuizOutcome(store: RecordStore, continent: ContinentKey, outcome: QuizOutcome): NewRecords {
  const records = loadMapQuizRecords(store);
  const { next, newRecords } = mergeQuizOutcome(mapQuizRecord(records, continent), outcome);
  records[continent] = next;
  store.setItem(RECORDS_KEY, JSON.stringify(records));
  return newRecords;
}
