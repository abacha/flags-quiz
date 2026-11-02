import { describe, expect, it } from 'vitest';
import { GENERAL_SAMPLE, MAP_ALL_SAMPLE, learnPoolSize, mapLearnSize, practiceSample } from './practice';
import { MAP_ALL } from '../data/maps';
import type { Medal } from './round';
import { seededRng } from './rng';

const items = ['a1', 'a2', 'b1', 'b2', 'g1', 'g2', 's1', 's2', 'n1', 'n2'];
const MEDAL_BY_PREFIX: Record<string, Medal | undefined> = { a: undefined, n: undefined, b: 'bronze', s: 'silver', g: 'gold' };
const medalOf = (item: string) => MEDAL_BY_PREFIX[item[0]];

describe('practiceSample', () => {
  it('takes the items with no medal first, then bronze, silver and gold', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const sample = practiceSample(items, medalOf, 7, seededRng(seed));
      expect(sample.slice(0, 4).map(medalOf)).toEqual([undefined, undefined, undefined, undefined]);
      expect(sample.slice(4, 6).map(medalOf)).toEqual(['bronze', 'bronze']);
      expect(medalOf(sample[6])).toBe('silver');
    }
  });

  it('draws at random inside a medal group', () => {
    const picks = new Set(Array.from({ length: 20 }, (_, seed) => practiceSample(items, medalOf, 5, seededRng(seed + 1))[4]));
    expect(picks).toEqual(new Set(['b1', 'b2']));
  });

  it('returns the whole pool when it is smaller than the sample', () => {
    expect(practiceSample(items, medalOf, 20, seededRng(1)).sort()).toEqual([...items].sort());
  });
});

describe('learn round sizes', () => {
  it('samples the general level and plays every other level whole', () => {
    expect(GENERAL_SAMPLE).toBe(20);
    expect(learnPoolSize('general', 60)).toBe(20);
    expect(learnPoolSize('general', 12)).toBe(12);
    expect(learnPoolSize('hard', 60)).toBe(60);
  });

  it('samples the whole continent map and plays a region whole', () => {
    expect(MAP_ALL_SAMPLE).toBe(10);
    expect(mapLearnSize(MAP_ALL, 50)).toBe(10);
    expect(mapLearnSize('central-america', 8)).toBe(8);
  });
});
