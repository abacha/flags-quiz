// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import type { Screen } from './navigation';
import { mapReview, resultActions, statBlocks } from './results';

describe('statBlocks', () => {
  it('shows each number above its label', () => {
    const stats = statBlocks([
      ['18', 'pontos'],
      ['03:12', 'tempo'],
    ]);
    expect([...stats.querySelectorAll('.stat')].map((s) => [s.querySelector('b')!.textContent, s.querySelector('span')!.textContent])).toEqual([
      ['18', 'pontos'],
      ['03:12', 'tempo'],
    ]);
  });
});

describe('resultActions', () => {
  const render = (mode: 'game' | 'quiz', difficulty: 'easy' | 'medium' | 'hard' | 'general') => {
    const screens: Screen[] = [];
    const actions = resultActions((screen) => screens.push(screen), mode, 'africa', difficulty);
    const buttons = [...actions.querySelectorAll('button')];
    return { screens, buttons, labels: buttons.map((b) => [b.textContent, b.className]) };
  };

  it('offers the next level first, filled, then Jogar de novo outlined and Voltar ao início as a link', () => {
    expect(render('quiz', 'easy').labels).toEqual([
      ['Próximo nível: Médio →', 'primary'],
      ['Jogar de novo', 'outline'],
      ['Voltar ao início', 'link'],
    ]);
  });

  it.each([
    ['easy', 'medium'],
    ['medium', 'hard'],
    ['hard', 'general'],
  ] as const)('opens the same mode on the level after %s', (difficulty, next) => {
    for (const mode of ['game', 'quiz'] as const) {
      const { screens, buttons } = render(mode, difficulty);
      buttons[0].click();
      expect(screens).toEqual([{ name: mode, continent: 'africa', difficulty: next }]);
    }
  });

  it('has no next level after Geral and fills Jogar de novo instead', () => {
    expect(render('game', 'general').labels).toEqual([
      ['Jogar de novo', 'primary'],
      ['Voltar ao início', 'link'],
    ]);
  });

  it('plays the same level again and goes back to the hub on the same continent', () => {
    const { screens, buttons } = render('game', 'hard');
    buttons[1].click();
    buttons[2].click();
    expect(screens).toEqual([
      { name: 'game', continent: 'africa', difficulty: 'hard' },
      { name: 'hub', continent: 'africa' },
    ]);
  });
});

describe('mapReview', () => {
  it('paints the countries as missed on an unlabelled map and names them in a list under it', () => {
    const picked = countries.filter((c) => c.iso2 === 'to' || c.iso2 === 'fj');
    const [map, names] = mapReview('oceania', picked);
    expect([...map!.querySelectorAll('.country.missed')].map((shape) => shape.getAttribute('data-iso2')).sort()).toEqual(['fj', 'to']);
    expect(map!.querySelector('.map-label')).toBeNull();
    expect(names!.className).toBe('map-names');
    expect([...names!.querySelectorAll('li.tag')].map((item) => item.textContent)).toEqual(picked.map((c) => c.name));
  });
});
