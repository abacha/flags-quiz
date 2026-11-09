import type { Country } from '../data/countries';
import { mapPool, nearestCountries, type MapLevel } from '../data/maps';
import type { Format, FormatContext } from './question';
import type { ContinentKey } from './pool';
import { sample, shuffle, type Rng } from './rng';

const always = () => true;
const NEAR_COUNT = 8;
const nearby = (target: Country, ctx: FormatContext) => nearestCountries(target, ctx.pool, NEAR_COUNT);

export const mapToNames: Format = {
  id: 'mapToNames',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'mapToNames', target, options: shuffle([target, ...sample(nearby(target, ctx), 3, rng)], rng) }),
};

export const mapTypeName: Format = {
  id: 'mapTypeName',
  recall: true,
  choice: false,
  canTarget: always,
  build: (target) => ({ format: 'mapTypeName', target }),
};

export const mapFlagToNames: Format = {
  id: 'mapFlagToNames',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'mapFlagToNames', target, options: shuffle([target, ...sample(nearby(target, ctx), 3, rng)], rng) }),
};

export const mapFindCountry: Format = {
  id: 'mapFindCountry',
  recall: false,
  choice: false,
  canTarget: always,
  build: (target) => ({ format: 'mapFindCountry', target }),
};

export const withoutAccents = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '');

export const MAP_LADDER: readonly Format[] = [mapFlagToNames, mapFindCountry, mapToNames, mapTypeName];

export function mapContext(continent: ContinentKey, level: MapLevel): FormatContext {
  const pool = mapPool(continent, level);
  return { pool, world: pool, similarGroups: [], similarNames: [], similarDistractors: false };
}
