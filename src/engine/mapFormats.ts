import { mapPool } from '../data/maps';
import { optionsWith, othersInPool } from './formats';
import type { Format, FormatContext } from './question';
import type { ContinentKey, Difficulty } from './pool';
import { pickOne, sample, shuffle } from './rng';

const always = () => true;

export const mapToNames: Format = {
  id: 'mapToNames',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'mapToNames', target, options: optionsWith(target, ctx, 4, rng) }),
};

export const nameToMap: Format = {
  id: 'nameToMap',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target) => ({ format: 'nameToMap', target }),
};

export const mapPairs: Format = {
  id: 'mapPairs',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'mapPairs',
    target,
    countries: shuffle([target, ...sample(othersInPool(target, ctx), 3, rng)], rng),
  }),
};

export const mapTrueFalse: Format = {
  id: 'mapTrueFalse',
  recall: false,
  choice: false,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'mapTrueFalse',
    target,
    shown: rng() < 0.5 ? target : pickOne(othersInPool(target, ctx), rng),
  }),
};

export const mapTypeName: Format = {
  id: 'mapTypeName',
  recall: true,
  choice: false,
  canTarget: always,
  build: (target) => ({ format: 'mapTypeName', target }),
};

export const MAP_FORMATS: readonly Format[] = [mapToNames, nameToMap, mapPairs, mapTrueFalse, mapTypeName];

export function mapContext(continent: ContinentKey, difficulty: Difficulty): FormatContext {
  const pool = mapPool(continent, difficulty);
  return { pool, world: pool, similarGroups: [], similarNames: [], similarDistractors: false };
}
