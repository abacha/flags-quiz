// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type BackButton = typeof import('./backButton');

describe('backButton', () => {
  let back: BackButton;
  let push: ReturnType<typeof vi.spyOn>;
  let pop: ReturnType<typeof vi.spyOn>;
  let stopListening: () => void;

  const pressBack = () => window.dispatchEvent(new PopStateEvent('popstate'));

  beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    push = vi.spyOn(history, 'pushState').mockImplementation(() => {});
    pop = vi.spyOn(history, 'back').mockImplementation(() => {});
    back = await import('./backButton');
    stopListening = back.listenForBack();
  });

  afterEach(() => stopListening());

  it('adds no history entry for a screen without a back action', () => {
    back.settleBack();
    expect(push).not.toHaveBeenCalled();
  });

  it('adds one history entry while screens with a back action follow each other', () => {
    back.onBack(() => {});
    back.settleBack();
    back.onBack(() => {});
    back.settleBack();
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('runs the back action when the device back is pressed', () => {
    const action = vi.fn(() => back.settleBack());
    back.onBack(action);
    back.settleBack();
    pressBack();
    expect(action).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('adds the entry again when the back action keeps the screen', () => {
    back.onBack(() => {});
    back.settleBack();
    pressBack();
    expect(push).toHaveBeenCalledTimes(2);
  });

  it('removes its entry when the app leaves to a screen without a back action, ignoring the pop it causes', () => {
    const action = vi.fn();
    back.onBack(action);
    back.settleBack();
    back.settleBack();
    expect(pop).toHaveBeenCalledTimes(1);
    pressBack();
    expect(action).not.toHaveBeenCalled();
  });
});
