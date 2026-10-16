import countriesJson from './countries.json';
import similarGroupsJson from './similar-groups.json';
import similarNamesJson from './similar-names.json';

export type Continent = 'africa' | 'americas' | 'asia' | 'europe' | 'oceania';
export type Tier = 1 | 2 | 3;
export type Status = 'un' | 'nonMember' | 'ukNation' | 'territory';

export interface Country {
  iso2: string;
  name: string;
  continent: Continent;
  status: Status;
  tier: Tier;
  aliases: string[];
}

export const countries = countriesJson as Country[];
export const similarGroups: string[][] = similarGroupsJson;
export const similarNames: string[][] = similarNamesJson;
