import { describe, expect, it } from 'vitest';
import { mainCapital, nearestByCapital, similarCapitals } from '../data/capitals';
import { countries, similarNames, type Country } from '../data/countries';
import { grade, type Answer } from './answer';
import {
  CAPITAL_LADDER,
  capitalContext,
  capitalOnMap,
  countryToCapitals,
  trickyOthers,
} from './capitalFormats';
import { LadderRound } from './ladderRound';
import type { Question } from './question';
import { seededRng } from './rng';

const c = (code: string) => countries.find((country) => country.iso2 === code)!;

function lookAlikesOf(code: string): string[] {
  return [...similarNames, ...similarCapitals].filter((group) => group.includes(code)).flat().filter((other) => other !== code);
}

function rightAnswer(q: Question): Answer {
  switch (q.format) {
    case 'typeCapital':
      return { kind: 'text', text: mainCapital(q.target) };
    case 'typeCapitalCountry':
      return { kind: 'text', text: q.target.name };
    default:
      return { kind: 'choice', iso2: q.target.iso2 };
  }
}

describe('trickyOthers', () => {
  it('puts a look-alike capital name first', () => {
    const asia = capitalContext('asia', 'general');
    expect(trickyOthers(c('ir'), asia, 3, seededRng(1)).map((o) => o.iso2)).toContain('iq');
    const americas = capitalContext('americas', 'general');
    expect(trickyOthers(c('vc'), americas, 3, seededRng(1)).map((o) => o.iso2)).toContain('jm');
  });

  it('returns distinct pool countries other than the target for every target', () => {
    const europe = capitalContext('europe', 'easy');
    for (const target of europe.pool) {
      const others = trickyOthers(target, europe, 3, seededRng(4));
      expect(others).toHaveLength(3);
      expect(new Set(others).size).toBe(3);
      expect(others).not.toContain(target);
      for (const other of others) expect(europe.pool).toContain(other);
    }
  });

  it('draws only from the nearest capitals when the target has no look-alike in the pool', () => {
    const europe = capitalContext('europe', 'easy');
    const target = europe.pool.find((t) => !lookAlikesOf(t.iso2).some((code) => europe.pool.some((p) => p.iso2 === code)))!;
    expect(target).toBeDefined();
    const nearest = nearestByCapital(target, europe.pool, 8);
    for (let seed = 1; seed <= 20; seed++) {
      for (const other of trickyOthers(target, europe, 3, seededRng(seed))) expect(nearest).toContain(other);
    }
  });

  it('skips look-alikes that sit outside the pool', () => {
    const tiers = (['easy', 'medium', 'hard', 'general'] as const).map((difficulty) => capitalContext('americas', difficulty));
    const cases = tiers.flatMap((tier) =>
      tier.pool.filter((t) => lookAlikesOf(t.iso2).some((code) => !tier.pool.some((p) => p.iso2 === code))).map((t) => ({ tier, target: t })),
    );
    expect(cases.length).toBeGreaterThan(0);
    for (const { tier, target } of cases) {
      for (const other of trickyOthers(target, tier, 3, seededRng(2))) expect(tier.pool).toContain(other);
    }
  });
});

describe('capital formats', () => {
  const ctx = capitalContext('oceania', 'hard');

  it('builds the context from the capital pool with look-alike names', () => {
    expect(ctx.world).toEqual(ctx.pool);
    expect([ctx.similarGroups, ctx.similarNames, ctx.similarDistractors]).toEqual([[], similarNames, true]);
  });

  it('builds the map bridge with the target and the 3 pool countries nearest by capital', () => {
    const africa = capitalContext('africa', 'easy');
    const target = africa.pool[0];
    const q = capitalOnMap.build(target, africa, seededRng(1));
    if (q.format !== 'capitalOnMap') throw new Error('wrong format');
    expect(new Set(q.options)).toEqual(new Set([target, ...nearestByCapital(target, africa.pool, 3)]));
  });

  it('builds four distinct options on steps 1 and 2 for every country of every Learn level', () => {
    for (const continent of ['africa', 'americas', 'asia', 'europe', 'oceania'] as const)
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        const level = capitalContext(continent, difficulty);
        for (const target of level.pool)
          for (const format of [capitalOnMap, countryToCapitals]) {
            const q = format.build(target, level, seededRng(2)) as { options: Country[] };
            expect(new Set(q.options).size, `${continent} ${difficulty} ${target.iso2}`).toBe(4);
          }
      }
  });

  it('climbs the capital ladder: map bridge, pick the capital, type the capital, type the country', () => {
    expect(CAPITAL_LADDER.map((f) => f.id)).toEqual(['capitalOnMap', 'countryToCapitals', 'typeCapital', 'typeCapitalCountry']);
  });

  it('wins a ladder round answered right with four answers per country', () => {
    const round = new LadderRound(ctx, 0, seededRng(7), CAPITAL_LADDER);
    while (round.status === 'playing') round.answer(rightAnswer(round.nextQuestion()));
    expect([round.status, round.medal, round.answered]).toEqual(['won', 'gold', ctx.pool.length * 4]);
  });

  it('charges nothing for a typo of the capital and keeps the step', () => {
    const round = new LadderRound(ctx, 2, seededRng(8), CAPITAL_LADDER);
    const q = round.nextQuestion();
    expect(q.format).toBe('typeCapital');
    const typo = round.answer({ kind: 'text', text: `${mainCapital(q.target)}x` });
    expect(typo.typos).toEqual([q.target]);
    expect([round.stepOf(q.target), round.lives, round.answered]).toEqual([2, 3, 0]);
  });

  it('accepts either capital of a country with several on the typed step', () => {
    const level = (['easy', 'medium', 'hard'] as const).map((d) => capitalContext('americas', d)).find((l) => l.pool.includes(c('bo')))!;
    for (const text of ['Sucre', 'La Paz']) {
      const round = new LadderRound({ ...level, pool: [c('bo'), ...level.pool.filter((x) => x !== c('bo'))] }, 2, seededRng(9), CAPITAL_LADDER);
      let q = round.nextQuestion();
      while (q.target !== c('bo')) {
        round.answer(rightAnswer(q));
        q = round.nextQuestion();
      }
      expect(round.answer({ kind: 'text', text }).correct).toBe(true);
    }
  });

});

describe('grade capital questions', () => {
  const bolivia = c('bo');
  const france = c('fr');

  it('grades choices by the target', () => {
    for (const format of ['countryToCapitals', 'capitalOnMap'] as const) {
      const q: Question = { format, target: bolivia, options: [bolivia, france] };
      expect(grade(q, { kind: 'choice', iso2: 'bo' }).correct).toBe(true);
      expect(grade(q, { kind: 'choice', iso2: 'fr' })).toEqual({ correct: false, missed: [bolivia], typos: [] });
    }
  });

  it('grades a typed capital and flags a typo', () => {
    const q: Question = { format: 'typeCapital', target: bolivia };
    expect(grade(q, { kind: 'text', text: 'La Paz' }).correct).toBe(true);
    expect(grade(q, { kind: 'text', text: 'Quito' })).toEqual({ correct: false, missed: [bolivia], typos: [] });
    expect(grade({ format: 'typeCapital', target: france }, { kind: 'text', text: 'Pariss' })).toEqual({ correct: false, missed: [], typos: [france] });
  });

  it('grades a typed country name', () => {
    const q: Question = { format: 'typeCapitalCountry', target: france };
    expect(grade(q, { kind: 'text', text: 'France' }).correct).toBe(true);
    expect(grade(q, { kind: 'text', text: 'Francee' })).toEqual({ correct: false, missed: [], typos: [france] });
    expect(grade(q, { kind: 'text', text: 'Spain' }).correct).toBe(false);
  });
});
