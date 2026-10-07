import type { ContinentKey, Difficulty } from './engine/pool';

export type RecordStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface QuizRecord {
  bestScore?: number;
  bestTimeMs?: number;
}

export type QuizRecords = Partial<Record<ContinentKey, Partial<Record<Difficulty, QuizRecord>>>>;

export interface QuizOutcome {
  score: number;
  timeMs: number;
  finished: boolean;
  errors: number;
}

export interface NewRecords {
  score: boolean;
  time: boolean;
}

const STORAGE_KEY = 'flags-quiz:quiz-records';

export function loadQuizRecords(store: RecordStore): QuizRecords {
  const raw = store.getItem(STORAGE_KEY);
  return raw === null ? {} : (JSON.parse(raw) as QuizRecords);
}

export function quizRecord(records: QuizRecords, continent: ContinentKey, difficulty: Difficulty): QuizRecord {
  return records[continent]?.[difficulty] ?? {};
}

export function saveQuizOutcome(store: RecordStore, continent: ContinentKey, difficulty: Difficulty, outcome: QuizOutcome): NewRecords {
  const records = loadQuizRecords(store);
  const previous = quizRecord(records, continent, difficulty);
  const timeMs = Math.floor(outcome.timeMs / 1000) * 1000;
  const score = previous.bestScore === undefined || outcome.score > previous.bestScore;
  const time = outcome.finished && outcome.errors === 0 && (previous.bestTimeMs === undefined || timeMs < previous.bestTimeMs);
  const next: QuizRecord = { ...previous };
  if (score) next.bestScore = outcome.score;
  if (time) next.bestTimeMs = timeMs;
  records[continent] = { ...records[continent], [difficulty]: next };
  store.setItem(STORAGE_KEY, JSON.stringify(records));
  return { score, time };
}
