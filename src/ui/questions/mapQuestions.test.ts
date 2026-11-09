// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countries, type Country } from '../../data/countries';
import { MAP_ALL, type MapScope } from '../../data/maps';
import type { Question } from '../../engine/question';
import { renderFeedback } from './feedback';
import { mapSolution, renderMapQuestion, type MapQuestion } from './mapQuestions';
import { renderPairs } from './pairs';
import { renderQuestion } from './render';

const AMERICAS: MapScope = { continent: 'americas', level: MAP_ALL };

const country = (iso2: string): Country => countries.find((c) => c.iso2 === iso2)!;
const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const [br, ar, cl, pe, sv] = ['br', 'ar', 'cl', 'pe', 'sv'].map(country);

const viewBoxOf = (rendered: Element) => rendered.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number);

const shows = (rendered: Element, iso2: string) => {
  const [x, y, width, height] = viewBoxOf(rendered);
  const hit = rendered.querySelector(`circle.hit[data-iso2="${iso2}"]`)!;
  const [cx, cy] = [Number(hit.getAttribute('cx')), Number(hit.getAttribute('cy'))];
  return cx >= x && cx <= x + width && cy >= y && cy <= y + height;
};

const showsAll = (rendered: Element) => [...rendered.querySelectorAll<SVGCircleElement>('circle.hit')].every((hit) => shows(rendered, hit.dataset.iso2!));

beforeEach(() => {
  vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 260));
  vi.spyOn(SVGSVGElement.prototype, 'getScreenCTM').mockImplementation(function (this: SVGSVGElement) {
    const [, , width] = this.getAttribute('viewBox')!.split(' ').map(Number);
    return new DOMMatrix([390 / width!, 0, 0, 390 / width!, 0, 0]);
  });
});

afterEach(() => vi.restoreAllMocks());

describe('the initial view of a map question', () => {
  it('opens every ladder step on the highlighted country', () => {
    const questions: MapQuestion[] = [
      { format: 'mapFlagToNames', target: sv, options: [ar, br, cl, sv] },
      { format: 'mapToNames', target: sv, options: [ar, br, cl, sv] },
      { format: 'mapTypeName', target: sv },
    ];
    for (const question of questions) {
      const rendered = renderMapQuestion(question, AMERICAS, () => []);
      expect(shows(rendered, 'sv')).toBe(true);
      expect(showsAll(rendered)).toBe(false);
    }
  });

  it('opens the solution map on what it shows', () => {
    const solution = mapSolution({ format: 'mapTypeName', target: sv }, AMERICAS);
    expect(shows(solution, 'sv')).toBe(true);
    expect(showsAll(solution)).toBe(false);
  });
});

describe('renderMapQuestion', () => {
  it('answers mapToNames with a name button and the 1–4 keys', () => {
    const submit = vi.fn();
    const rendered = renderMapQuestion({ format: 'mapToNames', target: br, options: [ar, br, cl, pe] }, AMERICAS, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Que país é este?');
    expect(rendered.querySelector('path[data-iso2="br"]')!.classList.contains('highlight')).toBe(true);
    const buttons = rendered.querySelectorAll<HTMLButtonElement>('.name-option');
    expect(buttons).toHaveLength(4);
    expect(buttons[1].dataset.keys).toBe('2');
    click(buttons[1]);
    expect(submit).toHaveBeenCalledWith({ kind: 'choice', iso2: 'br' });
  });

  it('submits the typed name in mapTypeName', () => {
    const submit = vi.fn(() => []);
    const rendered = renderMapQuestion({ format: 'mapTypeName', target: br }, AMERICAS, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Escreva o nome deste país');
    rendered.querySelector('input')!.value = 'Brasil';
    rendered.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submit).toHaveBeenCalledWith({ kind: 'text', text: 'Brasil' });
  });
});

describe('mapSolution', () => {
  it('paints the target missed with its name', () => {
    const solution = mapSolution({ format: 'mapTypeName', target: br }, AMERICAS);
    expect(solution.querySelector('path[data-iso2="br"]')!.classList.contains('missed')).toBe(true);
    expect(solution.querySelector('.map-label')!.textContent).toBe('Brasil');
  });

});

describe('renderFeedback with a solution', () => {
  it('shows the given solution instead of the flag card on a wrong answer', () => {
    const question: Question = { format: 'mapTypeName', target: br };
    const solution = mapSolution(question, AMERICAS);
    const feedback = renderFeedback(question, { correct: false, missed: [br], typos: [] }, () => {}, solution);
    expect(feedback.contains(solution)).toBe(true);
    expect(feedback.querySelector('.solution-card')).toBeNull();
  });
});

describe('renderQuestion with a map question', () => {
  it('delegates to the map renderer with the continent', () => {
    const rendered = renderQuestion({ format: 'mapTypeName', target: br }, () => [], AMERICAS);
    expect(rendered.querySelector('path[data-iso2="br"]')).not.toBeNull();
  });
});

describe('renderPairs', () => {
  it('shows the flag pairs unchanged without a face', () => {
    const rendered = renderPairs('Ligue', [br, ar], () => []);
    expect(rendered.querySelectorAll('.pair-flag img')).toHaveLength(2);
  });

  it('draws a region question on the region map, with the other regions grey', () => {
    const sn = countries.find((c) => c.iso2 === 'sn')!;
    const rendered = renderQuestion({ format: 'mapTypeName', target: sn }, () => [], { continent: 'africa', level: 'west-coast' });
    expect(rendered.querySelector('path[data-iso2="ng"]')!.classList.contains('context')).toBe(true);
    expect(rendered.querySelector('path[data-iso2="gm"]')!.classList.contains('country')).toBe(true);
  });
});

describe('the ladder steps', () => {
  it('shows the flag next to the highlighted country at step 1', () => {
    const submit = vi.fn(() => []);
    const rendered = renderMapQuestion({ format: 'mapFlagToNames', target: br, options: [ar, br, cl, pe] }, AMERICAS, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Que país é este?');
    expect(rendered.querySelector('.map .highlight')).not.toBeNull();
    expect(rendered.querySelector<HTMLImageElement>('img.flag')!.src).toContain('/flags/br.svg');
    click([...rendered.querySelectorAll('.name-option')].find((b) => b.textContent === br.name)!);
    expect(submit).toHaveBeenCalledWith({ kind: 'choice', iso2: 'br' });
  });

  describe('step 2, finding the country', () => {
    const SOUTH: MapScope = { continent: 'americas', level: 'southern-cone' };
    const shape = (rendered: Element, iso2: string) => rendered.querySelector(`path[data-iso2="${iso2}"]`)!;
    const confirm = (rendered: Element) => [...rendered.querySelectorAll<HTMLButtonElement>('button.primary')].find((b) => b.textContent === 'Responder')!;

    it('names the country, shows its flag as a hint and frames the whole level with nothing marked', () => {
      const rendered = renderMapQuestion({ format: 'mapFindCountry', target: br }, SOUTH, () => []);
      expect(rendered.querySelector('h2')!.textContent).toBe('Onde fica Brasil?');
      expect(rendered.querySelector<HTMLImageElement>('img.flag')!.src).toContain('/flags/br.svg');
      expect(rendered.querySelector('.map .highlight')).toBeNull();
      for (const iso2 of ['br', 'ar', 'cl', 'py']) expect(shows(rendered, iso2), iso2).toBe(true);
      expect(confirm(rendered).disabled).toBe(true);
    });

    it('marks the tapped country, moves the mark on another tap and answers with it on Responder', () => {
      const submit = vi.fn(() => []);
      const rendered = renderMapQuestion({ format: 'mapFindCountry', target: br }, SOUTH, submit);
      click(shape(rendered, 'ar'));
      expect(shape(rendered, 'ar').classList.contains('highlight')).toBe(true);
      click(shape(rendered, 'cl'));
      expect(shape(rendered, 'ar').classList.contains('highlight')).toBe(false);
      expect(shape(rendered, 'cl').classList.contains('highlight')).toBe(true);
      expect(submit).not.toHaveBeenCalled();
      click(confirm(rendered));
      expect(submit).toHaveBeenCalledWith({ kind: 'choice', iso2: 'cl' });
    });

    it('answers with Enter once a country is marked', () => {
      const rendered = renderMapQuestion({ format: 'mapFindCountry', target: br }, SOUTH, () => []);
      expect(confirm(rendered).dataset.keys).toBe('Enter');
    });
  });

});
