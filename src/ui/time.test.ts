import { describe, expect, it } from 'vitest';
import { formatTime } from './time';

describe('formatTime', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [1000, '00:01'],
    [65_500, '01:05'],
    [3_600_000, '60:00'],
  ])('formats %d ms as %s', (ms, text) => {
    expect(formatTime(ms)).toBe(text);
  });
});
