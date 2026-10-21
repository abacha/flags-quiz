import { geoArea, geoCentroid, geoDistance } from 'd3-geo';
import { merge } from 'topojson-client';
import type { Polygon as GeoPolygon } from 'geojson';
import type { MultiPolygon, Polygon, Topology } from 'topojson-specification';
import { poolFor, type ContinentKey, type Difficulty } from '../engine/pool';
import { countries, type Country } from './countries';
import mapExcludedJson from './map-excluded.json';
import topologyJson from './map.topo.json';

export const MAP_OBJECT = 'units';

export const topology = topologyJson as unknown as Topology<{ [MAP_OBJECT]: { type: 'GeometryCollection'; geometries: (Polygon | MultiPolygon)[] } }>;
export const mapExcluded: readonly string[] = mapExcludedJson;

export function mapPool(continent: ContinentKey, difficulty: Difficulty): Country[] {
  return poolFor(countries, continent, difficulty).filter((c) => !mapExcluded.includes(c.iso2));
}

let centroids: Map<string, [number, number]> | undefined;

function computeCentroids(): Map<string, [number, number]> {
  const groups = new Map<string, (Polygon | MultiPolygon)[]>();
  for (const geometry of topology.objects[MAP_OBJECT].geometries) {
    if (geometry.id === null || geometry.id === undefined) continue;
    const id = String(geometry.id);
    groups.set(id, [...(groups.get(id) ?? []), geometry]);
  }
  return new Map(
    [...groups].map(([id, geometries]) => {
      const polygons = merge(topology, geometries).coordinates.map((coordinates): GeoPolygon => ({ type: 'Polygon', coordinates }));
      const largest = polygons.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
      return [id, geoCentroid(largest)];
    }),
  );
}

export function centroidOf(iso2: string): [number, number] {
  centroids ??= computeCentroids();
  const centroid = centroids.get(iso2);
  if (!centroid) throw new Error(`No map geometry for ${iso2}`);
  return centroid;
}

export function nearestCountries(target: Country, pool: readonly Country[], count: number): Country[] {
  const from = centroidOf(target.iso2);
  return pool
    .filter((c) => c.iso2 !== target.iso2)
    .map((c) => ({ country: c, distance: geoDistance(from, centroidOf(c.iso2)) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map(({ country }) => country);
}
