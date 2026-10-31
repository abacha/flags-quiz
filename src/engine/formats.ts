import type { Country } from '../data/countries';
import type { Crop, Format, FormatContext } from './question';
import { pickOne, sample, shuffle, type Rng } from './rng';

export const CROP_SCALE = 2;

export function othersInPool(target: Country, ctx: FormatContext): Country[] {
  return ctx.pool.filter((c) => c.iso2 !== target.iso2);
}

function continentMatesInPool(target: Country, ctx: FormatContext): Country[] {
  return othersInPool(target, ctx).filter((c) => c.continent === target.continent);
}

type Groups = FormatContext['similarGroups'];

export function groupsInPool(groups: Groups, target: Country, ctx: FormatContext): Country[][] {
  const inPool = new Map(ctx.pool.map((c) => [c.iso2, c]));
  return groups
    .filter((group) => group.includes(target.iso2))
    .map((group) => group.flatMap((code) => inPool.get(code) ?? []))
    .filter((members) => members.length >= 2);
}

function similarMatesInPool(target: Country, ctx: FormatContext): Country[] {
  if (!ctx.similarDistractors) return [];
  const groups = [...groupsInPool(ctx.similarGroups, target, ctx), ...groupsInPool(ctx.similarNames, target, ctx)];
  return [...new Set(groups.flat())].filter((c) => c.iso2 !== target.iso2);
}

export function optionsWith(target: Country, ctx: FormatContext, count: number, rng: Rng): Country[] {
  const preferred = shuffle(similarMatesInPool(target, ctx), rng).slice(0, count - 1);
  const rest = othersInPool(target, ctx).filter((c) => !preferred.includes(c));
  return shuffle([target, ...preferred, ...sample(rest, count - 1 - preferred.length, rng)], rng);
}

function randomCrop(rng: Rng): Crop {
  return { originX: rng() * 100, originY: rng() * 100 };
}

const optionCount = (ctx: FormatContext, rng: Rng) => pickOne([4, 6].filter((count) => count <= ctx.pool.length), rng);

const always = () => true;
const hasGroup = (groups: (ctx: FormatContext) => Groups) => (target: Country, ctx: FormatContext) =>
  groupsInPool(groups(ctx), target, ctx).length > 0;
const groupOf = (groups: Groups, target: Country, ctx: FormatContext, rng: Rng) => shuffle(pickOne(groupsInPool(groups, target, ctx), rng), rng);

export const nameToFlags: Format = {
  id: 'nameToFlags',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'nameToFlags',
    target,
    options: optionsWith(target, ctx, optionCount(ctx, rng), rng),
  }),
};

export const flagToNames: Format = {
  id: 'flagToNames',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'flagToNames',
    target,
    options: optionsWith(target, ctx, optionCount(ctx, rng), rng),
  }),
};

export const flagToTwoNames: Format = {
  id: 'flagToTwoNames',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'flagToTwoNames', target, options: optionsWith(target, ctx, 2, rng) }),
};

export const crop: Format = {
  id: 'crop',
  recall: false,
  choice: false,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'crop', target, options: optionsWith(target, ctx, 4, rng), crop: randomCrop(rng) }),
};

export const trueFalse: Format = {
  id: 'trueFalse',
  recall: false,
  choice: false,
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
  choice: false,
  canTarget: always,
  build: (target) => ({ format: 'typeName', target }),
};

export const matchPairs: Format = {
  id: 'matchPairs',
  recall: false,
  choice: true,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'matchPairs',
    target,
    countries: shuffle([target, ...sample(othersInPool(target, ctx), 3, rng)], rng),
  }),
};

export const oddOneOut: Format = {
  id: 'oddOneOut',
  recall: false,
  choice: false,
  canTarget: (target, ctx) => continentMatesInPool(target, ctx).length >= 2,
  build: (target, ctx, rng) => {
    const intruder = pickOne(ctx.world.filter((c) => c.continent !== target.continent), rng);
    const others = sample(continentMatesInPool(target, ctx), 2, rng);
    return { format: 'oddOneOut', target, intruder, options: shuffle([target, ...others, intruder], rng) };
  },
};

export const sortSimilar: Format = {
  id: 'sortSimilar',
  recall: false,
  choice: false,
  canTarget: hasGroup((ctx) => ctx.similarGroups),
  build: (target, ctx, rng) => ({ format: 'sortSimilar', target, countries: groupOf(ctx.similarGroups, target, ctx, rng) }),
};

export const typeSimilar: Format = {
  id: 'typeSimilar',
  recall: true,
  choice: false,
  canTarget: hasGroup((ctx) => ctx.similarGroups),
  build: (target, ctx, rng) => ({ format: 'typeSimilar', target, countries: groupOf(ctx.similarGroups, target, ctx, rng) }),
};

export const sortSimilarNames: Format = {
  id: 'sortSimilarNames',
  recall: false,
  choice: false,
  canTarget: hasGroup((ctx) => ctx.similarNames),
  build: (target, ctx, rng) => ({ format: 'sortSimilarNames', target, countries: groupOf(ctx.similarNames, target, ctx, rng) }),
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
  typeSimilar,
  sortSimilarNames,
];
