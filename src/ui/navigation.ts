import type { Continent, Country } from '../data/countries';
import type { Difficulty } from '../engine/pool';

export type Screen =
  | { name: 'home' }
  | { name: 'continent' }
  | { name: 'difficulty'; continent: Continent }
  | { name: 'game'; continent: Continent; difficulty: Difficulty }
  | { name: 'result'; continent: Continent; difficulty: Difficulty; won: boolean; correct: number; missed: Country[] };

export type Navigate = (screen: Screen) => void;
