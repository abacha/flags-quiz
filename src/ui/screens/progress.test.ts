// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import type { Screen } from '../navigation';
import { renderProgress } from './progress';

describe('renderProgress', () => {
  let root: HTMLElement;
  let screens: Screen[];

  const block = (continent: string) =>
    [...root.querySelectorAll<HTMLElement>('.progress-continent')].find((section) => section.querySelector('h2')!.textContent === continent)!;
  const levels = (continent: string) => [...block(continent).querySelectorAll('li')].map((li) => li.textContent);

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'flags-quiz:quiz-records-v2',
      JSON.stringify({
        africa: { easy: { bestScore: 20, bestTimeMs: 192000, completed: true }, medium: { bestScore: 12, completed: true }, hard: { bestScore: 9 } },
        world: { easy: { bestScore: 84, bestTimeMs: 754000 } },
      }),
    );
    root = document.createElement('div');
    screens = [];
    renderProgress(root, (screen) => screens.push(screen));
  });

  it('shows the completed quizzes out of every level of every continent and Mundo', () => {
    expect(root.querySelector('.progress-total')!.textContent).toBe('3/24 quizzes concluídos');
  });

  it('lists Mundo and the five continents in the home order, each with its count and bar', () => {
    expect([...root.querySelectorAll('.progress-continent h2')].map((h) => h.textContent)).toEqual([
      'Mundo',
      'África',
      'Américas',
      'Ásia',
      'Europa',
      'Oceania',
    ]);
    expect(block('África').querySelector('.progress-count')!.textContent).toBe('2/4');
    expect(block('África').querySelector<HTMLElement>('.progress-fill')!.style.width).toBe('50%');
    expect(block('Ásia').querySelector('.progress-count')!.textContent).toBe('0/4');
  });

  it('marks each level completed, with its best time when there is one', () => {
    expect(levels('África')).toEqual(['Fácil✓ 03:12', 'Médio✓', 'Difícil—', 'Geral—']);
    expect(levels('Mundo')[0]).toBe('Fácil✓ 12:34');
  });

  it('goes back home on Voltar', () => {
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Voltar')!.click();
    expect(screens).toEqual([{ name: 'home' }]);
  });
});
