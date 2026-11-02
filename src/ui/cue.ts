import { loadSettings } from '../settings';

export type Cue = 'right' | 'wrong' | 'streak' | 'win';

interface Tone {
  notes: number[];
  step: number;
  wave: OscillatorType;
  volume: number;
  vibrate: number[];
}

const TONES: Record<Cue, Tone> = {
  right: { notes: [660, 880], step: 0.08, wave: 'triangle', volume: 0.2, vibrate: [12] },
  wrong: { notes: [196, 147], step: 0.12, wave: 'square', volume: 0.06, vibrate: [30, 40, 30] },
  streak: { notes: [523, 659, 784, 1047], step: 0.07, wave: 'triangle', volume: 0.2, vibrate: [15, 30, 15] },
  win: { notes: [523, 659, 784, 1047, 1319], step: 0.11, wave: 'triangle', volume: 0.2, vibrate: [20, 40, 20, 40, 60] },
};

let audio: AudioContext | undefined;

export function playCue(cue: Cue): void {
  if (!loadSettings(localStorage).sound) return;
  const { notes, step, wave, volume, vibrate } = TONES[cue];
  navigator.vibrate?.(vibrate);
  if (typeof AudioContext === 'undefined') return;
  audio ??= new AudioContext();
  if (audio.state === 'suspended') void audio.resume();
  const context = audio;
  notes.forEach((hz, index) => {
    const at = context.currentTime + index * step;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + step * 1.8);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + step * 2);
  });
}
