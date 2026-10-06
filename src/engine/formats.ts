import type { Country } from '../data/countries';
import type { Crop, Format, FormatContext } from './question';
import { pickOne, sample, shuffle, type Rng } from './rng';

export const CROP_SCALE = Math.SQRT2;

function othersInPool(target: Country, ctx: FormatContext): Country[] {
  return ctx.pool.filter((c) => c.iso2 !== target.iso2);
}

function similarGroupsInPool(target: Country, ctx: FormatContext): Country[][] {
  const inPool = new Map(ctx.pool.map((c) => [c.iso2, c]));
  return ctx.similarGroups
    .filter((group) => group.includes(target.iso2))
    .map((group) => group.flatMap((code) => inPool.get(code) ?? []))
    .filter((members) => members.length >= 2);
}

function similarMatesInPool(target: Country, ctx: FormatContext): Country[] {
  if (!ctx.similarDistractors) return [];
  return [...new Set(similarGroupsInPool(target, ctx).flat())].filter((c) => c.iso2 !== target.iso2);
}

function optionsWith(target: Country, ctx: FormatContext, count: number, rng: Rng): Country[] {
  const preferred = shuffle(similarMatesInPool(target, ctx), rng).slice(0, count - 1);
  const rest = othersInPool(target, ctx).filter((c) => !preferred.includes(c));
  return shuffle([target, ...preferred, ...sample(rest, count - 1 - preferred.length, rng)], rng);
}

function randomCrop(rng: Rng): Crop {
  return { originX: rng() * 100, originY: rng() * 100 };
}

const always = () => true;
const hasSimilarGroup = (target: Country, ctx: FormatContext) => similarGroupsInPool(target, ctx).length > 0;
const similarGroup = (target: Country, ctx: FormatContext, rng: Rng) => shuffle(pickOne(similarGroupsInPool(target, ctx), rng), rng);

export const nameToFlags: Format = {
  id: 'nameToFlags',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'nameToFlags',
    target,
    options: optionsWith(target, ctx, pickOne([4, 6], rng), rng),
  }),
};

export const flagToNames: Format = {
  id: 'flagToNames',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'flagToNames',
    target,
    options: optionsWith(target, ctx, pickOne([4, 6], rng), rng),
  }),
};

export const flagToTwoNames: Format = {
  id: 'flagToTwoNames',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'flagToTwoNames', target, options: optionsWith(target, ctx, 2, rng) }),
};

export const crop: Format = {
  id: 'crop',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'crop', target, options: optionsWith(target, ctx, 4, rng), crop: randomCrop(rng) }),
};

export const trueFalse: Format = {
  id: 'trueFalse',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => {
    const mates = similarMatesInPool(target, ctx);
    const mismatch = () => pickOne(mates.length > 0 ? mates : othersInPool(target, ctx), rng);
    return { format: 'trueFalse', target, shown: rng() < 0.5 ? target : mismatch() };
  },
};

export const typeName: Format = {
  id: 'typeName',
  recall: true,
  canTarget: always,
  build: (target) => ({ format: 'typeName', target }),
};

export const matchPairs: Format = {
  id: 'matchPairs',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'matchPairs', target, countries: optionsWith(target, ctx, 4, rng) }),
};

export const oddOneOut: Format = {
  id: 'oddOneOut',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => {
    const intruder = pickOne(ctx.world.filter((c) => c.continent !== target.continent), rng);
    const others = sample(othersInPool(target, ctx), 2, rng);
    return { format: 'oddOneOut', target, intruder, options: shuffle([target, ...others, intruder], rng) };
  },
};

export const sortSimilar: Format = {
  id: 'sortSimilar',
  recall: false,
  canTarget: hasSimilarGroup,
  build: (target, ctx, rng) => ({ format: 'sortSimilar', target, countries: similarGroup(target, ctx, rng) }),
};

export const cropType: Format = {
  id: 'cropType',
  recall: true,
  canTarget: always,
  build: (target, _ctx, rng) => ({ format: 'cropType', target, crop: randomCrop(rng) }),
};

export const typeSimilar: Format = {
  id: 'typeSimilar',
  recall: true,
  canTarget: hasSimilarGroup,
  build: (target, ctx, rng) => ({ format: 'typeSimilar', target, countries: similarGroup(target, ctx, rng) }),
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
  cropType,
  typeSimilar,
];
