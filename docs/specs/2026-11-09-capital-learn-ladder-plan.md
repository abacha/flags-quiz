# Capital Learn Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capitais Aprender teaches from zero with a four-step ladder that starts from the map, Capitais asks only the Mapas countries split into three even levels per continent, and the Maps ladder loses its letter-tiles step.

**Architecture:** Capitais Aprender moves from `Round` onto the existing `LadderRound` with a new `CAPITAL_LADDER`. The step-1 question draws the capital as a pinned point on the continent map through a new `MapView.pin`. The Capitais pool comes from the Mapas pool, split by a hand-kept `src/data/capital-levels.json`.

**Tech Stack:** TypeScript, Vite, Vitest with happy-dom, d3-geo, no UI framework (`el()` from `src/ui/dom.ts`).

**Spec:** `docs/specs/2026-11-09-capital-learn-ladder-design.md`

## Global Constraints

- Player-facing copy is Portuguese; code, comments, identifiers and commits are English.
- `src/engine` never touches the DOM; screens are built with `el()`.
- No `localStorage` key changes: medals and quiz records keep their keys and shapes.
- Never read `src/data/map.topo.json` into context.
- Gates: `npx vitest run` and `npx tsc --noEmit` (no linter).
- Branch: `feat/capital-learn-ladder`, cut from `fix/result-answered-count` (it carries the `correct`/`answered` counters this plan builds on). Never push `main` without the owner's approval: every push to `main` deploys.
- Commits use Conventional Commits and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- A capital whose point falls outside the zoomed frame of its country (a capital on an island apart from the mainland, such as Malabo for Guiné Equatorial): the point must be visible. Pinned in Task 3.
- A typo on step 3 (type the capital) must cost no life and keep the step, as in Maps. Pinned in Task 4.
- The smallest levels (Oceania, 5 or 6 countries) must still build four distinct options on steps 1 and 2 for every country. Pinned in Task 4.
- A country with several capitals: step 1 pins and names the main capital, and step 3 accepts any of them. Pinned in Task 4.
- Mundo Fácil, Médio and Difícil in Capitais show no Aprender button and no medal tag. Pinned in Task 5.

---

### Task 1: Remove the letter-tiles step from the Maps ladder

**Files:**
- Modify: `src/engine/mapFormats.ts`, `src/engine/question.ts`, `src/engine/answer.ts`, `src/ui/questions/mapQuestions.ts`, `src/ui/questions/render.ts`, `src/style.css` (`.spell-*` rules), `README.md:36`
- Delete: `src/ui/questions/spellName.ts`, `src/ui/questions/spellName.test.ts`
- Test: `src/engine/mapFormats.test.ts`, `src/engine/ladderRound.test.ts`, `src/engine/answer.test.ts`, `src/ui/questions/mapQuestions.test.ts`

**Interfaces:**
- Produces: `MAP_LADDER: readonly Format[]` = `[mapFlagToNames, mapFindCountry, mapToNames, mapTypeName]`. `withoutAccents` stays exported from `mapFormats.ts` (used by `src/ui/questions/keys.ts`).

- [ ] **Step 1: Write the failing test** in `src/engine/mapFormats.test.ts`:

```ts
it('climbs four steps: flag beside the map, find it, pick its name, type it', () => {
  expect(MAP_LADDER.map((f) => f.id)).toEqual(['mapFlagToNames', 'mapFindCountry', 'mapToNames', 'mapTypeName']);
});
```

- [ ] **Step 2: Run it.** `npx vitest run src/engine/mapFormats.test.ts` → FAIL, received includes `mapSpellName`.
- [ ] **Step 3: Implement.** Drop `mapSpellName` from `MAP_LADDER`, then delete `mapSpellName`, `spelledLetters`, `decoyLetters`, `SEPARATOR`, `DECOY_LETTERS`, the `mapSpellName` variant of `Question`, its `grade` branch and the `spelledLetters` import in `answer.ts`, its case in `renderMapQuestion`, `MapQuestion` and `renderQuestion`, the `spellName` module and its CSS. Delete the tests that cover only the removed code (`spelledLetters`, `mapSpellName` building and grading, `renderSpellName`). In `ladderRound.test.ts`, the tests that start at step `4` to reach `mapTypeName` start at step `3`.
- [ ] **Step 4: Update `README.md:36`** to describe a four-step ladder: pick the name with the flag shown, find the country on the map with its flag as a hint, pick the name, type the name.
- [ ] **Step 5: Run the gates.** `npx vitest run` and `npx tsc --noEmit` → all pass; `grep -rn "mapSpellName\|spelledLetters\|spell-" src` → no match.
- [ ] **Step 6: Commit** `feat: drop the letter-tiles step from the map ladder`.

### Task 2: Capitais asks the Mapas countries, in three even levels

**Files:**
- Create: `src/data/capital-levels.json`
- Modify: `src/data/capitals.ts:43-45`, `README.md:43,50,77`
- Test: `src/data/capitals.test.ts`; fixtures in `src/engine/capitalFormats.test.ts`, `src/ui/screens/hub.test.ts`, `src/ui/screens/capitalQuiz.test.ts`, `src/ui/screens/capitalTable.test.ts` that break because a country moved level or left Capitais

**Interfaces:**
- Consumes: `mapPool(continent, MAP_ALL)` and `MAP_ALL` from `src/data/maps.ts`.
- Produces: `capitalPool(continent: ContinentKey, difficulty: Difficulty): Country[]`, same signature as today, with the new contents. `capital-levels.json` shape: `Record<Continent, { easy: string[]; medium: string[]; hard: string[] }>` of `iso2`.

- [ ] **Step 1: Write the failing tests** in `src/data/capitals.test.ts`:

```ts
const CONTINENTS = ['africa', 'americas', 'asia', 'europe', 'oceania'] as const;
const LEVELS = ['easy', 'medium', 'hard'] as const;

it('asks the Mapas countries of each continent, minus the entries Capitais excludes', () => {
  for (const c of CONTINENTS)
    expect(capitalPool(c, 'general').map((x) => x.iso2).sort()).toEqual(
      mapPool(c, MAP_ALL).filter((x) => !capitalsExcluded.includes(x.iso2)).map((x) => x.iso2).sort(),
    );
});

it('splits each continent into three levels that differ in size by at most one, each country in exactly one', () => {
  for (const c of CONTINENTS) {
    const levels = LEVELS.map((d) => capitalPool(c, d).map((x) => x.iso2));
    expect(levels.flat().sort()).toEqual(capitalPool(c, 'general').map((x) => x.iso2).sort());
    const sizes = levels.map((l) => l.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  }
});

it('builds each Mundo level from the continents levels of the same name', () => {
  for (const d of LEVELS)
    expect(capitalPool('world', d).map((x) => x.iso2).sort()).toEqual(CONTINENTS.flatMap((c) => capitalPool(c, d).map((x) => x.iso2)).sort());
});
```

- [ ] **Step 2: Run them.** `npx vitest run src/data/capitals.test.ts` → FAIL (Oceania `hard` is empty today, sizes differ).
- [ ] **Step 3: Seed `capital-levels.json`** with a throwaway script in the scratchpad, never committed: for each continent take the `general` pool above, sort by flag `tier` (stable, file order inside a tier), cut into thirds with the larger levels first (16 → 6/5/5, 55 → 19/18/18). Then read the boundary countries and move one across only when a well-known capital would land in Difícil or an obscure one in Fácil, keeping the sizes. Print the lists for the owner's review at the merge.
- [ ] **Step 4: Implement `capitalPool`.** `general` returns the continent's Mapas pool minus `capitalsExcluded`; `easy`/`medium`/`hard` map the JSON's `iso2` list to `Country`; `world` concatenates every continent for that difficulty, and `world` + `general` returns the whole Mapas pool minus `capitalsExcluded`. A missing `iso2` throws.
- [ ] **Step 5: Run the whole suite.** `npx vitest run`. Fix each fixture that broke only because its country moved level or left Capitais, by picking a country that is in the level the test uses; a test whose behaviour broke is a bug to stop on.
- [ ] **Step 6: Update the README** (`README.md:43,50,77`): Capitais asks the Mapas countries, split into three levels per continent by `src/data/capital-levels.json`.
- [ ] **Step 7: Gates and commit.** `npx vitest run`, `npx tsc --noEmit` → pass. Commit `feat: ask capitals of the map countries in three even levels`.

### Task 3: Pin a point on the map

**Files:**
- Modify: `src/ui/map/map.ts:25-30` (`MapView`) and its `view` object, `src/style.css` (`.map-pin`), `src/data/capitals.ts`
- Test: `src/ui/map/map.test.ts`, `src/data/capitals.test.ts`

**Interfaces:**
- Produces: `MapView.pin(coords: [longitude: number, latitude: number], label: string): void` draws an SVG `circle.map-pin` and a `text.map-label` at the projected point in the mark layer, sized by `sizeMarks` like the ring. `capitalCoords(country: Country): [number, number]` exported from `src/data/capitals.ts`, returning the entry's `coords`.

- [ ] **Step 1: Write the failing tests.** In `map.test.ts`, using the file's existing render and layout helpers:

```ts
it('pins a labelled point at a coordinate', () => {
  const view = renderMap({ continent: 'africa', level: MAP_ALL });
  view.pin(capitalCoords(egypt), 'Cairo');
  const pin = view.element.querySelector('circle.map-pin')!;
  expect(view.element.querySelector('text.map-label')!.textContent).toBe('Cairo');
  expect([Number(pin.getAttribute('cx')), Number(pin.getAttribute('cy'))]).toEqual(projectedPoint(capitalCoords(egypt)));
});

it('keeps every Capitais capital inside the frame focused on its country', () => {
  for (const continent of ['africa', 'americas', 'asia', 'europe', 'oceania'] as const)
    for (const country of capitalPool(continent, 'general')) {
      const view = renderMap({ continent, level: MAP_ALL });
      view.focus([country.iso2]);
      view.pin(capitalCoords(country), mainCapital(country));
      expect(insideViewBox(view, view.element.querySelector('circle.map-pin')!)).toBe(true);
    }
});
```

`projectedPoint` and `insideViewBox` are local helpers in the test file built on the same projection the map uses (see `src/ui/map/projection.ts`) and on the SVG `viewBox` attribute.

- [ ] **Step 2: Run them.** `npx vitest run src/ui/map/map.test.ts` → FAIL, `pin` is not a function.
- [ ] **Step 3: Implement `pin` and `capitalCoords`.** If the second test fails for some capital, the fix is in `focus`'s framing of that country: the frame must include the capital's coordinate.
- [ ] **Step 4: Run them** → PASS; `npx tsc --noEmit` → pass.
- [ ] **Step 5: Commit** `feat: pin a labelled point on the map`.

### Task 4: The capital ladder formats

**Files:**
- Modify: `src/engine/question.ts`, `src/engine/capitalFormats.ts`, `src/engine/answer.ts`, `src/ui/questions/capitalQuestions.ts`, `src/ui/questions/render.ts`, `src/ui/screens/capitalGame.ts`, `src/ui/navigation.ts:43`, `src/ui/screens/capitalResult.ts`
- Test: `src/engine/capitalFormats.test.ts`, `src/engine/ladderRound.test.ts`, `src/engine/answer.test.ts`, `src/ui/questions/capitalQuestions.test.ts`, `src/ui/questions/render.test.ts`, `src/ui/screens/capitalGame.test.ts`, `src/ui/screens/capitalResult.test.ts`

**Interfaces:**
- Consumes: `MapView.pin`, `capitalCoords` (Task 3); `capitalPool` (Task 2); `LadderRound(ctx, start, rng, ladder)`.
- Produces: `Question` variant `{ format: 'capitalOnMap'; target: Country; options: Country[] }`; `capitalOnMap: Format`; `CAPITAL_LADDER: readonly Format[]` = `[capitalOnMap, countryToCapitals, typeCapital, typeCapitalCountry]`, replacing `CAPITAL_FORMATS`; `capitalContext(continent, difficulty)` unchanged; `renderCapitalQuestion(question: CapitalQuestion, submit: Submit, scope?: MapScope): HTMLElement`; `renderQuestion` routes `capitalOnMap` with the scope and throws without one, as the map formats do; the `capitalResult` screen gains `done: number`.

- [ ] **Step 1: Write the failing tests.** In `capitalFormats.test.ts`:

```ts
it('builds the map bridge with the target and the 3 pool countries nearest by capital', () => {
  const ctx = capitalContext('africa', 'easy');
  const target = ctx.pool[0];
  const q = capitalOnMap.build(target, ctx, seededRng(1));
  expect(q.format).toBe('capitalOnMap');
  expect(new Set(q.options)).toEqual(new Set([target, ...nearestByCapital(target, ctx.pool, 3)]));
});

it('builds four distinct options on steps 1 and 2 for every country of every Learn level', () => {
  for (const continent of ['africa', 'americas', 'asia', 'europe', 'oceania'] as const)
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const ctx = capitalContext(continent, difficulty);
      for (const target of ctx.pool)
        for (const format of [capitalOnMap, countryToCapitals]) {
          const q = format.build(target, ctx, seededRng(2)) as { options: Country[] };
          expect(new Set(q.options).size).toBe(4);
        }
    }
});

it('climbs the capital ladder: map bridge, pick the capital, type the capital, type the country', () => {
  expect(CAPITAL_LADDER.map((f) => f.id)).toEqual(['capitalOnMap', 'countryToCapitals', 'typeCapital', 'typeCapitalCountry']);
});
```

In `ladderRound.test.ts`, with `capitalContext('oceania', 'easy')` and `CAPITAL_LADDER` started at step `2`: a typo of the target's capital on `typeCapital` returns `typos: [target]` and leaves `[round.stepOf(target), round.lives, round.answered]` at `[2, 3, 0]`; with the Américas level that holds Bolívia, typing either of its capitals (`Sucre`, `La Paz`) on `typeCapital` is right, and its step-1 question pins `Sucre`, the main capital. In `answer.test.ts`: `capitalOnMap` grades a choice of the target right and any other wrong. In `capitalQuestions.test.ts`: the `capitalOnMap` question shows "Em que país fica esta capital?", a map with `circle.map-pin` and the main capital as `text.map-label`, four buttons with flag and name, and submits `{ kind: 'choice', iso2 }`.

- [ ] **Step 2: Run them.** `npx vitest run src/engine src/ui/questions` → FAIL on the new tests.
- [ ] **Step 3: Implement.** `capitalOnMap` (`choice: true`, `recall: false`, options shuffled from the target plus `nearestByCapital(target, ctx.pool, 3)`); its `grade` branch with the choice formats; its renderer: `renderNameChoices('Em que país fica esta capital?', figure, options, submit, flagAndName)` where the figure is `renderMap(scope)` focused on `[target.iso2]` with `pin(capitalCoords(target), mainCapital(target))` and no country painted.
- [ ] **Step 4: Delete** `capitalToCountries`, `capitalPairs` and `capitalTrueFalse`: their `Question` variants, formats, `grade` cases, renderer cases, the `capitalPairs` branch of `capitalSolution`, and their tests, plus the `Round`-based choice-first test of `CAPITAL_FORMATS` in `capitalFormats.test.ts`. Keep `pairs.ts` and `trueFalse.ts`, which the flag formats use.
- [ ] **Step 5: Move `capitalGame.ts` onto the ladder**, since `CAPITAL_FORMATS` is gone. Tests first in `capitalGame.test.ts`: the first question is `capitalOnMap`; the top bar shows `0/${capitalPool('oceania', 'easy').length}`; answering every question right ends on `{ name: 'capitalResult', won: true, medal: 'gold', done: size, correct: size * 4, answered: size * 4 }`; three wrong answers then Encerrar ends on `{ won: false, medal: null, done: 0, correct: 0, answered: 3 }`; `renderQuestion` receives the scope `{ continent: 'oceania', level: MAP_ALL }`. In `capitalResult.test.ts`: with `done: 2` and not won, the title is `Você fez 2 de ${capitalPool('oceania', 'easy').length}`, and the stat stays `correct/answered acertos`. Run them → FAIL. Then: `new LadderRound(capitalContext(continent, difficulty), 0, Math.random, CAPITAL_LADDER)`, top bar `done/size` with progress `done / size` as `mapGame.ts` does, pass `{ continent, level: MAP_ALL }` to `renderQuestion`, add `done: number` to the `capitalResult` screen (`src/ui/navigation.ts:43`) and `done: round.done` to the leave; drop the `LEVEL_RULES`/`goalFor` use. `capitalResult.ts`: title from `learnResultTitle(won, medal, done, capitalPool(continent, difficulty).length)`.
- [ ] **Step 6: Gates.** `npx vitest run`, `npx tsc --noEmit` → pass.
- [ ] **Step 7: Commit** `feat: teach capitals with a map ladder`.

### Task 5: Hub cards and README

**Files:**
- Modify: `src/ui/screens/hub.ts:178-190`, `README.md:44`
- Test: `src/ui/screens/hub.test.ts`

**Interfaces:**
- Consumes: `capitalPool` (Task 2).

- [ ] **Step 1: Write the failing tests** in `hub.test.ts`: in Capitais, the Mundo tab shows no Aprender button and no medal tag on any card; a continent's Fácil card shows the medal tag `🏅 meta ${capitalPool(continent, 'easy').length}` and an Aprender button; Geral has no Aprender.
- [ ] **Step 2: Run them.** `npx vitest run src/ui/screens/hub.test.ts` → FAIL.
- [ ] **Step 3: Implement** in `capitalLevelCard`: `learn: continent !== 'world' && difficulty !== 'general'`, `goal: pool.length`.
- [ ] **Step 4: Update `README.md:44`** to describe the four-step ladder that starts from the capital pinned on the map, and that Mundo and Geral offer only the Quiz.
- [ ] **Step 5: Gates.** `npx vitest run`, `npx tsc --noEmit` → pass.
- [ ] **Step 6: Browser check** on a dev server of its own at 390px: play Capitais Oceania Fácil to the end and the first questions of Américas Difícil (Caribbean framing) and África with Guiné Equatorial if it comes up; play one Maps round to see the four steps. Report what was seen.
- [ ] **Step 7: Commit** `feat: offer capital Learn on every continent level and not on Mundo`.
