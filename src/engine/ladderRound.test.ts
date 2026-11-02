import { describe, expect, it } from 'vitest';
import type { Answer } from './answer';
import { LadderRound } from './ladderRound';
import { MAP_ALL } from '../data/maps';
import { mapContext } from './mapFormats';
import type { Question } from './question';
import { seededRng } from './rng';
import { REVIEW_GAP } from './round';

const ctx = mapContext('africa', 'west-coast');

function rightAnswer(q: Question): Answer {
  return q.format === 'mapSpellName' || q.format === 'mapTypeName' ? { kind: 'text', text: q.target.name } : { kind: 'choice', iso2: q.target.iso2 };
}

function wrongAnswer(q: Question): Answer {
  return q.format === 'mapSpellName' || q.format === 'mapTypeName' ? { kind: 'text', text: 'nenhum país' } : { kind: 'choice', iso2: '' };
}

const answerRight = (round: LadderRound) => round.answer(rightAnswer(round.nextQuestion()));

function playToTheEnd(round: LadderRound): void {
  while (round.status === 'playing') answerRight(round);
}

describe('LadderRound', () => {
  it('asks every country at the start step first', () => {
    for (const [start, format] of [
      [0, 'mapFlagToNames'],
      [2, 'mapToNames'],
    ] as const) {
      const round = new LadderRound(ctx, start, seededRng(1));
      const first = new Map<string, string>();
      while (first.size < ctx.pool.length) {
        const q = round.nextQuestion();
        if (!first.has(q.target.iso2)) first.set(q.target.iso2, q.format);
        round.answer(rightAnswer(q));
      }
      expect(new Set(first.values())).toEqual(new Set([format]));
    }
  });

  it('climbs one step on a right answer and drops one on a wrong one', () => {
    const round = new LadderRound(ctx, 0, seededRng(2));
    const target = round.nextQuestion().target;
    round.answer({ kind: 'choice', iso2: target.iso2 });
    expect(round.stepOf(target)).toBe(1);
    let q = round.nextQuestion();
    while (q.target !== target) {
      round.answer(rightAnswer(q));
      q = round.nextQuestion();
    }
    round.answer(rightAnswer(q));
    expect(round.stepOf(target)).toBe(2);
    q = round.nextQuestion();
    while (q.target !== target) {
      round.answer(rightAnswer(q));
      q = round.nextQuestion();
    }
    round.answer(wrongAnswer(q));
    expect(round.stepOf(target)).toBe(1);
    expect(round.lives).toBe(2);
    expect(round.missed).toEqual([target]);
  });

  it('never drops below step 1', () => {
    const round = new LadderRound(ctx, 0, seededRng(3));
    const q = round.nextQuestion();
    round.answer(wrongAnswer(q));
    expect(round.stepOf(q.target)).toBe(0);
  });

  it('marks a country done after the last step and stops asking it', () => {
    const round = new LadderRound(ctx, 4, seededRng(4));
    const q = round.nextQuestion();
    expect(q.format).toBe('mapTypeName');
    round.answer(rightAnswer(q));
    expect(round.done).toBe(1);
    while (round.status === 'playing') expect(answerRightTarget(round)).not.toBe(q.target);
  });

  it('wins only when every country is done, with the medal by lives left', () => {
    const perfect = new LadderRound(ctx, 0, seededRng(5));
    playToTheEnd(perfect);
    expect([perfect.status, perfect.medal, perfect.done, perfect.size]).toEqual(['won', 'gold', ctx.pool.length, ctx.pool.length]);

    const once = new LadderRound(ctx, 0, seededRng(5));
    once.answer(wrongAnswer(once.nextQuestion()));
    expect(once.status).toBe('playing');
    playToTheEnd(once);
    expect([once.status, once.medal]).toEqual(['won', 'silver']);
  });

  it('keeps step and lives on a typo', () => {
    const round = new LadderRound(mapContext('africa', 'west-coast'), 4, seededRng(6));
    const q = round.nextQuestion();
    const name = q.target.name;
    const typo = name.slice(0, 2) + name[3] + name[2] + name.slice(4);
    const result = round.answer({ kind: 'text', text: typo });
    expect(result.typos).toEqual([q.target]);
    expect([round.stepOf(q.target), round.lives]).toEqual([4, 3]);
    expect(() => round.nextQuestion()).toThrow();
  });

  it('asks the last remaining country again despite the gap', () => {
    const round = new LadderRound(ctx, 4, seededRng(7));
    while (round.done < round.size - 1) answerRight(round);
    const last = round.nextQuestion();
    round.answer(wrongAnswer(last));
    expect(round.nextQuestion().target).toBe(last.target);
  });

  it('goes on after continuing without a medal and ends without one', () => {
    const round = new LadderRound(ctx, 0, seededRng(8));
    for (let i = 0; i < 3; i++) round.answer(wrongAnswer(round.nextQuestion()));
    expect(round.status).toBe('lost');
    round.continueWithoutMedal();
    playToTheEnd(round);
    expect([round.status, round.medal]).toEqual(['won', null]);
  });

  it('never repeats a country within the review gap while others remain', () => {
    const round = new LadderRound(ctx, 0, seededRng(9));
    const targets: string[] = [];
    while (round.status === 'playing') {
      const q = round.nextQuestion();
      const remaining = round.size - round.done;
      const gap = Math.min(REVIEW_GAP, remaining - 1);
      if (gap > 0) expect(targets.slice(-gap)).not.toContain(q.target.iso2);
      targets.push(q.target.iso2);
      round.answer(rightAnswer(q));
    }
  });

  it('asks only the given targets and draws options from the whole context', () => {
    const continent = mapContext('africa', MAP_ALL);
    const targets = continent.pool.slice(0, 3);
    const round = new LadderRound(continent, 0, seededRng(10), targets);
    expect(round.size).toBe(3);
    const options = new Set<string>();
    while (round.status === 'playing') {
      const q = round.nextQuestion();
      expect(targets).toContain(q.target);
      if ('options' in q) for (const o of q.options) options.add(o.iso2);
      round.answer(rightAnswer(q));
    }
    expect([...options].some((iso2) => !targets.some((t) => t.iso2 === iso2))).toBe(true);
  });
});

function answerRightTarget(round: LadderRound) {
  const q = round.nextQuestion();
  round.answer(rightAnswer(q));
  return q.target;
}
