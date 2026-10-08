// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { goalFor, poolFor } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderResult } from './result';

const tonga = countries.find((c) => c.iso2 === 'to')!;
const goal = goalFor('medium', poolFor(countries, 'oceania', 'medium').length);

function render(overrides: Partial<Extract<Screen, { name: 'result' }>>) {
  const root = document.createElement('div');
  const screens: Screen[] = [];
  renderResult(root, (screen) => screens.push(screen), {
    name: 'result',
    continent: 'oceania',
    difficulty: 'medium',
    won: false,
    correct: 3,
    missed: [],
    ...overrides,
  });
  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
  return { root, screens, button };
}

describe('renderResult', () => {
  it('celebrates a won medal and shows the level and the correct answers out of the goal', () => {
    const { root } = render({ won: true, correct: goal });
    expect(root.querySelector('h1')!.textContent).toBe('🏅 Medalha conquistada!');
    expect(root.querySelector('.detail')!.textContent).toBe('Oceania · Médio');
    expect([...root.querySelectorAll('.stat')].map((s) => s.textContent)).toEqual([`${goal}/${goal}acertos`]);
  });

  it('keeps the not-won title', () => {
    expect(render({}).root.querySelector('h1')!.textContent).toBe(`Você fez 3 de ${goal}`);
  });

  it('opens Aprender on the next level and goes back to the hub on the same continent', () => {
    const { screens, button } = render({});
    button('Próximo nível: Difícil →').click();
    button('Voltar ao início').click();
    expect(screens).toEqual([
      { name: 'game', continent: 'oceania', difficulty: 'hard' },
      { name: 'hub', continent: 'oceania' },
    ]);
  });

  it('lists the flags to review with their names and badges below the buttons', () => {
    const { root } = render({ missed: [tonga] });
    const heading = [...root.querySelectorAll('h2')].find((h) => h.textContent === 'Bandeiras para revisar')!;
    expect(heading.compareDocumentPosition(root.querySelector('.result-actions')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(heading.nextElementSibling!.querySelector('figcaption')!.textContent).toBe('Tonga ONU');
  });
});
