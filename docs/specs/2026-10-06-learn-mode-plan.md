# Learn Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Learn mode of a flag study web app: Africa, three cumulative difficulties, nine question formats, rounds of 3 lives and 10 correct answers, medals saved in the browser.

**Architecture:** A static Vite + TypeScript site with no UI framework. A DOM-free engine (`src/engine/`) builds questions from plain data and grades answers; thin DOM renderers (`src/ui/`) display them. Country data and flag SVGs are committed files generated once by a throwaway script.

**Tech Stack:** Vite, TypeScript (strict), Vitest, plain DOM, Node 24.

**Spec:** `docs/specs/2026-10-06-learn-mode-design.md`

## Global Constraints

- Code, identifiers, comments and commit messages in English; every string the player sees in Brazilian Portuguese.
- Africa = the 54 UN member states; tiers of exactly 18 each; difficulty pools are cumulative (easy = tier 1, medium = tiers 1–2, hard = tiers 1–3).
- Round: `STARTING_LIVES = 3`, `CORRECT_TO_WIN = 10`; a country is the target of at most one question per round.
- Every format is one question: one life lost when wrong, one correct answer when right.
- Formats 1 (`nameToFlags`) and 2 (`flagToNames`) draw 4 or 6 options; `flagToTwoNames` has 2; `crop`, `matchPairs` and `oddOneOut` have 4; `sortSimilar` uses the 2–4 members of a similar-flag group that are in the pool.
- Type-the-name: no autocomplete; normalization = lowercase, accents stripped, hyphens to spaces, whitespace collapsed and trimmed; aliases accepted; typos rejected.
- Crop scale is `Math.SQRT2` (half the flag's area visible).
- Medals in `localStorage` under the key `flags-quiz:medals`, shape `continent → difficulty → true`.
- No linter exists in this repo. The gates are `npm run typecheck` and `npm test`; run both before every commit.
- Comments only for facts from outside the file; no docstrings.
- Tests live next to the file they test, named `<file>.test.ts`.
- Throwaway scripts live in the session scratchpad and are never committed.
- Commit as the agent, Conventional Commits, staging files by name:

```bash
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "<type>: <subject>" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

The repo has no remote; there is nothing to push.

## Review Focus

1. **A round running out of countries.** The easy pool has 18 countries and a lost round can take 12 questions (9 correct + 3 wrong); every question must still find an unused target. Pinned in Task 5.
2. **A double tap on an answer.** Two clicks before the feedback panel appears must not cost two lives. The engine throws on a second answer (Task 5) and the game screen marks the question `inert` on the first submit (Task 8).
3. **Typed answers with stray spacing, case, accents or hyphens.** "  rdc ", "Congo-Kinshasa", "SÃO TOMÉ E PRÍNCIPE" are right; "Gamba" for Gâmbia is wrong. Pinned in Task 4.
4. **The correct option appearing twice, or a distractor equal to the target.** Pinned by the per-format invariants in Task 3.
5. **A crop that shows only one plain colour.** Checked in the browser against Gabão and Serra Leoa at the four extreme origins in Task 9.

---

## File Structure

```
index.html                     page shell, mounts #app
package.json, tsconfig.json, vite.config.ts, .gitignore
README.md                      how to run and test
public/flags/<iso2>.svg        194 committed flag files
src/
  main.ts                      screen routing
  style.css                    all styles, light and dark tokens
  data/
    countries.json             committed source of truth
    similar-groups.json        committed similar-flag groups
    countries.ts               types and typed exports of both JSON files
  engine/
    rng.ts                     seedable random source and list helpers
    pool.ts                    Difficulty type, countries for a continent and difficulty
    question.ts                Question, Format, FormatContext types
    formats.ts                 the nine formats and ALL_FORMATS
    answer.ts                  Answer type, normalizeName, grade
    round.ts                   Round state machine
  progress.ts                  medal persistence
  ui/
    dom.ts                     el() element builder
    labels.ts                  Portuguese labels for continents and difficulties
    flag.ts                    flagImg()
    navigation.ts              Screen and Navigate types
    screens/home.ts, continent.ts, difficulty.ts, game.ts, result.ts
    questions/choices.ts       flag grid and name list renderers, crop figure
    questions/trueFalse.ts
    questions/typeName.ts
    questions/pairs.ts         matchPairs and sortSimilar renderer
    questions/feedback.ts      feedback panel and solution cards
    questions/render.ts        renderQuestion(): picks the renderer per format
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts`, `src/style.css`, `src/engine/rng.ts`
- Test: `src/engine/rng.test.ts`

**Interfaces:**
- Produces: `type Rng = () => number`; `seededRng(seed: number): Rng`; `pickOne<T>(items: readonly T[], rng: Rng): T`; `shuffle<T>(items: readonly T[], rng: Rng): T[]`; `sample<T>(items: readonly T[], count: number, rng: Rng): T[]`.

- [ ] **Step 1: Create the package and install tooling**

```bash
cd /home/abacha/projects/lab/flags_quiz
npm init -y
npm pkg set name=flags-quiz private=true type=module
npm pkg delete main
npm pkg set scripts.dev="vite --host" scripts.build="tsc && vite build" scripts.preview="vite preview --host" scripts.test="vitest run" scripts.typecheck="tsc"
npm install -D vite typescript vitest @types/node
```

- [ ] **Step 2: Write config and shell files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node' },
});
```

`index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bandeiras</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`.gitignore`:

```
node_modules/
dist/
coverage/
```

`src/main.ts` (replaced in Task 7):

```ts
import './style.css';
```

`src/style.css`: empty file (filled in Task 7).

- [ ] **Step 3: Write the failing RNG tests**

`src/engine/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pickOne, sample, seededRng, shuffle } from './rng';

describe('seededRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('returns values in [0, 1)', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('pickOne', () => {
  it('returns an element of the list', () => {
    expect(['a', 'b', 'c']).toContain(pickOne(['a', 'b', 'c'], seededRng(1)));
  });

  it('throws on an empty list', () => {
    expect(() => pickOne([], seededRng(1))).toThrow('empty');
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const result = shuffle(input, seededRng(3));
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...result].sort()).toEqual(input);
  });
});

describe('sample', () => {
  it('returns the requested number of distinct elements', () => {
    const result = sample([1, 2, 3, 4, 5, 6], 4, seededRng(5));
    expect(result).toHaveLength(4);
    expect(new Set(result).size).toBe(4);
  });

  it('throws when asked for more elements than exist', () => {
    expect(() => sample([1, 2], 3, seededRng(5))).toThrow('asked 3 of 2');
  });
});
```

- [ ] **Step 4: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL, cannot resolve `./rng`.

- [ ] **Step 5: Implement `src/engine/rng.ts`**

```ts
export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('pickOne: empty list');
  return items[Math.floor(rng() * items.length)];
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  if (count > items.length) throw new Error(`sample: asked ${count} of ${items.length}`);
  return shuffle(items, rng).slice(0, count);
}
```

- [ ] **Step 6: Run the gates**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; 7 tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore src/main.ts src/style.css src/engine/rng.ts src/engine/rng.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "chore: scaffold Vite + TypeScript project with seedable RNG" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 2: Country data, flags and difficulty pools

**Files:**
- Create: `src/data/countries.json`, `src/data/similar-groups.json`, `public/flags/*.svg` (all generated), `src/data/countries.ts`, `src/engine/pool.ts`
- Test: `src/data/countries.test.ts`, `src/engine/pool.test.ts`
- Throwaway (scratchpad, not committed): `build-data.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
// src/data/countries.ts
export type Continent = 'africa' | 'americas' | 'asia' | 'europe' | 'oceania';
export type Tier = 1 | 2 | 3;
export interface Country { iso2: string; name: string; continent: Continent; tier?: Tier; aliases: string[] }
export const countries: Country[];
export const similarGroups: string[][];
// src/engine/pool.ts
export type Difficulty = 'easy' | 'medium' | 'hard';
export function poolFor(all: readonly Country[], continent: Continent, difficulty: Difficulty): Country[];
```

- [ ] **Step 1: Write the data tests first**

`src/data/countries.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { countries, similarGroups } from './countries';

const african = countries.filter((c) => c.continent === 'africa');
const byIso = new Map(countries.map((c) => [c.iso2, c]));

describe('countries', () => {
  it('has the 54 African UN member states', () => {
    expect(african).toHaveLength(54);
  });

  it('splits Africa into three tiers of 18', () => {
    for (const tier of [1, 2, 3]) {
      expect(african.filter((c) => c.tier === tier)).toHaveLength(18);
    }
  });

  it('gives a tier only to African countries', () => {
    expect(countries.filter((c) => c.continent !== 'africa' && c.tier !== undefined)).toEqual([]);
  });

  it('has unique codes and unique names', () => {
    expect(new Set(countries.map((c) => c.iso2)).size).toBe(countries.length);
    expect(new Set(countries.map((c) => c.name)).size).toBe(countries.length);
  });

  it('has a flag file for every country', () => {
    const missing = countries.filter(
      (c) => !existsSync(new URL(`../../public/flags/${c.iso2}.svg`, import.meta.url)),
    );
    expect(missing.map((c) => c.iso2)).toEqual([]);
  });

  it('carries the hand-corrected names', () => {
    expect(byIso.get('cd')?.name).toBe('República Democrática do Congo');
    expect(byIso.get('mm')?.name).toBe('Mianmar');
  });
});

describe('similarGroups', () => {
  it('groups 2 to 4 existing African countries', () => {
    for (const group of similarGroups) {
      expect(group.length).toBeGreaterThanOrEqual(2);
      expect(group.length).toBeLessThanOrEqual(4);
      for (const iso2 of group) expect(byIso.get(iso2)?.continent).toBe('africa');
    }
  });
});
```

`src/engine/pool.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { poolFor } from './pool';

describe('poolFor', () => {
  it('gives tier 1 on easy', () => {
    const pool = poolFor(countries, 'africa', 'easy');
    expect(pool).toHaveLength(18);
    expect(pool.every((c) => c.tier === 1)).toBe(true);
  });

  it('adds tier 2 on medium', () => {
    expect(poolFor(countries, 'africa', 'medium')).toHaveLength(36);
  });

  it('gives all 54 on hard', () => {
    expect(poolFor(countries, 'africa', 'hard')).toHaveLength(54);
  });

  it('is empty for a continent without tiers', () => {
    expect(poolFor(countries, 'europe', 'hard')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL, cannot resolve `./countries` and `./pool`.

- [ ] **Step 3: Write and run the throwaway data script**

Save as `<scratchpad>/build-data.mjs` and run it from the repo root with `node <scratchpad>/build-data.mjs`.

```js
import { mkdir, writeFile } from 'node:fs/promises';

const TIERS = {
  1: 'za eg ma ng ke et gh dz tn mz ao ug tz so zw sn cm mg',
  2: 'ly sd ss ci ml gn rw bw na zm mw ls sz cv er bf cd sc',
  3: 'bj bi td km dj ga gm gw gq lr mr mu ne cf cg st sl tg',
};
const NAME_FIXES = { cd: 'República Democrática do Congo', mm: 'Mianmar' };
const ALIASES = {
  cd: ['RDC', 'Congo-Kinshasa'],
  cg: ['Congo', 'Congo-Brazzaville'],
  cf: ['RCA'],
  bf: ['Burkina Faso'],
  mw: ['Malawi'],
  sz: ['Suazilândia', 'Eswatini'],
};
const SIMILAR_GROUPS = [
  ['ml', 'gn', 'sn', 'cm'],
  ['ci', 'ne'],
  ['eg', 'sd'],
  ['gh', 'et', 'bf'],
  ['gw', 'bj', 'tg'],
  ['tz', 'cg', 'na', 'cd'],
  ['ke', 'ss', 'mw'],
  ['ga', 'sl'],
  ['dj', 'er'],
  ['st', 'gq'],
];

async function fetchWithTimeout(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

const tierOf = Object.fromEntries(
  Object.entries(TIERS).flatMap(([tier, codes]) => codes.split(' ').map((iso2) => [iso2, Number(tier)])),
);
const displayNames = new Intl.DisplayNames('pt-BR', { type: 'region' });
const source = await (await fetchWithTimeout('https://raw.githubusercontent.com/mledoze/countries/master/countries.json')).json();

const countries = source
  .filter((c) => c.unMember)
  .map((c) => {
    const iso2 = c.cca2.toLowerCase();
    const continent = c.region.toLowerCase();
    const entry = { iso2, name: NAME_FIXES[iso2] ?? displayNames.of(c.cca2), continent };
    if (continent === 'africa') entry.tier = tierOf[iso2];
    entry.aliases = ALIASES[iso2] ?? [];
    return entry;
  })
  .sort((a, b) => a.iso2.localeCompare(b.iso2));

const untiered = countries.filter((c) => c.continent === 'africa' && c.tier === undefined);
if (untiered.length > 0) throw new Error(`African countries without tier: ${untiered.map((c) => c.iso2)}`);

await writeFile('src/data/countries.json', JSON.stringify(countries, null, 2) + '\n');
await writeFile('src/data/similar-groups.json', JSON.stringify(SIMILAR_GROUPS, null, 2) + '\n');

await mkdir('public/flags', { recursive: true });
for (const { iso2 } of countries) {
  const svg = await (await fetchWithTimeout(`https://flagcdn.com/${iso2}.svg`)).text();
  await writeFile(`public/flags/${iso2}.svg`, svg);
}
console.log(`wrote ${countries.length} countries and flags`);
```

Expected output: `wrote 194 countries and flags`.

- [ ] **Step 4: Implement `src/data/countries.ts`**

```ts
import countriesJson from './countries.json';
import similarGroupsJson from './similar-groups.json';

export type Continent = 'africa' | 'americas' | 'asia' | 'europe' | 'oceania';
export type Tier = 1 | 2 | 3;

export interface Country {
  iso2: string;
  name: string;
  continent: Continent;
  tier?: Tier;
  aliases: string[];
}

export const countries = countriesJson as Country[];
export const similarGroups: string[][] = similarGroupsJson;
```

- [ ] **Step 5: Implement `src/engine/pool.ts`**

```ts
import type { Continent, Country, Tier } from '../data/countries';

export type Difficulty = 'easy' | 'medium' | 'hard';

const HIGHEST_TIER: Record<Difficulty, Tier> = { easy: 1, medium: 2, hard: 3 };

export function poolFor(all: readonly Country[], continent: Continent, difficulty: Difficulty): Country[] {
  return all.filter(
    (c) => c.continent === continent && c.tier !== undefined && c.tier <= HIGHEST_TIER[difficulty],
  );
}
```

- [ ] **Step 6: Run the gates**

Run: `npm run typecheck && npm test`
Expected: all tests pass. If the unique-names test fails, read which names collide and fix them in `countries.json`.

- [ ] **Step 7: Delete the throwaway script and commit**

```bash
rm <scratchpad>/build-data.mjs
git add src/data/countries.json src/data/similar-groups.json src/data/countries.ts src/data/countries.test.ts src/engine/pool.ts src/engine/pool.test.ts public/flags
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: add country data, flags and difficulty pools" -m $'Names come from Intl pt-BR with two hand fixes; continents from the mledoze/countries dataset; flags from flagcdn.\n\nNexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 3: Question model and the nine formats

**Files:**
- Create: `src/engine/question.ts`, `src/engine/formats.ts`
- Test: `src/engine/formats.test.ts`

**Interfaces:**
- Consumes: `Country` (Task 2), `Rng`, `pickOne`, `shuffle`, `sample` (Task 1), `poolFor` (Task 2, tests only).
- Produces:

```ts
// src/engine/question.ts
export interface Crop { originX: number; originY: number } // percent, 0–100
export type Question =
  | { format: 'nameToFlags'; target: Country; options: Country[] }
  | { format: 'flagToNames'; target: Country; options: Country[] }
  | { format: 'flagToTwoNames'; target: Country; options: Country[] }
  | { format: 'crop'; target: Country; options: Country[]; crop: Crop }
  | { format: 'trueFalse'; target: Country; shown: Country }
  | { format: 'typeName'; target: Country }
  | { format: 'matchPairs'; target: Country; countries: Country[] }
  | { format: 'oddOneOut'; target: Country; intruder: Country; options: Country[] }
  | { format: 'sortSimilar'; target: Country; countries: Country[] };
export type FormatId = Question['format'];
export interface FormatContext { pool: readonly Country[]; world: readonly Country[]; similarGroups: readonly (readonly string[])[] }
export interface Format { id: FormatId; canTarget(target: Country, ctx: FormatContext): boolean; build(target: Country, ctx: FormatContext, rng: Rng): Question }
// src/engine/formats.ts
export const CROP_SCALE: number; // Math.SQRT2
export const ALL_FORMATS: readonly Format[];
export const nameToFlags, flagToNames, flagToTwoNames, crop, trueFalse, typeName, matchPairs, oddOneOut, sortSimilar: Format;
```

- [ ] **Step 1: Write `src/engine/question.ts`** (types only, nothing to test on its own)

```ts
import type { Country } from '../data/countries';
import type { Rng } from './rng';

export interface Crop {
  originX: number;
  originY: number;
}

export type Question =
  | { format: 'nameToFlags'; target: Country; options: Country[] }
  | { format: 'flagToNames'; target: Country; options: Country[] }
  | { format: 'flagToTwoNames'; target: Country; options: Country[] }
  | { format: 'crop'; target: Country; options: Country[]; crop: Crop }
  | { format: 'trueFalse'; target: Country; shown: Country }
  | { format: 'typeName'; target: Country }
  | { format: 'matchPairs'; target: Country; countries: Country[] }
  | { format: 'oddOneOut'; target: Country; intruder: Country; options: Country[] }
  | { format: 'sortSimilar'; target: Country; countries: Country[] };

export type FormatId = Question['format'];

export interface FormatContext {
  pool: readonly Country[];
  world: readonly Country[];
  similarGroups: readonly (readonly string[])[];
}

export interface Format {
  id: FormatId;
  canTarget(target: Country, ctx: FormatContext): boolean;
  build(target: Country, ctx: FormatContext, rng: Rng): Question;
}
```

- [ ] **Step 2: Write the failing format tests**

`src/engine/formats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countries, similarGroups, type Country } from '../data/countries';
import {
  ALL_FORMATS,
  crop,
  flagToNames,
  flagToTwoNames,
  matchPairs,
  nameToFlags,
  oddOneOut,
  sortSimilar,
  trueFalse,
} from './formats';
import { poolFor } from './pool';
import type { Format, FormatContext, Question } from './question';
import { seededRng } from './rng';

const contextFor = (difficulty: 'easy' | 'medium' | 'hard'): FormatContext => ({
  pool: poolFor(countries, 'africa', difficulty),
  world: countries,
  similarGroups,
});
const easy = contextFor('easy');
const hard = contextFor('hard');
const iso = (list: Country[]) => list.map((c) => c.iso2);
const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

function buildMany(format: Format, ctx: FormatContext): Question[] {
  return SEEDS.map((seed) => {
    const rng = seededRng(seed);
    return format.build(ctx.pool[seed % ctx.pool.length], ctx, rng);
  });
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
    for (const question of buildMany(format, easy)) {
      if (!('options' in question)) throw new Error('expected options');
      expect(sizes).toContain(question.options.length);
      expectOptionsAroundTarget(question.options, question.target, easy.pool);
    }
  });

  it('draws both 4 and 6 options across seeds', () => {
    const sizes = new Set(buildMany(nameToFlags, easy).map((q) => ('options' in q ? q.options.length : 0)));
    expect(sizes).toEqual(new Set([4, 6]));
  });
});

describe('crop', () => {
  it('places the crop origin inside the flag', () => {
    for (const question of buildMany(crop, easy)) {
      if (question.format !== 'crop') throw new Error('expected crop');
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

describe('sortSimilar', () => {
  const byIso = (code: string) => countries.find((c) => c.iso2 === code)!;

  it('targets only countries whose group has 2 or more members in the pool', () => {
    expect(sortSimilar.canTarget(byIso('sn'), easy)).toBe(true);
    expect(sortSimilar.canTarget(byIso('za'), easy)).toBe(false);
    expect(sortSimilar.canTarget(byIso('ma'), hard)).toBe(false);
  });

  it('uses only the group members inside the pool', () => {
    const question = sortSimilar.build(byIso('sn'), easy, seededRng(1));
    if (question.format !== 'sortSimilar') throw new Error('expected sortSimilar');
    expect(iso(question.countries).sort()).toEqual(['cm', 'sn']);
  });

  it('uses the whole group when the pool has all of it', () => {
    const question = sortSimilar.build(byIso('ml'), hard, seededRng(1));
    if (question.format !== 'sortSimilar') throw new Error('expected sortSimilar');
    expect(iso(question.countries).sort()).toEqual(['cm', 'gn', 'ml', 'sn']);
  });
});

describe('ALL_FORMATS', () => {
  it('lists the nine formats once each', () => {
    expect(ALL_FORMATS.map((f) => f.id).sort()).toEqual(
      ['crop', 'flagToNames', 'flagToTwoNames', 'matchPairs', 'nameToFlags', 'oddOneOut', 'sortSimilar', 'trueFalse', 'typeName'],
    );
  });
});
```

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npm test -- src/engine/formats.test.ts`
Expected: FAIL, cannot resolve `./formats`.

- [ ] **Step 4: Implement `src/engine/formats.ts`**

```ts
import type { Country } from '../data/countries';
import type { Format, FormatContext } from './question';
import { pickOne, sample, shuffle, type Rng } from './rng';

export const CROP_SCALE = Math.SQRT2;

function othersInPool(target: Country, ctx: FormatContext): Country[] {
  return ctx.pool.filter((c) => c.iso2 !== target.iso2);
}

function optionsWith(target: Country, ctx: FormatContext, count: number, rng: Rng): Country[] {
  return shuffle([target, ...sample(othersInPool(target, ctx), count - 1, rng)], rng);
}

function similarGroupsInPool(target: Country, ctx: FormatContext): Country[][] {
  const inPool = new Map(ctx.pool.map((c) => [c.iso2, c]));
  return ctx.similarGroups
    .filter((group) => group.includes(target.iso2))
    .map((group) => group.flatMap((code) => inPool.get(code) ?? []))
    .filter((members) => members.length >= 2);
}

const always = () => true;

export const nameToFlags: Format = {
  id: 'nameToFlags',
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'nameToFlags',
    target,
    options: optionsWith(target, ctx, pickOne([4, 6], rng), rng),
  }),
};

export const flagToNames: Format = {
  id: 'flagToNames',
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'flagToNames',
    target,
    options: optionsWith(target, ctx, pickOne([4, 6], rng), rng),
  }),
};

export const flagToTwoNames: Format = {
  id: 'flagToTwoNames',
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'flagToTwoNames', target, options: optionsWith(target, ctx, 2, rng) }),
};

export const crop: Format = {
  id: 'crop',
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'crop',
    target,
    options: optionsWith(target, ctx, 4, rng),
    crop: { originX: rng() * 100, originY: rng() * 100 },
  }),
};

export const trueFalse: Format = {
  id: 'trueFalse',
  canTarget: always,
  build: (target, ctx, rng) => ({
    format: 'trueFalse',
    target,
    shown: rng() < 0.5 ? target : pickOne(othersInPool(target, ctx), rng),
  }),
};

export const typeName: Format = {
  id: 'typeName',
  canTarget: always,
  build: (target) => ({ format: 'typeName', target }),
};

export const matchPairs: Format = {
  id: 'matchPairs',
  canTarget: always,
  build: (target, ctx, rng) => ({ format: 'matchPairs', target, countries: optionsWith(target, ctx, 4, rng) }),
};

export const oddOneOut: Format = {
  id: 'oddOneOut',
  canTarget: always,
  build: (target, ctx, rng) => {
    const intruder = pickOne(ctx.world.filter((c) => c.continent !== target.continent), rng);
    const others = sample(othersInPool(target, ctx), 2, rng);
    return { format: 'oddOneOut', target, intruder, options: shuffle([target, ...others, intruder], rng) };
  },
};

export const sortSimilar: Format = {
  id: 'sortSimilar',
  canTarget: (target, ctx) => similarGroupsInPool(target, ctx).length > 0,
  build: (target, ctx, rng) => ({
    format: 'sortSimilar',
    target,
    countries: shuffle(pickOne(similarGroupsInPool(target, ctx), rng), rng),
  }),
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
];
```

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/question.ts src/engine/formats.ts src/engine/formats.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: add question model and the nine Learn formats" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 4: Grading answers

**Files:**
- Create: `src/engine/answer.ts`
- Test: `src/engine/answer.test.ts`

**Interfaces:**
- Consumes: `Question` (Task 3), `Country` (Task 2).
- Produces:

```ts
export type Answer =
  | { kind: 'choice'; iso2: string }
  | { kind: 'yesNo'; yes: boolean }
  | { kind: 'text'; text: string }
  | { kind: 'links'; links: Record<string, string> }; // name iso2 -> flag iso2
export interface Grade { correct: boolean; missed: Country[] }
export function normalizeName(text: string): string;
export function grade(question: Question, answer: Answer): Grade;
```

Missed rules: option formats, `trueFalse` and `typeName` → the target; `oddOneOut` → the African flag the player picked; pairs formats → the countries linked wrong.

- [ ] **Step 1: Write the failing tests**

`src/engine/answer.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- src/engine/answer.test.ts`
Expected: FAIL, cannot resolve `./answer`.

- [ ] **Step 3: Implement `src/engine/answer.ts`**

```ts
import type { Country } from '../data/countries';
import type { Question } from './question';

export type Answer =
  | { kind: 'choice'; iso2: string }
  | { kind: 'yesNo'; yes: boolean }
  | { kind: 'text'; text: string }
  | { kind: 'links'; links: Record<string, string> };

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
      return targetGrade(expectKind(answer, 'choice').iso2 === question.target.iso2, question.target);
    case 'trueFalse':
      return targetGrade(expectKind(answer, 'yesNo').yes === (question.shown === question.target), question.target);
    case 'typeName':
      return targetGrade(acceptsTypedName(question.target, expectKind(answer, 'text').text), question.target);
    case 'oddOneOut': {
      const chosen = expectKind(answer, 'choice').iso2;
      if (chosen === question.intruder.iso2) return { correct: true, missed: [] };
      return { correct: false, missed: question.options.filter((c) => c.iso2 === chosen) };
    }
    case 'matchPairs':
    case 'sortSimilar': {
      const { links } = expectKind(answer, 'links');
      const missed = question.countries.filter((c) => links[c.iso2] !== c.iso2);
      return { correct: missed.length === 0, missed };
    }
  }
}

function targetGrade(correct: boolean, target: Country): Grade {
  return { correct, missed: correct ? [] : [target] };
}

function acceptsTypedName(country: Country, text: string): boolean {
  return [country.name, ...country.aliases].map(normalizeName).includes(normalizeName(text));
}

function expectKind<K extends Answer['kind']>(answer: Answer, kind: K): Extract<Answer, { kind: K }> {
  if (answer.kind !== kind) throw new Error(`Expected a ${kind} answer, got ${answer.kind}`);
  return answer as Extract<Answer, { kind: K }>;
}
```

- [ ] **Step 4: Run the gates**

Run: `npm run typecheck && npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/answer.ts src/engine/answer.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: grade answers for every format, with name normalization and aliases" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 5: Round rules

**Files:**
- Create: `src/engine/round.ts`
- Test: `src/engine/round.test.ts`

**Interfaces:**
- Consumes: `FormatContext`, `Format`, `Question` (Task 3); `ALL_FORMATS`, `sortSimilar` (Task 3); `Answer`, `Grade`, `grade` (Task 4); `Rng`, `pickOne` (Task 1).
- Produces:

```ts
export const STARTING_LIVES = 3;
export const CORRECT_TO_WIN = 10;
export type RoundStatus = 'playing' | 'won' | 'lost';
export class Round {
  constructor(ctx: FormatContext, rng: Rng, formats?: readonly Format[]);
  lives: number;
  correct: number;
  readonly missed: Country[];
  get status(): RoundStatus;
  nextQuestion(): Question;   // throws when the round is over or the current question is unanswered
  answer(answer: Answer): Grade; // throws when there is no question to answer
}
```

- [ ] **Step 1: Write the failing tests**

`src/engine/round.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countries, similarGroups } from '../data/countries';
import type { Answer } from './answer';
import { sortSimilar } from './formats';
import { poolFor } from './pool';
import type { FormatContext, Question } from './question';
import { seededRng } from './rng';
import { CORRECT_TO_WIN, Round, STARTING_LIVES } from './round';

const easy: FormatContext = { pool: poolFor(countries, 'africa', 'easy'), world: countries, similarGroups };

function rightAnswer(q: Question): Answer {
  switch (q.format) {
    case 'trueFalse':
      return { kind: 'yesNo', yes: q.shown === q.target };
    case 'typeName':
      return { kind: 'text', text: q.target.name };
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
      return { kind: 'text', text: 'nenhum país' };
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

describe('Round', () => {
  it('starts with 3 lives and no correct answers', () => {
    const round = new Round(easy, seededRng(1));
    expect([round.lives, round.correct, round.status]).toEqual([STARTING_LIVES, 0, 'playing']);
  });

  it('is won after 10 correct answers and then refuses new questions', () => {
    const round = new Round(easy, seededRng(2));
    for (let i = 0; i < CORRECT_TO_WIN; i++) round.answer(rightAnswer(round.nextQuestion()));
    expect(round.status).toBe('won');
    expect(() => round.nextQuestion()).toThrow('Round is won');
  });

  it('is lost after 3 wrong answers and remembers what was missed', () => {
    const round = new Round(easy, seededRng(3));
    for (let i = 0; i < STARTING_LIVES; i++) round.answer(wrongAnswer(round.nextQuestion()));
    expect(round.status).toBe('lost');
    expect(round.missed.length).toBeGreaterThanOrEqual(STARTING_LIVES);
  });

  it('serves 12 questions on the easy pool without repeating a target', () => {
    for (const seed of [4, 5, 6, 7, 8]) {
      const round = new Round(easy, seededRng(seed));
      const targets: string[] = [];
      const plan = [false, false, ...Array(9).fill(true), false];
      for (const right of plan) {
        const question = round.nextQuestion();
        targets.push(question.target.iso2);
        round.answer(right ? rightAnswer(question) : wrongAnswer(question));
      }
      expect(new Set(targets).size).toBe(12);
      expect(round.status).toBe('lost');
    }
  });

  it('refuses a second answer to the same question', () => {
    const round = new Round(easy, seededRng(9));
    const question = round.nextQuestion();
    round.answer(wrongAnswer(question));
    expect(() => round.answer(wrongAnswer(question))).toThrow('No question to answer');
    expect(round.lives).toBe(STARTING_LIVES - 1);
  });

  it('refuses a new question before the current one is answered', () => {
    const round = new Round(easy, seededRng(10));
    round.nextQuestion();
    expect(() => round.nextQuestion()).toThrow('not answered');
  });

  it('only picks targets the drawn format can use', () => {
    const round = new Round(easy, seededRng(11), [sortSimilar]);
    for (let i = 0; i < 4; i++) {
      const question = round.nextQuestion();
      expect(sortSimilar.canTarget(question.target, easy)).toBe(true);
      round.answer(rightAnswer(question));
    }
  });

  it('does not list the same missed country twice', () => {
    const round = new Round(easy, seededRng(12));
    for (let i = 0; i < STARTING_LIVES; i++) round.answer(wrongAnswer(round.nextQuestion()));
    const codes = round.missed.map((c) => c.iso2);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- src/engine/round.test.ts`
Expected: FAIL, cannot resolve `./round`.

- [ ] **Step 3: Implement `src/engine/round.ts`**

```ts
import type { Country } from '../data/countries';
import { grade, type Answer, type Grade } from './answer';
import { ALL_FORMATS } from './formats';
import type { Format, FormatContext, Question } from './question';
import { pickOne, type Rng } from './rng';

export const STARTING_LIVES = 3;
export const CORRECT_TO_WIN = 10;

export type RoundStatus = 'playing' | 'won' | 'lost';

export class Round {
  lives = STARTING_LIVES;
  correct = 0;
  readonly missed: Country[] = [];
  private readonly usedTargets = new Set<string>();
  private current: Question | null = null;

  constructor(
    private readonly ctx: FormatContext,
    private readonly rng: Rng,
    private readonly formats: readonly Format[] = ALL_FORMATS,
  ) {}

  get status(): RoundStatus {
    if (this.correct >= CORRECT_TO_WIN) return 'won';
    if (this.lives <= 0) return 'lost';
    return 'playing';
  }

  nextQuestion(): Question {
    if (this.status !== 'playing') throw new Error(`Round is ${this.status}`);
    if (this.current) throw new Error('Current question not answered yet');
    const unused = this.ctx.pool.filter((c) => !this.usedTargets.has(c.iso2));
    const eligible = this.formats.filter((format) => unused.some((c) => format.canTarget(c, this.ctx)));
    const format = pickOne(eligible, this.rng);
    const target = pickOne(unused.filter((c) => format.canTarget(c, this.ctx)), this.rng);
    this.usedTargets.add(target.iso2);
    this.current = format.build(target, this.ctx, this.rng);
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
}
```

- [ ] **Step 4: Run the gates**

Run: `npm run typecheck && npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/round.ts src/engine/round.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: add round rules with 3 lives and 10 correct answers to win" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 6: Medal persistence

**Files:**
- Create: `src/progress.ts`
- Test: `src/progress.test.ts`

**Interfaces:**
- Consumes: `Continent` (Task 2), `Difficulty` (Task 2).
- Produces:

```ts
export type MedalStore = Pick<Storage, 'getItem' | 'setItem'>;
export type Medals = Partial<Record<Continent, Partial<Record<Difficulty, true>>>>;
export function loadMedals(store: MedalStore): Medals;
export function awardMedal(store: MedalStore, continent: Continent, difficulty: Difficulty): void;
export function hasMedal(medals: Medals, continent: Continent, difficulty: Difficulty): boolean;
```

- [ ] **Step 1: Write the failing tests**

`src/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { awardMedal, hasMedal, loadMedals, type MedalStore } from './progress';

function memoryStore(): MedalStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('medals', () => {
  it('starts with no medals', () => {
    expect(hasMedal(loadMedals(memoryStore()), 'africa', 'easy')).toBe(false);
  });

  it('keeps an awarded medal across loads', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'easy');
    expect(hasMedal(loadMedals(store), 'africa', 'easy')).toBe(true);
    expect(hasMedal(loadMedals(store), 'africa', 'medium')).toBe(false);
  });

  it('keeps earlier medals when awarding another difficulty', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'easy');
    awardMedal(store, 'africa', 'hard');
    expect(loadMedals(store)).toEqual({ africa: { easy: true, hard: true } });
  });

  it('stores everything under one key', () => {
    const store = memoryStore();
    awardMedal(store, 'africa', 'medium');
    expect([...store.data.keys()]).toEqual(['flags-quiz:medals']);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- src/progress.test.ts`
Expected: FAIL, cannot resolve `./progress`.

- [ ] **Step 3: Implement `src/progress.ts`**

```ts
import type { Continent } from './data/countries';
import type { Difficulty } from './engine/pool';

export type MedalStore = Pick<Storage, 'getItem' | 'setItem'>;
export type Medals = Partial<Record<Continent, Partial<Record<Difficulty, true>>>>;

const STORAGE_KEY = 'flags-quiz:medals';

export function loadMedals(store: MedalStore): Medals {
  const raw = store.getItem(STORAGE_KEY);
  return raw === null ? {} : (JSON.parse(raw) as Medals);
}

export function awardMedal(store: MedalStore, continent: Continent, difficulty: Difficulty): void {
  const medals = loadMedals(store);
  medals[continent] = { ...medals[continent], [difficulty]: true };
  store.setItem(STORAGE_KEY, JSON.stringify(medals));
}

export function hasMedal(medals: Medals, continent: Continent, difficulty: Difficulty): boolean {
  return medals[continent]?.[difficulty] === true;
}
```

- [ ] **Step 4: Run the gates**

Run: `npm run typecheck && npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/progress.ts src/progress.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: persist medals per continent and difficulty" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 7: UI shell, styles and menu screens

**Files:**
- Create: `src/ui/dom.ts`, `src/ui/labels.ts`, `src/ui/flag.ts`, `src/ui/navigation.ts`, `src/ui/screens/home.ts`, `src/ui/screens/continent.ts`, `src/ui/screens/difficulty.ts`
- Modify: `src/main.ts`, `src/style.css`

**Interfaces:**
- Consumes: `countries`, `Continent`, `Country` (Task 2); `poolFor`, `Difficulty` (Task 2); `loadMedals`, `hasMedal` (Task 6).
- Produces:

```ts
// src/ui/dom.ts
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Partial<HTMLElementTagNameMap[K]>, children?: (Node | string)[]): HTMLElementTagNameMap[K];
// src/ui/labels.ts
export const CONTINENTS: readonly Continent[];
export const CONTINENT_LABEL: Record<Continent, string>;
export const CONTINENT_FROM: Record<Continent, string>; // "da África"
export const DIFFICULTIES: readonly Difficulty[];
export const DIFFICULTY_LABEL: Record<Difficulty, string>;
// src/ui/flag.ts
export function flagImg(country: Country, className?: string): HTMLImageElement;
// src/ui/navigation.ts
export type Screen =
  | { name: 'home' }
  | { name: 'continent' }
  | { name: 'difficulty'; continent: Continent }
  | { name: 'game'; continent: Continent; difficulty: Difficulty }
  | { name: 'result'; continent: Continent; difficulty: Difficulty; won: boolean; correct: number; missed: Country[] };
export type Navigate = (screen: Screen) => void;
// src/ui/screens/*.ts
export function renderHome(root: HTMLElement, navigate: Navigate): void;
export function renderContinent(root: HTMLElement, navigate: Navigate): void;
export function renderDifficulty(root: HTMLElement, navigate: Navigate, continent: Continent): void;
```

The UI has no unit tests (spec: checked in the browser). Gates for this task are typecheck, the existing tests and a manual check in the dev server.

- [ ] **Step 1: Write `src/ui/dom.ts`**

```ts
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
```

- [ ] **Step 2: Write `src/ui/labels.ts`**

```ts
import type { Continent } from '../data/countries';
import type { Difficulty } from '../engine/pool';

export const CONTINENTS: readonly Continent[] = ['africa', 'americas', 'asia', 'europe', 'oceania'];

export const CONTINENT_LABEL: Record<Continent, string> = {
  africa: 'África',
  americas: 'Américas',
  asia: 'Ásia',
  europe: 'Europa',
  oceania: 'Oceania',
};

export const CONTINENT_FROM: Record<Continent, string> = {
  africa: 'da África',
  americas: 'das Américas',
  asia: 'da Ásia',
  europe: 'da Europa',
  oceania: 'da Oceania',
};

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};
```

- [ ] **Step 3: Write `src/ui/flag.ts` and `src/ui/navigation.ts`**

`src/ui/flag.ts`:

```ts
import type { Country } from '../data/countries';
import { el } from './dom';

export function flagImg(country: Country, className = 'flag'): HTMLImageElement {
  return el('img', {
    src: `${import.meta.env.BASE_URL}flags/${country.iso2}.svg`,
    alt: 'Bandeira',
    className,
    draggable: false,
  });
}
```

`src/ui/navigation.ts`:

```ts
import type { Continent, Country } from '../data/countries';
import type { Difficulty } from '../engine/pool';

export type Screen =
  | { name: 'home' }
  | { name: 'continent' }
  | { name: 'difficulty'; continent: Continent }
  | { name: 'game'; continent: Continent; difficulty: Difficulty }
  | { name: 'result'; continent: Continent; difficulty: Difficulty; won: boolean; correct: number; missed: Country[] };

export type Navigate = (screen: Screen) => void;
```

- [ ] **Step 4: Write the three menu screens**

`src/ui/screens/home.ts`:

```ts
import { el } from '../dom';
import type { Navigate } from '../navigation';

export function renderHome(root: HTMLElement, navigate: Navigate): void {
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, ['Bandeiras do mundo']),
      el('button', { className: 'big', onclick: () => navigate({ name: 'continent' }) }, ['Learn']),
      el('button', { className: 'big', disabled: true }, ['Quiz — em breve']),
    ]),
  );
}
```

`src/ui/screens/continent.ts`:

```ts
import { countries } from '../../data/countries';
import { poolFor } from '../../engine/pool';
import { el } from '../dom';
import { CONTINENT_LABEL, CONTINENTS } from '../labels';
import type { Navigate } from '../navigation';

export function renderContinent(root: HTMLElement, navigate: Navigate): void {
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, ['Escolha o continente']),
      ...CONTINENTS.map((continent) =>
        el(
          'button',
          {
            className: 'big',
            disabled: poolFor(countries, continent, 'easy').length === 0,
            onclick: () => navigate({ name: 'difficulty', continent }),
          },
          [CONTINENT_LABEL[continent]],
        ),
      ),
      el('button', { className: 'link', onclick: () => navigate({ name: 'home' }) }, ['Voltar']),
    ]),
  );
}
```

`src/ui/screens/difficulty.ts`:

```ts
import { countries, type Continent } from '../../data/countries';
import { poolFor } from '../../engine/pool';
import { hasMedal, loadMedals } from '../../progress';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import type { Navigate } from '../navigation';

export function renderDifficulty(root: HTMLElement, navigate: Navigate, continent: Continent): void {
  const medals = loadMedals(localStorage);
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, [CONTINENT_LABEL[continent]]),
      ...DIFFICULTIES.map((difficulty) =>
        el('button', { className: 'big', onclick: () => navigate({ name: 'game', continent, difficulty }) }, [
          el('span', {}, [DIFFICULTY_LABEL[difficulty]]),
          el('span', { className: 'detail' }, [
            `${poolFor(countries, continent, difficulty).length} países`,
            hasMedal(medals, continent, difficulty) ? ' · 🏅' : '',
          ]),
        ]),
      ),
      el('button', { className: 'link', onclick: () => navigate({ name: 'continent' }) }, ['Voltar']),
    ]),
  );
}
```

- [ ] **Step 5: Write `src/main.ts`** (game and result screens are wired in Task 8)

```ts
import './style.css';
import type { Screen } from './ui/navigation';
import { renderContinent } from './ui/screens/continent';
import { renderDifficulty } from './ui/screens/difficulty';
import { renderHome } from './ui/screens/home';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
const app = root;

function navigate(screen: Screen): void {
  app.replaceChildren();
  switch (screen.name) {
    case 'home':
      return renderHome(app, navigate);
    case 'continent':
      return renderContinent(app, navigate);
    case 'difficulty':
      return renderDifficulty(app, navigate, screen.continent);
    case 'game':
    case 'result':
      throw new Error(`Screen ${screen.name} not built yet`);
  }
}

navigate({ name: 'home' });
```

- [ ] **Step 6: Write `src/style.css`**

```css
:root {
  --bg: #f6f4ef;
  --surface: #ffffff;
  --text: #1d1b16;
  --muted: #6b665c;
  --border: #ddd8cc;
  --accent: #1f6f50;
  --accent-text: #ffffff;
  --right: #2e7d32;
  --wrong: #c62828;
  --selected: #f0b429;
  --radius: 12px;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #15140f;
    --surface: #222019;
    --text: #f1ede3;
    --muted: #a39d90;
    --border: #3a372e;
    --accent: #4fb489;
    --accent-text: #0e1a14;
    --right: #66bb6a;
    --wrong: #ef5350;
    --selected: #f0b429;
    color-scheme: dark;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  line-height: 1.4;
}

button {
  font: inherit;
  color: inherit;
  cursor: pointer;
}

button:disabled { cursor: not-allowed; opacity: 0.45; }

.screen {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h1 { font-size: 1.6rem; margin: 8px 0 12px; }
h2 { font-size: 1.15rem; margin: 0 0 12px; }

.big {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 1.1rem;
  text-align: left;
}

.detail { color: var(--muted); font-size: 0.95rem; }

.link {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--muted);
  padding: 8px 0;
  text-decoration: underline;
}

.primary {
  padding: 14px 20px;
  border: none;
  border-radius: var(--radius);
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
  font-size: 1.05rem;
}

.hud {
  display: flex;
  justify-content: space-between;
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
}

.question { display: flex; flex-direction: column; gap: 12px; }
.question[inert] { opacity: 0.6; }

.flag {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.figure {
  height: 200px;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.crop-frame {
  overflow: hidden;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  max-width: 420px;
  width: 100%;
  margin: 0 auto;
}

.crop-frame .flag { height: auto; }

.flag-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.flag-option, .pair-flag {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.flag-option .flag, .pair-flag .flag { height: 90px; }

.name-list { display: flex; flex-direction: column; gap: 8px; }

.name-option {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  text-align: left;
}

.chosen, .selected { border-color: var(--selected); }
.linked { opacity: 0.5; }

.pair-flags {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.pair-label { color: var(--muted); font-size: 0.9rem; min-height: 1.3em; }

.yes-no { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.type-form { display: flex; flex-direction: column; gap: 10px; }

.type-form input {
  padding: 12px 14px;
  font: inherit;
  font-size: 1.1rem;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
}

.feedback {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius);
  border: 2px solid var(--border);
  background: var(--surface);
}

.feedback.right { border-color: var(--right); }
.feedback.wrong { border-color: var(--wrong); }
.verdict { margin: 0; font-weight: 700; font-size: 1.2rem; }
.feedback.right .verdict { color: var(--right); }
.feedback.wrong .verdict { color: var(--wrong); }

.solution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}

.solution-card { margin: 0; display: flex; flex-direction: column; gap: 4px; }
.solution-card .flag { height: 80px; }
.solution-card figcaption { font-size: 0.95rem; }

@media (min-width: 560px) {
  .flag-grid.count-6 { grid-template-columns: repeat(3, 1fr); }
  .figure { height: 260px; }
}
```

- [ ] **Step 7: Run the gates and check the menus in the browser**

Run: `npm run typecheck && npm test`
Expected: clean, all tests pass.

Start the dev server in the background with `npm run dev`, open it in the browser, and confirm: home shows Learn and a disabled Quiz; Learn → five continents with only África enabled; África → three difficulties showing 18, 36 and 54 países; every Voltar returns one screen; the page follows the system dark mode. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/main.ts src/style.css src/ui/dom.ts src/ui/labels.ts src/ui/flag.ts src/ui/navigation.ts src/ui/screens/home.ts src/ui/screens/continent.ts src/ui/screens/difficulty.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: add UI shell, styles and menu screens" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 8: Question renderers, game and result screens

**Files:**
- Create: `src/ui/questions/choices.ts`, `src/ui/questions/trueFalse.ts`, `src/ui/questions/typeName.ts`, `src/ui/questions/pairs.ts`, `src/ui/questions/feedback.ts`, `src/ui/questions/render.ts`, `src/ui/screens/game.ts`, `src/ui/screens/result.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–7, in particular `Round`, `STARTING_LIVES`, `CORRECT_TO_WIN` (Task 5), `Answer`, `Grade` (Task 4), `Question`, `Crop`, `FormatContext` (Task 3), `CROP_SCALE` (Task 3), `awardMedal` (Task 6), `el`, `flagImg`, `CONTINENT_FROM`, `CONTINENT_LABEL`, `DIFFICULTY_LABEL`, `Navigate` (Task 7).
- Produces:

```ts
export type Submit = (answer: Answer) => void;                        // render.ts
export function renderQuestion(question: Question, submit: Submit): HTMLElement; // render.ts
export function renderFeedback(question: Question, result: Grade, onContinue: () => void): HTMLElement; // feedback.ts
export function solutionCard(country: Country, caption?: string): HTMLElement; // feedback.ts
export function renderGame(root: HTMLElement, navigate: Navigate, continent: Continent, difficulty: Difficulty): void;
export function renderResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'result' }>): void;
```

- [ ] **Step 1: Write `src/ui/questions/choices.ts`**

```ts
import type { Country } from '../../data/countries';
import { CROP_SCALE } from '../../engine/formats';
import type { Crop } from '../../engine/question';
import { el } from '../dom';
import { flagImg } from '../flag';
import type { Submit } from './render';

function markChosen(event: MouseEvent): void {
  (event.currentTarget as HTMLElement).classList.add('chosen');
}

export function renderFlagChoices(prompt: string, options: Country[], submit: Submit): HTMLElement {
  return el('div', { className: 'question' }, [
    el('h2', {}, [prompt]),
    el(
      'div',
      { className: `flag-grid count-${options.length}` },
      options.map((country) =>
        el(
          'button',
          {
            className: 'flag-option',
            onclick: (event) => {
              markChosen(event);
              submit({ kind: 'choice', iso2: country.iso2 });
            },
          },
          [flagImg(country)],
        ),
      ),
    ),
  ]);
}

export function renderNameChoices(prompt: string, figure: HTMLElement, options: Country[], submit: Submit): HTMLElement {
  return el('div', { className: 'question' }, [
    el('h2', {}, [prompt]),
    figure,
    el(
      'div',
      { className: 'name-list' },
      options.map((country) =>
        el(
          'button',
          {
            className: 'name-option',
            onclick: (event) => {
              markChosen(event);
              submit({ kind: 'choice', iso2: country.iso2 });
            },
          },
          [country.name],
        ),
      ),
    ),
  ]);
}

export function flagFigure(country: Country): HTMLElement {
  return el('div', { className: 'figure' }, [flagImg(country)]);
}

export function cropFigure(country: Country, crop: Crop): HTMLElement {
  const img = flagImg(country);
  img.style.transformOrigin = `${crop.originX}% ${crop.originY}%`;
  img.style.transform = `scale(${CROP_SCALE})`;
  return el('div', { className: 'crop-frame' }, [img]);
}
```

- [ ] **Step 2: Write `src/ui/questions/trueFalse.ts` and `src/ui/questions/typeName.ts`**

`src/ui/questions/trueFalse.ts`:

```ts
import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagFigure } from './choices';
import type { Submit } from './render';

export function renderTrueFalse(target: Country, shown: Country, submit: Submit): HTMLElement {
  return el('div', { className: 'question' }, [
    el('h2', {}, [`Esta é a bandeira de ${shown.name}?`]),
    flagFigure(target),
    el('div', { className: 'yes-no' }, [
      el('button', { className: 'big', onclick: () => submit({ kind: 'yesNo', yes: true }) }, ['Sim']),
      el('button', { className: 'big', onclick: () => submit({ kind: 'yesNo', yes: false }) }, ['Não']),
    ]),
  ]);
}
```

`src/ui/questions/typeName.ts`:

```ts
import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagFigure } from './choices';
import type { Submit } from './render';

export function renderTypeName(target: Country, submit: Submit): HTMLElement {
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
  return el('div', { className: 'question' }, [el('h2', {}, ['Escreva o nome do país desta bandeira']), flagFigure(target), form]);
}
```

- [ ] **Step 3: Write `src/ui/questions/pairs.ts`**

The player taps a name, then a flag. Tapping a linked name unlinks it and selects it again. "Conferir" is enabled once every name is linked.

```ts
import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagImg } from '../flag';
import type { Submit } from './render';

export function renderPairs(prompt: string, countries: Country[], submit: Submit): HTMLElement {
  const names = [...countries].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const links: Record<string, string> = {};
  let selected: string | null = null;
  const container = el('div', { className: 'question' });

  const nameOnFlag = (flagIso: string) => countries.find((c) => links[c.iso2] === flagIso);

  const select = (nameIso: string) => {
    delete links[nameIso];
    selected = nameIso;
    draw();
  };

  const linkTo = (flagIso: string) => {
    if (selected === null) return;
    const previous = nameOnFlag(flagIso);
    if (previous) delete links[previous.iso2];
    links[selected] = flagIso;
    selected = null;
    draw();
  };

  const draw = () => {
    container.replaceChildren(
      el('h2', {}, [prompt]),
      el(
        'div',
        { className: 'pair-flags' },
        countries.map((flag) =>
          el('button', { className: 'pair-flag', onclick: () => linkTo(flag.iso2) }, [
            flagImg(flag),
            el('span', { className: 'pair-label' }, [nameOnFlag(flag.iso2)?.name ?? '—']),
          ]),
        ),
      ),
      el(
        'div',
        { className: 'name-list' },
        names.map((country) => {
          const classes = ['name-option'];
          if (selected === country.iso2) classes.push('selected');
          if (links[country.iso2]) classes.push('linked');
          return el('button', { className: classes.join(' '), onclick: () => select(country.iso2) }, [country.name]);
        }),
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

- [ ] **Step 4: Write `src/ui/questions/feedback.ts`**

```ts
import type { Country } from '../../data/countries';
import type { Grade } from '../../engine/answer';
import type { Question } from '../../engine/question';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_FROM } from '../labels';

export function solutionCard(country: Country, caption = country.name): HTMLElement {
  return el('figure', { className: 'solution-card' }, [flagImg(country), el('figcaption', {}, [caption])]);
}

function solution(question: Question): HTMLElement {
  switch (question.format) {
    case 'matchPairs':
    case 'sortSimilar':
      return el('div', { className: 'solution-grid' }, question.countries.map((c) => solutionCard(c)));
    case 'oddOneOut':
      return el('div', { className: 'solution-grid' }, [
        solutionCard(question.intruder, `${question.intruder.name} não é ${CONTINENT_FROM[question.target.continent]}`),
      ]);
    default:
      return el('div', { className: 'solution-grid' }, [solutionCard(question.target)]);
  }
}

export function renderFeedback(question: Question, result: Grade, onContinue: () => void): HTMLElement {
  return el('section', { className: `feedback ${result.correct ? 'right' : 'wrong'}` }, [
    el('p', { className: 'verdict' }, [result.correct ? 'Certo!' : 'Errado']),
    solution(question),
    el('button', { className: 'primary', onclick: onContinue }, ['Continuar']),
  ]);
}
```

- [ ] **Step 5: Write `src/ui/questions/render.ts`**

```ts
import type { Answer } from '../../engine/answer';
import type { Question } from '../../engine/question';
import { CONTINENT_FROM } from '../labels';
import { cropFigure, flagFigure, renderFlagChoices, renderNameChoices } from './choices';
import { renderPairs } from './pairs';
import { renderTrueFalse } from './trueFalse';
import { renderTypeName } from './typeName';

export type Submit = (answer: Answer) => void;

export function renderQuestion(question: Question, submit: Submit): HTMLElement {
  switch (question.format) {
    case 'nameToFlags':
      return renderFlagChoices(`Qual é a bandeira de ${question.target.name}?`, question.options, submit);
    case 'flagToNames':
    case 'flagToTwoNames':
      return renderNameChoices('De qual país é esta bandeira?', flagFigure(question.target), question.options, submit);
    case 'crop':
      return renderNameChoices('De qual país é este pedaço de bandeira?', cropFigure(question.target, question.crop), question.options, submit);
    case 'trueFalse':
      return renderTrueFalse(question.target, question.shown, submit);
    case 'typeName':
      return renderTypeName(question.target, submit);
    case 'matchPairs':
      return renderPairs('Ligue cada nome à sua bandeira', question.countries, submit);
    case 'sortSimilar':
      return renderPairs('Bandeiras parecidas: ligue cada nome à sua bandeira', question.countries, submit);
    case 'oddOneOut':
      return renderFlagChoices(`Qual destas bandeiras não é ${CONTINENT_FROM[question.target.continent]}?`, question.options, submit);
  }
}
```

- [ ] **Step 6: Write `src/ui/screens/game.ts`**

The question element becomes `inert` on the first submit, so a second tap cannot reach `round.answer`.

```ts
import { countries, similarGroups, type Continent } from '../../data/countries';
import { poolFor, type Difficulty } from '../../engine/pool';
import { CORRECT_TO_WIN, Round, STARTING_LIVES } from '../../engine/round';
import { awardMedal } from '../../progress';
import { el } from '../dom';
import type { Navigate } from '../navigation';
import { renderFeedback } from '../questions/feedback';
import { renderQuestion } from '../questions/render';

export function renderGame(root: HTMLElement, navigate: Navigate, continent: Continent, difficulty: Difficulty): void {
  const round = new Round(
    { pool: poolFor(countries, continent, difficulty), world: countries, similarGroups },
    Math.random,
  );
  const hud = el('header', { className: 'hud' });
  const stage = el('section', { className: 'stage screen' });
  root.append(el('main', { className: 'screen' }, [hud, stage]));

  const updateHud = () =>
    hud.replaceChildren(
      el('span', {}, ['❤️'.repeat(round.lives) + '🖤'.repeat(STARTING_LIVES - round.lives)]),
      el('span', {}, [`${round.correct}/${CORRECT_TO_WIN}`]),
    );

  const finish = () => {
    const won = round.status === 'won';
    if (won) awardMedal(localStorage, continent, difficulty);
    navigate({ name: 'result', continent, difficulty, won, correct: round.correct, missed: round.missed });
  };

  const ask = () => {
    const question = round.nextQuestion();
    const questionEl = renderQuestion(question, (answer) => {
      questionEl.inert = true;
      const result = round.answer(answer);
      updateHud();
      const feedback = renderFeedback(question, result, () => (round.status === 'playing' ? ask() : finish()));
      stage.append(feedback);
      feedback.querySelector('button')?.focus();
    });
    stage.replaceChildren(questionEl);
    window.scrollTo({ top: 0 });
  };

  updateHud();
  ask();
}
```

- [ ] **Step 7: Write `src/ui/screens/result.ts`**

```ts
import { CORRECT_TO_WIN } from '../../engine/round';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { solutionCard } from '../questions/feedback';

export function renderResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'result' }>): void {
  const { continent, difficulty, won, correct, missed } = screen;
  const review = missed.length
    ? [el('h2', {}, ['Bandeiras para revisar']), el('div', { className: 'solution-grid' }, missed.map((c) => solutionCard(c)))]
    : [];
  root.append(
    el('main', { className: 'screen' }, [
      el('h1', {}, [won ? '🏅 Medalha conquistada!' : `Você fez ${correct} de ${CORRECT_TO_WIN}`]),
      el('p', { className: 'detail' }, [`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      ...review,
      el('button', { className: 'primary', onclick: () => navigate({ name: 'game', continent, difficulty }) }, ['Jogar de novo']),
      el('button', { className: 'link', onclick: () => navigate({ name: 'difficulty', continent }) }, ['Voltar']),
    ]),
  );
}
```

- [ ] **Step 8: Wire the two screens in `src/main.ts`**

Replace the `case 'game': case 'result': throw …` branch and add the imports:

```ts
import { renderGame } from './ui/screens/game';
import { renderResult } from './ui/screens/result';
```

```ts
    case 'game':
      return renderGame(app, navigate, screen.continent, screen.difficulty);
    case 'result':
      return renderResult(app, navigate, screen);
```

- [ ] **Step 9: Run the gates**

Run: `npm run typecheck && npm test && npm run build`
Expected: clean typecheck, all tests pass, build writes `dist/`.

- [ ] **Step 10: Commit**

```bash
git add src/main.ts src/ui/questions/choices.ts src/ui/questions/trueFalse.ts src/ui/questions/typeName.ts src/ui/questions/pairs.ts src/ui/questions/feedback.ts src/ui/questions/render.ts src/ui/screens/game.ts src/ui/screens/result.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: render the nine formats and play full Learn rounds" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 9: Browser verification and README

**Files:**
- Create: `README.md`
- Modify: whatever the verification shows broken (fix in the owning file, add a test when the defect is in the engine)

- [ ] **Step 1: Start the dev server in the background**

Run: `npm run dev` (background). Note the URL it prints (port 5173).

- [ ] **Step 2: Play every format in the browser**

With the Playwright browser tools, play África · Fácil until each of the nine formats has appeared at least once, and for each one confirm:
- the prompt reads correctly in Portuguese and does not reveal the answer (flag `alt` is the generic "Bandeira");
- a right answer shows "Certo!", a wrong one "Errado" and the solution, and the hearts and counter update;
- a double click on an option costs only one life;
- pairs: name → flag links, re-tapping a name unlinks it, "Conferir" stays disabled until all are linked;
- type the name: empty submit is blocked; "rdc" is accepted on República Democrática do Congo when it appears.

Then win one round (check the 🏅 on the difficulty screen after "Voltar", and after a page reload) and lose one round (check the review list). Take a screenshot at 390px width and one at 1280px width, and one with dark mode emulated.

- [ ] **Step 3: Check the crop on striped flags**

On the dev server page, run in the browser:

```js
const { cropFigure } = await import('/src/ui/questions/choices.ts');
const { countries } = await import('/src/data/countries.ts');
const grid = document.createElement('div');
grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,150px);gap:8px;padding:8px;background:#fff';
for (const code of ['ga', 'sl']) {
  const country = countries.find((c) => c.iso2 === code);
  for (const [x, y] of [[0, 0], [100, 0], [0, 100], [100, 100]]) grid.append(cropFigure(country, { originX: x, originY: y }));
}
document.body.prepend(grid);
```

Screenshot the grid. Pass: every crop shows at least two colour bands. On fail: stop and report to the user with the screenshot; the crop scale is a fixed parameter of the spec and is not changed without approval.

- [ ] **Step 4: Write `README.md`**

```markdown
# Bandeiras

A study app for world flags. Learn mode drills one continent at a time in three difficulties, with nine question formats, 3 lives per round and 10 correct answers to earn a medal. Africa is the only continent with data so far.

## Run

    npm install
    npm run dev       # dev server on port 5173, reachable from the LAN
    npm run build     # static site in dist/
    npm run preview   # serve dist/ on port 4173

## Test

    npm run typecheck
    npm test

## Data

`src/data/countries.json` holds every UN member state with its Portuguese name, continent, Learn tier (Africa only) and accepted alternative spellings. `src/data/similar-groups.json` lists the groups of look-alike flags used by the sort-similar format. Flags are the SVGs in `public/flags/`, taken from flagcdn. Edit the JSON files directly to change names, tiers, aliases or groups.

Medals live in the browser's `localStorage`, so they belong to one browser on one device.
```

- [ ] **Step 5: Run the gates, stop the dev server and commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

```bash
git add README.md
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "docs: add README with run, test and data notes" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

Fixes found in Step 2 or 3 are committed separately, each with its own `fix:` message, before this commit.

- [ ] **Step 6: Hand over to the user**

Report the dev server URL on forge and ask the user to play. Items are done when the user has tested them and said so.
