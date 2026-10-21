// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { mapPool } from '../../data/maps';
import { goalFor } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderMapResult } from './mapResult';

const tonga = countries.find((c) => c.iso2 === 'to')!;
const goal = goalFor('general', mapPool('oceania').length);

function render(overrides: Partial<Extract<Screen, { name: 'mapResult' }>>) {
  const root = document.createElement('div');
  const screens: Screen[] = [];
  renderMapResult(root, (screen) => screens.push(screen), {
    name: 'mapResult',
    continent: 'oceania',
    won: false,
    correct: 3,
    missed: [],
    ...overrides,
  });
  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
  return { root, screens, button };
}

describe('renderMapResult', () => {
  it('celebrates a won medal and shows the continent and the correct answers out of the goal', () => {
    const { root } = render({ won: true, correct: goal });
    expect(root.querySelector('h1')!.textContent).toBe('🏅 Medalha conquistada!');
    expect(root.querySelector('.detail')!.textContent).toBe('Mapa · Oceania');
    expect([...root.querySelectorAll('.stat')].map((s) => s.textContent)).toEqual([`${goal}/${goal}acertos`]);
  });

  it('keeps the not-won title', () => {
    expect(render({}).root.querySelector('h1')!.textContent).toBe(`Você fez 3 de ${goal}`);
  });

  it('plays the map Learn again and goes back to the hub on the same continent', () => {
    const { screens, button } = render({});
    button('Jogar de novo').click();
    button('Voltar ao início').click();
    expect(screens).toEqual([
      { name: 'mapGame', continent: 'oceania' },
      { name: 'hub', continent: 'oceania' },
    ]);
  });

  it('shows no review without missed countries', () => {
    const { root } = render({});
    expect(root.querySelector('.map')).toBeNull();
    expect([...root.querySelectorAll('h2')]).toHaveLength(0);
  });

  it('shows the missed countries named on one map below the buttons', () => {
    const { root } = render({ missed: [tonga] });
    const heading = [...root.querySelectorAll('h2')].find((h) => h.textContent === 'Países para revisar')!;
    expect(heading.compareDocumentPosition(root.querySelector('.result-actions')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(root.querySelectorAll('.map')).toHaveLength(1);
    expect(root.querySelector('.map .country.missed')).not.toBeNull();
    expect(root.querySelector('.map-label')!.textContent).toBe('Tonga');
  });
});
