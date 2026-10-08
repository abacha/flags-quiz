import type { Country } from '../data/countries';
import { acceptsTypedName } from './answer';
import { shuffle, type Rng } from './rng';

export type QuizStatus = 'playing' | 'finished' | 'ended';
export type FlagState = 'open' | 'missed' | 'answered';

export class Quiz {
  readonly flags: readonly Country[];
  private readonly answered = new Set<string>();
  private readonly errorCounts = new Map<string, number>();
  private currentIndex: number | null = 0;
  private endedEarly = false;

  constructor(pool: readonly Country[], rng: Rng) {
    if (pool.length === 0) throw new Error('Quiz needs at least one country');
    this.flags = shuffle(pool, rng);
  }

  get total(): number {
    return this.flags.length;
  }

  get status(): QuizStatus {
    if (this.endedEarly) return 'ended';
    return this.currentIndex === null ? 'finished' : 'playing';
  }

  get current(): Country {
    if (this.currentIndex === null) throw new Error(`Quiz is ${this.status}`);
    return this.flags[this.currentIndex];
  }

  get answeredCount(): number {
    return this.answered.size;
  }

  get errors(): number {
    const misses = [...this.errorCounts.values()].reduce((sum, count) => sum + count, 0);
    return this.endedEarly ? misses + this.unanswered.length : misses;
  }

  get score(): number {
    return this.answered.size - this.errors;
  }

  get unanswered(): Country[] {
    return this.flags.filter((c) => !this.answered.has(c.iso2));
  }

  get missed(): Country[] {
    return [...this.errorCounts.keys()].map((iso2) => this.flag(iso2));
  }

  stateOf(iso2: string): FlagState {
    this.flag(iso2);
    if (this.answered.has(iso2)) return 'answered';
    return this.errorCounts.has(iso2) ? 'missed' : 'open';
  }

  select(iso2: string): void {
    if (this.status !== 'playing') throw new Error(`Quiz is ${this.status}`);
    const country = this.flag(iso2);
    if (this.answered.has(iso2)) throw new Error(`Flag ${iso2} is already answered`);
    this.currentIndex = this.flags.indexOf(country);
  }

  answer(text: string): boolean {
    const flag = this.current;
    if (acceptsTypedName(flag, text)) {
      this.answered.add(flag.iso2);
      this.currentIndex = this.nextUnansweredAfter(this.flags.indexOf(flag));
      return true;
    }
    this.errorCounts.set(flag.iso2, (this.errorCounts.get(flag.iso2) ?? 0) + 1);
    return false;
  }

  skip(): void {
    const from = this.flags.indexOf(this.current);
    this.currentIndex = this.nextUnansweredAfter(from) ?? from;
  }

  end(): void {
    if (this.status !== 'playing') throw new Error(`Quiz is ${this.status}`);
    this.endedEarly = true;
    this.currentIndex = null;
  }

  private nextUnansweredAfter(from: number): number | null {
    for (let step = 1; step < this.flags.length; step++) {
      const index = (from + step) % this.flags.length;
      if (!this.answered.has(this.flags[index].iso2)) return index;
    }
    return null;
  }

  private flag(iso2: string): Country {
    const country = this.flags.find((c) => c.iso2 === iso2);
    if (!country) throw new Error(`Unknown flag ${iso2}`);
    return country;
  }
}
