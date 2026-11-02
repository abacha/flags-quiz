// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countries } from '../data/countries';
import { saveSettings } from '../settings';
import { celebrateAnswer, celebrateResult, countUp, learnCheer, praise, quizCheer } from './celebrate';
import { playCue } from './cue';
import { el } from './dom';

vi.mock('./cue', () => ({ playCue: vi.fn() }));

const fiji = countries.find((c) => c.iso2 === 'fj')!;
const tonga = countries.find((c) => c.iso2 === 'to')!;

function answered() {
  const options = [fiji, tonga].map((c) => {
    const option = el('button', { className: 'name-option' }, [c.name]);
    option.dataset.iso2 = c.iso2;
    return option;
  });
  const question = el('div', { className: 'question' }, options);
  const feedback = el('section', { className: 'feedback' }, [el('p', { className: 'verdict' }, ['Certo!'])]);
  document.body.append(question, feedback);
  return { question, feedback, verdict: () => feedback.querySelector('.verdict')!.textContent, confetti: () => document.querySelectorAll('.confetti') };
}

describe('celebrate', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(playCue).mockClear();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  describe('praise', () => {
    it('varies the praise as the streak grows and calls out every fifth answer in a row', () => {
      expect([1, 2, 3, 4, 5, 6, 10].map(praise)).toEqual(['Certo!', 'Isso aí!', 'Mandou bem!', 'Craque!', '🔥 5 seguidas!', 'Certo!', '🔥 10 seguidas!']);
    });
  });

  describe('celebrateAnswer', () => {
    it('marks the question right, praises the streak, chimes and throws confetti from the verdict', () => {
      const { question, feedback, verdict, confetti } = answered();
      celebrateAnswer(question, feedback, { correct: true, missed: [], typos: [] }, 2);
      expect(question.classList.contains('answered-right')).toBe(true);
      expect(verdict()).toBe('Isso aí!');
      expect(playCue).toHaveBeenCalledWith('right');
      expect(confetti().length).toBe(16);
    });

    it('plays the streak cue and throws more confetti on every fifth answer in a row', () => {
      const { question, feedback, confetti } = answered();
      celebrateAnswer(question, feedback, { correct: true, missed: [], typos: [] }, 5);
      expect(playCue).toHaveBeenCalledWith('streak');
      expect(confetti().length).toBe(40);
    });

    it('marks the question wrong, lights the right option and buzzes, with no confetti', () => {
      const { question, feedback, verdict, confetti } = answered();
      celebrateAnswer(question, feedback, { correct: false, missed: [tonga], typos: [] }, 0);
      expect(question.classList.contains('answered-wrong')).toBe(true);
      expect(question.querySelector('.revealed')!.textContent).toBe('Tonga');
      expect(question.querySelectorAll('.revealed')).toHaveLength(1);
      expect(verdict()).toBe('Certo!');
      expect(playCue).toHaveBeenCalledWith('wrong');
      expect(confetti()).toHaveLength(0);
    });

    it('throws no confetti with the animations turned off', () => {
      saveSettings(localStorage, { sound: true, motion: false });
      const { question, feedback, confetti } = answered();
      celebrateAnswer(question, feedback, { correct: true, missed: [], typos: [] }, 5);
      expect(confetti()).toHaveLength(0);
      expect(playCue).toHaveBeenCalledWith('streak');
    });

    it('throws no confetti when the device asks for reduced motion', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
      const { question, feedback, confetti } = answered();
      celebrateAnswer(question, feedback, { correct: true, missed: [], typos: [] }, 1);
      expect(confetti()).toHaveLength(0);
      vi.restoreAllMocks();
    });
  });

  describe('cheers', () => {
    it('cheers big for gold, cheers for any other win and stays quiet on a loss', () => {
      expect(learnCheer(true, 'gold')).toBe('big');
      expect(learnCheer(true, 'silver')).toBe('win');
      expect(learnCheer(true, null)).toBe('win');
      expect(learnCheer(false, null)).toBeNull();
    });

    it('cheers big for a quiz record, cheers for a finished quiz and stays quiet on one ended early', () => {
      expect(quizCheer(false, { score: true, time: false })).toBe('big');
      expect(quizCheer(true, { score: false, time: true })).toBe('big');
      expect(quizCheer(true, { score: false, time: false })).toBe('win');
      expect(quizCheer(false, { score: false, time: false })).toBeNull();
    });
  });

  describe('celebrateResult', () => {
    it('bounces the title and plays the fanfare on a win, with confetti rain only on a big one', () => {
      const title = el('h1');
      celebrateResult(title, 'win');
      expect(title.classList.contains('cheer')).toBe(true);
      expect(playCue).toHaveBeenCalledWith('win');
      expect(document.querySelectorAll('.confetti')).toHaveLength(0);
      celebrateResult(el('h1'), 'big');
      expect(document.querySelectorAll('.confetti.rain').length).toBe(80);
    });

    it('does nothing without a cheer', () => {
      const title = el('h1');
      celebrateResult(title, null);
      expect(title.classList.contains('cheer')).toBe(false);
      expect(playCue).not.toHaveBeenCalled();
    });
  });

  describe('countUp', () => {
    afterEach(() => vi.useRealTimers());

    it('shows the final value at once and then counts the leading number up to it frame by frame', () => {
      vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
      const value = el('b');
      countUp(value, '15/20');
      expect(value.textContent).toBe('15/20');
      vi.advanceTimersToNextFrame();
      expect(value.textContent).toBe('0/20');
      vi.advanceTimersByTime(300);
      expect(Number(value.textContent!.split('/')[0])).toBeGreaterThan(0);
      expect(Number(value.textContent!.split('/')[0])).toBeLessThan(15);
      vi.advanceTimersByTime(1000);
      expect(value.textContent).toBe('15/20');
    });

    it('leaves a time or any value that is not a count as it is', () => {
      vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
      const value = el('b');
      countUp(value, '02:13');
      vi.advanceTimersByTime(100);
      expect(value.textContent).toBe('02:13');
    });

    it('never counts with the animations turned off', () => {
      saveSettings(localStorage, { sound: true, motion: false });
      vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
      const value = el('b');
      countUp(value, '84');
      vi.advanceTimersToNextFrame();
      expect(value.textContent).toBe('84');
    });
  });
});
