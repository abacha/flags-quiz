// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { MAP_ALL } from '../data/maps';
import type { Screen } from './navigation';
import { flagLadder, mapLadder, mapReview, resultActions, statBlocks } from './results';

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
  const press = (actions: HTMLElement) => {
    const buttons = [...actions.querySelectorAll('button')];
    return { buttons, labels: buttons.map((b) => [b.textContent, b.className]) };
  };
  const flag = (mode: 'game' | 'quiz', difficulty: 'easy' | 'medium' | 'hard' | 'general') => {
    const screens: Screen[] = [];
    return { screens, ...press(resultActions((screen) => screens.push(screen), 'africa', flagLadder(mode, 'africa', difficulty))) };
  };
  const map = (mode: 'mapGame' | 'mapQuiz', level: string) => {
    const screens: Screen[] = [];
    return { screens, ...press(resultActions((screen) => screens.push(screen), 'africa', mapLadder(mode, 'africa', level))) };
  };

  it('offers the next level first, filled, then Jogar de novo outlined and Voltar ao início as a link', () => {
    expect(flag('quiz', 'easy').labels).toEqual([
      ['Próximo nível: Médio →', 'primary'],
      ['Jogar de novo', 'outline'],
      ['Voltar ao início', 'link'],
    ]);
  });

  it.each([
    ['easy', 'medium'],
    ['medium', 'hard'],
    ['hard', 'general'],
  ] as const)('opens the same flag mode on the level after %s', (difficulty, next) => {
    for (const mode of ['game', 'quiz'] as const) {
      const { screens, buttons } = flag(mode, difficulty);
      buttons[0]!.click();
      expect(screens).toEqual([{ name: mode, continent: 'africa', difficulty: next }]);
    }
  });

  it('has no next level after Geral and fills Jogar de novo instead', () => {
    expect(flag('game', 'general').labels).toEqual([
      ['Jogar de novo', 'primary'],
      ['Voltar ao início', 'link'],
    ]);
  });

  it('plays the same level again and goes back to the hub on the same continent', () => {
    const { screens, buttons } = flag('game', 'hard');
    buttons[1]!.click();
    buttons[2]!.click();
    expect(screens).toEqual([
      { name: 'game', continent: 'africa', difficulty: 'hard' },
      { name: 'hub', continent: 'africa' },
    ]);
  });

  it('moves a map round to the next region of the continent in the same mode', () => {
    for (const mode of ['mapGame', 'mapQuiz'] as const) {
      const { screens, buttons, labels } = map(mode, 'west-coast');
      expect(labels[0]).toEqual(['Próximo nível: Golfo da Guiné →', 'primary']);
      buttons[0]!.click();
      buttons[1]!.click();
      expect(screens).toEqual([
        { name: mode, continent: 'africa', level: 'gulf-of-guinea' },
        { name: mode, continent: 'africa', level: 'west-coast' },
      ]);
    }
  });

  it('moves the last region to the whole continent and stops there', () => {
    expect(map('mapGame', 'indian-ocean').labels[0]).toEqual(['Próximo nível: Continente inteiro →', 'primary']);
    expect(map('mapQuiz', MAP_ALL).labels).toEqual([
      ['Jogar de novo', 'primary'],
      ['Voltar ao início', 'link'],
    ]);
  });
});

describe('mapReview', () => {
  it('paints the countries as missed on an unlabelled map and names them in a list under it', () => {
    const picked = countries.filter((c) => c.iso2 === 'to' || c.iso2 === 'fj');
    const [map, names] = mapReview({ continent: 'oceania', level: MAP_ALL }, picked);
    expect([...map!.querySelectorAll('.country.missed')].map((shape) => shape.getAttribute('data-iso2')).sort()).toEqual(['fj', 'to']);
    expect(map!.querySelector('.map-label')).toBeNull();
    expect(names!.className).toBe('map-names');
    expect([...names!.querySelectorAll('li.tag')].map((item) => item.textContent)).toEqual(picked.map((c) => c.name));
  });

  it('frames a region review on the region, with the other regions grey', () => {
    const picked = countries.filter((c) => c.iso2 === 'sn');
    const [map] = mapReview({ continent: 'africa', level: 'west-coast' }, picked);
    expect(map!.querySelector('path[data-iso2="ng"]')!.classList.contains('context')).toBe(true);
  });
});
