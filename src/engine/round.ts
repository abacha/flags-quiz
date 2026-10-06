import type { Country } from '../data/countries';
import { grade, type Answer, type Grade } from './answer';
import { ALL_FORMATS } from './formats';
import type { Format, FormatContext, Question } from './question';
import { pickOne, type Rng } from './rng';

export const STARTING_LIVES = 3;
export const CORRECT_TO_WIN = 10;

export type RoundStatus = 'playing' | 'won' | 'lost';

export class Round {
  lives = STARTING_LIVES;
  correct = 0;
  readonly missed: Country[] = [];
  private readonly usedTargets = new Set<string>();
  private current: Question | null = null;

  constructor(
    private readonly ctx: FormatContext,
    private readonly rng: Rng,
    private readonly formats: readonly Format[] = ALL_FORMATS,
  ) {}

  get status(): RoundStatus {
    if (this.correct >= CORRECT_TO_WIN) return 'won';
    if (this.lives <= 0) return 'lost';
    return 'playing';
  }

  nextQuestion(): Question {
    if (this.status !== 'playing') throw new Error(`Round is ${this.status}`);
    if (this.current) throw new Error('Current question not answered yet');
    const unused = this.ctx.pool.filter((c) => !this.usedTargets.has(c.iso2));
    const eligible = this.formats.filter((format) => unused.some((c) => format.canTarget(c, this.ctx)));
    const format = pickOne(eligible, this.rng);
    const target = pickOne(unused.filter((c) => format.canTarget(c, this.ctx)), this.rng);
    this.usedTargets.add(target.iso2);
    this.current = format.build(target, this.ctx, this.rng);
    return this.current;
  }

  answer(answer: Answer): Grade {
    if (!this.current) throw new Error('No question to answer');
    const result = grade(this.current, answer);
    this.current = null;
    if (result.correct) {
      this.correct++;
    } else {
      this.lives--;
      for (const country of result.missed) if (!this.missed.includes(country)) this.missed.push(country);
    }
    return result;
  }
}
