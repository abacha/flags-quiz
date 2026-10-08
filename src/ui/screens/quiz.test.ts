// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countries, type Country } from '../../data/countries';
import { poolFor } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderQuiz } from './quiz';

const oceania = poolFor(countries, 'oceania', 'easy');
const byIso = new Map(countries.map((c) => [c.iso2, c]));

function countryIn(img: HTMLImageElement): Country {
  const iso2 = img.getAttribute('src')!.match(/flags\/(.+)\.svg$/)![1];
  return byIso.get(iso2)!;
}

describe('renderQuiz', () => {
  let root: HTMLElement;
  let screens: Screen[];

  const cells = () => [...root.querySelectorAll<HTMLButtonElement>('.quiz-cell')];
  const cellCountry = (cell: HTMLButtonElement) => countryIn(cell.querySelector('img')!);
  const currentCell = () => root.querySelector<HTMLButtonElement>('.quiz-cell.current')!;
  const bigFlag = () => countryIn(root.querySelector<HTMLImageElement>('.quiz-dock .figure img')!);
  const input = () => root.querySelector<HTMLInputElement>('.quiz-dock input')!;
  const message = () => root.querySelector<HTMLParagraphElement>('.quiz-message')!;
  const hud = () => root.querySelector('.topbar-counters')!.textContent;
  const fill = () => root.querySelector<HTMLElement>('.topbar-fill')!.style.width;
  const type = (text: string) => {
    input().value = text;
    root.querySelector<HTMLFormElement>('.quiz-dock form')!.requestSubmit();
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    localStorage.clear();
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderQuiz(root, (screen) => screens.push(screen), 'oceania', 'easy');
  });

  afterEach(() => {
    root.remove();
    vi.useRealTimers();
  });

  it('moves to the next flag on Pular, clearing the field and the error, without scoring', () => {
    type('nenhum lugar');
    input().value = 'meio digitado';
    [...root.querySelectorAll<HTMLButtonElement>('.quiz-dock button')].find((b) => b.textContent === 'Pular')!.click();
    expect(currentCell()).toBe(cells()[1]);
    expect(bigFlag()).toBe(cellCountry(cells()[1]));
    expect(input().value).toBe('');
    expect(message().hidden).toBe(true);
    expect(hud()).toContain('-1 pts');
    expect(hud()).toContain(`0/${oceania.length}`);
    expect(document.activeElement).toBe(input());
  });

  it('lays out every flag of the level as lazy thumbnails, the first one current, the field focused', () => {
    expect(cells()).toHaveLength(oceania.length);
    expect(new Set(cells().map((cell) => cellCountry(cell).iso2))).toEqual(new Set(oceania.map((c) => c.iso2)));
    expect(cells().every((cell) => cell.querySelector('img')!.getAttribute('loading') === 'lazy')).toBe(true);
    expect(currentCell()).toBe(cells()[0]);
    expect(bigFlag()).toBe(cellCountry(cells()[0]));
    expect(message().hidden).toBe(true);
    expect(hud()).toContain(`0/${oceania.length}`);
    expect(document.activeElement).toBe(input());
  });

  it('never puts the name of an unanswered flag in the page', () => {
    type('nenhum país');
    const html = root.innerHTML;
    for (const country of oceania) expect(html).not.toContain(country.name);
  });

  it('makes a tapped flag current, shows it large, clears the field and gives focus back to it', () => {
    const target = cells()[4];
    type('nenhum país');
    input().value = 'meio';
    input().blur();
    target.click();
    expect(currentCell()).toBe(target);
    expect(root.querySelectorAll('.quiz-cell.current')).toHaveLength(1);
    expect(bigFlag()).toBe(cellCountry(target));
    expect(input().value).toBe('');
    expect(message().hidden).toBe(true);
    expect(document.activeElement).toBe(input());
  });

  it('keeps the typed text when the current flag is tapped', () => {
    input().value = 'meio';
    cells()[0].click();
    expect(input().value).toBe('meio');
    expect(currentCell()).toBe(cells()[0]);
    expect(document.activeElement).toBe(input());
  });

  it('marks a wrong answer as missed, keeps the flag current and keeps its name hidden', () => {
    const first = cells()[0];
    type('nenhum país');
    expect(message().hidden).toBe(false);
    expect(message().textContent).toBe('Errado, tente de novo');
    expect(first.classList.contains('missed')).toBe(true);
    expect(currentCell()).toBe(first);
    expect(first.querySelector('.quiz-name')!.textContent).toBe('');
    expect(input().value).toBe('');
    expect(hud()).toContain('-1 pts');
    expect(document.activeElement).toBe(input());
  });

  it('ignores a blank answer', () => {
    type('   ');
    expect(cells()[0].classList.contains('missed')).toBe(false);
    expect(message().hidden).toBe(true);
    expect(hud()).toContain('0 pts');
  });

  it('fills a right answer in with its name, disables it and moves on without rebuilding the grid', () => {
    const before = cells();
    const first = before[0];
    const country = cellCountry(first);
    type('nenhum país');
    type(country.name);
    expect(first.classList.contains('answered')).toBe(true);
    expect(first.classList.contains('missed')).toBe(false);
    expect(first.classList.contains('current')).toBe(false);
    expect(first.disabled).toBe(true);
    expect(first.querySelector('.quiz-name')!.textContent).toBe(country.name);
    expect(currentCell()).toBe(before[1]);
    expect(message().hidden).toBe(true);
    expect(cells().every((cell, i) => cell === before[i])).toBe(true);
    expect(hud()).toContain(`1/${oceania.length}`);
    expect(document.activeElement).toBe(input());
  });

  it('hands a finished quiz to the result screen once every flag is answered', () => {
    for (let i = 0; i < oceania.length; i++) type(bigFlag().name);
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({
      name: 'quizResult',
      continent: 'oceania',
      difficulty: 'easy',
      score: oceania.length,
      finished: true,
      unanswered: [],
      missed: [],
    });
  });

  it('shows the level in the top bar and fills its bar with the answered flags', () => {
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Oceania · Fácil');
    expect(fill()).toBe('0%');
    type(bigFlag().name);
    expect(fill()).toBe(`${(1 / oceania.length) * 100}%`);
  });

  it('ends the quiz and opens its result on ✕', () => {
    type(bigFlag().name);
    root.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({ name: 'quizResult', score: 1, finished: false });
    expect((screens[0] as Extract<Screen, { name: 'quizResult' }>).unanswered).toHaveLength(oceania.length - 1);
  });

  it('keeps the hidden message in flow so showing it cannot resize the dock and desync the grid scroll', () => {
    // the dock is a flex column; an element leaving `display: none` adds both its own box and a flex `gap` to
    // the dock's height, shrinking the grid from below and invalidating any scroll position set while it was hidden
    const style = document.createElement('style');
    style.textContent = readFileSync('src/style.css', 'utf8');
    document.head.append(style);
    const rule = [...document.styleSheets[0]!.cssRules].find(
      (r): r is CSSStyleRule => 'selectorText' in r && (r as CSSStyleRule).selectorText === '.quiz-message[hidden]',
    );
    expect(rule).toBeDefined();
    expect(rule!.style.display).not.toBe('none');
    expect(rule!.style.visibility).toBe('hidden');
  });
});
