// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { el } from './dom';
import { hearts, streakCounter, topBar } from './topbar';

describe('topBar', () => {
  it('shows a close button, the label, the counters and a progress bar', () => {
    let closed = 0;
    const bar = topBar('África · Fácil', () => closed++);
    bar.update([el('span', {}, ['02:13']), el('span', {}, ['5/20'])], 0.25);
    expect(bar.element.querySelector('.topbar-label')!.textContent).toBe('África · Fácil');
    expect(bar.element.querySelector('.topbar-counters')!.textContent).toBe('02:135/20');
    expect(bar.element.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('25%');
    bar.element.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(closed).toBe(1);
  });

  it('replaces the counters and the bar on every update', () => {
    const bar = topBar('Mundo · Geral', () => {});
    bar.update([el('span', {}, ['0/10'])], 0);
    bar.update([el('span', {}, ['1/10'])], 0.1);
    expect(bar.element.querySelector('.topbar-counters')!.textContent).toBe('1/10');
    expect(bar.element.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('10%');
  });
});

describe('hearts', () => {
  it('shows a heart per life, greys the lost ones and breaks only the one just lost', () => {
    const lives = hearts(1, true);
    expect([...lives.children].map((h) => h.className)).toEqual(['heart', 'heart lost breaking', 'heart lost']);
    expect([...hearts(1, false).children].map((h) => h.className)).toEqual(['heart', 'heart lost', 'heart lost']);
  });
});

describe('streakCounter', () => {
  it('shows the streak from two answers in a row', () => {
    expect(streakCounter(1)).toEqual([]);
    const [counter] = streakCounter(3);
    expect(counter.className).toBe('streak');
    expect(counter.textContent).toBe('🔥 3');
  });
});

describe('topBar progress', () => {
  it('flashes the bar each time the progress grows', () => {
    const bar = topBar('Oceania · Fácil', () => {});
    const fill = bar.element.querySelector('.topbar-fill')!;
    bar.update([], 0);
    expect(fill.classList.contains('bump')).toBe(false);
    bar.update([], 0.1);
    expect(fill.classList.contains('bump')).toBe(true);
    fill.classList.remove('bump');
    bar.update([], 0.1);
    expect(fill.classList.contains('bump')).toBe(false);
  });
});
