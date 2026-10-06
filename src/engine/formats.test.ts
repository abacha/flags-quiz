import { describe, expect, it } from 'vitest';
import { countries, similarGroups, type Country } from '../data/countries';
import {
  ALL_FORMATS,
  crop,
  flagToNames,
  flagToTwoNames,
  matchPairs,
  nameToFlags,
  oddOneOut,
  sortSimilar,
  trueFalse,
} from './formats';
import { poolFor, type Difficulty } from './pool';
import type { Format, FormatContext, Question } from './question';
import { seededRng } from './rng';

const contextFor = (difficulty: Difficulty): FormatContext => ({
  pool: poolFor(countries, 'africa', difficulty),
  world: countries,
  similarGroups,
});
const easy = contextFor('easy');
const general = contextFor('general');
const iso = (list: Country[]) => list.map((c) => c.iso2);
const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

function buildMany(format: Format, ctx: FormatContext): Question[] {
  return SEEDS.map((seed) => {
    const rng = seededRng(seed);
    return format.build(ctx.pool[seed % ctx.pool.length], ctx, rng);
  });
}

function expectOptionsAroundTarget(options: Country[], target: Country, pool: readonly Country[]) {
  expect(iso(options).filter((code) => code === target.iso2)).toHaveLength(1);
  expect(new Set(iso(options)).size).toBe(options.length);
  expect(options.every((c) => pool.includes(c))).toBe(true);
}

describe('option formats', () => {
  it.each([
    [nameToFlags, [4, 6]],
    [flagToNames, [4, 6]],
    [flagToTwoNames, [2]],
    [crop, [4]],
  ] as const)('%o builds distinct options that contain the target once', (format, sizes) => {
    for (const question of buildMany(format, easy)) {
      if (!('options' in question)) throw new Error('expected options');
      expect(sizes).toContain(question.options.length);
      expectOptionsAroundTarget(question.options, question.target, easy.pool);
    }
  });

  it('draws both 4 and 6 options across seeds', () => {
    const sizes = new Set(buildMany(nameToFlags, easy).map((q) => ('options' in q ? q.options.length : 0)));
    expect(sizes).toEqual(new Set([4, 6]));
  });
});

describe('crop', () => {
  it('places the crop origin inside the flag', () => {
    for (const question of buildMany(crop, easy)) {
      if (question.format !== 'crop') throw new Error('expected crop');
      for (const value of [question.crop.originX, question.crop.originY]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('trueFalse', () => {
  it('shows a pool country and both matches and mismatches occur', () => {
    const questions = buildMany(trueFalse, easy);
    const matches = questions.filter((q) => q.format === 'trueFalse' && q.shown === q.target);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(questions.length);
    for (const q of questions) if (q.format === 'trueFalse') expect(easy.pool).toContain(q.shown);
  });
});

describe('matchPairs', () => {
  it('uses 4 distinct pool countries including the target', () => {
    for (const question of buildMany(matchPairs, easy)) {
      if (question.format !== 'matchPairs') throw new Error('expected matchPairs');
      expect(question.countries).toHaveLength(4);
      expectOptionsAroundTarget(question.countries, question.target, easy.pool);
    }
  });
});

describe('oddOneOut', () => {
  it('mixes the target, two pool countries and one intruder from another continent', () => {
    for (const question of buildMany(oddOneOut, easy)) {
      if (question.format !== 'oddOneOut') throw new Error('expected oddOneOut');
      expect(question.options).toHaveLength(4);
      expect(new Set(iso(question.options)).size).toBe(4);
      expect(question.options).toContain(question.target);
      expect(question.options).toContain(question.intruder);
      expect(question.intruder.continent).not.toBe('africa');
      expect(question.options.filter((c) => c.continent !== 'africa')).toEqual([question.intruder]);
      expect(question.options.filter((c) => c !== question.intruder).every((c) => easy.pool.includes(c))).toBe(true);
    }
  });
});

describe('sortSimilar', () => {
  const byIso = (code: string) => countries.find((c) => c.iso2 === code)!;

  it('targets only countries whose group has 2 or more members in the pool', () => {
    expect(sortSimilar.canTarget(byIso('sn'), easy)).toBe(true);
    expect(sortSimilar.canTarget(byIso('za'), easy)).toBe(false);
    expect(sortSimilar.canTarget(byIso('ma'), general)).toBe(false);
  });

  it('uses only the group members inside the pool', () => {
    const question = sortSimilar.build(byIso('sn'), easy, seededRng(1));
    if (question.format !== 'sortSimilar') throw new Error('expected sortSimilar');
    expect(iso(question.countries).sort()).toEqual(['cm', 'sn']);
  });

  it('uses the whole group when the pool has all of it', () => {
    const question = sortSimilar.build(byIso('ml'), general, seededRng(1));
    if (question.format !== 'sortSimilar') throw new Error('expected sortSimilar');
    expect(iso(question.countries).sort()).toEqual(['cm', 'gn', 'ml', 'sn']);
  });
});

describe('ALL_FORMATS', () => {
  it('lists the nine formats once each', () => {
    expect(ALL_FORMATS.map((f) => f.id).sort()).toEqual(
      ['crop', 'flagToNames', 'flagToTwoNames', 'matchPairs', 'nameToFlags', 'oddOneOut', 'sortSimilar', 'trueFalse', 'typeName'],
    );
  });
});
