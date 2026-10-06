# Quiz Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Quiz mode: one flag at a time, type the name or skip, return to skipped flags, a running timer, and the best score and best time per continent and level.

**Architecture:** A DOM-free `Quiz` class in `src/engine/quiz.ts` holds the queue, skipped list, answers and errors, reusing `acceptsTypedName` from `answer.ts`. Records live in `src/quizRecords.ts` over `localStorage`. The continent and level screens take a `mode` and route to the Learn game or the new quiz screen; the timer lives in the quiz screen.

**Tech Stack:** Vite, TypeScript (strict), Vitest, plain DOM, Node 24.

**Spec:** `docs/specs/2026-10-06-quiz-mode-design.md`

## Global Constraints

- Code, identifiers, comments and commit messages in English; every string the player sees in Brazilian Portuguese.
- Quiz uses the Learn levels and pools (`poolFor`, `LEVEL_RULES` untouched) and the Learn name normalization and aliases.
- Score = right answers − errors; an error is every wrong submission; it can go negative.
- Best score updates on any ended quiz (finished or ended early) with a strictly higher score; best time only for a finished quiz with zero errors and a strictly lower time.
- Records in `localStorage` under the key `flags-quiz:quiz-records`, shape `continent → level → { bestScore?, bestTimeMs? }`.
- Time shown as `mm:ss`.
- No linter exists in this repo. The gates are `npm run typecheck` and `npm test` (plus `npm run build` where a step says so); run them before every commit.
- Comments only for facts from outside the file; no docstrings.
- Tests live next to the file they test, named `<file>.test.ts`.
- The operator plays on a dev server on port 5173; never stop or restart it. Browser checks use their own server on port 5174.
- Commit as the agent, Conventional Commits, staging files by name:

```bash
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "<type>: <subject>" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

## Review Focus

1. **Skipping the last remaining flag.** With one flag left and it skipped, the same flag must come back instead of ending the quiz or throwing. Pinned in Task 1.
2. **Opening skipped flags while one is on screen.** The flag on screen must not be lost or counted twice. Pinned in Task 1.
3. **Ending early with nothing answered.** The score is 0 or negative and still competes for the best score; the time never does. Pinned in Task 2.
4. **The timer after leaving.** The interval must stop when the quiz ends, so it does not keep writing to a detached element. Guarded in Task 3, checked in Task 4.
5. **An empty submission.** The field is `required`, so Enter on an empty field does not count an error. Guarded in Task 3, checked in Task 4.

---

### Task 1: Quiz engine

**Files:**
- Modify: `src/engine/answer.ts` (export `acceptsTypedName`)
- Create: `src/engine/quiz.ts`
- Test: `src/engine/quiz.test.ts`

**Interfaces:**
- Produces:

```ts
// answer.ts
export function acceptsTypedName(country: Country, text: string): boolean;
// quiz.ts
export type QuizStatus = 'playing' | 'finished' | 'ended';
export class Quiz {
  constructor(pool: readonly Country[], rng: Rng);
  readonly total: number;
  get status(): QuizStatus;
  get current(): Country;        // throws when not playing
  get answeredCount(): number;
  get skippedCount(): number;
  get errors(): number;
  get score(): number;
  get unanswered(): number;
  get missed(): Country[];       // flags with at least one error, in order of first error
  answer(text: string): boolean; // true advances; false records an error and keeps the flag
  skip(): void;
  openSkipped(): void;           // throws when nothing is skipped
  end(): void;                   // throws when not playing
}
```

- [ ] **Step 1: Write the failing tests**

`src/engine/quiz.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { poolFor } from './pool';
import { Quiz } from './quiz';
import { seededRng } from './rng';

const easy = poolFor(countries, 'africa', 'easy');
const three = easy.slice(0, 3);

describe('Quiz', () => {
  it('asks every country of the pool once', () => {
    const quiz = new Quiz(easy, seededRng(1));
    const asked: string[] = [];
    while (quiz.status === 'playing') {
      asked.push(quiz.current.iso2);
      expect(quiz.answer(quiz.current.name)).toBe(true);
    }
    expect(quiz.status).toBe('finished');
    expect(new Set(asked)).toEqual(new Set(easy.map((c) => c.iso2)));
    expect([quiz.answeredCount, quiz.score, quiz.errors, quiz.unanswered]).toEqual([18, 18, 0, 0]);
  });

  it('keeps the flag and counts an error on a wrong answer', () => {
    const quiz = new Quiz(three, seededRng(2));
    const flag = quiz.current;
    expect(quiz.answer('nenhum país')).toBe(false);
    expect(quiz.answer('outro')).toBe(false);
    expect(quiz.current).toBe(flag);
    expect([quiz.errors, quiz.score, quiz.answeredCount]).toEqual([2, -2, 0]);
    expect(quiz.missed).toEqual([flag]);
  });

  it('accepts aliases and ignores accents and case', () => {
    const cd = countries.find((c) => c.iso2 === 'cd')!;
    const quiz = new Quiz([cd], seededRng(3));
    expect(quiz.answer('  rdc ')).toBe(true);
    expect(quiz.status).toBe('finished');
  });

  it('brings skipped flags back after the unseen ones, oldest first', () => {
    const quiz = new Quiz(three, seededRng(4));
    const first = quiz.current;
    quiz.skip();
    const second = quiz.current;
    quiz.skip();
    expect(quiz.skippedCount).toBe(2);
    quiz.answer(quiz.current.name);
    expect(quiz.current).toBe(first);
    quiz.answer(first.name);
    expect(quiz.current).toBe(second);
  });

  it('keeps showing the last flag when it is skipped again', () => {
    const quiz = new Quiz(three.slice(0, 1), seededRng(5));
    const only = quiz.current;
    quiz.skip();
    expect(quiz.status).toBe('playing');
    expect(quiz.current).toBe(only);
    expect(quiz.skippedCount).toBe(0);
  });

  it('opens the oldest skipped flag and puts the flag on screen back in line', () => {
    const quiz = new Quiz(three, seededRng(6));
    const first = quiz.current;
    quiz.skip();
    const onScreen = quiz.current;
    quiz.openSkipped();
    expect(quiz.current).toBe(first);
    expect(quiz.skippedCount).toBe(0);
    quiz.answer(first.name);
    expect(quiz.current).toBe(onScreen);
  });

  it('sends a re-skipped flag to the back of the skipped list', () => {
    const quiz = new Quiz(three, seededRng(7));
    const first = quiz.current;
    quiz.skip();
    const second = quiz.current;
    quiz.skip();
    const third = quiz.current;
    quiz.openSkipped();
    expect(quiz.current).toBe(first);
    quiz.skip();
    expect(quiz.current).toBe(third);
    quiz.answer(third.name);
    expect(quiz.current).toBe(second);
    quiz.answer(second.name);
    expect(quiz.current).toBe(first);
  });

  it('refuses to open skipped flags when none is skipped', () => {
    expect(() => new Quiz(three, seededRng(8)).openSkipped()).toThrow('No skipped flag');
  });

  it('ends early and counts the flags left unanswered', () => {
    const quiz = new Quiz(three, seededRng(9));
    quiz.answer(quiz.current.name);
    quiz.skip();
    quiz.end();
    expect(quiz.status).toBe('ended');
    expect([quiz.answeredCount, quiz.unanswered, quiz.score]).toEqual([1, 2, 1]);
    expect(() => quiz.current).toThrow('Quiz is ended');
    expect(() => quiz.end()).toThrow('Quiz is ended');
  });

  it('refuses an empty pool', () => {
    expect(() => new Quiz([], seededRng(10))).toThrow('at least one country');
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- src/engine/quiz.test.ts`
Expected: FAIL, cannot resolve `./quiz`.

- [ ] **Step 3: Export `acceptsTypedName`**

In `src/engine/answer.ts`, change `function acceptsTypedName(` to `export function acceptsTypedName(`. Nothing else changes.

- [ ] **Step 4: Implement `src/engine/quiz.ts`**

```ts
import type { Country } from '../data/countries';
import { acceptsTypedName } from './answer';
import { shuffle, type Rng } from './rng';

export type QuizStatus = 'playing' | 'finished' | 'ended';

export class Quiz {
  readonly total: number;
  private readonly unseen: Country[];
  private readonly skipped: Country[] = [];
  private readonly answered = new Set<string>();
  private readonly errorCounts = new Map<Country, number>();
  private shown: Country | null;
  private endedEarly = false;

  constructor(pool: readonly Country[], rng: Rng) {
    if (pool.length === 0) throw new Error('Quiz needs at least one country');
    this.total = pool.length;
    this.unseen = shuffle(pool, rng);
    this.shown = this.unseen.shift()!;
  }

  get status(): QuizStatus {
    if (this.endedEarly) return 'ended';
    return this.shown ? 'playing' : 'finished';
  }

  get current(): Country {
    if (!this.shown) throw new Error(`Quiz is ${this.status}`);
    return this.shown;
  }

  get answeredCount(): number {
    return this.answered.size;
  }

  get skippedCount(): number {
    return this.skipped.length;
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
    return [...this.errorCounts.keys()];
  }

  answer(text: string): boolean {
    const flag = this.current;
    if (acceptsTypedName(flag, text)) {
      this.answered.add(flag.iso2);
      this.advance();
      return true;
    }
    this.errorCounts.set(flag, (this.errorCounts.get(flag) ?? 0) + 1);
    return false;
  }

  skip(): void {
    this.skipped.push(this.current);
    this.advance();
  }

  openSkipped(): void {
    const onScreen = this.current;
    const oldest = this.skipped.shift();
    if (!oldest) throw new Error('No skipped flag');
    this.unseen.unshift(onScreen);
    this.shown = oldest;
  }

  end(): void {
    if (this.status !== 'playing') throw new Error(`Quiz is ${this.status}`);
    this.endedEarly = true;
    this.shown = null;
  }

  private advance(): void {
    this.shown = this.unseen.shift() ?? this.skipped.shift() ?? null;
  }
}
```

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm test`
Expected: clean; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/answer.ts src/engine/quiz.ts src/engine/quiz.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: add the quiz engine with skipping and returning to skipped flags" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 2: Quiz records and time format

**Files:**
- Create: `src/quizRecords.ts`, `src/quizRecords.test.ts`, `src/ui/time.ts`, `src/ui/time.test.ts`

**Interfaces:**
- Produces:

```ts
// src/quizRecords.ts
export type RecordStore = Pick<Storage, 'getItem' | 'setItem'>;
export interface QuizRecord { bestScore?: number; bestTimeMs?: number }
export type QuizRecords = Partial<Record<Continent, Partial<Record<Difficulty, QuizRecord>>>>;
export interface QuizOutcome { score: number; timeMs: number; finished: boolean; errors: number }
export interface NewRecords { score: boolean; time: boolean }
export function loadQuizRecords(store: RecordStore): QuizRecords;
export function quizRecord(records: QuizRecords, continent: Continent, difficulty: Difficulty): QuizRecord;
export function saveQuizOutcome(store: RecordStore, continent: Continent, difficulty: Difficulty, outcome: QuizOutcome): NewRecords;
// src/ui/time.ts
export function formatTime(ms: number): string; // "mm:ss"
```

- [ ] **Step 1: Write the failing tests**

`src/quizRecords.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadQuizRecords, quizRecord, saveQuizOutcome, type RecordStore } from './quizRecords';

function memoryStore(): RecordStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const outcome = (score: number, timeMs: number, finished = true, errors = 0) => ({ score, timeMs, finished, errors });

describe('quiz records', () => {
  it('starts empty', () => {
    expect(quizRecord(loadQuizRecords(memoryStore()), 'africa', 'easy')).toEqual({});
  });

  it('keeps the first finished flawless quiz as both records', () => {
    const store = memoryStore();
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 95000))).toEqual({ score: true, time: true });
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy')).toEqual({ bestScore: 18, bestTimeMs: 95000 });
  });

  it('updates the score only when strictly higher', () => {
    const store = memoryStore();
    saveQuizOutcome(store, 'africa', 'easy', outcome(10, 90000, true, 8));
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(10, 80000, true, 8)).score).toBe(false);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(12, 80000, true, 6)).score).toBe(true);
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy').bestScore).toBe(12);
  });

  it('records the time only for a finished quiz with no errors and a lower time', () => {
    const store = memoryStore();
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(16, 60000, true, 2)).time).toBe(false);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(5, 30000, false, 0)).time).toBe(false);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 100000)).time).toBe(true);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 120000)).time).toBe(false);
    expect(saveQuizOutcome(store, 'africa', 'easy', outcome(18, 90000)).time).toBe(true);
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy').bestTimeMs).toBe(90000);
  });

  it('lets an early end with a negative score set the first best score', () => {
    const store = memoryStore();
    expect(saveQuizOutcome(store, 'africa', 'hard', outcome(-2, 15000, false, 2))).toEqual({ score: true, time: false });
    expect(quizRecord(loadQuizRecords(store), 'africa', 'hard')).toEqual({ bestScore: -2 });
  });

  it('keeps levels apart under one storage key', () => {
    const store = memoryStore();
    saveQuizOutcome(store, 'africa', 'easy', outcome(18, 95000));
    saveQuizOutcome(store, 'africa', 'general', outcome(40, 400000, true, 14));
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy').bestScore).toBe(18);
    expect(quizRecord(loadQuizRecords(store), 'africa', 'general')).toEqual({ bestScore: 40 });
    expect([...store.data.keys()]).toEqual(['flags-quiz:quiz-records']);
  });
});
```

`src/ui/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatTime } from './time';

describe('formatTime', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [1000, '00:01'],
    [65_500, '01:05'],
    [3_600_000, '60:00'],
  ])('formats %d ms as %s', (ms, text) => {
    expect(formatTime(ms)).toBe(text);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- src/quizRecords.test.ts src/ui/time.test.ts`
Expected: FAIL, cannot resolve `./quizRecords` and `./time`.

- [ ] **Step 3: Implement `src/quizRecords.ts`**

```ts
import type { Continent } from './data/countries';
import type { Difficulty } from './engine/pool';

export type RecordStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface QuizRecord {
  bestScore?: number;
  bestTimeMs?: number;
}

export type QuizRecords = Partial<Record<Continent, Partial<Record<Difficulty, QuizRecord>>>>;

export interface QuizOutcome {
  score: number;
  timeMs: number;
  finished: boolean;
  errors: number;
}

export interface NewRecords {
  score: boolean;
  time: boolean;
}

const STORAGE_KEY = 'flags-quiz:quiz-records';

export function loadQuizRecords(store: RecordStore): QuizRecords {
  const raw = store.getItem(STORAGE_KEY);
  return raw === null ? {} : (JSON.parse(raw) as QuizRecords);
}

export function quizRecord(records: QuizRecords, continent: Continent, difficulty: Difficulty): QuizRecord {
  return records[continent]?.[difficulty] ?? {};
}

export function saveQuizOutcome(store: RecordStore, continent: Continent, difficulty: Difficulty, outcome: QuizOutcome): NewRecords {
  const records = loadQuizRecords(store);
  const previous = quizRecord(records, continent, difficulty);
  const score = previous.bestScore === undefined || outcome.score > previous.bestScore;
  const time =
    outcome.finished && outcome.errors === 0 && (previous.bestTimeMs === undefined || outcome.timeMs < previous.bestTimeMs);
  const next: QuizRecord = { ...previous };
  if (score) next.bestScore = outcome.score;
  if (time) next.bestTimeMs = outcome.timeMs;
  records[continent] = { ...records[continent], [difficulty]: next };
  store.setItem(STORAGE_KEY, JSON.stringify(records));
  return { score, time };
}
```

- [ ] **Step 4: Implement `src/ui/time.ts`**

```ts
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
```

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm test`
Expected: clean; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/quizRecords.ts src/quizRecords.test.ts src/ui/time.ts src/ui/time.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: keep the best quiz score and time per level" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 3: Quiz screens and mode routing

**Files:**
- Modify: `src/ui/navigation.ts`, `src/main.ts`, `src/ui/screens/home.ts`, `src/ui/screens/continent.ts`, `src/ui/screens/difficulty.ts`, `src/ui/screens/game.ts`, `src/ui/screens/result.ts`, `src/style.css`
- Create: `src/ui/screens/quiz.ts`, `src/ui/screens/quizResult.ts`

**Interfaces:**
- Consumes: `Quiz` (Task 1), `saveQuizOutcome`, `loadQuizRecords`, `quizRecord`, `NewRecords` (Task 2), `formatTime` (Task 2), `flagFigure` and `solutionCard` (existing).
- Produces:

```ts
// navigation.ts
export type Mode = 'learn' | 'quiz';
export type Screen =
  | { name: 'home' }
  | { name: 'continent'; mode: Mode }
  | { name: 'difficulty'; mode: Mode; continent: Continent }
  | { name: 'game'; continent: Continent; difficulty: Difficulty }
  | { name: 'result'; continent: Continent; difficulty: Difficulty; won: boolean; correct: number; missed: Country[] }
  | { name: 'quiz'; continent: Continent; difficulty: Difficulty }
  | { name: 'quizResult'; continent: Continent; difficulty: Difficulty; score: number; timeMs: number; finished: boolean; unanswered: number; missed: Country[]; newRecords: NewRecords };
export function renderContinent(root: HTMLElement, navigate: Navigate, mode: Mode): void;
export function renderDifficulty(root: HTMLElement, navigate: Navigate, mode: Mode, continent: Continent): void;
export function renderQuiz(root: HTMLElement, navigate: Navigate, continent: Continent, difficulty: Difficulty): void;
export function renderQuizResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'quizResult' }>): void;
```

No unit tests (UI). Gates are typecheck, the suite and build.

- [ ] **Step 1: Add the mode and the quiz screens to `src/ui/navigation.ts`**

```ts
import type { Continent, Country } from '../data/countries';
import type { Difficulty } from '../engine/pool';
import type { NewRecords } from '../quizRecords';

export type Mode = 'learn' | 'quiz';

export type Screen =
  | { name: 'home' }
  | { name: 'continent'; mode: Mode }
  | { name: 'difficulty'; mode: Mode; continent: Continent }
  | { name: 'game'; continent: Continent; difficulty: Difficulty }
  | { name: 'result'; continent: Continent; difficulty: Difficulty; won: boolean; correct: number; missed: Country[] }
  | { name: 'quiz'; continent: Continent; difficulty: Difficulty }
  | {
      name: 'quizResult';
      continent: Continent;
      difficulty: Difficulty;
      score: number;
      timeMs: number;
      finished: boolean;
      unanswered: number;
      missed: Country[];
      newRecords: NewRecords;
    };

export type Navigate = (screen: Screen) => void;
```

- [ ] **Step 2: Carry the mode through the menus**

`src/ui/screens/home.ts` — the two buttons become:

```ts
      el('button', { className: 'big', onclick: () => navigate({ name: 'continent', mode: 'learn' }) }, ['Learn']),
      el('button', { className: 'big', onclick: () => navigate({ name: 'continent', mode: 'quiz' }) }, ['Quiz']),
```

`src/ui/screens/continent.ts` — the signature becomes `renderContinent(root: HTMLElement, navigate: Navigate, mode: Mode)` (import `type Mode` from `../navigation`), and the continent button's `onclick` becomes `() => navigate({ name: 'difficulty', mode, continent })`.

`src/ui/screens/difficulty.ts` — replace the file with:

```ts
import { countries, type Continent } from '../../data/countries';
import { LEVEL_RULES, poolFor, type Difficulty } from '../../engine/pool';
import { hasMedal, loadMedals } from '../../progress';
import { loadQuizRecords, quizRecord } from '../../quizRecords';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import type { Mode, Navigate } from '../navigation';
import { formatTime } from '../time';

function learnDetail(continent: Continent, difficulty: Difficulty): string {
  const medal = hasMedal(loadMedals(localStorage), continent, difficulty) ? ' · 🏅' : '';
  return `${poolFor(countries, continent, difficulty).length} países · ${LEVEL_RULES[difficulty].correctToWin} acertos${medal}`;
}

function quizDetail(continent: Continent, difficulty: Difficulty): string {
  const { bestScore, bestTimeMs } = quizRecord(loadQuizRecords(localStorage), continent, difficulty);
  const parts = [`${poolFor(countries, continent, difficulty).length} países`];
  if (bestScore !== undefined) parts.push(`recorde ${bestScore} pts`);
  if (bestTimeMs !== undefined) parts.push(formatTime(bestTimeMs));
  return parts.join(' · ');
}

export function renderDifficulty(root: HTMLElement, navigate: Navigate, mode: Mode, continent: Continent): void {
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, [CONTINENT_LABEL[continent]]),
      el('p', { className: 'detail' }, [mode === 'quiz' ? 'Quiz' : 'Learn']),
      ...DIFFICULTIES.map((difficulty) =>
        el(
          'button',
          {
            className: 'big',
            onclick: () => navigate({ name: mode === 'quiz' ? 'quiz' : 'game', continent, difficulty }),
          },
          [
            el('span', {}, [DIFFICULTY_LABEL[difficulty]]),
            el('span', { className: 'detail' }, [mode === 'quiz' ? quizDetail(continent, difficulty) : learnDetail(continent, difficulty)]),
          ],
        ),
      ),
      el('button', { className: 'link', onclick: () => navigate({ name: 'continent', mode }) }, ['Voltar']),
    ]),
  );
}
```

`src/ui/screens/continent.ts` "Voltar" stays `navigate({ name: 'home' })`.

In `src/ui/screens/game.ts`, the "Sair" target becomes `{ name: 'difficulty', mode: 'learn', continent }`; in `src/ui/screens/result.ts`, the "Voltar" target becomes `{ name: 'difficulty', mode: 'learn', continent }`.

- [ ] **Step 3: Create `src/ui/screens/quiz.ts`**

```ts
import { countries, type Continent } from '../../data/countries';
import { poolFor, type Difficulty } from '../../engine/pool';
import { Quiz } from '../../engine/quiz';
import { saveQuizOutcome } from '../../quizRecords';
import { el } from '../dom';
import type { Navigate } from '../navigation';
import { flagFigure } from '../questions/choices';
import { formatTime } from '../time';

export function renderQuiz(root: HTMLElement, navigate: Navigate, continent: Continent, difficulty: Difficulty): void {
  const quiz = new Quiz(poolFor(countries, continent, difficulty), Math.random);
  const startedAt = performance.now();
  const elapsed = () => performance.now() - startedAt;

  const timer = el('span', {}, [formatTime(0)]);
  const interval = window.setInterval(() => {
    timer.textContent = formatTime(elapsed());
  }, 1000);
  const hud = el('header', { className: 'hud' });
  const stage = el('section', { className: 'stage' });
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
  root.append(el('main', { className: 'screen' }, [exit, hud, stage]));

  const updateHud = () =>
    hud.replaceChildren(timer, el('span', {}, [`${quiz.score} pts`]), el('span', {}, [`${quiz.answeredCount}/${quiz.total}`]));

  const show = (message: string | null) => {
    updateHud();
    if (quiz.status !== 'playing') return finish();
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
      show(quiz.answer(input.value) ? null : 'Errado, tente de novo');
    };
    const skip = el('button', { className: 'big', type: 'button', onclick: () => (quiz.skip(), show(null)) }, ['Pular']);
    const reopen = el('button', { className: 'big', type: 'button', onclick: () => (quiz.openSkipped(), show(null)) }, [
      `Puladas (${quiz.skippedCount})`,
    ]);
    stage.replaceChildren(
      el('div', { className: 'question' }, [
        flagFigure(quiz.current),
        ...(message ? [el('p', { className: 'quiz-message' }, [message])] : []),
        form,
        el('div', { className: 'quiz-actions' }, quiz.skippedCount > 0 ? [skip, reopen] : [skip]),
      ]),
    );
    input.focus();
  };

  show(null);
}
```

- [ ] **Step 4: Create `src/ui/screens/quizResult.ts`**

```ts
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { solutionCard } from '../questions/feedback';
import { formatTime } from '../time';

export function renderQuizResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'quizResult' }>): void {
  const { continent, difficulty, score, timeMs, finished, unanswered, missed, newRecords } = screen;
  root.append(
    el('main', { className: 'screen' }, [
      el('h1', {}, [`${score} pontos`]),
      el('p', { className: 'detail' }, [`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]} · Quiz`]),
      el('p', {}, [`Tempo: ${formatTime(timeMs)}`]),
      ...(newRecords.score ? [el('p', { className: 'record' }, ['🏆 Novo recorde de pontos!'])] : []),
      ...(newRecords.time ? [el('p', { className: 'record' }, ['🏆 Novo recorde de tempo!'])] : []),
      ...(finished ? [] : [el('p', {}, [`${unanswered} bandeiras sem resposta`])]),
      ...(missed.length
        ? [el('h2', {}, ['Bandeiras que você errou']), el('div', { className: 'solution-grid' }, missed.map((c) => solutionCard(c)))]
        : []),
      el('button', { className: 'primary', onclick: () => navigate({ name: 'quiz', continent, difficulty }) }, ['Jogar de novo']),
      el('button', { className: 'link', onclick: () => navigate({ name: 'difficulty', mode: 'quiz', continent }) }, ['Voltar']),
    ]),
  );
}
```

- [ ] **Step 5: Route the new screens in `src/main.ts`**

Import `renderQuiz` and `renderQuizResult`, and replace the `continent` and `difficulty` cases and add two cases:

```ts
    case 'continent':
      return renderContinent(app, navigate, screen.mode);
    case 'difficulty':
      return renderDifficulty(app, navigate, screen.mode, screen.continent);
```

```ts
    case 'quiz':
      return renderQuiz(app, navigate, screen.continent, screen.difficulty);
    case 'quizResult':
      return renderQuizResult(app, navigate, screen);
```

- [ ] **Step 6: Style the quiz parts**

Append to `src/style.css`:

```css
.quiz-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.quiz-message { margin: 0; color: var(--wrong); font-weight: 600; }

.record { margin: 0; color: var(--accent); font-weight: 700; }
```

- [ ] **Step 7: Run the gates**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add src/ui/navigation.ts src/main.ts src/ui/screens/home.ts src/ui/screens/continent.ts src/ui/screens/difficulty.ts src/ui/screens/game.ts src/ui/screens/result.ts src/ui/screens/quiz.ts src/ui/screens/quizResult.ts src/style.css
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: play Quiz mode with a timer, skipping and best records" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 4: Browser verification and README

**Files:**
- Modify: `README.md`, `docs/specs/2026-10-06-learn-mode-design.md` (the "Quiz button disabled" line), plus whatever the checks show broken (fix in the owning file, engine test when the defect is in `src/engine/`, each fix in its own `fix:` commit)

- [ ] **Step 1: Play Quiz in the browser**

Start `npx vite --host --port 5174 --strictPort` in the background and, with the Playwright browser tools:
- Home → Quiz → África shows "Quiz" under the title and the four levels without records;
- a Fácil quiz: the timer ticks once per second; a right answer advances and adds a point; a wrong answer shows "Errado, tente de novo", keeps the flag, clears the field and takes a point; Enter on an empty field does nothing; "Pular" moves on and shows "Puladas (1)"; "Puladas" opens the oldest skipped flag; skipped flags come back on their own at the end;
- finish a Fácil quiz with no errors (answers may be read from the DOM or engine via evaluate) and confirm both "Novo recorde" lines, then the level screen shows "recorde 18 pts · mm:ss";
- start another quiz, answer one wrong, tap "Encerrar": the result shows the score, the time, "N bandeiras sem resposta", the missed flag with its name, and no new time record; the timer element no longer changes after the result shows;
- Learn still works end to end from Home → Learn, including "Sair" and "Voltar" returning to the Learn level screen;
- screenshots at 390px and 1280px and in dark mode under the SDD workspace.

Stop the server.

- [ ] **Step 2: Update the docs**

In `README.md`, append this paragraph after the first paragraph under `# Bandeiras`:

```markdown
Quiz mode shows one flag at a time on the same levels: type its name or skip it, come back to skipped flags whenever you like, and race the timer. The best score and, for a quiz finished with no errors, the best time are kept per level.
```

In `docs/specs/2026-10-06-learn-mode-design.md`, replace `- Quiz mode (the home screen shows it as disabled, "em breve").` with `- Quiz mode, specified in docs/specs/2026-10-06-quiz-mode-design.md.` and `1. **Home.** Learn button; Quiz button disabled with "em breve".` with `1. **Home.** Learn and Quiz buttons.`

- [ ] **Step 3: Run the gates and commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

```bash
git add README.md docs/specs/2026-10-06-learn-mode-design.md
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "docs: describe Quiz mode in the README and point the Learn spec to it" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```
