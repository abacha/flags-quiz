// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Answer } from '../../engine/answer';
import { seededRng } from '../../engine/rng';
import { MAP_ALL, mapLevels, mapPool } from '../../data/maps';
import type { Question } from '../../engine/question';
import { listenForBack, settleBack } from '../backButton';
import type { Navigate, Screen } from '../navigation';
import { renderMapGame } from './mapGame';

const asked: { question: Question; submit: (answer: Answer) => unknown }[] = [];

vi.mock('../questions/render', () => ({
  renderQuestion: (question: Question, submit: (answer: Answer) => unknown) => {
    asked.push({ question, submit });
    return document.createElement('div');
  },
}));

function correctAnswer(question: Question): Answer {
  switch (question.format) {
    case 'mapToNames':
    case 'mapFlagToNames':
    case 'mapToFlags':
      return { kind: 'choice', iso2: question.target.iso2 };
    case 'mapSpellName':
      return { kind: 'text', text: question.target.name };
    case 'mapTypeName':
      return { kind: 'text', text: question.target.name };
    default:
      throw new Error(`Unexpected ${question.format}`);
  }
}

function wrongAnswer(question: Question): Answer {
  switch (question.format) {
    case 'mapToNames':
    case 'mapFlagToNames':
    case 'mapToFlags':
      return { kind: 'choice', iso2: '' };
    case 'mapSpellName':
      return { kind: 'text', text: '' };
    case 'mapTypeName':
      return { kind: 'text', text: '' };
    default:
      throw new Error(`Unexpected ${question.format}`);
  }
}

function pressDeviceBack(): void {
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  vi.spyOn(history, 'back').mockImplementation(() => {});
  const stop = listenForBack();
  settleBack();
  window.dispatchEvent(new PopStateEvent('popstate'));
  stop();
}

describe('renderMapGame', () => {
  let root: HTMLElement;
  let screens: Screen[];
  const region = mapPool('americas', 'central-america');
  const size = region.length;
  const navigate: Navigate = (screen) => screens.push(screen);

  const answerCurrent = (answer: (question: Question) => Answer) => {
    const { question, submit } = asked[asked.length - 1];
    submit(answer(question));
    root.querySelector<HTMLButtonElement>('.feedback button')!.click();
  };

  const playToTheEnd = () => {
    while (screens.length === 0) answerCurrent(correctAnswer);
  };

  beforeEach(() => {
    localStorage.clear();
    asked.length = 0;
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderMapGame(root, navigate, 'americas', 'central-america');
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  it('keeps the map name question open, with no feedback and every life, on a typo', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng(2));
    asked.length = 0;
    root.replaceChildren();
    renderMapGame(root, navigate, 'americas', 'central-america');
    while (asked[asked.length - 1].question.format !== 'mapTypeName') answerCurrent(correctAnswer);
    const { question, submit } = asked[asked.length - 1];
    if (question.format !== 'mapTypeName') throw new Error('Expected a mapTypeName question');
    expect(submit({ kind: 'text', text: `${question.target.name}x` })).toEqual([question.target]);
    expect(root.querySelector('.feedback')).toBeNull();
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(0);
  });

  it('shows the map label, three lives, the countries done out of the region size and an empty bar', () => {
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Mapa · Américas · América Central');
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥0/${size}`);
    expect(root.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('0%');
  });

  it('asks only the countries of the region', () => {
    playToTheEnd();
    for (const { question } of asked) expect(region).toContain(question.target);
  });

  it('starts a region at the flag step and the whole continent at the name step', () => {
    expect(asked[0].question.format).toBe('mapFlagToNames');
    asked.length = 0;
    root.replaceChildren();
    renderMapGame(root, navigate, 'americas', MAP_ALL);
    expect(asked[0].question.format).toBe('mapToNames');
  });

  it('plays the whole continent on 10 countries, the regions with no medal first', () => {
    const eastern = mapPool('europe', 'eastern-europe');
    expect(eastern.length).toBeLessThan(10);
    const medals = Object.fromEntries(mapLevels('europe').filter((l) => l !== 'eastern-europe' && l !== MAP_ALL).map((l) => [l, 'gold']));
    localStorage.setItem('flags-quiz:map-medals-v2', JSON.stringify({ europe: medals }));
    asked.length = 0;
    root.replaceChildren();
    renderMapGame(root, navigate, 'europe', MAP_ALL);
    expect(root.querySelector('.topbar-counters')!.textContent).toBe('♥♥♥0/10');
    playToTheEnd();
    const targets = new Set(asked.map(({ question }) => question.target.iso2));
    expect(targets.size).toBe(10);
    for (const country of eastern) expect(targets).toContain(country.iso2);
  });

  it('counts a country only once it is done and costs a life per wrong answer', () => {
    answerCurrent(correctAnswer);
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥0/${size}`);
    answerCurrent(wrongAnswer);
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(1);
  });

  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;

  it('wins when every country is done and saves the medal', () => {
    playToTheEnd();
    expect(JSON.parse(localStorage.getItem('flags-quiz:map-medals-v2')!)).toEqual({ americas: { 'central-america': 'gold' } });
    expect(screens).toEqual([{ name: 'mapResult', continent: 'americas', level: 'central-america', won: true, medal: 'gold', done: size, missed: [] }]);
  });

  it('awards silver when every country is done with two lives left', () => {
    answerCurrent(wrongAnswer);
    playToTheEnd();
    expect(screens).toMatchObject([{ name: 'mapResult', won: true, medal: 'silver' }]);
    expect(JSON.parse(localStorage.getItem('flags-quiz:map-medals-v2')!)).toEqual({ americas: { 'central-america': 'silver' } });
  });

  it('offers to continue without a medal when the lives run out, and ends on the lost result on Encerrar', () => {
    for (let i = 0; i < 3; i++) answerCurrent(wrongAnswer);
    expect(screens).toEqual([]);
    expect(root.querySelector('.out-of-lives .verdict')!.textContent).toBe('Suas vidas acabaram');
    button('Encerrar').click();
    expect(localStorage.getItem('flags-quiz:map-medals-v2')).toBeNull();
    const [screen] = screens;
    expect(screen).toMatchObject({ name: 'mapResult', continent: 'americas', level: 'central-america', won: false, medal: null, done: 0 });
    expect((screen as Extract<Screen, { name: 'mapResult' }>).missed.length).toBeGreaterThan(0);
  });

  it('keeps asking after Continuar sem medalha and finishes without a medal', () => {
    for (let i = 0; i < 3; i++) answerCurrent(wrongAnswer);
    const asking = asked.length;
    button('Continuar sem medalha').click();
    expect(asked.length).toBe(asking + 1);
    expect(root.querySelector('.out-of-lives')).toBeNull();
    answerCurrent(wrongAnswer);
    expect(screens).toEqual([]);
    playToTheEnd();
    expect(screens).toMatchObject([{ name: 'mapResult', won: true, medal: null, done: size }]);
    expect(localStorage.getItem('flags-quiz:map-medals-v2')).toBeNull();
  });

  it('praises a right answer, counts the answers in a row in the top bar and resets the streak on a miss', () => {
    const play = (pick: (question: Question) => Answer) => {
      const { question, submit } = asked[asked.length - 1];
      submit(pick(question));
      const verdict = root.querySelector('.feedback .verdict')!.textContent;
      root.querySelector<HTMLButtonElement>('.feedback button')!.click();
      return verdict;
    };
    expect(play(correctAnswer)).toBe('Certo!');
    expect(root.querySelector('.streak')).toBeNull();
    expect(play(correctAnswer)).toBe('Isso aí!');
    expect(root.querySelector('.streak')!.textContent).toBe('🔥 2');
    play(wrongAnswer);
    expect(root.querySelector('.streak')).toBeNull();
  });

  it('breaks only the heart just lost', () => {
    const { question, submit } = asked[asked.length - 1];
    submit(wrongAnswer(question));
    expect(root.querySelectorAll('.heart.breaking')).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('.feedback button')!.click();
    const next = asked[asked.length - 1];
    next.submit(correctAnswer(next.question));
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(1);
    expect(root.querySelectorAll('.heart.breaking')).toHaveLength(0);
  });

  it('leaves to the hub on the same continent on ✕', () => {
    root.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(screens).toEqual([{ name: 'hub', continent: 'americas' }]);
  });

  it('leaves to the hub on the device back', () => {
    pressDeviceBack();
    expect(screens).toEqual([{ name: 'hub', continent: 'americas' }]);
  });
});
