# Map Learn Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Maps Learn formats with a five-step ladder per country that a player can climb from zero map knowledge.

**Architecture:** Three new question shapes join `mapToNames` and `mapTypeName` as the ordered `MAP_LADDER` in `src/engine/mapFormats.ts`. A new `LadderRound` in `src/engine/ladderRound.ts` keeps each country's step, the lives and the done set, and `mapGame` uses it in place of `Round`. The removed formats (`nameToMap`, `mapPairs`, `mapTrueFalse`) are deleted last, once nothing uses them.

**Tech Stack:** TypeScript, Vite, vanilla DOM, Vitest with happy-dom.

**Spec:** `docs/specs/2026-11-01-map-learn-ladder-design.md`

## Global Constraints

- Code, identifiers and commit messages in English; player-facing copy in Portuguese.
- 3 lives (`STARTING_LIVES`); medal by lives left (gold 3, silver 2, bronze 1); continue without medal after the last life, as today.
- Distractors of steps 1–3: 3 countries drawn among the 8 nearest of the level's pool (`nearestCountries(target, pool, 8)`).
- Regions start every country at step 1; `MAP_ALL` ("Continente inteiro", "Mundo inteiro") starts at step 3.
- Review gap: `REVIEW_GAP` (5) from `src/engine/round.ts`, capped at remaining countries minus 1.
- Maps storage keys and saved medals unchanged.
- Run tests with `rtk npx vitest run <path>`; typecheck with `rtk npm run typecheck`.

## Review Focus

- A name with spaces, hyphens or an apostrophe ("Guiné-Bissau", "Costa do Marfim", "São Tomé e Príncipe") at step 4: separators sit in place in the slots, are never tiles, and the assembled answer grades right.
- A name with a repeated letter ("Senegal"): placing either "e" tile in either "e" slot grades right.
- The last remaining country of a round inside the review gap: the round asks it again instead of stalling.
- A player who continues without a medal after losing every life: the round goes on until every country is done and ends without a medal.
- A typo at step 5: no life lost and the country's step unchanged.

---

### Task 1: The three new question shapes and the ladder

**Files:**
- Modify: `src/engine/question.ts` (Question union)
- Modify: `src/engine/mapFormats.ts`
- Modify: `src/engine/answer.ts` (`grade`)
- Test: `src/engine/mapFormats.test.ts`

**Interfaces:**
- Produces, in the `Question` union:
  - `{ format: 'mapFlagToNames'; target: Country; options: Country[] }` (step 1)
  - `{ format: 'mapToFlags'; target: Country; options: Country[] }` (step 2)
  - `{ format: 'mapSpellName'; target: Country; letters: string[] }` (step 4)
- Produces in `mapFormats.ts`: `mapFlagToNames`, `mapToFlags`, `mapSpellName: Format`; `MAP_LADDER: readonly Format[]` = `[mapFlagToNames, mapToFlags, mapToNames, mapSpellName, mapTypeName]`; `ladderStart(level: MapLevel): number` (0-based index into `MAP_LADDER`); `spelledLetters(name: string): string[]` (the name's letters without separators, in order).
- Grading: `mapFlagToNames` and `mapToFlags` take a `choice` answer graded like `mapToNames`. `mapSpellName` takes a `text` answer, right only when `text === target.name` exactly, never a typo.

- [ ] **Step 1: Write the failing tests** in `mapFormats.test.ts`, a new `describe('map ladder')`:
  - `it('orders the ladder from flag hint to bare typing')`: `MAP_LADDER.map((f) => f.id)` equals `['mapFlagToNames', 'mapToFlags', 'mapToNames', 'mapSpellName', 'mapTypeName']`.
  - `it('starts regions at step 1 and whole maps at step 3')`: `ladderStart('west-coast') === 0`, `ladderStart(MAP_ALL) === 2`.
  - `it('draws step 1 and step 2 options from the 8 nearest countries')`: over seeds 1–20 on `mapContext('americas', MAP_ALL)` with Guatemala, every option of both formats is the target or in `nearestCountries(gt, pool, 8)`, options are 4 distinct countries including the target.
  - `it('shuffles exactly the letters of the name without separators')`: `spelledLetters('Guiné-Bissau')` equals `[...'GuinéBissau']`; `spelledLetters("Costa do Marfim")` has no space; `mapSpellName.build(c('ci'), ctx, seededRng(1))` has `letters` sorted equal to `spelledLetters(c('ci').name)` sorted. Use the name of `ci` from `countries.json`, whatever its apostrophes or spaces.
  - `it('grades step 4 only on the exact name')`: `grade({ format: 'mapSpellName', target: c('sn'), letters }, { kind: 'text', text: 'Senegal' })` is right; `'Senagel'` is `{ correct: false, missed: [sn], typos: [] }`.
  - `it('grades steps 1 and 2 against the target')`: right choice correct, other choice wrong with `missed: [target]`.

- [ ] **Step 2: Run** `rtk npx vitest run src/engine/mapFormats.test.ts` — expect the new tests to FAIL on missing exports.

- [ ] **Step 3: Implement.** Add the three union members; the formats follow the `mapToNames` pattern (`recall: false`; `choice: true` for steps 1 and 2, `false` for step 4). `spelledLetters` drops spaces, hyphens and apostrophes (`'` and `’`), splitting by code point so accented letters stay one letter. Add the grade cases in `answer.ts`.

- [ ] **Step 4: Run** the same command — expect PASS — and `rtk npm run typecheck`. The typecheck fails in `src/ui/questions/render.ts` on the unhandled new formats; add the three formats to its `case 'mapToNames':` group so they route to `renderMapQuestion`, and add them to `MapQuestion` in `mapQuestions.ts` with a temporary `throw new Error('not rendered yet')` branch that Task 3 replaces.

- [ ] **Step 5: Commit** `feat: add the flag, flag-choice and spelling steps of the map ladder`.

### Task 2: LadderRound

**Files:**
- Create: `src/engine/ladderRound.ts`
- Create: `src/engine/ladderRound.test.ts`
- Modify: `src/engine/round.ts` (export `MEDAL_BY_LIVES`)

**Interfaces:**
- Consumes: `MAP_LADDER`, `Format`, `FormatContext`, `grade`, `Grade`, `Answer`, `REVIEW_GAP`, `STARTING_LIVES`, `MEDAL_BY_LIVES`, `RoundStatus`, `Medal`, `pickOne`, `Rng`.
- Produces:

```ts
export class LadderRound {
  constructor(ctx: FormatContext, start: number, rng: Rng, ladder?: readonly Format[]); // ladder defaults to MAP_LADDER
  lives: number;
  readonly missed: Country[];
  get done(): number;   // countries that answered the last step right
  get size(): number;   // ctx.pool.length
  get status(): RoundStatus; // 'won' when done === size; 'lost' when lives <= 0 and not continued
  get medal(): Medal | null;
  stepOf(country: Country): number; // 0-based
  continueWithoutMedal(): void;
  nextQuestion(): Question;
  answer(answer: Answer): Grade;
}
```

- Rules: every pool country starts at `start`. `nextQuestion` picks at random among countries not done and not asked within the last `min(REVIEW_GAP, notDone - 1)` questions; if that leaves none, among all not done. It builds `ladder[stepOf(target)]`. `answer`: a typo grade changes nothing and keeps the current question; right on the last step marks the country done; right otherwise climbs one step; wrong costs a life (floor 0), drops one step (floor 0) and adds the target to `missed` once. Guard errors as `Round` does (`nextQuestion` while not playing or with an unanswered question, `answer` with none).

- [ ] **Step 1: Write the failing tests** in `ladderRound.test.ts`, on `mapContext('africa', 'west-coast')` (or any region) with `seededRng`:
  - `it('asks every country at the start step first')`: with `start = 0`, the first question of each country is `mapFlagToNames`; with `start = 2` it is `mapToNames`.
  - `it('climbs one step on a right answer and drops one on a wrong one')`: answer right twice for the same country across questions, `stepOf` goes 0→1→2; answer wrong, it goes to 1 and `lives` to 2.
  - `it('never drops below step 1')`: wrong at step 0 stays 0.
  - `it('marks a country done after the last step and stops asking it')`.
  - `it('wins only when every country is done, with the medal by lives left')`: answering always right ends `won` with `gold` and `done === size`; one wrong answer along the way ends `silver`.
  - `it('keeps step and lives on a typo')`: at `mapTypeName`, answer `'Senagel'`-style typo for the target name (use a typo the existing typo tests accept), `stepOf` and `lives` unchanged, question still current.
  - `it('asks the last remaining country again despite the gap')`: drive to one country left; `nextQuestion` twice in a row targets it.
  - `it('goes on after continuing without a medal and ends without one')`: lose 3 lives, `status === 'lost'`, `continueWithoutMedal()`, answer right to the end, `status === 'won'`, `medal === null`.
  - `it('never repeats a country within the review gap while others remain')`.

- [ ] **Step 2: Run** `rtk npx vitest run src/engine/ladderRound.test.ts` — expect FAIL.

- [ ] **Step 3: Implement** `LadderRound` per the interface.

- [ ] **Step 4: Run** the same command — expect PASS.

- [ ] **Step 5: Commit** `feat: climb each map country up a five-step ladder`.

### Task 3: Render the new steps

**Files:**
- Create: `src/ui/questions/spellName.ts`
- Create: `src/ui/questions/spellName.test.ts`
- Modify: `src/ui/questions/choices.ts` (`renderFlagChoices` takes an optional figure)
- Modify: `src/ui/questions/mapQuestions.ts`
- Test: `src/ui/questions/mapQuestions.test.ts`

**Interfaces:**
- Consumes: `spelledLetters` (Task 1), `highlightedMap`, `flagFigure`, `renderNameChoices`, `renderFlagChoices`.
- Produces:
  - `renderFlagChoices(prompt: string, options: Country[], submit: Submit, figure?: HTMLElement): HTMLElement` — the figure, when given, sits between the heading and the grid.
  - `renderSpellName(prompt: string, figure: HTMLElement, name: string, letters: string[], submit: Submit): HTMLElement`.
- Copy: step 1 "Que país é este?", map plus the target's flag (`flagFigure`) in one figure; step 2 "Qual é a bandeira deste país?"; step 4 "Monte o nome deste país", confirm button "Responder".
- Spelling DOM: `.spell-slots` with one `.spell-slot` per character of `name`; separator characters render as `.spell-gap` showing the character, the others start empty. `.spell-tiles` with one `button.spell-tile` per letter of `letters`. Tapping a tile fills the first empty slot and disables the tile; tapping a filled slot empties it and re-enables that same tile. "Responder" is disabled until every slot is filled, then submits `{ kind: 'text', text }` with the slots read in order, separators included.

- [ ] **Step 1: Write the failing tests.**
  - `spellName.test.ts`: `it('shows separators in place and one tile per letter')` for "Guiné-Bissau" (11 tiles, a `.spell-gap` with "-"); `it('fills the next slot and sends a letter back when its slot is tapped')`; `it('enables Responder only when every slot is filled')`; `it('submits the assembled name with its separators')` — tapping tiles in the name's order on "Costa do Marfim" submits exactly that text; `it('accepts either copy of a repeated letter')` on "Senegal".
  - `mapQuestions.test.ts`: `it('shows the flag next to the highlighted country at step 1')` — the rendered `mapFlagToNames` has a highlighted country and an `img.flag` of the target, and a name button submits its `iso2`; `it('offers four flags at step 2')` — `mapToFlags` renders 4 `.flag-option` beside the map, each submitting its `iso2`; `it('opens step 4 on the highlighted country')`.

- [ ] **Step 2: Run** `rtk npx vitest run src/ui/questions` — expect the new tests to FAIL.

- [ ] **Step 3: Implement** `renderSpellName`, the optional figure in `renderFlagChoices`, and the three `renderMapQuestion` branches, replacing Task 1's temporary throw.

- [ ] **Step 4: Run** `rtk npx vitest run src/ui/questions` and `rtk npm run typecheck` — expect PASS. Add `.spell-*` styles to `src/style.css` matching the existing tile and option buttons.

- [ ] **Step 5: Commit** `feat: render the flag, flag-choice and spelling map steps`.

### Task 4: Play Maps Learn on the ladder

**Files:**
- Modify: `src/ui/screens/mapGame.ts`, `src/ui/screens/mapGame.test.ts`
- Modify: `src/ui/screens/mapResult.ts`, `src/ui/screens/mapResult.test.ts`
- Modify: `src/ui/navigation.ts` (`mapResult` screen: `correct` becomes `done`)
- Modify: `src/ui/screens/hub.ts`, `src/ui/screens/hub.test.ts`
- Modify: `README.md` (Mapas Aprender paragraph, line 23)

**Interfaces:**
- Consumes: `LadderRound`, `ladderStart`, `mapContext`.
- Produces: `{ name: 'mapResult'; continent; level; won; medal; done: number; missed }`.

- [ ] **Step 1: Write the failing tests.**
  - `mapGame.test.ts`: update `correctAnswer`/`wrongAnswer` for the five ladder formats (`mapSpellName` right = target name, wrong = `''`). `it('shows done out of the region size')` — HUD reads `0/${region.length}` at start; `it('starts a region at the flag step and the whole continent at the name step')`; `it('wins when every country is done and saves the medal')` — answering right throughout navigates to `mapResult` with `won: true`, `medal: 'gold'`, `done: region.length`.
  - `mapResult.test.ts`: stat block reads `${done}/${size}` labelled "países"; the lost title reads "Você fez N de size".
  - `hub.test.ts`: the map card's medal tag reads `🏅 meta ${mapPool(continent, level).length}`.

- [ ] **Step 2: Run** `rtk npx vitest run src/ui/screens` — expect FAIL.

- [ ] **Step 3: Implement.** `mapGame` builds `new LadderRound(mapContext(continent, level), ladderStart(level), Math.random)`; HUD counter `${round.done}/${round.size}` with progress `done / size`; `finish` passes `done`. `mapResult` uses the pool size as the goal. `hub.mapLevelCard` goal is `pool.length`. Rewrite README line 23 to describe the ladder in one or two sentences, one sentence per line.

- [ ] **Step 4: Run** `rtk npx vitest run` and `rtk npm run typecheck` — expect PASS.

- [ ] **Step 5: Commit** `feat: play Maps Learn on the step ladder`.

### Task 5: Remove the old map formats

**Files:**
- Modify: `src/engine/question.ts`, `src/engine/answer.ts`, `src/engine/mapFormats.ts`, `src/engine/mapFormats.test.ts`, `src/engine/round.test.ts`, `src/ui/questions/render.ts`, `src/ui/questions/mapQuestions.ts`, `src/ui/questions/mapQuestions.test.ts`, `src/ui/screens/hub.test.ts`
- Modify: `docs/specs/2026-11-01-map-learn-ladder-design.md` (Status: implemented)

**Interfaces:**
- Removes: `nameToMap`, `mapPairs`, `mapTrueFalse` (union members, formats, grade cases, renderers, tests); `mapFormats()`, `mapDifficulty()` and the `CONTINENT_FORMATS`/`REGION_FORMATS` lists. `mapSolution` paints only the target.

- [ ] **Step 1: Delete** the three formats and the two functions; drop their tests and the `mapPairs` branch of `solutionCountries`. Keep `renderPairs` and `renderYesNo` if the flag or capital areas still use them (`grep` first).

- [ ] **Step 2: Run** `rtk npm run typecheck` and `rtk npx vitest run` — expect PASS with no reference left: `grep -rn "nameToMap\|mapPairs\|mapTrueFalse\|mapDifficulty\|mapFormats(" src` returns nothing.

- [ ] **Step 3: Commit** `refactor: drop the map formats the ladder replaced`.
