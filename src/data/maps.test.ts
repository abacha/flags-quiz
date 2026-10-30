import { describe, expect, it } from 'vitest';
import { CONTINENT_KEYS } from '../ui/labels';
import { countries } from './countries';
import { geoDistance } from 'd3-geo';
import { MAP_ALL, MAP_OBJECT, centroidOf, mapExcluded, mapLevelLabel, mapLevels, mapPool, nearestCountries, topology } from './maps';
import { poolFor } from '../engine/pool';

const topologyIds = (): string[] =>
  topology.objects[MAP_OBJECT].geometries.flatMap((g) => (g.id === null || g.id === undefined ? [] : [String(g.id)]));

describe('maps data', () => {
  const ids = new Set(topologyIds());

  it('draws every Maps pool country', () => {
    for (const c of mapPool('world', MAP_ALL)) expect(ids.has(c.iso2), c.iso2).toBe(true);
  });

  it('keeps excluded entries out of every pool', () => {
    for (const key of CONTINENT_KEYS) for (const c of mapPool(key, MAP_ALL)) expect(mapExcluded).not.toContain(c.iso2);
  });

  it('outlines the small Caribbean islands in enough detail to show their shape', () => {
    const pointsOf = (iso2: string): number => {
      const geometry = topology.objects[MAP_OBJECT].geometries.find((g) => g.id === iso2)!;
      const arcs = geometry.type === 'Polygon' ? geometry.arcs.flat() : geometry.arcs.flat(2);
      return arcs.reduce((sum, arc) => sum + topology.arcs[arc < 0 ? ~arc : arc].length, 0);
    };
    for (const iso2 of ['bb', 'lc', 'gd', 'dm', 'kn', 'mq', 'tt']) expect(pointsOf(iso2), iso2).toBeGreaterThanOrEqual(30);
  });

  it('asks the four UK nations and not the United Kingdom', () => {
    const europe = mapPool('europe', MAP_ALL).map((c) => c.iso2);
    expect(europe).toEqual(expect.arrayContaining(['gb-eng', 'gb-sct', 'gb-wls', 'gb-nir']));
    expect(europe).not.toContain('gb');
  });

  it('keeps every map country of the continent, of every tier, on the whole-continent level', () => {
    for (const key of CONTINENT_KEYS) {
      const expected = poolFor(countries, key, 'general').filter((c) => !mapExcluded.includes(c.iso2));
      expect(mapPool(key, MAP_ALL), key).toEqual(expected);
    }
  });

  describe('regions', () => {
    const regionKeys = CONTINENT_KEYS.filter((key) => key !== 'world');

    it('puts every map country of a continent in exactly one of its regions', () => {
      for (const key of regionKeys) {
        const regions = mapLevels(key).filter((level) => level !== MAP_ALL);
        const placed = regions.flatMap((level) => mapPool(key, level).map((c) => c.iso2));
        expect(placed.sort(), key).toEqual(mapPool(key, MAP_ALL).map((c) => c.iso2).sort());
      }
    });

    it('keeps each region between 5 and 11 countries', () => {
      for (const key of regionKeys) {
        for (const level of mapLevels(key).filter((l) => l !== MAP_ALL)) {
          expect(mapPool(key, level).length, level).toBeGreaterThanOrEqual(5);
          expect(mapPool(key, level).length, level).toBeLessThanOrEqual(11);
        }
      }
    });

    it('lists the regions in order and then the whole continent', () => {
      expect(mapLevels('africa')).toEqual([
        'north-africa',
        'west-coast',
        'gulf-of-guinea',
        'central-africa',
        'horn-and-great-lakes',
        'southern-africa',
        'indian-ocean',
        MAP_ALL,
      ]);
    });

    it('gives Mundo only the whole world', () => {
      expect(mapLevels('world')).toEqual([MAP_ALL]);
    });

    it('asks the West African neighbours together', () => {
      expect(mapPool('africa', 'west-coast').map((c) => c.iso2)).toEqual(['mr', 'sn', 'gm', 'gw', 'gn', 'sl', 'lr', 'ml', 'cv']);
    });

    it('labels a region, the whole continent and the whole world', () => {
      expect(mapLevelLabel('africa', 'west-coast')).toBe('Costa Oeste');
      expect(mapLevelLabel('africa', MAP_ALL)).toBe('Continente inteiro');
      expect(mapLevelLabel('world', MAP_ALL)).toBe('Mundo inteiro');
    });

    it('rejects a level the continent does not have', () => {
      expect(() => mapPool('europe', 'west-coast')).toThrow('No map level west-coast in europe');
    });
  });

  it('includes the large territories', () => {
    const world = mapPool('world', MAP_ALL).map((c) => c.iso2);
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
    const americas = mapPool('americas', MAP_ALL);

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
      const oceania = mapPool('oceania', 'polynesia');
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
