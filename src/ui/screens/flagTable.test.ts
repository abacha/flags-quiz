// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import type { Screen } from '../navigation';
import { renderFlagTable } from './flagTable';

describe('renderFlagTable', () => {
  let screens: Screen[];

  const render = (continent: 'oceania' | 'world') => {
    const root = document.createElement('div');
    renderFlagTable(root, (screen) => screens.push(screen), continent);
    return root;
  };
  const captions = (root: HTMLElement) => [...root.querySelectorAll('.solution-card figcaption')].map((c) => c.firstChild!.textContent);

  beforeEach(() => {
    screens = [];
  });

  it('lists every flag of the continent with its name, in alphabetical order', () => {
    const root = render('oceania');
    const oceania = countries.filter((c) => c.continent === 'oceania').map((c) => c.name);
    expect(root.querySelector('h1')!.textContent).toBe('Oceania');
    expect(captions(root)).toEqual([...oceania].sort((a, b) => a.localeCompare(b, 'pt')));
  });

  it('lists all 248 flags for Mundo', () => {
    expect(captions(render('world'))).toHaveLength(248);
  });

  it('goes back home on Voltar', () => {
    const root = render('oceania');
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Voltar')!.click();
    expect(screens).toEqual([{ name: 'home' }]);
  });

  it('opens a flag large with its name in a dialog, and closes it on a click', () => {
    const root = render('oceania');
    document.body.append(root);
    const tonga = [...root.querySelectorAll<HTMLButtonElement>('.flag-table-item')].find((b) => b.textContent!.startsWith('Tonga'))!;
    tonga.click();
    const dialog = root.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('img')!.getAttribute('src')).toMatch(/flags\/to\.svg$/);
    expect(dialog.textContent).toContain('Tonga');
    dialog.click();
    expect(dialog.open).toBe(false);
    root.remove();
  });
});
