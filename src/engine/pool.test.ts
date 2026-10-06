import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { LEVEL_RULES, poolFor } from './pool';

describe('poolFor', () => {
  it.each([
    ['easy', 1],
    ['medium', 2],
    ['hard', 3],
  ] as const)('gives only tier %s countries on %s', (difficulty, tier) => {
    const pool = poolFor(countries, 'africa', difficulty);
    expect(pool).toHaveLength(18);
    expect(pool.every((c) => c.tier === tier)).toBe(true);
  });

  it('gives all 54 on general', () => {
    expect(poolFor(countries, 'africa', 'general')).toHaveLength(54);
  });

  it('is empty for a continent without tiers', () => {
    expect(poolFor(countries, 'europe', 'general')).toEqual([]);
  });
});

describe('LEVEL_RULES', () => {
  it('sets the goal per level', () => {
    expect([LEVEL_RULES.easy, LEVEL_RULES.medium, LEVEL_RULES.hard, LEVEL_RULES.general].map((r) => r.correctToWin)).toEqual([
      12, 18, 25, 30,
    ]);
  });
});
