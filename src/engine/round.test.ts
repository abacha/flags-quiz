import { describe, expect, it } from 'vitest';
import { countries, similarGroups } from '../data/countries';
import type { Answer } from './answer';
import { flagToNames, matchPairs, sortSimilar, typeName } from './formats';
import { LEVEL_RULES, goalFor, poolFor } from './pool';
import type { FormatContext, Question } from './question';
import { seededRng } from './rng';
import { Round, STARTING_LIVES, type RoundSettings } from './round';

const easy: FormatContext = { pool: poolFor(countries, 'africa', 'easy'), world: countries, similarGroups, similarDistractors: false };
const hard: FormatContext = { pool: poolFor(countries, 'africa', 'hard'), world: countries, similarGroups, similarDistractors: true };
const settings = (correctToWin: number, recallWeight = 1): RoundSettings => ({ correctToWin, recallWeight });

function rightAnswer(q: Question): Answer {
  switch (q.format) {
    case 'trueFalse':
      return { kind: 'yesNo', yes: q.shown === q.target };
    case 'typeName':
    case 'cropType':
      return { kind: 'text', text: q.target.name };
    case 'typeSimilar':
      return { kind: 'texts', texts: Object.fromEntries(q.countries.map((c) => [c.iso2, c.name])) };
    case 'oddOneOut':
      return { kind: 'choice', iso2: q.intruder.iso2 };
    case 'matchPairs':
    case 'sortSimilar':
      return { kind: 'links', links: Object.fromEntries(q.countries.map((c) => [c.iso2, c.iso2])) };
    default:
      return { kind: 'choice', iso2: q.target.iso2 };
  }
}

function wrongAnswer(q: Question): Answer {
  switch (q.format) {
    case 'trueFalse':
      return { kind: 'yesNo', yes: q.shown !== q.target };
    case 'typeName':
    case 'cropType':
      return { kind: 'text', text: 'nenhum país' };
    case 'typeSimilar':
      return { kind: 'texts', texts: {} };
    case 'oddOneOut':
      return { kind: 'choice', iso2: q.target.iso2 };
    case 'matchPairs':
    case 'sortSimilar': {
      const [first, second] = q.countries;
      return { kind: 'links', links: { [first.iso2]: second.iso2, [second.iso2]: first.iso2 } };
    }
    default:
      return { kind: 'choice', iso2: q.options.find((c) => c !== q.target)!.iso2 };
  }
}

const shown = (q: Question) => ('countries' in q ? q.countries.map((c) => c.iso2) : [q.target.iso2]);

describe('Round', () => {
  it('starts with 3 lives, no correct answers and the level goal', () => {
    const round = new Round(easy, settings(12), seededRng(1));
    expect([round.lives, round.correct, round.status, round.correctToWin]).toEqual([STARTING_LIVES, 0, 'playing', 12]);
  });

  it('is won at the goal and then refuses new questions', () => {
    const round = new Round(easy, settings(5), seededRng(2));
    for (let i = 0; i < 5; i++) round.answer(rightAnswer(round.nextQuestion()));
    expect(round.status).toBe('won');
    expect(() => round.nextQuestion()).toThrow('Round is won');
  });

  it('is lost after 3 wrong answers and remembers what was missed', () => {
    const round = new Round(easy, settings(12), seededRng(3));
    for (let i = 0; i < STARTING_LIVES; i++) round.answer(wrongAnswer(round.nextQuestion()));
    expect(round.status).toBe('lost');
    expect(round.missed.length).toBeGreaterThan(0);
  });

  it('asks every country once before any repeats', () => {
    const round = new Round(easy, settings(100), seededRng(4), [typeName, flagToNames]);
    const targets = Array.from({ length: easy.pool.length }, () => {
      const question = round.nextQuestion();
      round.answer(rightAnswer(question));
      return question.target.iso2;
    });
    expect(new Set(targets).size).toBe(easy.pool.length);
    expect(() => round.answer(rightAnswer(round.nextQuestion()))).not.toThrow();
  });

  it('starts the next pass with the countries missed in the round', () => {
    const round = new Round(easy, settings(100), seededRng(5), [typeName]);
    const first = round.nextQuestion();
    round.answer(wrongAnswer(first));
    for (let i = 0; i < easy.pool.length - 1; i++) round.answer(rightAnswer(round.nextQuestion()));
    expect(round.nextQuestion().target).toBe(first.target);
  });

  it('does not bring a similar group back through another member in the same pass', () => {
    for (const seed of [6, 7, 8, 9, 10]) {
      const round = new Round(easy, settings(100), seededRng(seed), [sortSimilar]);
      const first = round.nextQuestion();
      round.answer(rightAnswer(first));
      const second = round.nextQuestion();
      expect(shown(second).filter((code) => shown(first).includes(code))).toEqual([]);
    }
  });

  it('cuts how often match-pairs companions let a similar group return through sort-similar', () => {
    // Two sort-similar questions can never legitimately share a country: each one spends every
    // country it shows (spentBy), so a group can be targeted by sort-similar at most once per pass.
    // A match-pairs question does not spend its companions, so a companion from the target's
    // similar group can stay unspent and later become a sort-similar target, re-showing the group.
    // The old optionsWith-based build put mates first, so this happened on most seeds; plain random
    // sampling only leaks a mate by chance, so it should affect a minority of rounds instead.
    const general: FormatContext = {
      pool: poolFor(countries, 'africa', 'general'),
      world: countries,
      similarGroups,
      similarDistractors: true,
    };
    const groupOf = (code: string) => similarGroups.find((g) => g.includes(code)) ?? [code];
    let roundsWithLeak = 0;
    const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
    for (const seed of seeds) {
      const round = new Round(general, settings(54), seededRng(seed), [matchPairs, sortSimilar]);
      const seenSortSimilar = new Set<string>();
      const leakedByMatchPairs = new Set<string>();
      let leaked = false;
      for (let i = 0; i < 30; i++) {
        const question = round.nextQuestion();
        if (question.format === 'sortSimilar') {
          const codes = shown(question);
          expect(codes.some((code) => seenSortSimilar.has(code))).toBe(false);
          if (codes.some((code) => leakedByMatchPairs.has(code))) leaked = true;
          for (const code of codes) seenSortSimilar.add(code);
        } else if (question.format === 'matchPairs') {
          const group = groupOf(question.target.iso2);
          for (const country of question.countries) {
            if (country.iso2 !== question.target.iso2 && group.includes(country.iso2)) leakedByMatchPairs.add(country.iso2);
          }
        }
        round.answer(rightAnswer(question));
      }
      if (leaked) roundsWithLeak++;
    }
    expect(roundsWithLeak / seeds.length).toBeLessThan(0.5);
  });

  it('plays a 25-answer round on the Africa Difícil pool with every format', () => {
    for (const seed of [11, 12, 13]) {
      const round = new Round(hard, settings(25, 3), seededRng(seed));
      while (round.status === 'playing') round.answer(rightAnswer(round.nextQuestion()));
      expect(round.status).toBe('won');
    }
  });

  it('draws recall formats more often with a higher recall weight', () => {
    let recall = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const round = new Round(easy, settings(12, 3), seededRng(seed), [typeName, flagToNames]);
      if (round.nextQuestion().format === 'typeName') recall++;
    }
    expect(recall / 400).toBeGreaterThan(0.65);
    expect(recall / 400).toBeLessThan(0.85);
  });

  it('refuses a second answer to the same question', () => {
    const round = new Round(easy, settings(12), seededRng(14));
    const question = round.nextQuestion();
    round.answer(wrongAnswer(question));
    expect(() => round.answer(wrongAnswer(question))).toThrow('No question to answer');
    expect(round.lives).toBe(STARTING_LIVES - 1);
  });

  it('refuses a new question before the current one is answered', () => {
    const round = new Round(easy, settings(12), seededRng(15));
    round.nextQuestion();
    expect(() => round.nextQuestion()).toThrow('not answered');
  });

  it('does not list the same missed country twice', () => {
    const round = new Round(easy, settings(12), seededRng(16));
    for (let i = 0; i < STARTING_LIVES; i++) round.answer(wrongAnswer(round.nextQuestion()));
    const codes = round.missed.map((c) => c.iso2);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it.each(['africa', 'americas', 'asia', 'europe', 'oceania', 'world'] as const)('plays every level of %s to its goal', (continent) => {
    for (const difficulty of ['easy', 'medium', 'hard', 'general'] as const) {
      const pool = poolFor(countries, continent, difficulty);
      const ctx: FormatContext = { pool, world: countries, similarGroups, similarDistractors: LEVEL_RULES[difficulty].similarDistractors };
      const round = new Round(ctx, settings(goalFor(difficulty, pool.length), LEVEL_RULES[difficulty].recallWeight), seededRng(31));
      while (round.status === 'playing') round.answer(rightAnswer(round.nextQuestion()));
      expect(round.status).toBe('won');
    }
  });
});
