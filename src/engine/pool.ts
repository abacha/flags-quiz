import type { Continent, Country, Tier } from '../data/countries';

export type ContinentKey = Continent | 'world';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'general';

export interface LevelRules {
  tiers: readonly Tier[];
  goal: readonly [numerator: number, denominator: number];
  recallWeight: number;
  similarDistractors: boolean;
}

export const LEVEL_RULES: Record<Difficulty, LevelRules> = {
  easy: { tiers: [1], goal: [2, 3], recallWeight: 1, similarDistractors: false },
  medium: { tiers: [2], goal: [1, 1], recallWeight: 2, similarDistractors: false },
  hard: { tiers: [3], goal: [25, 18], recallWeight: 3, similarDistractors: true },
  general: { tiers: [1, 2, 3], goal: [30, 54], recallWeight: 3, similarDistractors: true },
};

export function goalFor(difficulty: Difficulty, poolSize: number): number {
  const [numerator, denominator] = LEVEL_RULES[difficulty].goal;
  return Math.ceil((numerator * poolSize) / denominator);
}

export function poolFor(all: readonly Country[], continent: ContinentKey, difficulty: Difficulty): Country[] {
  const { tiers } = LEVEL_RULES[difficulty];
  return all.filter((c) => (continent === 'world' || c.continent === continent) && tiers.includes(c.tier));
}
