import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { MAP_ALL, mapLevels, mapPool, nearestCountries } from '../data/maps';
import { CONTINENT_KEYS } from '../ui/labels';
import { grade, type Answer } from './answer';
import { LadderRound } from './ladderRound';
import { MAP_LADDER, ladderStart, mapContext, mapFlagToNames, mapSpellName, mapToFlags, mapToNames, spelledLetters } from './mapFormats';
import type { Question } from './question';
import { seededRng } from './rng';

const c = (code: string) => countries.find((country) => country.iso2 === code)!;
const ctx = mapContext('oceania', MAP_ALL);

function rightAnswer(q: Question): Answer {
  switch (q.format) {
    case 'mapTypeName':
    case 'mapSpellName':
      return { kind: 'text', text: q.target.name };
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
});

describe('grade map questions', () => {
  const fiji = c('fj');

  it('grades a name choice in mapToNames against the target', () => {
    const q: Question = { format: 'mapToNames', target: fiji, options: [fiji, c('to'), c('ws'), c('vu')] };
    expect(grade(q, { kind: 'choice', iso2: 'fj' }).correct).toBe(true);
    expect(grade(q, { kind: 'choice', iso2: 'vu' }).correct).toBe(false);
  });

  it('grades a typed alias in mapTypeName', () => {
    const q: Question = { format: 'mapTypeName', target: c('cd') };
    expect(grade(q, { kind: 'text', text: 'RDC' }).correct).toBe(true);
    expect(grade(q, { kind: 'text', text: 'nenhum país' }).correct).toBe(false);
  });
});

describe('a Learn round on every map level', () => {
  it.each(CONTINENT_KEYS.flatMap((continent) => mapLevels(continent).map((level) => [continent, level] as const)))(
    'brings every country of %s %s to the top of the ladder',
    (continent, level) => {
      const context = mapContext(continent, level);
      for (const seed of [1, 2, 3]) {
        const round = new LadderRound(context, ladderStart(level), seededRng(seed));
        while (round.status === 'playing') round.answer(rightAnswer(round.nextQuestion()));
        expect(round.status).toBe('won');
      }
    },
  );
});

describe('map distractors', () => {
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

    it('still builds 4-country questions in the smallest region', () => {
      const small = mapContext('europe', 'eastern-europe');
      expect(small.pool).toHaveLength(5);
      const names = mapToNames.build(small.pool[0], small, seededRng(1));
      if (names.format !== 'mapToNames') throw new Error('wrong format');
      expect(new Set(names.options.map((o) => o.iso2)).size).toBe(4);
    });
  });
});

describe('map ladder', () => {
  it('orders the ladder from flag hint to bare typing', () => {
    expect(MAP_LADDER.map((f) => f.id)).toEqual(['mapFlagToNames', 'mapToFlags', 'mapToNames', 'mapSpellName', 'mapTypeName']);
  });

  it('starts regions at step 1 and whole maps at step 3', () => {
    expect(ladderStart('west-coast')).toBe(0);
    expect(ladderStart(MAP_ALL)).toBe(2);
  });

  it('draws step 1 and step 2 options from the 8 nearest countries', () => {
    const gt = c('gt');
    const americas = mapContext('americas', MAP_ALL);
    const near = new Set(nearestCountries(gt, americas.pool, 8).map((country) => country.iso2));
    for (let seed = 1; seed <= 20; seed++) {
      for (const format of [mapFlagToNames, mapToFlags]) {
        const q = format.build(gt, americas, seededRng(seed));
        if (q.format !== 'mapFlagToNames' && q.format !== 'mapToFlags') throw new Error('wrong format');
        expect(new Set(q.options.map((o) => o.iso2)).size).toBe(4);
        expect(q.options).toContain(gt);
        for (const option of q.options.filter((o) => o !== gt)) expect(near.has(option.iso2), option.iso2).toBe(true);
      }
    }
  });

  it('shuffles exactly the letters of the name without separators', () => {
    expect(spelledLetters('Guiné-Bissau')).toEqual([...'GuinéBissau']);
    expect(spelledLetters('Costa do Marfim')).toEqual([...'CostadoMarfim']);
    expect(spelledLetters("Cote d'Ivoire")).toEqual([...'CotedIvoire']);
    const q = mapSpellName.build(c('ci'), ctx, seededRng(1));
    if (q.format !== 'mapSpellName') throw new Error('wrong format');
    expect([...q.letters].sort()).toEqual(spelledLetters(c('ci').name).sort());
  });

  it('grades step 4 only on the exact name', () => {
    const sn = c('sn');
    const q: Question = { format: 'mapSpellName', target: sn, letters: spelledLetters(sn.name) };
    expect(grade(q, { kind: 'text', text: 'Senegal' })).toEqual({ correct: true, missed: [], typos: [] });
    expect(grade(q, { kind: 'text', text: 'Senagel' })).toEqual({ correct: false, missed: [sn], typos: [] });
  });

  it('grades steps 1 and 2 against the target', () => {
    const sn = c('sn');
    const options = [sn, c('gm'), c('gw'), c('ml')];
    for (const format of ['mapFlagToNames', 'mapToFlags'] as const) {
      const q: Question = { format, target: sn, options };
      expect(grade(q, { kind: 'choice', iso2: 'sn' }).correct).toBe(true);
      expect(grade(q, { kind: 'choice', iso2: 'gm' })).toEqual({ correct: false, missed: [sn], typos: [] });
    }
  });
});
