import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { poolFor } from './pool';
import { Quiz } from './quiz';
import { seededRng } from './rng';

const easy = poolFor(countries, 'africa', 'easy');
const three = easy.slice(0, 3);

describe('Quiz', () => {
  it('asks every country of the pool once', () => {
    const quiz = new Quiz(easy, seededRng(1));
    const asked: string[] = [];
    while (quiz.status === 'playing') {
      asked.push(quiz.current.iso2);
      expect(quiz.answer(quiz.current.name)).toBe(true);
    }
    expect(quiz.status).toBe('finished');
    expect(new Set(asked)).toEqual(new Set(easy.map((c) => c.iso2)));
    expect([quiz.answeredCount, quiz.score, quiz.errors, quiz.unanswered]).toEqual([18, 18, 0, 0]);
  });

  it('keeps the flag and counts an error on a wrong answer', () => {
    const quiz = new Quiz(three, seededRng(2));
    const flag = quiz.current;
    expect(quiz.answer('nenhum país')).toBe(false);
    expect(quiz.answer('outro')).toBe(false);
    expect(quiz.current).toBe(flag);
    expect([quiz.errors, quiz.score, quiz.answeredCount]).toEqual([2, -2, 0]);
    expect(quiz.missed).toEqual([flag]);
  });

  it('accepts aliases and ignores accents and case', () => {
    const cd = countries.find((c) => c.iso2 === 'cd')!;
    const quiz = new Quiz([cd], seededRng(3));
    expect(quiz.answer('  rdc ')).toBe(true);
    expect(quiz.status).toBe('finished');
  });

  it('brings skipped flags back after the unseen ones, oldest first', () => {
    const quiz = new Quiz(three, seededRng(4));
    const first = quiz.current;
    quiz.skip();
    const second = quiz.current;
    quiz.skip();
    expect(quiz.skippedCount).toBe(2);
    quiz.answer(quiz.current.name);
    expect(quiz.current).toBe(first);
    quiz.answer(first.name);
    expect(quiz.current).toBe(second);
  });

  it('keeps showing the last flag when it is skipped again', () => {
    const quiz = new Quiz(three.slice(0, 1), seededRng(5));
    const only = quiz.current;
    quiz.skip();
    expect(quiz.status).toBe('playing');
    expect(quiz.current).toBe(only);
    expect(quiz.skippedCount).toBe(0);
  });

  it('opens the oldest skipped flag and puts the flag on screen back in line', () => {
    const quiz = new Quiz(three, seededRng(6));
    const first = quiz.current;
    quiz.skip();
    const onScreen = quiz.current;
    quiz.openSkipped();
    expect(quiz.current).toBe(first);
    expect(quiz.skippedCount).toBe(0);
    quiz.answer(first.name);
    expect(quiz.current).toBe(onScreen);
  });

  it('sends a re-skipped flag to the back of the skipped list', () => {
    const quiz = new Quiz(three, seededRng(7));
    const first = quiz.current;
    quiz.skip();
    const second = quiz.current;
    quiz.skip();
    const third = quiz.current;
    quiz.openSkipped();
    expect(quiz.current).toBe(first);
    quiz.skip();
    expect(quiz.current).toBe(third);
    quiz.answer(third.name);
    expect(quiz.current).toBe(second);
    quiz.answer(second.name);
    expect(quiz.current).toBe(first);
  });

  it('refuses to open skipped flags when none is skipped', () => {
    expect(() => new Quiz(three, seededRng(8)).openSkipped()).toThrow('No skipped flag');
  });

  it('ends early and counts the flags left unanswered', () => {
    const quiz = new Quiz(three, seededRng(9));
    quiz.answer(quiz.current.name);
    quiz.skip();
    quiz.end();
    expect(quiz.status).toBe('ended');
    expect([quiz.answeredCount, quiz.unanswered, quiz.score]).toEqual([1, 2, 1]);
    expect(() => quiz.current).toThrow('Quiz is ended');
    expect(() => quiz.end()).toThrow('Quiz is ended');
  });

  it('refuses an empty pool', () => {
    expect(() => new Quiz([], seededRng(10))).toThrow('at least one country');
  });
});
