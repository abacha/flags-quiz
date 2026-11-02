import { MAP_ALL, type MapLevel } from '../data/maps';
import type { Difficulty } from './pool';
import { shuffle, type Rng } from './rng';
import type { Medal } from './round';

// A whole-continent Learn round plays a sample sized like one of its levels, since every country would take hundreds of answers.
export const GENERAL_SAMPLE = 20;
export const MAP_ALL_SAMPLE = 10;

const PRIORITY: readonly (Medal | undefined)[] = [undefined, 'bronze', 'silver', 'gold'];

export function practiceSample<T>(pool: readonly T[], medalOf: (item: T) => Medal | undefined, size: number, rng: Rng): T[] {
  const rank = (item: T) => PRIORITY.indexOf(medalOf(item));
  return shuffle(pool, rng)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, size);
}

export function learnPoolSize(difficulty: Difficulty, poolSize: number): number {
  return difficulty === 'general' ? Math.min(GENERAL_SAMPLE, poolSize) : poolSize;
}

export function mapLearnSize(level: MapLevel, poolSize: number): number {
  return level === MAP_ALL ? Math.min(MAP_ALL_SAMPLE, poolSize) : poolSize;
}
