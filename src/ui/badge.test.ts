// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries, similarGroups, similarNames } from '../data/countries';
import { ALL_FORMATS, typeName } from '../engine/formats';
import { poolFor } from '../engine/pool';
import type { FormatContext } from '../engine/question';
import { seededRng } from '../engine/rng';
import { STATUS_BADGE } from './labels';
import { renderFeedback, solutionCard } from './questions/feedback';
import { renderQuestion } from './questions/render';

const byIso = (code: string) => countries.find((c) => c.iso2 === code)!;
const pool = poolFor(countries, 'americas', 'hard');
const ctx: FormatContext = { pool, world: countries, similarGroups, similarNames, similarDistractors: true };

describe('STATUS_BADGE', () => {
  it('names every status', () => {
    expect(STATUS_BADGE).toEqual({ un: 'ONU', nonMember: 'Não-membro', ukNation: 'Nação do Reino Unido', territory: 'Território' });
  });
});

describe('badge', () => {
  it.each([
    ['br', 'ONU'],
    ['va', 'Não-membro'],
    ['gb-sct', 'Nação do Reino Unido'],
    ['ky', 'Território'],
  ])('shows the %s badge beside the name in a solution card', (code, text) => {
    const card = solutionCard(byIso(code));
    expect(card.querySelector('.badge')?.textContent).toBe(text);
    expect(card.querySelector('figcaption')?.textContent).toBe(`${byIso(code).name} ${text}`);
  });

  it('shows the badge in the feedback of a wrong answer', () => {
    const question = typeName.build(byIso('ky'), ctx, seededRng(1));
    const feedback = renderFeedback(question, { correct: false, missed: [byIso('ky')] }, () => {});
    expect(feedback.querySelector('.badge')?.textContent).toBe('Território');
  });

  it('never shows a badge inside a question', () => {
    for (const format of ALL_FORMATS) {
      for (const target of pool) {
        if (!format.canTarget(target, ctx)) continue;
        const question = format.build(target, ctx, seededRng(1));
        expect(renderQuestion(question, () => {}).querySelector('.badge')).toBeNull();
      }
    }
  });
});
