// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { countries } from '../../data/countries';
import { listenForBack, settleBack } from '../backButton';
import type { Screen } from '../navigation';
import { renderQuizResult } from './quizResult';

const [fiji, tonga, samoa] = ['fj', 'to', 'ws'].map((iso2) => countries.find((c) => c.iso2 === iso2)!);

function pressDeviceBack(times = 1): void {
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  vi.spyOn(history, 'back').mockImplementation(() => {});
  const stop = listenForBack();
  settleBack();
  for (let i = 0; i < times; i++) window.dispatchEvent(new PopStateEvent('popstate'));
  stop();
}

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

  it('goes back to the hub on the device back', () => {
    const screens: Screen[] = [];
    render({}, screens);
    pressDeviceBack();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });

  describe('on the world quiz', () => {
    const c = (iso2: string) => countries.find((country) => country.iso2 === iso2)!;
    const worldRoot = (overrides: Partial<Extract<Screen, { name: 'quizResult' }>>, screens: Screen[] = []) =>
      render({ continent: 'world', difficulty: 'easy', finished: true, ...overrides }, screens);
    const bars = (root: HTMLElement) => [...root.querySelectorAll('.continent-bar')].map((bar) => bar.querySelector('.continent-name')!.textContent);

    it('shows the continents answered without a mistake as mastered and the others weakest first', () => {
      const root = worldRoot({ missed: [c('br'), c('ar'), c('fr')] });
      const chips = [...root.querySelectorAll('.mastered .tag')].map((tag) => tag.textContent);
      expect(chips).toEqual(expect.arrayContaining([expect.stringMatching(/^✓ África \d+\/\d+$/), expect.stringMatching(/^✓ Ásia /)]));
      expect(bars(root)).toEqual(['Américas', 'Europa']);
    });

    it('shows each continent left to study with its count and percentage', () => {
      const root = worldRoot({ missed: [c('br')] });
      const bar = root.querySelector('.continent-bar')!;
      expect(bar.querySelector('.continent-score')!.textContent).toMatch(/^\d+\/\d+ · \d+%$/);
    });

    it('opens Aprender of the weakest continent at the same level', () => {
      const screens: Screen[] = [];
      const root = worldRoot({ difficulty: 'general', missed: [c('br')] }, screens);
      [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Estudar Américas →')!.click();
      expect(screens).toEqual([{ name: 'game', continent: 'americas', difficulty: 'general' }]);
    });

    it('offers no study button when every continent is mastered', () => {
      const root = worldRoot({});
      expect(root.querySelectorAll('.continent-bar')).toHaveLength(0);
      expect([...root.querySelectorAll('button')].some((b) => b.textContent!.startsWith('Estudar'))).toBe(false);
    });
  });

  it('shows no continent breakdown on a continent quiz', () => {
    expect(render({ finished: true, missed: [fiji] }).querySelector('.continent-report')).toBeNull();
  });
});
