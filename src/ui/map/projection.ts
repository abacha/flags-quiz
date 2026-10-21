import { geoEqualEarth, geoMercator, type GeoProjection } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import type { Continent } from '../../data/countries';
import type { ContinentKey } from '../../engine/pool';

export const MAP_WIDTH = 1000;

const ROTATION: Record<Continent, [number, number]> = {
  africa: [0, 0],
  americas: [90, 0],
  asia: [0, 0],
  europe: [0, 0],
  oceania: [-160, 0],
};

export function fittedFeatures(continent: ContinentKey, features: FeatureCollection): FeatureCollection {
  return continent === 'europe' ? { ...features, features: features.features.filter((f) => f.id !== 'ru') } : features;
}

export function projectionFor(continent: ContinentKey, features: FeatureCollection): GeoProjection {
  if (continent === 'world') return geoEqualEarth().fitWidth(MAP_WIDTH, features);
  return geoMercator().rotate(ROTATION[continent]).fitWidth(MAP_WIDTH, fittedFeatures(continent, features));
}
