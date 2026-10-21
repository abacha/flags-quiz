import { describe, expect, it } from 'vitest';
import { CONTINENT_KEYS } from '../ui/labels';
import { countries } from './countries';
import { MAP_OBJECT, mapExcluded, mapPool, topology } from './maps';

const topologyIds = (): string[] =>
  topology.objects[MAP_OBJECT].geometries.flatMap((g) => (g.id === null || g.id === undefined ? [] : [String(g.id)]));

describe('maps data', () => {
  const ids = new Set(topologyIds());

  it('draws every Maps pool country', () => {
    for (const c of mapPool('world')) expect(ids.has(c.iso2), c.iso2).toBe(true);
  });

  it('keeps excluded entries out of every pool', () => {
    for (const key of CONTINENT_KEYS) for (const c of mapPool(key)) expect(mapExcluded).not.toContain(c.iso2);
  });

  it('asks the four UK nations and not the United Kingdom', () => {
    const europe = mapPool('europe').map((c) => c.iso2);
    expect(europe).toEqual(expect.arrayContaining(['gb-eng', 'gb-sct', 'gb-wls', 'gb-nir']));
    expect(europe).not.toContain('gb');
  });

  it('includes the large territories', () => {
    const world = mapPool('world').map((c) => c.iso2);
    expect(world).toEqual(expect.arrayContaining(['gl', 'pr', 'nc', 'gf']));
  });

  it('leaves out the micro territories', () => {
    expect(mapExcluded).toEqual(expect.arrayContaining(['va', 'mc', 'tv', 'nr', 'gi', 'gb']));
    expect(mapExcluded).not.toContain('mt');
  });

  it('lists only known entries as excluded', () => {
    for (const iso2 of mapExcluded) expect(countries.some((c) => c.iso2 === iso2), iso2).toBe(true);
  });
});
