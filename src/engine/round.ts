import type { Country } from '../data/countries';
import { grade, type Answer, type Grade } from './answer';
import { ALL_FORMATS } from './formats';
import type { Format, FormatContext, FormatId, Question } from './question';
import { pickOne, pickWeighted, type Rng } from './rng';

export const STARTING_LIVES = 3;
export const REVIEW_GAP = 5;

export interface RoundSettings {
  correctToWin: number;
  recallWeight: number;
}

export type RoundStatus = 'playing' | 'won' | 'lost';
export type Medal = 'gold' | 'silver' | 'bronze';

const MEDAL_BY_LIVES: Record<number, Medal> = { 3: 'gold', 2: 'silver', 1: 'bronze' };

const GROUP_FORMATS: readonly FormatId[] = ['sortSimilar', 'typeSimilar', 'sortSimilarNames'];
const showsSimilarGroup = (id: FormatId) => GROUP_FORMATS.includes(id);

function spentBy(question: Question): Country[] {
  return question.format === 'sortSimilar' || question.format === 'typeSimilar' || question.format === 'sortSimilarNames'
    ? question.countries
    : [question.target];
}

export class Round {
  lives = STARTING_LIVES;
  correct = 0;
  readonly missed: Country[] = [];
  private readonly spent = new Set<string>();
  private readonly askedAt = new Map<string, number>();
  private asked = 0;
  private currentPass = 1;
  private current: Question | null = null;
  private continued = false;

  constructor(
    private readonly ctx: FormatContext,
    private readonly settings: RoundSettings,
    private readonly rng: Rng,
    private readonly formats: readonly Format[] = ALL_FORMATS,
  ) {}

  get correctToWin(): number {
    return this.settings.correctToWin;
  }

  get pass(): number {
    return this.currentPass;
  }

  get status(): RoundStatus {
    if (this.correct >= this.settings.correctToWin) return 'won';
    if (this.lives <= 0 && !this.continued) return 'lost';
    return 'playing';
  }

  get medal(): Medal | null {
    return this.continued ? null : (MEDAL_BY_LIVES[this.lives] ?? null);
  }

  continueWithoutMedal(): void {
    if (this.status !== 'lost') throw new Error(`Round is ${this.status}`);
    this.continued = true;
  }

  nextQuestion(): Question {
    if (this.status !== 'playing') throw new Error(`Round is ${this.status}`);
    if (this.current) throw new Error('Current question not answered yet');
    let targets = this.targets();
    if (targets.length === 0) {
      this.spent.clear();
      this.currentPass++;
      targets = this.targets();
    }
    const target = pickOne(targets, this.rng);
    const format = pickWeighted(this.formatsFor(target), (f) => (f.recall ? this.settings.recallWeight : (f.weight ?? 1)), this.rng);
    this.current = format.build(target, this.contextFor(format), this.rng);
    for (const country of spentBy(this.current)) if (this.askedAt.has(country.iso2)) this.spent.add(country.iso2);
    this.askedAt.set(target.iso2, this.asked++);
    return this.current;
  }

  answer(answer: Answer): Grade {
    if (!this.current) throw new Error('No question to answer');
    const result = grade(this.current, answer);
    this.current = null;
    if (result.correct) {
      this.correct++;
    } else {
      this.lives = Math.max(0, this.lives - 1);
      for (const country of result.missed) if (!this.missed.includes(country)) this.missed.push(country);
    }
    return result;
  }

  private targets(): Country[] {
    const available = this.ctx.pool.filter((c) => this.isAvailable(c) && this.formatsFor(c).length > 0);
    if (this.currentPass === 1) return available;
    const missedFirst = available.filter((c) => this.missed.includes(c));
    return missedFirst.length > 0 ? missedFirst : available;
  }

  private isAvailable(country: Country): boolean {
    const askedAt = this.askedAt.get(country.iso2);
    const gap = Math.min(REVIEW_GAP, this.ctx.pool.length - 1);
    return !this.spent.has(country.iso2) && (askedAt === undefined || this.asked - askedAt > gap);
  }

  private formatsFor(target: Country): Format[] {
    return this.formats.filter(
      (format) => (format.choice || this.askedAt.has(target.iso2)) && format.canTarget(target, this.contextFor(format)),
    );
  }

  private contextFor(format: Format): FormatContext {
    if (!showsSimilarGroup(format.id)) return this.ctx;
    return { ...this.ctx, pool: this.ctx.pool.filter((c) => this.askedAt.has(c.iso2) && this.isAvailable(c)) };
  }
}
