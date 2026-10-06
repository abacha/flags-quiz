import { describe, expect, it } from 'vitest';
import { countries, similarGroups } from '../data/countries';
import type { Answer } from './answer';
import { flagToNames, sortSimilar, typeName } from './formats';
import { poolFor } from './pool';
import type { FormatContext, Question } from './question';
import { seededRng } from './rng';
import { Round, STARTING_LIVES, type RoundSettings } from './round';

const easy: FormatContext = { pool: poolFor(countries, 'africa', 'easy'), world: countries, similarGroups, similarDistractors: false };
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
    const targets = Array.from({ length: 18 }, () => {
      const question = round.nextQuestion();
      round.answer(rightAnswer(question));
      return question.target.iso2;
    });
    expect(new Set(targets).size).toBe(18);
    expect(() => round.answer(rightAnswer(round.nextQuestion()))).not.toThrow();
  });

  it('starts the next pass with the countries missed in the round', () => {
    const round = new Round(easy, settings(100), seededRng(5), [typeName]);
    const first = round.nextQuestion();
    round.answer(wrongAnswer(first));
    for (let i = 0; i < 17; i++) round.answer(rightAnswer(round.nextQuestion()));
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

  it('plays a 25-answer round on an 18-country pool with every format', () => {
    for (const seed of [11, 12, 13]) {
      const round = new Round(easy, settings(25, 3), seededRng(seed));
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
});
