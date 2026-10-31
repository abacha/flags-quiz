import { geoDistance } from 'd3-geo';
import { poolFor, type ContinentKey, type Difficulty } from '../engine/pool';
import capitalsJson from './capitals.json';
import capitalsExcludedJson from './capitals-excluded.json';
import { countries, type Country } from './countries';
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

export function mainCapital(country: Country): string {
  return capitalsOf(country)[0].name;
}

export function capitalLabel(country: Country): string {
  return capitalsOf(country)
    .map((c) => c.name)
    .join(' / ');
}

export function capitalPool(continent: ContinentKey, difficulty: Difficulty): Country[] {
  return poolFor(countries, continent, difficulty).filter((c) => !capitalsExcluded.includes(c.iso2));
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
