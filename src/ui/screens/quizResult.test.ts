// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import type { Screen } from '../navigation';
import { renderQuizResult } from './quizResult';

const [fiji, tonga, samoa] = ['fj', 'to', 'ws'].map((iso2) => countries.find((c) => c.iso2 === iso2)!);

function render(overrides: Partial<Extract<Screen, { name: 'quizResult' }>>): HTMLElement {
  const root = document.createElement('div');
  renderQuizResult(root, () => {}, {
    name: 'quizResult',
    continent: 'oceania',
    difficulty: 'easy',
    score: 0,
    timeMs: 0,
    finished: false,
    unanswered: [],
    missed: [],
    newRecords: { score: false, time: false },
    ...overrides,
  });
  return root;
}

const sectionNames = (root: HTMLElement, heading: string) => {
  const h2 = [...root.querySelectorAll('h2')].find((h) => h.textContent === heading);
  return h2 ? [...h2.nextElementSibling!.querySelectorAll('.solution-card')].map((card) => card.textContent) : null;
};

describe('renderQuizResult', () => {
  it('lists the unanswered flags with their names, like the wrong ones', () => {
    const root = render({ unanswered: [tonga, samoa], missed: [fiji] });
    expect(sectionNames(root, 'Bandeiras sem resposta (2)')!.map((t) => t!.startsWith(tonga.name) || t!.startsWith(samoa.name))).toEqual([true, true]);
    expect(sectionNames(root, 'Bandeiras que você errou')).toHaveLength(1);
  });

  it('shows no unanswered section when the quiz was finished', () => {
    const root = render({ finished: true });
    expect([...root.querySelectorAll('h2')].map((h) => h.textContent)).not.toContain('Bandeiras sem resposta (0)');
  });
});
