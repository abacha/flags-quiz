// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { renderFlagChoices, renderNameChoices } from './choices';

const options = ['fj', 'to', 'ws'].map((iso2) => countries.find((c) => c.iso2 === iso2)!);

describe('choices', () => {
  it('tags each flag option with its country so the right one can be lit after a miss', () => {
    const question = renderFlagChoices('Qual é a bandeira de Fiji?', options, () => []);
    expect([...question.querySelectorAll<HTMLElement>('.flag-option')].map((o) => o.dataset.iso2)).toEqual(['fj', 'to', 'ws']);
  });

  it('tags each name option with its country', () => {
    const question = renderNameChoices('De onde é esta bandeira?', document.createElement('div'), options, () => []);
    expect([...question.querySelectorAll<HTMLElement>('.name-option')].map((o) => o.dataset.iso2)).toEqual(['fj', 'to', 'ws']);
  });
});
