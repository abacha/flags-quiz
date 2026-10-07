import { describe, expect, it } from 'vitest';
import { countries, type Country } from '../data/countries';
import { poolFor } from './pool';
import { Quiz } from './quiz';
import { seededRng } from './rng';

const easy = poolFor(countries, 'africa', 'easy');
const three = easy.slice(0, 3);
const four = easy.slice(0, 4);

describe('Quiz', () => {
  it('lays every country of the pool out once and starts on the first flag of the grid', () => {
    const quiz = new Quiz(easy, seededRng(1));
    expect(quiz.flags).toHaveLength(20);
    expect(quiz.total).toBe(20);
    expect(new Set(quiz.flags.map((c) => c.iso2))).toEqual(new Set(easy.map((c) => c.iso2)));
    expect(quiz.current).toBe(quiz.flags[0]);
    expect(quiz.flags.every((c) => quiz.stateOf(c.iso2) === 'open')).toBe(true);
  });

  it('walks the grid in order when every answer is right', () => {
    const quiz = new Quiz(easy, seededRng(1));
    const asked: Country[] = [];
    while (quiz.status === 'playing') {
      asked.push(quiz.current);
      expect(quiz.answer(quiz.current.name)).toBe(true);
    }
    expect(asked).toEqual(quiz.flags);
    expect(quiz.status).toBe('finished');
    expect([quiz.answeredCount, quiz.score, quiz.errors, quiz.unanswered]).toEqual([20, 20, 0, 0]);
  });

  it('keeps the flag current, counts an error and marks it missed on a wrong answer', () => {
    const quiz = new Quiz(three, seededRng(2));
    const flag = quiz.current;
    expect(quiz.answer('nenhum país')).toBe(false);
    expect(quiz.answer('outro')).toBe(false);
    expect(quiz.current).toBe(flag);
    expect([quiz.errors, quiz.score, quiz.answeredCount]).toEqual([2, -2, 0]);
    expect(quiz.missed).toEqual([flag]);
    expect(quiz.stateOf(flag.iso2)).toBe('missed');
  });

  it('accepts aliases and ignores accents and case', () => {
    const cd = countries.find((c) => c.iso2 === 'cd')!;
    const quiz = new Quiz([cd], seededRng(3));
    expect(quiz.answer('  rdc ')).toBe(true);
    expect(quiz.status).toBe('finished');
  });

  it('skips to the next unanswered flag in grid order, wrapping, without changing any state', () => {
    const quiz = new Quiz(three, seededRng(4));
    const [first, second, third] = quiz.flags;
    quiz.skip();
    expect(quiz.current).toBe(second);
    expect(quiz.answer(second.name)).toBe(true);
    expect(quiz.current).toBe(third);
    quiz.skip();
    expect(quiz.current).toBe(first);
    expect([quiz.errors, quiz.answeredCount, quiz.status]).toEqual([0, 1, 'playing']);
  });

  it('keeps the last unanswered flag current when skipping it', () => {
    const quiz = new Quiz(three, seededRng(4));
    const [first, second, third] = quiz.flags;
    quiz.answer(first.name);
    quiz.answer(second.name);
    quiz.skip();
    expect(quiz.current).toBe(third);
    expect(quiz.status).toBe('playing');
  });

  it('makes a selected flag current without changing any state', () => {
    const quiz = new Quiz(three, seededRng(4));
    const [, second, third] = quiz.flags;
    quiz.select(third.iso2);
    expect(quiz.current).toBe(third);
    quiz.select(second.iso2);
    quiz.select(second.iso2);
    expect(quiz.current).toBe(second);
    expect(quiz.flags.map((c) => quiz.stateOf(c.iso2))).toEqual(['open', 'open', 'open']);
    expect([quiz.errors, quiz.answeredCount]).toEqual([0, 0]);
  });

  it('rejects selecting an answered flag and keeps the current one', () => {
    const quiz = new Quiz(three, seededRng(5));
    const [first, second] = quiz.flags;
    quiz.answer(first.name);
    expect(quiz.stateOf(first.iso2)).toBe('answered');
    expect(() => quiz.select(first.iso2)).toThrow(`Flag ${first.iso2} is already answered`);
    expect(quiz.current).toBe(second);
  });

  it('rejects a flag that is not in the quiz', () => {
    const quiz = new Quiz(three, seededRng(6));
    const outside = easy[3];
    expect(() => quiz.select(outside.iso2)).toThrow(`Unknown flag ${outside.iso2}`);
    expect(() => quiz.stateOf(outside.iso2)).toThrow(`Unknown flag ${outside.iso2}`);
  });

  it('moves to the next unanswered flag after the answered one, passing over answered flags', () => {
    const quiz = new Quiz(four, seededRng(7));
    const [first, second, third] = quiz.flags;
    quiz.select(second.iso2);
    quiz.answer(second.name);
    expect(quiz.current).toBe(third);
    quiz.select(first.iso2);
    quiz.answer(first.name);
    expect(quiz.current).toBe(third);
  });

  it('wraps to the start of the grid after the last flag', () => {
    const quiz = new Quiz(three, seededRng(8));
    const [first, , third] = quiz.flags;
    quiz.select(third.iso2);
    quiz.answer(third.name);
    expect(quiz.current).toBe(first);
  });

  it('marks a missed flag answered once it is right, keeping its error', () => {
    const quiz = new Quiz(three, seededRng(9));
    const [first] = quiz.flags;
    quiz.answer('errado');
    quiz.answer(first.name);
    expect(quiz.stateOf(first.iso2)).toBe('answered');
    expect(quiz.missed).toEqual([first]);
    expect(quiz.score).toBe(0);
  });

  it('finishes when the last open flag lies before the current one', () => {
    const quiz = new Quiz(three, seededRng(10));
    const [first, second, third] = quiz.flags;
    quiz.select(second.iso2);
    quiz.answer(second.name);
    quiz.answer(third.name);
    expect(quiz.current).toBe(first);
    quiz.answer(first.name);
    expect(quiz.status).toBe('finished');
    expect(() => quiz.current).toThrow('Quiz is finished');
    expect(() => quiz.select(first.iso2)).toThrow('Quiz is finished');
  });

  it('ends early and counts the flags left unanswered', () => {
    const quiz = new Quiz(three, seededRng(11));
    quiz.answer(quiz.current.name);
    quiz.select(quiz.flags[2].iso2);
    quiz.end();
    expect(quiz.status).toBe('ended');
    expect([quiz.answeredCount, quiz.unanswered, quiz.score]).toEqual([1, 2, 1]);
    expect(() => quiz.current).toThrow('Quiz is ended');
    expect(() => quiz.end()).toThrow('Quiz is ended');
    expect(() => quiz.select(quiz.flags[1].iso2)).toThrow('Quiz is ended');
  });

  it('refuses an empty pool', () => {
    expect(() => new Quiz([], seededRng(12))).toThrow('at least one country');
  });
});
