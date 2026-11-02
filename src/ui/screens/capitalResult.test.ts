// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { Screen } from '../navigation';
import { renderCapitalResult } from './capitalResult';

function render(overrides: Partial<Extract<Screen, { name: 'capitalResult' }>>): HTMLElement {
  const root = document.createElement('div');
  renderCapitalResult(root, () => {}, { name: 'capitalResult', continent: 'oceania', difficulty: 'easy', won: false, medal: null, correct: 2, missed: [], ...overrides });
  return root;
}

describe('renderCapitalResult', () => {
  it('bounces the title on a win and keeps it still on a loss', () => {
    expect(render({ won: true, medal: 'silver' }).querySelector('h1')!.classList.contains('cheer')).toBe(true);
    expect(render({}).querySelector('h1')!.classList.contains('cheer')).toBe(false);
  });
});
