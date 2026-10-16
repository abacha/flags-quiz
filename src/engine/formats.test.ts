import { describe, expect, it } from 'vitest';
import { countries, similarGroups, similarNames, type Country } from '../data/countries';
import {
  ALL_FORMATS,
  crop,
  flagToNames,
  flagToTwoNames,
  matchPairs,
  nameToFlags,
  oddOneOut,
  sortSimilar,
  sortSimilarNames,
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
  similarNames,
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

  it('fills the options with the similar flags and names of the target when the level asks for it', () => {
    for (const seed of SEEDS) {
      const question = flagToNames.build(byIso('ml'), general, seededRng(seed));
      if (question.format !== 'flagToNames') throw new Error('expected flagToNames');
      const lookalikes = iso(question.options).filter((code) => ['ml', 'gn', 'sn', 'cm', 'mw'].includes(code));
      expect(lookalikes).toHaveLength(Math.min(question.options.length, 5));
    }
  });

  it('puts both the similar flag and the similar name of the target among the options', () => {
    for (const seed of SEEDS) {
      const question = flagToNames.build(byIso('ne'), general, seededRng(seed));
      if (question.format !== 'flagToNames') throw new Error('expected flagToNames');
      expect(iso(question.options)).toEqual(expect.arrayContaining(['ne', 'ci', 'ng']));
    }
  });

  it('leaves similar names out of the options when the level does not ask for it', () => {
    const withoutNigeria = SEEDS.some((seed) => {
      const question = flagToNames.build(byIso('ne'), { ...general, similarDistractors: false }, seededRng(seed));
      return 'options' in question && !iso(question.options).includes('ng');
    });
    expect(withoutNigeria).toBe(true);
  });
});

describe('crop formats', () => {
  it('places the crop origin inside the flag', () => {
    for (const question of buildMany(crop, easy)) {
      if (question.format !== 'crop') throw new Error('expected a crop');
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
      expect(['ml', 'gn', 'sn', 'cm', 'mw']).toContain(question.shown.iso2);
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

  it('does not always bring back the whole similar group as companions', () => {
    const allGroupPresent = SEEDS.map((seed) => {
      const question = matchPairs.build(byIso('ml'), general, seededRng(seed));
      if (question.format !== 'matchPairs') throw new Error('expected matchPairs');
      return ['gn', 'sn', 'cm'].every((code) => iso(question.countries).includes(code));
    });
    expect(allGroupPresent.some((present) => !present)).toBe(true);
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

  it('in Mundo, mixes three flags of one continent with an intruder from another', () => {
    const world: FormatContext = { ...general, pool: poolFor(countries, 'world', 'general') };
    for (const question of buildMany(oddOneOut, world)) {
      if (question.format !== 'oddOneOut') throw new Error('expected oddOneOut');
      const three = question.options.filter((c) => c !== question.intruder);
      expect(three).toHaveLength(3);
      expect(new Set(three.map((c) => c.continent))).toEqual(new Set([question.target.continent]));
      expect(question.intruder.continent).not.toBe(question.target.continent);
      expect(three.every((c) => world.pool.includes(c))).toBe(true);
    }
  });

  it('targets only flags with two continent mates in the pool', () => {
    const mixed: FormatContext = { ...easy, pool: ['ao', 'br', 'ar', 'cl'].map(byIso) };
    expect(oddOneOut.canTarget(byIso('ao'), mixed)).toBe(false);
    expect(oddOneOut.canTarget(byIso('br'), mixed)).toBe(true);
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

describe('sortSimilarNames', () => {
  it('targets only countries whose similar-name group has 2 or more members in the pool', () => {
    expect(sortSimilarNames.canTarget(byIso('cg'), general)).toBe(true);
    expect(sortSimilarNames.canTarget(byIso('za'), general)).toBe(false);
    expect(sortSimilarNames.canTarget(byIso('gn'), easy)).toBe(false);
  });

  it('uses only the similar-name group members inside the pool', () => {
    const question = sortSimilarNames.build(byIso('gn'), general, seededRng(1));
    if (question.format !== 'sortSimilarNames') throw new Error('expected sortSimilarNames');
    expect(iso(question.countries).sort()).toEqual(['gn', 'gq', 'gw']);
  });

  it('uses the whole group across continents in Mundo', () => {
    const world: FormatContext = { ...general, pool: poolFor(countries, 'world', 'general') };
    const question = sortSimilarNames.build(byIso('gn'), world, seededRng(1));
    if (question.format !== 'sortSimilarNames') throw new Error('expected sortSimilarNames');
    expect(iso(question.countries).sort()).toEqual(['gn', 'gq', 'gw', 'pg']);
  });
});

describe('ALL_FORMATS', () => {
  it('lists the eleven formats once each', () => {
    expect(ALL_FORMATS.map((f) => f.id).sort()).toEqual([
      'crop',
      'flagToNames',
      'flagToTwoNames',
      'matchPairs',
      'nameToFlags',
      'oddOneOut',
      'sortSimilar',
      'sortSimilarNames',
      'trueFalse',
      'typeName',
      'typeSimilar',
    ]);
  });

  it('marks the two typing formats as recall', () => {
    expect(ALL_FORMATS.filter((f) => f.recall).map((f) => f.id).sort()).toEqual(['typeName', 'typeSimilar']);
  });

  it('marks the formats that show the names to pick from as choice', () => {
    expect(ALL_FORMATS.filter((f) => f.choice).map((f) => f.id).sort()).toEqual([
      'flagToNames',
      'flagToTwoNames',
      'matchPairs',
      'nameToFlags',
    ]);
  });
});

describe('small pools', () => {
  const tiny: FormatContext = { ...contextFor('hard'), pool: poolFor(countries, 'oceania', 'general').slice(0, 4) };
  const fiveCountries: FormatContext = { ...contextFor('hard'), pool: poolFor(countries, 'oceania', 'general').slice(0, 5) };
  const sixCountries: FormatContext = { ...contextFor('hard'), pool: poolFor(countries, 'oceania', 'general').slice(0, 6) };

  it('never asks for 6 options on a 4-country pool', () => {
    for (const format of [nameToFlags, flagToNames]) {
      for (const question of buildMany(format, tiny)) {
        if (!('options' in question)) throw new Error('expected options');
        expect(question.options).toHaveLength(4);
      }
    }
  });

  it('never asks for 6 options on a 5-country pool', () => {
    for (const format of [nameToFlags, flagToNames]) {
      for (const question of buildMany(format, fiveCountries)) {
        if (!('options' in question)) throw new Error('expected options');
        expect(question.options).toHaveLength(4);
      }
    }
  });

  it('draws 6 options on a 6-country pool', () => {
    for (const format of [nameToFlags, flagToNames]) {
      const sizes = new Set(buildMany(format, sixCountries).map((q) => ('options' in q ? q.options.length : 0)));
      expect(sizes.has(6)).toBe(true);
    }
  });

  it('builds every format for every target it accepts', () => {
    for (const format of ALL_FORMATS) {
      for (const target of tiny.pool) {
        if (format.canTarget(target, tiny)) expect(() => format.build(target, tiny, seededRng(1))).not.toThrow();
      }
    }
  });
});
