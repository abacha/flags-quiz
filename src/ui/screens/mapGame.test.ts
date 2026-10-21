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
  const goal = goalFor('general', mapPool('oceania').length);
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
    renderMapGame(root, navigate, 'oceania');
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  it('shows the map label, three lives, the correct answers out of the goal and an empty bar', () => {
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Mapa · Oceania');
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥0/${goal}`);
    expect(root.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('0%');
  });

  it('counts a correct answer and costs a life per wrong one', () => {
    answerCurrent(correctAnswer);
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥1/${goal}`);
    answerCurrent(wrongAnswer);
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(1);
  });

  it('awards the map medal and opens the result when the goal is reached', () => {
    for (let i = 0; i < goal; i++) answerCurrent(correctAnswer);
    expect(JSON.parse(localStorage.getItem('flags-quiz:map-medals')!)).toEqual({ oceania: true });
    expect(screens).toEqual([{ name: 'mapResult', continent: 'oceania', won: true, correct: goal, missed: [] }]);
  });

  it('opens the lost result with the missed countries and awards no medal when the lives run out', () => {
    for (let i = 0; i < 3; i++) answerCurrent(wrongAnswer);
    expect(localStorage.getItem('flags-quiz:map-medals')).toBeNull();
    const [screen] = screens;
    expect(screen).toMatchObject({ name: 'mapResult', continent: 'oceania', won: false, correct: 0 });
    expect((screen as Extract<Screen, { name: 'mapResult' }>).missed.length).toBeGreaterThan(0);
  });

  it('leaves to the hub on the same continent on ✕', () => {
    root.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });

  it('leaves to the hub on the device back', () => {
    pressDeviceBack();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });
});
