// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Answer } from '../../engine/answer';
import { goalFor } from '../../engine/pool';
import { mapPool } from '../../data/maps';
import type { Question } from '../../engine/question';
import { listenForBack, settleBack } from '../backButton';
import type { Navigate, Screen } from '../navigation';
import { renderMapGame } from './mapGame';

const asked: { question: Question; submit: (answer: Answer) => void }[] = [];

vi.mock('../questions/render', () => ({
  renderQuestion: (question: Question, submit: (answer: Answer) => void) => {
    asked.push({ question, submit });
    return document.createElement('div');
  },
}));

function correctAnswer(question: Question): Answer {
  switch (question.format) {
    case 'mapToNames':
    case 'nameToMap':
      return { kind: 'choice', iso2: question.target.iso2 };
    case 'mapTrueFalse':
      return { kind: 'yesNo', yes: question.shown === question.target };
    case 'mapTypeName':
      return { kind: 'text', text: question.target.name };
    case 'mapPairs':
      return { kind: 'links', links: Object.fromEntries(question.countries.map((c) => [c.iso2, c.iso2])) };
    default:
      throw new Error(`Unexpected ${question.format}`);
  }
}

function wrongAnswer(question: Question): Answer {
  switch (question.format) {
    case 'mapToNames':
    case 'nameToMap':
      return { kind: 'choice', iso2: '' };
    case 'mapTrueFalse':
      return { kind: 'yesNo', yes: question.shown !== question.target };
    case 'mapTypeName':
      return { kind: 'text', text: '' };
    case 'mapPairs':
      return { kind: 'links', links: {} };
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
  const goal = goalFor('medium', mapPool('americas', 'medium').length);
  const navigate: Navigate = (screen) => screens.push(screen);

  const answerCurrent = (answer: (question: Question) => Answer) => {
    const { question, submit } = asked[asked.length - 1];
    submit(answer(question));
    root.querySelector<HTMLButtonElement>('.feedback button')!.click();
  };

  beforeEach(() => {
    localStorage.clear();
    asked.length = 0;
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderMapGame(root, navigate, 'americas', 'medium');
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  it('shows the map label, three lives, the correct answers out of the goal and an empty bar', () => {
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Mapa · Américas · Médio');
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥0/${goal}`);
    expect(root.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('0%');
  });

  it('counts a correct answer and costs a life per wrong one', () => {
    answerCurrent(correctAnswer);
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥1/${goal}`);
    answerCurrent(wrongAnswer);
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(1);
  });

  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;

  it('awards a gold map medal and opens the result when the goal is reached with every life', () => {
    for (let i = 0; i < goal; i++) answerCurrent(correctAnswer);
    expect(JSON.parse(localStorage.getItem('flags-quiz:map-medals')!)).toEqual({ americas: { medium: 'gold' } });
    expect(screens).toEqual([{ name: 'mapResult', continent: 'americas', difficulty: 'medium', won: true, medal: 'gold', correct: goal, missed: [] }]);
  });

  it('awards silver when the goal is reached with two lives left', () => {
    answerCurrent(wrongAnswer);
    for (let i = 0; i < goal; i++) answerCurrent(correctAnswer);
    expect(screens).toMatchObject([{ name: 'mapResult', won: true, medal: 'silver' }]);
    expect(JSON.parse(localStorage.getItem('flags-quiz:map-medals')!)).toEqual({ americas: { medium: 'silver' } });
  });

  it('offers to continue without a medal when the lives run out, and ends on the lost result on Encerrar', () => {
    for (let i = 0; i < 3; i++) answerCurrent(wrongAnswer);
    expect(screens).toEqual([]);
    expect(root.querySelector('.out-of-lives .verdict')!.textContent).toBe('Suas vidas acabaram');
    button('Encerrar').click();
    expect(localStorage.getItem('flags-quiz:map-medals')).toBeNull();
    const [screen] = screens;
    expect(screen).toMatchObject({ name: 'mapResult', continent: 'americas', difficulty: 'medium', won: false, medal: null, correct: 0 });
    expect((screen as Extract<Screen, { name: 'mapResult' }>).missed.length).toBeGreaterThan(0);
  });

  it('keeps asking after Continuar sem medalha and reaches the goal without a medal', () => {
    for (let i = 0; i < 3; i++) answerCurrent(wrongAnswer);
    const asking = asked.length;
    button('Continuar sem medalha').click();
    expect(asked.length).toBe(asking + 1);
    expect(root.querySelector('.out-of-lives')).toBeNull();
    answerCurrent(wrongAnswer);
    expect(screens).toEqual([]);
    for (let i = 0; i < goal; i++) answerCurrent(correctAnswer);
    expect(screens).toMatchObject([{ name: 'mapResult', won: true, medal: null, correct: goal }]);
    expect(localStorage.getItem('flags-quiz:map-medals')).toBeNull();
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
