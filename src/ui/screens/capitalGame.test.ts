// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { capitalPool, mainCapital } from '../../data/capitals';
import type { Answer } from '../../engine/answer';
import { MAP_ALL, type MapScope } from '../../data/maps';
import type { Question } from '../../engine/question';
import type { Screen } from '../navigation';
import { renderCapitalGame } from './capitalGame';

const asked: { question: Question; submit: (answer: Answer) => unknown; scope?: MapScope }[] = [];

vi.mock('../questions/render', () => ({
  renderQuestion: (question: Question, submit: (answer: Answer) => unknown, scope?: MapScope) => {
    asked.push({ question, submit, scope });
    return document.createElement('div');
  },
}));

function rightAnswer(question: Question): Answer {
  switch (question.format) {
    case 'typeCapital':
      return { kind: 'text', text: mainCapital(question.target) };
    case 'typeCapitalCountry':
      return { kind: 'text', text: question.target.name };
    default:
      return { kind: 'choice', iso2: question.target.iso2 };
  }
}

function wrongAnswer(question: Question): Answer {
  switch (question.format) {
    case 'typeCapital':
    case 'typeCapitalCountry':
      return { kind: 'text', text: 'Xyzzyq' };
    default:
      return { kind: 'choice', iso2: '' };
  }
}

describe('renderCapitalGame', () => {
  let root: HTMLElement;
  let screens: Screen[];

  beforeEach(() => {
    localStorage.clear();
    asked.length = 0;
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderCapitalGame(root, (screen) => screens.push(screen), 'oceania', 'easy');
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  const size = capitalPool('oceania', 'easy').length;

  const play = (pick: (question: Question) => Answer) => {
    const { question, submit } = asked[asked.length - 1];
    submit(pick(question));
    root.querySelector<HTMLButtonElement>('.feedback button')!.click();
  };

  it('titles the round with the Capitais prefix and counts countries done out of the level size', () => {
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Capitais · Oceania · Fácil');
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥0/${size}`);
  });

  it('opens on the map bridge drawn on the continent map', () => {
    expect(asked[0].question.format).toBe('capitalOnMap');
    expect(asked[0].scope).toEqual({ continent: 'oceania', level: MAP_ALL });
  });

  it('ends on the lost result on Encerrar after three wrong answers', () => {
    for (let i = 0; i < 3; i++) play(wrongAnswer);
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Encerrar')!.click();
    expect(screens).toMatchObject([{ name: 'capitalResult', won: false, medal: null, done: 0, correct: 0, answered: 3 }]);
  });

  it('shows the capital card on a right answer too', () => {
    const { question, submit } = asked[0];
    submit(rightAnswer(question));
    expect(root.querySelector('.feedback.right .solution-card .solution-capital')!.textContent).not.toBe('');
  });

  it('praises a right answer, counts the answers in a row in the top bar and resets the streak on a miss', () => {
    const play = (pick: (question: Question) => Answer) => {
      const { question, submit } = asked[asked.length - 1];
      submit(pick(question));
      const verdict = root.querySelector('.feedback .verdict')!.textContent;
      root.querySelector<HTMLButtonElement>('.feedback button')!.click();
      return verdict;
    };
    expect(play(rightAnswer)).toBe('Certo!');
    expect(root.querySelector('.streak')).toBeNull();
    expect(play(rightAnswer)).toBe('Isso aí!');
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
    next.submit(rightAnswer(next.question));
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(1);
    expect(root.querySelectorAll('.heart.breaking')).toHaveLength(0);
  });

  it('awards a medal under the capital key and opens the capital result on a win', () => {
    while (!screens.length) {
      const { question, submit } = asked[asked.length - 1];
      submit(rightAnswer(question));
      root.querySelector<HTMLButtonElement>('.feedback button')!.click();
    }
    expect(screens).toMatchObject([
      { name: 'capitalResult', continent: 'oceania', difficulty: 'easy', won: true, medal: 'gold', done: size, correct: size * 4, answered: size * 4 },
    ]);
    expect(localStorage.getItem('flags-quiz:capital-medals')).not.toBeNull();
    expect(localStorage.getItem('flags-quiz:medals')).toBeNull();
  });
});
