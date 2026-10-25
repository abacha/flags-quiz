// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { MAP_ALL, mapPool } from '../../data/maps';
import { goalFor } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderMapResult } from './mapResult';

const tonga = countries.find((c) => c.iso2 === 'to')!;
const samoa = countries.find((c) => c.iso2 === 'ws')!;
const goal = goalFor('medium', mapPool('oceania', 'polynesia').length);

function render(overrides: Partial<Extract<Screen, { name: 'mapResult' }>>) {
  const root = document.createElement('div');
  const screens: Screen[] = [];
  renderMapResult(root, (screen) => screens.push(screen), {
    name: 'mapResult',
    continent: 'oceania',
    level: 'polynesia',
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
    expect(root.querySelector('.detail')!.textContent).toBe('Mapa · Oceania · Polinésia');
    expect([...root.querySelectorAll('.stat')].map((s) => s.textContent)).toEqual([`${goal}/${goal}acertos`]);
  });

  it.each([
    ['gold', '🥇 Medalha de ouro!'],
    ['bronze', '🥉 Medalha de bronze!'],
    [null, '✓ Meta concluída sem medalha'],
  ] as const)('titles a reached goal by its medal: %s', (medal, title) => {
    expect(render({ won: true, medal, correct: goal }).root.querySelector('h1')!.textContent).toBe(title);
  });

  it('offers the whole continent after the last region of the map Learn, and nothing after it', () => {
    const region = render({});
    region.button('Próximo nível: Continente inteiro →').click();
    expect(region.screens).toEqual([{ name: 'mapGame', continent: 'oceania', level: MAP_ALL }]);
    expect(render({ level: MAP_ALL }).root.querySelector('.result-actions')!.textContent).not.toContain('Próximo nível');
  });

  it('keeps the not-won title', () => {
    expect(render({}).root.querySelector('h1')!.textContent).toBe(`Você fez 3 de ${goal}`);
  });

  it('plays the map Learn again and goes back to the hub on the same continent', () => {
    const { screens, button } = render({});
    button('Jogar de novo').click();
    button('Voltar ao início').click();
    expect(screens).toEqual([
      { name: 'mapGame', continent: 'oceania', level: 'polynesia' },
      { name: 'hub', continent: 'oceania' },
    ]);
  });

  it('shows no review without missed countries', () => {
    const { root } = render({});
    expect(root.querySelector('.map')).toBeNull();
    expect([...root.querySelectorAll('h2')]).toHaveLength(0);
  });

  it('shows the missed countries on one map below the buttons, named in a list under it', () => {
    const { root } = render({ missed: [tonga, samoa] });
    const heading = [...root.querySelectorAll('h2')].find((h) => h.textContent === 'Países para revisar')!;
    expect(heading.compareDocumentPosition(root.querySelector('.result-actions')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(root.querySelectorAll('.map')).toHaveLength(1);
    expect(root.querySelectorAll('.map .country.missed')).toHaveLength(2);
    expect(root.querySelector('.map-label')).toBeNull();
    expect([...root.querySelectorAll('.map + .map-names li')].map((item) => item.textContent)).toEqual(['Tonga', 'Samoa']);
  });
});
