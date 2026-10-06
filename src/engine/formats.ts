import type { Country } from '../data/countries';
import type { Format, FormatContext } from './question';
import { pickOne, sample, shuffle, type Rng } from './rng';

export const CROP_SCALE = Math.SQRT2;

function othersInPool(target: Country, ctx: FormatContext): Country[] {
  return ctx.pool.filter((c) => c.iso2 !== target.iso2);
}

function optionsWith(target: Country, ctx: FormatContext, count: number, rng: Rng): Country[] {
  return shuffle([target, ...sample(othersInPool(target, ctx), count - 1, rng)], rng);
}

function similarGroupsInPool(target: Country, ctx: FormatContext): Country[][] {
  const inPool = new Map(ctx.pool.map((c) => [c.iso2, c]));
  return ctx.similarGroups
    .filter((group) => group.includes(target.iso2))
    .map((group) => group.flatMap((code) => inPool.get(code) ?? []))
    .filter((members) => members.length >= 2);
}

const always = () => true;

export const nameToFlags: Format = {
  id: 'nameToFlags',
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'nameToFlags',
    target,
    options: optionsWith(target, ctx, pickOne([4, 6], rng), rng),
  }),
};

export const flagToNames: Format = {
  id: 'flagToNames',
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'flagToNames',
    target,
    options: optionsWith(target, ctx, pickOne([4, 6], rng), rng),
  }),
};

export const flagToTwoNames: Format = {
  id: 'flagToTwoNames',
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'flagToTwoNames', target, options: optionsWith(target, ctx, 2, rng) }),
};

export const crop: Format = {
  id: 'crop',
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'crop',
    target,
    options: optionsWith(target, ctx, 4, rng),
    crop: { originX: rng() * 100, originY: rng() * 100 },
  }),
};

export const trueFalse: Format = {
  id: 'trueFalse',
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'trueFalse',
    target,
    shown: rng() < 0.5 ? target : pickOne(othersInPool(target, ctx), rng),
  }),
};

export const typeName: Format = {
  id: 'typeName',
  canTarget: always,
  build: (target) => ({ format: 'typeName', target }),
};

export const matchPairs: Format = {
  id: 'matchPairs',
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'matchPairs', target, countries: optionsWith(target, ctx, 4, rng) }),
};

export const oddOneOut: Format = {
  id: 'oddOneOut',
  canTarget: always,
  build: (target, ctx, rng) => {
    const intruder = pickOne(ctx.world.filter((c) => c.continent !== target.continent), rng);
    const others = sample(othersInPool(target, ctx), 2, rng);
    return { format: 'oddOneOut', target, intruder, options: shuffle([target, ...others, intruder], rng) };
  },
};

export const sortSimilar: Format = {
  id: 'sortSimilar',
  canTarget: (target, ctx) => similarGroupsInPool(target, ctx).length > 0,
  build: (target, ctx, rng) => ({
    format: 'sortSimilar',
    target,
    countries: shuffle(pickOne(similarGroupsInPool(target, ctx), rng), rng),
  }),
};

export const ALL_FORMATS: readonly Format[] = [
  nameToFlags,
  flagToNames,
  flagToTwoNames,
  crop,
  trueFalse,
  typeName,
  matchPairs,
  oddOneOut,
  sortSimilar,
];
