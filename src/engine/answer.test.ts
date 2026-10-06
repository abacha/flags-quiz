import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { grade, normalizeName } from './answer';
import type { Question } from './question';

const c = (code: string) => countries.find((country) => country.iso2 === code)!;

describe('normalizeName', () => {
  it('lowercases, strips accents, turns hyphens into spaces and collapses whitespace', () => {
    expect(normalizeName('  São   Tomé-e-Príncipe ')).toBe('sao tome e principe');
  });
});

describe('grade', () => {
  const choice: Question = { format: 'flagToNames', target: c('ke'), options: [c('ke'), c('ng'), c('gh'), c('eg')] };

  it('accepts the target in an option format', () => {
    expect(grade(choice, { kind: 'choice', iso2: 'ke' })).toEqual({ correct: true, missed: [] });
  });

  it('marks the target missed on a wrong option', () => {
    expect(grade(choice, { kind: 'choice', iso2: 'ng' })).toEqual({ correct: false, missed: [c('ke')] });
  });

  it('throws when the answer kind does not fit the format', () => {
    expect(() => grade(choice, { kind: 'yesNo', yes: true })).toThrow('Expected a choice answer');
  });

  describe('trueFalse', () => {
    const matching: Question = { format: 'trueFalse', target: c('ke'), shown: c('ke') };
    const mismatched: Question = { format: 'trueFalse', target: c('ke'), shown: c('ng') };

    it('is right to say yes to a matching name and no to a mismatched one', () => {
      expect(grade(matching, { kind: 'yesNo', yes: true }).correct).toBe(true);
      expect(grade(mismatched, { kind: 'yesNo', yes: false }).correct).toBe(true);
    });

    it('is wrong the other way round', () => {
      expect(grade(matching, { kind: 'yesNo', yes: false })).toEqual({ correct: false, missed: [c('ke')] });
      expect(grade(mismatched, { kind: 'yesNo', yes: true }).correct).toBe(false);
    });
  });

  describe('typeName', () => {
    const question = (code: string): Question => ({ format: 'typeName', target: c(code) });

    it.each([
      ['cd', '  república   democrática do congo '],
      ['cd', 'RDC'],
      ['cd', 'congo kinshasa'],
      ['st', 'SÃO TOMÉ E PRÍNCIPE'],
      ['gw', 'Guine Bissau'],
      ['bf', 'Burkina Faso'],
      ['sz', 'Suazilândia'],
    ])('accepts %s typed as "%s"', (code, text) => {
      expect(grade(question(code), { kind: 'text', text }).correct).toBe(true);
    });

    it('does not forgive a typo', () => {
      expect(grade(question('gm'), { kind: 'text', text: 'Gamba' })).toEqual({ correct: false, missed: [c('gm')] });
    });
  });

  describe('oddOneOut', () => {
    const question: Question = {
      format: 'oddOneOut',
      target: c('ke'),
      intruder: c('fr'),
      options: [c('ke'), c('ng'), c('fr'), c('gh')],
    };

    it('is right when the intruder is picked', () => {
      expect(grade(question, { kind: 'choice', iso2: 'fr' })).toEqual({ correct: true, missed: [] });
    });

    it('marks the picked African flag as missed', () => {
      expect(grade(question, { kind: 'choice', iso2: 'ng' })).toEqual({ correct: false, missed: [c('ng')] });
    });
  });

  describe('pairs', () => {
    const question: Question = { format: 'sortSimilar', target: c('ml'), countries: [c('ml'), c('gn'), c('sn')] };

    it('is right only when every name sits on its own flag', () => {
      expect(grade(question, { kind: 'links', links: { ml: 'ml', gn: 'gn', sn: 'sn' } }).correct).toBe(true);
    });

    it('marks only the wrongly linked countries as missed', () => {
      expect(grade(question, { kind: 'links', links: { ml: 'gn', gn: 'ml', sn: 'sn' } })).toEqual({
        correct: false,
        missed: [c('ml'), c('gn')],
      });
    });
  });
});
