// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countries } from '../../data/countries';
import { mapPool } from '../../data/maps';
import { listenForBack, settleBack } from '../backButton';
import type { Screen } from '../navigation';
import { renderMapQuiz } from './mapQuiz';

const pool = mapPool('oceania');
const byIso = new Map(countries.map((c) => [c.iso2, c]));

function pressDeviceBack(): void {
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  vi.spyOn(history, 'back').mockImplementation(() => {});
  const stop = listenForBack();
  settleBack();
  window.dispatchEvent(new PopStateEvent('popstate'));
  stop();
}

describe('renderMapQuiz', () => {
  let root: HTMLElement;
  let screens: Screen[];

  const highlighted = () => {
    const shapes = root.querySelectorAll<SVGPathElement>('path.country.highlight');
    expect(shapes).toHaveLength(1);
    return byIso.get(shapes[0].dataset.iso2!)!;
  };
  const shape = (iso2: string) => root.querySelector<SVGPathElement>(`path[data-iso2="${iso2}"]`)!;
  const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const labels = () => [...root.querySelectorAll('.map-label')].map((label) => label.textContent);
  const input = () => root.querySelector<HTMLInputElement>('.quiz-dock input')!;
  const message = () => root.querySelector<HTMLParagraphElement>('.quiz-message')!;
  const hud = () => root.querySelector('.topbar-counters')!.textContent;
  const type = (text: string) => {
    input().value = text;
    root.querySelector<HTMLFormElement>('.quiz-dock form')!.requestSubmit();
  };
  const otherThan = (iso2: string) => pool.find((c) => c.iso2 !== iso2)!;
  const shows = (iso2: string) => {
    const [x, y, width, height] = root.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number);
    const hit = root.querySelector(`circle.hit[data-iso2="${iso2}"]`)!;
    const [cx, cy] = [Number(hit.getAttribute('cx')), Number(hit.getAttribute('cy'))];
    return cx >= x! && cx <= x! + width! && cy >= y! && cy <= y! + height!;
  };
  const frames: FrameRequestCallback[] = [];
  const settle = () => {
    while (frames.length) frames.shift()!(performance.now() + 1000);
  };
  const pressSkip = () => [...root.querySelectorAll<HTMLButtonElement>('.quiz-dock button')].find((b) => b.textContent === 'Pular')!.click();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    frames.length = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => frames.splice(0));
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 260));
    vi.spyOn(SVGSVGElement.prototype, 'getScreenCTM').mockImplementation(function (this: SVGSVGElement) {
      const [, , width] = this.getAttribute('viewBox')!.split(' ').map(Number);
      return new DOMMatrix([390 / width!, 0, 0, 390 / width!, 0, 0]);
    });
    localStorage.clear();
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderMapQuiz(root, (screen) => screens.push(screen), 'oceania');
  });

  afterEach(() => {
    root.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens framed on the highlighted country', () => {
    expect(frames).toHaveLength(0);
    expect(shows(highlighted().iso2)).toBe(true);
    expect(pool.every((c) => shows(c.iso2))).toBe(false);
  });

  it('slides to the next highlighted country after Pular', () => {
    pressSkip();
    expect(frames).toHaveLength(1);
    settle();
    expect(shows(highlighted().iso2)).toBe(true);
    expect(pool.every((c) => shows(c.iso2))).toBe(false);
  });

  it('slides to a tapped country', () => {
    const far = pool.find((c) => !shows(c.iso2))!;
    click(shape(far.iso2));
    expect(frames).toHaveLength(1);
    settle();
    expect(highlighted()).toBe(far);
    expect(shows(far.iso2)).toBe(true);
  });

  it('shows the map with one highlighted country, no flag and no name in the page', () => {
    expect(root.querySelectorAll('.quiz-dock .figure, .quiz-dock img')).toHaveLength(0);
    expect(root.querySelectorAll('path.country')).toHaveLength(pool.length);
    expect(labels()).toEqual([]);
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Mapa · Oceania');
    expect(hud()).toContain(`0/${pool.length}`);
    expect(document.activeElement).toBe(input());
  });

  it('paints the typed country answered with its name and moves the highlight', () => {
    const first = highlighted();
    type(first.name);
    expect(shape(first.iso2).classList.contains('answered')).toBe(true);
    expect(shape(first.iso2).classList.contains('highlight')).toBe(false);
    expect(labels()).toEqual([first.name]);
    expect(highlighted()).not.toBe(first);
    expect(hud()).toContain(`1/${pool.length}`);
    expect(document.activeElement).toBe(input());
  });

  it('shows Errado, tente de novo on a wrong name and keeps the country highlighted', () => {
    const first = highlighted();
    type('nenhum país');
    expect(message().hidden).toBe(false);
    expect(message().textContent).toBe('Errado, tente de novo');
    expect(highlighted()).toBe(first);
    expect(hud()).toContain('-1 pts');
  });

  it('paints a missed country red once another one is highlighted', () => {
    const first = highlighted();
    type('nenhum país');
    click(shape(otherThan(first.iso2).iso2));
    expect(shape(first.iso2).classList.contains('missed')).toBe(true);
    expect(highlighted()).not.toBe(first);
  });

  it('moves the highlight on Pular without scoring', () => {
    const first = highlighted();
    input().value = 'meio';
    [...root.querySelectorAll<HTMLButtonElement>('.quiz-dock button')].find((b) => b.textContent === 'Pular')!.click();
    expect(highlighted()).not.toBe(first);
    expect(input().value).toBe('');
    expect(hud()).toContain('0 pts');
  });

  it('moves the highlight to a tapped country, clearing the field and the error', () => {
    type('nenhum país');
    const target = otherThan(highlighted().iso2);
    click(shape(target.iso2));
    expect(highlighted()).toBe(target);
    expect(input().value).toBe('');
    expect(message().hidden).toBe(true);
    expect(document.activeElement).toBe(input());
  });

  it('reaches a small country through its hit circle', () => {
    const target = otherThan(highlighted().iso2);
    click(root.querySelector(`circle[data-iso2="${target.iso2}"]`)!);
    expect(highlighted()).toBe(target);
  });

  it('leaves the highlight where it was when an answered country is tapped', () => {
    const first = highlighted();
    type(first.name);
    const current = highlighted();
    click(shape(first.iso2));
    click(root.querySelector(`circle[data-iso2="${first.iso2}"]`)!);
    expect(highlighted()).toBe(current);
    expect(shape(first.iso2).classList.contains('answered')).toBe(true);
  });

  it('does nothing when the ocean or a grey neighbour is tapped', () => {
    const current = highlighted();
    type('nenhum país');
    click(root.querySelector('svg')!);
    for (const grey of root.querySelectorAll('path.context')) click(grey);
    expect(highlighted()).toBe(current);
    expect(message().hidden).toBe(false);
  });

  it('saves a finished quiz under the map records and hands it to the result screen', () => {
    for (let i = 0; i < pool.length; i++) type(highlighted().name);
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({
      name: 'mapQuizResult',
      continent: 'oceania',
      score: pool.length,
      errors: 0,
      finished: true,
      unanswered: [],
      missed: [],
      newRecords: { score: true, time: true },
    });
    expect(JSON.parse(localStorage.getItem('flags-quiz:map-quiz-records')!).oceania.bestScore).toBe(pool.length);
    expect(localStorage.getItem('flags-quiz:quiz-records-v2')).toBeNull();
  });

  it('ends the quiz on ✕, counting each unanswered country as an error', () => {
    type(highlighted().name);
    root.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(screens[0]).toMatchObject({ name: 'mapQuizResult', score: 2 - pool.length, errors: pool.length - 1, finished: false });
  });

  it('asks before ending the quiz on the device back, and keeps playing when declined', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    pressDeviceBack();
    expect(confirm).toHaveBeenCalledWith('Encerrar o quiz?');
    expect(screens).toHaveLength(0);
  });

  it('ends the quiz on the device back once confirmed', () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    pressDeviceBack();
    expect(screens[0]).toMatchObject({ name: 'mapQuizResult', finished: false });
  });
});
