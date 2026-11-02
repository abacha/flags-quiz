import type { Country } from '../data/countries';
import { grade, type Answer, type Grade } from './answer';
import { MAP_LADDER } from './mapFormats';
import type { Format, FormatContext, Question } from './question';
import { pickOne, type Rng } from './rng';
import { MEDAL_BY_LIVES, REVIEW_GAP, STARTING_LIVES, type Medal, type RoundStatus } from './round';

export class LadderRound {
  lives = STARTING_LIVES;
  readonly missed: Country[] = [];
  private readonly steps = new Map<string, number>();
  private readonly finished = new Set<string>();
  private readonly askedAt = new Map<string, number>();
  private asked = 0;
  private current: Question | null = null;
  private continued = false;

  constructor(
    private readonly ctx: FormatContext,
    start: number,
    private readonly rng: Rng,
    private readonly ladder: readonly Format[] = MAP_LADDER,
  ) {
    for (const country of ctx.pool) this.steps.set(country.iso2, start);
  }

  get done(): number {
    return this.finished.size;
  }

  get size(): number {
    return this.ctx.pool.length;
  }

  get status(): RoundStatus {
    if (this.done === this.size) return 'won';
    if (this.lives <= 0 && !this.continued) return 'lost';
    return 'playing';
  }

  get medal(): Medal | null {
    return this.continued ? null : (MEDAL_BY_LIVES[this.lives] ?? null);
  }

  stepOf(country: Country): number {
    return this.steps.get(country.iso2)!;
  }

  continueWithoutMedal(): void {
    if (this.status !== 'lost') throw new Error(`Round is ${this.status}`);
    this.continued = true;
  }

  nextQuestion(): Question {
    if (this.status !== 'playing') throw new Error(`Round is ${this.status}`);
    if (this.current) throw new Error('Current question not answered yet');
    const open = this.ctx.pool.filter((c) => !this.finished.has(c.iso2));
    const gap = Math.min(REVIEW_GAP, open.length - 1);
    const rested = open.filter((c) => {
      const askedAt = this.askedAt.get(c.iso2);
      return askedAt === undefined || this.asked - askedAt > gap;
    });
    const target = pickOne(rested.length > 0 ? rested : open, this.rng);
    this.current = this.ladder[this.stepOf(target)].build(target, this.ctx, this.rng);
    this.askedAt.set(target.iso2, this.asked++);
    return this.current;
  }

  answer(answer: Answer): Grade {
    if (!this.current) throw new Error('No question to answer');
    const result = grade(this.current, answer);
    if (result.typos.length > 0) return result;
    const { target } = this.current;
    this.current = null;
    const step = this.stepOf(target);
    if (result.correct) {
      if (step === this.ladder.length - 1) this.finished.add(target.iso2);
      else this.steps.set(target.iso2, step + 1);
    } else {
      this.lives = Math.max(0, this.lives - 1);
      this.steps.set(target.iso2, Math.max(0, step - 1));
      if (!this.missed.includes(target)) this.missed.push(target);
    }
    return result;
  }
}
