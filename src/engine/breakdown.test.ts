import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { continentBreakdown } from './breakdown';

const c = (iso2: string) => countries.find((country) => country.iso2 === iso2)!;
const pool = ['fr', 'de', 'br', 'ar', 'cl', 'eg', 'ng'].map(c);

describe('continentBreakdown', () => {
  it('counts the countries of each continent answered without a mistake over its countries in the quiz', () => {
    const breakdown = continentBreakdown(pool, [], [c('br')]);
    expect(breakdown).toContainEqual({ continent: 'americas', right: 2, total: 3 });
    expect(breakdown).toContainEqual({ continent: 'europe', right: 2, total: 2 });
  });

  it('counts an unanswered country as not right', () => {
    expect(continentBreakdown(pool, [c('eg')], [])).toContainEqual({ continent: 'africa', right: 1, total: 2 });
  });

  it('leaves out the continents with no country in the quiz', () => {
    expect(continentBreakdown(pool, [], []).map((row) => row.continent)).not.toContain('oceania');
    expect(continentBreakdown(pool, [], [])).toHaveLength(3);
  });

  it('lists the weakest continent first', () => {
    const breakdown = continentBreakdown(pool, [c('eg')], [c('ng'), c('br')]);
    expect(breakdown.map((row) => row.continent)).toEqual(['africa', 'americas', 'europe']);
  });
});
