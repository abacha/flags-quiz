import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { mapPool, nearestCountries } from '../data/maps';
import { grade, type Answer } from './answer';
import { MAP_FORMATS, mapContext, mapPairs, mapToNames, mapTrueFalse } from './mapFormats';
import type { Question } from './question';
import { seededRng } from './rng';
import { Round } from './round';

const c = (code: string) => countries.find((country) => country.iso2 === code)!;
const ctx = mapContext('oceania', 'general');

function rightAnswer(q: Question): Answer {
  switch (q.format) {
    case 'mapTrueFalse':
      return { kind: 'yesNo', yes: q.shown === q.target };
    case 'mapTypeName':
      return { kind: 'text', text: q.target.name };
    case 'mapPairs':
      return { kind: 'links', links: Object.fromEntries(q.countries.map((country) => [country.iso2, country.iso2])) };
    default:
      return { kind: 'choice', iso2: q.target.iso2 };
  }
}

describe('map formats', () => {
  it('builds the context from the Maps pool without look-alikes', () => {
    expect(ctx.pool.length).toBeGreaterThan(4);
    expect([ctx.similarGroups, ctx.similarNames, ctx.similarDistractors]).toEqual([[], [], false]);
  });

  it('builds a level context from the level pool and offers only its countries', () => {
    const level = mapContext('americas', 'medium');
    expect(level.pool).toEqual(mapPool('americas', 'medium'));
    expect(level.world).toEqual(level.pool);
    const q = mapToNames.build(level.pool[0], level, seededRng(2));
    if (q.format !== 'mapToNames') throw new Error('wrong format');
    for (const option of q.options) expect(level.pool).toContain(option);
  });

  it('offers 4 names from the Maps pool', () => {
    const q = mapToNames.build(ctx.pool[0], ctx, seededRng(1));
    if (q.format !== 'mapToNames') throw new Error('wrong format');
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain(ctx.pool[0]);
    for (const option of q.options) expect(ctx.pool).toContain(option);
  });

  it('pairs 4 countries of the pool including the target', () => {
    const q = mapPairs.build(ctx.pool[0], ctx, seededRng(1));
    if (q.format !== 'mapPairs') throw new Error('wrong format');
    expect(q.countries).toHaveLength(4);
    expect(q.countries).toContain(ctx.pool[0]);
    for (const country of q.countries) expect(ctx.pool).toContain(country);
  });

  it('shows the target or another pool country in mapTrueFalse with even odds', () => {
    const rng = seededRng(3);
    const shown = Array.from({ length: 200 }, () => {
      const q = mapTrueFalse.build(ctx.pool[0], ctx, rng);
      if (q.format !== 'mapTrueFalse') throw new Error('wrong format');
      expect(ctx.pool).toContain(q.shown);
      return q.shown === q.target;
    });
    const matches = shown.filter(Boolean).length;
    expect(matches).toBeGreaterThan(70);
    expect(matches).toBeLessThan(130);
  });

  it('marks only mapToNames, nameToMap and mapPairs as choice', () => {
    expect(MAP_FORMATS.filter((f) => f.choice).map((f) => f.id)).toEqual(['mapToNames', 'nameToMap', 'mapPairs']);
    expect(MAP_FORMATS.filter((f) => f.recall).map((f) => f.id)).toEqual(['mapTypeName']);
  });

  it('introduces every country through a choice question in a map round', () => {
    const round = new Round(ctx, { correctToWin: 200, recallWeight: 3 }, seededRng(7), MAP_FORMATS);
    const firstFormat = new Map<string, boolean>();
    for (let i = 0; i < 60; i++) {
      const q = round.nextQuestion();
      if (!firstFormat.has(q.target.iso2)) firstFormat.set(q.target.iso2, MAP_FORMATS.find((f) => f.id === q.format)!.choice);
      round.answer(rightAnswer(q));
    }
    expect(firstFormat.size).toBeGreaterThan(0);
    expect([...firstFormat.values()].every(Boolean)).toBe(true);
  });
});

describe('grade map questions', () => {
  const fiji = c('fj');

  it('grades a tap on the target as right and on a neighbour as wrong', () => {
    const q: Question = { format: 'nameToMap', target: fiji };
    expect(grade(q, { kind: 'choice', iso2: 'fj' }).correct).toBe(true);
    expect(grade(q, { kind: 'choice', iso2: 'to' })).toEqual({ correct: false, missed: [fiji] });
  });

  it('grades a name choice in mapToNames against the target', () => {
    const q: Question = { format: 'mapToNames', target: fiji, options: [fiji, c('to'), c('ws'), c('vu')] };
    expect(grade(q, { kind: 'choice', iso2: 'fj' }).correct).toBe(true);
    expect(grade(q, { kind: 'choice', iso2: 'vu' }).correct).toBe(false);
  });

  it('grades mapTrueFalse like trueFalse', () => {
    expect(grade({ format: 'mapTrueFalse', target: fiji, shown: fiji }, { kind: 'yesNo', yes: true }).correct).toBe(true);
    expect(grade({ format: 'mapTrueFalse', target: fiji, shown: c('to') }, { kind: 'yesNo', yes: true })).toEqual({
      correct: false,
      missed: [fiji],
    });
  });

  it('grades a typed alias in mapTypeName', () => {
    const q: Question = { format: 'mapTypeName', target: c('cd') };
    expect(grade(q, { kind: 'text', text: 'RDC' }).correct).toBe(true);
    expect(grade(q, { kind: 'text', text: 'nenhum país' }).correct).toBe(false);
  });

  it('grades mapPairs links and reports the mismatched countries', () => {
    const countriesShown = [fiji, c('to'), c('ws'), c('vu')];
    const q: Question = { format: 'mapPairs', target: fiji, countries: countriesShown };
    expect(grade(q, rightAnswer(q)).correct).toBe(true);
    const swapped: Answer = { kind: 'links', links: { fj: 'to', to: 'fj', ws: 'ws', vu: 'vu' } };
    expect(grade(q, swapped)).toEqual({ correct: false, missed: [fiji, c('to')] });
  });
});

describe('grade a tap outside the level', () => {
  it('counts a drawn country of another level as a wrong answer', () => {
    const level = mapContext('americas', 'easy');
    const target = level.pool[0];
    const outside = c('gt');
    expect(level.pool).not.toContain(outside);
    const q = { format: 'nameToMap', target } as const;
    expect(grade(q, { kind: 'choice', iso2: outside.iso2 })).toEqual({ correct: false, missed: [target] });
  });

  describe('regional distractors', () => {
    const gt = c('gt');
    const americas = mapContext('americas', 'general');
    const near = new Set(nearestCountries(gt, americas.pool, 8).map((country) => country.iso2));
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];

    it('draws mapToNames options from the 8 nearest countries', () => {
      for (const seed of seeds) {
        const q = mapToNames.build(gt, americas, seededRng(seed));
        if (q.format !== 'mapToNames') throw new Error('wrong format');
        for (const option of q.options.filter((o) => o !== gt)) expect(near.has(option.iso2), option.iso2).toBe(true);
      }
    });

    it('draws mapPairs countries from the 8 nearest countries', () => {
      for (const seed of seeds) {
        const q = mapPairs.build(gt, americas, seededRng(seed));
        if (q.format !== 'mapPairs') throw new Error('wrong format');
        for (const country of q.countries.filter((o) => o !== gt)) expect(near.has(country.iso2), country.iso2).toBe(true);
      }
    });

    it('draws the mapTrueFalse wrong country from the 8 nearest countries', () => {
      for (const seed of seeds) {
        const q = mapTrueFalse.build(gt, americas, seededRng(seed));
        if (q.format !== 'mapTrueFalse') throw new Error('wrong format');
        if (q.shown !== gt) expect(near.has(q.shown.iso2), q.shown.iso2).toBe(true);
      }
    });

    it('still builds 4-country questions in Oceania hard', () => {
      const small = mapContext('oceania', 'hard');
      expect(small.pool).toHaveLength(4);
      const names = mapToNames.build(small.pool[0], small, seededRng(1));
      const pairs = mapPairs.build(small.pool[0], small, seededRng(1));
      if (names.format !== 'mapToNames' || pairs.format !== 'mapPairs') throw new Error('wrong format');
      expect(new Set(names.options.map((o) => o.iso2)).size).toBe(4);
      expect(new Set(pairs.countries.map((o) => o.iso2)).size).toBe(4);
    });
  });
});
