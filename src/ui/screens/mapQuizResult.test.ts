// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { countries } from '../../data/countries';
import { MAP_ALL } from '../../data/maps';
import { listenForBack, settleBack } from '../backButton';
import type { Screen } from '../navigation';
import { renderMapQuizResult } from './mapQuizResult';

function pressDeviceBack(): void {
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  vi.spyOn(history, 'back').mockImplementation(() => {});
  const stop = listenForBack();
  settleBack();
  window.dispatchEvent(new PopStateEvent('popstate'));
  stop();
}

const tonga = countries.find((c) => c.iso2 === 'to')!;
const samoa = countries.find((c) => c.iso2 === 'ws')!;

function render(overrides: Partial<Extract<Screen, { name: 'mapQuizResult' }>>) {
  const root = document.createElement('div');
  const screens: Screen[] = [];
  renderMapQuizResult(root, (screen) => screens.push(screen), {
    name: 'mapQuizResult',
    continent: 'oceania',
    level: 'polynesia',
    score: 7,
    timeMs: 65000,
    errors: 2,
    finished: true,
    unanswered: [],
    missed: [],
    newRecords: { score: false, time: false },
    ...overrides,
  });
  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
  const headings = () => [...root.querySelectorAll('h2')].map((h) => h.textContent);
  return { root, screens, button, headings };
}

describe('renderMapQuizResult', () => {
  it('celebrates a finished quiz with its stats and the continent', () => {
    const { root } = render({});
    expect(root.querySelector('h1')!.textContent).toBe('🎉 Quiz concluído!');
    expect(root.querySelector('.detail')!.textContent).toBe('Mapa · Oceania · Polinésia');
    expect([...root.querySelectorAll('.stat')].map((s) => s.textContent)).toEqual(['7pontos', '01:05tempo', '2erros']);
  });

  it('titles an ended quiz', () => {
    expect(render({ finished: false }).root.querySelector('h1')!.textContent).toBe('Quiz encerrado');
  });

  it('announces new records', () => {
    const { root } = render({ newRecords: { score: true, time: true } });
    expect([...root.querySelectorAll('.record')].map((r) => r.textContent)).toEqual(['🏆 Novo recorde de pontos!', '🏆 Novo recorde de tempo!']);
    expect(render({}).root.querySelector('.record')).toBeNull();
  });

  it('plays the map Quiz again and goes back to the hub on the same continent', () => {
    const { screens, button } = render({});
    button('Jogar de novo').click();
    button('Voltar ao início').click();
    expect(screens).toEqual([
      { name: 'mapQuiz', continent: 'oceania', level: 'polynesia' },
      { name: 'hub', continent: 'oceania' },
    ]);
  });

  it('offers the whole continent after the last region of the map Quiz, and nothing after it', () => {
    const region = render({});
    region.button('Próximo nível: Continente inteiro →').click();
    expect(region.screens).toEqual([{ name: 'mapQuiz', continent: 'oceania', level: MAP_ALL }]);
    expect(render({ level: MAP_ALL }).root.querySelector('.result-actions')!.textContent).not.toContain('Próximo nível');
  });

  it('goes back to the hub on the device back', () => {
    const { screens } = render({});
    pressDeviceBack();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });

  it('shows no review without unanswered or missed countries', () => {
    const { root, headings } = render({});
    expect(root.querySelector('.map')).toBeNull();
    expect(headings()).toEqual([]);
  });

  it('shows the unanswered and the missed countries on a map each, named in a list under it, below the buttons', () => {
    const { root, headings } = render({ finished: false, unanswered: [tonga], missed: [samoa] });
    expect(headings()).toEqual(['Países sem resposta (1)', 'Países que você errou']);
    const maps = root.querySelectorAll('.map');
    expect(maps).toHaveLength(2);
    expect(maps[0].querySelector('[data-iso2="to"].missed')).not.toBeNull();
    expect(maps[1].querySelector('[data-iso2="ws"].missed')).not.toBeNull();
    expect(root.querySelector('.map-label')).toBeNull();
    expect([...root.querySelectorAll('.map + .map-names')].map((list) => list.textContent)).toEqual(['Tonga', 'Samoa']);
    expect(root.querySelector('.result-actions')!.compareDocumentPosition(maps[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides the unanswered section on a finished quiz', () => {
    const { headings } = render({ unanswered: [tonga], missed: [samoa] });
    expect(headings()).toEqual(['Países que você errou']);
  });

  it('shows the continent breakdown on the world quiz and opens the weakest continent on Início', () => {
    const { root, screens, button } = render({ continent: 'world', level: MAP_ALL, unanswered: [tonga, samoa] });
    expect(root.querySelector('.continent-bar .continent-name')!.textContent).toBe('Oceania');
    button('Estudar Oceania →').click();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });

  it('shows no continent breakdown on a continent quiz', () => {
    expect(render({ missed: [tonga] }).root.querySelector('.continent-report')).toBeNull();
  });
});
