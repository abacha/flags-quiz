// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { el } from './dom';
import { topBar } from './topbar';

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
