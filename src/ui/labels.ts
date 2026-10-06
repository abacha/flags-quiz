import type { Continent } from '../data/countries';
import type { Difficulty } from '../engine/pool';

export const CONTINENTS: readonly Continent[] = ['africa', 'americas', 'asia', 'europe', 'oceania'];

export const CONTINENT_LABEL: Record<Continent, string> = {
  africa: 'África',
  americas: 'Américas',
  asia: 'Ásia',
  europe: 'Europa',
  oceania: 'Oceania',
};

export const CONTINENT_FROM: Record<Continent, string> = {
  africa: 'da África',
  americas: 'das Américas',
  asia: 'da Ásia',
  europe: 'da Europa',
  oceania: 'da Oceania',
};

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'general'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  general: 'Geral',
};
