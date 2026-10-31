import { describe, expect, it } from 'vitest';
import { countries, type Country } from '../data/countries';
import { judgeTypedCapital } from './answer';
import { poolFor } from './pool';
import { Quiz } from './quiz';
import { seededRng } from './rng';

const c = (code: string) => countries.find((country) => country.iso2 === code)!;
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
      expect(quiz.answer(quiz.current.name)).toBe('right');
    }
    expect(asked).toEqual(quiz.flags);
    expect(quiz.status).toBe('finished');
    expect([quiz.answeredCount, quiz.score, quiz.errors]).toEqual([20, 20, 0]);
    expect(quiz.unanswered).toEqual([]);
  });

  it('keeps the flag current and open, without an error, on a typo', () => {
    const quiz = new Quiz([c('ar'), c('br'), c('cl')], seededRng(2));
    quiz.select('ar');
    expect(quiz.answer('Agrentina')).toBe('typo');
    expect(quiz.current).toBe(c('ar'));
    expect(quiz.stateOf('ar')).toBe('open');
    expect([quiz.errors, quiz.score, quiz.answeredCount]).toEqual([0, 0, 0]);
  });

  it('keeps playing after a typo on the last open flag', () => {
    const quiz = new Quiz([c('ar'), c('br')], seededRng(2));
    quiz.select('br');
    quiz.answer('Brasil');
    expect(quiz.answer('Agrentina')).toBe('typo');
    expect(quiz.status).toBe('playing');
  });

  it('keeps the flag current, counts an error and marks it missed on a wrong answer', () => {
    const quiz = new Quiz(three, seededRng(2));
    const flag = quiz.current;
    expect(quiz.answer('nenhum país')).toBe('wrong');
    expect(quiz.answer('outro')).toBe('wrong');
    expect(quiz.current).toBe(flag);
    expect([quiz.errors, quiz.score, quiz.answeredCount]).toEqual([2, -2, 0]);
    expect(quiz.missed).toEqual([flag]);
    expect(quiz.stateOf(flag.iso2)).toBe('missed');
  });

  it('accepts aliases and ignores accents and case', () => {
    const cd = countries.find((c) => c.iso2 === 'cd')!;
    const quiz = new Quiz([cd], seededRng(3));
    expect(quiz.answer('  rdc ')).toBe('right');
    expect(quiz.status).toBe('finished');
  });

  it('skips to the next unanswered flag in grid order, wrapping, without changing any state', () => {
    const quiz = new Quiz(three, seededRng(4));
    const [first, second, third] = quiz.flags;
    quiz.skip();
    expect(quiz.current).toBe(second);
    expect(quiz.answer(second.name)).toBe('right');
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

  it('counts each flag left unanswered on an early end as one error, on top of its misses', () => {
    const quiz = new Quiz(three, seededRng(12));
    quiz.answer('errado');
    quiz.answer('errado');
    expect([quiz.errors, quiz.score]).toEqual([2, -2]);
    quiz.end();
    expect([quiz.errors, quiz.score]).toEqual([5, -5]);
    expect(quiz.missed).toEqual([quiz.flags[0]]);
  });

  it('ends early and lists the flags left unanswered in grid order', () => {
    const quiz = new Quiz(three, seededRng(11));
    quiz.answer(quiz.current.name);
    quiz.select(quiz.flags[2].iso2);
    quiz.end();
    expect(quiz.status).toBe('ended');
    expect([quiz.answeredCount, quiz.errors, quiz.score]).toEqual([1, 2, -1]);
    expect(quiz.unanswered).toEqual([quiz.flags[1], quiz.flags[2]]);
    expect(() => quiz.current).toThrow('Quiz is ended');
    expect(() => quiz.end()).toThrow('Quiz is ended');
    expect(() => quiz.select(quiz.flags[1].iso2)).toThrow('Quiz is ended');
  });

  it('refuses an empty pool', () => {
    expect(() => new Quiz([], seededRng(12))).toThrow('at least one country');
  });

  describe('moving to the nearest country', () => {
    const [a, b, c, d] = four;
    const position = new Map([a, b, c, d].map((country, i) => [country, [0, 1, 3, 10][i]]));
    const nearest = (from: Country, candidates: readonly Country[]) =>
      candidates.reduce((best, country) =>
        Math.abs(position.get(country)! - position.get(from)!) < Math.abs(position.get(best)! - position.get(from)!) ? country : best,
      );
    const lineQuiz = () => new Quiz(four, seededRng(1), nearest);

    it('moves to the nearest unanswered country after a right answer', () => {
      const quiz = lineQuiz();
      quiz.select(d.iso2);
      quiz.answer(d.name);
      expect(quiz.current).toBe(c);
      quiz.select(a.iso2);
      quiz.answer(a.name);
      expect(quiz.current).toBe(b);
    });

    it('skips to the nearest country not skipped since the last right answer', () => {
      const quiz = lineQuiz();
      quiz.select(b.iso2);
      quiz.skip();
      expect(quiz.current).toBe(a);
      quiz.skip();
      expect(quiz.current).toBe(c);
      quiz.skip();
      expect(quiz.current).toBe(d);
    });

    it('skips to the nearest country again once every other one was skipped', () => {
      const quiz = lineQuiz();
      quiz.select(b.iso2);
      for (let i = 0; i < 4; i++) quiz.skip();
      expect(quiz.current).toBe(c);
    });

    it('forgets the skipped countries after a right answer', () => {
      const quiz = lineQuiz();
      quiz.select(b.iso2);
      quiz.skip();
      quiz.answer(a.name);
      expect(quiz.current).toBe(b);
    });

    it('keeps the last unanswered country current when skipping it', () => {
      const quiz = lineQuiz();
      for (const country of [a, b, c]) {
        quiz.select(country.iso2);
        quiz.answer(country.name);
      }
      quiz.skip();
      expect(quiz.current).toBe(d);
    });
  });

  describe('with a capital judge', () => {
    it('accepts any accepted capital of the country', () => {
      const quiz = new Quiz([c('bo'), c('fr')], seededRng(1), undefined, judgeTypedCapital);
      quiz.select('bo');
      expect(quiz.answer('La Paz')).toBe('right');
      expect(quiz.stateOf('bo')).toBe('answered');
    });

    it('tells a typo from a wrong capital without counting an error for the typo', () => {
      const quiz = new Quiz([c('bo'), c('fr')], seededRng(1), undefined, judgeTypedCapital);
      quiz.select('fr');
      expect(quiz.answer('Pariss')).toBe('typo');
      expect(quiz.errors).toBe(0);
      expect(quiz.stateOf('fr')).toBe('open');
    });
  });
});
