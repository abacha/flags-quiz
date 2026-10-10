import type { Country } from '../data/countries';
import { grade, type Answer, type Grade } from './answer';
import { ALL_FORMATS } from './formats';
import type { Format, FormatContext, FormatId, Question } from './question';
import { pickOne, pickWeighted, type Rng } from './rng';

export const STARTING_LIVES = 3;

export interface RoundSettings {
  correctToWin: number;
  recallWeight: number;
}

export type RoundStatus = 'playing' | 'won' | 'lost';

const showsSimilarGroup = (id: FormatId) => id === 'sortSimilar' || id === 'typeSimilar';

function spentBy(question: Question): Country[] {
  return question.format === 'sortSimilar' || question.format === 'typeSimilar' ? question.countries : [question.target];
}

export class Round {
  lives = STARTING_LIVES;
  correct = 0;
  readonly missed: Country[] = [];
  private readonly spent = new Set<string>();
  private readonly seen = new Set<string>();
  private previous: string | null = null;
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
    if (!this.formats.some((format) => this.targetsOf(format, candidates).length > 0)) {
      this.spent.clear();
      this.pass++;
      candidates = this.candidates();
    }
    const eligible = this.formats.filter((format) => this.targetsOf(format, candidates).length > 0);
    const format = pickWeighted(eligible, (f) => (f.recall ? this.settings.recallWeight : 1), this.rng);
    const target = pickOne(this.targetsOf(format, candidates), this.rng);
    this.current = format.build(target, this.contextFor(format), this.rng);
    for (const country of spentBy(this.current)) if (this.seen.has(country.iso2)) this.spent.add(country.iso2);
    this.seen.add(target.iso2);
    this.previous = target.iso2;
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
    const unspent = this.ctx.pool.filter((c) => !this.spent.has(c.iso2) && c.iso2 !== this.previous);
    if (this.pass === 1) return unspent;
    const missedFirst = unspent.filter((c) => this.missed.includes(c));
    return missedFirst.length > 0 ? missedFirst : unspent;
  }

  private targetsOf(format: Format, candidates: Country[]): Country[] {
    const ctx = this.contextFor(format);
    return candidates.filter((c) => (format.choice || this.seen.has(c.iso2)) && format.canTarget(c, ctx));
  }

  private contextFor(format: Format): FormatContext {
    if (!showsSimilarGroup(format.id)) return this.ctx;
    return { ...this.ctx, pool: this.ctx.pool.filter((c) => this.seen.has(c.iso2) && !this.spent.has(c.iso2)) };
  }
}
