# Other Continents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open Américas, Ásia, Europa and Oceania in Learn and Quiz with the same four levels as Africa, goals scaled to each pool, and formats that fit Oceania's 4- and 5-flag tiers.

**Architecture:** Data only gains tiers, aliases and similar-flag groups. `LEVEL_RULES` swaps the fixed goal for a rational factor and `goalFor(difficulty, poolSize)` computes the goal; the game, level and result screens call it. Formats pick 6 options only when the pool has 6 countries. The continent screen already enables any continent with tiered countries.

**Tech Stack:** Vite, TypeScript (strict), Vitest, plain DOM, Node 24.

**Spec:** `docs/specs/2026-10-06-other-continents-design.md`

**Runs after:** `docs/specs/2026-10-06-quiz-mode-plan.md` is complete (Task 3 here edits the level screen as the Quiz plan leaves it).

## Global Constraints

- Code, identifiers, comments and commit messages in English; every string the player sees in Brazilian Portuguese.
- Tiers per continent exactly as listed in Task 1; Africa's tiers, names and aliases unchanged.
- Goal = ceil(numerator × poolSize / denominator) with easy 2/3, medium 1/1, hard 25/18, general 30/54; Africa stays 12/18/25/30. Lives 3; recall weights and similar distractors per level unchanged.
- 6 options only when the pool has at least 6 countries; otherwise 4.
- No linter exists in this repo. The gates are `npm run typecheck` and `npm test` (plus `npm run build` where a step says so); run them before every commit.
- Comments only for facts from outside the file; no docstrings.
- Tests live next to the file they test, named `<file>.test.ts`.
- The operator plays on a dev server on port 5173; never stop or restart it. Browser checks use their own server on port 5174.
- Never amend or rewrite a commit.
- Commit as the agent, Conventional Commits, staging files by name:

```bash
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "<type>: <subject>" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

## Review Focus

1. **A 4-flag pool asking for 6 options.** Oceania Difícil has 4 countries; any 6-option draw would throw inside `sample`. Pinned in Task 2.
2. **A round on every continent and level.** Small pools with goals above the pool size rely on passes. Pinned in Task 2.
3. **An alias that collides with another country's name.** "Congo"-style ambiguity across continents would grade a right answer as wrong. Pinned in Task 1.
4. **Africa drifting.** Its goals and data must not change. Pinned in Tasks 1 and 2.
5. **A similar group crossing continents.** Group formats would show a foreign flag in a continent's pool. Pinned in Task 1.

---

### Task 1: Tiers, aliases and similar-flag groups for every continent

**Files:**
- Modify: `src/data/countries.json`, `src/data/similar-groups.json`, `src/data/countries.test.ts`
- Throwaway (scratchpad, not committed): the edit script in Step 3

**Interfaces:**
- Produces: every country has `tier`; `similarGroups` gains 26 groups.

- [ ] **Step 1: Update `src/data/countries.test.ts`**

Replace the test `gives a tier only to African countries` with:

```ts
  it.each(['africa', 'americas', 'asia', 'europe', 'oceania'] as const)('gives every %s country a tier, in near-equal tiers', (continent) => {
    const members = countries.filter((c) => c.continent === continent);
    expect(members.every((c) => c.tier !== undefined)).toBe(true);
    const sizes = [1, 2, 3].map((tier) => members.filter((c) => c.tier === tier).length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('accepts no typed name for two different countries', () => {
    const owners = new Map<string, string>();
    for (const country of countries) {
      for (const name of [country.name, ...country.aliases].map(normalizeName)) {
        expect(owners.get(name) ?? country.iso2).toBe(country.iso2);
        owners.set(name, country.iso2);
      }
    }
  });
```

Add `import { normalizeName } from '../engine/answer';` to the imports.

Replace the test inside `describe('similarGroups')` with:

```ts
  it('groups 2 to 4 existing countries of one continent', () => {
    for (const group of similarGroups) {
      expect(group.length).toBeGreaterThanOrEqual(2);
      expect(group.length).toBeLessThanOrEqual(4);
      const continents = new Set(group.map((iso2) => byIso.get(iso2)?.continent));
      expect(continents.size).toBe(1);
      expect(continents.has(undefined)).toBe(false);
    }
  });

  it('covers every continent', () => {
    const covered = new Set(similarGroups.map((group) => byIso.get(group[0])?.continent));
    expect(covered).toEqual(new Set(['africa', 'americas', 'asia', 'europe', 'oceania']));
  });
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- src/data/countries.test.ts`
Expected: FAIL — non-African countries have no tier; groups cover only Africa.

- [ ] **Step 3: Edit the data with a throwaway script**

Save as `<scratchpad>/continents-data.mjs` and run from the repo root with `node <scratchpad>/continents-data.mjs`:

```js
import { readFile, writeFile } from 'node:fs/promises';

const TIERS = {
  1: 'br ar us ca mx co cl pe uy cu jm ve jp cn in kr kp tr sa il th vn id ir pk ph np mn de fr it es pt gb nl be ch se no dk gr ie pl au nz fj pg ws',
  2: 'bo py ec pa cr do ht gt hn ni sv tt my sg lk bd ae qa iq sy jo lb af kz kh la mm at fi is ru ua cz hu hr ro bg rs al cy mt lu to sb vu ki fm',
  3: 'ag bb bs bz dm gd gy kn lc sr vc am az ge bh bn bt kw kg mv om tj tl tm uz ye ad ba by ee li lt lv mc md me mk si sk sm mh nr pw tv',
};
const ALIASES = {
  nl: ['Holanda'],
  cz: ['República Tcheca', 'Chéquia'],
  us: ['EUA', 'Estados Unidos da América'],
  gb: ['Grã-Bretanha'],
  mk: ['Macedônia'],
  ba: ['Bósnia'],
  by: ['Belarus'],
  md: ['Moldova'],
  mm: ['Birmânia'],
  bh: ['Bahrein', 'Bahrain'],
  vn: ['Vietname'],
  ae: ['Emirados Árabes', 'EAU'],
  tj: ['Tajiquistão'],
  tm: ['Turquemenistão'],
  kg: ['Quirguízia'],
  ki: ['Kiribati'],
  fm: ['Estados Federados da Micronésia'],
  kn: ['São Cristóvão e Nevis'],
  qa: ['Qatar'],
  kw: ['Kuait'],
};
const GROUPS = [
  ['co', 'ec', 've'], ['hn', 'ni', 'sv', 'gt'], ['ar', 'uy'], ['pe', 'ca'], ['tt', 'kn'], ['pa', 'do'],
  ['id', 'sg'], ['jo', 'ae', 'kw'], ['sy', 'iq', 'ye'], ['jp', 'bd'], ['qa', 'bh'], ['cn', 'vn'], ['ir', 'tj'],
  ['ro', 'ad', 'md'], ['nl', 'lu'], ['ru', 'si', 'sk', 'rs'], ['it', 'ie'], ['hu', 'bg'], ['be', 'de'], ['at', 'lv'], ['pl', 'mc'], ['no', 'is', 'dk', 'fi'], ['al', 'me'],
  ['au', 'nz', 'tv', 'fj'], ['ws', 'to'], ['fm', 'nr', 'mh'],
];

const tierOf = Object.fromEntries(Object.entries(TIERS).flatMap(([tier, codes]) => codes.split(' ').map((iso2) => [iso2, Number(tier)])));
const countries = JSON.parse(await readFile('src/data/countries.json', 'utf8'));
for (const country of countries) {
  if (country.continent === 'africa') continue;
  if (!tierOf[country.iso2]) throw new Error(`no tier for ${country.iso2}`);
  const { aliases, ...rest } = country;
  Object.assign(country, { ...rest, tier: tierOf[country.iso2], aliases: [...aliases, ...(ALIASES[country.iso2] ?? [])] });
}
const ordered = countries.map(({ iso2, name, continent, tier, aliases }) => ({ iso2, name, continent, ...(tier ? { tier } : {}), aliases }));
await writeFile('src/data/countries.json', JSON.stringify(ordered, null, 2) + '\n');
const groups = JSON.parse(await readFile('src/data/similar-groups.json', 'utf8'));
await writeFile('src/data/similar-groups.json', JSON.stringify([...groups, ...GROUPS], null, 2) + '\n');
console.log('tiered', countries.filter((c) => c.tier).length);
```

Expected output: `tiered 193`. Then `git diff --stat src/data` shows only the two JSON files; spot-check that African entries are byte-identical (`git diff src/data/countries.json | grep -c '"africa"'` prints 0).

- [ ] **Step 4: Run the gates**

Run: `npm run typecheck && npm test`
Expected: clean; all tests pass. If the alias-collision test fails, read the colliding pair, drop the offending alias from the JSON, and say which in the report.

- [ ] **Step 5: Delete the script and commit**

```bash
rm <scratchpad>/continents-data.mjs
git add src/data/countries.json src/data/similar-groups.json src/data/countries.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: tier every continent and add their look-alike groups and spellings" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 2: Goals scaled to the pool and formats that fit small pools

**Files:**
- Modify: `src/engine/pool.ts`, `src/engine/pool.test.ts`, `src/engine/formats.ts`, `src/engine/formats.test.ts`, `src/engine/round.test.ts`, `src/ui/screens/game.ts`, `src/ui/screens/difficulty.ts`, `src/ui/screens/result.ts`

**Interfaces:**
- Produces:

```ts
// pool.ts
export interface LevelRules { tiers: readonly Tier[]; goal: readonly [numerator: number, denominator: number]; recallWeight: number; similarDistractors: boolean }
export function goalFor(difficulty: Difficulty, poolSize: number): number;
```

`LevelRules.correctToWin` is removed.

- [ ] **Step 1: Write the failing tests**

In `src/engine/pool.test.ts`, replace the test `is empty for a continent without tiers` with:

```ts
  it.each([
    ['americas', [12, 12, 11, 35]],
    ['asia', [16, 15, 15, 46]],
    ['europe', [15, 15, 14, 44]],
    ['oceania', [5, 5, 4, 14]],
  ] as const)('sizes the %s pools', (continent, sizes) => {
    expect((['easy', 'medium', 'hard', 'general'] as const).map((d) => poolFor(countries, continent, d).length)).toEqual(sizes);
  });
```

and replace `describe('LEVEL_RULES')` with:

```ts
describe('goalFor', () => {
  it('keeps the Africa goals', () => {
    expect((['easy', 'medium', 'hard', 'general'] as const).map((d) => goalFor(d, poolFor(countries, 'africa', d).length))).toEqual([12, 18, 25, 30]);
  });

  it.each([
    ['americas', [8, 12, 16, 20]],
    ['asia', [11, 15, 21, 26]],
    ['europe', [10, 15, 20, 25]],
    ['oceania', [4, 5, 6, 8]],
  ] as const)('scales the %s goals with the pool', (continent, goals) => {
    expect((['easy', 'medium', 'hard', 'general'] as const).map((d) => goalFor(d, poolFor(countries, continent, d).length))).toEqual(goals);
  });
});
```

Update the import to `import { goalFor, poolFor } from './pool';`.

In `src/engine/formats.test.ts`, append:

```ts
describe('small pools', () => {
  const tiny: FormatContext = { ...contextFor('hard'), pool: poolFor(countries, 'oceania', 'hard') };

  it('never asks for 6 options on a 4-country pool', () => {
    for (const format of [nameToFlags, flagToNames]) {
      for (const question of buildMany(format, tiny)) {
        if (!('options' in question)) throw new Error('expected options');
        expect(question.options).toHaveLength(4);
      }
    }
  });

  it('builds every format for every target it accepts', () => {
    for (const format of ALL_FORMATS) {
      for (const target of tiny.pool) {
        if (format.canTarget(target, tiny)) expect(() => format.build(target, tiny, seededRng(1))).not.toThrow();
      }
    }
  });
});
```

In `src/engine/round.test.ts`, add `LEVEL_RULES, goalFor` to the `./pool` import and append inside `describe('Round')`:

```ts
  it.each(['africa', 'americas', 'asia', 'europe', 'oceania'] as const)('plays every level of %s to its goal', (continent) => {
    for (const difficulty of ['easy', 'medium', 'hard', 'general'] as const) {
      const pool = poolFor(countries, continent, difficulty);
      const ctx: FormatContext = { pool, world: countries, similarGroups, similarDistractors: LEVEL_RULES[difficulty].similarDistractors };
      const round = new Round(ctx, settings(goalFor(difficulty, pool.length), LEVEL_RULES[difficulty].recallWeight), seededRng(31));
      while (round.status === 'playing') round.answer(rightAnswer(round.nextQuestion()));
      expect(round.status).toBe('won');
    }
  });
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL — `goalFor` missing; 6 options drawn on the 4-country pool.

- [ ] **Step 3: Replace the fixed goal in `src/engine/pool.ts`**

```ts
export interface LevelRules {
  tiers: readonly Tier[];
  goal: readonly [numerator: number, denominator: number];
  recallWeight: number;
  similarDistractors: boolean;
}

export const LEVEL_RULES: Record<Difficulty, LevelRules> = {
  easy: { tiers: [1], goal: [2, 3], recallWeight: 1, similarDistractors: false },
  medium: { tiers: [2], goal: [1, 1], recallWeight: 2, similarDistractors: false },
  hard: { tiers: [3], goal: [25, 18], recallWeight: 3, similarDistractors: true },
  general: { tiers: [1, 2, 3], goal: [30, 54], recallWeight: 3, similarDistractors: true },
};

export function goalFor(difficulty: Difficulty, poolSize: number): number {
  const [numerator, denominator] = LEVEL_RULES[difficulty].goal;
  return Math.ceil((numerator * poolSize) / denominator);
}
```

(`poolFor` and `Difficulty` stay as they are.)

- [ ] **Step 4: Cap the option count in `src/engine/formats.ts`**

Add after `randomCrop`:

```ts
const optionCount = (ctx: FormatContext, rng: Rng) => pickOne([4, 6].filter((count) => count <= ctx.pool.length), rng);
```

and in `nameToFlags` and `flagToNames` replace `pickOne([4, 6], rng)` with `optionCount(ctx, rng)`.

- [ ] **Step 5: Use `goalFor` in the screens**

`src/ui/screens/game.ts`: build the pool once and pass the computed settings:

```ts
  const rules = LEVEL_RULES[difficulty];
  const pool = poolFor(countries, continent, difficulty);
  const round = new Round(
    { pool, world: countries, similarGroups, similarDistractors: rules.similarDistractors },
    { correctToWin: goalFor(difficulty, pool.length), recallWeight: rules.recallWeight },
    Math.random,
  );
```

(import `goalFor` with `LEVEL_RULES, poolFor`).

`src/ui/screens/difficulty.ts` (`learnDetail`): replace `LEVEL_RULES[difficulty].correctToWin` with `goalFor(difficulty, pool.length)` where `const pool = poolFor(countries, continent, difficulty);` is computed once in the function and also used for the country count; drop `LEVEL_RULES` from the import if unused.

`src/ui/screens/result.ts`: replace `LEVEL_RULES[difficulty].correctToWin` with `goalFor(difficulty, poolFor(countries, continent, difficulty).length)` (imports: `countries` from `../../data/countries`, `goalFor, poolFor` from `../../engine/pool`).

- [ ] **Step 6: Run the gates**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean; `grep -rn correctToWin src/engine/pool.ts` finds nothing.

- [ ] **Step 7: Commit**

```bash
git add src/engine/pool.ts src/engine/pool.test.ts src/engine/formats.ts src/engine/formats.test.ts src/engine/round.test.ts src/ui/screens/game.ts src/ui/screens/difficulty.ts src/ui/screens/result.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: scale level goals to the pool and fit formats to small pools" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 3: Browser verification and docs

**Files:**
- Modify: `README.md`, `docs/specs/2026-10-06-other-continents-design.md` (status line), plus whatever the checks show broken (fix in the owning file, engine test when the defect is in `src/engine/`, one `fix:` commit each)

- [ ] **Step 1: Play every continent**

Start `npx vite --host --port 5174 --strictPort` in the background and, with the Playwright browser tools at 390px width:
- the continent screen enables all five continents;
- for each of Américas, Ásia, Europa and Oceania: the Learn level screen shows the counts and goals from the spec table; one Learn round on Fácil reaches its goal (answers may be read from the DOM via evaluate, but at least three questions per continent through real clicks or typing); the oddOneOut prompt names the right continent ("não é da Europa", "das Américas"…);
- Oceania Difícil (4 flags): play a round to its goal of 6 without errors in the console;
- Quiz on Europa Fácil: finish it and see the record on the Quiz level screen;
- screenshots under the SDD workspace: continent screen, one Learn question per continent, the Oceania Difícil round, dark mode once.

Stop the server.

- [ ] **Step 2: Update the docs**

In `README.md`, replace `Africa is the only continent with data so far.` with `Every continent is available: Africa, the Americas, Asia, Europe and Oceania, each split into the same four levels, with goals scaled to the size of each level.` If the sentence is not present verbatim, add that sentence at the end of the first paragraph instead.

In `docs/specs/2026-10-06-other-continents-design.md`, replace the status line with `Status: implemented; the agent's decisions listed below await the operator's review`.

- [ ] **Step 3: Run the gates and commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

```bash
git add README.md docs/specs/2026-10-06-other-continents-design.md
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "docs: describe every continent in the README" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```
