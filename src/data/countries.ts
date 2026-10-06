import countriesJson from './countries.json';
import similarGroupsJson from './similar-groups.json';

export type Continent = 'africa' | 'americas' | 'asia' | 'europe' | 'oceania';
export type Tier = 1 | 2 | 3;

export interface Country {
  iso2: string;
  name: string;
  continent: Continent;
  tier?: Tier;
  aliases: string[];
}

export const countries = countriesJson as Country[];
export const similarGroups: string[][] = similarGroupsJson;
