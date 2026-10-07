# Quiz Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Quiz mode's one-flag view and its skipping with a grid of every flag of the level, where the player answers the highlighted flag in a field docked at the bottom and taps any other flag to switch to it.

**Architecture:** The `Quiz` engine keeps a fixed grid order (`flags`), a current index, the answered set and the misses per flag; `select(iso2)` moves the current flag, a right answer moves to the next unanswered flag in grid order with wrap-around, and `skip`, `openSkipped` and `skippedCount` go away. The quiz screen builds the grid once (lazy-loaded thumbnails) and repaints cell classes in place after every action; the screen is a full-height flex column whose grid scrolls on its own above a dock holding the large current flag, the "Errado" message and the answer form, so the dock never covers the grid. Removing "Pular" also retires the `data-rapid-taps` opt-out in the global multi-click guard.

**Tech Stack:** Vite, TypeScript (strict), Vitest, plain DOM, `happy-dom` (already a dev dependency) for the quiz screen test.

**Spec:** `docs/specs/2026-10-07-quiz-grid-design.md`, which changes `docs/specs/2026-10-06-quiz-mode-design.md`.

**Runs after:** `docs/specs/2026-10-07-world-and-territories-plan.md` is complete, its Task 5 docs commit included, on `main`.

## Global Constraints

- Code, identifiers, comments and commit messages in English; every string the player sees in Brazilian Portuguese.
- Execute on `main`, without a worktree; one implementer at a time.
- Player-facing strings stay exactly as today: "Encerrar", "Responder", "Nome" (placeholder), "Errado, tente de novo", "N pts", "N/M". "Pular" and "Puladas (N)" disappear.
- Scoring, timer, records and the result screen are unchanged: score = right answers − errors, the timer runs from the first flag to the end, best score on any higher score, best time only for a finished quiz with zero errors, storage key `flags-quiz:quiz-records-v2` with Mundo under `world`. `src/quizRecords.ts`, `src/ui/screens/quizResult.ts` and `src/ui/navigation.ts` are not modified.
- Name matching stays `acceptsTypedName` from `src/engine/answer.ts` (same normalization and aliases). A blank answer is still ignored without counting an error.
- A flag's name is never in the DOM before that flag is answered: not as text, `alt`, `title` or `aria-label`.
- No linter exists in this repo. The gates are `npm run typecheck` and `npm test` (plus `npm run build` where a step says so); run them before every commit.
- No new dependency.
- Comments only for facts from outside the file; no docstrings.
- Tests live next to the file they test, named `<file>.test.ts`.
- The operator plays on a dev server on port 5180; never stop, restart or connect a test browser to it. Browser checks use their own server on port 5174 (`npx vite --host --port 5174 --strictPort`), stopped at the end of the check.
- Screenshots go under `.superpowers/sdd/2026-10-07-quiz-grid-plan/` (git-excluded).
- Never amend or rewrite a commit.
- Commit as the agent, Conventional Commits, staging files by name:

```bash
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "<type>: <subject>" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

## Decisions taken while planning

- **The grid order is the quiz's random order, fixed for the whole quiz.** `Quiz.flags` is shuffled once in the constructor and never reordered.
- **Tapping an answered flag does nothing because its cell is a disabled button.** The engine still rejects `select` on an answered flag with an error, so a UI bug surfaces instead of silently re-opening a flag.
- **Tapping the current flag only returns focus to the field** and keeps whatever is typed.
- **Switching to another flag clears the field and hides "Errado, tente de novo"**, then returns focus to the field.
- **"Errado, tente de novo" stays visible until the next answer or the next switch.**
- **An answered cell shows the plain name with no status badge.** The badge stays on the result screen, where the spec keeps it; a 60px cell has no room for both.
- **The large current flag lives in the dock, above the field**, so it stays visible while the grid scrolls: 110px tall on a phone, 160px from 560px wide. The form sits in one row (field, then "Responder") to save height.
- **"Fixed to the bottom of the viewport" is a full-height layout.** The quiz screen is `height: 100dvh`; the grid is the only scrolling element and the dock is the last flex item below it. The dock therefore never overlaps the grid's last row, and its height can change (message shown or hidden) without any measuring. No `position: fixed`.
- **After a right answer the new current cell scrolls into view with `block: 'nearest'`**, so it moves only when the next unanswered flag is off-screen (typically after a wrap-around).
- **Thumbnail size:** `minmax(60px, 1fr)` columns with 6px gaps below 560px (5 per row at 390px) and `minmax(96px, 1fr)` with 10px gaps from 560px. Each thumbnail box has a 4:3 aspect ratio so lazy images do not shift the layout as they load.
- **Grid marks:** current = accent border plus a 2px accent ring; answered = flag at 35% opacity with a green ✓ centered over it and the name below in 0.7rem, wrapping; missed and not answered = a 10px red dot on the top-right corner of the thumbnail.
- **Lazy loading:** `flagImg` gains a `loading` parameter, default `'eager'`, and only the grid passes `'lazy'`. `loading` is assigned before `src`.
- **The multi-click guard keeps its suppression for every element.** `data-rapid-taps` is used only by "Pular" and "Puladas", so the opt-out and its comment lines go. Two taps on different cells are far apart and do not raise `event.detail`; a double tap on the same cell is harmless.
- **No mobile-keyboard viewport change.** `index.html` keeps its viewport meta; how the dock behaves under an on-screen keyboard is left to the operator's phone test.
- **Docs:** the README Quiz paragraph is rewritten, the grid spec's status becomes `implemented`, and the original Quiz spec gets one line pointing to the grid spec.

## Review Focus

1. **A name leaking before it is answered.** A missed flag, or any unanswered flag, must not expose its name in text, `alt`, `title` or `aria-label`; a reasonable player expects the grid to give nothing away. Pinned in Task 2.
2. **The last open flag lying before the current one.** When the only unanswered flag is earlier in grid order, a right answer must wrap to it, and answering it must finish the quiz. Pinned in Task 1.
3. **Tapping an answered flag.** Nothing may happen: no error, no change of the current flag, no re-opened name. Pinned in Task 1 (engine rejects) and Task 2 (cell disabled).
4. **The grid jumping or reloading after an answer.** On Mundo Geral the player is scrolled deep into 248 flags; answering must keep the same cell nodes, the scroll position and the already-loaded images. Pinned in Task 2 (same nodes) and Task 3 (scroll position in the browser).
5. **The dock covering the last row.** At 390px and on desktop, on Mundo Geral, with and without "Errado, tente de novo" showing, the last row of the grid scrolled to the bottom must sit entirely above the dock. Pinned in Task 3.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/engine/quiz.ts`, `src/engine/quiz.test.ts` | grid order, selection, wrap-around, per-flag state; skipping removed | 1 |
| `src/ui/screens/quiz.ts` | Task 1: drops "Pular"/"Puladas". Task 2: the grid screen | 1, 2 |
| `src/main.ts` | multi-click guard without the `data-rapid-taps` opt-out | 1 |
| `src/style.css` | Task 1: drops `.quiz-actions`. Task 2: grid, cell states, dock | 1, 2 |
| `src/ui/flag.ts` | `loading` parameter on `flagImg` | 2 |
| `src/ui/screens/quiz.test.ts` | DOM test of the grid screen in `happy-dom` | 2 |
| `README.md`, both Quiz specs | docs | 3 |

---

### Task 1: Selection and wrap-around in the Quiz engine; skipping removed

**Files:**
- Modify: `src/engine/quiz.ts` (whole file), `src/engine/quiz.test.ts` (whole file)
- Modify: `src/ui/screens/quiz.ts:45-86` (the `show` function), `src/main.ts:14-29` (the click guard), `src/style.css:269-273` (`.quiz-actions`)

**Interfaces:**
- Consumes: `Country` from `src/data/countries.ts`; `acceptsTypedName` from `src/engine/answer.ts`; `shuffle`, `Rng` from `src/engine/rng.ts`.
- Produces:

```ts
// src/engine/quiz.ts
export type QuizStatus = 'playing' | 'finished' | 'ended';
export type FlagState = 'open' | 'missed' | 'answered';
export class Quiz {
  constructor(pool: readonly Country[], rng: Rng);
  readonly flags: readonly Country[];       // grid order, shuffled once
  get total(): number;
  get status(): QuizStatus;
  get current(): Country;                   // throws 'Quiz is finished' / 'Quiz is ended'
  get answeredCount(): number;
  get errors(): number;
  get score(): number;
  get unanswered(): number;
  get missed(): Country[];                  // flags with at least one error, in order of first error
  stateOf(iso2: string): FlagState;         // throws 'Unknown flag <iso2>'
  select(iso2: string): void;               // throws 'Quiz is …', 'Unknown flag <iso2>', 'Flag <iso2> is already answered'
  answer(text: string): boolean;           // right → next unanswered after it in grid order, wrapping; none left → 'finished'
  end(): void;
}
// removed: skip(), openSkipped(), skippedCount
```

- [ ] **Step 1: Replace `src/engine/quiz.test.ts` with the tests for the new API**

```ts
import { describe, expect, it } from 'vitest';
import { countries, type Country } from '../data/countries';
import { poolFor } from './pool';
import { Quiz } from './quiz';
import { seededRng } from './rng';

const easy = poolFor(countries, 'africa', 'easy');
const three = easy.slice(0, 3);
const four = easy.slice(0, 4);

describe('Quiz', () => {
  it('lays every country of the pool out once and starts on the first flag of the grid', () => {
    const quiz = new Quiz(easy, seededRng(1));
    expect(quiz.flags).toHaveLength(20);
    expect(quiz.total).toBe(20);
    expect(new Set(quiz.flags.map((c) => c.iso2))).toEqual(new Set(easy.map((c) => c.iso2)));
    expect(quiz.current).toBe(quiz.flags[0]);
    expect(quiz.flags.every((c) => quiz.stateOf(c.iso2) === 'open')).toBe(true);
  });

  it('walks the grid in order when every answer is right', () => {
    const quiz = new Quiz(easy, seededRng(1));
    const asked: Country[] = [];
    while (quiz.status === 'playing') {
      asked.push(quiz.current);
      expect(quiz.answer(quiz.current.name)).toBe(true);
    }
    expect(asked).toEqual(quiz.flags);
    expect(quiz.status).toBe('finished');
    expect([quiz.answeredCount, quiz.score, quiz.errors, quiz.unanswered]).toEqual([20, 20, 0, 0]);
  });

  it('keeps the flag current, counts an error and marks it missed on a wrong answer', () => {
    const quiz = new Quiz(three, seededRng(2));
    const flag = quiz.current;
    expect(quiz.answer('nenhum país')).toBe(false);
    expect(quiz.answer('outro')).toBe(false);
    expect(quiz.current).toBe(flag);
    expect([quiz.errors, quiz.score, quiz.answeredCount]).toEqual([2, -2, 0]);
    expect(quiz.missed).toEqual([flag]);
    expect(quiz.stateOf(flag.iso2)).toBe('missed');
  });

  it('accepts aliases and ignores accents and case', () => {
    const cd = countries.find((c) => c.iso2 === 'cd')!;
    const quiz = new Quiz([cd], seededRng(3));
    expect(quiz.answer('  rdc ')).toBe(true);
    expect(quiz.status).toBe('finished');
  });

  it('makes a selected flag current without changing any state', () => {
    const quiz = new Quiz(three, seededRng(4));
    const [, second, third] = quiz.flags;
    quiz.select(third.iso2);
    expect(quiz.current).toBe(third);
    quiz.select(second.iso2);
    quiz.select(second.iso2);
    expect(quiz.current).toBe(second);
    expect(quiz.flags.map((c) => quiz.stateOf(c.iso2))).toEqual(['open', 'open', 'open']);
    expect([quiz.errors, quiz.answeredCount]).toEqual([0, 0]);
  });

  it('rejects selecting an answered flag and keeps the current one', () => {
    const quiz = new Quiz(three, seededRng(5));
    const [first, second] = quiz.flags;
    quiz.answer(first.name);
    expect(quiz.stateOf(first.iso2)).toBe('answered');
    expect(() => quiz.select(first.iso2)).toThrow(`Flag ${first.iso2} is already answered`);
    expect(quiz.current).toBe(second);
  });

  it('rejects a flag that is not in the quiz', () => {
    const quiz = new Quiz(three, seededRng(6));
    const outside = easy[3];
    expect(() => quiz.select(outside.iso2)).toThrow(`Unknown flag ${outside.iso2}`);
    expect(() => quiz.stateOf(outside.iso2)).toThrow(`Unknown flag ${outside.iso2}`);
  });

  it('moves to the next unanswered flag after the answered one, passing over answered flags', () => {
    const quiz = new Quiz(four, seededRng(7));
    const [first, second, third] = quiz.flags;
    quiz.select(second.iso2);
    quiz.answer(second.name);
    expect(quiz.current).toBe(third);
    quiz.select(first.iso2);
    quiz.answer(first.name);
    expect(quiz.current).toBe(third);
  });

  it('wraps to the start of the grid after the last flag', () => {
    const quiz = new Quiz(three, seededRng(8));
    const [first, , third] = quiz.flags;
    quiz.select(third.iso2);
    quiz.answer(third.name);
    expect(quiz.current).toBe(first);
  });

  it('marks a missed flag answered once it is right, keeping its error', () => {
    const quiz = new Quiz(three, seededRng(9));
    const [first] = quiz.flags;
    quiz.answer('errado');
    quiz.answer(first.name);
    expect(quiz.stateOf(first.iso2)).toBe('answered');
    expect(quiz.missed).toEqual([first]);
    expect(quiz.score).toBe(0);
  });

  it('finishes when the last open flag lies before the current one', () => {
    const quiz = new Quiz(three, seededRng(10));
    const [first, second, third] = quiz.flags;
    quiz.select(second.iso2);
    quiz.answer(second.name);
    quiz.answer(third.name);
    expect(quiz.current).toBe(first);
    quiz.answer(first.name);
    expect(quiz.status).toBe('finished');
    expect(() => quiz.current).toThrow('Quiz is finished');
    expect(() => quiz.select(first.iso2)).toThrow('Quiz is finished');
  });

  it('ends early and counts the flags left unanswered', () => {
    const quiz = new Quiz(three, seededRng(11));
    quiz.answer(quiz.current.name);
    quiz.select(quiz.flags[2].iso2);
    quiz.end();
    expect(quiz.status).toBe('ended');
    expect([quiz.answeredCount, quiz.unanswered, quiz.score]).toEqual([1, 2, 1]);
    expect(() => quiz.current).toThrow('Quiz is ended');
    expect(() => quiz.end()).toThrow('Quiz is ended');
    expect(() => quiz.select(quiz.flags[1].iso2)).toThrow('Quiz is ended');
  });

  it('refuses an empty pool', () => {
    expect(() => new Quiz([], seededRng(12))).toThrow('at least one country');
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/engine/quiz.test.ts`
Expected: FAIL — `quiz.flags` is undefined and `quiz.select` / `quiz.stateOf` are not functions; the alias, wrong-answer and empty-pool tests still pass.

- [ ] **Step 3: Replace `src/engine/quiz.ts`**

```ts
import type { Country } from '../data/countries';
import { acceptsTypedName } from './answer';
import { shuffle, type Rng } from './rng';

export type QuizStatus = 'playing' | 'finished' | 'ended';
export type FlagState = 'open' | 'missed' | 'answered';

export class Quiz {
  readonly flags: readonly Country[];
  private readonly answered = new Set<string>();
  private readonly errorCounts = new Map<string, number>();
  private currentIndex: number | null = 0;
  private endedEarly = false;

  constructor(pool: readonly Country[], rng: Rng) {
    if (pool.length === 0) throw new Error('Quiz needs at least one country');
    this.flags = shuffle(pool, rng);
  }

  get total(): number {
    return this.flags.length;
  }

  get status(): QuizStatus {
    if (this.endedEarly) return 'ended';
    return this.currentIndex === null ? 'finished' : 'playing';
  }

  get current(): Country {
    if (this.currentIndex === null) throw new Error(`Quiz is ${this.status}`);
    return this.flags[this.currentIndex];
  }

  get answeredCount(): number {
    return this.answered.size;
  }

  get errors(): number {
    return [...this.errorCounts.values()].reduce((sum, count) => sum + count, 0);
  }

  get score(): number {
    return this.answered.size - this.errors;
  }

  get unanswered(): number {
    return this.total - this.answered.size;
  }

  get missed(): Country[] {
    return [...this.errorCounts.keys()].map((iso2) => this.flag(iso2));
  }

  stateOf(iso2: string): FlagState {
    this.flag(iso2);
    if (this.answered.has(iso2)) return 'answered';
    return this.errorCounts.has(iso2) ? 'missed' : 'open';
  }

  select(iso2: string): void {
    if (this.status !== 'playing') throw new Error(`Quiz is ${this.status}`);
    const country = this.flag(iso2);
    if (this.answered.has(iso2)) throw new Error(`Flag ${iso2} is already answered`);
    this.currentIndex = this.flags.indexOf(country);
  }

  answer(text: string): boolean {
    const flag = this.current;
    if (acceptsTypedName(flag, text)) {
      this.answered.add(flag.iso2);
      this.moveToNextUnanswered(this.flags.indexOf(flag));
      return true;
    }
    this.errorCounts.set(flag.iso2, (this.errorCounts.get(flag.iso2) ?? 0) + 1);
    return false;
  }

  end(): void {
    if (this.status !== 'playing') throw new Error(`Quiz is ${this.status}`);
    this.endedEarly = true;
    this.currentIndex = null;
  }

  private moveToNextUnanswered(from: number): void {
    for (let step = 1; step < this.flags.length; step++) {
      const index = (from + step) % this.flags.length;
      if (!this.answered.has(this.flags[index].iso2)) {
        this.currentIndex = index;
        return;
      }
    }
    this.currentIndex = null;
  }

  private flag(iso2: string): Country {
    const country = this.flags.find((c) => c.iso2 === iso2);
    if (!country) throw new Error(`Unknown flag ${iso2}`);
    return country;
  }
}
```

- [ ] **Step 4: Run the engine tests to see them pass**

Run: `npx vitest run src/engine/quiz.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Drop "Pular" and "Puladas" from the quiz screen**

In `src/ui/screens/quiz.ts`, inside `show`, delete everything from `const skip = el('button', …` through the closing `}` of `if (quiz.skippedCount === 0) { … }` (the two buttons, both `dataset.rapidTaps` lines, the two-line comment and the visibility block), and replace the `stage.replaceChildren(…)` call with:

```ts
    stage.replaceChildren(
      el('div', { className: 'question' }, [
        flagFigure(quiz.current),
        ...(message ? [el('p', { className: 'quiz-message' }, [message])] : []),
        form,
      ]),
    );
```

The screen keeps its one-flag view until Task 2; a right answer now moves to the next unanswered flag.

- [ ] **Step 6: Retire the `data-rapid-taps` opt-out**

Run `grep -rn "rapid" src` and confirm the only hits are in `src/main.ts`. Then replace the comment and listener in `src/main.ts` (from `// A fast double-tap` through the closing `);` of `document.addEventListener`) with:

```ts
// A fast double-tap on a button (e.g. "Continuar") would otherwise land its second click
// on whatever element the first click's DOM swap put under the pointer. `detail` counts
// clicks in the same spot within the OS double-click interval; the app has no legitimate
// double-click interaction, and keyboard-triggered clicks have `detail` 0.
document.addEventListener(
  'click',
  (event) => {
    if (event.detail > 1) {
      event.stopPropagation();
      event.preventDefault();
    }
  },
  { capture: true },
);
```

- [ ] **Step 7: Delete the `.quiz-actions` rule from `src/style.css`**

Remove the whole block:

```css
.quiz-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}
```

and run `grep -rn "quiz-actions\|skippedCount\|openSkipped\|skip()" src` — expected: no output.

- [ ] **Step 8: Run the gates and commit**

Run: `npm run typecheck && npm test`
Expected: both clean.

```bash
git add src/engine/quiz.ts src/engine/quiz.test.ts src/ui/screens/quiz.ts src/main.ts src/style.css
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: replace quiz skipping with flag selection and wrap-around" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 2: The quiz grid screen with the docked answer field

**Files:**
- Create: `src/ui/screens/quiz.test.ts`
- Modify: `src/ui/screens/quiz.ts` (whole file), `src/ui/flag.ts` (whole file), `src/style.css` (append after `.quiz-message`)

**Interfaces:**
- Consumes: `Quiz`, `FlagState` (Task 1): `flags`, `current`, `status`, `stateOf(iso2)`, `select(iso2)`, `answer(text)`, `end()`, `score`, `answeredCount`, `total`, `errors`, `unanswered`, `missed`; `saveQuizOutcome` from `src/quizRecords.ts`; `formatTime` from `src/ui/time.ts`; `el` from `src/ui/dom.ts`.
- Produces:

```ts
// src/ui/flag.ts
export function flagImg(country: Country, className?: string, loading?: 'eager' | 'lazy'): HTMLImageElement;
// src/ui/screens/quiz.ts — signature unchanged
export function renderQuiz(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void;
```

DOM contract the test and the browser check rely on: `main.screen.quiz-screen` > `button.link` ("Encerrar"), `header.hud`, `div.quiz-grid` > `button.quiz-cell` (classes `open` | `missed` | `answered`, plus `current`) > `span.quiz-thumb` > `img.flag`, and `span.quiz-name`; then `div.quiz-dock` > `div.figure` > `img.flag`, `p.quiz-message`, `form.type-form` > `input`, `button.primary`.

- [ ] **Step 1: Write the failing test `src/ui/screens/quiz.test.ts`**

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countries, type Country } from '../../data/countries';
import { poolFor } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderQuiz } from './quiz';

const oceania = poolFor(countries, 'oceania', 'easy');
const byIso = new Map(countries.map((c) => [c.iso2, c]));

function countryIn(img: HTMLImageElement): Country {
  const iso2 = img.getAttribute('src')!.match(/flags\/(.+)\.svg$/)![1];
  return byIso.get(iso2)!;
}

describe('renderQuiz', () => {
  let root: HTMLElement;
  let screens: Screen[];

  const cells = () => [...root.querySelectorAll<HTMLButtonElement>('.quiz-cell')];
  const cellCountry = (cell: HTMLButtonElement) => countryIn(cell.querySelector('img')!);
  const currentCell = () => root.querySelector<HTMLButtonElement>('.quiz-cell.current')!;
  const bigFlag = () => countryIn(root.querySelector<HTMLImageElement>('.quiz-dock .figure img')!);
  const input = () => root.querySelector<HTMLInputElement>('.quiz-dock input')!;
  const message = () => root.querySelector<HTMLParagraphElement>('.quiz-message')!;
  const hud = () => root.querySelector('.hud')!.textContent;
  const type = (text: string) => {
    input().value = text;
    root.querySelector<HTMLFormElement>('.quiz-dock form')!.requestSubmit();
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    localStorage.clear();
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderQuiz(root, (screen) => screens.push(screen), 'oceania', 'easy');
  });

  afterEach(() => {
    root.remove();
    vi.useRealTimers();
  });

  it('lays out every flag of the level as lazy thumbnails, the first one current, the field focused', () => {
    expect(cells()).toHaveLength(oceania.length);
    expect(new Set(cells().map((cell) => cellCountry(cell).iso2))).toEqual(new Set(oceania.map((c) => c.iso2)));
    expect(cells().every((cell) => cell.querySelector('img')!.getAttribute('loading') === 'lazy')).toBe(true);
    expect(currentCell()).toBe(cells()[0]);
    expect(bigFlag()).toBe(cellCountry(cells()[0]));
    expect(message().hidden).toBe(true);
    expect(hud()).toContain(`0/${oceania.length}`);
    expect(document.activeElement).toBe(input());
  });

  it('never puts the name of an unanswered flag in the page', () => {
    type('nenhum país');
    const html = root.innerHTML;
    for (const country of oceania) expect(html).not.toContain(country.name);
  });

  it('makes a tapped flag current, shows it large, clears the field and gives focus back to it', () => {
    const target = cells()[4];
    type('nenhum país');
    input().value = 'meio';
    input().blur();
    target.click();
    expect(currentCell()).toBe(target);
    expect(root.querySelectorAll('.quiz-cell.current')).toHaveLength(1);
    expect(bigFlag()).toBe(cellCountry(target));
    expect(input().value).toBe('');
    expect(message().hidden).toBe(true);
    expect(document.activeElement).toBe(input());
  });

  it('keeps the typed text when the current flag is tapped', () => {
    input().value = 'meio';
    cells()[0].click();
    expect(input().value).toBe('meio');
    expect(currentCell()).toBe(cells()[0]);
    expect(document.activeElement).toBe(input());
  });

  it('marks a wrong answer as missed, keeps the flag current and keeps its name hidden', () => {
    const first = cells()[0];
    type('nenhum país');
    expect(message().hidden).toBe(false);
    expect(message().textContent).toBe('Errado, tente de novo');
    expect(first.classList.contains('missed')).toBe(true);
    expect(currentCell()).toBe(first);
    expect(first.querySelector('.quiz-name')!.textContent).toBe('');
    expect(input().value).toBe('');
    expect(hud()).toContain('-1 pts');
    expect(document.activeElement).toBe(input());
  });

  it('ignores a blank answer', () => {
    type('   ');
    expect(cells()[0].classList.contains('missed')).toBe(false);
    expect(message().hidden).toBe(true);
    expect(hud()).toContain('0 pts');
  });

  it('fills a right answer in with its name, disables it and moves on without rebuilding the grid', () => {
    const before = cells();
    const first = before[0];
    const country = cellCountry(first);
    type('nenhum país');
    type(country.name);
    expect(first.classList.contains('answered')).toBe(true);
    expect(first.classList.contains('missed')).toBe(false);
    expect(first.classList.contains('current')).toBe(false);
    expect(first.disabled).toBe(true);
    expect(first.querySelector('.quiz-name')!.textContent).toBe(country.name);
    expect(currentCell()).toBe(before[1]);
    expect(message().hidden).toBe(true);
    expect(cells().every((cell, i) => cell === before[i])).toBe(true);
    expect(hud()).toContain(`1/${oceania.length}`);
    expect(document.activeElement).toBe(input());
  });

  it('hands a finished quiz to the result screen once every flag is answered', () => {
    for (let i = 0; i < oceania.length; i++) type(bigFlag().name);
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({
      name: 'quizResult',
      continent: 'oceania',
      difficulty: 'easy',
      score: oceania.length,
      finished: true,
      unanswered: 0,
      missed: [],
    });
  });

  it('ends early on Encerrar', () => {
    type(bigFlag().name);
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Encerrar')!.click();
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({ name: 'quizResult', score: 1, finished: false, unanswered: oceania.length - 1 });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run src/ui/screens/quiz.test.ts`
Expected: FAIL — no `.quiz-cell` exists (length 0 against 9) and `.quiz-dock` is missing; only the blank-answer test may pass or fail on the missing `.quiz-dock form`.

- [ ] **Step 3: Give `flagImg` a `loading` parameter — replace `src/ui/flag.ts`**

```ts
import type { Country } from '../data/countries';
import { el } from './dom';

export function flagImg(country: Country, className = 'flag', loading: HTMLImageElement['loading'] = 'eager'): HTMLImageElement {
  // `loading` must be set before `src`: assigning `src` starts the fetch under the current loading mode.
  return el('img', {
    loading,
    src: `${import.meta.env.BASE_URL}flags/${country.iso2}.svg`,
    alt: 'Bandeira',
    className,
    draggable: false,
  });
}
```

- [ ] **Step 4: Replace `src/ui/screens/quiz.ts` with the grid screen**

```ts
import { countries, type Country } from '../../data/countries';
import { poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { Quiz } from '../../engine/quiz';
import { saveQuizOutcome } from '../../quizRecords';
import { el } from '../dom';
import { flagImg } from '../flag';
import type { Navigate } from '../navigation';
import { formatTime } from '../time';

export function renderQuiz(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  const quiz = new Quiz(poolFor(countries, continent, difficulty), Math.random);
  const startedAt = performance.now();
  const elapsed = () => performance.now() - startedAt;

  const timer = el('span', {}, [formatTime(0)]);
  const interval = window.setInterval(() => {
    timer.textContent = formatTime(elapsed());
  }, 1000);
  const hud = el('header', { className: 'hud' });
  const finish = () => {
    window.clearInterval(interval);
    if (quiz.status === 'playing') quiz.end();
    const timeMs = elapsed();
    const finished = quiz.status === 'finished';
    const newRecords = saveQuizOutcome(localStorage, continent, difficulty, { score: quiz.score, timeMs, finished, errors: quiz.errors });
    navigate({
      name: 'quizResult',
      continent,
      difficulty,
      score: quiz.score,
      timeMs,
      finished,
      unanswered: quiz.unanswered,
      missed: quiz.missed,
      newRecords,
    });
  };
  const exit = el('button', { className: 'link', onclick: finish }, ['Encerrar']);

  const figure = el('div', { className: 'figure' });
  const message = el('p', { className: 'quiz-message', hidden: true }, ['Errado, tente de novo']);
  const input = el('input', {
    type: 'text',
    required: true,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    placeholder: 'Nome',
  });
  const form = el('form', { className: 'type-form' }, [input, el('button', { className: 'primary', type: 'submit' }, ['Responder'])]);

  const cells = new Map<Country, { cell: HTMLButtonElement; name: HTMLSpanElement }>();

  const paint = () => {
    hud.replaceChildren(timer, el('span', {}, [`${quiz.score} pts`]), el('span', {}, [`${quiz.answeredCount}/${quiz.total}`]));
    for (const [country, { cell, name }] of cells) {
      const state = quiz.stateOf(country.iso2);
      cell.className = `quiz-cell ${state}`;
      cell.classList.toggle('current', country === quiz.current);
      cell.disabled = state === 'answered';
      name.textContent = state === 'answered' ? country.name : '';
    }
    figure.replaceChildren(flagImg(quiz.current));
  };

  const pick = (country: Country) => {
    if (country !== quiz.current) {
      quiz.select(country.iso2);
      input.value = '';
      message.hidden = true;
      paint();
    }
    input.focus();
  };

  const grid = el(
    'div',
    { className: 'quiz-grid' },
    quiz.flags.map((country) => {
      const name = el('span', { className: 'quiz-name' });
      const cell = el('button', { className: 'quiz-cell', type: 'button', onclick: () => pick(country) }, [
        el('span', { className: 'quiz-thumb' }, [flagImg(country, 'flag', 'lazy')]),
        name,
      ]);
      cells.set(country, { cell, name });
      return cell;
    }),
  );

  form.onsubmit = (event) => {
    event.preventDefault();
    if (input.value.trim() === '') {
      input.value = '';
      return;
    }
    const right = quiz.answer(input.value);
    input.value = '';
    if (quiz.status !== 'playing') return finish();
    message.hidden = right;
    paint();
    if (right) cells.get(quiz.current)!.cell.scrollIntoView({ block: 'nearest' });
    input.focus();
  };

  root.append(
    el('main', { className: 'screen quiz-screen' }, [exit, hud, grid, el('div', { className: 'quiz-dock' }, [figure, message, form])]),
  );
  paint();
  input.focus();
}
```

- [ ] **Step 5: Run the screen test to see it pass**

Run: `npx vitest run src/ui/screens/quiz.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Style the grid, the cell states and the dock**

In `src/style.css`, insert right after the `.quiz-message { … }` line:

```css
.quiz-screen { height: 100dvh; padding-bottom: 16px; }

.quiz-grid {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
  align-content: start;
  align-items: start;
  padding: 4px;
}

.quiz-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--surface);
}

.quiz-cell:disabled { opacity: 1; cursor: default; }
.quiz-cell.current { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }

.quiz-thumb { position: relative; display: flex; aspect-ratio: 4 / 3; }
.quiz-cell.answered .flag { opacity: 0.35; }

.quiz-cell.answered .quiz-thumb::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--right);
  font-size: 1.6rem;
  font-weight: 700;
}

.quiz-cell.missed .quiz-thumb::after {
  content: '';
  position: absolute;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--wrong);
}

.quiz-name { font-size: 0.7rem; line-height: 1.2; text-align: center; overflow-wrap: anywhere; }
.quiz-name:empty { display: none; }

.quiz-dock {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.quiz-dock .figure { height: 110px; }
.quiz-dock .type-form { flex-direction: row; }
.quiz-dock .type-form input { flex: 1; min-width: 0; }

@media (min-width: 560px) {
  .quiz-grid { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
  .quiz-dock .figure { height: 160px; }
}
```

The `.quiz-dock .figure` rules come after the existing `@media (min-width: 560px) { … .figure { height: 260px; } }` block, so they win on specificity at every width.

- [ ] **Step 7: Run the gates and commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

```bash
git add src/ui/flag.ts src/ui/screens/quiz.ts src/ui/screens/quiz.test.ts src/style.css
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: show every quiz flag as a grid with the answer field docked below" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 3: Browser verification and docs

**Files:**
- Modify: `README.md`, `docs/specs/2026-10-07-quiz-grid-design.md`, `docs/specs/2026-10-06-quiz-mode-design.md`, plus whatever the checks show broken (fix in the owning file, with a test in `src/engine/quiz.test.ts` or `src/ui/screens/quiz.test.ts` that fails first, one `fix:` commit each)

**Interfaces:**
- Consumes: the DOM contract of Task 2; flag names from `src/data/countries.json` (look the name up by the iso2 in the `src` of `.quiz-dock .figure img`).
- Produces: nothing for other tasks.

- [ ] **Step 1: Check the grid in the browser**

Start `npx vite --host --port 5174 --strictPort` in the background (never port 5180). With the Playwright browser tools, open `http://localhost:5174/`, clear `localStorage`, then check each item below and record the evidence (evaluate output or screenshot):

At 390×844, Oceania → Fácil → Quiz (9 flags):
- the grid shows 9 cells, 5 per row (`getComputedStyle(grid).gridTemplateColumns` has 5 tracks), the first cell outlined and the same flag large in the dock above the field;
- the field has focus on arrival (`document.activeElement` is the input);
- type a wrong name: "Errado, tente de novo" shows, the cell gets the red dot, no name appears, the field is empty and still focused;
- tap the fourth cell with a real click: it becomes outlined, the large flag changes, the message disappears, the field is focused;
- type the right name: the cell dims, shows ✓ and its name below, the outline moves to the fifth cell, the HUD reads `1 pts` and `1/9`;
- tap the answered cell: nothing changes;
- answer the rest through real typing; the result screen shows `9 pontos` minus the errors made, and "Voltar" leads to the Oceania screen with the best score shown.

At 390×844, Mundo → Geral → Quiz (248 flags):
- right after the screen opens, `performance.getEntriesByType('resource').filter(e => e.name.includes('/flags/')).length` is below 248;
- scroll the grid to the bottom (`grid.scrollTop = grid.scrollHeight`): the last cell's image loads (`naturalWidth > 0`) and the last cell's `getBoundingClientRect().bottom` is at most the dock's `getBoundingClientRect().top`; type a wrong name so the message shows and repeat the measurement;
- the page itself does not scroll (`document.scrollingElement.scrollHeight <= innerHeight`);
- with the grid scrolled to the bottom, tap the first cell of the last row and answer it right: `grid.scrollTop` is unchanged, the second cell of that row becomes current, and every already-loaded image in view stays loaded;
- tap the last cell of the grid and answer it right: the outline wraps to the first unanswered cell, the grid scrolls it into view (`getBoundingClientRect()` of that cell lies inside the grid's rect), and the large flag in the dock matches it;
- "Encerrar" ends the quiz and the result shows the unanswered count.

At 1280×800, repeat on Oceania Fácil and Mundo Geral: thumbnails are larger than at 390px, the dock flag is 160px tall, the last row sits above the dock.

Screenshots: Oceania Fácil at 390px with one answered, one missed and the current cell; Mundo Geral at 390px scrolled to the bottom; Mundo Geral at 1280px; one in dark mode (`emulate_media` with `prefers-color-scheme: dark`).

Stop the server.

- [ ] **Step 2: Update the docs**

In `README.md`, replace the paragraph that starts with `Quiz shows one flag at a time` with:

```markdown
Quiz shows every flag of the level at once as a grid on the same levels: type the name of the highlighted flag, tap any other flag to switch to it, and race the timer. Answered flags show a check and their name, and a red mark flags one you got wrong. The best score and, for a quiz finished with no errors, the best time are kept per level.
```

In `docs/specs/2026-10-07-quiz-grid-design.md`, replace the line `Status: approved in chat by the operator ("ok pra todos")` with `Status: implemented`.

In `docs/specs/2026-10-06-quiz-mode-design.md`, insert after the `Status: approved` line, with one blank line before it:

```markdown
The one-flag view and skipping were replaced by the grid in `docs/specs/2026-10-07-quiz-grid-design.md`.
```

- [ ] **Step 3: Run the gates and commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

```bash
git add README.md docs/specs/2026-10-07-quiz-grid-design.md docs/specs/2026-10-06-quiz-mode-design.md
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "docs: describe the quiz grid" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```
