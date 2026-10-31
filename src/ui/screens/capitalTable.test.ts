// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { capitalLabel, capitalPool } from '../../data/capitals';
import type { Screen } from '../navigation';
import { renderCapitalTable } from './capitalTable';

describe('renderCapitalTable', () => {
  let screens: Screen[];

  const render = (continent: 'africa' | 'oceania') => {
    const root = document.createElement('div');
    renderCapitalTable(root, (screen) => screens.push(screen), continent);
    return root;
  };

  beforeEach(() => {
    screens = [];
  });

  it('lists every capital pool country of Africa with its capitals, in alphabetical order', () => {
    const root = render('africa');
    const pool = capitalPool('africa', 'general').sort((a, b) => a.name.localeCompare(b.name, 'pt'));
    expect(root.querySelector('h1')!.textContent).toBe('África');
    expect(root.querySelector('.table-head .detail')!.textContent).toBe(`${pool.length} capitais`);
    expect([...root.querySelectorAll('.solution-name')].map((c) => c.textContent)).toEqual(pool.map((c) => `${c.name} · ${capitalLabel(c)}`));
  });

  it('goes back to the hub on the same continent on Voltar', () => {
    const root = render('africa');
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Voltar')!.click();
    expect(screens).toEqual([{ name: 'hub', continent: 'africa' }]);
  });

  it('opens a country large with its capitals in a dialog, and closes it on a click', () => {
    const root = render('oceania');
    document.body.append(root);
    const item = root.querySelector<HTMLButtonElement>('.flag-table-item')!;
    item.click();
    const dialog = root.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain(item.querySelector('.solution-name')!.textContent);
    dialog.click();
    expect(dialog.open).toBe(false);
    root.remove();
  });

  it('hides the names when the Nomes chip is switched off', () => {
    const root = render('africa');
    root.querySelector<HTMLButtonElement>('.names-toggle')!.click();
    expect(root.querySelector('.solution-grid')!.classList.contains('hide-names')).toBe(true);
  });
});
