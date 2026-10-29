import type { Continent, Country } from '../data/countries';

export interface ContinentScore {
  continent: Continent;
  right: number;
  total: number;
}

export function continentBreakdown(pool: readonly Country[], unanswered: readonly Country[], missed: readonly Country[]): ContinentScore[] {
  const scores = new Map<Continent, ContinentScore>();
  for (const country of pool) {
    const score = scores.get(country.continent) ?? { continent: country.continent, right: 0, total: 0 };
    score.total++;
    if (!unanswered.includes(country) && !missed.includes(country)) score.right++;
    scores.set(country.continent, score);
  }
  return [...scores.values()].sort((a, b) => a.right / a.total - b.right / b.total);
}
