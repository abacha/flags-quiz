import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { acceptsTypedName, normalizeName } from '../engine/answer';
import { poolFor, type Difficulty } from '../engine/pool';
import { countries, similarGroups, similarNames, type Continent, type Country, type Status } from './countries';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'general'];
const CONTINENTS: Continent[] = ['africa', 'americas', 'asia', 'europe', 'oceania'];

const byIso = new Map(countries.map((c) => [c.iso2, c]));
const icuEnglishNames = new Intl.DisplayNames(['en'], { type: 'region' });
const ENGLISH_NAMES_ICU_GETS_WRONG: Record<string, string> = {
  'gb-eng': 'England',
  'gb-nir': 'Northern Ireland',
  'gb-sct': 'Scotland',
  'gb-wls': 'Wales',
  ci: "Côte d'Ivoire",
  gs: 'South Georgia and the South Sandwich Islands',
  hk: 'Hong Kong',
  mm: 'Myanmar',
  mo: 'Macao',
  ps: 'Palestine',
  vc: 'Saint Vincent and the Grenadines',
};
const englishName = (country: Country) =>
  ENGLISH_NAMES_ICU_GETS_WRONG[country.iso2] ??
  icuEnglishNames.of(country.iso2.toUpperCase())!.replace(' & ', ' and ').replace(/^St\. /, 'Saint ');
const codesWith = (status: Status) =>
  countries
    .filter((c) => c.status === status)
    .map((c) => c.iso2)
    .sort();

describe('countries', () => {
  it('has 248 flags: 193 UN members, 5 other states, 4 UK nations and 46 territories', () => {
    expect(countries).toHaveLength(248);
    expect(codesWith('un')).toHaveLength(193);
    expect(codesWith('nonMember')).toEqual(['eh', 'ps', 'tw', 'va', 'xk']);
    expect(codesWith('ukNation')).toEqual(['gb-eng', 'gb-nir', 'gb-sct', 'gb-wls']);
    expect(codesWith('territory')).toHaveLength(46);
  });

  it('leaves out the US states, the flags without a continent and the flags identical to another one', () => {
    expect(countries.filter((c) => c.iso2.startsWith('us-'))).toEqual([]);
    for (const code of ['eu', 'un', 'aq', 'um', 'bv', 'sj', 'mf', 'hm']) expect(byIso.has(code)).toBe(false);
  });

  it.each([
    ['africa', 60],
    ['americas', 55],
    ['asia', 50],
    ['europe', 56],
    ['oceania', 27],
  ] as const)('puts the right number of flags in %s', (continent, size) => {
    expect(countries.filter((c) => c.continent === continent)).toHaveLength(size);
  });

  it.each(CONTINENTS)('splits %s into three tiers whose sizes differ by at most one', (continent) => {
    const members = countries.filter((c) => c.continent === continent);
    expect(members.every((c) => [1, 2, 3].includes(c.tier))).toBe(true);
    const sizes = [1, 2, 3].map((tier) => members.filter((c) => c.tier === tier).length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('accepts no typed name for two different countries, except "Congo"', () => {
    const owners = new Map<string, string>();
    for (const country of countries) {
      for (const name of [country.name, ...country.aliases].map(normalizeName).filter((n) => n !== 'congo')) {
        expect(owners.get(name) ?? country.iso2).toBe(country.iso2);
        owners.set(name, country.iso2);
      }
    }
  });

  it.each([
    ['gs', 'ge', 'Geórgia'],
    ['gf', 'gy', 'Guiana'],
    ['as', 'ws', 'Samoa'],
    ['gb-nir', 'ie', 'Irlanda'],
  ])('grades "%s" apart from the country it is named after', (territory, country, typed) => {
    expect(acceptsTypedName(byIso.get(territory)!, typed)).toBe(false);
    expect(acceptsTypedName(byIso.get(country)!, typed)).toBe(true);
  });

  it('has unique codes and unique names', () => {
    expect(new Set(countries.map((c) => c.iso2)).size).toBe(countries.length);
    expect(new Set(countries.map((c) => c.name)).size).toBe(countries.length);
  });

  it('has a flag file for every country', () => {
    const missing = countries.filter((c) => !existsSync(new URL(`../../public/flags/${c.iso2}.svg`, import.meta.url)));
    expect(missing.map((c) => c.iso2)).toEqual([]);
  });

  it('carries the hand-corrected names', () => {
    expect(
      ['cd', 'mm', 'gl', 'nc', 'fo', 'cw', 'tk', 'ms', 'pm', 'ps', 'cc'].map((code) => byIso.get(code)?.name),
    ).toEqual([
      'República Democrática do Congo',
      'Mianmar',
      'Groenlândia',
      'Nova Caledônia',
      'Ilhas Faroé',
      'Curaçao',
      'Tokelau',
      'Montserrat',
      'São Pedro e Miquelon',
      'Palestina',
      'Ilhas Cocos',
    ]);
  });

  it('accepts the spellings the spec names', () => {
    for (const typed of ['Malvinas', 'Falklands', 'Ilhas Falkland']) expect(acceptsTypedName(byIso.get('fk')!, typed)).toBe(true);
    for (const typed of ['Faroé', 'Feroe']) expect(acceptsTypedName(byIso.get('fo')!, typed)).toBe(true);
    expect(acceptsTypedName(byIso.get('pn')!, 'Pitcairn')).toBe(true);
    for (const typed of ['Turks e Caicos', 'Ilhas Turks e Caicos']) expect(acceptsTypedName(byIso.get('tc')!, typed)).toBe(true);
    expect(acceptsTypedName(byIso.get('mo')!, 'Macao')).toBe(true);
    for (const typed of ['Chagos', 'Ilhas Chagos']) expect(acceptsTypedName(byIso.get('io')!, typed)).toBe(true);
  });

  it('accepts the English name of every country', () => {
    const missing = countries.filter((c) => !acceptsTypedName(c, englishName(c)));
    expect(missing.map((c) => `${c.iso2}: ${englishName(c)}`)).toEqual([]);
  });

  it.each([
    ['py', 'Paraguay'],
    ['vn', 'Vietnam'],
    ['mm', 'Burma'],
    ['ci', 'Ivory Coast'],
    ['tr', 'Turkey'],
    ['cz', 'Czech Republic'],
    ['cd', 'Democratic Republic of the Congo'],
    ['cd', 'DR Congo'],
    ['cg', 'Republic of the Congo'],
    ['us', 'USA'],
    ['gb', 'UK'],
    ['ae', 'UAE'],
    ['va', 'Vatican'],
    ['va', 'Holy See'],
    ['vi', 'US Virgin Islands'],
    ['bs', 'The Bahamas'],
    ['gm', 'The Gambia'],
    ['sz', 'Swaziland'],
    ['tl', 'East Timor'],
    ['mk', 'Macedonia'],
    ['nl', 'Holland'],
  ])('accepts %s under the common English name "%s"', (code, typed) => {
    expect(acceptsTypedName(byIso.get(code)!, typed)).toBe(true);
  });
});

function expectGroupsOfExistingCountries(groups: string[][]) {
  for (const group of groups) {
    expect(group.length).toBeGreaterThanOrEqual(2);
    expect(group.length).toBeLessThanOrEqual(4);
    expect(new Set(group).size).toBe(group.length);
    for (const iso2 of group) expect(byIso.has(iso2)).toBe(true);
  }
}

describe('similarGroups', () => {
  it('groups 2 to 4 distinct existing countries', () => expectGroupsOfExistingCountries(similarGroups));

  it('covers every continent', () => {
    const covered = new Set(similarGroups.map((group) => byIso.get(group[0])?.continent));
    expect(covered).toEqual(new Set(CONTINENTS));
  });

  it('holds the groups the spec requires', () => {
    const grouped = (codes: string[]) => similarGroups.some((group) => codes.every((code) => group.includes(code)));
    expect(grouped(['pr', 'cu'])).toBe(true);
    expect(grouped(['ps', 'jo', 'ae', 'kw'])).toBe(true);
    expect(grouped(['ky', 'vg', 'ms', 'tc'])).toBe(true);
    expect(grouped(['gb-eng', 'gg', 'je'])).toBe(true);
    expect(grouped(['eg', 'sd', 'eh'])).toBe(true);
    expect(grouped(['ba', 'xk'])).toBe(true);
    expect(grouped(['td', 'ro', 'md', 'ad'])).toBe(true);
    expect(grouped(['ax', 'fo', 'is'])).toBe(true);
    expect(grouped(['sd', 'ps', 'jo', 'ae'])).toBe(true);
    expect(grouped(['pw', 'ne', 'la', 'jp'])).toBe(true);
    expect(grouped(['ws', 'tw'])).toBe(true);
  });

  it.each([...CONTINENTS, 'world'] as const)('gives every %s level a look-alike group with at least two members inside the pool', (continent) => {
    for (const difficulty of DIFFICULTIES) {
      const pool = new Set(poolFor(countries, continent, difficulty).map((c) => c.iso2));
      expect(similarGroups.some((group) => group.filter((iso2) => pool.has(iso2)).length >= 2)).toBe(true);
    }
  });
});

describe('similarNames', () => {
  it('groups 2 to 4 distinct existing countries', () => expectGroupsOfExistingCountries(similarNames));

  it('holds the groups the spec requires', () => {
    const grouped = (codes: string[]) => similarNames.some((group) => codes.every((code) => group.includes(code)));
    expect(grouped(['cg', 'cd'])).toBe(true);
    expect(grouped(['je', 'gg'])).toBe(true);
    expect(grouped(['mv', 'fk'])).toBe(true);
    expect(grouped(['sx', 'bl', 'pm'])).toBe(true);
  });
});
