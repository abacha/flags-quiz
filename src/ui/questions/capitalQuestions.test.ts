// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { countries, type Country } from '../../data/countries';
import { capitalCard, capitalSolution, renderCapitalQuestion } from './capitalQuestions';
import { renderFeedback } from './feedback';
import { renderQuestion } from './render';

const country = (iso2: string): Country => countries.find((c) => c.iso2 === iso2)!;
const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const [br, ar, cl, pe, bo] = ['br', 'ar', 'cl', 'pe', 'bo'].map(country);

describe('renderCapitalQuestion', () => {
  it('asks countryToCapitals with the capitals as option labels', () => {
    const submit = vi.fn();
    const rendered = renderCapitalQuestion({ format: 'countryToCapitals', target: br, options: [ar, br, cl, pe] }, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Qual é a capital deste país?');
    expect(rendered.querySelector('.figure img')).not.toBeNull();
    expect(rendered.querySelector('.figure')!.textContent).toContain('Brasil');
    const buttons = [...rendered.querySelectorAll<HTMLButtonElement>('.name-option')];
    expect(buttons.map((b) => b.textContent)).toEqual(['Buenos Aires', 'Brasília', 'Santiago', 'Lima']);
    click(buttons[1]);
    expect(submit).toHaveBeenCalledWith({ kind: 'choice', iso2: 'br' });
  });

  it('asks capitalToCountries with the capital in the figure and flag-and-name options', () => {
    const submit = vi.fn();
    const rendered = renderCapitalQuestion({ format: 'capitalToCountries', target: br, options: [ar, br, cl, pe] }, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('De que país é esta capital?');
    expect(rendered.querySelector('.figure')!.textContent).toBe('Brasília');
    const buttons = [...rendered.querySelectorAll<HTMLButtonElement>('.name-option')];
    expect(buttons.map((b) => b.textContent)).toEqual(['Argentina', 'Brasil', 'Chile', 'Peru']);
    expect(buttons[0].querySelector('img')).not.toBeNull();
    click(buttons[1]);
    expect(submit).toHaveBeenCalledWith({ kind: 'choice', iso2: 'br' });
  });

  it('lists the main capitals sorted in capitalPairs', () => {
    const rendered = renderCapitalQuestion({ format: 'capitalPairs', target: br, countries: [br, ar, cl, pe] }, () => []);
    expect(rendered.querySelector('h2')!.textContent).toBe('Ligue cada país à sua capital');
    expect([...rendered.querySelectorAll('.name-option')].map((b) => b.textContent)).toEqual(['Brasília', 'Buenos Aires', 'Lima', 'Santiago']);
    expect(rendered.querySelectorAll('.pair-flag img')).toHaveLength(4);
  });

  it('asks capitalTrueFalse about the shown capital', () => {
    const submit = vi.fn();
    const rendered = renderCapitalQuestion({ format: 'capitalTrueFalse', target: br, shown: ar }, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('A capital de Brasil é Buenos Aires?');
    click(rendered.querySelector('.yes-no button')!);
    expect(submit).toHaveBeenCalledWith({ kind: 'yesNo', yes: true });
  });

  it('asks typeCapital and warns about typos', () => {
    const submit = vi.fn(() => [br]);
    const rendered = renderCapitalQuestion({ format: 'typeCapital', target: br }, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Escreva a capital deste país');
    const input = rendered.querySelector('input')!;
    expect(input.placeholder).toBe('Capital');
    input.value = 'Brazilia';
    rendered.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submit).toHaveBeenCalledWith({ kind: 'text', text: 'Brazilia' });
    expect(rendered.querySelector<HTMLElement>('.type-message')!.hidden).toBe(false);
    expect(rendered.querySelector('.type-message')!.textContent).toBe('Confira a grafia');
  });

  it('asks typeCapitalCountry with the capital in the figure', () => {
    const rendered = renderCapitalQuestion({ format: 'typeCapitalCountry', target: br }, () => []);
    expect(rendered.querySelector('h2')!.textContent).toBe('De que país é esta capital?');
    expect(rendered.querySelector('.figure')!.textContent).toBe('Brasília');
    expect(rendered.querySelector('input')!.placeholder).toBe('País');
  });

  it('is what renderQuestion draws for a capital format', () => {
    const rendered = renderQuestion({ format: 'typeCapital', target: br }, () => []);
    expect(rendered.querySelector('h2')!.textContent).toBe('Escreva a capital deste país');
  });
});

describe('capital solutions', () => {
  it('captions the card with every capital first and the country under it', () => {
    const caption = capitalCard(bo).querySelector('figcaption')!;
    expect(caption.firstElementChild!.className).toBe('solution-capital');
    expect(caption.querySelector('.solution-capital')!.textContent).toBe('Sucre / La Paz');
    expect(caption.querySelector('.solution-name')!.textContent).toBe('Bolívia');
  });

  it('shows one card for a single target and one per country for capitalPairs', () => {
    expect(capitalSolution({ format: 'typeCapital', target: bo }).querySelectorAll('.solution-card')).toHaveLength(1);
    const pairs = capitalSolution({ format: 'capitalPairs', target: br, countries: [br, ar, cl, pe] });
    expect(pairs.querySelectorAll('.solution-card')).toHaveLength(4);
  });

  it('shows the solution on a right answer when asked to', () => {
    const question = { format: 'typeCapital', target: bo } as const;
    const right = { correct: true, missed: [], typos: [] };
    const plain = renderFeedback(question, right, () => {});
    expect(plain.textContent).not.toContain('Sucre / La Paz');
    const shown = renderFeedback(question, right, () => {}, capitalSolution(question), true);
    expect(shown.textContent).toContain('Sucre / La Paz');
  });
});
