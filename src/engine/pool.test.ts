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
    ['africa', [18, 26, 37, 44]],
    ['americas', [17, 24, 33, 40]],
    ['asia', [15, 23, 29, 37]],
    ['europe', [17, 25, 33, 41]],
    ['oceania', [15, 15, 17, 20]],
  ] as const)('scales the %s goals with the pool', (continent, goals) => {
    expect(LEVELS.map((d) => goalFor(d, poolFor(countries, continent, d).length))).toEqual(goals);
  });

  it('never asks fewer than 15 correct answers', () => {
    expect(LEVELS.map((d) => goalFor(d, 1))).toEqual([15, 15, 15, 15]);
  });
});

describe('Mundo', () => {
  const CONTINENTS = ['africa', 'americas', 'asia', 'europe', 'oceania'] as const;

  it.each(LEVELS)('builds the %s pool as the union of the continents', (difficulty) => {
    const union = CONTINENTS.flatMap((continent) => poolFor(countries, continent, difficulty)).map((c) => c.iso2);
    expect(poolFor(countries, 'world', difficulty).map((c) => c.iso2).sort()).toEqual(union.sort());
  });

  it('sizes the pools and scales the goals', () => {
    const sizes = LEVELS.map((d) => poolFor(countries, 'world', d).length);
    expect(sizes).toEqual([84, 83, 81, 248]);
    expect(LEVELS.map((d, i) => goalFor(d, sizes[i]))).toEqual([73, 108, 147, 180]);
  });
});
