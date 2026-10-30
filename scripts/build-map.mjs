import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { geoArea } from 'd3-geo';
import { quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, quantile, simplify } from 'topojson-simplify';

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_units.geojson';
const DETAILED_SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_units.geojson';
const EARTH_RADIUS_KM = 6371.0088;
const MIN_AREA_KM2 = 100;
const MAX_DETAILED_AREA_KM2 = 10_000;
const SIMPLIFY_QUANTILE = 0.8;
const QUANTIZATION = 1e5;
const UK_NATIONS = {
  England: 'gb-eng',
  Scotland: 'gb-sct',
  Wales: 'gb-wls',
  'Northern Ireland': 'gb-nir',
};
const UNIT_KEYS = { Somaliland: 'so', 'Northern Cyprus': 'cy' };

const topoPath = fileURLToPath(new URL('../src/data/map.topo.json', import.meta.url));
const excludedPath = fileURLToPath(new URL('../src/data/map-excluded.json', import.meta.url));
const countries = JSON.parse(readFileSync(new URL('../src/data/countries.json', import.meta.url), 'utf8'));
const known = new Set(countries.map((c) => c.iso2));

function keyOf({ GEOUNIT, ISO_A2_EH }) {
  const key = UK_NATIONS[GEOUNIT] ?? UNIT_KEYS[GEOUNIT] ?? ISO_A2_EH.toLowerCase();
  return known.has(key) ? key : null;
}

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  const collection = await response.json();
  for (const feature of collection.features) {
    feature.id = keyOf(feature.properties);
    feature.properties = {};
  }
  return collection;
}

function arcsOf(geometry) {
  return (geometry.type === 'Polygon' ? geometry.arcs.flat() : geometry.arcs.flat(2)).map((arc) => (arc < 0 ? ~arc : arc));
}

function landBordered(collection) {
  const owners = new Map();
  for (const geometry of topology({ units: collection }).objects.units.geometries) {
    if (!geometry.arcs) continue;
    for (const arc of arcsOf(geometry)) owners.set(arc, new Set([...(owners.get(arc) ?? []), geometry.id]));
  }
  return new Set([...owners.values()].filter((ids) => ids.size > 1).flatMap((ids) => [...ids]));
}

const collection = await download(SOURCE_URL);

const areaKm2 = {};
for (const feature of collection.features) {
  if (feature.id) areaKm2[feature.id] = (areaKm2[feature.id] ?? 0) + geoArea(feature) * EARTH_RADIUS_KM ** 2;
}

const excluded = countries
  .map((c) => c.iso2)
  .filter((iso2) => !(iso2 in areaKm2) || areaKm2[iso2] < MIN_AREA_KM2)
  .sort();

console.log('Excluded from the Maps pool:');
for (const iso2 of excluded) {
  console.log(`  ${iso2}  ${iso2 in areaKm2 ? `${areaKm2[iso2].toFixed(1)} km2` : 'no geometry'}`);
}

const bordered = landBordered(collection);
const detailed = new Set(
  Object.keys(areaKm2).filter(
    (key) => areaKm2[key] >= MIN_AREA_KM2 && areaKm2[key] < MAX_DETAILED_AREA_KM2 && !bordered.has(key),
  ),
);
const detailedFeatures = (await download(DETAILED_SOURCE_URL)).features.filter((feature) => detailed.has(feature.id));
for (const key of detailed) {
  if (!detailedFeatures.some((feature) => feature.id === key)) throw new Error(`No detailed geometry for ${key}`);
}
collection.features = [...collection.features.filter((feature) => !detailed.has(feature.id)), ...detailedFeatures];

let topo = topology({ units: collection });
topo = presimplify(topo);
for (const geometry of topo.objects.units.geometries) {
  if (!detailed.has(geometry.id)) continue;
  for (const arc of arcsOf(geometry)) for (const point of topo.arcs[arc]) point[2] = Infinity;
}
topo = simplify(topo, quantile(topo, SIMPLIFY_QUANTILE));
topo = quantize(topo, QUANTIZATION);
for (const geometry of topo.objects.units.geometries) geometry.id ??= null;

writeFileSync(topoPath, JSON.stringify(topo));
if (!existsSync(excludedPath)) writeFileSync(excludedPath, `${JSON.stringify(excluded, null, 2)}\n`);
