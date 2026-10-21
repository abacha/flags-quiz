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
