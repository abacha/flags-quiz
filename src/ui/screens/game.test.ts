// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countries } from '../../data/countries';
import type { Answer } from '../../engine/answer';
import { goalFor, poolFor } from '../../engine/pool';
import { seededRng } from '../../engine/rng';
import type { Question } from '../../engine/question';
import { listenForBack, settleBack } from '../backButton';
import type { Screen } from '../navigation';
import { renderGame } from './game';

const asked: { question: Question; submit: (answer: Answer) => unknown }[] = [];

vi.mock('../questions/render', () => ({
  renderQuestion: (question: Question, submit: (answer: Answer) => unknown) => {
    asked.push({ question, submit });
    return document.createElement('div');
  },
}));

const wrongAnswer = (question: Question): Answer =>
  'countries' in question ? { kind: 'links', links: {} } : { kind: 'choice', iso2: '' };

function rightAnswer(question: Question): Answer {
  switch (question.format) {
    case 'trueFalse':
      return { kind: 'yesNo', yes: question.shown === question.target };
    case 'typeName':
      return { kind: 'text', text: question.target.name };
    case 'typeSimilar':
      return { kind: 'texts', texts: Object.fromEntries(question.countries.map((c) => [c.iso2, c.name])) };
    case 'oddOneOut':
      return { kind: 'choice', iso2: question.intruder.iso2 };
    case 'matchPairs':
    case 'sortSimilar':
    case 'sortSimilarNames':
      return { kind: 'links', links: Object.fromEntries(question.countries.map((c) => [c.iso2, c.iso2])) };
    default:
      return { kind: 'choice', iso2: question.target.iso2 };
  }
}

function pressDeviceBack(times = 1): void {
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  vi.spyOn(history, 'back').mockImplementation(() => {});
  const stop = listenForBack();
  settleBack();
  for (let i = 0; i < times; i++) window.dispatchEvent(new PopStateEvent('popstate'));
  stop();
}

describe('renderGame', () => {
  let root: HTMLElement;
  let screens: Screen[];

  beforeEach(() => {
    localStorage.clear();
    asked.length = 0;
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderGame(root, (screen) => screens.push(screen), 'oceania', 'easy');
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  it('shows the level, three lives, the correct answers out of the goal and an empty bar in the top bar', () => {
    const goal = goalFor('easy', poolFor(countries, 'oceania', 'easy').length);
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Oceania · Fácil');
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥0/${goal}`);
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(0);
    expect(root.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('0%');
  });

  const loseEveryLife = () => {
    for (let i = 0; i < 3; i++) {
      const { question, submit } = asked[asked.length - 1];
      submit(wrongAnswer(question));
      root.querySelector<HTMLButtonElement>('.feedback button')!.click();
    }
  };
  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;

  it('keeps a typed question open, with no feedback and every life, on a typo', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng(2));
    asked.length = 0;
    root.replaceChildren();
    renderGame(root, (screen) => screens.push(screen), 'oceania', 'easy');
    while (asked[asked.length - 1].question.format !== 'typeName') {
      const { question, submit } = asked[asked.length - 1];
      submit(rightAnswer(question));
      root.querySelector<HTMLButtonElement>('.feedback button')!.click();
    }
    const { question, submit } = asked[asked.length - 1];
    if (question.format !== 'typeName') throw new Error('Expected a typeName question');
    const asking = asked.length;
    expect(submit({ kind: 'text', text: `${question.target.name}x` })).toEqual([question.target]);
    expect(root.querySelector('.feedback')).toBeNull();
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(0);
    expect(asked.length).toBe(asking);
    submit(rightAnswer(question));
    expect(root.querySelector('.feedback')).not.toBeNull();
  });

  it('offers to continue without a medal when the lives run out and ends on the lost result on Encerrar', () => {
    loseEveryLife();
    expect(screens).toEqual([]);
    button('Encerrar').click();
    expect(screens).toMatchObject([{ name: 'result', continent: 'oceania', difficulty: 'easy', won: false, medal: null, correct: 0 }]);
    expect(localStorage.getItem('flags-quiz:medals')).toBeNull();
  });

  it('asks the next flag after Continuar sem medalha', () => {
    loseEveryLife();
    const asking = asked.length;
    button('Continuar sem medalha').click();
    expect(asked.length).toBe(asking + 1);
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(3);
  });

  it('leaves to the hub on the same continent on ✕', () => {
    root.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });

  it('has no Sair button besides the top bar', () => {
    expect([...root.querySelectorAll('button')].map((b) => b.textContent)).not.toContain('Sair');
  });

  it('leaves to the hub on the device back', () => {
    pressDeviceBack();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });
});
