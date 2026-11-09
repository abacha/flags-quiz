import { geoDistance } from 'd3-geo';
import type { ContinentKey, Difficulty } from '../engine/pool';
import capitalsJson from './capitals.json';
import capitalsExcludedJson from './capitals-excluded.json';
import capitalLevelsJson from './capital-levels.json';
import { countries, type Continent, type Country } from './countries';
import { MAP_ALL, mapPool } from './maps';
import similarCapitalsJson from './similar-capitals.json';

export interface Capital {
  name: string;
  aliases: string[];
}

interface CapitalEntry {
  capitals: Capital[];
  coords: [longitude: number, latitude: number];
}

const capitalEntries = capitalsJson as unknown as Record<string, CapitalEntry>;

export const capitalsExcluded: readonly string[] = capitalsExcludedJson;
export const similarCapitals: readonly (readonly string[])[] = similarCapitalsJson;

function entryOf(country: Country): CapitalEntry {
  const entry = capitalEntries[country.iso2];
  if (!entry) throw new Error(`No capital for ${country.iso2}`);
  return entry;
}

export function capitalsOf(country: Country): Capital[] {
  return entryOf(country).capitals;
}

export function capitalCoords(country: Country): [longitude: number, latitude: number] {
  return entryOf(country).coords;
}

export function mainCapital(country: Country): string {
  return capitalsOf(country)[0].name;
}

export function capitalLabel(country: Country): string {
  return capitalsOf(country)
    .map((c) => c.name)
    .join(' / ');
}

type LeveledDifficulty = Exclude<Difficulty, 'general'>;

const capitalLevels = capitalLevelsJson as Record<Continent, Record<LeveledDifficulty, string[]>>;
const CONTINENTS = Object.keys(capitalLevels) as Continent[];

function byIso2(iso2: string): Country {
  const country = countries.find((c) => c.iso2 === iso2);
  if (!country) throw new Error(`No country ${iso2} in capital-levels.json`);
  return country;
}

function continentPool(continent: Continent, difficulty: Difficulty): Country[] {
  if (difficulty === 'general') return mapPool(continent, MAP_ALL).filter((c) => !capitalsExcluded.includes(c.iso2));
  return capitalLevels[continent][difficulty].map(byIso2);
}

export function capitalPool(continent: ContinentKey, difficulty: Difficulty): Country[] {
  if (continent === 'world') return CONTINENTS.flatMap((c) => continentPool(c, difficulty));
  return continentPool(continent, difficulty);
}

export function nearestByCapital(target: Country, pool: readonly Country[], count: number): Country[] {
  const from = entryOf(target).coords;
  return pool
    .filter((c) => c.iso2 !== target.iso2)
    .map((c) => ({ country: c, distance: geoDistance(from, entryOf(c).coords) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map(({ country }) => country);
}
