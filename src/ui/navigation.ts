import type { Country } from '../data/countries';
import type { MapLevel } from '../data/maps';
import type { ContinentKey, Difficulty } from '../engine/pool';
import type { Medal } from '../engine/round';
import type { NewRecords } from '../quizRecords';

export type Screen =
  | { name: 'hub'; continent: ContinentKey }
  | { name: 'flagTable'; continent: ContinentKey }
  | { name: 'mapTable'; continent: ContinentKey }
  | { name: 'game'; continent: ContinentKey; difficulty: Difficulty }
  | { name: 'result'; continent: ContinentKey; difficulty: Difficulty; won: boolean; medal: Medal | null; correct: number; missed: Country[] }
  | { name: 'mapGame'; continent: ContinentKey; level: MapLevel }
  | { name: 'mapResult'; continent: ContinentKey; level: MapLevel; won: boolean; medal: Medal | null; correct: number; missed: Country[] }
  | { name: 'mapQuiz'; continent: ContinentKey; level: MapLevel }
  | {
      name: 'mapQuizResult';
      continent: ContinentKey;
      level: MapLevel;
      score: number;
      timeMs: number;
      errors: number;
      finished: boolean;
      unanswered: Country[];
      missed: Country[];
      newRecords: NewRecords;
    }
  | { name: 'quiz'; continent: ContinentKey; difficulty: Difficulty }
  | {
      name: 'quizResult';
      continent: ContinentKey;
      difficulty: Difficulty;
      score: number;
      timeMs: number;
      errors: number;
      finished: boolean;
      unanswered: Country[];
      missed: Country[];
      newRecords: NewRecords;
    };

export type Navigate = (screen: Screen) => void;
