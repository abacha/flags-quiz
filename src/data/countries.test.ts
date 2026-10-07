import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeName } from '../engine/answer';
import { countries, similarGroups } from './countries';

const african = countries.filter((c) => c.continent === 'africa');
const byIso = new Map(countries.map((c) => [c.iso2, c]));

describe('countries', () => {
  it('has the 193 UN member states', () => {
    expect(countries).toHaveLength(193);
    expect(byIso.has('va')).toBe(false);
  });

  it('has the 54 African UN member states', () => {
    expect(african).toHaveLength(54);
  });

  it('splits Africa into three tiers of 18', () => {
    for (const tier of [1, 2, 3]) {
      expect(african.filter((c) => c.tier === tier)).toHaveLength(18);
    }
  });

  it.each(['africa', 'americas', 'asia', 'europe', 'oceania'] as const)('gives every %s country a tier, in near-equal tiers', (continent) => {
    const members = countries.filter((c) => c.continent === continent);
    expect(members.every((c) => c.tier !== undefined)).toBe(true);
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

  it('has unique codes and unique names', () => {
    expect(new Set(countries.map((c) => c.iso2)).size).toBe(countries.length);
    expect(new Set(countries.map((c) => c.name)).size).toBe(countries.length);
  });

  it('has a flag file for every country', () => {
    const missing = countries.filter(
      (c) => !existsSync(new URL(`../../public/flags/${c.iso2}.svg`, import.meta.url)),
    );
    expect(missing.map((c) => c.iso2)).toEqual([]);
  });

  it('carries the hand-corrected names', () => {
    expect(byIso.get('cd')?.name).toBe('República Democrática do Congo');
    expect(byIso.get('mm')?.name).toBe('Mianmar');
  });
});

describe('similarGroups', () => {
  it('groups 2 to 4 existing countries of one continent', () => {
    for (const group of similarGroups) {
      expect(group.length).toBeGreaterThanOrEqual(2);
      expect(group.length).toBeLessThanOrEqual(4);
      const continents = new Set(group.map((iso2) => byIso.get(iso2)?.continent));
      expect(continents.size).toBe(1);
      expect(continents.has(undefined)).toBe(false);
    }
  });

  it('covers every continent', () => {
    const covered = new Set(similarGroups.map((group) => byIso.get(group[0])?.continent));
    expect(covered).toEqual(new Set(['africa', 'americas', 'asia', 'europe', 'oceania']));
  });
});
