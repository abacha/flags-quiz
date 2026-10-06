import type { Continent, Country, Tier } from '../data/countries';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'general';

export interface LevelRules {
  tiers: readonly Tier[];
  correctToWin: number;
  recallWeight: number;
  similarDistractors: boolean;
}

export const LEVEL_RULES: Record<Difficulty, LevelRules> = {
  easy: { tiers: [1], correctToWin: 12, recallWeight: 1, similarDistractors: false },
  medium: { tiers: [2], correctToWin: 18, recallWeight: 2, similarDistractors: false },
  hard: { tiers: [3], correctToWin: 25, recallWeight: 3, similarDistractors: true },
  general: { tiers: [1, 2, 3], correctToWin: 30, recallWeight: 3, similarDistractors: true },
};

export function poolFor(all: readonly Country[], continent: Continent, difficulty: Difficulty): Country[] {
  const { tiers } = LEVEL_RULES[difficulty];
  return all.filter((c) => c.continent === continent && c.tier !== undefined && tiers.includes(c.tier));
}
