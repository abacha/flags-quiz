// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { goalFor, poolFor } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderGame } from './game';

describe('renderGame', () => {
  let root: HTMLElement;
  let screens: Screen[];

  beforeEach(() => {
    localStorage.clear();
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderGame(root, (screen) => screens.push(screen), 'oceania', 'easy');
  });

  afterEach(() => {
    root.remove();
  });

  it('shows the level, three lives, the correct answers out of the goal and an empty bar in the top bar', () => {
    const goal = goalFor('easy', poolFor(countries, 'oceania', 'easy').length);
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Oceania · Fácil');
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥0/${goal}`);
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(0);
    expect(root.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('0%');
  });

  it('leaves to the hub on the same continent on ✕', () => {
    root.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });

  it('has no Sair button besides the top bar', () => {
    expect([...root.querySelectorAll('button')].map((b) => b.textContent)).not.toContain('Sair');
  });
});
