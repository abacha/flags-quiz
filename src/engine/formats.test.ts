import { describe, expect, it } from 'vitest';
import { countries, similarGroups, type Country } from '../data/countries';
import {
  ALL_FORMATS,
  crop,
  cropType,
  flagToNames,
  flagToTwoNames,
  matchPairs,
  nameToFlags,
  oddOneOut,
  sortSimilar,
  trueFalse,
  typeSimilar,
} from './formats';
import { LEVEL_RULES, poolFor, type Difficulty } from './pool';
import type { Format, FormatContext, Question } from './question';
import { seededRng } from './rng';

const contextFor = (difficulty: Difficulty): FormatContext => ({
  pool: poolFor(countries, 'africa', difficulty),
  world: countries,
  similarGroups,
  similarDistractors: LEVEL_RULES[difficulty].similarDistractors,
});
const easy = contextFor('easy');
const general = contextFor('general');
const byIso = (code: string) => countries.find((c) => c.iso2 === code)!;
const iso = (list: Country[]) => list.map((c) => c.iso2);
const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

function buildMany(format: Format, ctx: FormatContext): Question[] {
  return SEEDS.map((seed) => format.build(ctx.pool[seed % ctx.pool.length], ctx, seededRng(seed)));
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
    for (const ctx of [easy, general]) {
      for (const question of buildMany(format, ctx)) {
        if (!('options' in question)) throw new Error('expected options');
        expect(sizes).toContain(question.options.length);
        expectOptionsAroundTarget(question.options, question.target, ctx.pool);
      }
    }
  });

  it('draws both 4 and 6 options across seeds', () => {
    const sizes = new Set(buildMany(nameToFlags, easy).map((q) => ('options' in q ? q.options.length : 0)));
    expect(sizes).toEqual(new Set([4, 6]));
  });

  it('puts every similar flag of the target among the options when the level asks for it', () => {
    for (const seed of SEEDS) {
      const question = flagToNames.build(byIso('ml'), general, seededRng(seed));
      if (question.format !== 'flagToNames') throw new Error('expected flagToNames');
      expect(iso(question.options)).toEqual(expect.arrayContaining(['ml', 'gn', 'sn', 'cm']));
    }
  });
});

describe('crop formats', () => {
  it.each([crop, cropType])('%o places the crop origin inside the flag', (format) => {
    for (const question of buildMany(format, easy)) {
      if (question.format !== 'crop' && question.format !== 'cropType') throw new Error('expected a crop');
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

  it('shows a similar flag name on a mismatch when the level asks for it', () => {
    for (const seed of SEEDS) {
      const question = trueFalse.build(byIso('ml'), general, seededRng(seed));
      if (question.format !== 'trueFalse') throw new Error('expected trueFalse');
      expect(['ml', 'gn', 'sn', 'cm']).toContain(question.shown.iso2);
    }
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

describe.each([sortSimilar, typeSimilar])('%o', (format) => {
  it('targets only countries whose group has 2 or more members in the pool', () => {
    expect(format.canTarget(byIso('sn'), easy)).toBe(true);
    expect(format.canTarget(byIso('za'), easy)).toBe(false);
    expect(format.canTarget(byIso('ma'), general)).toBe(false);
  });

  it('uses only the group members inside the pool', () => {
    const question = format.build(byIso('sn'), easy, seededRng(1));
    if (question.format !== 'sortSimilar' && question.format !== 'typeSimilar') throw new Error('expected a group format');
    expect(iso(question.countries).sort()).toEqual(['cm', 'sn']);
  });

  it('uses the whole group when the pool has all of it', () => {
    const question = format.build(byIso('ml'), general, seededRng(1));
    if (question.format !== 'sortSimilar' && question.format !== 'typeSimilar') throw new Error('expected a group format');
    expect(iso(question.countries).sort()).toEqual(['cm', 'gn', 'ml', 'sn']);
  });
});

describe('ALL_FORMATS', () => {
  it('lists the eleven formats once each', () => {
    expect(ALL_FORMATS.map((f) => f.id).sort()).toEqual([
      'crop',
      'cropType',
      'flagToNames',
      'flagToTwoNames',
      'matchPairs',
      'nameToFlags',
      'oddOneOut',
      'sortSimilar',
      'trueFalse',
      'typeName',
      'typeSimilar',
    ]);
  });

  it('marks the three typing formats as recall', () => {
    expect(ALL_FORMATS.filter((f) => f.recall).map((f) => f.id).sort()).toEqual(['cropType', 'typeName', 'typeSimilar']);
  });
});
