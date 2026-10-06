import type { Continent, Country, Tier } from '../data/countries';

export type Difficulty = 'easy' | 'medium' | 'hard';

const HIGHEST_TIER: Record<Difficulty, Tier> = { easy: 1, medium: 2, hard: 3 };

export function poolFor(all: readonly Country[], continent: Continent, difficulty: Difficulty): Country[] {
  return all.filter(
    (c) => c.continent === continent && c.tier !== undefined && c.tier <= HIGHEST_TIER[difficulty],
  );
}
