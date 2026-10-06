import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { countries, similarGroups } from './countries';

const african = countries.filter((c) => c.continent === 'africa');
const byIso = new Map(countries.map((c) => [c.iso2, c]));

describe('countries', () => {
  it('has the 54 African UN member states', () => {
    expect(african).toHaveLength(54);
  });

  it('splits Africa into three tiers of 18', () => {
    for (const tier of [1, 2, 3]) {
      expect(african.filter((c) => c.tier === tier)).toHaveLength(18);
    }
  });

  it('gives a tier only to African countries', () => {
    expect(countries.filter((c) => c.continent !== 'africa' && c.tier !== undefined)).toEqual([]);
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
  it('groups 2 to 4 existing African countries', () => {
    for (const group of similarGroups) {
      expect(group.length).toBeGreaterThanOrEqual(2);
      expect(group.length).toBeLessThanOrEqual(4);
      for (const iso2 of group) expect(byIso.get(iso2)?.continent).toBe('africa');
    }
  });
});
