import { describe, expect, it } from 'vitest';
import { countries, similarGroups } from '../data/countries';
import type { Answer } from './answer';
import { sortSimilar } from './formats';
import { poolFor } from './pool';
import type { FormatContext, Question } from './question';
import { seededRng } from './rng';
import { CORRECT_TO_WIN, Round, STARTING_LIVES } from './round';

const easy: FormatContext = { pool: poolFor(countries, 'africa', 'easy'), world: countries, similarGroups };

function rightAnswer(q: Question): Answer {
  switch (q.format) {
    case 'trueFalse':
      return { kind: 'yesNo', yes: q.shown === q.target };
    case 'typeName':
      return { kind: 'text', text: q.target.name };
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
      return { kind: 'text', text: 'nenhum país' };
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

describe('Round', () => {
  it('starts with 3 lives and no correct answers', () => {
    const round = new Round(easy, seededRng(1));
    expect([round.lives, round.correct, round.status]).toEqual([STARTING_LIVES, 0, 'playing']);
  });

  it('is won after 10 correct answers and then refuses new questions', () => {
    const round = new Round(easy, seededRng(2));
    for (let i = 0; i < CORRECT_TO_WIN; i++) round.answer(rightAnswer(round.nextQuestion()));
    expect(round.status).toBe('won');
    expect(() => round.nextQuestion()).toThrow('Round is won');
  });

  it('is lost after 3 wrong answers and remembers what was missed', () => {
    const round = new Round(easy, seededRng(3));
    for (let i = 0; i < STARTING_LIVES; i++) round.answer(wrongAnswer(round.nextQuestion()));
    expect(round.status).toBe('lost');
    expect(round.missed.length).toBeGreaterThan(0);
  });

  it('serves 12 questions on the easy pool without repeating a target', () => {
    for (const seed of [4, 5, 6, 7, 8]) {
      const round = new Round(easy, seededRng(seed));
      const targets: string[] = [];
      const plan = [false, false, ...Array(9).fill(true), false];
      for (const right of plan) {
        const question = round.nextQuestion();
        targets.push(question.target.iso2);
        round.answer(right ? rightAnswer(question) : wrongAnswer(question));
      }
      expect(new Set(targets).size).toBe(12);
      expect(round.status).toBe('lost');
    }
  });

  it('refuses a second answer to the same question', () => {
    const round = new Round(easy, seededRng(9));
    const question = round.nextQuestion();
    round.answer(wrongAnswer(question));
    expect(() => round.answer(wrongAnswer(question))).toThrow('No question to answer');
    expect(round.lives).toBe(STARTING_LIVES - 1);
  });

  it('refuses a new question before the current one is answered', () => {
    const round = new Round(easy, seededRng(10));
    round.nextQuestion();
    expect(() => round.nextQuestion()).toThrow('not answered');
  });

  it('only picks targets the drawn format can use', () => {
    const round = new Round(easy, seededRng(11), [sortSimilar]);
    for (let i = 0; i < 4; i++) {
      const question = round.nextQuestion();
      expect(sortSimilar.canTarget(question.target, easy)).toBe(true);
      round.answer(rightAnswer(question));
    }
  });

  it('does not list the same missed country twice', () => {
    const round = new Round(easy, seededRng(12));
    for (let i = 0; i < STARTING_LIVES; i++) round.answer(wrongAnswer(round.nextQuestion()));
    const codes = round.missed.map((c) => c.iso2);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
