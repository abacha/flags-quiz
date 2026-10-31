import { describe, expect, it } from 'vitest';
import { mainCapital, nearestByCapital, similarCapitals } from '../data/capitals';
import { countries, similarNames } from '../data/countries';
import { grade, type Answer } from './answer';
import {
  CAPITAL_FORMATS,
  capitalContext,
  capitalPairs,
  capitalToCountries,
  capitalTrueFalse,
  countryToCapitals,
  typeCapital,
  typeCapitalCountry,
  trickyOthers,
} from './capitalFormats';
import type { Question } from './question';
import { seededRng } from './rng';
import { Round } from './round';

const c = (code: string) => countries.find((country) => country.iso2 === code)!;

function lookAlikesOf(code: string): string[] {
  return [...similarNames, ...similarCapitals].filter((group) => group.includes(code)).flat().filter((other) => other !== code);
}

function rightAnswer(q: Question): Answer {
  switch (q.format) {
    case 'capitalTrueFalse':
      return { kind: 'yesNo', yes: q.shown === q.target };
    case 'typeCapital':
      return { kind: 'text', text: mainCapital(q.target) };
    case 'typeCapitalCountry':
      return { kind: 'text', text: q.target.name };
    case 'capitalPairs':
      return { kind: 'links', links: Object.fromEntries(q.countries.map((country) => [country.iso2, country.iso2])) };
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

  it('offers 4 options including the target', () => {
    for (const format of [countryToCapitals, capitalToCountries]) {
      const q = format.build(ctx.pool[0], ctx, seededRng(1));
      if (q.format !== 'countryToCapitals' && q.format !== 'capitalToCountries') throw new Error('wrong format');
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(ctx.pool[0]);
    }
  });

  it('pairs 4 countries including the target', () => {
    const q = capitalPairs.build(ctx.pool[0], ctx, seededRng(1));
    if (q.format !== 'capitalPairs') throw new Error('wrong format');
    expect(q.countries).toHaveLength(4);
    expect(q.countries).toContain(ctx.pool[0]);
  });

  it('shows the target sometimes and a tricky member otherwise', () => {
    const europe = capitalContext('europe', 'easy');
    const target = c('fr');
    const tricky = new Set<string>();
    let rights = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const q = capitalTrueFalse.build(target, europe, seededRng(seed));
      if (q.format !== 'capitalTrueFalse') throw new Error('wrong format');
      if (q.shown === target) rights++;
      else tricky.add(q.shown.iso2);
    }
    expect(rights).toBeGreaterThan(0);
    expect(rights).toBeLessThan(50);
    const allowed = new Set(
      Array.from({ length: 50 }, (_, seed) => trickyOthers(target, europe, 3, seededRng(seed + 1)).map((o) => o.iso2)).flat(),
    );
    for (const code of tricky) expect(allowed.has(code) || nearestByCapital(target, europe.pool, 8).some((o) => o.iso2 === code)).toBe(true);
  });

  it('marks the first three formats as choice and the type formats as recall', () => {
    expect(CAPITAL_FORMATS.filter((f) => f.choice).map((f) => f.id)).toEqual(['countryToCapitals', 'capitalToCountries', 'capitalPairs']);
    expect(CAPITAL_FORMATS.filter((f) => f.recall).map((f) => f.id)).toEqual(['typeCapital', 'typeCapitalCountry']);
    expect(capitalTrueFalse).toMatchObject({ choice: false, recall: false });
    expect([typeCapital, typeCapitalCountry].every((f) => !f.choice && f.recall)).toBe(true);
  });

  it('wins a round with every first question a choice format', () => {
    const round = new Round(ctx, { correctToWin: 200, recallWeight: 3 }, seededRng(7), CAPITAL_FORMATS);
    const firstFormat = new Map<string, boolean>();
    for (let i = 0; i < 400 && round.status === 'playing'; i++) {
      const q = round.nextQuestion();
      if (!firstFormat.has(q.target.iso2)) firstFormat.set(q.target.iso2, CAPITAL_FORMATS.find((f) => f.id === q.format)!.choice);
      round.answer(rightAnswer(q));
    }
    expect(round.status).toBe('won');
    expect([...firstFormat.values()].every(Boolean)).toBe(true);
  });
});

describe('grade capital questions', () => {
  const bolivia = c('bo');
  const france = c('fr');

  it('grades choices by the target', () => {
    for (const format of ['countryToCapitals', 'capitalToCountries'] as const) {
      const q: Question = { format, target: bolivia, options: [bolivia, france] };
      expect(grade(q, { kind: 'choice', iso2: 'bo' }).correct).toBe(true);
      expect(grade(q, { kind: 'choice', iso2: 'fr' })).toEqual({ correct: false, missed: [bolivia], typos: [] });
    }
  });

  it('grades pairs by links', () => {
    const q: Question = { format: 'capitalPairs', target: bolivia, countries: [bolivia, france] };
    expect(grade(q, { kind: 'links', links: { bo: 'bo', fr: 'fr' } }).correct).toBe(true);
    expect(grade(q, { kind: 'links', links: { bo: 'fr', fr: 'bo' } }).missed).toEqual([bolivia, france]);
  });

  it('grades true or false against the shown country', () => {
    const q: Question = { format: 'capitalTrueFalse', target: bolivia, shown: france };
    expect(grade(q, { kind: 'yesNo', yes: false }).correct).toBe(true);
    expect(grade(q, { kind: 'yesNo', yes: true }).correct).toBe(false);
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
