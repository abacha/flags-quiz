import { geoArea, geoCentroid, geoDistance } from 'd3-geo';
import { merge } from 'topojson-client';
import type { Polygon as GeoPolygon } from 'geojson';
import type { MultiPolygon, Polygon, Topology } from 'topojson-specification';
import { poolFor, type ContinentKey } from '../engine/pool';
import { countries, type Country } from './countries';
import mapExcludedJson from './map-excluded.json';
import mapRegionsJson from './map-regions.json';
import topologyJson from './map.topo.json';

export const MAP_OBJECT = 'units';

export const topology = topologyJson as unknown as Topology<{ [MAP_OBJECT]: { type: 'GeometryCollection'; geometries: (Polygon | MultiPolygon)[] } }>;
export const mapExcluded: readonly string[] = mapExcludedJson;

export const MAP_ALL = 'all';

export type MapLevel = string;

export interface MapScope {
  continent: ContinentKey;
  level: MapLevel;
}

interface MapRegion {
  key: MapLevel;
  label: string;
  countries: string[];
}

const mapRegions: Partial<Record<ContinentKey, MapRegion[]>> = mapRegionsJson;

const regionsOf = (continent: ContinentKey): MapRegion[] => mapRegions[continent] ?? [];

function regionOf(continent: ContinentKey, level: MapLevel): MapRegion {
  const region = regionsOf(continent).find((r) => r.key === level);
  if (!region) throw new Error(`No map level ${level} in ${continent}`);
  return region;
}

export function mapLevels(continent: ContinentKey): MapLevel[] {
  return [...regionsOf(continent).map((r) => r.key), MAP_ALL];
}

export function mapLevelLabel(continent: ContinentKey, level: MapLevel): string {
  if (level === MAP_ALL) return continent === 'world' ? 'Mundo inteiro' : 'Continente inteiro';
  return regionOf(continent, level).label;
}

export function mapPool(continent: ContinentKey, level: MapLevel): Country[] {
  const pool = poolFor(countries, continent, 'general').filter((c) => !mapExcluded.includes(c.iso2));
  if (level === MAP_ALL) return pool;
  const { countries: members } = regionOf(continent, level);
  return members.map((iso2) => pool.find((c) => c.iso2 === iso2)!);
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
