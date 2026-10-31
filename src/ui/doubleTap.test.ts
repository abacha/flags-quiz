// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreDoubleTap } from './doubleTap';

describe('ignoreDoubleTap', () => {
  let button: HTMLButtonElement;
  let clicked: ReturnType<typeof vi.fn<() => void>>;
  let stop: () => void;

  const click = (detail: number, x: number, y = 10) =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail, clientX: x, clientY: y }));

  beforeEach(() => {
    button = document.createElement('button');
    clicked = vi.fn();
    button.addEventListener('click', clicked);
    document.body.append(button);
    stop = ignoreDoubleTap(document);
  });

  afterEach(() => {
    stop();
    button.remove();
  });

  it('drops the second click of a double-tap on the same spot', () => {
    click(1, 10);
    click(2, 14, 12);
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('keeps a quick second tap elsewhere, which Android still counts as a double-tap within 100dp', () => {
    click(1, 10);
    click(2, 90, 60);
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it('keeps keyboard clicks', () => {
    click(0, 0);
    click(0, 0);
    expect(clicked).toHaveBeenCalledTimes(2);
  });
});
