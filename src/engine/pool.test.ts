import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { poolFor } from './pool';

describe('poolFor', () => {
  it('gives tier 1 on easy', () => {
    const pool = poolFor(countries, 'africa', 'easy');
    expect(pool).toHaveLength(18);
    expect(pool.every((c) => c.tier === 1)).toBe(true);
  });

  it('adds tier 2 on medium', () => {
    expect(poolFor(countries, 'africa', 'medium')).toHaveLength(36);
  });

  it('gives all 54 on hard', () => {
    expect(poolFor(countries, 'africa', 'hard')).toHaveLength(54);
  });

  it('is empty for a continent without tiers', () => {
    expect(poolFor(countries, 'europe', 'hard')).toEqual([]);
  });
});
