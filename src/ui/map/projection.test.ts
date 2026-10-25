import { geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { merge } from 'topojson-client';
import { describe, expect, it } from 'vitest';
import type { ContinentKey } from '../../engine/pool';
import { MAP_ALL, MAP_OBJECT, mapPool, topology } from '../../data/maps';
import { projectionFor } from './projection';

const geometries = topology.objects[MAP_OBJECT].geometries;

const collection = (ids: string[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: ids.map((id) => ({ type: 'Feature', id, properties: {}, geometry: merge(topology, geometries.filter((g) => g.id === id)) })),
});

const fitted = (continent: ContinentKey) => {
  const pool = collection(mapPool(continent, MAP_ALL).map((c) => c.iso2));
  const path = geoPath(projectionFor(continent, pool));
  const [[x0], [x1]] = path.bounds(pool);
  return { path, pool, width: x1 - x0 };
};

const ringWidths = (d: string): number[] =>
  d
    .split('M')
    .slice(1)
    .map((ring) => {
      const xs = [...ring.matchAll(/(-?[\d.]+(?:e-?\d+)?),/g)].map((m) => Number(m[1]));
      return Math.max(...xs) - Math.min(...xs);
    });

describe('projectionFor', () => {
  it('fits the pool into a 1000 wide map', () => {
    expect(fitted('africa').width).toBeCloseTo(1000);
    expect(fitted('world').width).toBeCloseTo(1000);
  });

  it('fits Europe without Russia', () => {
    const { path, pool, width } = fitted('europe');
    const russia = pool.features.find((f) => f.id === 'ru')!;
    expect(width).toBeGreaterThan(1000);
    expect(path.bounds(russia)[1][0]).toBeGreaterThan(1000);
  });

  it.each([
    ['oceania', ['fj', 'ki', 'ws']],
    ['world', ['fj', 'ki', 'ws', 'ru']],
  ] as const)('draws antimeridian countries on %s without a stripe', (continent, ids) => {
    const { path, width } = fitted(continent);
    for (const feature of collection([...ids]).features) {
      for (const ringWidth of ringWidths(path(feature)!)) expect(ringWidth, String(feature.id)).toBeLessThan(width * 0.4);
    }
  });

  it('keeps the Aleutians from stretching the Americas across the globe', () => {
    const { path, pool, width } = fitted('americas');
    const [[x0], [x1]] = path.bounds(pool.features.find((f) => f.id === 'br')!);
    expect(x1 - x0).toBeGreaterThan(width * 0.2);
  });
});
