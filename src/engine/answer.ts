import { countries, type Country } from '../data/countries';
import type { Question } from './question';

export type Answer =
  | { kind: 'choice'; iso2: string }
  | { kind: 'yesNo'; yes: boolean }
  | { kind: 'text'; text: string }
  | { kind: 'links'; links: Record<string, string> }
  | { kind: 'texts'; texts: Record<string, string> };

export type TypedVerdict = 'right' | 'typo' | 'wrong';

const SHORT_NAME_LENGTH = 5;

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

const typedNames = new Map(countries.map((c) => [c, [c.name, ...c.aliases].map(normalizeName)]));

export function judgeTypedName(country: Country, text: string): TypedVerdict {
  if (acceptsTypedName(country, text)) return 'right';
  const typed = normalizeName(text);
  const others = countries.filter((c) => c !== country);
  if (others.some((c) => typedNames.get(c)!.includes(typed))) return 'wrong';
  const reach = (name: string) => (name.length <= SHORT_NAME_LENGTH ? 1 : 2);
  const distance = Math.min(
    ...typedNames.get(country)!.map((name) => {
      const edits = editDistance(typed, name);
      return edits <= reach(name) ? edits : Infinity;
    }),
  );
  const closestOther = Math.min(...others.flatMap((c) => typedNames.get(c)!.map((name) => editDistance(typed, name))));
  return distance < closestOther ? 'typo' : 'wrong';
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function expectKind<K extends Answer['kind']>(answer: Answer, kind: K): Extract<Answer, { kind: K }> {
  if (answer.kind !== kind) throw new Error(`Expected a ${kind} answer, got ${answer.kind}`);
  return answer as Extract<Answer, { kind: K }>;
}
