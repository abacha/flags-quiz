import { readFileSync, writeFileSync } from 'node:fs';
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
const MAX_DETAILED_AREA_KM2 = 10_000;
const MIN_ISLET_KM2 = 1;
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
const countries = JSON.parse(readFileSync(new URL('../src/data/countries.json', import.meta.url), 'utf8'));
const known = new Set(countries.map((c) => c.iso2));
const excluded = new Set(JSON.parse(readFileSync(new URL('../src/data/map-excluded.json', import.meta.url), 'utf8')));

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

const areaOf = (geometry) => geoArea(geometry) * EARTH_RADIUS_KM ** 2;

// Quantization folds islets smaller than its grid into inverted rings, which d3 fills as the whole globe.
function dropIslets(feature) {
  if (feature.geometry.type !== 'MultiPolygon') return;
  const polygons = feature.geometry.coordinates.map((coordinates) => ({ coordinates, area: areaOf({ type: 'Polygon', coordinates }) }));
  const largest = Math.max(...polygons.map((p) => p.area));
  feature.geometry.coordinates = polygons.filter((p) => p.area === largest || p.area >= MIN_ISLET_KM2).map((p) => p.coordinates);
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
  if (feature.id) areaKm2[feature.id] = (areaKm2[feature.id] ?? 0) + areaOf(feature);
}

const missing = countries.map((c) => c.iso2).filter((iso2) => !excluded.has(iso2) && !(iso2 in areaKm2));
if (missing.length > 0) throw new Error(`No geometry for ${missing.join(', ')}`);

const bordered = landBordered(collection);
const detailed = new Set(
  Object.keys(areaKm2).filter(
    (key) => !excluded.has(key) && areaKm2[key] < MAX_DETAILED_AREA_KM2 && !bordered.has(key),
  ),
);
const detailedFeatures = (await download(DETAILED_SOURCE_URL)).features.filter((feature) => detailed.has(feature.id));
for (const key of detailed) {
  if (!detailedFeatures.some((feature) => feature.id === key)) throw new Error(`No detailed geometry for ${key}`);
}
collection.features = [...collection.features.filter((feature) => !detailed.has(feature.id)), ...detailedFeatures];
collection.features.forEach(dropIslets);

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
