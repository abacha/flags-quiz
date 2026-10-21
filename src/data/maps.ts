import type { GeometryCollection, Topology } from 'topojson-specification';
import { poolFor, type ContinentKey } from '../engine/pool';
import { countries, type Country } from './countries';
import mapExcludedJson from './map-excluded.json';
import topologyJson from './map.topo.json';

export const MAP_OBJECT = 'units';

export const topology = topologyJson as unknown as Topology<{ [MAP_OBJECT]: GeometryCollection }>;
export const mapExcluded: readonly string[] = mapExcludedJson;

export function mapPool(continent: ContinentKey): Country[] {
  return poolFor(countries, continent, 'general').filter((c) => !mapExcluded.includes(c.iso2));
}
