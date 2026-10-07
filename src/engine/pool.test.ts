import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { goalFor, poolFor } from './pool';

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

  it.each([
    ['americas', [12, 12, 11, 35]],
    ['asia', [16, 15, 15, 46]],
    ['europe', [15, 15, 14, 44]],
    ['oceania', [5, 5, 4, 14]],
  ] as const)('sizes the %s pools', (continent, sizes) => {
    expect((['easy', 'medium', 'hard', 'general'] as const).map((d) => poolFor(countries, continent, d).length)).toEqual(sizes);
  });
});

describe('goalFor', () => {
  it('keeps the Africa goals', () => {
    expect((['easy', 'medium', 'hard', 'general'] as const).map((d) => goalFor(d, poolFor(countries, 'africa', d).length))).toEqual([
      12, 18, 25, 30,
    ]);
  });

  it.each([
    ['americas', [8, 12, 16, 20]],
    ['asia', [11, 15, 21, 26]],
    ['europe', [10, 15, 20, 25]],
    ['oceania', [4, 5, 6, 8]],
  ] as const)('scales the %s goals with the pool', (continent, goals) => {
    expect((['easy', 'medium', 'hard', 'general'] as const).map((d) => goalFor(d, poolFor(countries, continent, d).length))).toEqual(
      goals,
    );
  });
});
