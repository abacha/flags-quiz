// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { solutionCard } from './feedback';

const tonga = countries.find((c) => c.iso2 === 'to')!;

describe('solutionCard', () => {
  it('puts the flag in its own box, then the name, then the badge', () => {
    const card = solutionCard(tonga);
    expect(card.firstElementChild!.className).toBe('flag-box');
    expect(card.querySelector('.flag-box img')!.getAttribute('src')).toMatch(/flags\/to\.svg$/);
    const caption = card.querySelector('figcaption')!;
    expect(caption.firstElementChild!.className).toBe('solution-name');
    expect(caption.firstElementChild!.textContent).toBe('Tonga');
    expect(caption.lastElementChild!.classList.contains('badge')).toBe(true);
  });
});
