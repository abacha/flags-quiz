import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { MAP_ALL, mapLevels, mapPool, nearestCountries } from '../data/maps';
import { CONTINENT_KEYS } from '../ui/labels';
import { LEVEL_RULES, goalFor } from './pool';
import { grade, type Answer } from './answer';
import { mapContext, mapDifficulty, mapFormats, mapPairs, mapToNames, mapTrueFalse } from './mapFormats';
import type { Question } from './question';
import { seededRng } from './rng';
import { Round } from './round';

const c = (code: string) => countries.find((country) => country.iso2 === code)!;
const ctx = mapContext('oceania', MAP_ALL);

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
    const level = mapContext('americas', 'central-america');
    expect(level.pool).toEqual(mapPool('americas', 'central-america'));
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
    const formats = mapFormats(MAP_ALL);
    expect(formats.filter((f) => f.choice).map((f) => f.id)).toEqual(['mapToNames', 'nameToMap', 'mapPairs']);
    expect(formats.filter((f) => f.recall).map((f) => f.id)).toEqual(['mapTypeName']);
  });

  it('leaves mapPairs out of a region and keeps it on the whole continent', () => {
    expect(mapFormats('west-coast').map((f) => f.id)).toEqual(['mapToNames', 'nameToMap', 'mapTrueFalse', 'mapTypeName']);
    expect(mapFormats(MAP_ALL).map((f) => f.id)).toContain('mapPairs');
  });

  it('asks Onde fica X? in about half of a region round', () => {
    const context = mapContext('africa', 'west-coast');
    let whereIs = 0;
    let total = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const round = new Round(context, { correctToWin: 15, recallWeight: LEVEL_RULES.medium.recallWeight }, seededRng(seed), mapFormats('west-coast'));
      while (round.status === 'playing') {
        const q = round.nextQuestion();
        if (q.format === 'nameToMap') whereIs++;
        total++;
        round.answer(rightAnswer(q));
      }
    }
    expect(whereIs / total).toBeGreaterThan(0.5);
    expect(whereIs / total).toBeLessThan(0.7);
  });

  it('introduces every country through a choice question in a map round', () => {
    const formats = mapFormats(MAP_ALL);
    const round = new Round(ctx, { correctToWin: 200, recallWeight: 3 }, seededRng(7), formats);
    const firstFormat = new Map<string, boolean>();
    for (let i = 0; i < 60; i++) {
      const q = round.nextQuestion();
      if (!firstFormat.has(q.target.iso2)) firstFormat.set(q.target.iso2, formats.find((f) => f.id === q.format)!.choice);
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
    expect(grade(q, { kind: 'choice', iso2: 'to' })).toEqual({ correct: false, missed: [fiji], typos: [] });
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
      typos: [],
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
    expect(grade(q, swapped)).toEqual({ correct: false, missed: [fiji, c('to')], typos: [] });
  });
});

describe('map level rules', () => {
  it('plays a region by the Médio rules and the whole continent by the Geral rules', () => {
    expect(mapDifficulty('west-coast')).toBe('medium');
    expect(mapDifficulty(MAP_ALL)).toBe('general');
  });
});

describe('a Learn round on every map level', () => {
  it.each(CONTINENT_KEYS.flatMap((continent) => mapLevels(continent).map((level) => [continent, level] as const)))(
    'reaches the goal on %s %s without running out of countries to ask',
    (continent, level) => {
      const context = mapContext(continent, level);
      const difficulty = mapDifficulty(level);
      for (const seed of [1, 2, 3, 4, 5]) {
        const round = new Round(
          context,
          { correctToWin: goalFor(difficulty, context.pool.length), recallWeight: LEVEL_RULES[difficulty].recallWeight },
          seededRng(seed),
          mapFormats(level),
        );
        while (round.status === 'playing') round.answer(rightAnswer(round.nextQuestion()));
        expect(round.status).toBe('won');
      }
    },
  );
});

describe('grade a tap outside the level', () => {
  it('counts a drawn country of another level as a wrong answer', () => {
    const level = mapContext('americas', 'southern-cone');
    const target = level.pool[0];
    const outside = c('gt');
    expect(level.pool).not.toContain(outside);
    const q = { format: 'nameToMap', target } as const;
    expect(grade(q, { kind: 'choice', iso2: outside.iso2 })).toEqual({ correct: false, missed: [target], typos: [] });
  });

  describe('regional distractors', () => {
    const gt = c('gt');
    const americas = mapContext('americas', MAP_ALL);
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

    it('still builds 4-country questions in the smallest region', () => {
      const small = mapContext('europe', 'eastern-europe');
      expect(small.pool).toHaveLength(5);
      const names = mapToNames.build(small.pool[0], small, seededRng(1));
      const pairs = mapPairs.build(small.pool[0], small, seededRng(1));
      if (names.format !== 'mapToNames' || pairs.format !== 'mapPairs') throw new Error('wrong format');
      expect(new Set(names.options.map((o) => o.iso2)).size).toBe(4);
      expect(new Set(pairs.countries.map((o) => o.iso2)).size).toBe(4);
    });
  });
});
