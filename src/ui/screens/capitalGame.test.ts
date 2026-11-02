// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { capitalPool, mainCapital } from '../../data/capitals';
import type { Answer } from '../../engine/answer';
import { CAPITAL_FORMATS } from '../../engine/capitalFormats';
import { goalFor } from '../../engine/pool';
import type { Question } from '../../engine/question';
import type { Screen } from '../navigation';
import { renderCapitalGame } from './capitalGame';

const asked: { question: Question; submit: (answer: Answer) => unknown }[] = [];

vi.mock('../questions/render', () => ({
  renderQuestion: (question: Question, submit: (answer: Answer) => unknown) => {
    asked.push({ question, submit });
    return document.createElement('div');
  },
}));

function rightAnswer(question: Question): Answer {
  switch (question.format) {
    case 'capitalTrueFalse':
      return { kind: 'yesNo', yes: question.shown === question.target };
    case 'typeCapital':
      return { kind: 'text', text: mainCapital(question.target) };
    case 'typeCapitalCountry':
      return { kind: 'text', text: question.target.name };
    case 'capitalPairs':
      return { kind: 'links', links: Object.fromEntries(question.countries.map((c) => [c.iso2, c.iso2])) };
    default:
      return { kind: 'choice', iso2: 'target' in question ? question.target.iso2 : '' };
  }
}

function wrongAnswer(question: Question): Answer {
  switch (question.format) {
    case 'capitalTrueFalse':
      return { kind: 'yesNo', yes: question.shown !== question.target };
    case 'typeCapital':
    case 'typeCapitalCountry':
      return { kind: 'text', text: 'Xyzzyq' };
    case 'capitalPairs':
      return { kind: 'links', links: {} };
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

  it('titles the round with the Capitais prefix and counts toward the capital goal', () => {
    const goal = goalFor('easy', capitalPool('oceania', 'easy').length);
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Capitais · Oceania · Fácil');
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥0/${goal}`);
  });

  it('plays Geral on 20 countries from the levels with the weakest medals, with a goal of 15', () => {
    localStorage.setItem('flags-quiz:capital-medals', JSON.stringify({ africa: { easy: 'gold', medium: 'silver' } }));
    asked.length = 0;
    root.replaceChildren();
    renderCapitalGame(root, (screen) => screens.push(screen), 'africa', 'general');
    expect(root.querySelector('.topbar-counters')!.textContent).toBe('♥♥♥0/15');
    while (screens.length === 0) {
      const { question, submit } = asked[asked.length - 1];
      if ('target' in question) expect(question.target.tier).toBeGreaterThan(1);
      submit(rightAnswer(question));
      root.querySelector<HTMLButtonElement>('.feedback button')!.click();
    }
  });

  it('asks only capital formats', () => {
    expect(CAPITAL_FORMATS.map((f) => f.id)).toContain(asked[0].question.format);
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
    expect(screens).toMatchObject([{ name: 'capitalResult', continent: 'oceania', difficulty: 'easy' }]);
    expect(localStorage.getItem('flags-quiz:capital-medals')).not.toBeNull();
    expect(localStorage.getItem('flags-quiz:medals')).toBeNull();
  });
});
