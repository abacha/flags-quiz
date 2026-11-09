// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { capitalPool } from '../../data/capitals';
import type { Screen } from '../navigation';
import { renderCapitalResult } from './capitalResult';

function render(overrides: Partial<Extract<Screen, { name: 'capitalResult' }>>): HTMLElement {
  const root = document.createElement('div');
  renderCapitalResult(root, () => {}, { name: 'capitalResult', continent: 'oceania', difficulty: 'easy', won: false, medal: null, done: 2, correct: 2, answered: 4, missed: [], ...overrides });
  return root;
}

describe('renderCapitalResult', () => {
  it('bounces the title on a win and keeps it still on a loss', () => {
    expect(render({ won: true, medal: 'silver' }).querySelector('h1')!.classList.contains('cheer')).toBe(true);
    expect(render({}).querySelector('h1')!.classList.contains('cheer')).toBe(false);
  });

  it('titles a lost round by the countries done out of the level size', () => {
    expect(render({}).querySelector('h1')!.textContent).toBe(`Você fez 2 de ${capitalPool('oceania', 'easy').length}`);
  });

  it('offers no Learn on Geral as the next level after Difícil', () => {
    const root = render({ difficulty: 'hard', won: true, medal: 'gold' });
    expect(root.querySelector('.result-actions')!.textContent).not.toContain('Próximo nível');
    expect(render({ difficulty: 'medium' }).querySelector('.result-actions')!.textContent).toContain('Próximo nível: Difícil');
  });

  it('shows the correct answers out of every answer given', () => {
    expect([...render({}).querySelectorAll('.stat')].map((s) => s.textContent)).toEqual(['2/4acertos']);
  });
});
