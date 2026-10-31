// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clickOnLongPress } from './longPress';

describe('clickOnLongPress', () => {
  let time: number;
  let button: HTMLButtonElement;
  let clicked: ReturnType<typeof vi.fn<() => void>>;
  let stop: () => void;

  const pointer = (type: string, x = 10, y = 10, pointerType = 'touch') =>
    button.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerType }));
  const press = (ms: number, upX = 10, upY = 10, pointerType = 'touch') => {
    pointer('pointerdown', 10, 10, pointerType);
    time += ms;
    pointer('pointerup', upX, upY, pointerType);
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

  it('does not click when the finger slides off the button before release', () => {
    press(800, 150, 10);
    expect(clicked).not.toHaveBeenCalled();
  });

  it('does not click when the browser cancels the press for a scroll', () => {
    pointer('pointerdown');
    pointer('pointercancel');
    time += 800;
    pointer('pointerup');
    expect(clicked).not.toHaveBeenCalled();
  });

  it('does not click a disabled button', () => {
    button.disabled = true;
    press(800);
    expect(clicked).not.toHaveBeenCalled();
  });

  it('leaves a mouse press to the browser', () => {
    press(800, 10, 10, 'mouse');
    expect(clicked).not.toHaveBeenCalled();
  });
});
