// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { mapPool } from '../../data/maps';
import { goalFor } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderMapResult } from './mapResult';

const tonga = countries.find((c) => c.iso2 === 'to')!;
const fiji = countries.find((c) => c.iso2 === 'fj')!;
const goal = goalFor('medium', mapPool('oceania', 'medium').length);

function render(overrides: Partial<Extract<Screen, { name: 'mapResult' }>>) {
  const root = document.createElement('div');
  const screens: Screen[] = [];
  renderMapResult(root, (screen) => screens.push(screen), {
    name: 'mapResult',
    continent: 'oceania',
    difficulty: 'medium',
    won: false,
    medal: null,
    correct: 3,
    missed: [],
    ...overrides,
  });
  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
  return { root, screens, button };
}

describe('renderMapResult', () => {
  it('celebrates a won medal and shows the continent and the correct answers out of the goal', () => {
    const { root } = render({ won: true, medal: 'silver', correct: goal });
    expect(root.querySelector('h1')!.textContent).toBe('🥈 Medalha de prata!');
    expect(root.querySelector('.detail')!.textContent).toBe('Mapa · Oceania · Médio');
    expect([...root.querySelectorAll('.stat')].map((s) => s.textContent)).toEqual([`${goal}/${goal}acertos`]);
  });

  it.each([
    ['gold', '🥇 Medalha de ouro!'],
    ['bronze', '🥉 Medalha de bronze!'],
    [null, '✓ Meta concluída sem medalha'],
  ] as const)('titles a reached goal by its medal: %s', (medal, title) => {
    expect(render({ won: true, medal, correct: goal }).root.querySelector('h1')!.textContent).toBe(title);
  });

  it('offers the next level of the map Learn first on Fácil and none on Geral', () => {
    const easy = render({ difficulty: 'easy' });
    easy.button('Próximo nível: Médio →').click();
    expect(easy.screens).toEqual([{ name: 'mapGame', continent: 'oceania', difficulty: 'medium' }]);
    expect([...render({ difficulty: 'general' }).root.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Jogar de novo', 'Voltar ao início']);
  });

  it('keeps the not-won title', () => {
    expect(render({}).root.querySelector('h1')!.textContent).toBe(`Você fez 3 de ${goal}`);
  });

  it('plays the map Learn again and goes back to the hub on the same continent', () => {
    const { screens, button } = render({});
    button('Jogar de novo').click();
    button('Voltar ao início').click();
    expect(screens).toEqual([
      { name: 'mapGame', continent: 'oceania', difficulty: 'medium' },
      { name: 'hub', continent: 'oceania' },
    ]);
  });

  it('shows no review without missed countries', () => {
    const { root } = render({});
    expect(root.querySelector('.map')).toBeNull();
    expect([...root.querySelectorAll('h2')]).toHaveLength(0);
  });

  it('shows the missed countries on one map below the buttons, named in a list under it', () => {
    const { root } = render({ missed: [tonga, fiji] });
    const heading = [...root.querySelectorAll('h2')].find((h) => h.textContent === 'Países para revisar')!;
    expect(heading.compareDocumentPosition(root.querySelector('.result-actions')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(root.querySelectorAll('.map')).toHaveLength(1);
    expect(root.querySelectorAll('.map .country.missed')).toHaveLength(2);
    expect(root.querySelector('.map-label')).toBeNull();
    expect([...root.querySelectorAll('.map + .map-names li')].map((item) => item.textContent)).toEqual(['Tonga', 'Fiji']);
  });
});
