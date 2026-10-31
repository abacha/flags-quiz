// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { capitalPool } from '../../data/capitals';
import { countries } from '../../data/countries';
import { MAP_ALL, mapLevels, mapPool } from '../../data/maps';
import { mapDifficulty } from '../../engine/mapFormats';
import { goalFor, poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderHub } from './hub';

describe('renderHub', () => {
  let root: HTMLElement;
  let screens: Screen[];

  const render = (continent: ContinentKey) => {
    root = document.createElement('div');
    renderHub(root, (screen) => screens.push(screen), continent);
  };
  const tabs = () => [...root.querySelectorAll<HTMLButtonElement>('.tab')];
  const tab = (label: string) => tabs().find((t) => t.firstChild!.textContent === label)!;
  const card = (level: string) => [...root.querySelectorAll<HTMLElement>('.level-card')].find((c) => c.querySelector('h2')!.textContent === level)!;
  const tags = (level: string) => [...card(level).querySelectorAll('.tag')].map((t) => [t.textContent, t.classList.contains('ok')]);
  const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
  const goal = (continent: ContinentKey, difficulty: 'easy' | 'medium' | 'hard' | 'general') =>
    goalFor(difficulty, poolFor(countries, continent, difficulty).length);

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'flags-quiz:quiz-records-v2',
      JSON.stringify({
        africa: { easy: { bestScore: 20, bestTimeMs: 192000, completed: true }, medium: { bestScore: 12, completed: true }, hard: { bestScore: 9 } },
        world: { easy: { bestScore: 84, bestTimeMs: 754000 } },
      }),
    );
    localStorage.setItem('flags-quiz:medals', JSON.stringify({ africa: { easy: true } }));
    screens = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the title and the completed levels out of all 24 in the header', () => {
    render('africa');
    expect(root.querySelector('.hub-header h1')!.textContent).toBe('🌍 Bandeiras');
    expect(root.querySelector('.hub-header .pill')!.textContent).toBe('3/24 níveis');
  });

  it('checks a tab with all four levels completed in place of 4/4', () => {
    localStorage.setItem(
      'flags-quiz:quiz-records-v2',
      JSON.stringify({ oceania: Object.fromEntries(['easy', 'medium', 'hard', 'general'].map((level) => [level, { bestScore: 9, completed: true }])) }),
    );
    render('africa');
    expect(tab('Oceania').textContent).toBe('Oceania ✓');
    expect(root.querySelector('.hub-header .pill')!.textContent).toBe('4/24 níveis');
  });

  it('shows one tab per continent in order with its completed quizzes, the chosen one filled', () => {
    render('africa');
    expect(tabs().map((t) => t.textContent)).toEqual(['Mundo 1/4', 'África 2/4', 'Américas 0/4', 'Ásia 0/4', 'Europa 0/4', 'Oceania 0/4']);
    expect(tabs().filter((t) => t.classList.contains('on'))).toEqual([tab('África')]);
  });

  it('marks the chosen tab as pressed for assistive tech and the rest as not pressed', () => {
    render('africa');
    expect(tabs().map((t) => t.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false', 'false', 'false']);
  });

  it('scrolls the remembered tab into view, since the last tabs start off screen on a phone', () => {
    const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    render('oceania');
    expect(scrolled.mock.contexts.at(-1)).toBe(tab('Oceania'));
  });

  it('remembers the continent it opens on', () => {
    render('africa');
    expect(localStorage.getItem('flags-quiz:continent')).toBe('africa');
  });

  it('switches continent in place, without changing screen, and remembers the new one', () => {
    render('africa');
    const main = root.firstElementChild;
    tab('Oceania').click();
    expect(screens).toEqual([]);
    expect(root.firstElementChild).toBe(main);
    expect(tab('Oceania').classList.contains('on')).toBe(true);
    expect(tab('África').classList.contains('on')).toBe(false);
    expect(tab('Oceania').getAttribute('aria-pressed')).toBe('true');
    expect(tab('África').getAttribute('aria-pressed')).toBe('false');
    expect(card('Fácil').querySelector('.meta')!.textContent).toBe(`${poolFor(countries, 'oceania', 'easy').length} bandeiras`);
    expect(root.querySelectorAll('.level-card')).toHaveLength(4);
    expect(root.querySelectorAll('.see-all')).toHaveLength(1);
    expect(localStorage.getItem('flags-quiz:continent')).toBe('oceania');
  });

  it('shows each level with its flag count and the first three flags of its pool', () => {
    render('africa');
    const pool = poolFor(countries, 'africa', 'hard');
    expect([...root.querySelectorAll('.level-card h2')].map((h) => h.textContent)).toEqual(['Fácil', 'Médio', 'Difícil', 'Geral']);
    expect(card('Difícil').querySelector('.meta')!.textContent).toBe(`${pool.length} bandeiras`);
    expect([...card('Difícil').querySelectorAll('.thumbs img')].map((img) => img.getAttribute('src'))).toEqual(
      pool.slice(0, 3).map((c) => `/flags/${c.iso2}.svg`),
    );
  });

  it('tags the medal and the quiz of each level by its state', () => {
    render('africa');
    expect(tags('Fácil')).toEqual([
      ['🥉 Bronze', true],
      ['✓ Quiz 03:12', true],
    ]);
    expect(tags('Médio')).toEqual([
      [`🏅 meta ${goal('africa', 'medium')}`, false],
      ['✓ Quiz', true],
    ]);
    expect(tags('Difícil')).toEqual([
      [`🏅 meta ${goal('africa', 'hard')}`, false],
      ['Quiz 9 pts', false],
    ]);
    expect(tags('Geral')).toEqual([
      [`🏅 meta ${goal('africa', 'general')}`, false],
      ['Quiz —', false],
    ]);
  });

  it('counts a record with a best time and no completed mark as a completed quiz', () => {
    render('world');
    expect(tags('Fácil')[1]).toEqual(['✓ Quiz 12:34', true]);
  });

  it('starts Aprender and Quiz on the level of the chosen continent', () => {
    render('africa');
    button(card('Difícil'), 'Aprender').click();
    button(card('Difícil'), 'Quiz').click();
    expect(screens).toEqual([
      { name: 'game', continent: 'africa', difficulty: 'hard' },
      { name: 'quiz', continent: 'africa', difficulty: 'hard' },
    ]);
  });

  it('links to the flag table of the chosen continent', () => {
    render('africa');
    const link = root.querySelector<HTMLButtonElement>('.see-all')!;
    expect(link.textContent).toBe(`Ver as ${poolFor(countries, 'africa', 'general').length} bandeiras da África →`);
    link.click();
    expect(screens).toEqual([{ name: 'flagTable', continent: 'africa' }]);
  });

  it('words the flag table link for Mundo', () => {
    render('world');
    expect(root.querySelector('.see-all')!.textContent).toBe('Ver as 248 bandeiras do Mundo →');
  });

  describe('area selector', () => {
    const areas = () => [...root.querySelectorAll<HTMLButtonElement>('.area-selector button')];
    const area = (label: string) => areas().find((b) => b.textContent === label)!;
    const mapTags = (level: string) => tags(level);
    const mapGoal = (continent: ContinentKey, level: string) => goalFor(mapDifficulty(level), mapPool(continent, level).length);
    const cardTitles = () => [...root.querySelectorAll('.level-card h2')].map((h) => h.textContent);

    beforeEach(() => {
      localStorage.setItem(
        'flags-quiz:map-quiz-records-v2',
        JSON.stringify({
          europe: {
            ...Object.fromEntries(mapLevels('europe').map((level) => [level, { bestScore: 20, completed: true }])),
            'british-isles': { bestScore: 40, bestTimeMs: 301000, completed: true },
          },
          asia: { 'central-asia': { bestScore: 12 }, 'far-east': { bestScore: 8, completed: true } },
          oceania: { polynesia: { bestScore: 9, bestTimeMs: 65000 } },
        }),
      );
      localStorage.setItem('flags-quiz:map-medals-v2', JSON.stringify({ europe: { 'british-isles': 'gold' } }));
    });

    it('shows Bandeiras and Mapas above the tabs, Bandeiras pressed by default with the flag cards', () => {
      render('africa');
      const selector = root.querySelector('.area-selector')!;
      expect(selector.nextElementSibling).toBe(root.querySelector('.tabs'));
      expect(areas().map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
        ['Bandeiras', 'true'],
        ['Mapas', 'false'],
        ['Capitais', 'false'],
      ]);
      expect(root.querySelectorAll('.level-card')).toHaveLength(4);
      expect(root.querySelector('.hub-header .pill')!.textContent).toBe('3/24 níveis');
    });

    it('switches to Mapas in place, remembers it and shows a card per region of the chosen continent, then the whole continent', () => {
      render('europe');
      const main = root.firstElementChild;
      area('Mapas').click();
      expect(screens).toEqual([]);
      expect(root.firstElementChild).toBe(main);
      expect(localStorage.getItem('flags-quiz:area')).toBe('maps');
      expect(areas().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
      expect(cardTitles()).toEqual(['Ilhas Britânicas e Atlântico Norte', 'Nórdicos e Bálticos', 'Ocidental', 'Central', 'Bálcãs', 'Leste', 'Continente inteiro']);
      expect(card('Bálcãs').querySelector('.meta')!.textContent).toBe(`${mapPool('europe', 'balkans').length} países`);
      expect(card('Continente inteiro').querySelector('.meta')!.textContent).toBe(`${mapPool('europe', MAP_ALL).length} países`);
    });

    it('links to the map table of the chosen continent', () => {
      localStorage.setItem('flags-quiz:area', 'maps');
      render('europe');
      const links = root.querySelectorAll<HTMLButtonElement>('.see-all');
      expect(links).toHaveLength(1);
      expect(links[0]!.textContent).toBe(`Ver o mapa dos ${mapPool('europe', MAP_ALL).length} países da Europa →`);
      links[0]!.click();
      expect(screens).toEqual([{ name: 'mapTable', continent: 'europe' }]);
    });

    it('opens on Mapas when it was the last area chosen', () => {
      localStorage.setItem('flags-quiz:area', 'maps');
      render('europe');
      expect(area('Mapas').getAttribute('aria-pressed')).toBe('true');
      expect(root.querySelectorAll('.level-card')).toHaveLength(7);
    });

    it('goes back to the flag hub unchanged and remembers Bandeiras', () => {
      localStorage.setItem('flags-quiz:area', 'maps');
      render('africa');
      area('Bandeiras').click();
      expect(localStorage.getItem('flags-quiz:area')).toBe('flags');
      expect(root.querySelector('.hub-header .pill')!.textContent).toBe('3/24 níveis');
      expect(tabs().map((t) => t.textContent)).toEqual(['Mundo 1/4', 'África 2/4', 'Américas 0/4', 'Ásia 0/4', 'Europa 0/4', 'Oceania 0/4']);
      expect(tags('Fácil')).toEqual([
        ['🥉 Bronze', true],
        ['✓ Quiz 03:12', true],
      ]);
      expect(root.querySelectorAll('.see-all')).toHaveLength(1);
    });

    it('counts the completed map levels per tab out of its own levels, and checks the tabs with every level completed', () => {
      localStorage.setItem('flags-quiz:area', 'maps');
      render('europe');
      expect(root.querySelector('.hub-header .pill')!.textContent).toBe('9/36 níveis');
      expect(tabs().map((t) => t.textContent)).toEqual(['Mundo 0/1', 'África 0/8', 'Américas 0/8', 'Ásia 1/8', 'Europa ✓', 'Oceania 1/4']);
    });

    it('tags the map medal and the map quiz of each level of the chosen continent', () => {
      localStorage.setItem('flags-quiz:area', 'maps');
      render('europe');
      expect(mapTags('Ilhas Britânicas e Atlântico Norte')).toEqual([
        ['🥇 Ouro', true],
        ['✓ Quiz 05:01', true],
      ]);
      expect(mapTags('Nórdicos e Bálticos')).toEqual([
        [`🏅 meta ${mapGoal('europe', 'nordic-and-baltic')}`, false],
        ['✓ Quiz', true],
      ]);
      tab('Ásia').click();
      expect(mapTags('Ásia Central')).toEqual([
        [`🏅 meta ${mapGoal('asia', 'central-asia')}`, false],
        ['Quiz 12 pts', false],
      ]);
      tab('Mundo').click();
      expect(cardTitles()).toEqual(['Mundo inteiro']);
      expect(mapTags('Mundo inteiro')).toEqual([
        [`🏅 meta ${mapGoal('world', MAP_ALL)}`, false],
        ['Quiz —', false],
      ]);
    });

    it('starts the map Learn and the map Quiz on the chosen continent and the level of the card', () => {
      localStorage.setItem('flags-quiz:area', 'maps');
      render('africa');
      tab('Oceania').click();
      button(card('Micronésia'), 'Aprender').click();
      button(card('Continente inteiro'), 'Quiz').click();
      expect(screens).toEqual([
        { name: 'mapGame', continent: 'oceania', level: 'micronesia' },
        { name: 'mapQuiz', continent: 'oceania', level: MAP_ALL },
      ]);
    });
  });

  describe('Capitais area', () => {
    beforeEach(() => {
      localStorage.setItem('flags-quiz:area', 'capitals');
    });

    const area = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('.area-selector button')].find((b) => b.textContent === label)!;
    const cardTitles = () => [...root.querySelectorAll('.level-card h2')].map((h) => h.textContent);
    const capitalGoal = (continent: ContinentKey, difficulty: Difficulty) => goalFor(difficulty, capitalPool(continent, difficulty).length);

    it('shows the four difficulty cards with the capital counts and medal goals, and the empty progress', () => {
      render('africa');
      expect(area('Capitais').getAttribute('aria-pressed')).toBe('true');
      expect(cardTitles()).toEqual(['Fácil', 'Médio', 'Difícil', 'Geral']);
      expect(card('Fácil').querySelector('.meta')!.textContent).toBe(`${capitalPool('africa', 'easy').length} países`);
      expect(tags('Geral')).toEqual([
        [`🏅 meta ${capitalGoal('africa', 'general')}`, false],
        ['Quiz —', false],
      ]);
      expect(root.querySelector('.hub-header .pill')!.textContent).toBe('0/24 níveis');
      expect(tabs().map((t) => t.textContent)).toEqual(['Mundo 0/4', 'África 0/4', 'Américas 0/4', 'Ásia 0/4', 'Europa 0/4', 'Oceania 0/4']);
    });

    it('counts a completed capital quiz in the pill and in its tab', () => {
      localStorage.setItem('flags-quiz:capital-quiz-records', JSON.stringify({ africa: { easy: { bestScore: 10, bestTimeMs: 90000, completed: true } } }));
      render('africa');
      expect(root.querySelector('.hub-header .pill')!.textContent).toBe('1/24 níveis');
      expect(tab('África').textContent).toBe('África 1/4');
      expect(tags('Fácil')[1]).toEqual(['✓ Quiz 01:30', true]);
    });

    it('starts the capital Learn and Quiz on the chosen continent and the difficulty of the card', () => {
      render('africa');
      button(card('Médio'), 'Aprender').click();
      button(card('Difícil'), 'Quiz').click();
      expect(screens).toEqual([
        { name: 'capitalGame', continent: 'africa', difficulty: 'medium' },
        { name: 'capitalQuiz', continent: 'africa', difficulty: 'hard' },
      ]);
    });

    it('links to the capital table of the chosen continent', () => {
      render('africa');
      const link = root.querySelector<HTMLButtonElement>('.see-all')!;
      expect(link.textContent).toBe(`Ver as ${capitalPool('africa', 'general').length} capitais da África →`);
      link.click();
      expect(screens).toEqual([{ name: 'capitalTable', continent: 'africa' }]);
    });
  });
});
