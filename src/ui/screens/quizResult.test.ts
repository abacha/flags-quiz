// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import type { Screen } from '../navigation';
import { renderQuizResult } from './quizResult';

const [fiji, tonga, samoa] = ['fj', 'to', 'ws'].map((iso2) => countries.find((c) => c.iso2 === iso2)!);

function render(overrides: Partial<Extract<Screen, { name: 'quizResult' }>>, screens: Screen[] = []): HTMLElement {
  const root = document.createElement('div');
  renderQuizResult(root, (screen) => screens.push(screen), {
    name: 'quizResult',
    continent: 'oceania',
    difficulty: 'easy',
    score: 0,
    timeMs: 0,
    errors: 0,
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
  it('celebrates a finished quiz and shows points, time and errors as stat blocks', () => {
    const root = render({ finished: true, score: 18, timeMs: 192000, errors: 2 });
    expect(root.querySelector('h1')!.textContent).toBe('🎉 Quiz concluído!');
    expect(root.querySelector('.detail')!.textContent).toBe('Oceania · Fácil');
    expect([...root.querySelectorAll('.stat')].map((s) => [s.querySelector('b')!.textContent, s.querySelector('span')!.textContent])).toEqual([
      ['18', 'pontos'],
      ['03:12', 'tempo'],
      ['2', 'erros'],
    ]);
  });

  it('titles a quiz ended early as ended', () => {
    expect(render({}).querySelector('h1')!.textContent).toBe('Quiz encerrado');
  });

  it('keeps the new record lines', () => {
    const root = render({ finished: true, newRecords: { score: true, time: true } });
    expect([...root.querySelectorAll('.record')].map((p) => p.textContent)).toEqual(['🏆 Novo recorde de pontos!', '🏆 Novo recorde de tempo!']);
  });

  it('opens the quiz of the next level and goes back to the hub on the same continent', () => {
    const screens: Screen[] = [];
    const root = render({ finished: true }, screens);
    const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
    button('Próximo nível: Médio →').click();
    button('Voltar ao início').click();
    expect(screens).toEqual([
      { name: 'quiz', continent: 'oceania', difficulty: 'medium' },
      { name: 'hub', continent: 'oceania' },
    ]);
  });

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
