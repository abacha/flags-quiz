// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clickOnLongPress } from './longPress';

describe('clickOnLongPress', () => {
  let time: number;
  let button: HTMLButtonElement;
  let clicked: ReturnType<typeof vi.fn<() => void>>;
  let stop: () => void;

  const touch = (type: string, x = 10, y = 10) => {
    const point = new Touch({ identifier: 1, target: button, clientX: x, clientY: y });
    const touches = type === 'touchstart' ? [point] : [];
    button.dispatchEvent(new TouchEvent(type, { bubbles: true, touches, changedTouches: [point] }));
  };
  const press = (ms: number, upX = 10, upY = 10) => {
    touch('touchstart');
    time += ms;
    touch('touchend', upX, upY);
  };

  beforeEach(() => {
    time = 0;
    button = document.createElement('button');
    button.getBoundingClientRect = () => new DOMRect(0, 0, 100, 40);
    clicked = vi.fn();
    button.addEventListener('click', clicked);
    document.body.append(button);
    stop = clickOnLongPress(document, () => time);
  });

  afterEach(() => {
    stop();
    button.remove();
  });

  it('clicks a button released on itself after a long press', () => {
    press(800);
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('clicks after a long press whose finger drifted a few pixels, which Android reads as a scroll start', () => {
    press(800, 24, 18);
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('drops the browser click that follows a long press it already clicked', () => {
    press(400);
    button.click();
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('lets a later tap click again', () => {
    press(800);
    time += 1000;
    button.click();
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it('leaves a short tap to the browser', () => {
    press(100);
    expect(clicked).not.toHaveBeenCalled();
  });

  it('does not click after a drag longer than a drift, even when it ends on the button', () => {
    press(800, 10, 38);
    expect(clicked).not.toHaveBeenCalled();
  });

  it('does not click when the finger slides off the button before release', () => {
    press(800, 110, 10);
    expect(clicked).not.toHaveBeenCalled();
  });

  it('does not click when the system cancels the touch', () => {
    touch('touchstart');
    touch('touchcancel');
    time += 800;
    touch('touchend');
    expect(clicked).not.toHaveBeenCalled();
  });

  it('does not click a disabled button', () => {
    button.disabled = true;
    press(800);
    expect(clicked).not.toHaveBeenCalled();
  });
});
