# Learn Mode Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the operator's play-test feedback to Learn mode: disjoint levels plus Geral with longer rounds, two new recall formats, similar-first distractors, passes with missed-first repeats, no repeated similar groups, pairs linking in either order, no solution after a correct answer, visible white flags, keyboard shortcuts and extra aliases.

**Architecture:** Same layout as the first plan. Level rules live in `src/engine/pool.ts` next to `poolFor`; the round takes its goal and recall weight from them. New formats extend the `Question` union, `formats.ts`, `answer.ts` and the renderers. Shortcuts are data attributes on answer buttons, read by one keydown listener in the game screen.

**Tech Stack:** Vite, TypeScript (strict), Vitest, plain DOM, Node 24.

**Spec:** `docs/specs/2026-10-06-learn-mode-design.md` (updated 2026-10-06 with these adjustments)

## Global Constraints

- Code, identifiers, comments and commit messages in English; every string the player sees in Brazilian Portuguese.
- Levels: `easy` = tier 1, goal 12, recall weight 1, no similar distractors; `medium` = tier 2, goal 18, recall weight 2, no similar distractors; `hard` = tier 3, goal 25, recall weight 3, similar distractors; `general` = tiers 1–3, goal 30, recall weight 3, similar distractors. 3 lives everywhere. The code keeps the type name `Difficulty` for a level.
- Recall formats: `typeName`, `cropType`, `typeSimilar`.
- A question spends its target; `sortSimilar` and `typeSimilar` spend every country they show. A new pass starts when no candidate is left; in passes after the first, countries missed in the round come first while any is unspent.
- A correct answer shows only "Certo!" and "Continuar".
- Shortcuts: keys 1–6 on single-answer choice formats; ← / → (and 1 / 2) on two-option formats; none on typed and pairs formats; only keys matching `/^([1-6]|ArrowLeft|ArrowRight)$/` are handled.
- No linter exists in this repo. The gates are `npm run typecheck` and `npm test` (plus `npm run build` where a step says so); run them before every commit.
- Comments only for facts from outside the file; no docstrings.
- Tests live next to the file they test, named `<file>.test.ts`.
- The operator plays on a dev server on port 5173; never stop or restart it. Browser checks use their own server on port 5174.
- Commit as the agent, Conventional Commits, staging files by name:

```bash
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "<type>: <subject>" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

## Review Focus

1. **A long round on a small pool.** Difícil asks for 25 correct answers from 18 countries; the round must start new passes and never throw. Pinned in Task 3.
2. **The same similar group twice.** The bug the operator hit: Senegal and Camarões came back as a second sort-similar question. Pinned in Task 3.
3. **A digit typed into a text field.** Typing "1" in a type-the-name field must not pick an option. Guarded in Task 6 by ignoring events from inputs, checked in Task 7.
4. **Unlinking in pairs.** Tapping a linked flag first must free it without leaving a stale name on another flag. Checked in Task 7.
5. **A missing field in type-the-similar-flags.** An empty field must block submitting. Guarded by `required` in Task 2, checked in Task 7.

---

### Task 1: Disjoint levels, Geral and aliases

**Files:**
- Modify: `src/engine/pool.ts`, `src/engine/pool.test.ts`, `src/ui/labels.ts`, `src/data/countries.json`, `src/engine/answer.test.ts`, `src/engine/formats.test.ts`

**Interfaces:**
- Produces:

```ts
// src/engine/pool.ts
export type Difficulty = 'easy' | 'medium' | 'hard' | 'general';
export interface LevelRules { tiers: readonly Tier[]; correctToWin: number; recallWeight: number; similarDistractors: boolean }
export const LEVEL_RULES: Record<Difficulty, LevelRules>;
export function poolFor(all: readonly Country[], continent: Continent, difficulty: Difficulty): Country[];
// src/ui/labels.ts
export const DIFFICULTIES: readonly Difficulty[]; // ['easy', 'medium', 'hard', 'general']
export const DIFFICULTY_LABEL: Record<Difficulty, string>; // general: 'Geral'
```

- [ ] **Step 1: Rewrite `src/engine/pool.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { LEVEL_RULES, poolFor } from './pool';

describe('poolFor', () => {
  it.each([
    ['easy', 1],
    ['medium', 2],
    ['hard', 3],
  ] as const)('gives only tier %s countries on %s', (difficulty, tier) => {
    const pool = poolFor(countries, 'africa', difficulty);
    expect(pool).toHaveLength(18);
    expect(pool.every((c) => c.tier === tier)).toBe(true);
  });

  it('gives all 54 on general', () => {
    expect(poolFor(countries, 'africa', 'general')).toHaveLength(54);
  });

  it('is empty for a continent without tiers', () => {
    expect(poolFor(countries, 'europe', 'general')).toEqual([]);
  });
});

describe('LEVEL_RULES', () => {
  it('sets the goal per level', () => {
    expect([LEVEL_RULES.easy, LEVEL_RULES.medium, LEVEL_RULES.hard, LEVEL_RULES.general].map((r) => r.correctToWin)).toEqual([
      12, 18, 25, 30,
    ]);
  });
});
```

- [ ] **Step 2: Add alias cases to `src/engine/answer.test.ts`**

In the `it.each` table of `describe('typeName')`, append these rows after `['sz', 'Suazilândia'],`:

```ts
      ['bw', 'Botswana'],
      ['dj', 'Jibuti'],
      ['dj', 'Djibouti'],
      ['bj', 'Benim'],
      ['zw', 'Zimbabwe'],
      ['ls', 'Lesotho'],
      ['sc', 'Seychelles'],
      ['mu', 'ilhas mauricio'],
      ['km', 'Ilhas Comores'],
```

- [ ] **Step 3: Point the full-group tests in `src/engine/formats.test.ts` at `general`**

Replace `const hard = contextFor('hard');` with `const general = contextFor('general');`, change `contextFor`'s parameter type to `Difficulty` (import `type Difficulty` from `./pool`), and in `describe('sortSimilar')` replace the two uses of `hard` with `general`. The test names stay.

- [ ] **Step 4: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL on the pool tests (medium has 36, `LEVEL_RULES` missing) and on the new alias rows.

- [ ] **Step 5: Rewrite `src/engine/pool.ts`**

```ts
import type { Continent, Country, Tier } from '../data/countries';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'general';

export interface LevelRules {
  tiers: readonly Tier[];
  correctToWin: number;
  recallWeight: number;
  similarDistractors: boolean;
}

export const LEVEL_RULES: Record<Difficulty, LevelRules> = {
  easy: { tiers: [1], correctToWin: 12, recallWeight: 1, similarDistractors: false },
  medium: { tiers: [2], correctToWin: 18, recallWeight: 2, similarDistractors: false },
  hard: { tiers: [3], correctToWin: 25, recallWeight: 3, similarDistractors: true },
  general: { tiers: [1, 2, 3], correctToWin: 30, recallWeight: 3, similarDistractors: true },
};

export function poolFor(all: readonly Country[], continent: Continent, difficulty: Difficulty): Country[] {
  const { tiers } = LEVEL_RULES[difficulty];
  return all.filter((c) => c.continent === continent && c.tier !== undefined && tiers.includes(c.tier));
}
```

- [ ] **Step 6: Add Geral to `src/ui/labels.ts`**

```ts
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'general'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  general: 'Geral',
};
```

- [ ] **Step 7: Add the aliases to `src/data/countries.json`**

Run from the repo root:

```bash
node -e '
const fs = require("fs");
const path = "src/data/countries.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));
const extra = { bw: ["Botswana"], dj: ["Djibouti", "Jibuti"], bj: ["Benim"], zw: ["Zimbabwe"], ls: ["Lesotho"], sc: ["Seychelles"], mu: ["Ilhas Maurício"], km: ["Ilhas Comores"] };
for (const country of data) if (extra[country.iso2]) country.aliases = [...country.aliases, ...extra[country.iso2]];
fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
'
git diff --stat src/data/countries.json
```

Expected: one file changed, only the eight `aliases` arrays touched.

- [ ] **Step 8: Run the gates**

Run: `npm run typecheck && npm test`
Expected: clean; all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/engine/pool.ts src/engine/pool.test.ts src/ui/labels.ts src/data/countries.json src/engine/answer.test.ts src/engine/formats.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: make levels disjoint, add Geral and more accepted spellings" -m $'Each level now drills its own 18 flags; Geral covers all 54 with the longest round.\n\nNexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 2: Recall formats and similar-first distractors

**Files:**
- Modify: `src/engine/question.ts`, `src/engine/formats.ts`, `src/engine/formats.test.ts`, `src/engine/answer.ts`, `src/engine/answer.test.ts`, `src/engine/round.test.ts`, `src/ui/questions/typeName.ts`, `src/ui/questions/render.ts`, `src/ui/questions/feedback.ts`, `src/ui/screens/game.ts`, `src/style.css`
- Create: `src/ui/questions/typeSimilar.ts`

**Interfaces:**
- Consumes: `LEVEL_RULES`, `Difficulty` (Task 1).
- Produces:

```ts
// question.ts additions
| { format: 'cropType'; target: Country; crop: Crop }
| { format: 'typeSimilar'; target: Country; countries: Country[] }
export interface FormatContext { pool; world; similarGroups; similarDistractors: boolean }
export interface Format { id; recall: boolean; canTarget; build }
// formats.ts additions
export const cropType: Format; export const typeSimilar: Format; // ALL_FORMATS has 11 entries
// answer.ts addition
| { kind: 'texts'; texts: Record<string, string> } // country iso2 -> typed text
// typeName.ts
export function renderTypeName(prompt: string, figure: HTMLElement, submit: Submit): HTMLElement;
// typeSimilar.ts
export function renderTypeSimilar(countries: Country[], submit: Submit): HTMLElement;
```

- [ ] **Step 1: Extend the types in `src/engine/question.ts`**

Add the two union members after `sortSimilar`, `similarDistractors: boolean;` as the last field of `FormatContext`, and `recall: boolean;` after `id` in `Format`:

```ts
  | { format: 'sortSimilar'; target: Country; countries: Country[] }
  | { format: 'cropType'; target: Country; crop: Crop }
  | { format: 'typeSimilar'; target: Country; countries: Country[] };
```

- [ ] **Step 2: Rewrite `src/engine/formats.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { countries, similarGroups, type Country } from '../data/countries';
import {
  ALL_FORMATS,
  crop,
  cropType,
  flagToNames,
  flagToTwoNames,
  matchPairs,
  nameToFlags,
  oddOneOut,
  sortSimilar,
  trueFalse,
  typeSimilar,
} from './formats';
import { LEVEL_RULES, poolFor, type Difficulty } from './pool';
import type { Format, FormatContext, Question } from './question';
import { seededRng } from './rng';

const contextFor = (difficulty: Difficulty): FormatContext => ({
  pool: poolFor(countries, 'africa', difficulty),
  world: countries,
  similarGroups,
  similarDistractors: LEVEL_RULES[difficulty].similarDistractors,
});
const easy = contextFor('easy');
const general = contextFor('general');
const byIso = (code: string) => countries.find((c) => c.iso2 === code)!;
const iso = (list: Country[]) => list.map((c) => c.iso2);
const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

function buildMany(format: Format, ctx: FormatContext): Question[] {
  return SEEDS.map((seed) => format.build(ctx.pool[seed % ctx.pool.length], ctx, seededRng(seed)));
}

function expectOptionsAroundTarget(options: Country[], target: Country, pool: readonly Country[]) {
  expect(iso(options).filter((code) => code === target.iso2)).toHaveLength(1);
  expect(new Set(iso(options)).size).toBe(options.length);
  expect(options.every((c) => pool.includes(c))).toBe(true);
}

describe('option formats', () => {
  it.each([
    [nameToFlags, [4, 6]],
    [flagToNames, [4, 6]],
    [flagToTwoNames, [2]],
    [crop, [4]],
  ] as const)('%o builds distinct options that contain the target once', (format, sizes) => {
    for (const ctx of [easy, general]) {
      for (const question of buildMany(format, ctx)) {
        if (!('options' in question)) throw new Error('expected options');
        expect(sizes).toContain(question.options.length);
        expectOptionsAroundTarget(question.options, question.target, ctx.pool);
      }
    }
  });

  it('draws both 4 and 6 options across seeds', () => {
    const sizes = new Set(buildMany(nameToFlags, easy).map((q) => ('options' in q ? q.options.length : 0)));
    expect(sizes).toEqual(new Set([4, 6]));
  });

  it('puts every similar flag of the target among the options when the level asks for it', () => {
    for (const seed of SEEDS) {
      const question = flagToNames.build(byIso('ml'), general, seededRng(seed));
      if (question.format !== 'flagToNames') throw new Error('expected flagToNames');
      expect(iso(question.options)).toEqual(expect.arrayContaining(['ml', 'gn', 'sn', 'cm']));
    }
  });
});

describe('crop formats', () => {
  it.each([crop, cropType])('%o places the crop origin inside the flag', (format) => {
    for (const question of buildMany(format, easy)) {
      if (question.format !== 'crop' && question.format !== 'cropType') throw new Error('expected a crop');
      for (const value of [question.crop.originX, question.crop.originY]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('trueFalse', () => {
  it('shows a pool country and both matches and mismatches occur', () => {
    const questions = buildMany(trueFalse, easy);
    const matches = questions.filter((q) => q.format === 'trueFalse' && q.shown === q.target);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(questions.length);
    for (const q of questions) if (q.format === 'trueFalse') expect(easy.pool).toContain(q.shown);
  });

  it('shows a similar flag name on a mismatch when the level asks for it', () => {
    for (const seed of SEEDS) {
      const question = trueFalse.build(byIso('ml'), general, seededRng(seed));
      if (question.format !== 'trueFalse') throw new Error('expected trueFalse');
      expect(['ml', 'gn', 'sn', 'cm']).toContain(question.shown.iso2);
    }
  });
});

describe('matchPairs', () => {
  it('uses 4 distinct pool countries including the target', () => {
    for (const question of buildMany(matchPairs, easy)) {
      if (question.format !== 'matchPairs') throw new Error('expected matchPairs');
      expect(question.countries).toHaveLength(4);
      expectOptionsAroundTarget(question.countries, question.target, easy.pool);
    }
  });
});

describe('oddOneOut', () => {
  it('mixes the target, two pool countries and one intruder from another continent', () => {
    for (const question of buildMany(oddOneOut, easy)) {
      if (question.format !== 'oddOneOut') throw new Error('expected oddOneOut');
      expect(question.options).toHaveLength(4);
      expect(new Set(iso(question.options)).size).toBe(4);
      expect(question.options).toContain(question.target);
      expect(question.options).toContain(question.intruder);
      expect(question.intruder.continent).not.toBe('africa');
      expect(question.options.filter((c) => c.continent !== 'africa')).toEqual([question.intruder]);
    }
  });
});

describe.each([sortSimilar, typeSimilar])('%o', (format) => {
  it('targets only countries whose group has 2 or more members in the pool', () => {
    expect(format.canTarget(byIso('sn'), easy)).toBe(true);
    expect(format.canTarget(byIso('za'), easy)).toBe(false);
    expect(format.canTarget(byIso('ma'), general)).toBe(false);
  });

  it('uses only the group members inside the pool', () => {
    const question = format.build(byIso('sn'), easy, seededRng(1));
    if (question.format !== 'sortSimilar' && question.format !== 'typeSimilar') throw new Error('expected a group format');
    expect(iso(question.countries).sort()).toEqual(['cm', 'sn']);
  });

  it('uses the whole group when the pool has all of it', () => {
    const question = format.build(byIso('ml'), general, seededRng(1));
    if (question.format !== 'sortSimilar' && question.format !== 'typeSimilar') throw new Error('expected a group format');
    expect(iso(question.countries).sort()).toEqual(['cm', 'gn', 'ml', 'sn']);
  });
});

describe('ALL_FORMATS', () => {
  it('lists the eleven formats once each', () => {
    expect(ALL_FORMATS.map((f) => f.id).sort()).toEqual([
      'crop',
      'cropType',
      'flagToNames',
      'flagToTwoNames',
      'matchPairs',
      'nameToFlags',
      'oddOneOut',
      'sortSimilar',
      'trueFalse',
      'typeName',
      'typeSimilar',
    ]);
  });

  it('marks the three typing formats as recall', () => {
    expect(ALL_FORMATS.filter((f) => f.recall).map((f) => f.id).sort()).toEqual(['cropType', 'typeName', 'typeSimilar']);
  });
});
```

- [ ] **Step 3: Add the grading tests to `src/engine/answer.test.ts`**

Append inside `describe('grade')`:

```ts
  describe('cropType', () => {
    const question: Question = { format: 'cropType', target: c('cd'), crop: { originX: 10, originY: 90 } };

    it('accepts the name or an alias', () => {
      expect(grade(question, { kind: 'text', text: 'rdc' }).correct).toBe(true);
    });

    it('marks the target missed on a wrong name', () => {
      expect(grade(question, { kind: 'text', text: 'Congo' })).toEqual({ correct: false, missed: [c('cd')] });
    });
  });

  describe('typeSimilar', () => {
    const question: Question = { format: 'typeSimilar', target: c('ga'), countries: [c('ga'), c('sl')] };

    it('is right when every field names its flag', () => {
      expect(grade(question, { kind: 'texts', texts: { ga: 'gabao', sl: 'Serra Leoa' } }).correct).toBe(true);
    });

    it('marks only the wrongly named flags as missed', () => {
      expect(grade(question, { kind: 'texts', texts: { ga: 'Gabão', sl: 'Guiné' } })).toEqual({ correct: false, missed: [c('sl')] });
    });

    it('treats a missing field as wrong', () => {
      expect(grade(question, { kind: 'texts', texts: { ga: 'Gabão' } })).toEqual({ correct: false, missed: [c('sl')] });
    });
  });
```

- [ ] **Step 4: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL — `cropType` and `typeSimilar` are not exported, the similar-first tests fail, grade has no `cropType`/`typeSimilar` branch.

- [ ] **Step 5: Rewrite `src/engine/formats.ts`**

```ts
import type { Country } from '../data/countries';
import type { Crop, Format, FormatContext } from './question';
import { pickOne, sample, shuffle, type Rng } from './rng';

export const CROP_SCALE = Math.SQRT2;

function othersInPool(target: Country, ctx: FormatContext): Country[] {
  return ctx.pool.filter((c) => c.iso2 !== target.iso2);
}

function similarGroupsInPool(target: Country, ctx: FormatContext): Country[][] {
  const inPool = new Map(ctx.pool.map((c) => [c.iso2, c]));
  return ctx.similarGroups
    .filter((group) => group.includes(target.iso2))
    .map((group) => group.flatMap((code) => inPool.get(code) ?? []))
    .filter((members) => members.length >= 2);
}

function similarMatesInPool(target: Country, ctx: FormatContext): Country[] {
  if (!ctx.similarDistractors) return [];
  return [...new Set(similarGroupsInPool(target, ctx).flat())].filter((c) => c.iso2 !== target.iso2);
}

function optionsWith(target: Country, ctx: FormatContext, count: number, rng: Rng): Country[] {
  const preferred = shuffle(similarMatesInPool(target, ctx), rng).slice(0, count - 1);
  const rest = othersInPool(target, ctx).filter((c) => !preferred.includes(c));
  return shuffle([target, ...preferred, ...sample(rest, count - 1 - preferred.length, rng)], rng);
}

function randomCrop(rng: Rng): Crop {
  return { originX: rng() * 100, originY: rng() * 100 };
}

const always = () => true;
const hasSimilarGroup = (target: Country, ctx: FormatContext) => similarGroupsInPool(target, ctx).length > 0;
const similarGroup = (target: Country, ctx: FormatContext, rng: Rng) => shuffle(pickOne(similarGroupsInPool(target, ctx), rng), rng);

export const nameToFlags: Format = {
  id: 'nameToFlags',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'nameToFlags',
    target,
    options: optionsWith(target, ctx, pickOne([4, 6], rng), rng),
  }),
};

export const flagToNames: Format = {
  id: 'flagToNames',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'flagToNames',
    target,
    options: optionsWith(target, ctx, pickOne([4, 6], rng), rng),
  }),
};

export const flagToTwoNames: Format = {
  id: 'flagToTwoNames',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'flagToTwoNames', target, options: optionsWith(target, ctx, 2, rng) }),
};

export const crop: Format = {
  id: 'crop',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'crop', target, options: optionsWith(target, ctx, 4, rng), crop: randomCrop(rng) }),
};

export const trueFalse: Format = {
  id: 'trueFalse',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => {
    const mates = similarMatesInPool(target, ctx);
    const mismatch = () => pickOne(mates.length > 0 ? mates : othersInPool(target, ctx), rng);
    return { format: 'trueFalse', target, shown: rng() < 0.5 ? target : mismatch() };
  },
};

export const typeName: Format = {
  id: 'typeName',
  recall: true,
  canTarget: always,
  build: (target) => ({ format: 'typeName', target }),
};

export const matchPairs: Format = {
  id: 'matchPairs',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'matchPairs', target, countries: optionsWith(target, ctx, 4, rng) }),
};

export const oddOneOut: Format = {
  id: 'oddOneOut',
  recall: false,
  canTarget: always,
  build: (target, ctx, rng) => {
    const intruder = pickOne(ctx.world.filter((c) => c.continent !== target.continent), rng);
    const others = sample(othersInPool(target, ctx), 2, rng);
    return { format: 'oddOneOut', target, intruder, options: shuffle([target, ...others, intruder], rng) };
  },
};

export const sortSimilar: Format = {
  id: 'sortSimilar',
  recall: false,
  canTarget: hasSimilarGroup,
  build: (target, ctx, rng) => ({ format: 'sortSimilar', target, countries: similarGroup(target, ctx, rng) }),
};

export const cropType: Format = {
  id: 'cropType',
  recall: true,
  canTarget: always,
  build: (target, _ctx, rng) => ({ format: 'cropType', target, crop: randomCrop(rng) }),
};

export const typeSimilar: Format = {
  id: 'typeSimilar',
  recall: true,
  canTarget: hasSimilarGroup,
  build: (target, ctx, rng) => ({ format: 'typeSimilar', target, countries: similarGroup(target, ctx, rng) }),
};

export const ALL_FORMATS: readonly Format[] = [
  nameToFlags,
  flagToNames,
  flagToTwoNames,
  crop,
  trueFalse,
  typeName,
  matchPairs,
  oddOneOut,
  sortSimilar,
  cropType,
  typeSimilar,
];
```

- [ ] **Step 6: Extend `src/engine/answer.ts`**

Add `| { kind: 'texts'; texts: Record<string, string> }` as the last member of `Answer`. In `grade`, replace the `typeName` case with the two typed cases and add the group case after the pairs case:

```ts
    case 'typeName':
    case 'cropType':
      return targetGrade(acceptsTypedName(question.target, expectKind(answer, 'text').text), question.target);
```

```ts
    case 'typeSimilar': {
      const { texts } = expectKind(answer, 'texts');
      const missed = question.countries.filter((c) => !acceptsTypedName(c, texts[c.iso2] ?? ''));
      return { correct: missed.length === 0, missed };
    }
```

- [ ] **Step 7: Keep the round tests compiling**

In `src/engine/round.test.ts`, add `similarDistractors: false` to the `easy` context object, and extend both helpers:

```ts
    case 'typeName':
    case 'cropType':
      return { kind: 'text', text: q.target.name };
    case 'typeSimilar':
      return { kind: 'texts', texts: Object.fromEntries(q.countries.map((c) => [c.iso2, c.name])) };
```

in `rightAnswer` (replacing its `typeName` case), and in `wrongAnswer` (replacing its `typeName` case):

```ts
    case 'typeName':
    case 'cropType':
      return { kind: 'text', text: 'nenhum país' };
    case 'typeSimilar':
      return { kind: 'texts', texts: {} };
```

- [ ] **Step 8: Run the engine tests**

Run: `npm test`
Expected: all tests pass. (`npm run typecheck` still fails on the UI until Step 12.)

- [ ] **Step 9: Make `renderTypeName` take its prompt and figure**

`src/ui/questions/typeName.ts`:

```ts
import { el } from '../dom';
import type { Submit } from './render';

export function renderTypeName(prompt: string, figure: HTMLElement, submit: Submit): HTMLElement {
  const input = el('input', {
    type: 'text',
    required: true,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    placeholder: 'Nome do país',
  });
  const form = el('form', { className: 'type-form' }, [input, el('button', { className: 'primary', type: 'submit' }, ['Responder'])]);
  form.onsubmit = (event) => {
    event.preventDefault();
    submit({ kind: 'text', text: input.value });
  };
  queueMicrotask(() => input.focus());
  return el('div', { className: 'question' }, [el('h2', {}, [prompt]), figure, form]);
}
```

- [ ] **Step 10: Create `src/ui/questions/typeSimilar.ts`**

```ts
import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagImg } from '../flag';
import type { Submit } from './render';

export function renderTypeSimilar(countries: Country[], submit: Submit): HTMLElement {
  const fields = countries.map((country) => ({
    country,
    input: el('input', {
      type: 'text',
      required: true,
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: false,
      placeholder: 'Nome do país',
    }),
  }));
  const form = el('form', { className: 'type-form' }, [
    el('div', { className: 'type-grid' }, fields.map(({ country, input }) => el('label', { className: 'type-item' }, [flagImg(country), input]))),
    el('button', { className: 'primary', type: 'submit' }, ['Responder']),
  ]);
  form.onsubmit = (event) => {
    event.preventDefault();
    submit({ kind: 'texts', texts: Object.fromEntries(fields.map(({ country, input }) => [country.iso2, input.value])) });
  };
  queueMicrotask(() => fields[0].input.focus());
  return el('div', { className: 'question' }, [el('h2', {}, ['Bandeiras parecidas: escreva o nome de cada uma']), form]);
}
```

- [ ] **Step 11: Wire the renderers and the solution**

In `src/ui/questions/render.ts` import `renderTypeSimilar` and replace the `typeName` case:

```ts
    case 'typeName':
      return renderTypeName('Escreva o nome do país desta bandeira', flagFigure(question.target), submit);
    case 'cropType':
      return renderTypeName('Escreva o nome do país deste pedaço de bandeira', cropFigure(question.target, question.crop), submit);
    case 'typeSimilar':
      return renderTypeSimilar(question.countries, submit);
```

In `src/ui/questions/feedback.ts`, add `case 'typeSimilar':` to the `matchPairs`/`sortSimilar` group in `solution()`.

- [ ] **Step 12: Pass the level's distractor rule from the game screen**

In `src/ui/screens/game.ts`, import `LEVEL_RULES` from `../../engine/pool` and build the context as:

```ts
    {
      pool: poolFor(countries, continent, difficulty),
      world: countries,
      similarGroups,
      similarDistractors: LEVEL_RULES[difficulty].similarDistractors,
    },
```

- [ ] **Step 13: Style the type grid**

Append to `src/style.css`:

```css
.type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.type-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.type-item .flag { height: 80px; }
```

- [ ] **Step 14: Run the gates**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

- [ ] **Step 15: Commit**

```bash
git add src/engine/question.ts src/engine/formats.ts src/engine/formats.test.ts src/engine/answer.ts src/engine/answer.test.ts src/engine/round.test.ts src/ui/questions/typeName.ts src/ui/questions/typeSimilar.ts src/ui/questions/render.ts src/ui/questions/feedback.ts src/ui/screens/game.ts src/style.css
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: add crop-to-type and type-the-similar-flags formats with similar-first distractors" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 3: Round goal, recall weighting, passes and spent groups

**Files:**
- Modify: `src/engine/rng.ts`, `src/engine/rng.test.ts`, `src/engine/round.ts`, `src/engine/round.test.ts`, `src/ui/screens/game.ts`, `src/ui/screens/result.ts`

**Interfaces:**
- Consumes: `LEVEL_RULES` (Task 1), `Format.recall`, the eleven formats (Task 2).
- Produces:

```ts
// rng.ts
export function pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number, rng: Rng): T;
// round.ts
export const STARTING_LIVES = 3;
export interface RoundSettings { correctToWin: number; recallWeight: number }
export class Round {
  constructor(ctx: FormatContext, settings: RoundSettings, rng: Rng, formats?: readonly Format[]);
  get correctToWin(): number;
  // lives, correct, missed, status, nextQuestion, answer as before
}
```

`CORRECT_TO_WIN` is removed; the goal comes from the settings.

- [ ] **Step 1: Add the weighted-pick tests to `src/engine/rng.test.ts`**

Add `pickWeighted` to the import and append:

```ts
describe('pickWeighted', () => {
  it('follows the weights', () => {
    const rng = seededRng(21);
    let heavy = 0;
    for (let i = 0; i < 4000; i++) if (pickWeighted(['light', 'heavy'], (item) => (item === 'heavy' ? 3 : 1), rng) === 'heavy') heavy++;
    expect(heavy / 4000).toBeGreaterThan(0.7);
    expect(heavy / 4000).toBeLessThan(0.8);
  });

  it('never picks an item of weight zero', () => {
    const rng = seededRng(22);
    for (let i = 0; i < 500; i++) expect(pickWeighted(['a', 'b'], (item) => (item === 'a' ? 0 : 1), rng)).toBe('b');
  });

  it('throws when no item has weight', () => {
    expect(() => pickWeighted(['a'], () => 0, seededRng(1))).toThrow('no positive weight');
  });
});
```

- [ ] **Step 2: Rewrite `src/engine/round.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { countries, similarGroups } from '../data/countries';
import type { Answer } from './answer';
import { flagToNames, sortSimilar, typeName } from './formats';
import { poolFor } from './pool';
import type { FormatContext, Question } from './question';
import { seededRng } from './rng';
import { Round, STARTING_LIVES, type RoundSettings } from './round';

const easy: FormatContext = { pool: poolFor(countries, 'africa', 'easy'), world: countries, similarGroups, similarDistractors: false };
const settings = (correctToWin: number, recallWeight = 1): RoundSettings => ({ correctToWin, recallWeight });

function rightAnswer(q: Question): Answer {
  switch (q.format) {
    case 'trueFalse':
      return { kind: 'yesNo', yes: q.shown === q.target };
    case 'typeName':
    case 'cropType':
      return { kind: 'text', text: q.target.name };
    case 'typeSimilar':
      return { kind: 'texts', texts: Object.fromEntries(q.countries.map((c) => [c.iso2, c.name])) };
    case 'oddOneOut':
      return { kind: 'choice', iso2: q.intruder.iso2 };
    case 'matchPairs':
    case 'sortSimilar':
      return { kind: 'links', links: Object.fromEntries(q.countries.map((c) => [c.iso2, c.iso2])) };
    default:
      return { kind: 'choice', iso2: q.target.iso2 };
  }
}

function wrongAnswer(q: Question): Answer {
  switch (q.format) {
    case 'trueFalse':
      return { kind: 'yesNo', yes: q.shown !== q.target };
    case 'typeName':
    case 'cropType':
      return { kind: 'text', text: 'nenhum país' };
    case 'typeSimilar':
      return { kind: 'texts', texts: {} };
    case 'oddOneOut':
      return { kind: 'choice', iso2: q.target.iso2 };
    case 'matchPairs':
    case 'sortSimilar': {
      const [first, second] = q.countries;
      return { kind: 'links', links: { [first.iso2]: second.iso2, [second.iso2]: first.iso2 } };
    }
    default:
      return { kind: 'choice', iso2: q.options.find((c) => c !== q.target)!.iso2 };
  }
}

const shown = (q: Question) => ('countries' in q ? q.countries.map((c) => c.iso2) : [q.target.iso2]);

describe('Round', () => {
  it('starts with 3 lives, no correct answers and the level goal', () => {
    const round = new Round(easy, settings(12), seededRng(1));
    expect([round.lives, round.correct, round.status, round.correctToWin]).toEqual([STARTING_LIVES, 0, 'playing', 12]);
  });

  it('is won at the goal and then refuses new questions', () => {
    const round = new Round(easy, settings(5), seededRng(2));
    for (let i = 0; i < 5; i++) round.answer(rightAnswer(round.nextQuestion()));
    expect(round.status).toBe('won');
    expect(() => round.nextQuestion()).toThrow('Round is won');
  });

  it('is lost after 3 wrong answers and remembers what was missed', () => {
    const round = new Round(easy, settings(12), seededRng(3));
    for (let i = 0; i < STARTING_LIVES; i++) round.answer(wrongAnswer(round.nextQuestion()));
    expect(round.status).toBe('lost');
    expect(round.missed.length).toBeGreaterThan(0);
  });

  it('asks every country once before any repeats', () => {
    const round = new Round(easy, settings(100), seededRng(4), [typeName, flagToNames]);
    const targets = Array.from({ length: 18 }, () => {
      const question = round.nextQuestion();
      round.answer(rightAnswer(question));
      return question.target.iso2;
    });
    expect(new Set(targets).size).toBe(18);
    expect(() => round.answer(rightAnswer(round.nextQuestion()))).not.toThrow();
  });

  it('starts the next pass with the countries missed in the round', () => {
    const round = new Round(easy, settings(100), seededRng(5), [typeName]);
    const first = round.nextQuestion();
    round.answer(wrongAnswer(first));
    for (let i = 0; i < 17; i++) round.answer(rightAnswer(round.nextQuestion()));
    expect(round.nextQuestion().target).toBe(first.target);
  });

  it('does not bring a similar group back through another member in the same pass', () => {
    for (const seed of [6, 7, 8, 9, 10]) {
      const round = new Round(easy, settings(100), seededRng(seed), [sortSimilar]);
      const first = round.nextQuestion();
      round.answer(rightAnswer(first));
      const second = round.nextQuestion();
      expect(shown(second).filter((code) => shown(first).includes(code))).toEqual([]);
    }
  });

  it('plays a 25-answer round on an 18-country pool with every format', () => {
    for (const seed of [11, 12, 13]) {
      const round = new Round(easy, settings(25, 3), seededRng(seed));
      while (round.status === 'playing') round.answer(rightAnswer(round.nextQuestion()));
      expect(round.status).toBe('won');
    }
  });

  it('draws recall formats more often with a higher recall weight', () => {
    let recall = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const round = new Round(easy, settings(12, 3), seededRng(seed), [typeName, flagToNames]);
      if (round.nextQuestion().format === 'typeName') recall++;
    }
    expect(recall / 400).toBeGreaterThan(0.65);
    expect(recall / 400).toBeLessThan(0.85);
  });

  it('refuses a second answer to the same question', () => {
    const round = new Round(easy, settings(12), seededRng(14));
    const question = round.nextQuestion();
    round.answer(wrongAnswer(question));
    expect(() => round.answer(wrongAnswer(question))).toThrow('No question to answer');
    expect(round.lives).toBe(STARTING_LIVES - 1);
  });

  it('refuses a new question before the current one is answered', () => {
    const round = new Round(easy, settings(12), seededRng(15));
    round.nextQuestion();
    expect(() => round.nextQuestion()).toThrow('not answered');
  });

  it('does not list the same missed country twice', () => {
    const round = new Round(easy, settings(12), seededRng(16));
    for (let i = 0; i < STARTING_LIVES; i++) round.answer(wrongAnswer(round.nextQuestion()));
    const codes = round.missed.map((c) => c.iso2);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
```

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL — `pickWeighted`, `RoundSettings` and `correctToWin` do not exist.

- [ ] **Step 4: Add `pickWeighted` to `src/engine/rng.ts`**

```ts
export function pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number, rng: Rng): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  if (total <= 0) throw new Error('pickWeighted: no positive weight');
  let point = rng() * total;
  for (const item of items) {
    point -= weightOf(item);
    if (point < 0) return item;
  }
  return items.filter((item) => weightOf(item) > 0).at(-1)!;
}
```

The final line only runs when floating-point rounding leaves `point` at exactly 0 after the loop.

- [ ] **Step 5: Rewrite `src/engine/round.ts`**

```ts
import type { Country } from '../data/countries';
import { grade, type Answer, type Grade } from './answer';
import { ALL_FORMATS } from './formats';
import type { Format, FormatContext, Question } from './question';
import { pickOne, pickWeighted, type Rng } from './rng';

export const STARTING_LIVES = 3;

export interface RoundSettings {
  correctToWin: number;
  recallWeight: number;
}

export type RoundStatus = 'playing' | 'won' | 'lost';

function spentBy(question: Question): Country[] {
  return question.format === 'sortSimilar' || question.format === 'typeSimilar' ? question.countries : [question.target];
}

export class Round {
  lives = STARTING_LIVES;
  correct = 0;
  readonly missed: Country[] = [];
  private readonly spent = new Set<string>();
  private pass = 1;
  private current: Question | null = null;

  constructor(
    private readonly ctx: FormatContext,
    private readonly settings: RoundSettings,
    private readonly rng: Rng,
    private readonly formats: readonly Format[] = ALL_FORMATS,
  ) {}

  get correctToWin(): number {
    return this.settings.correctToWin;
  }

  get status(): RoundStatus {
    if (this.correct >= this.settings.correctToWin) return 'won';
    if (this.lives <= 0) return 'lost';
    return 'playing';
  }

  nextQuestion(): Question {
    if (this.status !== 'playing') throw new Error(`Round is ${this.status}`);
    if (this.current) throw new Error('Current question not answered yet');
    let candidates = this.candidates();
    if (!this.formats.some((format) => candidates.some((c) => format.canTarget(c, this.ctx)))) {
      this.spent.clear();
      this.pass++;
      candidates = this.candidates();
    }
    const eligible = this.formats.filter((format) => candidates.some((c) => format.canTarget(c, this.ctx)));
    const format = pickWeighted(eligible, (f) => (f.recall ? this.settings.recallWeight : 1), this.rng);
    const target = pickOne(candidates.filter((c) => format.canTarget(c, this.ctx)), this.rng);
    this.current = format.build(target, this.ctx, this.rng);
    for (const country of spentBy(this.current)) this.spent.add(country.iso2);
    return this.current;
  }

  answer(answer: Answer): Grade {
    if (!this.current) throw new Error('No question to answer');
    const result = grade(this.current, answer);
    this.current = null;
    if (result.correct) {
      this.correct++;
    } else {
      this.lives--;
      for (const country of result.missed) if (!this.missed.includes(country)) this.missed.push(country);
    }
    return result;
  }

  private candidates(): Country[] {
    const unspent = this.ctx.pool.filter((c) => !this.spent.has(c.iso2));
    if (this.pass === 1) return unspent;
    const missedFirst = unspent.filter((c) => this.missed.includes(c));
    return missedFirst.length > 0 ? missedFirst : unspent;
  }
}
```

- [ ] **Step 6: Use the level rules in the game and result screens**

`src/ui/screens/game.ts`: replace the `CORRECT_TO_WIN` import with nothing new from `round` beyond `Round, STARTING_LIVES`; construct the round with the rules as settings and show the goal from the round:

```ts
  const rules = LEVEL_RULES[difficulty];
  const round = new Round(
    {
      pool: poolFor(countries, continent, difficulty),
      world: countries,
      similarGroups,
      similarDistractors: rules.similarDistractors,
    },
    rules,
    Math.random,
  );
```

```ts
      el('span', {}, [`${round.correct}/${round.correctToWin}`]),
```

`src/ui/screens/result.ts`: replace `import { CORRECT_TO_WIN } from '../../engine/round';` with `import { LEVEL_RULES } from '../../engine/pool';` and the heading with:

```ts
      el('h1', {}, [won ? '🏅 Medalha conquistada!' : `Você fez ${correct} de ${LEVEL_RULES[difficulty].correctToWin}`]),
```

- [ ] **Step 7: Run the gates**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add src/engine/rng.ts src/engine/rng.test.ts src/engine/round.ts src/engine/round.test.ts src/ui/screens/game.ts src/ui/screens/result.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: size rounds per level, weight recall formats and repeat missed flags in later passes" -m $'Group formats now spend their whole group, so the same similar flags no longer come back twice in one pass.\n\nNexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 4: Level screen, quiet correct feedback and visible white flags

**Files:**
- Modify: `src/ui/screens/difficulty.ts`, `src/ui/questions/feedback.ts`, `src/style.css`

**Interfaces:**
- Consumes: `LEVEL_RULES`, `DIFFICULTIES` with `general` (Task 1).

No unit tests (UI); gates are typecheck, the suite and build.

- [ ] **Step 1: Show the goal on the level screen**

In `src/ui/screens/difficulty.ts`, import `LEVEL_RULES` with `poolFor` and replace the detail span's children with:

```ts
          el('span', { className: 'detail' }, [
            `${poolFor(countries, continent, difficulty).length} países · ${LEVEL_RULES[difficulty].correctToWin} acertos`,
            hasMedal(medals, continent, difficulty) ? ' · 🏅' : '',
          ]),
```

- [ ] **Step 2: Drop the solution after a correct answer**

In `src/ui/questions/feedback.ts`, `renderFeedback` becomes:

```ts
export function renderFeedback(question: Question, result: Grade, onContinue: () => void): HTMLElement {
  return el('section', { className: `feedback ${result.correct ? 'right' : 'wrong'}` }, [
    el('p', { className: 'verdict' }, [result.correct ? 'Certo!' : 'Errado']),
    ...(result.correct ? [] : [solution(question)]),
    el('button', { className: 'primary', onclick: onContinue }, ['Continuar']),
  ]);
}
```

- [ ] **Step 3: Draw an edge around every flag**

In `src/style.css`:
- add `--flag-edge: rgba(0, 0, 0, 0.28);` to the light `:root` tokens and `--flag-edge: rgba(255, 255, 255, 0.3);` to the dark ones;
- replace the `.flag` rule with:

```css
.flag {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  margin: auto;
  box-shadow: 0 0 0 1px var(--flag-edge);
}
```

- add `display: flex;` to the `.figure` rule;
- replace `.crop-frame .flag { height: auto; }` with `.crop-frame .flag { width: 100%; max-height: none; box-shadow: none; }`;
- replace `.flag-option .flag, .pair-flag .flag { height: 90px; }` with `.flag-option .flag, .pair-flag .flag { max-height: 90px; }`;
- replace `.solution-card .flag { height: 80px; }` with `.solution-card .flag { max-height: 80px; margin: 0; }`;
- replace `.type-item .flag { height: 80px; }` with `.type-item .flag { max-height: 80px; }`.

- [ ] **Step 4: Add a way out of a round**

In `src/ui/screens/game.ts`, add an exit button above the HUD; it abandons the round without a medal:

```ts
  const exit = el('button', { className: 'link', onclick: () => navigate({ name: 'difficulty', continent }) }, ['Sair']);
  root.append(el('main', { className: 'screen' }, [exit, hud, stage]));
```

(replacing the existing `root.append(el('main', { className: 'screen' }, [hud, stage]));`).

- [ ] **Step 5: Run the gates and look at it**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

Start `npx vite --host --port 5174 --strictPort` in the background, open África in the browser and confirm: a "Sair" link above the hearts returns to the level screen; four levels with "18 países · 12 acertos", "18 países · 18 acertos", "18 países · 25 acertos", "54 países · 30 acertos"; on light theme, Serra Leoa, Costa do Marfim and Níger show a visible edge in the option grid and in the large figure; a correct answer shows only "Certo!" and "Continuar". Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/difficulty.ts src/ui/questions/feedback.ts src/ui/screens/game.ts src/style.css
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: show level goals, skip the solution after a right answer and outline flags" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 5: Pairs linking in either order

**Files:**
- Modify: `src/ui/questions/pairs.ts`, `src/style.css`

- [ ] **Step 1: Rewrite `src/ui/questions/pairs.ts`**

```ts
import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagImg } from '../flag';
import type { Submit } from './render';

type Selection = { side: 'name' | 'flag'; iso2: string } | null;

export function renderPairs(prompt: string, countries: Country[], submit: Submit): HTMLElement {
  const names = [...countries].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const links: Record<string, string> = {};
  let selected: Selection = null;
  const container = el('div', { className: 'question' });

  const nameOnFlag = (flagIso: string) => countries.find((c) => links[c.iso2] === flagIso);
  const isSelected = (side: 'name' | 'flag', iso2: string) => selected?.side === side && selected.iso2 === iso2;

  const link = (nameIso: string, flagIso: string) => {
    const previous = nameOnFlag(flagIso);
    if (previous) delete links[previous.iso2];
    links[nameIso] = flagIso;
    selected = null;
  };

  const tapName = (nameIso: string) => {
    if (selected?.side === 'flag') {
      link(nameIso, selected.iso2);
    } else {
      delete links[nameIso];
      selected = isSelected('name', nameIso) ? null : { side: 'name', iso2: nameIso };
    }
    draw();
  };

  const tapFlag = (flagIso: string) => {
    if (selected?.side === 'name') {
      link(selected.iso2, flagIso);
    } else {
      const linked = nameOnFlag(flagIso);
      if (linked) delete links[linked.iso2];
      selected = isSelected('flag', flagIso) ? null : { side: 'flag', iso2: flagIso };
    }
    draw();
  };

  const classes = (base: string, side: 'name' | 'flag', iso2: string, linked: boolean) =>
    [base, isSelected(side, iso2) ? 'selected' : '', linked ? 'linked' : ''].filter(Boolean).join(' ');

  const draw = () => {
    container.replaceChildren(
      el('h2', {}, [prompt]),
      el(
        'div',
        { className: 'pair-flags' },
        countries.map((flag) => {
          const name = nameOnFlag(flag.iso2);
          return el('button', { className: classes('pair-flag', 'flag', flag.iso2, Boolean(name)), onclick: () => tapFlag(flag.iso2) }, [
            flagImg(flag),
            el('span', { className: 'pair-label' }, [name?.name ?? '—']),
          ]);
        }),
      ),
      el(
        'div',
        { className: 'name-list' },
        names.map((country) =>
          el(
            'button',
            { className: classes('name-option', 'name', country.iso2, Boolean(links[country.iso2])), onclick: () => tapName(country.iso2) },
            [country.name],
          ),
        ),
      ),
      el(
        'button',
        {
          className: 'primary',
          disabled: Object.keys(links).length < countries.length,
          onclick: () => submit({ kind: 'links', links: { ...links } }),
        },
        ['Conferir'],
      ),
    );
  };

  draw();
  return container;
}
```

- [ ] **Step 2: Make the selection obvious in `src/style.css`**

- add `--selected-bg: #e3f1ea;` to the light tokens and `--selected-bg: #1d3a2e;` to the dark ones;
- replace `.chosen, .selected { border-color: var(--selected); }` with:

```css
.chosen { border-color: var(--selected); }

.selected {
  border-color: var(--accent);
  background: var(--selected-bg);
  box-shadow: 0 0 0 2px var(--accent);
}
```

- replace `.linked { opacity: 0.5; }` with:

```css
.name-option.linked { opacity: 0.5; }
.pair-flag.linked { border-color: var(--accent); }
```

- replace the `.pair-label` rule with `.pair-label { color: var(--text); font-weight: 600; font-size: 0.95rem; min-height: 1.3em; }`.

- [ ] **Step 3: Run the gates and play it**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

On a server on port 5174, find a match-pairs or sort-similar question and confirm: name → flag links; flag → name links; the selected item is clearly highlighted; tapping a linked flag frees it and selects it, and its old name loses the dimmed state; tapping a selected item again clears the selection; "Conferir" enables only when all are linked. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/ui/questions/pairs.ts src/style.css
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: link pairs starting from either side with a clear selection" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 6: Keyboard shortcuts

**Files:**
- Create: `src/ui/questions/keys.ts`
- Modify: `src/ui/questions/choices.ts`, `src/ui/questions/trueFalse.ts`, `src/ui/screens/game.ts`, `src/style.css`

**Interfaces:**
- Produces:

```ts
export function bindKeys(button: HTMLButtonElement, index: number, optionCount: number): HTMLButtonElement;
export function pressShortcut(question: HTMLElement, event: KeyboardEvent): void;
```

- [ ] **Step 1: Create `src/ui/questions/keys.ts`**

```ts
const SHORTCUT = /^([1-6]|ArrowLeft|ArrowRight)$/;

export function bindKeys(button: HTMLButtonElement, index: number, optionCount: number): HTMLButtonElement {
  const keys = [String(index + 1)];
  if (optionCount === 2) keys.push(index === 0 ? 'ArrowLeft' : 'ArrowRight');
  button.dataset.keys = keys.join(' ');
  button.dataset.hint = String(index + 1);
  return button;
}

export function pressShortcut(question: HTMLElement, event: KeyboardEvent): void {
  if (question.inert || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLInputElement || !SHORTCUT.test(event.key)) return;
  const button = question.querySelector<HTMLButtonElement>(`[data-keys~="${event.key}"]`);
  if (!button) return;
  event.preventDefault();
  button.click();
}
```

- [ ] **Step 2: Bind the option buttons**

In `src/ui/questions/choices.ts`, import `bindKeys` from `./keys`, and in both `renderFlagChoices` and `renderNameChoices` change `options.map((country) =>` to `options.map((country, index) =>` and wrap the `el('button', …)` call: `bindKeys(el('button', { … }, [ … ]), index, options.length)`.

In `src/ui/questions/trueFalse.ts`, import `bindKeys` and wrap the two buttons: `bindKeys(el('button', … ['Sim']), 0, 2)` and `bindKeys(el('button', … ['Não']), 1, 2)`.

- [ ] **Step 3: Listen in the game screen**

In `src/ui/screens/game.ts`, import `pressShortcut` from `../questions/keys` and `type Screen` from `../navigation`. Keep the current question element in a variable the listener can read, register the listener once, and route both ways out of the round (the "Sair" button and `finish`) through one `leave` function that removes it:

```ts
  let currentQuestion: HTMLElement | null = null;
  const onKey = (event: KeyboardEvent) => {
    if (currentQuestion) pressShortcut(currentQuestion, event);
  };
  document.addEventListener('keydown', onKey);
```

```ts
  const leave = (screen: Screen) => {
    document.removeEventListener('keydown', onKey);
    navigate(screen);
  };
```

The "Sair" button calls `leave({ name: 'difficulty', continent })`, and `finish` calls `leave({ name: 'result', … })` instead of `navigate`. In `ask`, after `const questionEl = renderQuestion(…)`, add `currentQuestion = questionEl;`.

- [ ] **Step 4: Show the key hints on devices with a mouse**

Append to `src/style.css`:

```css
[data-hint] { position: relative; }

[data-hint]::after {
  content: attr(data-hint);
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 0.75rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

@media (hover: none) {
  [data-hint]::after { content: none; }
}
```

- [ ] **Step 5: Run the gates and try the keys**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

On a server on port 5174: on a 4- or 6-option question, keys 1–6 pick the matching option and the numbers show in the corners; on "flag → 2 names" and "true or false", ← and → pick the first and second answers; on a typing question, typing "1" puts "1" in the field and picks nothing; after answering, Enter continues; pressing a digit while the feedback panel shows does nothing. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/ui/questions/keys.ts src/ui/questions/choices.ts src/ui/questions/trueFalse.ts src/ui/screens/game.ts src/style.css
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: answer choice questions from the keyboard" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 7: Browser verification and README

**Files:**
- Modify: `README.md`, plus whatever the checks show broken (fix in the owning file, with an engine test when the defect is in `src/engine/`, each fix in its own `fix:` commit)

- [ ] **Step 1: Play every adjustment**

Start `npx vite --host --port 5174 --strictPort` in the background and, with the Playwright browser tools:
- each of the four levels starts and shows its goal in the HUD ("0/12", "0/18", "0/25", "0/30");
- play Difícil to 25 correct answers (answers may be read from the DOM via evaluate to go fast, but each of the eleven formats is answered at least once by real clicks or typing across the session) and confirm the round never errors and the medal appears on the level screen;
- "Escreva o nome do país deste pedaço de bandeira" and "Bandeiras parecidas: escreva o nome de cada uma" render; an empty field blocks submitting; a wrong field shows the solution;
- on Geral, a flag-choice question for a country with similar flags shows its look-alikes among the options;
- the Review Focus items in the plan header: typing a digit into a field, unlinking a linked flag in pairs;
- screenshots at 390px and 1280px wide and in dark mode, saved under the SDD workspace.

Stop the server.

- [ ] **Step 2: Update `README.md`**

Replace the first paragraph under `# Bandeiras` with:

```markdown
A study app for world flags. Learn mode drills one continent at a time in four levels — Fácil, Médio and Difícil with 18 flags each and Geral with all of them — using eleven question formats, 3 lives per round and a goal of 12, 18, 25 or 30 correct answers to earn a medal. Choice questions can be answered with the keys 1–6, and two-option questions with ← and →. Africa is the only continent with data so far.
```

- [ ] **Step 3: Run the gates and commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

```bash
git add README.md
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "docs: describe levels, formats and shortcuts in the README" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```
