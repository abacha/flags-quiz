// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { countries, type Country } from '../../data/countries';
import type { Question } from '../../engine/question';
import { renderFeedback } from './feedback';
import { mapSolution, renderMapQuestion } from './mapQuestions';
import { renderPairs } from './pairs';
import { renderQuestion } from './render';

const country = (iso2: string): Country => countries.find((c) => c.iso2 === iso2)!;
const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const [br, ar, cl, pe, co] = ['br', 'ar', 'cl', 'pe', 'co'].map(country);

describe('renderMapQuestion', () => {
  it('answers mapToNames with a name button and the 1–4 keys', () => {
    const submit = vi.fn();
    const rendered = renderMapQuestion({ format: 'mapToNames', target: br, options: [ar, br, cl, pe] }, 'americas', submit);
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
    const rendered = renderMapQuestion({ format: 'nameToMap', target: br }, 'americas', submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Onde fica Brasil?');
    click(rendered.querySelector('path[data-iso2="ar"]')!);
    expect(submit).toHaveBeenCalledWith({ kind: 'choice', iso2: 'ar' });
  });

  it('submits nothing when the ocean or a grey country is tapped in nameToMap', () => {
    const submit = vi.fn();
    const rendered = renderMapQuestion({ format: 'nameToMap', target: br }, 'americas', submit);
    click(rendered.querySelector('svg')!);
    click(rendered.querySelector('path.context')!);
    expect(submit).not.toHaveBeenCalled();
  });

  it('links letters to names in mapPairs', () => {
    const submit = vi.fn();
    const countriesShown = [br, ar, cl, pe];
    const rendered = renderMapQuestion({ format: 'mapPairs', target: br, countries: countriesShown }, 'americas', submit);
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
    const rendered = renderMapQuestion({ format: 'mapTrueFalse', target: br, shown: ar }, 'americas', submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Este é Argentina?');
    click(rendered.querySelectorAll('.yes-no button')[1]);
    expect(submit).toHaveBeenCalledWith({ kind: 'yesNo', yes: false });
  });

  it('submits the typed name in mapTypeName', () => {
    const submit = vi.fn();
    const rendered = renderMapQuestion({ format: 'mapTypeName', target: br }, 'americas', submit);
    expect(rendered.querySelector('h2')!.textContent).toBe('Escreva o nome deste país');
    rendered.querySelector('input')!.value = 'Brasil';
    rendered.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submit).toHaveBeenCalledWith({ kind: 'text', text: 'Brasil' });
  });
});

describe('mapSolution', () => {
  it('paints the target missed with its name', () => {
    const solution = mapSolution({ format: 'nameToMap', target: br }, 'americas');
    expect(solution.querySelector('path[data-iso2="br"]')!.classList.contains('missed')).toBe(true);
    expect(solution.querySelector('.map-label')!.textContent).toBe('Brasil');
  });

  it('paints the four mapPairs countries missed with their names', () => {
    const solution = mapSolution({ format: 'mapPairs', target: br, countries: [br, ar, cl, co] }, 'americas');
    expect(solution.querySelectorAll('path.missed')).toHaveLength(4);
    expect([...solution.querySelectorAll('.map-label')].map((l) => l.textContent)).toEqual(['Brasil', 'Argentina', 'Chile', 'Colômbia']);
  });
});

describe('renderFeedback with a solution', () => {
  it('shows the given solution instead of the flag card on a wrong answer', () => {
    const question: Question = { format: 'nameToMap', target: br };
    const solution = mapSolution(question, 'americas');
    const feedback = renderFeedback(question, { correct: false, missed: [br] }, () => {}, solution);
    expect(feedback.contains(solution)).toBe(true);
    expect(feedback.querySelector('.solution-card')).toBeNull();
  });
});

describe('renderQuestion with a map question', () => {
  it('delegates to the map renderer with the continent', () => {
    const rendered = renderQuestion({ format: 'nameToMap', target: br }, () => {}, 'americas');
    expect(rendered.querySelector('path[data-iso2="br"]')).not.toBeNull();
  });
});

describe('renderPairs', () => {
  it('shows the flag pairs unchanged without a face', () => {
    const rendered = renderPairs('Ligue', [br, ar], () => {});
    expect(rendered.querySelectorAll('.pair-flag img')).toHaveLength(2);
  });
});
