// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapPool } from '../../data/maps';
import { listenForBack, settleBack } from '../backButton';
import type { Screen } from '../navigation';
import { renderMapTable } from './mapTable';

const pool = mapPool('oceania', 'general');

describe('renderMapTable', () => {
  let root: HTMLElement;
  let screens: Screen[];

  const labels = () => [...root.querySelectorAll('.map-label')].map((label) => label.textContent);
  const highlighted = () => [...root.querySelectorAll<SVGPathElement>('path.country.highlight')].map((shape) => shape.dataset.iso2);
  const toggle = () => root.querySelector<HTMLInputElement>('.table-head .names-toggle input')!;
  const tap = (iso2: string) =>
    root.querySelector(`path[data-iso2="${iso2}"]`)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  beforeEach(() => {
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 260));
    vi.spyOn(SVGSVGElement.prototype, 'getScreenCTM').mockImplementation(function (this: SVGSVGElement) {
      const [, , width] = this.getAttribute('viewBox')!.split(' ').map(Number);
      return new DOMMatrix([390 / width!, 0, 0, 390 / width!, 0, 0]);
    });
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderMapTable(root, (screen) => screens.push(screen), 'oceania');
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  it('heads the screen with the continent and its number of countries', () => {
    expect(root.querySelector('.table-head h1')!.textContent).toBe('Oceania');
    expect(root.querySelector('.table-head .detail')!.textContent).toBe(`${pool.length} países`);
  });

  it('names every country of the continent on the map, and only those', () => {
    expect(toggle().checked).toBe(true);
    expect(labels().sort()).toEqual(pool.map((c) => c.name).sort());
  });

  it('clears the names when Nomes is unchecked and puts them back when checked', () => {
    toggle().click();
    expect(labels()).toEqual([]);
    toggle().click();
    expect(labels()).toHaveLength(pool.length);
  });

  it('highlights and names a tapped country with the names hidden, moving to the next one tapped', () => {
    const [first, second] = pool;
    toggle().click();
    tap(first!.iso2);
    expect(highlighted()).toEqual([first!.iso2]);
    expect(labels()).toEqual([first!.name]);
    tap(second!.iso2);
    expect(highlighted()).toEqual([second!.iso2]);
    expect(labels()).toEqual([second!.name]);
  });

  it('leaves the map as it is on a tap with the names shown', () => {
    tap(pool[0]!.iso2);
    expect(highlighted()).toEqual([]);
    expect(labels()).toHaveLength(pool.length);
  });

  it('goes back to the hub on the same continent on Voltar', () => {
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Voltar')!.click();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });

  it('goes back to the hub on the device back', () => {
    vi.spyOn(history, 'pushState').mockImplementation(() => {});
    const stop = listenForBack();
    settleBack();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
    stop();
  });
});
