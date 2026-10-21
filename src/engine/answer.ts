import type { Country } from '../data/countries';
import type { Question } from './question';

export type Answer =
  | { kind: 'choice'; iso2: string }
  | { kind: 'yesNo'; yes: boolean }
  | { kind: 'text'; text: string }
  | { kind: 'links'; links: Record<string, string> }
  | { kind: 'texts'; texts: Record<string, string> };

export interface Grade {
  correct: boolean;
  missed: Country[];
}

export function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function grade(question: Question, answer: Answer): Grade {
  switch (question.format) {
    case 'nameToFlags':
    case 'flagToNames':
    case 'flagToTwoNames':
    case 'crop':
    case 'mapToNames':
    case 'nameToMap':
      return targetGrade(expectKind(answer, 'choice').iso2 === question.target.iso2, question.target);
    case 'trueFalse':
    case 'mapTrueFalse':
      return targetGrade(expectKind(answer, 'yesNo').yes === (question.shown === question.target), question.target);
    case 'typeName':
    case 'mapTypeName':
      return targetGrade(acceptsTypedName(question.target, expectKind(answer, 'text').text), question.target);
    case 'oddOneOut': {
      const chosen = expectKind(answer, 'choice').iso2;
      if (chosen === question.intruder.iso2) return { correct: true, missed: [] };
      return { correct: false, missed: question.options.filter((c) => c.iso2 === chosen) };
    }
    case 'matchPairs':
    case 'mapPairs':
    case 'sortSimilar':
    case 'sortSimilarNames': {
      const { links } = expectKind(answer, 'links');
      const missed = question.countries.filter((c) => links[c.iso2] !== c.iso2);
      return { correct: missed.length === 0, missed };
    }
    case 'typeSimilar': {
      const { texts } = expectKind(answer, 'texts');
      const missed = question.countries.filter((c) => !acceptsTypedName(c, texts[c.iso2] ?? ''));
      return { correct: missed.length === 0, missed };
    }
  }
}

function targetGrade(correct: boolean, target: Country): Grade {
  return { correct, missed: correct ? [] : [target] };
}

export function acceptsTypedName(country: Country, text: string): boolean {
  return [country.name, ...country.aliases].map(normalizeName).includes(normalizeName(text));
}

function expectKind<K extends Answer['kind']>(answer: Answer, kind: K): Extract<Answer, { kind: K }> {
  if (answer.kind !== kind) throw new Error(`Expected a ${kind} answer, got ${answer.kind}`);
  return answer as Extract<Answer, { kind: K }>;
}
