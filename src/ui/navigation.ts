import type { Continent, Country } from '../data/countries';
import type { Difficulty } from '../engine/pool';
import type { NewRecords } from '../quizRecords';

export type Mode = 'learn' | 'quiz';

export type Screen =
  | { name: 'home' }
  | { name: 'continent'; mode: Mode }
  | { name: 'difficulty'; mode: Mode; continent: Continent }
  | { name: 'game'; continent: Continent; difficulty: Difficulty }
  | { name: 'result'; continent: Continent; difficulty: Difficulty; won: boolean; correct: number; missed: Country[] }
  | { name: 'quiz'; continent: Continent; difficulty: Difficulty }
  | {
      name: 'quizResult';
      continent: Continent;
      difficulty: Difficulty;
      score: number;
      timeMs: number;
      finished: boolean;
      unanswered: number;
      missed: Country[];
      newRecords: NewRecords;
    };

export type Navigate = (screen: Screen) => void;
