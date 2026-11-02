// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSettings } from '../settings';
import { playCue } from './cue';

const frequencies: number[] = [];
let contexts = 0;

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  constructor() {
    contexts++;
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        set value(hz: number) {
          frequencies.push(hz);
        },
      },
      connect: (node: unknown) => node,
      start() {},
      stop() {},
    };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (node: unknown) => node };
  }
  resume() {
    return Promise.resolve();
  }
}

describe('playCue', () => {
  const vibrate = vi.fn();

  beforeAll(() => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  });

  beforeEach(() => {
    localStorage.clear();
    frequencies.length = 0;
    vibrate.mockClear();
  });

  afterEach(() => localStorage.clear());

  it('plays a rising pair of notes and a short buzz on a right answer', () => {
    playCue('right');
    expect(frequencies).toEqual([660, 880]);
    expect(vibrate).toHaveBeenCalledWith([12]);
  });

  it('plays a falling pair of low notes and a double buzz on a wrong answer', () => {
    playCue('wrong');
    expect(frequencies).toEqual([196, 147]);
    expect(vibrate).toHaveBeenCalledWith([30, 40, 30]);
  });

  it('climbs an arpeggio on a streak and a longer one on a win', () => {
    playCue('streak');
    expect(frequencies).toEqual([523, 659, 784, 1047]);
    frequencies.length = 0;
    playCue('win');
    expect(frequencies).toEqual([523, 659, 784, 1047, 1319]);
  });

  it('opens a single audio context for every cue', () => {
    playCue('right');
    const opened = contexts;
    playCue('wrong');
    expect(contexts).toBe(opened);
    expect(opened).toBe(1);
  });

  it('stays silent and still with the sound turned off', () => {
    saveSettings(localStorage, { sound: false, motion: true });
    playCue('right');
    expect(frequencies).toEqual([]);
    expect(vibrate).not.toHaveBeenCalled();
  });
});
