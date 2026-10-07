import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { goalFor, poolFor } from './pool';

const LEVELS = ['easy', 'medium', 'hard', 'general'] as const;

describe('poolFor', () => {
  it.each([
    ['easy', 1],
    ['medium', 2],
    ['hard', 3],
  ] as const)('gives only tier %s countries on %s', (difficulty, tier) => {
    const pool = poolFor(countries, 'africa', difficulty);
    expect(pool).toHaveLength(20);
    expect(pool.every((c) => c.tier === tier)).toBe(true);
  });

  it.each([
    ['africa', [20, 20, 20, 60]],
    ['americas', [19, 18, 18, 55]],
    ['asia', [17, 17, 16, 50]],
    ['europe', [19, 19, 18, 56]],
    ['oceania', [9, 9, 9, 27]],
  ] as const)('sizes the %s pools', (continent, sizes) => {
    expect(LEVELS.map((d) => poolFor(countries, continent, d).length)).toEqual(sizes);
  });
});

describe('goalFor', () => {
  it.each([
    ['africa', [14, 20, 28, 34]],
    ['americas', [13, 18, 25, 31]],
    ['asia', [12, 17, 23, 28]],
    ['europe', [13, 19, 25, 32]],
    ['oceania', [6, 9, 13, 15]],
  ] as const)('scales the %s goals with the pool', (continent, goals) => {
    expect(LEVELS.map((d) => goalFor(d, poolFor(countries, continent, d).length))).toEqual(goals);
  });
});
