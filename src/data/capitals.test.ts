import { describe, expect, it } from 'vitest';
import { normalizeName } from '../engine/answer';
import capitalsJson from './capitals.json';
import capitalsExcludedJson from './capitals-excluded.json';
import similarCapitalsJson from './similar-capitals.json';
import { capitalLabel, capitalPool, capitalsExcluded, capitalsOf, mainCapital, nearestByCapital, similarCapitals } from './capitals';
import { countries, type Country } from './countries';

const byIso = (iso2: string): Country => countries.find((c) => c.iso2 === iso2)!;
const capitalCodes = Object.keys(capitalsJson);
const entries = Object.entries(capitalsJson as Record<string, { capitals: { name: string; aliases: string[] }[]; coords: number[] }>);

describe('capitals data', () => {
  it('places every country in exactly one of capitals and excluded', () => {
    const known = new Set(countries.map((c) => c.iso2));
    for (const code of [...capitalCodes, ...capitalsExcludedJson]) expect(known.has(code), code).toBe(true);
    for (const c of countries) {
      const places = Number(capitalCodes.includes(c.iso2)) + Number(capitalsExcludedJson.includes(c.iso2));
      expect(places, c.iso2).toBe(1);
    }
  });

  it('excludes the United Kingdom, the entries with no seat of their own and Norfolk', () => {
    expect(capitalsExcluded).toEqual(['gb', 'gs', 'io', 'nf', 'tk']);
  });

  it('gives every entry a named capital and coordinates on the globe', () => {
    for (const [code, { capitals, coords }] of entries) {
      expect(capitals.length, code).toBeGreaterThan(0);
      for (const capital of capitals) expect(capital.name.trim(), code).not.toBe('');
      const [longitude, latitude] = coords;
      expect(coords, code).toHaveLength(2);
      expect(Math.abs(longitude), code).toBeLessThanOrEqual(180);
      expect(Math.abs(latitude), code).toBeLessThanOrEqual(90);
    }
  });

  it('never gives two entries the same capital name or alias', () => {
    const owner = new Map<string, string>();
    for (const [code, { capitals }] of entries) {
      for (const name of capitals.flatMap((c) => [c.name, ...c.aliases]).map(normalizeName)) {
        const previous = owner.get(name);
        expect(previous === undefined || previous === code, `${name}: ${previous} and ${code}`).toBe(true);
        owner.set(name, code);
      }
    }
  });

  it('keeps look-alike capital groups inside Capitais', () => {
    for (const group of similarCapitalsJson) {
      expect(group.length, group.join()).toBeGreaterThanOrEqual(2);
      for (const code of group) expect(capitalCodes, code).toContain(code);
    }
    expect(similarCapitals).toContainEqual(['jm', 'vc']);
    expect(similarCapitals).toContainEqual(['at', 'la']);
  });
});

describe('capitals of a country', () => {
  it('lists every capital of a country with several, the main one first', () => {
    expect(capitalLabel(byIso('bo'))).toBe('Sucre / La Paz');
    expect(capitalsOf(byIso('za')).map((c) => c.name)).toEqual(['Pretória', 'Cidade do Cabo', 'Bloemfontein']);
  });

  it('gives disputed capitals to a single entry', () => {
    expect(mainCapital(byIso('ps'))).toBe('Ramallah');
    expect(capitalsOf(byIso('ps'))).toHaveLength(1);
    expect(mainCapital(byIso('il'))).toBe('Jerusalém');
  });

  it('uses the de facto seat where there is no official capital', () => {
    expect(mainCapital(byIso('gb-eng'))).toBe('Londres');
    expect(mainCapital(byIso('nr'))).toBe('Yaren');
    expect(mainCapital(byIso('ch'))).toBe('Berna');
  });

  it('refuses an excluded entry', () => {
    expect(() => capitalsOf(byIso('gb'))).toThrow('No capital for gb');
  });
});

describe('capital pools', () => {
  it('leaves excluded entries out of the smallest pool', () => {
    const pool = capitalPool('oceania', 'hard').map((c) => c.iso2);
    expect(pool).toHaveLength(7);
    expect(pool).not.toContain('tk');
    expect(pool).not.toContain('nf');
  });

  it('finds the nearest country by the distance between capitals', () => {
    expect(nearestByCapital(byIso('ar'), capitalPool('americas', 'general'), 1)).toEqual([byIso('uy')]);
  });
});
