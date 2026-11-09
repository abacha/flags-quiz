// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { countries, type Country } from '../../data/countries';
import { MAP_ALL, type MapScope } from '../../data/maps';
import { capitalCard, capitalSolution, renderCapitalQuestion } from './capitalQuestions';
import { renderFeedback } from './feedback';
import { renderQuestion } from './render';

const country = (iso2: string): Country => countries.find((c) => c.iso2 === iso2)!;
const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const [br, ar, cl, pe, bo, py] = ['br', 'ar', 'cl', 'pe', 'bo', 'py'].map(country);
const AMERICAS: MapScope = { continent: 'americas', level: MAP_ALL };

beforeEach(() => {
  vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 260));
  vi.spyOn(SVGSVGElement.prototype, 'getScreenCTM').mockImplementation(function (this: SVGSVGElement) {
    const [, , width] = this.getAttribute('viewBox')!.split(' ').map(Number);
    return new DOMMatrix([390 / width!, 0, 0, 390 / width!, 0, 0]);
  });
});

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

  it('asks capitalOnMap with the main capital pinned on the map and flag-and-name options', () => {
    const submit = vi.fn();
    const rendered = renderCapitalQuestion({ format: 'capitalOnMap', target: bo, options: [ar, bo, cl, py] }, submit, AMERICAS);
    expect(rendered.querySelector('h2')!.textContent).toBe('Em que país fica esta capital?');
    expect(rendered.querySelector('.map circle.map-pin')).not.toBeNull();
    expect(rendered.querySelector('.map text.map-label')!.textContent).toBe('Sucre');
    expect(rendered.querySelector('.map .highlight')).toBeNull();
    const buttons = [...rendered.querySelectorAll<HTMLButtonElement>('.name-option')];
    expect(buttons.map((b) => b.textContent)).toEqual(['Argentina', 'Bolívia', 'Chile', 'Paraguai']);
    expect(buttons[0].querySelector('img')).not.toBeNull();
    click(buttons[1]);
    expect(submit).toHaveBeenCalledWith({ kind: 'choice', iso2: 'bo' });
  });

  it('needs a map scope to draw capitalOnMap', () => {
    expect(() => renderQuestion({ format: 'capitalOnMap', target: bo, options: [ar, bo, cl, py] }, () => [])).toThrow('map scope');
    expect(renderQuestion({ format: 'capitalOnMap', target: bo, options: [ar, bo, cl, py] }, () => [], AMERICAS).querySelector('.map-pin')).not.toBeNull();
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

  it('shows one card for the target', () => {
    expect(capitalSolution({ format: 'typeCapital', target: bo }).querySelectorAll('.solution-card')).toHaveLength(1);
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
