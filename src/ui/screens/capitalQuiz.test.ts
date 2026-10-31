// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { capitalLabel, capitalPool, mainCapital } from '../../data/capitals';
import { countries } from '../../data/countries';
import type { Screen } from '../navigation';
import { renderCapitalQuiz } from './capitalQuiz';

const byName = new Map(countries.map((c) => [c.name, c]));

describe('renderCapitalQuiz', () => {
  let root: HTMLElement;
  let screens: Screen[];

  const cells = () => [...root.querySelectorAll<HTMLButtonElement>('.quiz-cell')];
  const cellOf = (name: string) => cells().find((cell) => cell.querySelector('.quiz-name')!.textContent!.startsWith(name))!;
  const input = () => root.querySelector<HTMLInputElement>('.quiz-dock input')!;
  const type = (text: string) => {
    input().value = text;
    root.querySelector<HTMLFormElement>('.quiz-dock form')!.requestSubmit();
  };
  const render = (continent: Parameters<typeof renderCapitalQuiz>[2], difficulty: Parameters<typeof renderCapitalQuiz>[3]) => {
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderCapitalQuiz(root, (screen) => screens.push(screen), continent, difficulty);
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    localStorage.clear();
  });

  afterEach(() => {
    root.remove();
    vi.useRealTimers();
  });

  it('titles the quiz with the Capitais prefix, asks for a capital and shows the country as the figure', () => {
    render('oceania', 'easy');
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Capitais · Oceania · Fácil');
    expect(input().placeholder).toBe('Capital');
    expect(root.querySelector('.quiz-dock .country-name')!.textContent).toBe(
      byName.get(root.querySelector('.quiz-dock .country-name')!.textContent!)!.name,
    );
  });

  it('shows every country name on its cell before any answer, without revealing a capital', () => {
    render('oceania', 'easy');
    const pool = capitalPool('oceania', 'easy');
    expect(cells().map((cell) => cell.querySelector('.quiz-name')!.textContent).sort()).toEqual(pool.map((c) => c.name).sort());
    for (const country of pool) expect(root.querySelector('.quiz-grid')!.innerHTML).not.toContain(mainCapital(country));
  });

  it('appends every capital to the cell of a country answered right', () => {
    render('americas', 'general');
    cellOf('Bolívia').click();
    type('La Paz');
    expect(cellOf('Bolívia').querySelector('.quiz-name')!.textContent).toBe(`Bolívia · ${capitalLabel(byName.get('Bolívia')!)}`);
    expect(capitalLabel(byName.get('Bolívia')!)).toBe('Sucre / La Paz');
  });

  it('finishes on the capital result and saves under the capital records key only', () => {
    render('oceania', 'easy');
    while (!screens.length) {
      const country = byName.get(root.querySelector('.quiz-dock .country-name')!.textContent!)!;
      type(mainCapital(country));
    }
    expect(screens).toMatchObject([{ name: 'capitalQuizResult', continent: 'oceania', difficulty: 'easy', finished: true, errors: 0 }]);
    expect(JSON.parse(localStorage.getItem('flags-quiz:capital-quiz-records')!).oceania.easy.completed).toBe(true);
    expect(localStorage.getItem('flags-quiz:quiz-records-v2')).toBeNull();
  });
});
