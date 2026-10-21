import { describe, expect, it } from 'vitest';
import { CONTINENT_KEYS } from '../ui/labels';
import { countries } from './countries';
import { geoDistance } from 'd3-geo';
import { MAP_OBJECT, centroidOf, mapExcluded, mapPool, nearestCountries, topology } from './maps';

const topologyIds = (): string[] =>
  topology.objects[MAP_OBJECT].geometries.flatMap((g) => (g.id === null || g.id === undefined ? [] : [String(g.id)]));

describe('maps data', () => {
  const ids = new Set(topologyIds());

  it('draws every Maps pool country', () => {
    for (const c of mapPool('world', 'general')) expect(ids.has(c.iso2), c.iso2).toBe(true);
  });

  it('keeps excluded entries out of every pool', () => {
    for (const key of CONTINENT_KEYS) for (const c of mapPool(key, 'general')) expect(mapExcluded).not.toContain(c.iso2);
  });

  it('asks the four UK nations and not the United Kingdom', () => {
    const europe = mapPool('europe', 'general').map((c) => c.iso2);
    expect(europe).toEqual(expect.arrayContaining(['gb-eng', 'gb-sct', 'gb-wls', 'gb-nir']));
    expect(europe).not.toContain('gb');
  });

  it('narrows the pool to the tier of the level', () => {
    const easy = mapPool('americas', 'easy').map((c) => c.iso2);
    expect(easy).toContain('br');
    expect(easy).not.toContain('gt');
    expect(mapPool('americas', 'medium').map((c) => c.iso2)).toContain('gt');
  });

  it('makes general the union of the three levels', () => {
    for (const key of CONTINENT_KEYS) {
      const levels = (['easy', 'medium', 'hard'] as const).flatMap((d) => mapPool(key, d).map((c) => c.iso2));
      expect(levels.sort(), key).toEqual(mapPool(key, 'general').map((c) => c.iso2).sort());
    }
  });

  it('keeps at least 4 countries in Oceania hard', () => {
    expect(mapPool('oceania', 'hard').length).toBeGreaterThanOrEqual(4);
  });

  it('includes the large territories', () => {
    const world = mapPool('world', 'general').map((c) => c.iso2);
    expect(world).toEqual(expect.arrayContaining(['gl', 'pr', 'nc', 'gf']));
  });

  it('leaves out the micro territories', () => {
    expect(mapExcluded).toEqual(expect.arrayContaining(['va', 'mc', 'tv', 'nr', 'gi', 'gb']));
    expect(mapExcluded).not.toContain('mt');
  });

  it('lists only known entries as excluded', () => {
    for (const iso2 of mapExcluded) expect(countries.some((c) => c.iso2 === iso2), iso2).toBe(true);
  });

  describe('nearest countries', () => {
    const c = (code: string) => countries.find((country) => country.iso2 === code)!;
    const americas = mapPool('americas', 'general');

    it('keeps Guatemala among its neighbours and away from distant countries', () => {
      const nearest = nearestCountries(c('gt'), americas, 8).map((country) => country.iso2);
      expect(nearest).toHaveLength(8);
      expect(nearest).toEqual(expect.arrayContaining(['sv', 'hn', 'bz']));
      for (const far of ['ar', 'cl', 'ca']) expect(nearest).not.toContain(far);
    });

    it('never returns the target', () => {
      expect(nearestCountries(c('gt'), americas, 8).map((country) => country.iso2)).not.toContain('gt');
    });

    it('returns every other country when the pool has fewer than count', () => {
      const oceania = mapPool('oceania', 'hard');
      expect(nearestCountries(oceania[0], oceania, 8)).toHaveLength(oceania.length - 1);
    });

    it('places Portugal on the mainland, not pulled to the Azores', () => {
      const [lon, lat] = centroidOf('pt');
      expect(lon).toBeGreaterThan(-10);
      expect(lat).toBeGreaterThan(36);
      expect(geoDistance([lon, lat], [-8, 39.5])).toBeLessThan(0.05);
    });
  });
});
