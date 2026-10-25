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
const [br, ar, cl, pe, co, sv] = ['br', 'ar', 'cl', 'pe', 'co', 'sv'].map(country);

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
  it('opens mapToNames, mapTrueFalse and mapTypeName on the highlighted country', () => {
    const questions: MapQuestion[] = [
      { format: 'mapToNames', target: sv, options: [ar, br, cl, sv] },
      { format: 'mapTrueFalse', target: sv, shown: ar },
      { format: 'mapTypeName', target: sv },
    ];
    for (const question of questions) {
      const rendered = renderMapQuestion(question, AMERICAS, () => {});
      expect(shows(rendered, 'sv')).toBe(true);
      expect(showsAll(rendered)).toBe(false);
    }
  });

  it('opens mapPairs on its four countries', () => {
    const rendered = renderMapQuestion({ format: 'mapPairs', target: br, countries: [br, ar, cl, pe] }, AMERICAS, () => {});
    for (const iso2 of ['br', 'ar', 'cl', 'pe']) expect(shows(rendered, iso2)).toBe(true);
    expect(showsAll(rendered)).toBe(false);
  });

  it('opens nameToMap on the whole continent', () => {
    expect(showsAll(renderMapQuestion({ format: 'nameToMap', target: sv }, AMERICAS, () => {}))).toBe(true);
  });

  it('opens the solution map on what it shows', () => {
    const solution = mapSolution({ format: 'nameToMap', target: sv }, AMERICAS);
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

  it('submits the tapped country in nameToMap', () => {
    const submit = vi.fn();
    const rendered = renderMapQuestion({ format: 'nameToMap', target: br }, AMERICAS, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Onde fica Brasil?');
    click(rendered.querySelector('path[data-iso2="ar"]')!);
    expect(submit).toHaveBeenCalledWith({ kind: 'choice', iso2: 'ar' });
  });

  it('submits nothing when the ocean or a grey country is tapped in nameToMap', () => {
    const submit = vi.fn();
    const rendered = renderMapQuestion({ format: 'nameToMap', target: br }, AMERICAS, submit);
    click(rendered.querySelector('svg')!);
    click(rendered.querySelector('path.context')!);
    expect(submit).not.toHaveBeenCalled();
  });

  it('links letters to names in mapPairs', () => {
    const submit = vi.fn();
    const countriesShown = [br, ar, cl, pe];
    const rendered = renderMapQuestion({ format: 'mapPairs', target: br, countries: countriesShown }, AMERICAS, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Ligue cada nome ao país');
    expect([...rendered.querySelectorAll('.map-label')].map((l) => l.textContent)).toEqual(['A', 'B', 'C', 'D']);
    const letters = [...rendered.querySelectorAll('.pair-flag')];
    expect(letters.map((b) => b.querySelector('.pair-letter')!.textContent)).toEqual(['A', 'B', 'C', 'D']);
    countriesShown.forEach((c, index) => {
      click(letters[index]);
      click([...rendered.querySelectorAll('.name-option')].find((b) => b.textContent === c.name)!);
    });
    click(rendered.querySelector('button.primary')!);
    expect(submit).toHaveBeenCalledWith({ kind: 'links', links: { br: 'br', ar: 'ar', cl: 'cl', pe: 'pe' } });
  });

  it('asks yes or no in mapTrueFalse', () => {
    const submit = vi.fn();
    const rendered = renderMapQuestion({ format: 'mapTrueFalse', target: br, shown: ar }, AMERICAS, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Este é Argentina?');
    click(rendered.querySelectorAll('.yes-no button')[1]);
    expect(submit).toHaveBeenCalledWith({ kind: 'yesNo', yes: false });
  });

  it('submits the typed name in mapTypeName', () => {
    const submit = vi.fn();
    const rendered = renderMapQuestion({ format: 'mapTypeName', target: br }, AMERICAS, submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Escreva o nome deste país');
    rendered.querySelector('input')!.value = 'Brasil';
    rendered.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submit).toHaveBeenCalledWith({ kind: 'text', text: 'Brasil' });
  });
});

describe('mapSolution', () => {
  it('paints the target missed with its name', () => {
    const solution = mapSolution({ format: 'nameToMap', target: br }, AMERICAS);
    expect(solution.querySelector('path[data-iso2="br"]')!.classList.contains('missed')).toBe(true);
    expect(solution.querySelector('.map-label')!.textContent).toBe('Brasil');
  });

  it('paints the four mapPairs countries missed with their names', () => {
    const solution = mapSolution({ format: 'mapPairs', target: br, countries: [br, ar, cl, co] }, AMERICAS);
    expect(solution.querySelectorAll('path.missed')).toHaveLength(4);
    expect([...solution.querySelectorAll('.map-label')].map((l) => l.textContent)).toEqual(['Brasil', 'Argentina', 'Chile', 'Colômbia']);
  });
});

describe('renderFeedback with a solution', () => {
  it('shows the given solution instead of the flag card on a wrong answer', () => {
    const question: Question = { format: 'nameToMap', target: br };
    const solution = mapSolution(question, AMERICAS);
    const feedback = renderFeedback(question, { correct: false, missed: [br] }, () => {}, solution);
    expect(feedback.contains(solution)).toBe(true);
    expect(feedback.querySelector('.solution-card')).toBeNull();
  });
});

describe('renderQuestion with a map question', () => {
  it('delegates to the map renderer with the continent', () => {
    const rendered = renderQuestion({ format: 'nameToMap', target: br }, () => {}, AMERICAS);
    expect(rendered.querySelector('path[data-iso2="br"]')).not.toBeNull();
  });
});

describe('renderPairs', () => {
  it('shows the flag pairs unchanged without a face', () => {
    const rendered = renderPairs('Ligue', [br, ar], () => {});
    expect(rendered.querySelectorAll('.pair-flag img')).toHaveLength(2);
  });

  it('asks Onde fica X on the region map, with the other regions grey', () => {
    const sn = countries.find((c) => c.iso2 === 'sn')!;
    const rendered = renderQuestion({ format: 'nameToMap', target: sn }, () => {}, { continent: 'africa', level: 'west-coast' });
    expect(rendered.querySelector('path[data-iso2="ng"]')!.classList.contains('context')).toBe(true);
    expect(rendered.querySelector('path[data-iso2="gm"]')!.classList.contains('country')).toBe(true);
  });
});
