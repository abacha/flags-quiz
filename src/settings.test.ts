// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMotion, loadSettings, motionAllowed, saveSettings } from './settings';

describe('settings', () => {
  beforeEach(() => localStorage.clear());

  it('turns sound and motion on by default', () => {
    expect(loadSettings(localStorage)).toEqual({ sound: true, motion: true });
  });

  it('remembers what was saved', () => {
    saveSettings(localStorage, { sound: false, motion: true });
    expect(loadSettings(localStorage)).toEqual({ sound: false, motion: true });
  });

  it('falls back to the default of any setting stored as something other than true or false', () => {
    localStorage.setItem('flags-quiz:settings', JSON.stringify({ sound: 'no', motion: false }));
    expect(loadSettings(localStorage)).toEqual({ sound: true, motion: false });
  });

  it('marks the page with the motion setting for the stylesheet', () => {
    const page = document.createElement('html');
    applyMotion(page, { sound: true, motion: false });
    expect(page.dataset.motion).toBe('off');
    applyMotion(page, { sound: true, motion: true });
    expect(page.dataset.motion).toBe('on');
  });

  it('allows motion only when it is turned on and the device does not ask for less', () => {
    expect(motionAllowed(localStorage)).toBe(true);
    saveSettings(localStorage, { sound: true, motion: false });
    expect(motionAllowed(localStorage)).toBe(false);
    saveSettings(localStorage, { sound: true, motion: true });
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    expect(motionAllowed(localStorage)).toBe(false);
    vi.restoreAllMocks();
  });
});
