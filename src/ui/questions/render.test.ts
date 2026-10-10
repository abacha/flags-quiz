// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries, similarGroups } from '../../data/countries';
import { crop, flagToNames, flagToTwoNames, typeName, typeSimilar } from '../../engine/formats';
import { poolFor } from '../../engine/pool';
import type { FormatContext } from '../../engine/question';
import { seededRng } from '../../engine/rng';
import { renderQuestion } from './render';

const byIso = (code: string) => countries.find((c) => c.iso2 === code)!;
const pool = poolFor(countries, 'americas', 'hard');
const ctx: FormatContext = { pool, world: countries, similarGroups, similarDistractors: true };

describe('prompts stay neutral between countries and territories', () => {
  it('asks where the flag is from, not which country', () => {
    const question = flagToNames.build(byIso('ky'), ctx, seededRng(1));
    expect(renderQuestion(question, () => {}).querySelector('h2')?.textContent).toBe('De onde é esta bandeira?');
  });

  it('asks the same for flagToTwoNames', () => {
    const question = flagToTwoNames.build(byIso('ky'), ctx, seededRng(1));
    expect(renderQuestion(question, () => {}).querySelector('h2')?.textContent).toBe('De onde é esta bandeira?');
  });

  it('asks where a flag crop is from', () => {
    const question = crop.build(byIso('ky'), ctx, seededRng(1));
    expect(renderQuestion(question, () => {}).querySelector('h2')?.textContent).toBe('De onde é este pedaço de bandeira?');
  });

  it('asks for the name, not the country name, when typing a flag', () => {
    const question = typeName.build(byIso('ky'), ctx, seededRng(1));
    const rendered = renderQuestion(question, () => {});
    expect(rendered.querySelector('h2')?.textContent).toBe('Escreva o nome desta bandeira');
    expect(rendered.querySelector('input')?.placeholder).toBe('Nome');
  });

  it('uses the neutral placeholder for every input of typeSimilar', () => {
    const target = pool.find((country) => typeSimilar.canTarget(country, ctx))!;
    const question = typeSimilar.build(target, ctx, seededRng(1));
    const rendered = renderQuestion(question, () => {});
    const placeholders = [...rendered.querySelectorAll('input')].map((input) => input.placeholder);
    expect(placeholders).toEqual(placeholders.map(() => 'Nome'));
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('keeps the oddOneOut continent wording unchanged', () => {
    const target = pool.find((country) => country.iso2 !== 'ky')!;
    const question = { format: 'oddOneOut' as const, target, intruder: byIso('ky'), options: [target, byIso('ky')] };
    const rendered = renderQuestion(question, () => {});
    expect(rendered.querySelector('h2')?.textContent).toMatch(/^Qual destas bandeiras não é /);
  });
});
