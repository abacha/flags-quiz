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

  it('asks only capital formats', () => {
    expect(CAPITAL_FORMATS.map((f) => f.id)).toContain(asked[0].question.format);
  });

  it('shows the capital card on a right answer too', () => {
    const { question, submit } = asked[0];
    submit(rightAnswer(question));
    expect(root.querySelector('.feedback.right .solution-card .solution-capital')!.textContent).not.toBe('');
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
