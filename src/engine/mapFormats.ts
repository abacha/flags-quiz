import type { Country } from '../data/countries';
import { MAP_ALL, mapPool, nearestCountries, type MapLevel } from '../data/maps';
import type { Format, FormatContext } from './question';
import type { ContinentKey, Difficulty } from './pool';
import { pickOne, sample, shuffle } from './rng';

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
    countries: shuffle([target, ...sample(nearby(target, ctx), 3, rng)], rng),
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
    shown: rng() < 0.5 ? target : pickOne(nearby(target, ctx), rng),
  }),
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

export const mapToFlags: Format = {
  id: 'mapToFlags',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'mapToFlags', target, options: shuffle([target, ...sample(nearby(target, ctx), 3, rng)], rng) }),
};

const SEPARATOR = /[\s\-'’]/u;

export const isSeparator = (char: string) => SEPARATOR.test(char);

export function spelledLetters(name: string): string[] {
  return [...name].filter((char) => !isSeparator(char));
}

export const mapSpellName: Format = {
  id: 'mapSpellName',
  recall: false,
  choice: false,
  canTarget: always,
  build: (target, _ctx, rng) => ({ format: 'mapSpellName', target, letters: shuffle(spelledLetters(target.name), rng) }),
};

export const MAP_LADDER: readonly Format[] = [mapFlagToNames, mapToFlags, mapToNames, mapSpellName, mapTypeName];

export function ladderStart(level: MapLevel): number {
  return level === MAP_ALL ? 2 : 0;
}

const CONTINENT_FORMATS: readonly Format[] = [mapToNames, nameToMap, mapPairs, mapTrueFalse, mapTypeName];
const REGION_FORMATS: readonly Format[] = [mapToNames, { ...nameToMap, weight: 3 }, mapTrueFalse, mapTypeName];

export function mapFormats(level: MapLevel): readonly Format[] {
  return level === MAP_ALL ? CONTINENT_FORMATS : REGION_FORMATS;
}

export function mapDifficulty(level: MapLevel): Difficulty {
  return level === MAP_ALL ? 'general' : 'medium';
}

export function mapContext(continent: ContinentKey, level: MapLevel): FormatContext {
  const pool = mapPool(continent, level);
  return { pool, world: pool, similarGroups: [], similarNames: [], similarDistractors: false };
}
