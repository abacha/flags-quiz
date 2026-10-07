import type { Country } from '../data/countries';
import { acceptsTypedName } from './answer';
import { shuffle, type Rng } from './rng';

export type QuizStatus = 'playing' | 'finished' | 'ended';

export class Quiz {
  readonly total: number;
  private readonly unseen: Country[];
  private readonly skipped: Country[] = [];
  private readonly answered = new Set<string>();
  private readonly errorCounts = new Map<Country, number>();
  private shown: Country | null;
  private endedEarly = false;

  constructor(pool: readonly Country[], rng: Rng) {
    if (pool.length === 0) throw new Error('Quiz needs at least one country');
    this.total = pool.length;
    this.unseen = shuffle(pool, rng);
    this.shown = this.unseen.shift()!;
  }

  get status(): QuizStatus {
    if (this.endedEarly) return 'ended';
    return this.shown ? 'playing' : 'finished';
  }

  get current(): Country {
    if (!this.shown) throw new Error(`Quiz is ${this.status}`);
    return this.shown;
  }

  get answeredCount(): number {
    return this.answered.size;
  }

  get skippedCount(): number {
    return this.skipped.length;
  }

  get errors(): number {
    return [...this.errorCounts.values()].reduce((sum, count) => sum + count, 0);
  }

  get score(): number {
    return this.answered.size - this.errors;
  }

  get unanswered(): number {
    return this.total - this.answered.size;
  }

  get missed(): Country[] {
    return [...this.errorCounts.keys()];
  }

  answer(text: string): boolean {
    const flag = this.current;
    if (acceptsTypedName(flag, text)) {
      this.answered.add(flag.iso2);
      this.advance();
      return true;
    }
    this.errorCounts.set(flag, (this.errorCounts.get(flag) ?? 0) + 1);
    return false;
  }

  skip(): void {
    this.skipped.push(this.current);
    this.advance();
  }

  openSkipped(): void {
    const onScreen = this.current;
    const oldest = this.skipped.shift();
    if (!oldest) throw new Error('No skipped flag');
    this.unseen.unshift(onScreen);
    this.shown = oldest;
  }

  end(): void {
    if (this.status !== 'playing') throw new Error(`Quiz is ${this.status}`);
    this.endedEarly = true;
    this.shown = null;
  }

  private advance(): void {
    this.shown = this.unseen.shift() ?? this.skipped.shift() ?? null;
  }
}
