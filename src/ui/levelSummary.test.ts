import { describe, expect, it } from 'vitest';
import { levelSummary } from './levelSummary';

describe('levelSummary', () => {
  it('shows the flag count, the goal and no record on a fresh level', () => {
    expect(levelSummary('africa', 'easy', {}, {})).toEqual({
      flags: '20 bandeiras',
      learn: 'Aprender: 14 acertos',
      quiz: 'Quiz: sem recorde',
    });
  });

  it('keeps a medal earned before the levels were redistributed', () => {
    expect(levelSummary('africa', 'hard', { africa: { hard: true } }, {}).learn).toBe('Aprender: 28 acertos · 🏅');
  });

  it('shows the Mundo medal and records saved under world', () => {
    expect(
      levelSummary('world', 'general', { world: { general: true } }, { world: { general: { bestScore: 200, bestTimeMs: 754000 } } }),
    ).toEqual({
      flags: '248 bandeiras',
      learn: 'Aprender: 138 acertos · 🏅',
      quiz: 'Quiz: recorde 200 pts · 12:34',
    });
  });

  it('shows a best score without a time when no quiz was finished cleanly', () => {
    expect(levelSummary('oceania', 'medium', {}, { oceania: { medium: { bestScore: 5 } } }).quiz).toBe('Quiz: recorde 5 pts');
  });
});
