import type { Country } from '../data/countries';
import { grade, type Answer, type Grade } from './answer';
import { ALL_FORMATS } from './formats';
import type { Format, FormatContext, Question } from './question';
import { pickOne, pickWeighted, type Rng } from './rng';

export const STARTING_LIVES = 3;

export interface RoundSettings {
  correctToWin: number;
  recallWeight: number;
}

export type RoundStatus = 'playing' | 'won' | 'lost';

function spentBy(question: Question): Country[] {
  return question.format === 'sortSimilar' || question.format === 'typeSimilar' ? question.countries : [question.target];
}

export class Round {
  lives = STARTING_LIVES;
  correct = 0;
  readonly missed: Country[] = [];
  private readonly spent = new Set<string>();
  private pass = 1;
  private current: Question | null = null;

  constructor(
    private readonly ctx: FormatContext,
    private readonly settings: RoundSettings,
    private readonly rng: Rng,
    private readonly formats: readonly Format[] = ALL_FORMATS,
  ) {}

  get correctToWin(): number {
    return this.settings.correctToWin;
  }

  get status(): RoundStatus {
    if (this.correct >= this.settings.correctToWin) return 'won';
    if (this.lives <= 0) return 'lost';
    return 'playing';
  }

  nextQuestion(): Question {
    if (this.status !== 'playing') throw new Error(`Round is ${this.status}`);
    if (this.current) throw new Error('Current question not answered yet');
    let candidates = this.candidates();
    if (!this.formats.some((format) => candidates.some((c) => format.canTarget(c, this.ctx)))) {
      this.spent.clear();
      this.pass++;
      candidates = this.candidates();
    }
    const eligible = this.formats.filter((format) => candidates.some((c) => format.canTarget(c, this.ctx)));
    const format = pickWeighted(eligible, (f) => (f.recall ? this.settings.recallWeight : 1), this.rng);
    const target = pickOne(candidates.filter((c) => format.canTarget(c, this.ctx)), this.rng);
    this.current = format.build(target, this.ctx, this.rng);
    for (const country of spentBy(this.current)) this.spent.add(country.iso2);
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

  private candidates(): Country[] {
    const unspent = this.ctx.pool.filter((c) => !this.spent.has(c.iso2));
    if (this.pass === 1) return unspent;
    const missedFirst = unspent.filter((c) => this.missed.includes(c));
    return missedFirst.length > 0 ? missedFirst : unspent;
  }
}
