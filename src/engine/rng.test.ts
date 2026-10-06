import { describe, expect, it } from 'vitest';
import { pickOne, pickWeighted, sample, seededRng, shuffle } from './rng';

describe('seededRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('returns values in [0, 1)', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('pickOne', () => {
  it('returns an element of the list', () => {
    expect(['a', 'b', 'c']).toContain(pickOne(['a', 'b', 'c'], seededRng(1)));
  });

  it('throws on an empty list', () => {
    expect(() => pickOne([], seededRng(1))).toThrow('empty');
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const result = shuffle(input, seededRng(3));
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...result].sort()).toEqual(input);
  });
});

describe('sample', () => {
  it('returns the requested number of distinct elements', () => {
    const result = sample([1, 2, 3, 4, 5, 6], 4, seededRng(5));
    expect(result).toHaveLength(4);
    expect(new Set(result).size).toBe(4);
  });

  it('throws when asked for more elements than exist', () => {
    expect(() => sample([1, 2], 3, seededRng(5))).toThrow('asked 3 of 2');
  });
});

describe('pickWeighted', () => {
  it('follows the weights', () => {
    const rng = seededRng(21);
    let heavy = 0;
    for (let i = 0; i < 4000; i++) if (pickWeighted(['light', 'heavy'], (item) => (item === 'heavy' ? 3 : 1), rng) === 'heavy') heavy++;
    expect(heavy / 4000).toBeGreaterThan(0.7);
    expect(heavy / 4000).toBeLessThan(0.8);
  });

  it('never picks an item of weight zero', () => {
    const rng = seededRng(22);
    for (let i = 0; i < 500; i++) expect(pickWeighted(['a', 'b'], (item) => (item === 'a' ? 0 : 1), rng)).toBe('b');
  });

  it('throws when no item has weight', () => {
    expect(() => pickWeighted(['a'], () => 0, seededRng(1))).toThrow('no positive weight');
  });
});
