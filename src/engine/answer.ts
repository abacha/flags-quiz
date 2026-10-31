import { capitalsExcluded, capitalsOf } from '../data/capitals';
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
  typos: Country[];
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
    case 'countryToCapitals':
    case 'capitalToCountries':
      return targetGrade(expectKind(answer, 'choice').iso2 === question.target.iso2, question.target);
    case 'trueFalse':
    case 'mapTrueFalse':
    case 'capitalTrueFalse':
      return targetGrade(expectKind(answer, 'yesNo').yes === (question.shown === question.target), question.target);
    case 'typeName':
    case 'mapTypeName':
    case 'typeCapital':
    case 'typeCapitalCountry': {
      const judge = question.format === 'typeCapital' ? judgeTypedCapital : judgeTypedName;
      const verdict = judge(question.target, expectKind(answer, 'text').text);
      if (verdict === 'typo') return { correct: false, missed: [], typos: [question.target] };
      return targetGrade(verdict === 'right', question.target);
    }
    case 'oddOneOut': {
      const chosen = expectKind(answer, 'choice').iso2;
      if (chosen === question.intruder.iso2) return { correct: true, missed: [], typos: [] };
      return { correct: false, missed: question.options.filter((c) => c.iso2 === chosen), typos: [] };
    }
    case 'matchPairs':
    case 'mapPairs':
    case 'capitalPairs':
    case 'sortSimilar':
    case 'sortSimilarNames': {
      const { links } = expectKind(answer, 'links');
      const missed = question.countries.filter((c) => links[c.iso2] !== c.iso2);
      return { correct: missed.length === 0, missed, typos: [] };
    }
    case 'typeSimilar': {
      const { texts } = expectKind(answer, 'texts');
      const verdicts = question.countries.map((c) => ({ country: c, verdict: judgeTypedName(c, texts[c.iso2] ?? '') }));
      const missed = verdicts.filter(({ verdict }) => verdict === 'wrong').map(({ country }) => country);
      if (missed.length > 0) return { correct: false, missed, typos: [] };
      const typos = verdicts.filter(({ verdict }) => verdict === 'typo').map(({ country }) => country);
      return { correct: typos.length === 0, missed: [], typos };
    }
  }
}

function targetGrade(correct: boolean, target: Country): Grade {
  return { correct, missed: correct ? [] : [target], typos: [] };
}

export function acceptsTypedName(country: Country, text: string): boolean {
  return [country.name, ...country.aliases].map(normalizeName).includes(normalizeName(text));
}

const typedNames = new Map(countries.map((c) => [c, [c.name, ...c.aliases].map(normalizeName)]));
const typedCapitals = new Map(
  countries.filter((c) => !capitalsExcluded.includes(c.iso2)).map((c) => [c, capitalsOf(c).flatMap((capital) => [capital.name, ...capital.aliases]).map(normalizeName)]),
);

export function judgeTypedName(country: Country, text: string): TypedVerdict {
  return judgeTyped(country, text, typedNames);
}

export function judgeTypedCapital(country: Country, text: string): TypedVerdict {
  const typed = normalizeName(text);
  if (typedCapitals.get(country)!.includes(typed)) return 'right';
  // Naming the country is a knowledge error, not a slip.
  if ([...typedNames.values()].some((names) => names.includes(typed))) return 'wrong';
  return judgeTyped(country, text, typedCapitals);
}

function judgeTyped(target: Country, text: string, names: Map<Country, string[]>): TypedVerdict {
  const typed = normalizeName(text);
  if (names.get(target)!.includes(typed)) return 'right';
  const others = [...names.keys()].filter((c) => c !== target);
  if (others.some((c) => names.get(c)!.includes(typed))) return 'wrong';
  const reach = (name: string) => (name.length <= SHORT_NAME_LENGTH ? 1 : 2);
  const distance = Math.min(
    ...names.get(target)!.map((name) => {
      const edits = editDistance(typed, name);
      return edits <= reach(name) ? edits : Infinity;
    }),
  );
  const closestOther = Math.min(...others.flatMap((c) => names.get(c)!.map((name) => editDistance(typed, name))));
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
