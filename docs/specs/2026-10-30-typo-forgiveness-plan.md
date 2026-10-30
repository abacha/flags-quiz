# Typo Forgiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refuse a misspelled typed country name without charging an error or a life, and keep another country's name a wrong answer.

**Architecture:** `src/engine/answer.ts` judges a typed name as right, typo or wrong against every country in `countries.json`. `Grade` carries the typo countries; `Round` and `Quiz` charge nothing on a typo and keep the question. The question renderers learn about a typo through the return value of `Submit` and show "Confira a grafia" in place.

**Tech Stack:** TypeScript, Vite, Vitest (jsdom). Run tests with `rtk npm test`, types with `rtk npm run typecheck`.

**Spec:** `docs/specs/2026-10-30-typo-forgiveness-design.md`

## Global Constraints

- Typo: not the normalized name or alias of any country in `countries.json`; edit distance to the target's nearest name or alias at most 2 (at most 1 when that name or alias has 5 characters or fewer after normalization); strictly closer to the target than to every other country. A tie is wrong.
- Edit distance is optimal string alignment (Damerau–Levenshtein with adjacent transposition cost 1), on `normalizeName` output.
- Copy: "Confira a grafia" on a typo. "Errado, tente de novo" stays for a wrong answer in Quiz.
- A typo charges nothing: no Quiz error or score change, no life, no `missed` entry, no `correct` count. The question stays and the typed text stays in its field.
- `typeSimilar`: any wrong field makes the answer wrong and only wrong fields go into `missed`; with no wrong field and at least one typo, the answer is a typo and the typo fields are marked.
- Commits as `Claude Code (Nexus agent) <claude-code@nexus.lan>` with the `Nexus-Agent: claude-code` trailer, pushed to `main`.

## Review Focus

- An alias of another country typed for the target (e.g. "UAE" for Uruguai): wrong, never a typo. Test in Task 1.
- Accents and case in a typo ("agrentína"): judged after `normalizeName`, so still a typo. Test in Task 1.
- A typo followed by the right answer on the same Learn question: the question resolves once, counted right, lives intact. Test in Task 3.
- A typo on the last open flag of a Quiz: the quiz stays `playing` and does not finish. Test in Task 2.
- Switching flags in Quiz after a typo: the message hides like it does after a wrong answer. Test in Task 2.

---

### Task 1: Judge a typed name

**Files:**
- Modify: `src/engine/answer.ts`
- Test: `src/engine/answer.test.ts`

**Interfaces:**
- Produces: `export type TypedVerdict = 'right' | 'typo' | 'wrong';` and `export function judgeTypedName(country: Country, text: string): TypedVerdict` in `src/engine/answer.ts`. `acceptsTypedName` stays as is (it is the `'right'` check and is used by `countries.test.ts`).

- [ ] **Step 1: Write the failing tests** in a `describe('judgeTypedName')` block, using `byIso` from the data the file already uses:
  - `judgeTypedName(ar, 'Argentina')` → `'right'`; `judgeTypedName(ar, 'agrentína')` → `'typo'`.
  - `judgeTypedName(au, 'Austria')` → `'wrong'` (Áustria is a country); `judgeTypedName(au, 'Australa')` → `'typo'`.
  - `judgeTypedName(ne, 'Nigeria')` → `'wrong'`.
  - `judgeTypedName(uy, 'UAE')` → `'wrong'` (alias of another country).
  - Short names: `judgeTypedName(pe, 'Pery')` → `'typo'`; `judgeTypedName(pe, 'Pxry')` → `'wrong'` (2 edits on a 4-letter name).
  - Far off: `judgeTypedName(ar, 'Brasilia')` → `'wrong'`.
  - Tie: `judgeTypedName(ml, 'Malia')` → `'wrong'` ("malia" is 1 edit from both "mali" and "malta").

- [ ] **Step 2: Run** `rtk npx vitest run src/engine/answer.test.ts` — expected FAIL, `judgeTypedName` is not exported.

- [ ] **Step 3: Implement** `judgeTypedName` and a private `editDistance(a: string, b: string): number` (optimal string alignment) in `src/engine/answer.ts`. Import the `countries` value from `../data/countries`. Precompute once, at module level, each country's normalized names and aliases. For the target: `right` if `acceptsTypedName`; `wrong` if the text equals any other country's normalized name or alias; otherwise the distance to the target's nearest name must be within the limit for that name's length and strictly smaller than the distance to every other country's nearest name, else `wrong`.

- [ ] **Step 4: Run** `rtk npx vitest run src/engine/answer.test.ts src/data/countries.test.ts` — expected PASS.

- [ ] **Step 5: Commit** `feat: tell a typo from a wrong country in a typed name`.

### Task 2: Charge nothing for a typo in Quiz

**Files:**
- Modify: `src/engine/quiz.ts:73-83`, `src/ui/screens/quiz.ts:128-190`
- Test: `src/engine/quiz.test.ts`, `src/ui/screens/quiz.test.ts`, `src/ui/screens/mapQuiz.test.ts`

**Interfaces:**
- Consumes: `judgeTypedName`, `TypedVerdict` from Task 1.
- Produces: `Quiz.answer(text: string): TypedVerdict` (was `boolean`).

- [ ] **Step 1: Write the failing tests.**
  - `quiz.test.ts`: on the current flag Argentina, `quiz.answer('Agrentina')` returns `'typo'`, `quiz.stateOf('ar')` stays `'open'`, `quiz.score` unchanged, `quiz.current` still Argentina; on the last open flag a typo leaves `quiz.status === 'playing'`.
  - `screens/quiz.test.ts`: typing a typo of the current flag shows the message with text `'Confira a grafia'`, keeps the typed text in the input, keeps the cell not `missed`, and leaves the HUD score unchanged; a wrong answer right after shows `'Errado, tente de novo'`; tapping another flag after a typo hides the message.
  - `mapQuiz.test.ts`: the same typo case shows `'Confira a grafia'` and keeps the country highlighted.

- [ ] **Step 2: Run** `rtk npx vitest run src/engine/quiz.test.ts src/ui/screens/quiz.test.ts src/ui/screens/mapQuiz.test.ts` — expected FAIL.

- [ ] **Step 3: Implement.** `Quiz.answer` returns the verdict and records an error only on `'wrong'`. In the screen, the submit handler clears the input only on `'right'` and `'wrong'`, sets the message text to `'Confira a grafia'` or `'Errado, tente de novo'`, and hides it on `'right'`. Existing call sites of `Quiz.answer` that used the boolean switch to `=== 'right'`.

- [ ] **Step 4: Run** `rtk npm test` — expected PASS.

- [ ] **Step 5: Commit** `feat: refuse a typo in the quiz without counting an error`.

### Task 3: Charge nothing for a typo in Learn and Maps

**Files:**
- Modify: `src/engine/answer.ts` (`Grade`, `grade`), `src/engine/round.ts:88-99`, `src/ui/questions/render.ts` (`Submit`), `src/ui/questions/typeName.ts`, `src/ui/questions/typeSimilar.ts`, `src/ui/screens/game.ts:76-82`, `src/ui/screens/mapGame.ts:79-92`, `src/style.css`
- Test: `src/engine/answer.test.ts`, `src/engine/round.test.ts`, `src/ui/questions/render.test.ts`, `src/ui/screens/game.test.ts`, `src/ui/screens/mapGame.test.ts`

**Interfaces:**
- Consumes: `judgeTypedName` from Task 1.
- Produces:
  - `Grade` becomes `{ correct: boolean; missed: Country[]; typos: Country[] }`. `typos` is non-empty only when the answer is refused as a typo, and then `correct` is false and `missed` is empty. Every other format returns `typos: []`.
  - `Submit` becomes `(answer: Answer) => Country[]`, returning the typo countries (empty when the answer was judged). Choice, pairs and true/false renderers ignore the return value.
  - `Round.answer` on a grade with typos returns it and keeps `current`, `lives`, `correct` and `missed` unchanged.

- [ ] **Step 1: Write the failing tests.**
  - `answer.test.ts`: `grade` of a `typeName` question for Argentina with `'Agrentina'` → `{ correct: false, missed: [], typos: [ar] }`; same for `mapTypeName`. `typeSimilar` with one typo field and the rest right → `typos` holds that country, `missed` empty; with one typo field and one wrong field → `correct: false`, `missed` holds only the wrong field's country, `typos: []`.
  - `round.test.ts`: answering a `typeName` question with a typo keeps `lives` at 3, `correct` and `missed` unchanged, and lets the same question be answered right afterwards, counting `correct` once.
  - `render.test.ts`: when `submit` returns `[target]`, the `typeName` form shows a `p.type-message` reading `'Confira a grafia'` and keeps the input value; for `typeSimilar`, the returned country's input gets class `typo` and the others do not.
  - `game.test.ts` and `mapGame.test.ts`: a typo on a typed question leaves the question interactive (not `inert`), appends no feedback sheet and leaves the HUD lives unchanged.

- [ ] **Step 2: Run** the five test files with `rtk npx vitest run …` — expected FAIL.

- [ ] **Step 3: Implement.**
  - `grade`: `typeName`/`mapTypeName` map the verdict to the three outcomes; `typeSimilar` judges every field and applies the multi-field rule from Global Constraints.
  - `Round.answer`: return early on `typos.length > 0` before clearing `current`.
  - `game.ts` and `mapGame.ts`: return `result.typos` before setting `inert` and rendering feedback when it is non-empty; return `[]` otherwise.
  - `typeName.ts` and `typeSimilar.ts`: a hidden `p.type-message` with `'Confira a grafia'` under the form, shown when `submit` returns typos and hidden on the next submit; `typeSimilar` toggles class `typo` per input. `mapTypeName` gets this through `renderTypeName`.
  - `style.css`: `.type-message` styled like `.quiz-message`, and `.type-form input.typo` with the wrong-answer border colour.

- [ ] **Step 4: Run** `rtk npm test` and `rtk npm run typecheck` — expected PASS.

- [ ] **Step 5: Commit** `feat: refuse a typo in learn and maps without losing a life`, mark the spec `Status: implemented` and its checklist in the same commit.
