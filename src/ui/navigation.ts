import type { Country } from '../data/countries';
import type { ContinentKey, Difficulty } from '../engine/pool';
import type { NewRecords } from '../quizRecords';

export type Screen =
  | { name: 'home' }
  | { name: 'continent'; continent: ContinentKey }
  | { name: 'game'; continent: ContinentKey; difficulty: Difficulty }
  | { name: 'result'; continent: ContinentKey; difficulty: Difficulty; won: boolean; correct: number; missed: Country[] }
  | { name: 'quiz'; continent: ContinentKey; difficulty: Difficulty }
  | {
      name: 'quizResult';
      continent: ContinentKey;
      difficulty: Difficulty;
      score: number;
      timeMs: number;
      finished: boolean;
      unanswered: number;
      missed: Country[];
      newRecords: NewRecords;
    };

export type Navigate = (screen: Screen) => void;
