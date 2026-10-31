# Capitals Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Capitais, a third hub area where the player learns and quizzes the capital of every country, in both directions, with tricky wrong options.

**Architecture:** Capital data lives in `src/data/capitals.json` keyed by `iso2`, read through `src/data/capitals.ts`. Six new question formats live in `src/engine/capitalFormats.ts` and plug into the existing `Round`, `grade()` and question renderers. The flag Quiz runner (`runQuiz`) gains a judge and a grid label so it serves capitals unchanged otherwise. Screens mirror the flag screens (`game`, `quiz`, `result`, `quizResult`, `flagTable`) with capital variants.

**Tech Stack:** TypeScript, Vite, Vitest (happy-dom for DOM tests). Run tests with `rtk npm test`, types with `rtk npm run typecheck`.

**Spec:** `docs/specs/2026-10-30-capitals-design.md`

## Global Constraints

- Levels: Fácil, Médio, Difícil and Geral by `countries.json` tiers, per continent and Mundo; pool = `poolFor(countries, continent, difficulty)` minus `capitals-excluded.json`.
- Excluded: `gb`, `tk`, `io`, `gs`, `nf`. Inglaterra (`gb-eng`) has Londres.
- A country is always shown with its flag and its name.
- Several capitals: any one is right; every revelation shows all of them joined by " / " (Bolívia: "Sucre / La Paz"). A choice option or a "capital shown" prompt uses the main (first) capital only.
- Distractor order: look-alike country names (`similar-names.json`), then look-alike capitals (`similar-capitals.json`), then the 8 pool countries nearest by great-circle distance between main-capital `coords`. Every level uses look-alikes. Only pool countries.
- Choice questions show 4 options.
- Typed capital: right if it matches any capital name or alias after `normalizeName`; wrong if it matches any other entry's capital name or alias; otherwise the typo rule of `judgeTypedName` (limit 2 edits, 1 for names of 5 characters or fewer, strictly closer than every other entry) against all capitals in `capitals.json`. Typo copy: "Confira a grafia".
- The feedback sheet shows the solution card with all capitals after right answers too.
- Storage keys: `flags-quiz:capital-medals` and `flags-quiz:capital-quiz-records`. Area key value `capitals`.
- Copy: area label "Capitais"; hub pill `N/24 capitais`; see-all `Ver as N capitais da África →`.
- Commits on `main` as `Claude Code (Nexus agent) <claude-code@nexus.lan>` with the `Nexus-Agent: claude-code` trailer. Do not push: a push to `main` deploys, and Adriano decides when.

## Review Focus

- Typing the country's own name as its capital where they differ ("Brasil" for Brasília): wrong, and "Guatemala" for Guatemala is right through an alias of "Cidade da Guatemala". Test in Task 2.
- Two near-identical capitals of different entries (Basseterre for Guadalupe's Basse-Terre): wrong, never a typo. Test in Task 2.
- A Learn round where the target has no look-alike in the pool (Fácil): all 3 distractors come from the nearest countries and none repeats. Test in Task 3.
- A Quiz answered with the second capital ("La Paz"): counts right and the grid shows "Sucre / La Paz". Test in Task 5.
- The hub remembering Capitais after a reload, and an unknown stored area falling back to Bandeiras. Test in Task 7.

---

### Task 1: Capital data

**Files:**
- Create: `src/data/capitals.json`, `src/data/capitals-excluded.json`, `src/data/similar-capitals.json`, `src/data/capitals.ts`
- Test: `src/data/capitals.test.ts`

**Interfaces:**
- Produces in `src/data/capitals.ts`:
  - `export interface Capital { name: string; aliases: string[] }`
  - `export const capitalsExcluded: readonly string[]`
  - `export const similarCapitals: readonly (readonly string[])[]`
  - `export function capitalsOf(country: Country): Capital[]` — throws `No capital for <iso2>` for an excluded entry.
  - `export function mainCapital(country: Country): string` — first capital's name.
  - `export function capitalLabel(country: Country): string` — all names joined by `' / '`.
  - `export function capitalPool(continent: ContinentKey, difficulty: Difficulty): Country[]`
  - `export function nearestByCapital(target: Country, pool: readonly Country[], count: number): Country[]` — same shape as `nearestCountries` in `src/data/maps.ts`, using `geoDistance` on `coords`.

- [ ] **Step 1: Write the failing tests** in `src/data/capitals.test.ts`:
  - every `countries.json` code is in exactly one of `capitals.json` keys or `capitals-excluded.json`, and both only hold known codes;
  - `capitalsExcluded` equals `['gb', 'gs', 'io', 'nf', 'tk']` (sorted);
  - every entry has ≥1 capital with a non-empty name, and `coords` with longitude in [-180, 180] and latitude in [-90, 90];
  - no normalized name or alias (`normalizeName`) appears in two entries;
  - `capitalLabel(bo)` → `'Sucre / La Paz'`; `capitalsOf(za).map(c => c.name)` → `['Pretória', 'Cidade do Cabo', 'Bloemfontein']`; `mainCapital(ps)` → `'Ramallah'` and `capitalsOf(ps)` has length 1; `mainCapital(il)` → `'Jerusalém'`; `mainCapital(gbEng)` → `'Londres'`; `mainCapital(nr)` → `'Yaren'`; `mainCapital(ch)` → `'Berna'`; `capitalsOf(gb)` throws;
  - every code in `similar-capitals.json` is in `capitals.json`, every group has ≥2 codes, and the groups include `['jm', 'vc']` (Kingston/Kingstown) and `['at', 'la']` (Viena/Vientiane);
  - `capitalPool('oceania', 'hard')` has length 7 and excludes `tk` and `nf`;
  - `nearestByCapital(ar, capitalPool('americas', 'general'), 1)` → `[uy]` (Buenos Aires–Montevidéu).

- [ ] **Step 2: Run** `rtk npx vitest run src/data/capitals.test.ts` — expected FAIL, module missing.

- [ ] **Step 3: Write the data.** Capitals per the spec's "Which capital" and "Disputed capitals" calls, Brazilian Portuguese names (pt.wikipedia), aliases with the local and English spellings and, where the capital is named after the country, the bare country form ("Guatemala" for "Cidade da Guatemala", "Kuwait" for "Cidade do Kuwait"). `coords` rounded to 2 decimals. Seed `similar-capitals.json` with the spec's examples plus groups in the same spirit (Brasília/Bratislava/Brazzaville, Bangui/Banjul, Malé/Malabo, Basseterre/Basse-Terre, the "Port …" capitals, Lima/Lomé, Riga/Riad). Cite the source in the commit body.

- [ ] **Step 4: Implement** `src/data/capitals.ts` (JSON imports as in `countries.ts`; `capitalPool` filters `poolFor(countries, continent, difficulty)` by `capitalsExcluded`).

- [ ] **Step 5: Run** `rtk npx vitest run src/data/capitals.test.ts` — expected PASS.

- [ ] **Step 6: Commit** `feat: add the capital of every country`.

### Task 2: Judge a typed capital

**Files:**
- Modify: `src/engine/answer.ts`
- Test: `src/engine/answer.test.ts`

**Interfaces:**
- Consumes: `capitalsOf`, `capitalsExcluded` from Task 1.
- Produces: `export function judgeTypedCapital(country: Country, text: string): TypedVerdict`. `judgeTypedName` keeps its signature; both call a private `judgeTyped(target: Country, text: string, names: Map<Country, string[]>): TypedVerdict` holding the existing algorithm, where `names` maps each candidate entry to its normalized spellings.

- [ ] **Step 1: Write the failing tests** in `describe('judgeTypedCapital')`:
  - `(bo, 'La Paz')` and `(bo, 'sucre')` → `'right'`; `(fr, 'Pariss')` → `'typo'`; `(vc, 'Kingston')` → `'wrong'`; `(gp, 'Basseterre')` → `'wrong'`; `(br, 'Brasil')` → `'wrong'`; `(gt, 'Guatemala')` → `'right'`; `(pe, 'Lomé')` → `'wrong'`; `(pe, 'Lina')` → `'typo'`; `(ps, 'Jerusalém')` → `'wrong'`.
  - Existing `judgeTypedName` tests still pass untouched.

- [ ] **Step 2: Run** `rtk npx vitest run src/engine/answer.test.ts` — expected FAIL, not exported.

- [ ] **Step 3: Implement** the `judgeTyped` extraction and `judgeTypedCapital` with a module-level map over the entries of `capitals.json`.

- [ ] **Step 4: Run** `rtk npx vitest run src/engine/answer.test.ts` — expected PASS.

- [ ] **Step 5: Commit** `feat: tell a typo from a wrong capital`.

### Task 3: Capital formats and grading

**Files:**
- Modify: `src/engine/question.ts`, `src/engine/answer.ts` (`grade`), `src/engine/round.ts` only if `spentBy` needs it (it does not: pairs spend the target only, as `mapPairs`)
- Create: `src/engine/capitalFormats.ts`
- Test: `src/engine/capitalFormats.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2.
- Produces:
  - `Question` gains `{ format: 'countryToCapitals' | 'capitalToCountries'; target; options: Country[] }`, `{ format: 'capitalPairs'; target; countries: Country[] }`, `{ format: 'capitalTrueFalse'; target; shown: Country }`, `{ format: 'typeCapital' | 'typeCapitalCountry'; target }` (as separate union members, like the existing ones).
  - `export const countryToCapitals, capitalToCountries, capitalPairs: Format` (`choice: true`), `capitalTrueFalse` (`choice: false, recall: false`), `typeCapital, typeCapitalCountry` (`choice: false, recall: true`).
  - `export const CAPITAL_FORMATS: readonly Format[]` (the six).
  - `export function capitalContext(continent: ContinentKey, difficulty: Difficulty): FormatContext` — `pool` and `world` = `capitalPool(...)`, `similarGroups: []`, `similarNames` from data, `similarDistractors: true`.
  - `export function trickyOthers(target: Country, ctx: FormatContext, count: number, rng: Rng): Country[]` — `count` distinct pool countries: shuffled look-alike names first, then shuffled look-alike capitals, then a random sample of `nearestByCapital(target, ctx.pool, 8)`, de-duplicated, never the target.
- `grade()`: `countryToCapitals`/`capitalToCountries` as choice; `capitalPairs` as links; `capitalTrueFalse` as yesNo (`shown === target`); `typeCapital` with `judgeTypedCapital`; `typeCapitalCountry` with `judgeTypedName`. Typos return `{ correct: false, missed: [], typos: [target] }` as `typeName` does.

- [ ] **Step 1: Write the failing tests** (seeded with `seededRng`, style of `mapFormats.test.ts`):
  - `trickyOthers(ir, capitalContext('asia','general'), 3, rng)` contains `iq`; `trickyOthers(vc, capitalContext('americas','general'), 3, rng)` contains `jm`; result never contains the target and has no duplicates, for every target of `capitalContext('europe','easy')`; for a target there with no look-alike in that pool, all 3 come from `nearestByCapital(target, pool, 8)`.
  - Look-alikes outside the pool are skipped: for a target whose look-alike sits in another tier, `trickyOthers` on that tier's context returns only pool members.
  - `countryToCapitals.build` gives 4 options including the target; `capitalPairs.build` gives 4 countries including the target; `capitalTrueFalse.build` over 50 seeds shows the target sometimes and a `trickyOthers` member otherwise.
  - `grade` for each format: right and wrong answers; `typeCapital` with "La Paz" for `bo` → correct; with "Pariss" for `fr` → typo.
  - A `Round` over `capitalContext('oceania','hard')` with `CAPITAL_FORMATS` answered right every time reaches `won`, and every country's first question is a choice format.

- [ ] **Step 2: Run** `rtk npx vitest run src/engine/capitalFormats.test.ts` — expected FAIL.

- [ ] **Step 3: Implement** the formats, `trickyOthers`, `capitalContext` and the `grade` cases.

- [ ] **Step 4: Run** `rtk npm test` and `rtk npm run typecheck` — expected PASS (the `switch` in `renderQuestion` will need the new cases; add a temporary `throw` there only if typecheck forces it and replace it in Task 4).

- [ ] **Step 5: Commit** `feat: ask capitals in six formats with tricky options`.

### Task 4: Render the capital questions

**Files:**
- Create: `src/ui/questions/capitalQuestions.ts`
- Modify: `src/ui/questions/render.ts`, `src/ui/questions/choices.ts` (`renderNameChoices` label), `src/ui/questions/pairs.ts` (label), `src/ui/questions/typeName.ts` (placeholder), `src/ui/questions/feedback.ts`
- Test: `src/ui/questions/capitalQuestions.test.ts`, `src/ui/questions/render.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 3.
- Produces:
  - `renderNameChoices(prompt, figure, options, submit, label: (c: Country) => string = (c) => c.name)`.
  - `PairsOptions.label?: (c: Country) => string` (default name), used for the name buttons, their sort and the `pair-label`.
  - `renderTypeName(prompt, figure, submit, placeholder = 'Nome')`.
  - `renderFeedback(question, result, onContinue, solutionOverride?, showOnRight = false)` — when `showOnRight`, the solution shows on a right answer too.
  - `export function countryFigure(country: Country): HTMLElement` — flag and name.
  - `export function capitalCard(country: Country): HTMLElement` — `solutionCard(country, `${country.name} · ${capitalLabel(country)}`)`.
  - `export function capitalSolution(question: Question): HTMLElement` — `capitalPairs`: grid of `capitalCard` for its countries; otherwise `capitalCard(target)`.
  - `export function renderCapitalQuestion(question: CapitalQuestion, submit: Submit): HTMLElement`, with `CapitalQuestion` the union of the six formats.
- Copy:
  - `countryToCapitals`: "Qual é a capital deste país?", `countryFigure(target)`, options labelled by `mainCapital`.
  - `capitalToCountries`: "De que país é esta capital?", a figure with `mainCapital(target)` in large text, options as buttons with flag and name.
  - `capitalPairs`: "Ligue cada país à sua capital", faces `countryFigure`, labels `mainCapital`.
  - `capitalTrueFalse`: `A capital de ${target.name} é ${mainCapital(shown)}?`, `countryFigure(target)`.
  - `typeCapital`: "Escreva a capital deste país", `countryFigure(target)`, placeholder "Capital".
  - `typeCapitalCountry`: "De que país é esta capital?", the capital figure, placeholder "País".

- [ ] **Step 1: Write the failing DOM tests**: each format renders its prompt; choosing the target's option submits `{ kind: 'choice', iso2 }`; `capitalPairs` lists the 4 main capitals sorted; `typeCapital` shows "Confira a grafia" when `submit` returns typos; `renderFeedback(..., true)` on a right answer contains "Sucre / La Paz" for `bo`; existing `render.test.ts` and feedback tests unchanged.

- [ ] **Step 2: Run** `rtk npx vitest run src/ui/questions` — expected FAIL.

- [ ] **Step 3: Implement** and route the six formats in `renderQuestion` to `renderCapitalQuestion`.

- [ ] **Step 4: Run** `rtk npm test` and `rtk npm run typecheck` — expected PASS.

- [ ] **Step 5: Commit** `feat: draw the capital questions`.

### Task 5: Capital records, Learn and Quiz screens

**Files:**
- Create: `src/capitalRecords.ts`, `src/ui/screens/capitalGame.ts`, `src/ui/screens/capitalQuiz.ts`, `src/ui/screens/capitalResult.ts`, `src/ui/screens/capitalQuizResult.ts`
- Modify: `src/engine/quiz.ts`, `src/ui/screens/quiz.ts`, `src/ui/navigation.ts`, `src/ui/results.ts`, `src/main.ts`
- Test: `src/capitalRecords.test.ts`, `src/engine/quiz.test.ts`, `src/ui/screens/capitalGame.test.ts`, `src/ui/screens/capitalQuiz.test.ts`, `src/ui/screens/capitalQuizResult.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  - `capitalRecords.ts`: `loadCapitalMedals`, `awardCapitalMedal(store, continent, difficulty, medal)`, `loadCapitalQuizRecords`, `saveCapitalQuizOutcome(store, continent, difficulty, outcome): NewRecords`, shaped like `mapRecords.ts` with `Difficulty` levels and the keys of the Global Constraints.
  - `Quiz` constructor `(pool, rng, nearest?, judge: (country: Country, text: string) => TypedVerdict = judgeTypedName)`.
  - `QuizSpec` gains `judge?`, `placeholder?` (default "Nome"); `flagGrid` becomes `export function quizGrid(label: (country: Country, state: FlagState) => string)` returning the board factory; flags use `state === 'answered' ? name : ''`, capitals use `state === 'answered' ? `${name} · ${capitalLabel}` : name`.
  - `Screen` gains `capitalGame`, `capitalResult`, `capitalQuiz`, `capitalQuizResult` with the fields of `game`, `result`, `quiz`, `quizResult`.
  - `results.ts`: `flagLadder` mode widens to `'game' | 'quiz' | 'capitalGame' | 'capitalQuiz'`.
- Screens copy the flag screens with: title prefix `Capitais · `; `capitalContext` + `CAPITAL_FORMATS` + `goalFor`/`recallWeight` in Learn; feedback with `capitalSolution(question)` and `showOnRight = true`; review cards `capitalCard`; review headings "Capitais para revisar", "Capitais sem resposta (N)", "Capitais que você errou"; World result `continentReport` studying `capitalGame`; Quiz dock figure `countryFigure(current)`, judge `judgeTypedCapital`, placeholder "Capital".

- [ ] **Step 1: Write the failing tests**:
  - `capitalRecords.test.ts`: saving a Capitais outcome leaves `flags-quiz:quiz-records-v2` and `flags-quiz:map-quiz-records-v2` untouched; medals likewise.
  - `quiz.test.ts`: a `Quiz` built with `judgeTypedCapital` accepts "La Paz" for `bo`, returns `'typo'` for "Pariss" on `fr` without an error.
  - `capitalQuiz.test.ts`: every cell shows its country name before any answer; answering "La Paz" on Bolívia shows "Bolívia · Sucre / La Paz"; finishing navigates to `capitalQuizResult` and writes the capital records key.
  - `capitalGame.test.ts`: a right answer shows the feedback with the capital card; winning awards a medal under `flags-quiz:capital-medals` and navigates to `capitalResult`.
  - `capitalQuizResult.test.ts`: World result shows the continent report and missed capital cards.

- [ ] **Step 2: Run** the new test files — expected FAIL.

- [ ] **Step 3: Implement** records, `Quiz` judge, `runQuiz` options, the four screens and the `main.ts` routes.

- [ ] **Step 4: Run** `rtk npm test` and `rtk npm run typecheck` — expected PASS.

- [ ] **Step 5: Commit** `feat: play capitals in Learn and Quiz`.

### Task 6: Capital table

**Files:**
- Create: `src/ui/screens/capitalTable.ts`
- Modify: `src/ui/navigation.ts`, `src/main.ts`
- Test: `src/ui/screens/capitalTable.test.ts`

**Interfaces:**
- Produces: `Screen` `{ name: 'capitalTable'; continent: ContinentKey }`; `renderCapitalTable(root, navigate, continent)` like `renderFlagTable`, over `capitalPool(continent, 'general')`, cards `capitalCard`, header count `N capitais`, alphabetical by country name.

- [ ] **Step 1: Write the failing test**: Africa table lists every Africa capital pool country in `pt` order with its capitals; Voltar navigates to the hub.
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement** and route.
- [ ] **Step 4: Run** `rtk npm test` — expected PASS.
- [ ] **Step 5: Commit** `feat: list the capitals of a continent`.

### Task 7: Hub area and README

**Files:**
- Modify: `src/continentChoice.ts`, `src/ui/screens/hub.ts`, `README.md`, `docs/specs/2026-10-30-capitals-design.md` (Status: implemented)
- Test: `src/continentChoice.test.ts`, `src/ui/screens/hub.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 5, 6.
- Produces: `Area = 'flags' | 'maps' | 'capitals'`; `loadArea` returns the stored value when it is one of the three, `'flags'` otherwise.

- [ ] **Step 1: Write the failing tests**:
  - `continentChoice.test.ts`: `saveArea('capitals')` then `loadArea` → `'capitals'`; stored `'nope'` → `'flags'`.
  - `hub.test.ts`: the selector shows "Bandeiras", "Mapas", "Capitais"; choosing Capitais shows four cards with `capitalPool` counts (`N países`), the medal goal from `goalFor`, the pill `0/24 capitais`, tab counts `0/4`; a completed record in `flags-quiz:capital-quiz-records` turns the pill to `1/24 capitais`; Aprender navigates to `capitalGame`, Quiz to `capitalQuiz`; the see-all button reads `Ver as N capitais da África →` and navigates to `capitalTable`.
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement** the third area in the hub (`saved`, `levelsOf`, `tabCount`, pill, cards, see-all) and add a README paragraph on Capitais and `capitals.json` in the Data section.
- [ ] **Step 4: Run** `rtk npm test`, `rtk npm run typecheck`, `rtk npm run build` — expected PASS.
- [ ] **Step 5: Check in the browser** at 390 px width (`npm run dev`): hub selector with three areas fits, each Learn format and the Quiz grid render without horizontal scroll.
- [ ] **Step 6: Commit** `feat: add Capitais to the hub`.
