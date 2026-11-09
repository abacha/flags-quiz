import { capitalPool, nearestByCapital, similarCapitals } from '../data/capitals';
import { similarNames, type Country } from '../data/countries';
import { groupsInPool } from './formats';
import type { Format, FormatContext } from './question';
import type { ContinentKey, Difficulty } from './pool';
import { shuffle, type Rng } from './rng';

const always = () => true;
const NEAR_COUNT = 8;
const OPTION_COUNT = 4;

const lookAlikes = (groups: Parameters<typeof groupsInPool>[0], target: Country, ctx: FormatContext) =>
  groupsInPool(groups, target, ctx)
    .flat()
    .filter((c) => c.iso2 !== target.iso2);

export function trickyOthers(target: Country, ctx: FormatContext, count: number, rng: Rng): Country[] {
  const ranked = [
    ...shuffle(lookAlikes(ctx.similarNames, target, ctx), rng),
    ...shuffle(lookAlikes(similarCapitals, target, ctx), rng),
    ...shuffle(nearestByCapital(target, ctx.pool, NEAR_COUNT), rng),
  ];
  return [...new Set(ranked)].slice(0, count);
}

const withTricky = (target: Country, ctx: FormatContext, rng: Rng) =>
  shuffle([target, ...trickyOthers(target, ctx, OPTION_COUNT - 1, rng)], rng);

export const capitalOnMap: Format = {
  id: 'capitalOnMap',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'capitalOnMap',
    target,
    options: shuffle([target, ...nearestByCapital(target, ctx.pool, OPTION_COUNT - 1)], rng),
  }),
};

export const countryToCapitals: Format = {
  id: 'countryToCapitals',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'countryToCapitals', target, options: withTricky(target, ctx, rng) }),
};

export const typeCapital: Format = {
  id: 'typeCapital',
  recall: true,
  choice: false,
  canTarget: always,
  build: (target) => ({ format: 'typeCapital', target }),
};

export const typeCapitalCountry: Format = {
  id: 'typeCapitalCountry',
  recall: true,
  choice: false,
  canTarget: always,
  build: (target) => ({ format: 'typeCapitalCountry', target }),
};

export const CAPITAL_LADDER: readonly Format[] = [capitalOnMap, countryToCapitals, typeCapital, typeCapitalCountry];

export function capitalContext(continent: ContinentKey, difficulty: Difficulty): FormatContext {
  const pool = capitalPool(continent, difficulty);
  return { pool, world: pool, similarGroups: [], similarNames, similarDistractors: true };
}
